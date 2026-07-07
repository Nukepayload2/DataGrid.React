/** 行选择状态机。详见 docs/design-notes/selection.md。 */

import { useCallback, useMemo } from 'react'
import type { Key } from 'react'

/**
 * 树形联动 conduction 纯函数簇 + 内置哨兵常量已抽出到 selectionTreeConduction.ts。
 * 本文件 re-export 哨兵 + SelectionItem 以维持公共 API 表面不变（index.ts 从本文件
 * 导出 SELECTION_ALL/NONE/INVERT，re-export 保证引用仍指向 selectionTreeConduction 中的同一对象）。
 */
export {
  SELECTION_ALL,
  SELECTION_INVERT,
  SELECTION_NONE,
  resolveKey,
  collectDescendants,
  collectAncestors,
  conductTreeCheck,
} from './selectionTreeConduction'
export type { SelectionItem } from './selectionTreeConduction'

import {
  SELECTION_ALL,
  SELECTION_INVERT,
  SELECTION_NONE,
  collectAncestors,
  collectDescendants,
  conductTreeCheck,
  resolveKey,
} from './selectionTreeConduction'
import type { SelectionItem } from './selectionTreeConduction'

/** antd RowSelection.type：'checkbox'（多选）/ 'radio'（单选）。 */
export type SelectionType = 'checkbox' | 'radio'

/**
 * 行选择回调用"操作类型"（引擎内部用；与对外 `types.ts` 的 `RowSelectMethod` 同义）。
 * - 'all'：多选全选（SELECTION_ALL）。
 * - 'none'：多选全不选（SELECTION_NONE）。
 * - 'invert'：反选（SELECTION_INVERT）。
 * - 'single'：单次勾选。
 * - 'multiple'：多选连续操作。
 */
export type RowSelectMethod = 'all' | 'none' | 'invert' | 'single' | 'multiple'

// 内置 selections 用哨兵对象承载，真正行为由 applySelection 按 key 分支处理。

/**
 * 内置选择项 key。
 * 对齐 antd `mergedSelection` 的最终 key：'all' / 'invert' / 'none'。
 */
export type BuiltinSelectionKey = 'all' | 'invert' | 'none'

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
  selectedRowKeys: Array<Key>
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
   * 自定义选择项配置（对齐 antd `rowSelection.selections`）。
   * - `true`：用默认 `[SELECTION_ALL, SELECTION_INVERT, SELECTION_NONE]`。
   * - 数组：自定义项列表（可混用内置哨兵 + 自定义 `{ key, text, onSelect }`）。
   * - undefined：不渲染表头下拉菜单。
   * — 详见 docs/design-notes/selection.md（selections 自定义选择项）
   */
  selections?: true | Array<SelectionItem>
  /**
   * 父子勾载是否严格独立（对齐 antd `rowSelection.checkStrictly`，默认 true）。
   * - true：父子独立勾选。
   * - false：父子联动（树形模式）。详见对外 `types.ts` TableRowSelection.checkStrictly 注释。
   *
   * 仅当同时提供 `parentChildrenMap`（树形 parent→children 映射）时有意义；非树形下本字段无效。
   * — 详见 docs/design-notes/selection.md（树形父子联动）
   */
  checkStrictly?: boolean
  /**
   * 树形 parent→children 映射（来自 useTreeData.parentChildrenMap）。
   * key → 该父行的直接子行 keys 数组（含所有层级，不论展开）。
   *
   * 仅树形模式（非空 Map）+ checkStrictly=false 时参与父子联动；否则忽略。
   * — 详见 docs/design-notes/selection.md（树形父子联动）
   */
  parentChildrenMap?: Map<Key, Array<Key>>
}

export interface UseRowSelectionResult<RecordType> {
  /** 是否单选模式。 */
  isRadio: boolean
  /** 全集可勾选 key 数组（未 disabled）。 */
  selectableKeys: Array<Key>
  /** 全集可勾选 record 数组（与 selectableKeys 一一对应）。 */
  selectableRecords: Array<RecordType>
  /** 当前选中 key 集合（Set；去重）。 */
  selectedKeySet: Set<Key>
  /** 全选态（仅多选有意义；单选恒 false）。 */
  allSelected: boolean
  /** 半选态（仅多选有意义；单选恒 false）。 */
  intermediate: boolean
  /** 某 key 是否选中。 */
  isSelected: (key: Key) => boolean
  /**
   * 某 key 是否半选（仅 checkStrictly=false 树形模式有意义）。
   * 半选 = 该 key 是父行，且其子行中**部分**（至少 1 个但非全部）被选中。
   * checkStrictly=true 或非树形 → 恒 false。
   * — 详见 docs/design-notes/selection.md（树形父子联动）
   */
  isIndeterminate: (key: Key) => boolean
  /** 某 record 是否 disabled（不可勾选）。 */
  isDisabled: (record: RecordType) => boolean
  /**
   * 切换某行的勾选态（checkbox 与 radio 共用入口）。
   * - checkbox：在 Set 中 add/delete。
   * - radio：选中即替换为该 key；已选中再点不变（antd radio 行为：再次点击不取消）。
   * 返回新的 `selectedRowKeys` 数组（不直接调 onChange；由调用方决定如何分发）。
   */
  toggleRow: (key: Key) => Array<Key>
  /**
   * 全选/全不选（仅 checkbox；radio 下 no-op）。
   * 当前已全选 → 清空；否则 → 选中所有 selectableKeys。
   */
  toggleAll: () => Array<Key>
  /**
   * 单选指定 key（radio 主用；checkbox 等价于 toggleRow 的"选中"分支）。
   */
  selectRow: (key: Key) => Array<Key>
  /**
   * 当前可选（非 disabled）行的 rowKeys（= changeableRowKeys）。
   * 传给自定义 selection 的 onSelect(changeableRowKeys)。
   */
  changeableRowKeys: Array<Key>
  /**
   * 解析后的 selections 列表（`true` → 默认三项；数组 → 原样；undefined → null）。
   * null 表示不渲染表头下拉菜单。
   * — 详见 docs/design-notes/selection.md（selections 自定义选择项）
   */
  resolvedSelections: Array<SelectionItem> | null
  /**
   * 应用一个 selection 项（菜单点击时调用）。
   * - 内置哨兵（key='all'/'invert'/'none'）→ 引擎直接算新 selectedRowKeys（对齐 antd）。
   * - 自定义项 → 调 `item.onSelect(changeableRowKeys)`（返回 void；demo 内自行 setState）；
   *   引擎不改变 selectedRowKeys（与 antd 一致——自定义 onSelect 自行控制受控 state）。
   * 返回值：内置项返回新 selectedRowKeys 数组（供调用方走 onChange）；自定义项返回 undefined
   *   （调用方据此不触发 onChange——因为 demo 自行 setState 后受控回填会刷新 UI）。
   * — 详见 docs/design-notes/selection.md（selections 自定义选择项）
   */
  applySelection: (
    item: SelectionItem,
  ) => { nextKeys: Array<Key>; method: RowSelectMethod } | null
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

  // === 树形父子联动 ===
  // checkStrictly=false 且提供了 parentChildrenMap（非空 Map）→ 启用联动。
  // - conductCheck（派生）：从受控 selectedRowKeys（可能含父但缺子孙）派生完整 checked 集合
  //   （填充子孙 + 补全父），与 antd conductCheck(checked=true) 同语义。
  // - conductUncheck（生成新数组 on toggle）：取消某 key 时同步清子孙 + 移除不再是全选的祖先。
  // — 详见 docs/design-notes/selection.md（树形父子联动）
  const treeLinkEnabled =
    !isRadio && !checkStrictly && !!parentChildrenMap && parentChildrenMap.size > 0

  // === 全集可勾选 key/record（排除 disabled）===
  const { selectableKeys, selectableRecords } = useMemo(() => {
    const keys: Array<Key> = []
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
  // 树形联动（checkStrictly=false）：从受控 selectedRowKeys 派生"完整 checked 集合"——
  //   填充子孙 + 补全父（与 antd conductCheck 同语义）。isSelected/isIndeterminate/toggleRow
  //   全部基于派生集合；toggleRow 生成的新数组也已是完整 conduced 集合（存回受控源）。
  // — 详见 docs/design-notes/selection.md（树形父子联动）
  const { selectedKeySet, halfCheckedKeySet } = useMemo(() => {
    if (treeLinkEnabled && parentChildrenMap) {
      const { checkedKeys, halfCheckedKeys } = conductTreeCheck(selectedRowKeys, parentChildrenMap)
      return { selectedKeySet: checkedKeys, halfCheckedKeySet: halfCheckedKeys }
    }
    return {
      selectedKeySet: new Set<Key>(selectedRowKeys),
      halfCheckedKeySet: new Set<Key>(),
    }
  }, [treeLinkEnabled, parentChildrenMap, selectedRowKeys])

  // === 全选 / 半选（仅 checkbox）===
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
    // 有选中但未全选 → intermediate。
    const inter = !all && inCount > 0
    return { allSelected: all, intermediate: inter }
  }, [isRadio, selectableKeys, selectedKeySet])

  const isSelected = useCallback(
    (key: Key) => selectedKeySet.has(key),
    [selectedKeySet],
  )

  const isIndeterminate = useCallback(
    (key: Key) => halfCheckedKeySet.has(key),
    [halfCheckedKeySet],
  )

  const isDisabled = useCallback(
    (record: RecordType) => getCheckboxProps?.(record)?.disabled === true,
    [getCheckboxProps],
  )

  // === 操作（不可变；返回新数组）===

  /** 不可变地从数组中 add/delete 一个 key，返回新数组。保留原顺序，新增追加末尾。 */
  const toggleKey = useCallback(
    (key: Key, select: boolean): Array<Key> => {
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
   * 树形联动 toggle（checkStrictly=false 时使用）— 详见 docs/design-notes/selection.md（toggleTreeKey）
   *
   * 选中 key：加入 key + 其全部子孙 keys；向上传播（祖先全部子 checked → 加入祖先，递归向上）。
   * 取消 key：移除 key + 其全部子孙 keys；向上移除不再是全选的祖先（半选态由 conductCheck 派生）。
   * 返回完整 conduced 数组（含父+子孙）。
   */
  const toggleTreeKey = useCallback(
    (key: Key, select: boolean): Array<Key> => {
      if (!parentChildrenMap) return toggleKey(key, select)
      const nextSet = new Set<Key>(selectedKeySet)
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
    (key: Key): Array<Key> => {
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

  const toggleAll = useCallback((): Array<Key> => {
    if (isRadio) return Array.from(selectedKeySet)
    if (allSelected) {
      // 当前已全选 → 清空所有 selectableKeys（保留 selectableKeys 之外的 key，如 disabled 行
      // 之前被选中——antd preserveSelectedRowKeys 语义）。
      const selectableSet = new Set<Key>(selectableKeys)
      const next = Array.from(selectedKeySet).filter((k) => !selectableSet.has(k))
      return next
    }
    // 未全选 → 选中所有 selectableKeys（去重合并，保留原顺序优先）。
    const seen = new Set<Key>(selectedKeySet)
    const next: Array<Key> = Array.from(selectedKeySet)
    for (const k of selectableKeys) {
      if (!seen.has(k)) {
        seen.add(k)
        next.push(k)
      }
    }
    return next
  }, [isRadio, allSelected, selectedRowKeys, selectableKeys])

  const selectRow = useCallback(
    (key: Key): Array<Key> => {
      if (isRadio) return [key]
      return toggleKey(key, true)
    },
    [isRadio, toggleKey],
  )

  // === 自定义选择项 selections ===
  // changeableRowKeys = selectableKeys（所有非 disabled 行 key，对齐 antd `recordKeys`）。
  // — 详见 docs/design-notes/selection.md（selections 自定义选择项）
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
    ): { nextKeys: Array<Key>; method: RowSelectMethod } | null => {
      // 自定义项（非内置 key）：调其 onSelect，返回 null（不触发 onChange）。
      if (item.key !== 'all' && item.key !== 'invert' && item.key !== 'none') {
        item.onSelect?.(changeableRowKeys)
        return null
      }
      // changeableRowKeys 在树形联动下可能含父行（其子孙也在 selectableKeys）。
      // 用 Set 统一处理；ALL/INVERT 结果在树形联动模式下经 conductTreeCheck 补全父。
      const changeableSet = new Set<Key>(changeableRowKeys)
      let nextSet: Set<Key>
      let method: RowSelectMethod
      if (item.key === 'all') {
        // ALL：changeableRowKeys 全选 + 保留已选 disabled 行（不在 changeableSet 中的已选 key）。
        nextSet = new Set<Key>(selectedKeySet)
        for (const k of changeableSet) nextSet.add(k)
        method = 'all'
      } else if (item.key === 'none') {
        // NONE：清空 changeableRowKeys，仅保留已选 disabled 行。
        nextSet = new Set<Key>()
        for (const k of selectedKeySet) {
          if (!changeableSet.has(k)) nextSet.add(k)
        }
        method = 'none'
      } else {
        // INVERT：changeableRowKeys 中 toggle；保留 selectableKeys 之外的 key（disabled 行原样）。
        nextSet = new Set<Key>(selectedKeySet)
        for (const k of changeableSet) {
          if (nextSet.has(k)) nextSet.delete(k)
          else nextSet.add(k)
        }
        method = 'invert'
      }
      // 树形联动：补全父（若所有子选中 → 父也选中），使存回的数组完整。
      let nextKeys: Array<Key>
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
