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
  useMemo,
  useState,
} from 'react'
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

  // === getSelectionValue + selectionLookup（keyToValue/valueToKey）===
  const getSelectionValue = useCallback(
    (record: RecordType, index: number): GridSelectionValue => {
      const value = gridSelection?.getSelectionValue?.(record, index)
      return value ?? (getRowKey(record, rowKeyResolved) as GridSelectionValue)
    },
    [gridSelection?.getSelectionValue, rowKeyResolved],
  )
  const selectionLookup = useMemo(() => {
    const keyToValue = new Map<React.Key, GridSelectionValue>()
    const valueToKey = new Map<GridSelectionValue, React.Key>()
    for (let index = 0; index < flattenedDataSource.length; index += 1) {
      const record = flattenedDataSource[index]
      const key = getRowKey(record, rowKeyResolved)
      const value = getSelectionValue(record, index)
      if (!keyToValue.has(key)) keyToValue.set(key, value)
      if (!valueToKey.has(value)) valueToKey.set(value, key)
    }
    return { keyToValue, valueToKey }
  }, [flattenedDataSource, getSelectionValue, rowKeyResolved])
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

  // === useRowSelection 调用（状态机）===
  // 树形模式下用 flattenedDataSource（仅可见行）——与引擎实际渲染顺序一致；
  //   同时传 checkStrictly + parentChildrenMap 启用父子联动。
  const selection = useRowSelection<RecordType>({
    type: resolvedRowSel?.type,
    selectedRowKeys: effectiveSelectedKeys,
    dataSource: flattenedDataSource,
    rowKey: rowKeyResolved,
    getCheckboxProps: resolvedRowSel?.getCheckboxProps,
    selections: resolvedRowSel?.selections,
    checkStrictly: resolvedRowSel?.checkStrictly,
    parentChildrenMap,
  })

  // === fireSelectionChange（统一 onChange 分发）===
  // selectedRows 按 selectableKeys 顺序返回（即排除 disabled 行；与 antd 一致）。
  // preserveSelectedRowKeys（跨页/跨数据源保留已选 key，对齐 antd）：
  //   - false（默认）：每次勾选操作生成的 nextKeys 会被**过滤**——保留 dataSource 中存在的 key，
  //     丢弃不在当前数据源的 key（antd `setSelectedKeys` 非 preserve 分支：keys.filter(getRecordByKey)）。
  //     即：已选但翻页后不在当前页的 key，会在下次勾选时被清掉。
  //   - true：不过滤，nextKeys 原样保留所有 key（antd preserve 分支：availableKeys = keys）。
  //     典型 ajax 场景：翻页后回原页，之前选的仍是选中态。
  //   受控/非受控都过滤（antd 的 setMergedSelectedKeys 对两者都写过滤后的值）。
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
      // 非 preserve 模式过滤掉不在数据源中的 key（对齐 antd）。preserve=true 则保留全部
      //   （含跨页/跨数据源的 key）。
      // 树形模式下用**全树**（filteredDataSource，未扁平化）做存在性判定——折叠的子孙 key 仍在全树中
      //   （antd getRecordByKey 搜全树，行为一致），不应被清掉（checkStrictly=false 勾父→勾全部子孙含折叠的）。
      const existenceSource = treeEnabled ? filteredDataSource : flattenedDataSource
      const nextKeys: Array<React.Key> = preserve
        ? nextKeysInput
        : (() => {
            const existSet = new Set<React.Key>()
            const walk = (records: Array<RecordType>) => {
              for (const rec of records) {
                existSet.add(getRowKey(rec, rowKeyResolved))
                // 树形：递归收集子孙 key（折叠的也在）。
                const children = rec && typeof rec === 'object'
                  ? (rec as any)[childrenColumnName]
                  : undefined
                if (Array.isArray(children) && children.length > 0) walk(children)
              }
            }
            walk(existenceSource)
            return nextKeysInput.filter((k) => existSet.has(k))
          })()
      if (nativeSelectionConfigured) {
        if (!isNativeValuesControlled && !isNativeCompatKeysControlled) {
          const nextValues = mapKeysToValues(nextKeys)
          setUncontrolledSelectedValues(nextValues)
        }
      } else if (!isControlledSelection) {
        setUncontrolledKeys(nextKeys)
      }
      // 按 selectableKeys 顺序构造 selectedRows（disabled 行不会出现在 nextKeys 的 selectable 子集里）。
      // 遍历 flattenedDataSource（排序+筛选+树形扁平化后顺序——仅可见行），与 antd "onChange 返回
      //   渲染后顺序的 selectedRows" 一致。折叠的子孙 record 不在 flattenedDataSource，不出现在
      //   selectedRows（与 antd 一致：antd selectedRows 也只含当前可见的选中行）。
      const keySet = new Set<React.Key>(nextKeys)
      const rows: Array<RecordType> = []
      for (const rec of flattenedDataSource) {
        const k = getRowKey(rec, rowKeyResolved)
        if (keySet.has(k)) rows.push(rec)
      }
      const prevKeySet = new Set<React.Key>(effectiveSelectedKeys)
      const changeRows: Array<RecordType> = []
      for (const rec of flattenedDataSource) {
        const key = getRowKey(rec, rowKeyResolved)
        if (prevKeySet.has(key) !== keySet.has(key)) {
          changeRows.push(rec)
        }
      }
      if (nativeSelectionConfigured) {
        gridSelection?.onSelectedValuesChange?.(mapKeysToValues(nextKeys), rows, { type: method })
      }
      if (!resolvedRowSel) return
      resolvedRowSel.onChange?.(nextKeys, rows, { type: method })
      if (trigger?.record) {
        const key = getRowKey(trigger.record, rowKeyResolved)
        resolvedRowSel.onSelect?.(
          trigger.record,
          keySet.has(key),
          rows,
          trigger.nativeEvent ?? new Event('change'),
        )
      } else if (method === 'all' || method === 'none') {
        resolvedRowSel.onSelectAll?.(method === 'all', rows, changeRows)
      } else if (method === 'invert') {
        resolvedRowSel.onSelectInvert?.(nextKeys)
      }
      if (method === 'none') {
        resolvedRowSel.onSelectNone?.()
      }
    },
    [
      rowKeyResolved,
      selectionEnabled,
      resolvedRowSel,
      treeEnabled,
      filteredDataSource,
      flattenedDataSource,
      childrenColumnName,
      isControlledSelection,
      effectiveSelectedKeys,
      nativeSelectionConfigured,
      isNativeCompatKeysControlled,
      isNativeValuesControlled,
      gridSelection,
      mapKeysToValues,
    ],
  )

  return {
    selectionEnabled,
    nativeSelectionConfigured,
    resolvedSelectionMode,
    resolvedRowSel,
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
