import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useColumnTreeBuilder } from '../useColumnTreeBuilder'
import { EXPAND_COLUMN, SELECTION_COLUMN } from '../types'
import { EXPAND_COLUMN_KEY } from '../expandAdapter'
import { SELECTION_COLUMN_KEY } from '../selectionAdapter'
import type { EngineColumnNode } from '../engine/types'
import type { ColumnType, ColumnOrSentinel } from '../types'

interface Rec {}

// ===== 桩构造器 =====
function selNode(fixed?: 'start' | 'end'): EngineColumnNode<Rec> {
  return {
    key: SELECTION_COLUMN_KEY,
    title: 'sel',
    fixed,
  } as EngineColumnNode<Rec>
}

function expandNode(fixed?: 'start' | 'end'): EngineColumnNode<Rec> {
  return {
    key: EXPAND_COLUMN_KEY,
    title: 'expand',
    fixed,
  } as EngineColumnNode<Rec>
}

/** 构造一个带 raw 的叶子节点（用于排序/筛选回填测试）。 */
function leafNode(
  key: string,
  opts: {
    sorter?: boolean | Function
    dataIndex?: string
    filters?: Array<any>
    onFilter?: Function
    filterDropdown?: any
    fixed?: 'start' | 'end'
  } = {},
): EngineColumnNode<Rec> {
  const raw: ColumnType<Rec> = {
    key,
    dataIndex: opts.dataIndex ?? key,
    ...(opts.sorter !== undefined ? { sorter: opts.sorter as any } : {}),
    ...(opts.filters !== undefined ? { filters: opts.filters } : {}),
    ...(opts.onFilter !== undefined ? { onFilter: opts.onFilter as any } : {}),
    ...(opts.filterDropdown !== undefined
      ? { filterDropdown: opts.filterDropdown }
      : {}),
  }
  return {
    key,
    title: key,
    dataIndex: opts.dataIndex ?? key,
    raw,
    ...(opts.sorter !== undefined ? { sorter: opts.sorter as any } : {}),
    ...(opts.filters !== undefined ? { filters: opts.filters } : {}),
    ...(opts.onFilter !== undefined ? { onFilter: opts.onFilter as any } : {}),
    ...(opts.filterDropdown !== undefined
      ? { filterDropdown: opts.filterDropdown }
      : {}),
    ...(opts.fixed !== undefined ? { fixed: opts.fixed } : {}),
  } as EngineColumnNode<Rec>
}

interface RenderOpts {
  visibleColumns?: Array<ColumnOrSentinel<Rec>>
  selectionNode?: EngineColumnNode<Rec> | null
  expandNode?: EngineColumnNode<Rec> | null
  sortOrderMap?: Map<string, any>
  sortPriorityMap?: Map<string, number>
  filteredValueMap?: Map<string, Array<any>>
}

function renderBuilder(overrides: RenderOpts = {}) {
  return renderHook(() =>
    useColumnTreeBuilder<Rec>({
      visibleColumns: overrides.visibleColumns ?? [],
      selectionNode: overrides.selectionNode ?? null,
      expandNode: overrides.expandNode ?? null,
      showSorterTooltip: undefined,
      sortOrderMap: overrides.sortOrderMap ?? new Map(),
      sortPriorityMap: overrides.sortPriorityMap ?? new Map(),
      filteredValueMap: overrides.filteredValueMap ?? new Map(),
    }),
  ).result.current
}

describe('useColumnTreeBuilder', () => {
  describe('哨兵遍历插入', () => {
    it('SELECTION_COLUMN 哨兵命中 → selectionNode 插入哨兵位置（最前）', () => {
      const col = leafNode('a')
      const r = renderBuilder({
        visibleColumns: [SELECTION_COLUMN, col],
        selectionNode: selNode(),
      })
      expect(r.columnTreeWithSortAndFilter[0].key).toBe(SELECTION_COLUMN_KEY)
      expect(r.columnTreeWithSortAndFilter[1].key).toBe('a')
    })

    it('EXPAND_COLUMN 哨兵命中 → expandNode 插入哨兵位置', () => {
      const a = leafNode('a')
      const b = leafNode('b')
      const r = renderBuilder({
        visibleColumns: [a, EXPAND_COLUMN, b],
        expandNode: expandNode(),
      })
      expect(r.columnTreeWithSortAndFilter.map((n) => n.key)).toEqual([
        'a',
        EXPAND_COLUMN_KEY,
        'b',
      ])
    })

    it('哨兵命中但对应 node 为 null → 哨兵位置跳过（不插入）', () => {
      const a = leafNode('a')
      const r = renderBuilder({
        visibleColumns: [SELECTION_COLUMN, a],
        selectionNode: null,
      })
      expect(r.columnTreeWithSortAndFilter.map((n) => n.key)).toEqual(['a'])
    })

    it('哨兵未命中 + selectionNode 存在 → 默认 unshift 到最前', () => {
      const a = leafNode('a')
      const r = renderBuilder({
        visibleColumns: [a],
        selectionNode: selNode(),
      })
      expect(r.columnTreeWithSortAndFilter.map((n) => n.key)).toEqual([
        SELECTION_COLUMN_KEY,
        'a',
      ])
    })

    it('哨兵未命中 + selectionNode + expandNode → 默认位置 sel 在 0、expand 在 1', () => {
      const a = leafNode('a')
      const r = renderBuilder({
        visibleColumns: [a],
        selectionNode: selNode(),
        expandNode: expandNode(),
      })
      expect(r.columnTreeWithSortAndFilter.map((n) => n.key)).toEqual([
        SELECTION_COLUMN_KEY,
        EXPAND_COLUMN_KEY,
        'a',
      ])
    })

    it('哨兵未命中 + 仅 expandNode（无 selection）→ expand unshift 到 0', () => {
      const a = leafNode('a')
      const r = renderBuilder({
        visibleColumns: [a],
        selectionNode: null,
        expandNode: expandNode(),
      })
      expect(r.columnTreeWithSortAndFilter.map((n) => n.key)).toEqual([
        EXPAND_COLUMN_KEY,
        'a',
      ])
    })

    it('expand 哨兵命中 + selection 未命中 → sel unshift 到 0，expand 在哨兵位', () => {
      const a = leafNode('a')
      const r = renderBuilder({
        visibleColumns: [a, EXPAND_COLUMN],
        selectionNode: selNode(),
        expandNode: expandNode(),
      })
      expect(r.columnTreeWithSortAndFilter.map((n) => n.key)).toEqual([
        SELECTION_COLUMN_KEY,
        'a',
        EXPAND_COLUMN_KEY,
      ])
    })

    it('两个哨兵都命中 → 哨兵位优先（默认位置分支不触发）', () => {
      const a = leafNode('a')
      const r = renderBuilder({
        visibleColumns: [SELECTION_COLUMN, a, EXPAND_COLUMN],
        selectionNode: selNode(),
        expandNode: expandNode(),
      })
      expect(r.columnTreeWithSortAndFilter.map((n) => n.key)).toEqual([
        SELECTION_COLUMN_KEY,
        'a',
        EXPAND_COLUMN_KEY,
      ])
    })

    it('哨兵在中间位置 → 插在中间（非最前）', () => {
      const a = leafNode('a')
      const b = leafNode('b')
      const c = leafNode('c')
      const r = renderBuilder({
        visibleColumns: [a, SELECTION_COLUMN, b, c],
        selectionNode: selNode(),
      })
      expect(r.columnTreeWithSortAndFilter.map((n) => n.key)).toEqual([
        'a',
        SELECTION_COLUMN_KEY,
        'b',
        'c',
      ])
    })
  })

  describe('邻列 fixed 继承', () => {
    it('selectionNode.fixed 未设 + nextCol.fixed=start → selection 继承 start', () => {
      const a = leafNode('a', { fixed: 'start' })
      const sel = selNode() // fixed 未设
      const r = renderBuilder({
        visibleColumns: [SELECTION_COLUMN, a],
        selectionNode: sel,
      })
      // sel 插入到哨兵位（index 0），a 跟在后面 → nextCol=a.fixed='start'
      // 守卫条件：selectionNode.key===SELECTION_COLUMN_KEY && fixed===undefined
      expect(r.columnTreeWithSortAndFilter[0].fixed).toBe('start')
    })

    it('selectionNode.fixed 已设 → 不进入继承分支（保留原值）', () => {
      const a = leafNode('a', { fixed: 'start' })
      const sel = selNode('end') // 已设 end
      const r = renderBuilder({
        visibleColumns: [SELECTION_COLUMN, a],
        selectionNode: sel,
      })
      expect(r.columnTreeWithSortAndFilter[0].fixed).toBe('end')
    })

    it('默认位置插入时也触发 fixed 继承（selectionNode 未命中哨兵 + 邻列 fixed）', () => {
      const a = leafNode('a', { fixed: 'start' })
      const sel = selNode()
      const r = renderBuilder({
        visibleColumns: [a],
        selectionNode: sel,
      })
      // sel unshift 到 0，a 在 1 → nextCol=a.fixed='start'
      expect(r.columnTreeWithSortAndFilter[0].key).toBe(SELECTION_COLUMN_KEY)
      expect(r.columnTreeWithSortAndFilter[0].fixed).toBe('start')
    })

    it('EXPAND_COLUMN 反向继承：sel 前是未 fixed 的 expand → expand 跟随 sel 继承同 fixed', () => {
      // 场景：哨兵位 expand 在 selection 前，selection 继承 nextCol 的 fixed，
      //   prevCol=expand 未 fixed → expand 反向继承。
      //   visibleColumns: [EXPAND_COLUMN, SELECTION_COLUMN, dataCol(fixed=start)]
      //   result 顺序：[expand(sel 哨兵), sel(sel 哨兵), dataCol]
      //   selectionNode 在 selIdx=1，nextCol=dataCol.fixed=start → sel.fixed=start
      //   prevCol=expand（key=EXPAND_COLUMN_KEY, fixed 未设）→ expand.fixed=start
      const data = leafNode('d', { fixed: 'start' })
      const expand = expandNode() // 未 fixed
      const sel = selNode()
      const r = renderBuilder({
        visibleColumns: [EXPAND_COLUMN, SELECTION_COLUMN, data],
        selectionNode: sel,
        expandNode: expand,
      })
      const tree = r.columnTreeWithSortAndFilter
      // expand 在 index 0
      expect(tree[0].key).toBe(EXPAND_COLUMN_KEY)
      // sel 在 index 1
      expect(tree[1].key).toBe(SELECTION_COLUMN_KEY)
      // sel 继承 nextCol(data).fixed=start
      expect(tree[1].fixed).toBe('start')
      // expand 反向继承同 fixed
      expect(tree[0].fixed).toBe('start')
    })

    it('邻列无 fixed → selection 保持 undefined（不继承）', () => {
      const a = leafNode('a') // 无 fixed
      const sel = selNode()
      const r = renderBuilder({
        visibleColumns: [SELECTION_COLUMN, a],
        selectionNode: sel,
      })
      expect(r.columnTreeWithSortAndFilter[0].fixed).toBeUndefined()
    })
  })

  describe('排序回填', () => {
    it('sortOrderMap.size===0 + 无可排序列 → 不回填（树引用不变）', () => {
      const a = leafNode('a') // 无 sorter
      const r = renderBuilder({
        visibleColumns: [a],
        sortOrderMap: new Map(),
      })
      // 无 sorter → hasAnySorter=false → 不调 applySortOrderToNode → sortOrder 保持 undefined
      expect(r.columnTreeWithSortAndFilter[0].sortOrder).toBeUndefined()
    })

    it('sortOrderMap.size===0 + 有可排序列 → 回填 null（确保图标为无序态）', () => {
      const a = leafNode('a', { sorter: true })
      const r = renderBuilder({
        visibleColumns: [a],
        sortOrderMap: new Map(),
      })
      expect(r.columnTreeWithSortAndFilter[0].sortOrder).toBeNull()
    })

    it('sortOrderMap 有命中 → 回填对应 order + priority', () => {
      const a = leafNode('a', { sorter: true })
      const sortOrderMap = new Map([['a', 'ascend']])
      const sortPriorityMap = new Map([['a', 1]])
      const r = renderBuilder({
        visibleColumns: [a],
        sortOrderMap,
        sortPriorityMap,
      })
      expect(r.columnTreeWithSortAndFilter[0].sortOrder).toBe('ascend')
      expect(r.columnTreeWithSortAndFilter[0].sortPriority).toBe(1)
    })

    it('sortOrderMap 有键但本列未命中 → 回填 null（可排序但未激活）', () => {
      const a = leafNode('a', { sorter: true })
      const sortOrderMap = new Map([['other', 'descend']])
      const r = renderBuilder({
        visibleColumns: [a],
        sortOrderMap,
      })
      expect(r.columnTreeWithSortAndFilter[0].sortOrder).toBeNull()
    })

    it('不可排序列（sorter 未设）→ sortOrder 保持 undefined', () => {
      const a = leafNode('a') // 无 sorter
      const sortOrderMap = new Map([['a', 'ascend']])
      const r = renderBuilder({
        visibleColumns: [a],
        sortOrderMap,
      })
      expect(r.columnTreeWithSortAndFilter[0].sortOrder).toBeUndefined()
    })
  })

  describe('筛选回填', () => {
    it('无可筛选列 → 不回填（filteredValue 保持 undefined）', () => {
      const a = leafNode('a') // 无 filters/onFilter/filterDropdown
      const r = renderBuilder({
        visibleColumns: [a],
        filteredValueMap: new Map([['a', ['x']]]),
      })
      expect(r.columnTreeWithSortAndFilter[0].filteredValue).toBeUndefined()
    })

    it('有 filters 列 + filteredValueMap 命中 → 回填值', () => {
      const a = leafNode('a', { filters: [{ text: 'x', value: 'x' }] })
      const filteredValueMap = new Map([['a', ['x']]])
      const r = renderBuilder({
        visibleColumns: [a],
        filteredValueMap,
      })
      expect(r.columnTreeWithSortAndFilter[0].filteredValue).toEqual(['x'])
    })

    it('有 onFilter 列（无 filters）+ filteredValueMap 未命中 → 回填 null', () => {
      const a = leafNode('a', { onFilter: () => true })
      const r = renderBuilder({
        visibleColumns: [a],
        filteredValueMap: new Map(),
      })
      expect(r.columnTreeWithSortAndFilter[0].filteredValue).toBeNull()
    })

    it('有 filterDropdown 列 → 视为可筛选（回填）', () => {
      const a = leafNode('a', { filterDropdown: () => null })
      const r = renderBuilder({
        visibleColumns: [a],
        filteredValueMap: new Map(),
      })
      expect(r.columnTreeWithSortAndFilter[0].filteredValue).toBeNull()
    })

    it('filters 空数组也算可筛选（对齐 antd truthy 判定）', () => {
      const a = leafNode('a', { filters: [] })
      const r = renderBuilder({
        visibleColumns: [a],
        filteredValueMap: new Map(),
      })
      expect(r.columnTreeWithSortAndFilter[0].filteredValue).toBeNull()
    })
  })

  describe('组合：哨兵 + 排序 + 筛选', () => {
    it('哨兵插入 + 普通列同时回填排序/筛选', () => {
      const a = leafNode('a', { sorter: true, filters: [{ text: 'x', value: 'x' }] })
      const sortOrderMap = new Map([['a', 'descend']])
      const filteredValueMap = new Map([['a', ['x']]])
      const r = renderBuilder({
        visibleColumns: [SELECTION_COLUMN, a],
        selectionNode: selNode(),
        sortOrderMap,
        filteredValueMap,
      })
      const tree = r.columnTreeWithSortAndFilter
      expect(tree.map((n) => n.key)).toEqual([SELECTION_COLUMN_KEY, 'a'])
      expect(tree[1].sortOrder).toBe('descend')
      expect(tree[1].filteredValue).toEqual(['x'])
    })
  })
})
