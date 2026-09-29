/**
 * 树形联动 conduction 纯函数簇 + 内置哨兵常量 — 详见 docs/features/interaction/selection.md（树形父子联动）
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
 * 自定义选择项（对齐 antd `SelectionItem`）— 详见 docs/features/interaction/selection.md
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
 * 树形联动 conduction（对齐 antd rc-tree `conductCheck` 的 fill 分支）
 * — 详见 docs/features/interaction/selection.md（树形父子联动）
 *
 * 输入"原始 selectedRowKeys"（可能含父但缺子孙，或含子但缺父），输出：
 *   - checkedKeys：完整勾选集合（填充子孙 + 补全所有可选子已选中的父）。
 *   - halfCheckedKeys：半选父集合（部分可选子选中、未全选）。
 *
 * `isDisabled`（可选）：某 key 是否被 `getCheckboxProps().disabled` 禁用。传入时按 antd
 * （`conductCheck(…, isCheckboxDisabled)`）的三条规则排除 disabled 行：
 *   1. 填充子孙只加「未 disabled」的子行；
 *   2. disabled 节点**不向下传播**（其自身即便已在集合里也不代表子孙该选）；
 *   3. 父行「全选/半选」判定的分母只算可选子行；disabled 父行与「无可选中子行」的父行
 *      都不参与判定（既不判选中也不判半选）。
 * 不传时全部视为可选 → 与历史行为完全一致（无 disabled 的表格零回归）。
 */
export function conductTreeCheck(
  inputKeys: Array<Key>,
  parentChildrenMap: Map<Key, Array<Key>>,
  isDisabled?: (key: Key) => boolean,
): { checkedKeys: Set<Key>; halfCheckedKeys: Set<Key> } {
  const disabled = (k: Key) => (isDisabled ? isDisabled(k) === true : false)
  const checked = new Set<Key>(inputKeys)

  // 层序表（BFS）：roots（不是任何人的子的父）先入队，逐个把直接子追加到队尾。
  // BFS 保证「父一定早于其子被处理」——Step1 正向遍历即自顶向下填充，
  // 新入队的子行能在后续迭代里继续向下传播（等价于 rc-tree 的按 level 遍历）。
  const childKeySet = new Set<Key>()
  for (const children of parentChildrenMap.values()) {
    for (const c of children) childKeySet.add(c)
  }
  const levelOrder: Array<Key> = []
  const queued = new Set<Key>()
  for (const parent of parentChildrenMap.keys()) {
    if (!childKeySet.has(parent)) {
      levelOrder.push(parent)
      queued.add(parent)
    }
  }
  // Step 1: 自顶向下填充子孙（选中且未 disabled 的父 → 其全部可选子）。
  for (let i = 0; i < levelOrder.length; i += 1) {
    const k = levelOrder[i]
    const children = parentChildrenMap.get(k)
    if (!children) continue
    for (const c of children) {
      if (queued.has(c)) continue
      queued.add(c)
      levelOrder.push(c)
    }
    if (!checked.has(k) || disabled(k)) continue
    for (const c of children) {
      if (!disabled(c)) checked.add(c)
    }
  }

  // Step 2: 自底向上补全父（迭代顺序 = BFS 逆序，深层先判，保证传播到顶）。
  // 每个父只判一次（rc-tree 的 visitedKeys 同义）；disabled 父行、disabled 子行
  // 以及「无可选中子」的父行都跳过（对齐 rc-tree fillConductCheck 的三处 return）。
  const halfChecked = new Set<Key>()
  const visited = new Set<Key>()
  for (let i = levelOrder.length - 1; i >= 0; i -= 1) {
    const parent = levelOrder[i]
    if (disabled(parent)) continue
    const children = parentChildrenMap.get(parent)
    if (children === undefined) continue
    if (visited.has(parent)) continue
    visited.add(parent)
    let allChecked = true
    let partialChecked = false
    let hasSelectableChild = false
    // ⚠️ 时序前提：下面读 `halfChecked.has(c)` 之所以不需要不动点循环，是因为本循环按
    // **BFS 逆序**迭代（`:177` 从 levelOrder.length-1 递减），而 levelOrder 由 Step 1 自顶向下
    // 入队 ⇒ 子行一定在其父行之前被判定、其 halfChecked 已写入。**改动 Step 1/2 的迭代顺序
    // （例如改成自底向上收集 levelOrder、或给 Step 2 换排序）会静默破掉这条读法**——父行会漏掉
    // 靠后的子行的半选。参照侧同理由：rc-tree 按 level 从 maxLevel 递减遍历 entities。
    for (const c of children) {
      if (disabled(c)) continue
      hasSelectableChild = true
      const isChecked = checked.has(c)
      // 子行「有选中成分」= 自身 checked **或** 自身 halfChecked（半选向上级联，对齐
      // rc-tree fillConductCheck 的 `checked || halfCheckedKeys.has(key)`）。三层树里
      // mid 半选时 root 必须也进 halfChecked，否则 root 两个判据同时落空、三态全丢。
      // 注意 half-only 的子行同样要打掉 allChecked —— 参照的 `if (allChecked && !checked)`
      // 就是这个意思；写成 `if (isChecked) … else allChecked = false` 会把
      // 「子行 = {半选, 全选}」的父行错判成全选。
      if (!isChecked) allChecked = false
      if (!partialChecked && (isChecked || halfChecked.has(c))) partialChecked = true
    }
    // 无可选中子行 → 父行不参与判定（既不判选中也不判半选，对齐 rc-tree：
    // fillConductCheck 的自底向上循环遍历**实体**、判据挂在 entity.parent 上，
    // 子实体全 disabled（在第一个 guard 就 return）或压根没有子实体时，都没有任何一次
    // 迭代去判这个父行）。`children` 为空数组的表项与此同属一件事：`hasSelectableChild`
    // 已覆盖它。注：该表项在生产路径**可**出现（useTreeData.ts:183-188 —— 父行的 children
    // 非空但每个子行 rowKey 都不可解析时登记 `[]`），旧版在此把父行判成全选是缺陷。
    if (!hasSelectableChild) continue
    if (allChecked) checked.add(parent)
    if (partialChecked) halfChecked.add(parent)
  }
  // 清理 halfChecked 中已升为 checked 的（若某父刚被补入 checked 则不在半选）。
  for (const k of Array.from(halfChecked)) {
    if (checked.has(k)) halfChecked.delete(k)
  }
  return { checkedKeys: checked, halfCheckedKeys: halfChecked }
}
