/**
 * 行选择适配 hook（从 Table.tsx 抽出，机械搬运）。
 *
 * 把 `Table.tsx` 原 L425–659 选择域整体搬进 hook：模式解析（compat rowSelection vs native
 * gridOptions.selection）+ selectionLookup（keyToValue/valueToKey）+ 受控/非受控 state +
 * `useRowSelection` 调用 + `fireSelectionChange`（preserve/filter 树形存在性 + onSelect/
 * onSelectAll/onSelectInvert/onSelectNone 分发 + native onSelectedValuesChange）。
 *
 * **依赖数组逐字搬运**：`fireSelectionChange` 的 useCallback deps（原 ~15 项）是选择行为
 *   正确性的命脉（shift 范围 / ctrl-meta 累加 / onSelect 分发），禁止改动。
 *
 * 详见 `docs/engineering-refactor-table-hooks.md` §3.2⑤。
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { theme } from 'antd'
import { tableTokenToCssVars } from './tokenBridge'
import {
  useRowSelection,
} from './engine/useRowSelection'
import { getRowKey } from './engine/GridTable'
import {
  toSelectionValues,
  type SelectionChangeTrigger,
} from './selectionAdapter'
import type { UseRowSelectionResult } from './engine/useRowSelection'
import type {
  GridSelectionMode,
  GridSelectionOptions,
  GridSelectionValue,
  RowSelectMethod,
  TableRowSelection,
} from './types'

export interface UseSelectionAdapterOptions<RecordType> {
  rowSelection: TableRowSelection<RecordType> | undefined
  gridSelection: GridSelectionOptions<RecordType> | undefined
  flattenedDataSource: Array<RecordType>
  filteredDataSource: Array<RecordType>
  /**
   * 原始 `dataSource`（**未排序 / 未筛选 / 未分页**，且含全树 children）。
   *
   * 对齐 antd：`InternalTable.js:177` 用 `useLazyKVMap(rawData, childrenColumnName, getRowKey)`
   * 建 key→record 查表，`useLazyKVMap.js:9-16` 的 `dig` 无条件递归 children。行选择的
   * 「key 是否还存在」判定与 `selectedRows` 取值都以这张表为准（`useSelection.js:161-178/184`），
   * 因此被筛掉 / 被折叠 / 翻页移出可见区的已选行都**不会**丢数据。
   */
  rawDataSource: Array<RecordType>
  treeEnabled: boolean
  childrenColumnName: string
  rowKey: string | ((record: RecordType) => string | number)
  /**
   * 树形 parent→children 映射（来自 useTreeData.parentChildrenMap）。
   * key → 该父行的直接子行 keys 数组（含所有层级，不论展开）。
   */
  parentChildrenMap: Map<React.Key, Array<React.Key>>
}

export interface UseSelectionAdapterResult<RecordType> {
  selectionEnabled: boolean
  nativeSelectionConfigured: boolean
  resolvedSelectionMode: GridSelectionMode
  resolvedRowSel: TableRowSelection<RecordType> | undefined
  showSelectionColumn: boolean
  selection: UseRowSelectionResult<RecordType>
  effectiveSelectedKeys: Array<React.Key>
  fireSelectionChange: (
    nextKeys: Array<React.Key>,
    method: RowSelectMethod,
    trigger?: SelectionChangeTrigger<RecordType>,
  ) => void
  selectionAnchorKey: React.Key | null
  setSelectionAnchorKey: (k: React.Key | null) => void
  getSelectionValue: (record: RecordType, index: number) => GridSelectionValue
  mapKeysToValues: (keys: ReadonlyArray<React.Key> | undefined) => Array<GridSelectionValue>
}

export function useSelectionAdapter<RecordType>(
  options: UseSelectionAdapterOptions<RecordType>,
): UseSelectionAdapterResult<RecordType> {
  const {
    rowSelection: rowSel,
    gridSelection,
    flattenedDataSource,
    filteredDataSource,
    rawDataSource,
    treeEnabled,
    childrenColumnName,
    rowKey: rowKeyResolved,
    parentChildrenMap,
  } = options

  // === 模式解析（compat rowSelection vs native gridOptions.selection）===
  const nativeSelectionConfigured = gridSelection !== undefined
  const resolvedSelectionMode: GridSelectionMode = nativeSelectionConfigured
    ? (gridSelection.selectionMode ?? (rowSel?.type === 'radio' ? 'single' : 'multiple'))
    : 'disabled'
  const selectionEnabled = nativeSelectionConfigured ? resolvedSelectionMode !== 'disabled' : !!rowSel
  const showSelectionColumn = selectionEnabled && (gridSelection?.showSelectionColumn ?? true)
  const resolvedSelectionType: 'checkbox' | 'radio' = nativeSelectionConfigured
    ? resolvedSelectionMode === 'single'
      ? 'radio'
      : 'checkbox'
    : rowSel?.type === 'radio'
      ? 'radio'
      : 'checkbox'
  const resolvedRowSel: TableRowSelection<RecordType> | undefined = selectionEnabled
    ? {
        ...rowSel,
        type: resolvedSelectionType,
      }
    : undefined

  // === key→record 查表（对齐 antd useLazyKVMap(rawData, childrenColumnName, getRowKey)）===
  // DFS：先登记父行，再递归 children；同名 key 后者覆盖（与 antd `kvMap.set` 无条件写入一致）。
  // ★ 数据源是 rawDataSource（未排序/未筛选/未分页）——这是「筛选后不丢已选数据」的根因修复点。
  const { recordByKey, rawOrderedRecords } = useMemo(() => {
    const map = new Map<React.Key, RecordType>()
    const ordered: Array<RecordType> = []
    const dig = (records: Array<RecordType>) => {
      for (const record of records) {
        const key = getRowKey(record, rowKeyResolved)
        if (key !== undefined) map.set(key, record)
        ordered.push(record)
        const children = record && typeof record === 'object'
          ? (record as any)[childrenColumnName]
          : undefined
        if (Array.isArray(children) && children.length > 0) dig(children as Array<RecordType>)
      }
    }
    dig(rawDataSource)
    return { recordByKey: map, rawOrderedRecords: ordered }
  }, [rawDataSource, childrenColumnName, rowKeyResolved])

  // === 喂给状态机的数据源（全树，含折叠子孙）===
  // antd 的 checkboxPropsMap 建在 flattenData(pageData) 上（useSelection.js:23-31/92/115-124）——
  //   `flattenData` 无条件递归 children，所以**折叠起来的子孙也在表内**，getCheckboxProps 的
  //   disabled 在「点父行勾选」那一刻照样可解析。
  // 我们此前喂 flattenedDataSource（useTreeData.flattenTree 只展开已展开父行的 children），
  //   折叠子孙因此拿不到 disabled → 点父行会把 disabled 子孙一起选中（实测 dg [1,12,121]
  //   vs antd [1,121]）。非树形 → 直接复用 filteredDataSource 引用（零回归）。
  const selectionDataSource = useMemo(() => {
    if (!treeEnabled) return filteredDataSource
    const out: Array<RecordType> = []
    const dig = (records: Array<RecordType>) => {
      for (const record of records) {
        out.push(record)
        const children = record && typeof record === 'object'
          ? (record as any)[childrenColumnName]
          : undefined
        if (Array.isArray(children) && children.length > 0) dig(children as Array<RecordType>)
      }
    }
    dig(filteredDataSource)
    return out
  }, [treeEnabled, filteredDataSource, childrenColumnName])

  // === getSelectionValue + selectionLookup（keyToValue/valueToKey）===
  const getSelectionValue = useCallback(
    (record: RecordType, index: number): GridSelectionValue => {
      const value = gridSelection?.getSelectionValue?.(record, index)
      return value ?? (getRowKey(record, rowKeyResolved) ?? index)
    },
    [gridSelection?.getSelectionValue, rowKeyResolved],
  )
  const selectionLookup = useMemo(() => {
    const keyToValue = new Map<React.Key, GridSelectionValue>()
    const valueToKey = new Map<GridSelectionValue, React.Key>()
    for (let index = 0; index < flattenedDataSource.length; index += 1) {
      const record = flattenedDataSource[index]
      const key = getRowKey(record, rowKeyResolved)
      if (key === undefined) continue
      const value = getSelectionValue(record, index)
      if (!keyToValue.has(key)) keyToValue.set(key, value)
      if (!valueToKey.has(value)) valueToKey.set(value, key)
    }
    // 兜底补登记（**只补可见行里没有的 key**）：被筛掉 / 被折叠 / 翻页移出可见区的行，
    // 其 key→value 也要能解析，否则 native 口径的 mapKeysToValues 会把它们整批丢掉
    // （与 #12a 同族：受控 state 回填后 key 永久消失）。可见行的映射与 index 逐字不变。
    for (let index = 0; index < rawOrderedRecords.length; index += 1) {
      const record = rawOrderedRecords[index]
      const key = getRowKey(record, rowKeyResolved)
      if (key === undefined || keyToValue.has(key)) continue
      const value = getSelectionValue(record, index)
      keyToValue.set(key, value)
      if (!valueToKey.has(value)) valueToKey.set(value, key)
    }
    return { keyToValue, valueToKey }
  }, [flattenedDataSource, rawOrderedRecords, getSelectionValue, rowKeyResolved])
  const mapKeysToValues = useCallback(
    (keys: ReadonlyArray<React.Key> | undefined) => {
      if (!keys) return []
      const next: Array<GridSelectionValue> = []
      const seen = new Set<GridSelectionValue>()
      for (const key of keys) {
        const value = selectionLookup.keyToValue.get(key)
        if (value === undefined || seen.has(value)) continue
        seen.add(value)
        next.push(value)
      }
      return next
    },
    [selectionLookup],
  )
  const mapValuesToKeys = useCallback(
    (values: ReadonlyArray<GridSelectionValue> | undefined) => {
      if (!values) return []
      const next: Array<React.Key> = []
      const seen = new Set<React.Key>()
      for (const value of values) {
        const key = selectionLookup.valueToKey.get(value)
        if (key === undefined || seen.has(key)) continue
        seen.add(key)
        next.push(key)
      }
      return next
    },
    [selectionLookup],
  )

  // === 受控/非受控判定 + state ===
  const isControlledSelection = !nativeSelectionConfigured && rowSel
    ? rowSel.selectedRowKeys !== undefined
    : false
  const [uncontrolledKeys, setUncontrolledKeys] = useState<Array<React.Key>>(
    () => rowSel?.defaultSelectedRowKeys ?? [],
  )
  const [uncontrolledSelectedValues, setUncontrolledSelectedValues] = useState<Array<GridSelectionValue>>(
    () => {
      if (!nativeSelectionConfigured) return []
      if (gridSelection?.defaultSelectedValues !== undefined) {
        return toSelectionValues(gridSelection.defaultSelectedValues)
      }
      if (rowSel?.defaultSelectedRowKeys !== undefined) {
        return mapKeysToValues(rowSel.defaultSelectedRowKeys)
      }
      return []
    },
  )
  const [selectionAnchorKey, setSelectionAnchorKey] = useState<React.Key | null>(null)
  const isNativeValuesControlled =
    nativeSelectionConfigured && gridSelection?.selectedValues !== undefined
  const isNativeCompatKeysControlled =
    nativeSelectionConfigured &&
    gridSelection?.selectedValues === undefined &&
    gridSelection?.defaultSelectedValues === undefined &&
    rowSel?.selectedRowKeys !== undefined
  const effectiveSelectedValues: Array<GridSelectionValue> = nativeSelectionConfigured
    ? isNativeValuesControlled
      ? toSelectionValues(gridSelection?.selectedValues)
      : isNativeCompatKeysControlled
        ? mapKeysToValues(rowSel?.selectedRowKeys)
        : uncontrolledSelectedValues
    : []
  // 受控：用 selectedValues / selectedRowKeys；非受控：用对应内部 state。
  const effectiveSelectedKeys: Array<React.Key> = nativeSelectionConfigured
    ? mapValuesToKeys(effectiveSelectedValues)
    : rowSel
      ? isControlledSelection
        ? (rowSel.selectedRowKeys as Array<React.Key>)
        : uncontrolledKeys
      : []

  // === 29-G：`preserveSelectedRowKeys` 的记录缓存（对齐 antd **6.4.4** useSelection.js:71-88 + :159-162）===
  // 参照逐字形状（本次实读）：
  //   `:71` `preserveRecordsRef = React.useRef(new Map())`
  //   `:73-84` `updatePreserveRecordsCache(keys)`：preserve 开启时按 keys 重建 newCache，
  //            每项 `let record = getRecordByKey(key); if (!record && preserveRecordsRef.current.has(key))
  //            record = preserveRecordsRef.current.get(key)` ⇒ **数据源里已消失的 key 用上一次缓存的 record 兜底**；
  //   `:86-88` `useEffect(() => updatePreserveRecordsCache(mergedSelectedKeyList), [mergedSelectedKeyList, …])`
  //            ⇒ 外部（受控）灌进来的 keys 也会被缓存（G3 序列里 `Jack` 就是靠这条进缓存的）；
  //   `:159` `setSelectedKeys` 里**先** `updatePreserveRecordsCache(keys)`，`:162` preserve 分支
  //            `records = keys.map(key => preserveRecordsRef.current.get(key))` ⇒ 同一次派发即取到新缓存。
  // 我方差异与实测（探针 PR-G，裁判 antd 6.4.4）：
  //   G3「受控 selectedRowKeys=['Jack'] → 换 dataSource 让 Jack 彻底消失 → 勾 Lucy」
  //     antd keys ['Jack','Lucy'] rows ['Jack','Lucy']；修前我方 keys 同、rows 只有 ['Lucy']（静默退化）。
  //   G1/G2「用**筛选**把已选行移出可见区」两侧同形（rows 都含该记录，且内容是**最新数据**不是勾选时的快照）
  //     —— 因为 #12a 已把存在性/取值都建在 rawDataSource 全树上，被筛掉的行并未离开 rawData。
  //   G4 `preserve=false` 两侧同形（都不保留消失的 key）。
  // ★ 一处**有意的**偏离（探针 G6 实测）：某 key **从未**在任何数据源出现过（受控灌入的幽灵键）时，
  //   参照 `:162` 会把 `undefined` 原样塞进 `selectedRows`（实测 antd rows = [undefined, 'Lucy']，长度 2），
  //   我方按 `Array<RecordType>` 的公开类型面把 undefined 条目剔除（rows = ['Lucy']）——
  //   照抄会让声明的 `RecordType[]` 成为假话并崩掉 `rows.map(r => r.name)` 这类常见用户代码。
  const preserveRecordsRef = useRef(new Map<React.Key, RecordType | undefined>())
  const updatePreserveRecordsCache = useCallback(
    (keys: Array<React.Key>) => {
      if (resolvedRowSel?.preserveSelectedRowKeys !== true) return
      const newCache = new Map<React.Key, RecordType | undefined>()
      for (const key of keys) {
        const fresh = recordByKey.get(key)
        newCache.set(key, fresh !== undefined ? fresh : preserveRecordsRef.current.get(key))
      }
      preserveRecordsRef.current = newCache
    },
    [recordByKey, resolvedRowSel?.preserveSelectedRowKeys],
  )
  useEffect(() => {
    updatePreserveRecordsCache(effectiveSelectedKeys)
  }, [effectiveSelectedKeys, updatePreserveRecordsCache])

  // === useRowSelection 调用（状态机）===
  // 数据源用 selectionDataSource（筛选后数据的**全树**扁平视图，含折叠子孙）：
  //   disabled / selectableKeys / conduction 必须看得见折叠行，否则点父行会把 disabled
  //   子孙一起选中（antd 的 checkboxPropsMap 同样建在全树上）。非树形时与旧实现同引用。
  const selection = useRowSelection<RecordType>({
    type: resolvedRowSel?.type,
    selectedRowKeys: effectiveSelectedKeys,
    dataSource: selectionDataSource,
    rowKey: rowKeyResolved,
    getCheckboxProps: resolvedRowSel?.getCheckboxProps,
    selections: resolvedRowSel?.selections,
    checkStrictly: resolvedRowSel?.checkStrictly,
    parentChildrenMap,
  })

  // === fireSelectionChange（统一 onChange 分发）===
  // selectedRows 按 **nextKeys 的顺序**给出（antd `useSelection.js:184` 的 `keys.map(getRecordByKey)`
  //   ⇒ 顺序 = keys 数组顺序，不是 dataSource 顺序）。
  // preserveSelectedRowKeys（跨页/跨数据源保留已选 key，对齐 antd）：
  //   - false（默认）：每次勾选操作生成的 nextKeys 会被**过滤**——保留 rawData 里存在的 key，
  //     丢弃已彻底不在数据源里的 key（antd `setSelectedKeys` 非 preserve 分支：
  //     `keys.forEach(key => { const record = getRecordByKey(key); if (record !== undefined) 留下 })`）。
  //     ★ 判定源是 rawDataSource 全树，不是「当前可见行」——被筛掉/被折叠/翻页移出可见区的
  //       已选 key 仍然存在于 rawData，因此**不会**被清掉（缺口 #12a 的修复点）。
  //   - true：不过滤，nextKeys 原样保留所有 key（antd preserve 分支：availableKeys = keys）。
  //     典型 ajax 场景：翻页后回原页，之前选的仍是选中态。
  //   受控/非受控都过滤（antd 的 setMergedSelectedKeys 对两者都写过滤后的值）。
  //   29-G（步骤 54）补齐：preserve=true 且 key 已彻底离开 rawData 时，用上面 preserveRecordsRef 缓存的
  //     旧 record 补进 selectedRows（对齐 antd 6.4.4 useSelection.js:159-162；探针 G3 实测两侧同形）。
  //     唯一有意偏离＝该 key **从未**在任何数据源出现过时，参照把 undefined 塞进 rows、我方剔除（见上方 G6）。
  //
  // ★★★ deps 数组逐字保留——选择行为正确性的命脉（shift 范围 / ctrl-meta 累加 / onSelect 分发）。★★★
  const fireSelectionChange = useCallback(
    (
      nextKeysInput: Array<React.Key>,
      method: RowSelectMethod,
      trigger?: SelectionChangeTrigger<RecordType>,
    ) => {
      if (!selectionEnabled) return
      const preserve = resolvedRowSel?.preserveSelectedRowKeys === true
      // 非 preserve：丢弃「已经不在 rawData 里」的 key（对齐 antd getRecordByKey 的存在性判定）。
      // preserve：原样保留（含跨数据源的 key）。
      const nextKeys: Array<React.Key> = preserve
        ? nextKeysInput
        : nextKeysInput.filter((k) => recordByKey.has(k))
      if (nativeSelectionConfigured) {
        if (!isNativeValuesControlled && !isNativeCompatKeysControlled) {
          const nextValues = mapKeysToValues(nextKeys)
          setUncontrolledSelectedValues(nextValues)
        }
      } else if (!isControlledSelection) {
        setUncontrolledKeys(nextKeys)
      }
      // selectedRows：preserve=false 从 **rawData 查表**（recordByKey）；preserve=true 先刷新缓存再**从缓存取**
      //   （对齐 antd 6.4.4 useSelection.js:159-162）。changeRows 一律走 rawData 查表。两者顺序 = keys 数组顺序。
      // antd 参照（逐行实读，不是转述）：
      //   - `es/table/hooks/useSelection.js:161-178` setSelectedKeys 非 preserve 分支：
      //     `keys.forEach(key => { const record = getRecordByKey(key); if (record !== undefined)
      //      { availableKeys.push(key); records.push(record) } })` —— 同一个查表既做存在性过滤
      //      又构造 records，records 顺序即 keys 顺序。
      //   - `:184` triggerSingleSelection：`const rows = keys.map(getRecordByKey)`。
      //   - `getRecordByKey` 来自 `es/table/InternalTable.js:177` 的
      //     `useLazyKVMap(rawData, childrenColumnName, getRowKey)`，`useLazyKVMap.js:9-16` 递归
      //     children ⇒ **被筛掉 / 被折叠 / 翻页移出可见区的行照样查得到**。
      // （旧注释在此断言「antd selectedRows 也只含当前可见的选中行」——经上述实读推翻，属假注释；
      //   实测 antd 的 rows 顺序同样是 keys 顺序，见 `:1144` 用例的 [子, 父] 期望。）
      const keySet = new Set<React.Key>(nextKeys)
      // 29-G：preserve 分支先按 nextKeys 刷新缓存（参照 `:159` 在派发 onChange **之前**刷新），
      // 再一律从缓存取值——缓存项要么是当前 rawData 的 record，要么是它消失前的上一份（参照 `:162`）。
      if (preserve) updatePreserveRecordsCache(nextKeys)
      const rows: Array<RecordType> = []
      for (const k of nextKeys) {
        const rec = preserve ? preserveRecordsRef.current.get(k) : recordByKey.get(k)
        if (rec !== undefined) rows.push(rec)
      }
      const prevKeySet = new Set<React.Key>(effectiveSelectedKeys)
      const changeRows: Array<RecordType> = []
      // 新增的 key（nextKeys 顺序）→ 先给；再补被移除的 key（上一轮 keys 顺序）。
      for (const k of nextKeys) {
        if (prevKeySet.has(k)) continue
        const rec = recordByKey.get(k)
        if (rec !== undefined) changeRows.push(rec)
      }
      for (const k of effectiveSelectedKeys) {
        if (keySet.has(k)) continue
        const rec = recordByKey.get(k)
        if (rec !== undefined) changeRows.push(rec)
      }
      if (nativeSelectionConfigured) {
        gridSelection?.onSelectedValuesChange?.(mapKeysToValues(nextKeys), rows, { type: method })
      }
      if (!resolvedRowSel) return
      resolvedRowSel.onChange?.(nextKeys, rows, { type: method })
      if (trigger?.record) {
        const key = getRowKey(trigger.record, rowKeyResolved)
        if (key !== undefined) {
          resolvedRowSel.onSelect?.(
            trigger.record,
            keySet.has(key),
            rows,
            trigger.nativeEvent ?? new Event('change'),
          )
        }
      } else if (method === 'all' || method === 'none') {
        resolvedRowSel.onSelectAll?.(method === 'all', rows, changeRows)
      } else if (method === 'invert') {
        resolvedRowSel.onSelectInvert?.(nextKeys)
      }
      if (method === 'multiple') {
        const selected = trigger?.record
          ? (() => {
              const key = getRowKey(trigger.record as RecordType, rowKeyResolved)
              return key !== undefined && keySet.has(key)
            })()
          : changeRows.some((rec) => {
              const key = getRowKey(rec, rowKeyResolved)
              return key !== undefined && keySet.has(key)
            })
        resolvedRowSel.onSelectMultiple?.(selected, rows, changeRows)
      }
      if (method === 'none') {
        resolvedRowSel.onSelectNone?.()
      }
    },
    [
      rowKeyResolved,
      selectionEnabled,
      resolvedRowSel,
      recordByKey,
      isControlledSelection,
      effectiveSelectedKeys,
      nativeSelectionConfigured,
      isNativeCompatKeysControlled,
      isNativeValuesControlled,
      gridSelection,
      mapKeysToValues,
      // 29-G 只**新增**这一项（preserve 记录缓存的刷新器，闭包里要读它）；上面 11 项逐字未动。
      updatePreserveRecordsCache,
    ],
  )

  // === 选择列缺省列宽：从主题 token 取（E-158）===
  // 参照 antd **6.4.4** 同位件 `node_modules/antd/es/table/InternalTable.js:126-131`
  //   `mergedRowSelection = { columnWidth: token.Table?.selectionColumnWidth, ...customizeRowSelection }`
  //   ⇒ 组件 token 给**缺省**列宽，用户显式 `rowSelection.columnWidth` 后置覆盖。
  //   token 未被用户覆盖时参照还有第二档：CSS 规则
  //   `node_modules/antd/es/table/style/selection.js:23`
  //   `.ant-table-selection-col{width:tableSelectionColumnWidth}` ＋
  //   `node_modules/antd/es/table/style/index.js:226` `selectionColumnWidth: controlHeight`
  //   ⇒ 改 `theme.token.controlHeight` 也照样跟手。
  // 本仓这两档已经合在**同一份** token 桥产物里（`tableTokenToCssVars` 先用
  //   `prepareTableComponentToken` 派生默认、再合并 `realToken.Table` 用户覆盖），所以这里只取那个
  //   CSS 变量 ⇒ 列轨与 `.dg-wrapper` 上的 `--ant-table-selection-column-width` **同源**
  //   （缺陷本体就是它俩各说各话：变量 200px、轨道恒 32px），判据不再另立第二份。
  // useMemo 依赖 realToken 引用（cssinjs 按 token 哈希缓存 ⇒ 引用稳定 ⇒ 仅主题变化时重算）。
  // ⚠️ 本块刻意放在 return 之前、而不是紧贴上面的 `resolvedRowSel`：本文件的 `recordByKey`、
  //   `selectionDataSource`、`fireSelectionChange` 里的 rows 构造段都被外部按行号锚点引用，
  //   在它们上方插行会把那些锚点推位（本棒的 +2 位移已按实测记进收工自报）。
  const { token: realToken } = theme.useToken()
  const tokenSelectionColumnWidth = useMemo(() => {
    if (!realToken) return undefined
    const raw = tableTokenToCssVars(realToken as unknown as Record<string, unknown>, {
      prefix: 'ant',
      key: 'css-var-root',
    })['--ant-table-selection-column-width']?.trim()
    if (!raw) return undefined
    // `Xpx` → 数值 X（保持与历史 `width: 32` 同形的定值 min）；其它长度（`50%` / `2.5rem`）
    // 原样透传给引擎的 `toTrack`；空值 → undefined，由 `selectionAdapter` 的缺省兜底接住。
    const px = /^(-?\d+(?:\.\d+)?)px$/i.exec(raw)
    return px ? Number(px[1]) : raw
  }, [realToken])
  const resolvedRowSelWithTokenWidth: TableRowSelection<RecordType> | undefined = resolvedRowSel
    // 用户显式 columnWidth 优先于 token（照参照的 spread 顺序，不发明新优先级）。
    ? { ...resolvedRowSel, columnWidth: resolvedRowSel.columnWidth ?? tokenSelectionColumnWidth }
    : undefined

  return {
    selectionEnabled,
    nativeSelectionConfigured,
    resolvedSelectionMode,
    resolvedRowSel: resolvedRowSelWithTokenWidth,
    showSelectionColumn,
    selection,
    effectiveSelectedKeys,
    fireSelectionChange,
    selectionAnchorKey,
    setSelectionAnchorKey,
    getSelectionValue,
    mapKeysToValues,
  }
}
