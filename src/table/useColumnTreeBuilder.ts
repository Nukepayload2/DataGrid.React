/**
 * 引擎列树构建 hook（从 Table.tsx 抽出，机械搬运）。
 *
 * 把 `Table.tsx` L705–824 两个 useMemo（`columnTree` 基础构建 + `columnTreeWithSortAndFilter`
 * 排序/筛选回填）整体搬进 hook。
 *
 * 内含：
 *   - 哨兵遍历插入（共享 `anonCounter`）+ 默认位置 unshift/splice。
 *   - 邻列 fixed 继承（nextCol 优先 prevCol 次；EXPAND_COLUMN 反向继承）。
 *   - 排序/筛选回填（applySortOrderToNode/applyFilterToNode，含 hasAnySorter/hasAnyFilter 短路）。
 *
 * `selectionNode`/`expandNode` 由调用方（Table.tsx）用 selection/expand state 构建后传入。
 *
 * 详见 `docs/engineering-refactor-table-hooks.md` §3.2③。
 */
import { useMemo } from 'react'
import type { EngineColumnNode, FixedSide } from './engine/types'
import {
  EXPAND_COLUMN,
  SELECTION_COLUMN,
  type ColumnOrSentinel,
  type ColumnType,
  type FilterValue,
  type SortOrder,
  type TableProps,
} from './types'
import { toEngineColumns } from './columnAdapter'
import {
  applyFilterToNode,
  applySortOrderToNode,
  hasChildren,
  isNodeFilterable,
} from './sortFilterAdapter'
import { EXPAND_COLUMN_KEY } from './expandAdapter'
import { SELECTION_COLUMN_KEY } from './selectionAdapter'

export interface UseColumnTreeBuilderOptions<RecordType> {
  visibleColumns: Array<ColumnOrSentinel<RecordType>>
  selectionNode: EngineColumnNode<RecordType> | null
  expandNode: EngineColumnNode<RecordType> | null
  showSorterTooltip: TableProps<RecordType>['showSorterTooltip']
  sortOrderMap: Map<string, SortOrder>
  sortPriorityMap: Map<string, number>
  filteredValueMap: Map<string, Array<FilterValue>>
}

export interface UseColumnTreeBuilderResult<RecordType> {
  columnTreeWithSortAndFilter: Array<EngineColumnNode<RecordType>>
}

export function useColumnTreeBuilder<RecordType>(
  options: UseColumnTreeBuilderOptions<RecordType>,
): UseColumnTreeBuilderResult<RecordType> {
  const {
    visibleColumns,
    selectionNode,
    expandNode,
    showSorterTooltip,
    sortOrderMap,
    sortPriorityMap,
    filteredValueMap,
  } = options

  const columnTree = useMemo(() => {
    // 遍历 columns（含哨兵）：哨兵位置插入对应列节点；普通列走 toEngineColumns 单元素构建。
    // 收集哨兵命中信息——若未命中，按默认位置在最前插入。
    let seenSelectionSentinel = false
    let seenExpandSentinel = false
    const result: Array<EngineColumnNode<RecordType>> = []
    // 整棵列树共享一个匿名列计数器。每个匿名列（无 key/dataIndex）按遍历顺序得到唯一的 `col-N`，
    //   避免之前每个顶层列独立调 `toEngineColumns([col])` 导致 `index` 恒 0 → 多个匿名列都回退到
    //   `col-0` → 表头格 React key 重复（virtual-list demo 的 `Group` 与 `Action` 列均无 key/dataIndex）。
    const anonCounter = { seq: 0 }
    for (const item of visibleColumns as Array<ColumnOrSentinel<RecordType>>) {
      if (item === SELECTION_COLUMN) {
        seenSelectionSentinel = true
        if (selectionNode) result.push(selectionNode)
        continue
      }
      if (item === EXPAND_COLUMN) {
        seenExpandSentinel = true
        if (expandNode) result.push(expandNode)
        continue
      }
      // 普通列：单元素构建（与 toEngineColumns 内部一致）；共享 anonCounter 保证全局唯一。
      const col = item as ColumnType<RecordType>
      const node = toEngineColumns<RecordType>([col], anonCounter, showSorterTooltip)[0]
      if (node) result.push(node)
    }
    // 默认位置：未命中哨兵的列插在最前（选择列在前，展开列随后）。
    if (!seenSelectionSentinel && selectionNode) result.unshift(selectionNode)
    if (!seenExpandSentinel && expandNode) {
      // 展开列在选择列之后；若选择列已 unshift 在 0，展开列插在 1，否则插在 0。
      if (!seenSelectionSentinel && selectionNode) result.splice(1, 0, expandNode)
      else result.unshift(expandNode)
    }

    // === 邻列 fixed 继承（对齐 antd useSelection.tsx:694-717）===
    // rowSelection.fixed 未设时，selection 列从邻列继承 fixed —— **优先 nextCol，其次 prevCol**。
    // 修复 bug：此前 selection 列 fixed 仅取 rowSelection.fixed，导致「首列 fixed:'start' +
    //   rowSelection 不设 fixed」时 selection 列不跟随固定（与 antd 行为不一致）。
    // selectionNode 每次 selection state 变都重建，就地赋值即可。
    if (selectionNode?.key === SELECTION_COLUMN_KEY && selectionNode.fixed === undefined) {
      const selIdx = result.indexOf(selectionNode)
      if (selIdx >= 0) {
        const nextCol = result[selIdx + 1]
        const prevCol = result[selIdx - 1]
        let mergedFixed: FixedSide | undefined
        if (nextCol?.fixed !== undefined) {
          mergedFixed = nextCol.fixed
        } else if (prevCol?.fixed !== undefined) {
          mergedFixed = prevCol.fixed
        }
        if (mergedFixed !== undefined) {
          selectionNode.fixed = mergedFixed
          // 可选边界（antd useSelection.tsx:710-717）：selection 列前面是未 fixed 的 EXPAND_COLUMN
          // 时，反向把 expand 也设为同 fixed（保持展开列与选择列同侧固定）。
          if (
            prevCol &&
            prevCol.key === EXPAND_COLUMN_KEY &&
            prevCol.fixed === undefined
          ) {
            prevCol.fixed = mergedFixed
          }
        }
      }
    }
    return result
    // selection / expand state 变化时重建（捕获最新勾选/展开态）；columns 变化时重建。
    // visibleColumns 是 columns 经 responsive 过滤后的结果，依赖项改用 visibleColumns
    //   （screens 变化时 visibleColumns 重算 → columnTree 重建 → 引擎按新列树渲染）。
  }, [visibleColumns, selectionNode, expandNode, showSorterTooltip])

  // 把 useSorter 派生的 sortOrderMap 回填到 columnTree 的叶子节点（引擎据此渲染排序图标 +
  // dg-column-sort 类）。回填按"原始 antd column"匹配：每个叶子引擎节点的 raw 字段保留原始列引用，
  // 从中算出 sortKey（column.key ?? dataIndex），查 sortOrderMap 得 sortOrder。
  // 未匹配的叶子节点 sortOrder 保持 undefined（引擎视为 null）。
  // 同时把 useFilter 派生的 filteredValueMap 回填到可筛选叶子节点（引擎据此渲染漏斗激活态 +
  //   下拉默认勾选）。
  const columnTreeWithSortAndFilter = useMemo(() => {
    // 第一步：排序回填。
    let tree = columnTree
    if (sortOrderMap.size === 0) {
      // 无任何排序列 → 给所有可排序叶子节点显式设 null（确保图标渲染为"无序"态而非 undefined）。
      // 优化：仅当存在至少一个可排序列时才做回填，避免对无排序表格做无谓遍历（零回归）。
      let hasAnySorter = false
      for (const node of columnTree) {
        if (!hasChildren(node) && node.sorter) {
          hasAnySorter = true
          break
        }
      }
      if (hasAnySorter) {
        tree = columnTree.map(
          (node) => applySortOrderToNode(node, sortOrderMap, sortPriorityMap),
        )
      }
    } else {
      tree = columnTree.map(
        (node) => applySortOrderToNode(node, sortOrderMap, sortPriorityMap),
      )
    }
    // 第二步：筛选回填。仅当存在至少一个可筛选列时才做回填（零回归优化）。
    // 激活态门与 filterable 判定单一真理源对齐（与 useFilter.isFilterable 字面一致——
    //   filters 非空 || filterDropdown 存在 || onFilter 存在）。修复「纯 filters 无 onFilter」列
    //   （如 ajax demo Gender）激活态不回填：此前门用 (filters && onFilter) || filterDropdown，
    //   漏掉纯 filters 列 → hasAnyFilter=false → applyFilterToNode 跳过 → filteredValue 恒 null → 漏斗不变蓝。
    //   注：EngineColumnNode 无 filterable 字段（仅 EngineHeaderCell 有），故此处用内联条件复刻 isFilterable。
    let hasAnyFilter = false
    for (const node of tree) {
      if (
        !hasChildren(node) &&
        isNodeFilterable(node)
      ) {
        hasAnyFilter = true
        break
      }
    }
    if (hasAnyFilter) {
      tree = tree.map((node) => applyFilterToNode(node, filteredValueMap))
    }
    return tree
  }, [columnTree, sortOrderMap, sortPriorityMap, filteredValueMap])

  return { columnTreeWithSortAndFilter }
}
