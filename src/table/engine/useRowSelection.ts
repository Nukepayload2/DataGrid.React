/** 行选择状态机。详见 docs/features/interaction/selection.md。 */

import { useCallback, useMemo } from 'react'
import type { Key } from 'react'
import type { RowCheckboxProps } from '../types'

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
  conductTreeCheck,
  resolveKey,
} from './selectionTreeConduction'
import type { SelectionItem } from './selectionTreeConduction'

/** antd RowSelection.type：'checkbox'（多选）/ 'radio'（单选）。 */
export type SelectionType = 'checkbox' | 'radio'

/**
 * 行选择回调用"操作类型"：**单点定义在 `nativeOptions.ts`**（BAT-25 25-A）。
 * 旧版本 `nativeOptions.ts`（公共真身：`types.ts` → `index.ts` 对外导出）与本文件各声明了一份
 * **逐字相同**的 `RowSelectMethod`，两处真相需要人肉同步；现在只留公共那一份，本文件转发。
 * 写法与本文件 `RowCheckboxProps`（缺口 #9）一致：`import type` 供本文件内部使用 +
 * `export type ... from` 维持历史 `from './useRowSelection'` 引用面不破。
 */
import type { RowSelectMethod } from '../nativeOptions'

export type { RowSelectMethod } from '../nativeOptions'

// 内置 selections 用哨兵对象承载，真正行为由 applySelection 按 key 分支处理。

/**
 * 内置选择项 key。
 * 对齐 antd `mergedSelection` 的最终 key：'all' / 'invert' / 'none'。
 */
export type BuiltinSelectionKey = 'all' | 'invert' | 'none'

/**
 * `getCheckboxProps` 返回类型：**单点定义在 `nativeOptions.ts`**（缺口 #9 的①）。
 * 旧版本文件与 `nativeOptions.ts` 各声明了一份（两份都只有 disabled/name，字段已经漂移），
 * 现在引擎只引用那份唯一定义；此处 re-export 维持历史 `from './useRowSelection'` 引用面不破。
 */
export type { RowCheckboxProps } from '../types'

export interface UseRowSelectionOptions<RecordType> {
  /** 'checkbox'（多选，默认）/ 'radio'（单选）。 */
  type?: SelectionType
  /** 受控选中 key 数组（真理源）。 */
  selectedRowKeys: Array<Key>
  /**
   * **全量** dataSource（所有页）。35-F 起只用于**菜单 ALL** 的分母
   * （参照 antd 6.4.4 `useSelection.js:201-208` 遍历 `data`）。表头全选 / 菜单 INVERT /
   * 菜单 NONE 保留面改用 `pageDataSource`（当前页）——三档范围各不相同，不许统一。
   */
  dataSource: Array<RecordType>
  /**
   * **当前页** dataSource（参照 antd `pageData` 等价物，含树形折叠子孙）。
   * 35-F 起是 `selectableKeys` / 表头全选 / 菜单 INVERT / 菜单 NONE 保留面的分母
   * （参照 `useSelection.js:92 flattenData(pageData)` → `:271-277 recordKeys` / `:217-227` /
   * `:242-245 checkboxPropsMap`）。缺省（未分页 / 调用方未喂）时回落 `dataSource`（零回归）。
   */
  pageDataSource?: Array<RecordType>
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
   * — 详见 docs/features/interaction/selection.md（selections 自定义选择项）
   */
  selections?: true | Array<SelectionItem>
  /**
   * 父子勾载是否严格独立（对齐 antd `rowSelection.checkStrictly`，默认 true）。
   * - true：父子独立勾选。
   * - false：父子联动（树形模式）。详见对外 `types.ts` TableRowSelection.checkStrictly 注释。
   *
   * 仅当同时提供 `parentChildrenMap`（树形 parent→children 映射）时有意义；非树形下本字段无效。
   * — 详见 docs/features/interaction/selection.md（树形父子联动）
   */
  checkStrictly?: boolean
  /**
   * 树形 parent→children 映射（来自 useTreeData.parentChildrenMap）。
   * key → 该父行的直接子行 keys 数组（含所有层级，不论展开）。
   *
   * 仅树形模式（非空 Map）+ checkStrictly=false 时参与父子联动；否则忽略。
   * — 详见 docs/features/interaction/selection.md（树形父子联动）
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
  /**
   * 数据源非空且**每一行**都被 `getCheckboxProps().disabled` 禁用（对齐 antd `allDisabled`，
   * antd `useSelection.js` 表头段）。单选模式恒 false（radio 无全选框）。
   * — 详见 docs/features/interaction/selection.md（表头全选 disabled 推导）
   */
  allDisabled: boolean
  /**
   * `allDisabled` 且全部 disabled 行都已选中（对齐 antd `allDisabledAndChecked`）：
   * 此时表头全选框应显示为 checked（虽自身已 disabled 不可点）。
   */
  allCheckedDisabled: boolean
  /**
   * `allDisabled` 且只有部分 disabled 行被选中（对齐 antd `allDisabledSomeChecked`）：
   * 此时表头全选框应显示为半选。
   */
  someDisabledChecked: boolean
  /** 某 key 是否选中。 */
  isSelected: (key: Key) => boolean
  /**
   * 某 key 是否半选（仅 checkStrictly=false 树形模式有意义）。
   * 半选 = 该 key 是父行，且其子行中**部分**（至少 1 个但非全部）被选中。
   * checkStrictly=true 或非树形 → 恒 false。
   * — 详见 docs/features/interaction/selection.md（树形父子联动）
   */
  isIndeterminate: (key: Key) => boolean
  /** 某 record 是否 disabled（不可勾选）。 */
  isDisabled: (record: RecordType) => boolean
  /**
   * 解析后的 `checkStrictly`（缺省 true）。
   *
   * 暴露给适配层的唯一原因：参照的 shift 区间门（antd **6.4.4** `es/table/hooks/useSelection.js:429`
   * `if (shiftKey && checkStrictly && isMultiple)`）里就有这一项——**父子联动模式下参照根本不做区间**
   * （走 `conductCheck` 的单行支）。适配层的区间判据要逐字对齐参照，就必须能从同一处读到该布尔，
   * 而不是自己再去猜 `treeLinkEnabled`（后者还额外要求 `parentChildrenMap` 非空，两者不同集）。
   */
  checkStrictly: boolean
  /**
   * 是否真的启用了树形父子联动（`!radio && checkStrictly===false && parentChildrenMap 非空`）。
   * 适配层据此决定 `getCheckboxProps().indeterminate` 与计算值的先后（antd 的 expandType==='nest'
   * 分支：nest 时计算值覆盖 custom，非 nest 时 custom 覆盖计算值）。
   */
  treeLinkEnabled: boolean
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
   * — 详见 docs/features/interaction/selection.md（selections 自定义选择项）
   */
  resolvedSelections: Array<SelectionItem> | null
  /**
   * 应用一个 selection 项（菜单点击时调用）。
   * - 内置哨兵（key='all'/'invert'/'none'）→ 引擎直接算新 selectedRowKeys（对齐 antd）。
   * - 自定义项 → 调 `item.onSelect(changeableRowKeys)`（返回 void；demo 内自行 setState）；
   *   引擎不改变 selectedRowKeys（与 antd 一致——自定义 onSelect 自行控制受控 state）。
   * 返回值：内置项返回新 selectedRowKeys 数组（供调用方走 onChange）；自定义项返回 undefined
   *   （调用方据此不触发 onChange——因为 demo 自行 setState 后受控回填会刷新 UI）。
   * — 详见 docs/features/interaction/selection.md（selections 自定义选择项）
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
    pageDataSource,
    rowKey,
    getCheckboxProps,
    selections,
    checkStrictly = true,
    parentChildrenMap,
  } = options
  const isRadio = type === 'radio'
  // 35-F：当前页分母（参照 antd pageData 等价物）。未喂（未分页 / 调用方未传）时回落全量
  // dataSource ⇒ 不分页场景零回归（此时「当前页」＝全量）。
  const pageData = pageDataSource ?? dataSource

  // === 树形父子联动 ===
  // checkStrictly=false 且提供了 parentChildrenMap（非空 Map）→ 启用联动。
  // - conductCheck（派生）：从受控 selectedRowKeys（可能含父但缺子孙）派生完整 checked 集合
  //   （填充子孙 + 补全父），与 antd conductCheck(checked=true) 同语义。
  // - conductUncheck（生成新数组 on toggle）：取消某 key 时同步清子孙 + 移除不再是全选的祖先。
  // — 详见 docs/features/interaction/selection.md（树形父子联动）
  const treeLinkEnabled =
    !isRadio && !checkStrictly && !!parentChildrenMap && parentChildrenMap.size > 0

  // === 当前页可勾选 key/record（排除 disabled）===
  // 35-F：分母从「全量 dataSource」改为「当前页 pageData」（参照 antd 6.4.4
  // useSelection.js:92 `flattenData(pageData)` → :271-277 recordKeys）。表头全选 / 菜单 INVERT /
  // 菜单 NONE 保留面 / 表头三态（allSelected/intermediate/allDisabled*）全部随当前页。
  // 顺带产出 disabledKeySet（当前页 disabled，供树形联动 + NONE 保留面）与 allDisabled
  // （供表头全选框推导 disabled/checked/半选，对齐 antd allDisabled*）。
  const { selectableKeys, selectableRecords, disabledKeySet, allDisabled } = useMemo(() => {
    const keys: Array<Key> = []
    const records: Array<RecordType> = []
    const disabledKeys = new Set<Key>()
    for (const record of pageData) {
      const disabled = getCheckboxProps?.(record)?.disabled === true
      const key = resolveKey(record, rowKey)
      if (disabled) {
        disabledKeys.add(key)
        continue
      }
      keys.push(key)
      records.push(record)
    }
    return {
      selectableKeys: keys,
      selectableRecords: records,
      disabledKeySet: disabledKeys,
      allDisabled: pageData.length > 0 && keys.length === 0,
    }
  }, [pageData, rowKey, getCheckboxProps])

  // === 全量可勾选 key（菜单 ALL 专用分母）===
  // 35-F：参照 antd 6.4.4 useSelection.js:201-208 菜单 ALL 遍历 **data（全量所有页）**，
  // 与上面「当前页」分母刻意不同——三档范围各不相同，不许统一成一份。
  const allChangeableKeys = useMemo(() => {
    const keys: Array<Key> = []
    for (const record of dataSource) {
      if (getCheckboxProps?.(record)?.disabled === true) continue
      keys.push(resolveKey(record, rowKey))
    }
    return keys
  }, [dataSource, rowKey, getCheckboxProps])

  // === 全量 disabled key 集（树形联动专用，35-F）===
  // 树形 conduction 判「哪些子行不参与传导」必须用**全量** disabled（一行 disabled 与否是
  // 行属性，跨页一致——antd `conductCheck` 走 `isCheckboxDisabled(record)`，按 record 判，
  // 不分页）。若误用当前页 disabledKeySet，翻页后「另一页上 disabled 的行」会被当可选 →
  // 传导把它选上（实测 dg 把跨页 disabled 行勾上，antd 不勾）。
  // 注意与上面「当前页 disabledKeySet」刻意不同：后者供表头三态 + 菜单 NONE 保留面（antd
  // checkboxPropsMap 建在 pageData 上，随当前页）。
  const allDisabledKeySet = useMemo(() => {
    const disabledKeys = new Set<Key>()
    for (const record of dataSource) {
      if (getCheckboxProps?.(record)?.disabled === true) {
        disabledKeys.add(resolveKey(record, rowKey))
      }
    }
    return disabledKeys
  }, [dataSource, rowKey, getCheckboxProps])

  /** 某 key 是否属于（全量）数据源里的 disabled 行（树形联动 conduction 判据）。 */
  const isKeyDisabled = useCallback(
    (key: Key) => allDisabledKeySet.has(key),
    [allDisabledKeySet],
  )

  // === 当前选中 Set（去重；受控源 selectedRowKeys）===
  // 注意：selectedRowKeys 可能含 selectableKeys 之外的 key（如 disabled 行之前被选中、
  // 或 record 已不存在）。antd `preserveSelectedRowKeys` 控制是否保留这些；本 hook 不删除
  // 它们（保留语义），但 allSelected/intermediate 判定只看 selectableKeys 子集。
  //
  // 树形联动（checkStrictly=false）：从受控 selectedRowKeys 派生"完整 checked 集合"——
  //   填充子孙 + 补全父（与 antd conductCheck 同语义）。isSelected/isIndeterminate/toggleRow
  //   全部基于派生集合；toggleRow 生成的新数组也已是完整 conduced 集合（存回受控源）。
  // — 详见 docs/features/interaction/selection.md（树形父子联动）
  const { selectedKeySet, halfCheckedKeySet } = useMemo(() => {
    if (treeLinkEnabled && parentChildrenMap) {
      const { checkedKeys, halfCheckedKeys } = conductTreeCheck(
        selectedRowKeys,
        parentChildrenMap,
        isKeyDisabled,
      )
      return { selectedKeySet: checkedKeys, halfCheckedKeySet: halfCheckedKeys }
    }
    return {
      selectedKeySet: new Set<Key>(selectedRowKeys),
      halfCheckedKeySet: new Set<Key>(),
    }
  }, [treeLinkEnabled, parentChildrenMap, selectedRowKeys, isKeyDisabled])

  // === 全选 / 半选（仅 checkbox）===
  //   - allSelected：selectableKeys 全部在 selectedKeySet 中。
  //   - intermediate：selectableKeys 中至少 1 个在 selectedKeySet 中、且未全选。
  // 单选（radio）下恒为 false（无全选概念）。
  // 全 disabled（allDisabled）时 selectableKeys 为空 → allSelected/intermediate 都立不起来，
  // 表头三态改由 allCheckedDisabled / someDisabledChecked 承载（对齐 antd
  // allDisabledAndChecked / allDisabledSomeChecked）。
  const { allSelected, intermediate, allCheckedDisabled, someDisabledChecked } = useMemo(() => {
    if (isRadio) {
      return {
        allSelected: false,
        intermediate: false,
        allCheckedDisabled: false,
        someDisabledChecked: false,
      }
    }
    let inCount = 0
    for (const k of selectableKeys) {
      if (selectedKeySet.has(k)) inCount += 1
    }
    const all = inCount === selectableKeys.length && inCount > 0
    // 有选中但未全选 → intermediate。
    const inter = !all && inCount > 0
    if (!allDisabled) {
      return {
        allSelected: all,
        intermediate: inter,
        allCheckedDisabled: false,
        someDisabledChecked: false,
      }
    }
    // 全 disabled：按 disabled 行的选中情况推导体头三态。
    let disabledCheckedCount = 0
    for (const k of disabledKeySet) {
      if (selectedKeySet.has(k)) disabledCheckedCount += 1
    }
    const allDisabledChecked = disabledCheckedCount === disabledKeySet.size
    return {
      allSelected: all,
      intermediate: inter,
      allCheckedDisabled: allDisabledChecked,
      someDisabledChecked: !allDisabledChecked && disabledCheckedCount > 0,
    }
  }, [isRadio, selectableKeys, selectedKeySet, allDisabled, disabledKeySet])

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
   * 树形联动 toggle（checkStrictly=false 时使用）— 详见 docs/features/interaction/selection.md（toggleTreeKey）
   *
   * 选中 key：交给 `conductTreeCheck` 做「填充子孙 + 向上补全父」，disabled 行不参与
   * （点父行不会把明确禁用的子行选上，对齐 antd `conductCheck(…, isCheckboxDisabled)`）。
   * 取消 key：移除 key + 其**可选**子孙（遇 disabled 子树即停，保留其自身显式选中态）；
   * 再向上移除「可选子行已不全选」的祖先（半选态由 conductCheck 派生）。
   * 返回完整 conduced 数组（含父+子孙）。
   */
  const toggleTreeKey = useCallback(
    (key: Key, select: boolean): Array<Key> => {
      if (!parentChildrenMap) return toggleKey(key, select)
      const nextSet = new Set<Key>(selectedKeySet)
      if (select) {
        nextSet.add(key)
        const { checkedKeys } = conductTreeCheck(
          Array.from(nextSet),
          parentChildrenMap,
          isKeyDisabled,
        )
        return Array.from(checkedKeys)
      }
      nextSet.delete(key)
      // 向下清：只清可选子行，disabled 子树整支保留（它自己的选中态由用户显式负责）。
      const stack: Array<Key> = [key]
      while (stack.length > 0) {
        const k = stack.pop()!
        const children = parentChildrenMap.get(k)
        if (!children) continue
        for (const c of children) {
          if (isKeyDisabled(c)) continue
          nextSet.delete(c)
          stack.push(c)
        }
      }
      // 向上清：祖先的「可选子行」不再全选 → 移出祖先。
      // 对齐 rc-tree@1.3.2 cleanConductCheck 自底向上段（conductUtil.js:134-149）：allChecked 初值
      // true、仅遍历非 disabled 子行；**无可选子行**（全 disabled 或空 children）时 forEach 空转 ⇒
      // allChecked 保持 true ⇒ 不删祖先。旧写法 `if (hasSelectableChild && allChecked) continue` 会在
      // hasSelectableChild===false 时误删「子行全 disabled 但自身已勾选」的可选祖先——当被取消行的祖先链
      // 上隔着一条全 disabled 中间层时（探针 3WAY-fork / RFORK：dg 误删 root，antd 保留）＝勾选/取消
      // 不对称的 A 类数据结果。故删仅当 `!allChecked`（无可选子即 continue）。
      for (const ancestor of collectAncestors(key, parentChildrenMap)) {
        const children = parentChildrenMap.get(ancestor)
        if (!children) continue
        let allChecked = true
        for (const c of children) {
          if (isKeyDisabled(c)) continue
          if (!nextSet.has(c)) {
            allChecked = false
            break
          }
        }
        if (allChecked) continue
        nextSet.delete(ancestor)
      }
      return Array.from(nextSet)
    },
    [parentChildrenMap, selectedKeySet, toggleKey, isKeyDisabled],
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
  // — 详见 docs/features/interaction/selection.md（selections 自定义选择项）
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
   * 内置哨兵按 key 分支（对齐 antd 6.4.4 mergedSelections 的 ALL/INVERT/NONE 行为）。
   * **三档分母各不相同**（35-F，参照 useSelection.js，不许统一）：
   *   - ALL（:201-208 遍历 **data 全量**）：选中所有**全量**非 disabled 行（allChangeableKeys），
   *     并保留 selectedRowKeys 中已选的 disabled 行（antd ALL：`!disabled || selected`）。
   *   - INVERT（:217-227 遍历 **pageData 当前页**）：changeableRowKeys（当前页非 disabled）中
   *     未选→选、已选→清；disabled 行原样保留。
   *   - NONE（:242-245 `filter(key => checkboxPropsMap.get(key)?.disabled)`，checkboxPropsMap
   *     建在 pageData）：清空**全部**已选（跨页），只保留「**当前页**上 disabled 且已选」的 key
   *     （disabledKeySet ∩ selectedKeySet）——跨页的 disabled-已选行也被清掉。
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
      // 当前页非 disabled（INVERT 分母 + 自定义项 onSelect 入参）；全量非 disabled（ALL 分母）。
      // 树形联动下两者都可能含父行（其子孙也在 selectableKeys）；结果在联动模式下经
      // conductTreeCheck 补全父。
      const changeableSet = new Set<Key>(changeableRowKeys)
      const allChangeableSet = new Set<Key>(allChangeableKeys)
      let nextSet: Set<Key>
      let method: RowSelectMethod
      if (item.key === 'all') {
        // ALL：**全量**非 disabled 全选 + 保留已选 disabled 行（起点是完整 selectedKeySet）。
        nextSet = new Set<Key>(selectedKeySet)
        for (const k of allChangeableSet) nextSet.add(k)
        method = 'all'
      } else if (item.key === 'none') {
        // NONE：清空全部，仅保留「当前页 disabled 且已选」的 key（参照 checkboxPropsMap 建在 pageData）。
        nextSet = new Set<Key>()
        for (const k of selectedKeySet) {
          if (disabledKeySet.has(k)) nextSet.add(k)
        }
        method = 'none'
      } else {
        // INVERT：**当前页**非 disabled 中 toggle；disabled 行与跨页行原样保留。
        nextSet = new Set<Key>(selectedKeySet)
        for (const k of changeableSet) {
          if (nextSet.has(k)) nextSet.delete(k)
          else nextSet.add(k)
        }
        method = 'invert'
      }
      // 树形联动：补全父（若所有可选子选中 → 父也选中），使存回的数组完整。
      // disabled 行不参与传导（与 toggleTreeKey 同一条 conduction 路径）。
      let nextKeys: Array<Key>
      if (treeLinkEnabled && parentChildrenMap) {
        const { checkedKeys } = conductTreeCheck(
          Array.from(nextSet),
          parentChildrenMap,
          isKeyDisabled,
        )
        nextKeys = Array.from(checkedKeys)
      } else {
        nextKeys = Array.from(nextSet)
      }
      return { nextKeys, method }
    },
    [
      changeableRowKeys,
      allChangeableKeys,
      disabledKeySet,
      selectedKeySet,
      treeLinkEnabled,
      parentChildrenMap,
      isKeyDisabled,
    ],
  )

  return {
    isRadio,
    selectableKeys,
    selectableRecords,
    selectedKeySet,
    allSelected,
    intermediate,
    allDisabled,
    allCheckedDisabled,
    someDisabledChecked,
    isSelected,
    isIndeterminate,
    isDisabled,
    checkStrictly,
    treeLinkEnabled,
    toggleRow,
    toggleAll,
    selectRow,
    changeableRowKeys,
    resolvedSelections,
    applySelection,
  }
}
