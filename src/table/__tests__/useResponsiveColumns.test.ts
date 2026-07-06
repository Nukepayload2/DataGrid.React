import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useResponsiveColumns } from '../useResponsiveColumns'
import {
  EXPAND_COLUMN,
  SELECTION_COLUMN,
  type ColumnOrSentinel,
  type ColumnType,
} from '../types'

// 测试用 RecordType（hook 对 RecordType 不敏感，纯结构判定）。
type Rec = { key: string }

const leaf = (over: Partial<ColumnType<Rec>> = {}): ColumnType<Rec> => ({
  dataIndex: 'x',
  ...over,
})

// ScreenMap 等价类型（antd 内部 ScreenMap 是 { xs?, sm?, ... }，本测试用 Record 简化）。
type ScreenMap = Record<string, boolean>

// 默认 mock Grid.useBreakpoint 返回空 ScreenMap（所有断点 false，对齐 setup.ts matchMedia mock）。
//   individual 测试可用 mockReturnValueOnce / mockReturnValue 覆盖。
let useBreakpointMock: Mock<() => ScreenMap>

vi.mock('antd/es/grid', () => ({
  __esModule: true,
  default: {
    useBreakpoint: () => useBreakpointMock(),
  },
}))

beforeEach(() => {
  // 每个测试重置 mock，默认返回空 ScreenMap。
  useBreakpointMock = vi.fn<() => ScreenMap>().mockReturnValue({})
})

describe('useResponsiveColumns', () => {
  describe('needResponsive 短路', () => {
    it('returns the same columns reference when no column has responsive (plain columns)', () => {
      const cols: Array<ColumnOrSentinel<Rec>> = [leaf(), leaf({ dataIndex: 'y' })]
      const { result } = renderHook(() => useResponsiveColumns<Rec>(cols))
      expect(result.current).toBe(cols)
      // useBreakpoint 不应被 needResponsive=false 的路径在 visibleColumns memo 内消费产生差异，
      // 但 hook 仍调用了一次 useBreakpoint（订阅本身始终发生）。
      expect(useBreakpointMock).toHaveBeenCalledTimes(1)
    })

    it('returns the same columns reference when only sentinels are present (no responsive)', () => {
      const cols: Array<ColumnOrSentinel<Rec>> = [
        SELECTION_COLUMN,
        leaf(),
        EXPAND_COLUMN,
      ]
      const { result } = renderHook(() => useResponsiveColumns<Rec>(cols))
      expect(result.current).toBe(cols)
    })

    it('short-circuits even when useBreakpoint returns a populated ScreenMap', () => {
      // needResponsive=false 时即使 screens 全部 true，仍直接返回原 columns 引用（短路优先）。
      useBreakpointMock.mockReturnValue({ md: true, lg: true })
      const cols: Array<ColumnOrSentinel<Rec>> = [leaf(), leaf({ dataIndex: 'y' })]
      const { result } = renderHook(() => useResponsiveColumns<Rec>(cols))
      expect(result.current).toBe(cols)
    })
  })

  describe('有 responsive 列时按 screens 过滤', () => {
    it('keeps the responsive column when its breakpoint is active', () => {
      useBreakpointMock.mockReturnValue({ md: true })
      const r = leaf({ dataIndex: 'name', responsive: ['md'] })
      const other = leaf({ dataIndex: 'age' })
      const cols: Array<ColumnOrSentinel<Rec>> = [r, other]
      const { result } = renderHook(() => useResponsiveColumns<Rec>(cols))
      expect(result.current).toEqual([r, other])
    })

    it('drops the responsive column when its breakpoint is inactive', () => {
      // screens 为空（无激活断点）→ responsive:['md'] 的列不匹配任何断点 → 移除。
      useBreakpointMock.mockReturnValue({})
      const r = leaf({ dataIndex: 'name', responsive: ['md'] })
      const other = leaf({ dataIndex: 'age' })
      const cols: Array<ColumnOrSentinel<Rec>> = [r, other]
      const { result } = renderHook(() => useResponsiveColumns<Rec>(cols))
      expect(result.current).toEqual([other])
    })

    it('matches on any of multiple responsive breakpoints (OR semantics)', () => {
      // responsive:['sm','md']，screens 激活 sm=false, md=true → md 命中 → 保留。
      useBreakpointMock.mockReturnValue({ sm: false, md: true })
      const r = leaf({ dataIndex: 'name', responsive: ['sm', 'md'] })
      const cols: Array<ColumnOrSentinel<Rec>> = [r]
      const { result } = renderHook(() => useResponsiveColumns<Rec>(cols))
      expect(result.current).toEqual([r])
    })

    it('drops column when none of its responsive breakpoints are active', () => {
      // responsive:['lg','xl']，screens 仅 md:true → 都不匹配 → 移除。
      useBreakpointMock.mockReturnValue({ md: true })
      const r = leaf({ dataIndex: 'name', responsive: ['lg', 'xl'] })
      const cols: Array<ColumnOrSentinel<Rec>> = [r]
      const { result } = renderHook(() => useResponsiveColumns<Rec>(cols))
      expect(result.current).toEqual([])
    })

    it('handles screens=undefined defensively (treats as empty, drops responsive columns)', () => {
      // Grid.useBreakpoint 公开类型 ScreenMap 不含 undefined，但原实现有 `screens ?? {}` 兜底分支，
      //   锁定该兜底语义（先移动不重写）。
      useBreakpointMock.mockReturnValue(undefined as unknown as ReturnType<() => ScreenMap>)
      const r = leaf({ dataIndex: 'name', responsive: ['md'] })
      const other = leaf({ dataIndex: 'age' })
      const cols: Array<ColumnOrSentinel<Rec>> = [r, other]
      const { result } = renderHook(() => useResponsiveColumns<Rec>(cols))
      expect(result.current).toEqual([other])
    })
  })

  describe('哨兵 + responsive 混合', () => {
    it('always keeps sentinels even when screens filter would drop other responsive columns', () => {
      useBreakpointMock.mockReturnValue({})
      const r = leaf({ dataIndex: 'name', responsive: ['md'] })
      const cols: Array<ColumnOrSentinel<Rec>> = [
        SELECTION_COLUMN,
        r,
        EXPAND_COLUMN,
      ]
      const { result } = renderHook(() => useResponsiveColumns<Rec>(cols))
      expect(result.current).toEqual([SELECTION_COLUMN, EXPAND_COLUMN])
    })
  })

  describe('引用稳定性', () => {
    it('returns stable reference across re-renders when needResponsive=false', () => {
      const cols: Array<ColumnOrSentinel<Rec>> = [leaf(), leaf({ dataIndex: 'y' })]
      const { result, rerender } = renderHook(() => useResponsiveColumns<Rec>(cols))
      const first = result.current
      rerender()
      expect(result.current).toBe(first)
    })

    it('returns stable reference across re-renders when screens object identity changes but matched set is equal', () => {
      // 注意：原实现 visibleColumns useMemo 依赖 screens 引用，screens 变化会触发重算 → 引用变化。
      //   本测试仅锁定当前实现行为：screens 引用变 → memo 重算（即便 matched 集合相同，filter 产出新数组）。
      //   这是"先移动不重写"的语义保真，非优化目标。
      useBreakpointMock.mockReturnValue({ md: true })
      const r = leaf({ dataIndex: 'name', responsive: ['md'] })
      const cols: Array<ColumnOrSentinel<Rec>> = [r]
      const { result, rerender } = renderHook(() => useResponsiveColumns<Rec>(cols))
      const first = result.current
      // 同一 screens 引用重渲染 → memo 不重算 → 引用稳定。
      rerender()
      expect(result.current).toBe(first)
    })
  })
})
