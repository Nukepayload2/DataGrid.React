import { resolveColumnSortKey, resolveFilterKey } from './engine/columnKeys'
import type { EngineColumnNode } from './engine/types'
import type { ColumnType, FilterValue, SortOrder } from './types'

/**
 * 节点是否有子列（多级表头；排序仅作用于叶子列）。
 */
export function hasChildren<RecordType>(
  node: EngineColumnNode<RecordType>,
): boolean {
  return !!node.children && node.children.length > 0
}

/**
 * 把 useSorter 派生的 sortOrderMap + sortPriorityMap 回填到列树节点。
 *
 * 规则：
 *   - 叶子节点（无 children）：从其 raw（原始 antd column）算出 sortKey（column.key ?? dataIndex），
 *     查 sortOrderMap；命中 → 设 sortOrder；未命中但该列可排序（node.sorter 为 truthy）→ 设 null
 *     （确保引擎渲染"无序"图标态）；不可排序列保持 undefined。
 *     再查 sortPriorityMap；命中（order 非 null 且多列模式下有序号）→ 设 sortPriority；
 *     否则 undefined（引擎不渲染优先级数字）。
 *   - 分组节点：递归处理 children（分组节点本身无 sortOrder）。
 *
 * 返回**浅拷贝**的节点（不改原引用），避免原 columnTree 被污染（每次 sortOrder 变化都应产生新树）。
 *
 * 详见 `docs/features/interaction/filter-sorter.md` 的「排序状态模型」与「多列排序优先级徽标」两节。
 */
export function applySortOrderToNode<RecordType>(
  node: EngineColumnNode<RecordType>,
  sortOrderMap: Map<string, SortOrder>,
  sortPriorityMap: Map<string, number>,
): EngineColumnNode<RecordType> {
  if (hasChildren(node)) {
    // 分组节点：递归处理子节点。
    const newChildren = node.children!.map(
      (child) => applySortOrderToNode(child, sortOrderMap, sortPriorityMap),
    )
    return { ...node, children: newChildren }
  }
  // 叶子节点：回填 sortOrder。
  // 不可排序列（sorter 为 falsy）：sortOrder 保持 undefined（引擎不渲染图标）。
  if (!node.sorter) return node
  const raw = node.raw as ColumnType<RecordType> | undefined
  const sortKey = raw ? resolveColumnSortKey(raw) : undefined
  const key = sortKey !== undefined ? String(sortKey) : undefined
  const order = key !== undefined ? sortOrderMap.get(key) : undefined
  // 仅当该列激活（order 非 null）时查优先级序号；未激活或单列模式 → undefined。
  const priority =
    order !== null && key !== undefined ? sortPriorityMap.get(key) : undefined
  return { ...node, sortOrder: order ?? null, sortPriority: priority }
}

/**
 * 判定 `EngineColumnNode` 是否可筛选——与 `useFilter.isFilterable` 字面一致
 * （antd `useFilter/index.tsx:38`：filters 非空 || filterDropdown 存在 || onFilter 存在）。
 *
 * 激活态回填门（hasAnyFilter + applyFilterToNode 跳过条件）需与 filterable 判定单一真理源对齐。
 * `EngineColumnNode` 无 `filterable` 字段（仅 `EngineHeaderCell` 在 columnTree.ts:206 计算），
 * 故此处用内联条件复刻 isFilterable，避免引入跨类型字段或破坏列树结构。
 *
 * - filters + onFilter 列：true（filters 已定义）。
 * - filterDropdown 列（无 filters）：true（filterDropdown 存在）。
 * - 纯 filters 无 onFilter 列（如 ajax Gender）：true（filters 已定义）。
 * - 空数组（`filters: []`）：true（对齐 antd truthy 判定——画漏斗 + 空面板走 renderEmpty）。
 * - 仅 onFilter（filters 空、filterDropdown 空）：true（兜底）。
 * - 三者皆无：false。
 */
export function isNodeFilterable<RecordType>(
  node: EngineColumnNode<RecordType>,
): boolean {
  if (node.filterDropdown !== undefined && node.filterDropdown !== null) return true
  // filters 已定义即 true（含空数组，对齐 antd truthy 判定：`filters: []` 也渲染漏斗 + 空面板走 renderEmpty）。
  if (node.filters) return true
  return typeof node.onFilter === 'function'
}

/**
 * 把 useFilter 派生的 filteredValueMap 回填到列树节点。
 *
 * 规则（19-A 之后，叶子与分组**同一套**）：
 *   - 任一节点（叶子或分组）：若 `isNodeFilterable(node)`，从其 raw（原始 antd column）算出
 *     filterKey（与 sortKey 同算法：column.key ?? dataIndex），查 filteredValueMap；
 *     命中 → 设 filteredValue；未命中但可筛选 → 设 null（确保漏斗为 Outlined 灰态）；
 *     不可筛选节点保持 undefined。
 *   - 分组节点：回填**自己之后**再递归处理 children（参照 antd@6.4.4
 *     `es/table/hooks/useFilter/index.js` 的 `getMergedColumns:151-156`——分组节点本身既进筛选
 *     收集面、又是漏斗宿主；此前只递归子层 ⇒ 分组格的激活态永远拿不到）。
 *   - 跳过条件与 `useFilter.isFilterable` 字面一致（filters 非空 || filterDropdown 存在 ||
 *     onFilter 存在），单一真理源见本文件 `isNodeFilterable`。
 *
 * 返回**浅拷贝**的节点（不改原引用）。
 *
 * 详见 `docs/features/interaction/filter-sorter.md` 的「筛选状态模型」一节。
 */
export function applyFilterToNode<RecordType>(
  node: EngineColumnNode<RecordType>,
  filteredValueMap: Map<string, Array<FilterValue>>,
): EngineColumnNode<RecordType> {
  // 回填本节点（叶子与分组**同一套规则**，19-A：分组节点自身也在参照的筛选收集面内）。
  let next = node
  if (isNodeFilterable(node)) {
    const raw = node.raw as ColumnType<RecordType> | undefined
    const filterKey = raw ? resolveFilterKey(raw) : undefined
    const key = filterKey !== undefined ? String(filterKey) : undefined
    const value = key !== undefined ? filteredValueMap.get(key) : undefined
    next = { ...node, filteredValue: value ?? null }
  }
  if (hasChildren(next)) {
    const newChildren = next.children!.map(
      (child) => applyFilterToNode(child, filteredValueMap),
    )
    return { ...next, children: newChildren }
  }
  // 不可筛选列：filteredValue 保持 undefined。
  return next
}
