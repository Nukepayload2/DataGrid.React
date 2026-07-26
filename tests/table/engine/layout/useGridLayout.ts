import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useGridLayout, type UseGridLayoutOptions } from '../../../../src/table/engine/useGridLayout'
import type { EngineExpandState, EngineLeafColumn } from '../../../../src/table/engine/engineTypes'

type RecordType = { id: number; name: string }

/** 构造最小可用的 leaf column（仅供 gridTemplateColumns 计算用）。 */
function leafColumn(key: string, width?: number | string): EngineLeafColumn<RecordType> {
  return {
    key,
    dataIndex: key,
    title: key,
    width,
  } as unknown as EngineLeafColumn<RecordType>
}

/** 构造 EngineExpandState（最小字段集）。 */
function makeExpandState(
  expandableKeys: Set<React.Key>,
  expandedKeys: Set<React.Key>,
): EngineExpandState {
  return {
    expandEnabled: expandableKeys.size > 0,
    isExpanded: (key: React.Key) => expandedKeys.has(key),
    isExpandable: (key: React.Key) => expandableKeys.has(key),
    expandableKeySet: expandableKeys,
    expandedRowRender: () => null,
    showExpandColumn: true,
    toggleExpand: () => undefined,
  }
}

const baseRecord = (id: number): RecordType => ({ id, name: `row-${id}` })

const defaults = {
  mode: 'flat' as const,
  maxDepth: 1,
  showHeader: true,
  headerHeight: 40,
  virtualEnabled: false,
  virtualState: { start: 0, end: 0 },
  boundedRowHeight: false,
  minRowHeight: undefined,
  maxRowHeight: undefined,
  effectiveRowHeight: () => 56,
  getRowHeight: () => 56,
  expandEnabled: false,
  expandState: undefined,
  dataSource: [] as Array<RecordType>,
  rowKey: 'id' as const,
  rowHeight: undefined,
  leafColumns: [] as ReadonlyArray<EngineLeafColumn<RecordType>>,
  resizedWidths: new Map<string, number>(),
  tableLayout: undefined,
  summaryParsed: null,
  summaryEnabled: false,
} satisfies UseGridLayoutOptions<RecordType>

const render = (overrides: Partial<UseGridLayoutOptions<RecordType>> = {}) =>
  renderHook(() => useGridLayout({ ...defaults, ...overrides })).result.current

describe('useGridLayout', () => {
  describe('gridTemplateColumns（委托 computeGridTemplateColumns）', () => {
    it('空 leafColumns → "none"', () => {
      const r = render()
      expect(r.gridTemplateColumns).toBe('none')
    })

    it('全固定 px width + tableLayout=fixed → 按 width 比例生成 fr track', () => {
      const r = render({
        leafColumns: [leafColumn('a', 100), leafColumn('b', 200)],
        tableLayout: 'fixed',
      })
      expect(r.gridTemplateColumns).toBe('minmax(0, 100fr) minmax(0, 200fr)')
    })

    it('固定 px width + tableLayout=auto（默认）→ minmax(Npx, max-content)', () => {
      const r = render({
        leafColumns: [leafColumn('a', 100)],
        tableLayout: 'auto',
      })
      expect(r.gridTemplateColumns).toBe('minmax(100px, max-content)')
    })

    it('透传 gridColumnOptions.minWidth/maxWidth 到列轨道计算', () => {
      const bounded = {
        ...leafColumn('bounded'),
        gridColumnOptions: { minWidth: 120, maxWidth: 320 },
      }
      const r = render({
        leafColumns: [bounded],
        tableLayout: 'auto',
      })
      expect(r.gridTemplateColumns).toBe('minmax(120px, 320px)')
    })

    it('resizedWidths 覆盖原 width', () => {
      const resized = new Map<string, number>([['a', 250]])
      const r = render({
        leafColumns: [leafColumn('a', 100)],
        resizedWidths: resized,
        tableLayout: 'fixed',
      })
      expect(r.gridTemplateColumns).toBe('250px')
    })
  })

  describe('headerTracks（gridTemplateRows 前段）', () => {
    it('showHeader=false → 无 header track', () => {
      const r = render({ showHeader: false, maxDepth: 3 })
      expect(r.gridTemplateRows.startsWith('40px')).toBe(false)
      // 完整结果就是 body 部分（空 dataSource → 'none'）
      expect(r.gridTemplateRows).toBe('none')
    })

    it('showHeader=true + maxDepth=2 + headerHeight=40 → "40px 40px" 前缀', () => {
      const r = render({
        showHeader: true,
        maxDepth: 2,
        headerHeight: 40,
        dataSource: [baseRecord(1)],
        rowHeight: 30,
      })
      // headerTracks + bodyTracks 拼接；flat 模式也关闭 auto-flow，依赖显式定位。
      expect(r.gridTemplateRows.startsWith('40px 40px')).toBe(true)
      expect(r.gridAutoFlow).toBeUndefined()
    })

    it('headerHeight 字符串 "60px" → 直接用 toTrack("60px") = "60px"', () => {
      const r = render({
        showHeader: true,
        maxDepth: 1,
        headerHeight: '60px',
        dataSource: [baseRecord(1)],
        rowHeight: 30,
      })
      expect(r.gridTemplateRows.startsWith('60px')).toBe(true)
    })

    it('headerHeight undefined → header track = "auto"', () => {
      const r = render({
        showHeader: true,
        maxDepth: 1,
        headerHeight: undefined,
        dataSource: [baseRecord(1)],
        rowHeight: 30,
      })
      expect(r.gridTemplateRows.startsWith('auto')).toBe(true)
    })
  })

  describe('非虚拟 + 无展开 分支', () => {
    it('dataSource.map rowHeight=undefined → "auto" tracks', () => {
      const r = render({
        dataSource: [baseRecord(1), baseRecord(2)],
        rowHeight: undefined,
      })
      // header(40px) + auto + auto
      expect(r.gridTemplateRows).toBe('40px auto auto')
    })

    it('rowHeight=30（数字）→ "30px" tracks', () => {
      const r = render({
        dataSource: [baseRecord(1), baseRecord(2)],
        rowHeight: 30,
      })
      expect(r.gridTemplateRows).toBe('40px 30px 30px')
    })

    it('rowHeight=function → toTrack(返回值)', () => {
      const r = render({
        dataSource: [baseRecord(1), baseRecord(2)],
        rowHeight: (_rec, i) => (i === 0 ? 50 : '70px'),
      })
      expect(r.gridTemplateRows).toBe('40px 50px 70px')
    })

    it('rowHeight=function 返回 undefined → "auto"', () => {
      const r = render({
        dataSource: [baseRecord(1)],
        rowHeight: () => undefined as unknown as number,
      })
      expect(r.gridTemplateRows).toBe('40px auto')
    })

    it('boundedRowHeight=true → body track = "auto"（不读 rowHeight）', () => {
      const r = render({
        dataSource: [baseRecord(1), baseRecord(2)],
        boundedRowHeight: true,
        rowHeight: 30, // 即便设了也忽略
      })
      expect(r.gridTemplateRows).toBe('40px auto auto')
    })
  })

  describe('非虚拟 + 展开 分支', () => {
    it('可展开行未展开 → 0fr track', () => {
      const expandState = makeExpandState(new Set([1]), new Set())
      const r = render({
        dataSource: [baseRecord(1), baseRecord(2)],
        rowHeight: 30,
        expandEnabled: true,
        expandState,
      })
      // 40px header + 30px + 0fr(展开收起) + 30px
      expect(r.gridTemplateRows).toBe('40px 30px 0fr 30px')
    })

    it('可展开行已展开 → 1fr track', () => {
      const expandState = makeExpandState(new Set([1]), new Set([1]))
      const r = render({
        dataSource: [baseRecord(1), baseRecord(2)],
        rowHeight: 30,
        expandEnabled: true,
        expandState,
      })
      expect(r.gridTemplateRows).toBe('40px 30px 1fr 30px')
    })

    it('展开 + boundedRowHeight → base track="auto" + 0fr', () => {
      const expandState = makeExpandState(new Set([1]), new Set())
      const r = render({
        dataSource: [baseRecord(1)],
        boundedRowHeight: true,
        expandEnabled: true,
        expandState,
      })
      expect(r.gridTemplateRows).toBe('40px auto 0fr')
    })
  })

  describe('虚拟分支', () => {
    it('虚拟模式：bodyTracks 前后各加 "auto" 占位 track', () => {
      const r = render({
        virtualEnabled: true,
        virtualState: { start: 0, end: 2 },
        effectiveRowHeight: () => 56,
        dataSource: [baseRecord(1), baseRecord(2)],
      })
      // 40px header + auto(paddingTop) + 56px + 56px + auto(paddingBottom)
      expect(r.gridTemplateRows).toBe('40px auto 56px 56px auto')
      expect(r.gridAutoFlow).toBeUndefined()
    })

    it('虚拟 + boundedRowHeight → visible track="auto"', () => {
      const r = render({
        virtualEnabled: true,
        virtualState: { start: 0, end: 1 },
        boundedRowHeight: true,
        effectiveRowHeight: () => 56,
        dataSource: [baseRecord(1)],
      })
      // 40px + auto(paddingTop) + auto(visible) + auto(paddingBottom)
      expect(r.gridTemplateRows).toBe('40px auto auto auto')
    })

    it('虚拟 + 展开（可展开行未展开）→ 0fr', () => {
      const expandState = makeExpandState(new Set([1]), new Set())
      const r = render({
        virtualEnabled: true,
        virtualState: { start: 0, end: 1 },
        effectiveRowHeight: () => 56,
        expandEnabled: true,
        expandState,
        dataSource: [baseRecord(1)],
      })
      // 40px + auto(paddingTop) + 56px + 0fr + auto(paddingBottom)
      expect(r.gridTemplateRows).toBe('40px auto 56px 0fr auto')
    })

    it('虚拟 + 展开（可展开行已展开）→ 1fr', () => {
      const expandState = makeExpandState(new Set([1]), new Set([1]))
      const r = render({
        virtualEnabled: true,
        virtualState: { start: 0, end: 1 },
        effectiveRowHeight: () => 56,
        expandEnabled: true,
        expandState,
        dataSource: [baseRecord(1)],
      })
      expect(r.gridTemplateRows).toBe('40px auto 56px 1fr auto')
    })

    it('虚拟窗口 [start,end) 不从 0 开始 → 仅渲染窗口内 tracks', () => {
      const r = render({
        virtualEnabled: true,
        virtualState: { start: 2, end: 4 },
        effectiveRowHeight: () => 56,
        dataSource: [baseRecord(1), baseRecord(2), baseRecord(3), baseRecord(4)],
      })
      // 40px + auto + 56px + 56px + auto（不依赖 dataSource 实际长度，只看窗口）
      expect(r.gridTemplateRows).toBe('40px auto 56px 56px auto')
    })
  })

  describe('summary 区', () => {
    it('summaryParsed.count=2 → 末尾追加 "auto auto"', () => {
      const r = render({
        dataSource: [baseRecord(1)],
        rowHeight: 30,
        summaryParsed: { count: 2 },
        summaryEnabled: true,
      })
      // 40px + 30px + auto + auto
      expect(r.gridTemplateRows).toBe('40px 30px auto auto')
    })

    it('summaryStartLine = headerTracks.length + bodyTracks.length + 1', () => {
      const r = render({
        showHeader: true,
        maxDepth: 1,
        dataSource: [baseRecord(1), baseRecord(2)],
        rowHeight: 30,
        summaryParsed: { count: 1 },
        summaryEnabled: true,
      })
      // header(1) + body(2) + 1 = 4
      expect(r.summaryStartLine).toBe(4)
    })

    it('summaryParsed=null → summaryStartLine=0, summary tracks 为空', () => {
      const r = render({
        dataSource: [baseRecord(1)],
        rowHeight: 30,
        summaryParsed: null,
        summaryEnabled: false,
      })
      expect(r.summaryStartLine).toBe(0)
      expect(r.gridTemplateRows).toBe('40px 30px')
    })

    it('summary 启用 → 强制 gridAutoFlow=undefined（即便 mode=flat）', () => {
      const r = render({
        mode: 'flat',
        dataSource: [baseRecord(1)],
        rowHeight: 30,
        summaryParsed: { count: 1 },
        summaryEnabled: true,
      })
      expect(r.gridAutoFlow).toBeUndefined()
    })
  })

  describe('gridAutoFlow 路由', () => {
    it('mode=flat + 无 summary → undefined', () => {
      const r = render({
        mode: 'flat',
        dataSource: [baseRecord(1)],
        rowHeight: 30,
      })
      expect(r.gridAutoFlow).toBeUndefined()
    })

    it('mode=multi → undefined（即便无 summary）', () => {
      const r = render({
        mode: 'multi',
        dataSource: [baseRecord(1)],
        rowHeight: 30,
      })
      expect(r.gridAutoFlow).toBeUndefined()
    })
  })

  describe('paddingTopLine / paddingBottomLine', () => {
    it('非虚拟：= headerTracks.length+1 / +bodyTracks.length（仅虚拟场景使用，但数值仍派生）', () => {
      const r = render({
        showHeader: true,
        maxDepth: 1,
        dataSource: [baseRecord(1), baseRecord(2), baseRecord(3)],
        rowHeight: 30,
      })
      // headerTracks.length=1 → paddingTopLine=2; +bodyTracks.length=3 → paddingBottomLine=4
      expect(r.paddingTopLine).toBe(2)
      expect(r.paddingBottomLine).toBe(4)
    })

    it('showHeader=false → headerTracks.length=0 → paddingTopLine=1', () => {
      const r = render({
        showHeader: false,
        maxDepth: 1,
        dataSource: [baseRecord(1)],
        rowHeight: 30,
      })
      expect(r.paddingTopLine).toBe(1)
      expect(r.paddingBottomLine).toBe(1)
    })

    it('虚拟 + 展开：paddingBottomLine 含展开 track', () => {
      const expandState = makeExpandState(new Set([1]), new Set())
      const r = render({
        virtualEnabled: true,
        virtualState: { start: 0, end: 1 },
        effectiveRowHeight: () => 56,
        expandEnabled: true,
        expandState,
        dataSource: [baseRecord(1)],
      })
      // headerTracks=1, bodyTracks=[auto, 56px, 0fr, auto] → length=4
      // paddingTopLine=2, paddingBottomLine=5
      expect(r.paddingTopLine).toBe(2)
      expect(r.paddingBottomLine).toBe(5)
    })
  })

  describe('gridTemplateRows 空集合 → "none"', () => {
    it('无 header + 空 dataSource + 无 summary → "none"', () => {
      const r = render({
        showHeader: false,
        dataSource: [],
      })
      expect(r.gridTemplateRows).toBe('none')
    })
  })

  describe('组合矩阵（行为保真，对齐原 GridTable useMemo）', () => {
    const cases: Array<{
      name: string
      overrides: Partial<UseGridLayoutOptions<RecordType>>
      expected: {
        gridTemplateRows: string
        gridAutoFlow: undefined
        summaryStartLine: number
        paddingTopLine: number
        paddingBottomLine: number
      }
    }> = [
      {
        name: 'flat + 无 header + 单行 rowHeight=undefined',
        overrides: {
          mode: 'flat',
          showHeader: false,
          dataSource: [baseRecord(1)],
          rowHeight: undefined,
        },
        expected: {
          gridTemplateRows: 'auto',
          gridAutoFlow: undefined,
          summaryStartLine: 0,
          paddingTopLine: 1,
          paddingBottomLine: 1,
        },
      },
      {
        name: 'multi + 单行 + rowHeight=30 + 无 summary',
        overrides: {
          mode: 'multi',
          dataSource: [baseRecord(1)],
          rowHeight: 30,
        },
        expected: {
          gridTemplateRows: '40px 30px',
          gridAutoFlow: undefined,
          summaryStartLine: 0,
          paddingTopLine: 2,
          paddingBottomLine: 2,
        },
      },
      {
        name: '虚拟 + boundedRowHeight + 无展开 + 无 summary',
        overrides: {
          virtualEnabled: true,
          virtualState: { start: 0, end: 3 },
          boundedRowHeight: true,
          effectiveRowHeight: () => 56,
          dataSource: [baseRecord(1), baseRecord(2), baseRecord(3)],
        },
        expected: {
          gridTemplateRows: '40px auto auto auto auto auto',
          gridAutoFlow: undefined,
          summaryStartLine: 0,
          paddingTopLine: 2,
          paddingBottomLine: 6,
        },
      },
      {
        name: '非虚拟 + 展开(0fr) + summary',
        overrides: {
          expandEnabled: true,
          expandState: makeExpandState(new Set([1]), new Set()),
          dataSource: [baseRecord(1), baseRecord(2)],
          rowHeight: 30,
          summaryParsed: { count: 1 },
          summaryEnabled: true,
        },
        expected: {
          gridTemplateRows: '40px 30px 0fr 30px auto',
          gridAutoFlow: undefined,
          summaryStartLine: 5,
          paddingTopLine: 2,
          paddingBottomLine: 4,
        },
      },
    ]

    for (const c of cases) {
      it(c.name, () => {
        const r = render(c.overrides)
        expect(r.gridTemplateRows).toBe(c.expected.gridTemplateRows)
        expect(r.gridAutoFlow).toBe(c.expected.gridAutoFlow)
        expect(r.summaryStartLine).toBe(c.expected.summaryStartLine)
        expect(r.paddingTopLine).toBe(c.expected.paddingTopLine)
        expect(r.paddingBottomLine).toBe(c.expected.paddingBottomLine)
      })
    }
  })
})
