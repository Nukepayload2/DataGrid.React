/**
 * 树形联动 conduction 纯函数簇 + 内置哨兵常量 — 详见 docs/design-notes/selection.md（树形父子联动）
 *
 * 从 useRowSelection.ts 抽出的模块级纯函数与常量：
 *   - resolveKey：record → React.Key 解析（与 GridTable.getRowKey 同语义）。
 *   - collectDescendants/collectAncestors：parentChildrenMap 上的子孙/祖先收集。
 *   - conductTreeCheck：树形联动 conduction（对齐 antd rc-tree conductCheck）。
 *   - SELECTION_ALL/NONE/INVERT：内置哨兵对象（被 index.ts 导出，作为运行时真理源）。
 *
 * 全部为纯函数（不依赖 hook state/setter），可独立单测。
 * useRowSelection 从本文件 re-export 哨兵，保证 `from './engine/useRowSelection'` 的
 * index.ts 导出路径仍通向同一对象引用（引用相等不破）。
 */

import type { ReactNode } from 'react'
import type { Key } from 'react'

/**
 * 自定义选择项（对齐 antd `SelectionItem`）— 详见 docs/design-notes/selection.md
 *
 * - `key`：项唯一标识（菜单 React key）。
 * - `text`：菜单展示文案（ReactNode）。
 * - `onSelect(changeableRowKeys)`：点击回调；`changeableRowKeys` 为当前所有可选（非 disabled）
 *   行的 rowKeys 数组（与 antd 签名一致）。返回 void——demo 内自行 setSelectedRowKeys
 *   实现自定义选择逻辑（如 odd/even）。
 *
 * 内置哨兵（`SELECTION_ALL/NONE/INVERT`）亦实现此接口，但其 `onSelect` 为占位——真正行为由
 * `useRowSelection.applySelection` 按 key 分支处理。
 */
export interface SelectionItem {
  key: string
  text?: ReactNode
  onSelect?: (changeableRowKeys: Array<Key>) => void
}

/** 内置哨兵：全选。 */
export const SELECTION_ALL: SelectionItem = {
  key: 'all',
  text: 'Select all data',
  onSelect: () => {},
}

/** 内置哨兵：反选。 */
export const SELECTION_INVERT: SelectionItem = {
  key: 'invert',
  text: 'Invert current page',
  onSelect: () => {},
}

/** 内置哨兵：清空。 */
export const SELECTION_NONE: SelectionItem = {
  key: 'none',
  text: 'Clear all data',
  onSelect: () => {},
}

/**
 * 把 record 解析为 React.Key（字符串/数字）。
 * 与 GridTable.getRowKey 同语义；这里独立实现避免引擎耦合。
 */
export function resolveKey<RecordType>(
  record: RecordType,
  rowKey: string | ((record: RecordType) => string | number),
): Key {
  if (typeof rowKey === 'function') return rowKey(record)
  const v = (record as any)?.[rowKey]
  return v === undefined ? '' : v
}

/**
 * 树形联动：收集某 key 的全部子孙 keys（递归 parentChildrenMap）。
 */
export function collectDescendants(
  key: Key,
  parentChildrenMap: Map<Key, Array<Key>>,
): Array<Key> {
  const out: Array<Key> = []
  const stack: Array<Key> = [key]
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
 * 树形联动：收集某 key 的全部祖先 keys（自底向上）。
 * 通过遍历 parentChildrenMap 反查（线性扫描）——树规模通常不大，可接受。
 */
export function collectAncestors(
  key: Key,
  parentChildrenMap: Map<Key, Array<Key>>,
): Array<Key> {
  const ancestors: Array<Key> = []
  // 构建 child→parent 映射（一次性）以 O(depth) 查找。
  // 这里每次调用都重建——调用频率低（toggle/全选），可接受。
  const childToParent = new Map<Key, Key>()
  for (const [parent, children] of parentChildrenMap) {
    for (const c of children) childToParent.set(c, parent)
  }
  let current: Key | undefined = key
  while (true) {
    const parent = childToParent.get(current as Key)
    if (parent === undefined) break
    ancestors.push(parent)
    current = parent
  }
  return ancestors
}

/**
 * 树形联动 conduction（对齐 antd rc-tree `conductCheck`）— 详见 docs/design-notes/selection.md（树形父子联动）
 *
 * 输入"原始 selectedRowKeys"（可能含父但缺子孙，或含子但缺父），输出：
 *   - checkedKeys：完整勾选集合（填充子孙 + 补全所有子已选中的父）。
 *   - halfCheckedKeys：半选父集合（部分子选中、未全选）。
 *
 * 与 antd conductCheck 略简化：不处理 disabled 行的"强制不参与"复杂规则（disabled 子行仍参与父全选判定）。
 */
export function conductTreeCheck(
  inputKeys: Array<Key>,
  parentChildrenMap: Map<Key, Array<Key>>,
): { checkedKeys: Set<Key>; halfCheckedKeys: Set<Key> } {
  const checked = new Set<Key>(inputKeys)
  // Step 1: 填充子孙（父选中 → 全部子孙选中）。
  const descendantsToAdd: Array<Key> = []
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
  const halfChecked = new Set<Key>()
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
