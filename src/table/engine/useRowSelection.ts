/**
 * 行选择状态机（M5）。
 *
 * 算法移植自 lun `packages/core/src/composable/select/index.ts` 的
 * `createUseSelect` / `useCheckboxMethods`（single/multiple + 全选/半选(intermediate)
 * + reverse/toggle 状态机），**用纯 React + TS 重写**，不引 Vue / Web Component、不抄 lun 代码。
 *
 * === lun 的核心思路（移植点）===
 *
 * 1. **多选（multiple / checkbox）**：
 *    - 用 Set 维护"当前选中的 key 集合"（lun 内部 current）。
 *    - **全选态**（allSelected）：`allValues ⊆ selected`（所有可勾选行都已选中）。
 *    - **半选态**（intermediate）：`0 < |selected ∩ allValues| < |allValues|`（lun 的
 *      `differenceOfSets(all, selected).size` 判定：有选中但没全选 → intermediate=true）。
 *    - 切换某 key：在 Set 中 add/delete（lun 的 `select`/`unselect`/`toggle`）。
 *    - 全选/全不选：select all → set = allValues；unselect all → set = ∅。
 *    - 反选（reverse）：遍历 allValues，在 Set 中的删、不在的加（lun 的 `reverse`）。
 *
 * 2. **单选（single / radio）**：
 *    - 用单个值（lun 内部 current 不是 Set 而是单值）。
 *    - 选中：直接替换当前值（lun 的 `select` 单值分支）。
 *    - 取消：清空（lun 的 `unselect` 单值分支）。
 *
 * === antd 适配（关键差异）===
 *
 * lun 的对外 API 是 `selected`/`selectionMode`/`selectColumn`（内部 Set）；
 * antd 是 `rowSelection.selectedRowKeys`（受控 React.Key[]）+ `onChange(keys, rows)`。
 * 这里把 antd 受控数组作为"真理源"，每次操作生成新数组并调用 `onChange`：
 *   - 多选：内部把 keys 数组当作 Set 的快照（去重 + 仅保留可勾选 key）。
 *   - 单选：keys 数组至多 1 个元素（取首个；切换即替换）。
 *
 * `onChange` 由调用方（适配层）传入，引擎内部不直接调 React setState——保持纯函数性，
 * 与 lun `onChange` 回调语义一致（lun 也是把变更通过 onChange 抛给宿主）。
 *
 * === getCheckboxProps（禁用）===
 *
 * antd `getCheckboxProps(record)` 返回 `{ disabled, ... }`。**禁用的行不参与"全选"**
 * （antd 行为：disabled 行不会被全选/全不选影响；它的勾选态保持不变）。
 * 这里计算 `selectableKeys` 时排除 disabled 行；半选/全选判定也基于 `selectableKeys`
 * 而非全集（与 antd / lun 处理 disabled 时的语义一致）。
 *
 * === 受控语义 ===
 *
 * `selectedRowKeys` 是受控的：调用方负责在 `onChange` 后更新它。本 hook 不缓存"内部
 * 选中态"——每次渲染都从 `selectedRowKeys` 重新派生（与 React 受控组件语义一致；lun
 * 的 reactive watch 也是从 current 派生 allSelected/intermediate）。
 * `defaultSelectedRowKeys` 仅在 `selectedRowKeys` 未传时作为初始值（适配层处理）。
 */

import { useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'

/** antd RowSelection.type：'checkbox'（多选）/ 'radio'（单选）。 */
export type SelectionType = 'checkbox' | 'radio'

/**
 * 行选择回调用"操作类型"（S9 引擎内部用；与对外 `types.ts` 的 `RowSelectMethod` 同义）。
 * - 'all'：多选全选（SELECTION_ALL）。
 * - 'none'：多选全不选（SELECTION_NONE）。
 * - 'invert'：反选（SELECTION_INVERT）。
 * - 'single'：单次勾选。
 * - 'multiple'：多选连续操作。
 */
export type RowSelectMethod = 'all' | 'none' | 'invert' | 'single' | 'multiple'

// ============================================================================
// S9：自定义选择项 selections（内置哨兵 SELECTION_ALL / SELECTION_INVERT / SELECTION_NONE）。
//
// 设计对齐 antd `useSelection.tsx`：
//   - `SELECTION_ALL/NONE/INVERT` 是哨兵常量（antd 用字符串字面量 `'SELECT_ALL'` 等；
//     data-grid 用**哨兵对象**——含 key/text/onSelect，便于 Table 上挂为静态属性 + 直接渲染
//     菜单项，避免像 antd 那样在 mergedSelections 里再二次映射出 SelectionItem）。
//   - `selections: true` → 默认 `[SELECTION_ALL, SELECTION_INVERT, SELECTION_NONE]`。
//   - `selections: SelectionItem[]` → 自定义列表（可混用内置哨兵 + 自定义项）。
//   - 内置哨兵的 `onSelect` 是**占位**（仅保留签名对齐 antd SelectionItem）——真正的行为由
//     `useRowSelection.applySelection` 按 key 分支处理（antd 同样在 mergedSelections 中重写 onSelect）。
//   - 自定义项的 `onSelect(changeableRowKeys)`：与 antd 一致，demo 内自行 `setSelectedRowKeys`
//     （外部受控 state）。applySelection 调用它，**返回值忽略**（antd 的 onSelect 签名返回 void）。
//
// `changeableRowKeys` = 当前**所有可选（非 disabled）**行的 rowKeys（与 antd `recordKeys` 一致）。
// 内置行为（对齐 antd mergedSelections）：
//   - ALL：`changeableRowKeys` 全选 + 保留"已选中的 disabled 行"（antd ALL 同款）。
//   - NONE：清空所有 changeableRowKeys，仅保留"已选中的 disabled 行"（antd NONE 同款）。
//   - INVERT：changeableRowKeys 中未选→选、已选→清；保留 selectableKeys 之外的 key（antd INVERT 同款）。
// ============================================================================

/**
 * 内置选择项 key（S9）。
 * 对齐 antd `mergedSelection` 的最终 key：'all' / 'invert' / 'none'。
 */
export type BuiltinSelectionKey = 'all' | 'invert' | 'none'

/**
 * 自定义选择项（S9，对齐 antd `SelectionItem`）。
 *
 * - `key`：项唯一标识（菜单 React key）。
 * - `text`：菜单展示文案（ReactNode）。
 * - `onSelect(changeableRowKeys)`：点击回调；`changeableRowKeys` 为当前所有可选（非 disabled）
 *   行的 rowKeys 数组（与 antd 签名一致）。返回 void（与 antd `SelectionItemSelectFn` 一致）——
 *   demo 内自行 setSelectedRowKeys 实现自定义选择逻辑（如 odd/even）。
 *
 * 内置哨兵（`SELECTION_ALL/NONE/INVERT`）亦实现此接口，但其 `onSelect` 为占位——真正行为由
 * `useRowSelection.applySelection` 按 key 分支处理。
 */
export interface SelectionItem {
  key: string
  text?: ReactNode
  onSelect?: (changeableRowKeys: Array<React.Key>) => void
}

/**
 * 内置哨兵：全选（S9）。挂为 `Table.SELECTION_ALL` + 命名导出。
 * `onSelect` 占位（真正行为在 `useRowSelection.applySelection` 中按 key='all' 执行）。
 */
export const SELECTION_ALL: SelectionItem = {
  key: 'all',
  text: 'Select All',
  onSelect: () => {},
}

/**
 * 内置哨兵：反选（S9）。挂为 `Table.SELECTION_INVERT` + 命名导出。
 */
export const SELECTION_INVERT: SelectionItem = {
  key: 'invert',
  text: 'Select Invert',
  onSelect: () => {},
}

/**
 * 内置哨兵：清空（S9）。挂为 `Table.SELECTION_NONE` + 命名导出。
 */
export const SELECTION_NONE: SelectionItem = {
  key: 'none',
  text: 'Select None',
  onSelect: () => {},
}

/** 透传给底层 input 的"勾选相关 props"子集（antd getCheckboxProps 返回值子集）。 */
export interface RowCheckboxProps {
  disabled?: boolean
  /** antd getCheckboxProps 可返回 name；透传到底层 input。 */
  name?: string
}

export interface UseRowSelectionOptions<RecordType> {
  /** 'checkbox'（多选，默认）/ 'radio'（单选）。 */
  type?: SelectionType
  /** 受控选中 key 数组（真理源）。 */
  selectedRowKeys: Array<React.Key>
  /** 全集 dataSource（用于算 selectableKeys / 全选 / 半选）。 */
  dataSource: Array<RecordType>
  /** rowKey 取值器（字符串属性名或函数）。 */
  rowKey: string | ((record: RecordType) => string | number)
  /**
   * antd `getCheckboxProps(record)`：返回 `{ disabled?, name? }`。
   * 返回 `disabled: true` 的行不参与全选、不可手动勾选（点击被忽略）。
   */
  getCheckboxProps?: (record: RecordType) => RowCheckboxProps | undefined
  /**
   * S9 自定义选择项配置（对齐 antd `rowSelection.selections`）。
   * - `true`：用默认 `[SELECTION_ALL, SELECTION_INVERT, SELECTION_NONE]`。
   * - 数组：自定义项列表（可混用内置哨兵 + 自定义 `{ key, text, onSelect }`）。
   * - undefined：不渲染表头下拉菜单（M5/S8 行为，零回归）。
   */
  selections?: true | Array<SelectionItem>
  /**
   * S13 父子勾选是否严格独立（对齐 antd `rowSelection.checkStrictly`，默认 true）。
   * - true：父子独立勾选（M5 行为）。
   * - false：父子联动（树形模式）。详见对外 `types.ts` TableRowSelection.checkStrictly 注释。
   *
   * 仅当同时提供 `parentChildrenMap`（树形 parent→children 映射）时有意义；非树形下本字段无效。
   */
  checkStrictly?: boolean
  /**
   * S13 树形 parent→children 映射（来自 useTreeData.parentChildrenMap）。
   * key → 该父行的直接子行 keys 数组（含所有层级，不论展开）。
   *
   * 仅树形模式（非空 Map）+ checkStrictly=false 时参与父子联动；否则忽略。
   */
  parentChildrenMap?: Map<React.Key, Array<React.Key>>
}

export interface UseRowSelectionResult<RecordType> {
  /** 是否单选模式。 */
  isRadio: boolean
  /** 全集可勾选 key 数组（未 disabled）。 */
  selectableKeys: Array<React.Key>
  /** 全集可勾选 record 数组（与 selectableKeys 一一对应）。 */
  selectableRecords: Array<RecordType>
  /** 当前选中 key 集合（Set；去重）。 */
  selectedKeySet: Set<React.Key>
  /** 全选态（仅多选有意义；单选恒 false）。 */
  allSelected: boolean
  /** 半选态（仅多选有意义；单选恒 false）。 */
  intermediate: boolean
  /** 某 key 是否选中。 */
  isSelected: (key: React.Key) => boolean
  /**
   * S13 某 key 是否半选（仅 checkStrictly=false 树形模式有意义）。
   * 半选 = 该 key 是父行，且其子行中**部分**（至少 1 个但非全部）被选中。
   * checkStrictly=true 或非树形 → 恒 false。
   */
  isIndeterminate: (key: React.Key) => boolean
  /** 某 record 是否 disabled（不可勾选）。 */
  isDisabled: (record: RecordType) => boolean
  /**
   * 切换某行的勾选态（checkbox 与 radio 共用入口）。
   * - checkbox：在 Set 中 add/delete。
   * - radio：选中即替换为该 key；已选中再点不变（antd radio 行为：再次点击不取消）。
   * 返回新的 `selectedRowKeys` 数组（不直接调 onChange；由调用方决定如何分发）。
   */
  toggleRow: (key: React.Key) => Array<React.Key>
  /**
   * 全选/全不选（仅 checkbox；radio 下 no-op）。
   * 当前已全选 → 清空；否则 → 选中所有 selectableKeys。
   */
  toggleAll: () => Array<React.Key>
  /**
   * 单选指定 key（radio 主用；checkbox 等价于 toggleRow 的"选中"分支）。
   */
  selectRow: (key: React.Key) => Array<React.Key>
  /**
   * S9：当前可选（非 disabled）行的 rowKeys（= changeableRowKeys）。
   * 传给自定义 selection 的 onSelect(changeableRowKeys)。
   */
  changeableRowKeys: Array<React.Key>
  /**
   * S9：解析后的 selections 列表（`true` → 默认三项；数组 → 原样；undefined → null）。
   * null 表示不渲染表头下拉菜单。
   */
  resolvedSelections: Array<SelectionItem> | null
  /**
   * S9：应用一个 selection 项（菜单点击时调用）。
   * - 内置哨兵（key='all'/'invert'/'none'）→ 引擎直接算新 selectedRowKeys（对齐 antd）。
   * - 自定义项 → 调 `item.onSelect(changeableRowKeys)`（返回 void；demo 内自行 setState）；
   *   引擎不改变 selectedRowKeys（与 antd 一致——自定义 onSelect 自行控制受控 state）。
   * 返回值：内置项返回新 selectedRowKeys 数组（供调用方走 onChange）；自定义项返回 undefined
   *   （调用方据此不触发 onChange——因为 demo 自行 setState 后受控回填会刷新 UI）。
   */
  applySelection: (
    item: SelectionItem,
  ) => { nextKeys: Array<React.Key>; method: RowSelectMethod } | null
}

/**
 * 把 record 解析为 React.Key（字符串/数字）。
 * 与 GridTable.getRowKey 同语义；这里独立实现避免引擎耦合。
 */
function resolveKey<RecordType>(
  record: RecordType,
  rowKey: string | ((record: RecordType) => string | number),
): React.Key {
  if (typeof rowKey === 'function') return rowKey(record)
  const v = (record as any)?.[rowKey]
  return v === undefined ? '' : v
}

/**
 * S13 树形联动：收集某 key 的全部子孙 keys（递归 parentChildrenMap）。
 */
function collectDescendants(
  key: React.Key,
  parentChildrenMap: Map<React.Key, Array<React.Key>>,
): Array<React.Key> {
  const out: Array<React.Key> = []
  const stack: Array<React.Key> = [key]
  while (stack.length > 0) {
    const k = stack.pop()!
    const children = parentChildrenMap.get(k)
    if (children) {
      for (const c of children) {
        out.push(c)
        stack.push(c)
      }
    }
  }
  return out
}

/**
 * S13 树形联动：收集某 key 的全部祖先 keys（自底向上）。
 * 通过遍历 parentChildrenMap 反查（线性扫描）——树规模通常不大，可接受。
 */
function collectAncestors(
  key: React.Key,
  parentChildrenMap: Map<React.Key, Array<React.Key>>,
): Array<React.Key> {
  const ancestors: Array<React.Key> = []
  // 构建 child→parent 映射（一次性）以 O(depth) 查找。
  // 这里每次调用都重建——调用频率低（toggle/全选），可接受。
  const childToParent = new Map<React.Key, React.Key>()
  for (const [parent, children] of parentChildrenMap) {
    for (const c of children) childToParent.set(c, parent)
  }
  let current: React.Key | undefined = key
  while (true) {
    const parent = childToParent.get(current as React.Key)
    if (parent === undefined) break
    ancestors.push(parent)
    current = parent
  }
  return ancestors
}

/**
 * S13 树形联动 conduction（对齐 antd rc-tree `conductCheck`）。
 *
 * 输入"原始 selectedRowKeys"（可能含父但缺子孙，或含子但缺父），输出：
 *   - checkedKeys：完整勾选集合（填充子孙 + 补全所有子已选中的父）。
 *   - halfCheckedKeys：半选父集合（部分子选中、未全选）。
 *
 * 算法（自底向上填充）：
 *   1. 初始 checked = input set 拷贝。
 *   2. 对每个 input key：填充其全部子孙（select 时父→子孙连带，对齐 antd）。
 *   3. 对每个父 key（parentChildrenMap 中所有父）：计算其直接子行在 checked 中的比例：
 *      - 全选 → 把父加入 checked（递归向上传播）。
 *      - 部分选 → 父不加入 checked（但在 halfChecked）。
 *      - 全不选 → 父保持未选。
 *   4. 第 3 步需迭代直到稳定（因为补全父后，更高层父的"全选"判定会变）。
 *
 * 与 antd conductCheck 略简化：不处理 disabled 行的"强制不参与"复杂规则
 * （antd `isCheckboxDisabled` 在 conduction 中过滤 disabled 子；data-grid 简化为 disabled
 * 子行仍参与父全选判定——demo 无此边界组合，已知简化）。
 */
function conductTreeCheck(
  inputKeys: Array<React.Key>,
  parentChildrenMap: Map<React.Key, Array<React.Key>>,
): { checkedKeys: Set<React.Key>; halfCheckedKeys: Set<React.Key> } {
  const checked = new Set<React.Key>(inputKeys)
  // Step 1: 填充子孙（父选中 → 全部子孙选中）。
  const descendantsToAdd: Array<React.Key> = []
  for (const k of inputKeys) {
    const children = parentChildrenMap.get(k)
    if (children) {
      for (const d of collectDescendants(k, parentChildrenMap)) {
        descendantsToAdd.push(d)
      }
    }
  }
  for (const d of descendantsToAdd) checked.add(d)

  // Step 2: 自底向上补全父（迭代直到一轮无变化）。
  // 按深度从大到小处理父（叶子父先判），确保补全传播。
  // 简单实现：循环直到一次完整遍历无新增 checked 父。
  const halfChecked = new Set<React.Key>()
  let changed = true
  while (changed) {
    changed = false
    halfChecked.clear()
    for (const [parent, children] of parentChildrenMap) {
      let selectedCount = 0
      for (const c of children) {
        if (checked.has(c)) selectedCount += 1
      }
      if (selectedCount === children.length) {
        // 全选 → 父加入 checked（若未在）。
        if (!checked.has(parent)) {
          checked.add(parent)
          changed = true
        }
      } else if (selectedCount > 0) {
        // 部分选 → 父半选。
        halfChecked.add(parent)
      }
    }
  }
  // 再次清理 halfChecked 中可能误含的（若某父刚被补入 checked 则不在 halfChecked）。
  for (const k of Array.from(halfChecked)) {
    if (checked.has(k)) halfChecked.delete(k)
  }
  return { checkedKeys: checked, halfCheckedKeys: halfChecked }
}


export function useRowSelection<RecordType>(
  options: UseRowSelectionOptions<RecordType>,
): UseRowSelectionResult<RecordType> {
  const {
    type = 'checkbox',
    selectedRowKeys,
    dataSource,
    rowKey,
    getCheckboxProps,
    selections,
    checkStrictly = true,
    parentChildrenMap,
  } = options
  const isRadio = type === 'radio'

  // === S13 树形父子联动 ===
  // checkStrictly=false 且提供了 parentChildrenMap（非空 Map）→ 启用联动。
  // - conductCheck（派生）：从受控 selectedRowKeys（可能含父但缺子孙）派生完整 checked 集合
  //   （填充子孙 + 补全父），与 antd conductCheck(checked=true) 同语义。
  // - conductUncheck（生成新数组 on toggle）：取消某 key 时同步清子孙 + 移除不再是全选的祖先。
  const treeLinkEnabled =
    !isRadio && !checkStrictly && !!parentChildrenMap && parentChildrenMap.size > 0

  // === 全集可勾选 key/record（排除 disabled）===
  const { selectableKeys, selectableRecords } = useMemo(() => {
    const keys: Array<React.Key> = []
    const records: Array<RecordType> = []
    for (const record of dataSource) {
      const disabled = getCheckboxProps?.(record)?.disabled === true
      if (disabled) continue
      keys.push(resolveKey(record, rowKey))
      records.push(record)
    }
    return { selectableKeys: keys, selectableRecords: records }
  }, [dataSource, rowKey, getCheckboxProps])

  // === 当前选中 Set（去重；受控源 selectedRowKeys）===
  // 注意：selectedRowKeys 可能含 selectableKeys 之外的 key（如 disabled 行之前被选中、
  // 或 record 已不存在）。antd `preserveSelectedRowKeys` 控制是否保留这些；本 hook 不删除
  // 它们（保留语义），但 allSelected/intermediate 判定只看 selectableKeys 子集。
  //
  // S13 树形联动（checkStrictly=false）：从受控 selectedRowKeys 派生"完整 checked 集合"——
  //   填充子孙 + 补全父（与 antd conductCheck 同语义）。isSelected/isIndeterminate/toggleRow
  //   全部基于派生集合；toggleRow 生成的新数组也已是完整 conduced 集合（存回受控源）。
  const { selectedKeySet, halfCheckedKeySet } = useMemo(() => {
    if (treeLinkEnabled && parentChildrenMap) {
      const { checkedKeys, halfCheckedKeys } = conductTreeCheck(selectedRowKeys, parentChildrenMap)
      return { selectedKeySet: checkedKeys, halfCheckedKeySet: halfCheckedKeys }
    }
    return {
      selectedKeySet: new Set<React.Key>(selectedRowKeys),
      halfCheckedKeySet: new Set<React.Key>(),
    }
  }, [treeLinkEnabled, parentChildrenMap, selectedRowKeys])

  // === 全选 / 半选（仅 checkbox）===
  // 移植 lun：allValues=allKeys，selected=selectedKeySet；用 differenceOfSets 判定。
  //   - allSelected：selectableKeys 全部在 selectedKeySet 中。
  //   - intermediate：selectableKeys 中至少 1 个在 selectedKeySet 中、且未全选。
  // 单选（radio）下恒为 false（无全选概念）。
  const { allSelected, intermediate } = useMemo(() => {
    if (isRadio || selectableKeys.length === 0) return { allSelected: false, intermediate: false }
    let inCount = 0
    for (const k of selectableKeys) {
      if (selectedKeySet.has(k)) inCount += 1
    }
    const all = inCount === selectableKeys.length && inCount > 0
    // lun：difference.size > 0 且 selected 非空 → intermediate。
    const inter = !all && inCount > 0
    return { allSelected: all, intermediate: inter }
  }, [isRadio, selectableKeys, selectedKeySet])

  const isSelected = useCallback(
    (key: React.Key) => selectedKeySet.has(key),
    [selectedKeySet],
  )

  const isIndeterminate = useCallback(
    (key: React.Key) => halfCheckedKeySet.has(key),
    [halfCheckedKeySet],
  )

  const isDisabled = useCallback(
    (record: RecordType) => getCheckboxProps?.(record)?.disabled === true,
    [getCheckboxProps],
  )

  // === 操作（不可变；返回新数组）===

  /** 不可变地从数组中 add/delete 一个 key，返回新数组。保留原顺序，新增追加末尾。 */
  const toggleKey = useCallback(
    (key: React.Key, select: boolean): Array<React.Key> => {
      if (select) {
        if (selectedKeySet.has(key)) return Array.from(selectedKeySet)
        return [...Array.from(selectedKeySet), key]
      }
      if (!selectedKeySet.has(key)) return Array.from(selectedKeySet)
      return Array.from(selectedKeySet).filter((k) => k !== key)
    },
    [selectedKeySet],
  )

  /**
   * S13 树形联动 toggle（checkStrictly=false 时使用）。
   *
   * 选中 key：
   *   - 加入 key + 其全部子孙 keys。
   *   - 向上传播：对每个祖先，若其直接子行现在全部 checked → 加入该祖先（递归向上）。
   * 取消 key：
   *   - 移除 key + 其全部子孙 keys。
   *   - 向上传播：对每个祖先，从 checked 中移除（不再是全选）——半选态由 conductCheck 派生。
   *
   * 返回**完整 conduced 数组**（含父+子孙），与 antd 测试用例一致（见
   * `Table.rowSelection.test.tsx:1350` 勾 Jerry → [3,4,5,6,7,8,9]）。
   */
  const toggleTreeKey = useCallback(
    (key: React.Key, select: boolean): Array<React.Key> => {
      if (!parentChildrenMap) return toggleKey(key, select)
      const nextSet = new Set<React.Key>(selectedKeySet)
      if (select) {
        nextSet.add(key)
        for (const d of collectDescendants(key, parentChildrenMap)) nextSet.add(d)
        // 向上补全父（迭代直到稳定）。
        let changed = true
        while (changed) {
          changed = false
          for (const [parent, children] of parentChildrenMap) {
            if (nextSet.has(parent)) continue
            let cnt = 0
            for (const c of children) if (nextSet.has(c)) cnt += 1
            if (cnt === children.length) {
              nextSet.add(parent)
              changed = true
            }
          }
        }
      } else {
        nextSet.delete(key)
        for (const d of collectDescendants(key, parentChildrenMap)) nextSet.delete(d)
        // 向上移除不再是全选的父（其自身 key 也清，半选由派生）。
        for (const ancestor of collectAncestors(key, parentChildrenMap)) {
          nextSet.delete(ancestor)
        }
      }
      return Array.from(nextSet)
    },
    [parentChildrenMap, selectedKeySet, toggleKey],
  )

  const toggleRow = useCallback(
    (key: React.Key): Array<React.Key> => {
      if (isRadio) {
        // radio：选中即替换；已选中再点保持（antd radio 行为）。
        if (selectedKeySet.has(key)) return Array.from(selectedKeySet)
        return [key]
      }
      if (treeLinkEnabled) {
        return toggleTreeKey(key, !selectedKeySet.has(key))
      }
      return toggleKey(key, !selectedKeySet.has(key))
    },
    [isRadio, selectedKeySet, treeLinkEnabled, toggleTreeKey, toggleKey],
  )

  const toggleAll = useCallback((): Array<React.Key> => {
    if (isRadio) return Array.from(selectedKeySet)
    if (allSelected) {
      // 当前已全选 → 清空所有 selectableKeys（保留 selectableKeys 之外的 key，如 disabled 行
      // 之前被选中——antd preserveSelectedRowKeys 语义）。
      const selectableSet = new Set<React.Key>(selectableKeys)
      const next = Array.from(selectedKeySet).filter((k) => !selectableSet.has(k))
      return next
    }
    // 未全选 → 选中所有 selectableKeys（去重合并，保留原顺序优先）。
    const seen = new Set<React.Key>(selectedKeySet)
    const next: Array<React.Key> = Array.from(selectedKeySet)
    for (const k of selectableKeys) {
      if (!seen.has(k)) {
        seen.add(k)
        next.push(k)
      }
    }
    return next
  }, [isRadio, allSelected, selectedRowKeys, selectableKeys])

  const selectRow = useCallback(
    (key: React.Key): Array<React.Key> => {
      if (isRadio) return [key]
      return toggleKey(key, true)
    },
    [isRadio, toggleKey],
  )

  // === S9：自定义选择项 selections ===
  // changeableRowKeys = selectableKeys（所有非 disabled 行 key，对齐 antd `recordKeys`）。
  const changeableRowKeys = selectableKeys

  // 解析 selections 配置：
  //   - undefined / null → null（不渲染下拉）。
  //   - true → 默认 [SELECTION_ALL, SELECTION_INVERT, SELECTION_NONE]（对齐 antd）。
  //   - 数组 → 原样（调用方负责混用内置哨兵 + 自定义项）。
  // 注：radio 模式下 antd 也不渲染 selections 下拉（selections 仅对 checkbox 有意义）；
  //     这里保留解析但表头渲染层会判 isRadio 不显示。
  const resolvedSelections = useMemo<Array<SelectionItem> | null>(() => {
    if (!selections) return null
    if (selections === true) {
      return [SELECTION_ALL, SELECTION_INVERT, SELECTION_NONE]
    }
    return selections
  }, [selections])

  /**
   * 应用一个 selection 项（菜单点击时调用）。
   *
   * 内置哨兵按 key 分支（对齐 antd mergedSelections 的 ALL/INVERT/NONE 行为）：
   *   - ALL：选中所有 changeableRowKeys，并保留 selectedRowKeys 中已选的 disabled 行
   *     （antd ALL：`!disabled || derivedSelectedKeySet.has(key)` → keys.push(key)）。
   *   - NONE：清空所有 changeableRowKeys，仅保留 selectedRowKeys 中已选的 disabled 行
   *     （antd NONE：`derivedSelectedKeySet.filter(key => disabled)`）。
   *   - INVERT：changeableRowKeys 中未选→选、已选→清；保留 selectableKeys 之外的 key
   *     （antd INVERT：遍历 pageData 非 disabled 行 toggle，disabled 行原样保留）。
   *
   * 自定义项：调 `item.onSelect(changeableRowKeys)`（返回 void）；引擎不改变 selectedRowKeys，
   *   返回 null（调用方据此不触发 onChange——demo 内自行 setState）。
   */
  const applySelection = useCallback(
    (
      item: SelectionItem,
    ): { nextKeys: Array<React.Key>; method: RowSelectMethod } | null => {
      // 自定义项（非内置 key）：调其 onSelect，返回 null（不触发 onChange）。
      if (item.key !== 'all' && item.key !== 'invert' && item.key !== 'none') {
        item.onSelect?.(changeableRowKeys)
        return null
      }
      // changeableRowKeys 在树形联动下可能含父行（其子孙也在 selectableKeys）。
      // 用 Set 统一处理；ALL/INVERT 结果在树形联动模式下经 conductTreeCheck 补全父。
      const changeableSet = new Set<React.Key>(changeableRowKeys)
      let nextSet: Set<React.Key>
      let method: RowSelectMethod
      if (item.key === 'all') {
        // ALL：changeableRowKeys 全选 + 保留已选 disabled 行（不在 changeableSet 中的已选 key）。
        nextSet = new Set<React.Key>(selectedKeySet)
        for (const k of changeableSet) nextSet.add(k)
        method = 'all'
      } else if (item.key === 'none') {
        // NONE：清空 changeableRowKeys，仅保留已选 disabled 行。
        nextSet = new Set<React.Key>()
        for (const k of selectedKeySet) {
          if (!changeableSet.has(k)) nextSet.add(k)
        }
        method = 'none'
      } else {
        // INVERT：changeableRowKeys 中 toggle；保留 selectableKeys 之外的 key（disabled 行原样）。
        nextSet = new Set<React.Key>(selectedKeySet)
        for (const k of changeableSet) {
          if (nextSet.has(k)) nextSet.delete(k)
          else nextSet.add(k)
        }
        method = 'invert'
      }
      // 树形联动：补全父（若所有子选中 → 父也选中），使存回的数组完整。
      let nextKeys: Array<React.Key>
      if (treeLinkEnabled && parentChildrenMap) {
        const { checkedKeys } = conductTreeCheck(Array.from(nextSet), parentChildrenMap)
        nextKeys = Array.from(checkedKeys)
      } else {
        nextKeys = Array.from(nextSet)
      }
      return { nextKeys, method }
    },
    [changeableRowKeys, selectedKeySet, treeLinkEnabled, parentChildrenMap],
  )

  return {
    isRadio,
    selectableKeys,
    selectableRecords,
    selectedKeySet,
    allSelected,
    intermediate,
    isSelected,
    isIndeterminate,
    isDisabled,
    toggleRow,
    toggleAll,
    selectRow,
    changeableRowKeys,
    resolvedSelections,
    applySelection,
  }
}
