import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  useEffectiveRowHeight,
  useRowHeightSystem,
  type RowHeightVirtualStateLike,
} from '../useRowHeightSystem'
import type { EngineTableProps } from '../engineTypes'

type GridOptions = EngineTableProps<any>['gridOptions']

const sizeOfStub = (): RowHeightVirtualStateLike => ({ sizeOf: () => 0 })

const renderSystem = (
  overrides: {
    gridOptions?: GridOptions
    dataSource?: any[]
    virtualEnabled?: boolean
  } = {},
) => {
  const result = renderHook(() =>
    useRowHeightSystem({
      gridOptions: overrides.gridOptions,
      dataSource: overrides.dataSource ?? [],
      virtualEnabled: overrides.virtualEnabled ?? false,
    }),
  )
  return result
}

describe('useRowHeightSystem', () => {
  describe('派生：gridRowHeightOpt / resolvedRowHeight', () => {
    it('gridOptions.rowHeight 数字 → gridRowHeightOpt 透传，resolvedRowHeight 同值', () => {
      const { result } = renderSystem({ gridOptions: { rowHeight: 40 }, virtualEnabled: true })
      expect(result.current.gridRowHeightOpt).toBe(40)
      expect(result.current.resolvedRowHeight).toBe(40)
    })

    it('gridOptions.rowHeight 函数 → gridRowHeightOpt 为函数', () => {
      const fn = () => 50
      const { result } = renderSystem({ gridOptions: { rowHeight: fn }, virtualEnabled: true })
      expect(result.current.gridRowHeightOpt).toBe(fn)
      expect(result.current.resolvedRowHeight).toBe(fn)
    })

    it('rowHeight 缺省 + virtualEnabled=true → resolvedRowHeight 默认 56', () => {
      const { result } = renderSystem({ gridOptions: {}, virtualEnabled: true })
      expect(result.current.gridRowHeightOpt).toBeUndefined()
      expect(result.current.resolvedRowHeight).toBe(56)
    })

    it('rowHeight 缺省 + virtualEnabled=false → resolvedRowHeight undefined', () => {
      const { result } = renderSystem({ gridOptions: {}, virtualEnabled: false })
      expect(result.current.resolvedRowHeight).toBeUndefined()
    })

    it('rowHeight 显式 undefined（virtualEnabled=true）→ 仍走默认 56', () => {
      const { result } = renderSystem({ gridOptions: { rowHeight: undefined }, virtualEnabled: true })
      expect(result.current.resolvedRowHeight).toBe(56)
    })
  })

  describe('派生：boundedRowHeight / minRowHeight / maxRowHeight', () => {
    it('min/max 同时为正且 min ≤ max → boundedRowHeight=true，min/max 解析为数值', () => {
      const { result } = renderSystem({ gridOptions: { minRowHeight: 30, maxRowHeight: 80 } })
      expect(result.current.boundedRowHeight).toBe(true)
      expect(result.current.minRowHeight).toBe(30)
      expect(result.current.maxRowHeight).toBe(80)
    })

    it('min=max（边界等值）→ boundedRowHeight=true', () => {
      const { result } = renderSystem({ gridOptions: { minRowHeight: 50, maxRowHeight: 50 } })
      expect(result.current.boundedRowHeight).toBe(true)
      expect(result.current.minRowHeight).toBe(50)
      expect(result.current.maxRowHeight).toBe(50)
    })

    it('仅设 min → boundedRowHeight=false（须 min/max 同时为正）', () => {
      const { result } = renderSystem({ gridOptions: { minRowHeight: 30 } })
      expect(result.current.boundedRowHeight).toBe(false)
      expect(result.current.minRowHeight).toBeUndefined()
      expect(result.current.maxRowHeight).toBeUndefined()
    })

    it('仅设 max → boundedRowHeight=false', () => {
      const { result } = renderSystem({ gridOptions: { maxRowHeight: 80 } })
      expect(result.current.boundedRowHeight).toBe(false)
    })

    it('min > max → boundedRowHeight=false（须 min ≤ max）', () => {
      const { result } = renderSystem({ gridOptions: { minRowHeight: 100, maxRowHeight: 50 } })
      expect(result.current.boundedRowHeight).toBe(false)
    })

    it('min=0 / max=0 → boundedRowHeight=false（须为正数）', () => {
      const r1 = renderSystem({ gridOptions: { minRowHeight: 0, maxRowHeight: 80 } })
      expect(r1.result.current.boundedRowHeight).toBe(false)
      const r2 = renderSystem({ gridOptions: { minRowHeight: 30, maxRowHeight: 0 } })
      expect(r2.result.current.boundedRowHeight).toBe(false)
    })

    it('min/max 负数 → boundedRowHeight=false', () => {
      const { result } = renderSystem({ gridOptions: { minRowHeight: -10, maxRowHeight: 80 } })
      expect(result.current.boundedRowHeight).toBe(false)
    })
  })

  describe('getRowHeight：固定行高模型（boundedRowHeight=false）', () => {
    it('resolvedRowHeight 数字 → 返回该数值', () => {
      const { result } = renderSystem({
        gridOptions: { rowHeight: 40 },
        dataSource: [{}, {}, {}],
        virtualEnabled: true,
      })
      expect(result.current.getRowHeight(0)).toBe(40)
      expect(result.current.getRowHeight(2)).toBe(40)
    })

    it('resolvedRowHeight 函数 → 解析每行值', () => {
      const { result } = renderSystem({
        gridOptions: { rowHeight: (_r: any, i: number) => 30 + i },
        dataSource: [{}, {}, {}],
        virtualEnabled: true,
      })
      expect(result.current.getRowHeight(0)).toBe(30)
      expect(result.current.getRowHeight(1)).toBe(31)
      expect(result.current.getRowHeight(2)).toBe(32)
    })

    it('resolvedRowHeight 函数返回 "40px" 字符串 → 解析为 40', () => {
      const { result } = renderSystem({
        gridOptions: { rowHeight: () => '40px' },
        dataSource: [{}],
        virtualEnabled: true,
      })
      expect(result.current.getRowHeight(0)).toBe(40)
    })

    it('resolvedRowHeight undefined（非虚拟）→ 返回 0', () => {
      const { result } = renderSystem({
        dataSource: [{}],
        virtualEnabled: false,
      })
      expect(result.current.getRowHeight(0)).toBe(0)
    })
  })

  describe('getRowHeight：有界行高模型（boundedRowHeight=true）', () => {
    it('rowHeight 缺省 → 未测行回退用 minRowHeight', () => {
      const { result } = renderSystem({
        gridOptions: { minRowHeight: 30, maxRowHeight: 80 },
        dataSource: [{}, {}, {}],
        virtualEnabled: true,
      })
      expect(result.current.getRowHeight(0)).toBe(30)
    })

    it('rowHeight 数字 50（在 [30,80] 内）→ 返回 50', () => {
      const { result } = renderSystem({
        gridOptions: { rowHeight: 50, minRowHeight: 30, maxRowHeight: 80 },
        dataSource: [{}],
        virtualEnabled: true,
      })
      expect(result.current.getRowHeight(0)).toBe(50)
    })

    it('rowHeight 数字 100（> max=80）→ clamp 到 80', () => {
      const { result } = renderSystem({
        gridOptions: { rowHeight: 100, minRowHeight: 30, maxRowHeight: 80 },
        dataSource: [{}],
        virtualEnabled: true,
      })
      expect(result.current.getRowHeight(0)).toBe(80)
    })

    it('rowHeight 数字 20（< min=30）→ clamp 到 30', () => {
      const { result } = renderSystem({
        gridOptions: { rowHeight: 20, minRowHeight: 30, maxRowHeight: 80 },
        dataSource: [{}],
        virtualEnabled: true,
      })
      expect(result.current.getRowHeight(0)).toBe(30)
    })

    it('rowHeight 函数返回 100（> max）→ clamp 到 80', () => {
      const { result } = renderSystem({
        gridOptions: { rowHeight: () => 100, minRowHeight: 30, maxRowHeight: 80 },
        dataSource: [{}],
        virtualEnabled: true,
      })
      expect(result.current.getRowHeight(0)).toBe(80)
    })

    it('clamp 结果取整（与 useRowMeasurements correctRowSize 对齐）', () => {
      const { result } = renderSystem({
        gridOptions: { rowHeight: 50.7, minRowHeight: 30, maxRowHeight: 80 },
        dataSource: [{}],
        virtualEnabled: true,
      })
      expect(result.current.getRowHeight(0)).toBe(51)
    })
  })

  describe('callback 引用稳定性', () => {
    it('同依赖 rerender → getRowHeight 引用不变', () => {
      const dataSource = [{}, {}]
      const { result, rerender } = renderHook(
        (props: { gridOptions: GridOptions; dataSource: any[] }) =>
          useRowHeightSystem({
            gridOptions: props.gridOptions,
            dataSource: props.dataSource,
            virtualEnabled: true,
          }),
        { initialProps: { gridOptions: { rowHeight: 40 }, dataSource } },
      )
      const first = result.current.getRowHeight
      rerender({ gridOptions: { rowHeight: 40 }, dataSource })
      expect(result.current.getRowHeight).toBe(first)
    })

    it('dataSource 变化 → getRowHeight 引用更新', () => {
      const { result, rerender } = renderHook(
        (props: { dataSource: any[] }) =>
          useRowHeightSystem({
            gridOptions: { rowHeight: 40 },
            dataSource: props.dataSource,
            virtualEnabled: true,
          }),
        { initialProps: { dataSource: [{}, {}] } },
      )
      const first = result.current.getRowHeight
      rerender({ dataSource: [{}, {}, {}] })
      expect(result.current.getRowHeight).not.toBe(first)
    })

    it('gridOptions.rowHeight 变化 → getRowHeight 引用更新', () => {
      const dataSource = [{}, {}]
      const { result, rerender } = renderHook(
        (props: { rowHeight: number }) =>
          useRowHeightSystem({
            gridOptions: { rowHeight: props.rowHeight },
            dataSource,
            virtualEnabled: true,
          }),
        { initialProps: { rowHeight: 40 } },
      )
      const first = result.current.getRowHeight
      rerender({ rowHeight: 50 })
      expect(result.current.getRowHeight).not.toBe(first)
    })
  })
})

describe('useEffectiveRowHeight', () => {
  const renderEff = (
    overrides: {
      boundedRowHeight?: boolean
      virtualEnabled?: boolean
      virtualState?: RowHeightVirtualStateLike
      getRowHeight?: (i: number) => number
      minRowHeight?: number
      maxRowHeight?: number
    } = {},
  ) => {
    const result = renderHook(() =>
      useEffectiveRowHeight({
        boundedRowHeight: overrides.boundedRowHeight ?? false,
        virtualEnabled: overrides.virtualEnabled ?? false,
        virtualState: overrides.virtualState ?? sizeOfStub(),
        getRowHeight: overrides.getRowHeight ?? (() => 40),
        minRowHeight: overrides.minRowHeight,
        maxRowHeight: overrides.maxRowHeight,
      }),
    )
    return result
  }

  describe('固定模型（boundedRowHeight=false）', () => {
    it('直接返回 getRowHeight(i)', () => {
      const getRowHeight = (i: number) => 40 + i
      const { result } = renderEff({
        boundedRowHeight: false,
        getRowHeight,
      })
      expect(result.current(0)).toBe(40)
      expect(result.current(2)).toBe(42)
    })
  })

  describe('有界模型（boundedRowHeight=true）', () => {
    it('sizeOf 返回 0（未测）→ 回退 getRowHeight', () => {
      const getRowHeight = () => 50
      const { result } = renderEff({
        boundedRowHeight: true,
        virtualEnabled: true,
        virtualState: { sizeOf: () => 0 },
        getRowHeight,
        minRowHeight: 30,
        maxRowHeight: 80,
      })
      expect(result.current(0)).toBe(50)
    })

    it('sizeOf 返回 60（在 [30,80] 内）→ 取实测 60', () => {
      const { result } = renderEff({
        boundedRowHeight: true,
        virtualEnabled: true,
        virtualState: { sizeOf: () => 60 },
        getRowHeight: () => 50,
        minRowHeight: 30,
        maxRowHeight: 80,
      })
      expect(result.current(0)).toBe(60)
    })

    it('sizeOf 返回 100（> max=80）→ clamp 到 80', () => {
      const { result } = renderEff({
        boundedRowHeight: true,
        virtualEnabled: true,
        virtualState: { sizeOf: () => 100 },
        getRowHeight: () => 50,
        minRowHeight: 30,
        maxRowHeight: 80,
      })
      expect(result.current(0)).toBe(80)
    })

    it('sizeOf 返回 20（< min=30）→ clamp 到 30', () => {
      const { result } = renderEff({
        boundedRowHeight: true,
        virtualEnabled: true,
        virtualState: { sizeOf: () => 20 },
        getRowHeight: () => 50,
        minRowHeight: 30,
        maxRowHeight: 80,
      })
      expect(result.current(0)).toBe(30)
    })

    it('virtualEnabled=false → 跳过 sizeOf，回退 getRowHeight', () => {
      const sizeOf = vi.fn(() => 60)
      const { result } = renderEff({
        boundedRowHeight: true,
        virtualEnabled: false,
        virtualState: { sizeOf },
        getRowHeight: () => 50,
        minRowHeight: 30,
        maxRowHeight: 80,
      })
      expect(result.current(0)).toBe(50)
      expect(sizeOf).not.toHaveBeenCalled()
    })

    it('clamp 取整（与 getRowHeight 一致）', () => {
      const { result } = renderEff({
        boundedRowHeight: true,
        virtualEnabled: true,
        virtualState: { sizeOf: () => 60.6 },
        getRowHeight: () => 50,
        minRowHeight: 30,
        maxRowHeight: 80,
      })
      expect(result.current(0)).toBe(61)
    })
  })

  describe('引用稳定性', () => {
    it('同依赖 rerender → effectiveRowHeight 引用不变', () => {
      const vs = sizeOfStub()
      const getRowHeight = () => 40
      const { result, rerender } = renderHook(
        (props: { vs: RowHeightVirtualStateLike; gh: (i: number) => number }) =>
          useEffectiveRowHeight({
            boundedRowHeight: true,
            virtualEnabled: true,
            virtualState: props.vs,
            getRowHeight: props.gh,
            minRowHeight: 30,
            maxRowHeight: 80,
          }),
        { initialProps: { vs, gh: getRowHeight } },
      )
      const first = result.current
      rerender({ vs, gh: getRowHeight })
      expect(result.current).toBe(first)
    })

    it('virtualState 引用变化 → effectiveRowHeight 引用更新', () => {
      const getRowHeight = () => 40
      const { result, rerender } = renderHook(
        (props: { vs: RowHeightVirtualStateLike }) =>
          useEffectiveRowHeight({
            boundedRowHeight: true,
            virtualEnabled: true,
            virtualState: props.vs,
            getRowHeight,
            minRowHeight: 30,
            maxRowHeight: 80,
          }),
        { initialProps: { vs: sizeOfStub() } },
      )
      const first = result.current
      rerender({ vs: sizeOfStub() })
      expect(result.current).not.toBe(first)
    })

    it('getRowHeight 引用变化 → effectiveRowHeight 引用更新', () => {
      const vs = sizeOfStub()
      const { result, rerender } = renderHook(
        (props: { gh: (i: number) => number }) =>
          useEffectiveRowHeight({
            boundedRowHeight: false,
            virtualEnabled: true,
            virtualState: vs,
            getRowHeight: props.gh,
            minRowHeight: undefined,
            maxRowHeight: undefined,
          }),
        { initialProps: { gh: () => 40 } },
      )
      const first = result.current
      rerender({ gh: () => 50 })
      expect(result.current).not.toBe(first)
    })
  })
})
