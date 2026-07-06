import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  useGridScrollSync,
  type UseGridScrollSyncOptions,
} from '../useGridScrollSync'

type Options = UseGridScrollSyncOptions

/**
 * 构造 mock ref：current 指向指定的 client/scroll 几何对象（供 getStickyMaxScroll 计算）。
 * getStickyMaxScroll(viewport, grid) = computeStickyMaxScroll(
 *   viewport.clientWidth, grid.scrollWidth, grid.clientWidth)
 * = max(0, (grid.scrollWidth || grid.clientWidth || 0) - (viewport.clientWidth || 0))
 */
function makeRef<T>(value: T | null): React.MutableRefObject<T | null> {
  return { current: value }
}

/** 构造一个 wheel 事件 mock（只需 deltaX/deltaY/shiftKey + preventDefault spy）。 */
function makeWheel(
  opts: Partial<{ deltaX: number; deltaY: number; shiftKey: boolean }> = {},
): React.WheelEvent<HTMLDivElement> & { preventDefault: ReturnType<typeof vi.fn> } {
  const { deltaX = 0, deltaY = 0, shiftKey = false } = opts
  const preventDefault = vi.fn()
  return {
    deltaX,
    deltaY,
    shiftKey,
    preventDefault,
    // WheelEvent 其他字段在 hook 内未被读取，省略。
  } as unknown as React.WheelEvent<HTMLDivElement> & {
    preventDefault: ReturnType<typeof vi.fn>
  }
}

const render = (overrides: Partial<Options> = {}) => {
  const opts: Options = {
    stickyEnabled: true,
    stickyViewportRef: makeRef<HTMLDivElement>({ clientWidth: 200 } as HTMLDivElement),
    gridRef: makeRef<HTMLDivElement>({
      scrollWidth: 500,
      clientWidth: 500,
    } as HTMLDivElement),
    ...overrides,
  }
  return { opts, result: renderHook(() => useGridScrollSync(opts)).result }
}

describe('useGridScrollSync', () => {
  describe('初始状态', () => {
    it('stickyScrollLeft 初始为 0', () => {
      const { result } = render()
      expect(result.current.stickyScrollLeft).toBe(0)
    })

    it('setStickyScrollLeft 直接调用可更新 stickyScrollLeft（StickyScrollBar 拖动回写路径）', () => {
      const { result } = render()
      act(() => result.current.setStickyScrollLeft(42))
      expect(result.current.stickyScrollLeft).toBe(42)
    })

    it('stickyTranslateStyle 初始为 null（stickyScrollLeft=0 不构造 transform）', () => {
      const { result } = render()
      expect(result.current.stickyTranslateStyle).toBeNull()
    })

    it('sticky 未启用 → stickyTranslateStyle 恒 null（即便 stickyScrollLeft>0）', () => {
      const { result } = render({ stickyEnabled: false })
      act(() => result.current.setStickyScrollLeft(100))
      // re-read after act
      expect(result.current.stickyTranslateStyle).toBeNull()
    })
  })

  describe('stickyTranslateStyle 派生', () => {
    it('stickyEnabled=true 且 stickyScrollLeft>0 → translateX + willChange', () => {
      const { result } = render({ stickyEnabled: true })
      act(() => result.current.setStickyScrollLeft(80))
      expect(result.current.stickyTranslateStyle).toEqual({
        transform: 'translateX(-80px)',
        willChange: 'transform',
      })
    })

    it('translateX 数值 = -stickyScrollLeft（字节级对齐原内联块）', () => {
      const { result } = render()
      act(() => result.current.setStickyScrollLeft(123))
      expect(result.current.stickyTranslateStyle).toEqual({
        transform: 'translateX(-123px)',
        willChange: 'transform',
      })
    })

    it('setStickyScrollLeft(0) 后 → null（stickyScrollLeft>0 失败，无 transform）', () => {
      const { result } = render()
      act(() => result.current.setStickyScrollLeft(50))
      expect(result.current.stickyTranslateStyle).not.toBeNull()
      act(() => result.current.setStickyScrollLeft(0))
      expect(result.current.stickyTranslateStyle).toBeNull()
    })
  })

  describe('onStickyViewportWheel — 短路分支', () => {
    it('stickyEnabled=false → no-op（不更新 state、不 preventDefault）', () => {
      const { result } = render({ stickyEnabled: false })
      const ev = makeWheel({ deltaX: 50 })
      act(() => result.current.onStickyViewportWheel(ev))
      expect(result.current.stickyScrollLeft).toBe(0)
      expect(ev.preventDefault).not.toHaveBeenCalled()
    })

    it('maxScroll ≤ 1（grid 不溢出）→ no-op', () => {
      // viewport=200, grid scrollWidth=200 → maxScroll=0
      const { result } = render({
        stickyViewportRef: makeRef<HTMLDivElement>({ clientWidth: 200 } as HTMLDivElement),
        gridRef: makeRef<HTMLDivElement>({ scrollWidth: 200, clientWidth: 200 } as HTMLDivElement),
      })
      const ev = makeWheel({ deltaX: 100 })
      act(() => result.current.onStickyViewportWheel(ev))
      expect(result.current.stickyScrollLeft).toBe(0)
      expect(ev.preventDefault).not.toHaveBeenCalled()
    })

    it('|rawDelta| ≤ 0.5 → no-op（噪声 wheel）', () => {
      const { result } = render()
      const ev = makeWheel({ deltaX: 0.3 })
      act(() => result.current.onStickyViewportWheel(ev))
      expect(result.current.stickyScrollLeft).toBe(0)
      expect(ev.preventDefault).not.toHaveBeenCalled()
    })

    it('deltaX=0 + shiftKey=false + deltaY 任意 → rawDelta=0 → no-op', () => {
      const { result } = render()
      // deltaY=100 但既无 deltaX 也无 shiftKey → rawDelta=0，|0|≤0.5 短路
      const ev = makeWheel({ deltaY: 100, shiftKey: false })
      act(() => result.current.onStickyViewportWheel(ev))
      expect(result.current.stickyScrollLeft).toBe(0)
      expect(ev.preventDefault).not.toHaveBeenCalled()
    })

    it('next === current（已到边界，clamp 后无增量）→ no-op', () => {
      // maxScroll=300，stickyScrollLeft 已经=300，wheel 右滚 +50 → clamp 仍是 300 → no-op
      const { result } = render({
        stickyViewportRef: makeRef<HTMLDivElement>({ clientWidth: 200 } as HTMLDivElement),
        gridRef: makeRef<HTMLDivElement>({ scrollWidth: 500, clientWidth: 500 } as HTMLDivElement),
      })
      act(() => result.current.setStickyScrollLeft(300))
      const ev = makeWheel({ deltaX: 50 })
      act(() => result.current.onStickyViewportWheel(ev))
      expect(result.current.stickyScrollLeft).toBe(300)
      expect(ev.preventDefault).not.toHaveBeenCalled()
    })
  })

  describe('onStickyViewportWheel — delta 取值优先级（字节级对齐）', () => {
    it('deltaX 优先（|deltaX|>0 → 取 deltaX，忽略 deltaY/shiftKey）', () => {
      const { result } = render()
      const ev = makeWheel({ deltaX: 30, deltaY: 999, shiftKey: true })
      act(() => result.current.onStickyViewportWheel(ev))
      expect(result.current.stickyScrollLeft).toBe(30)
      expect(ev.preventDefault).toHaveBeenCalledTimes(1)
    })

    it('无 deltaX + shiftKey=true → 取 deltaY', () => {
      const { result } = render()
      const ev = makeWheel({ deltaX: 0, deltaY: 40, shiftKey: true })
      act(() => result.current.onStickyViewportWheel(ev))
      expect(result.current.stickyScrollLeft).toBe(40)
    })

    it('无 deltaX + shiftKey=false → rawDelta=0 → no-op', () => {
      const { result } = render()
      const ev = makeWheel({ deltaX: 0, deltaY: 40, shiftKey: false })
      act(() => result.current.onStickyViewportWheel(ev))
      expect(result.current.stickyScrollLeft).toBe(0)
      expect(ev.preventDefault).not.toHaveBeenCalled()
    })
  })

  describe('onStickyViewportWheel — clamp 边界（与 getStickyMaxScroll 协同）', () => {
    // viewport.clientWidth=200, grid.scrollWidth=500 → maxScroll=300
    const setup = () =>
      render({
        stickyViewportRef: makeRef<HTMLDivElement>({ clientWidth: 200 } as HTMLDivElement),
        gridRef: makeRef<HTMLDivElement>({ scrollWidth: 500, clientWidth: 500 } as HTMLDivElement),
      })

    it('右滚超出 maxScroll → clamp 到 maxScroll（不超 max）', () => {
      const { result } = setup()
      // 当前=280，wheel +50 → raw 330 → clamp 到 300
      act(() => result.current.setStickyScrollLeft(280))
      const ev = makeWheel({ deltaX: 50 })
      act(() => result.current.onStickyViewportWheel(ev))
      expect(result.current.stickyScrollLeft).toBe(300)
      expect(ev.preventDefault).toHaveBeenCalledTimes(1)
    })

    it('左滚到 < 0 → clamp 到 0', () => {
      const { result } = setup()
      act(() => result.current.setStickyScrollLeft(20))
      // deltaX=-50 → raw -30 → clamp 0
      const ev = makeWheel({ deltaX: -50 })
      act(() => result.current.onStickyViewportWheel(ev))
      expect(result.current.stickyScrollLeft).toBe(0)
      expect(ev.preventDefault).toHaveBeenCalledTimes(1)
    })

    it('maxScroll 计算依赖 scrollWidth 优先（grid.clientWidth 兜底）', () => {
      // scrollWidth=0 但 clientWidth=500 → maxScroll = (0 || 500) - viewport = 300
      const { result } = render({
        stickyViewportRef: makeRef<HTMLDivElement>({ clientWidth: 200 } as HTMLDivElement),
        gridRef: makeRef<HTMLDivElement>({ scrollWidth: 0, clientWidth: 500 } as HTMLDivElement),
      })
      act(() => result.current.setStickyScrollLeft(290))
      const ev = makeWheel({ deltaX: 50 })
      act(() => result.current.onStickyViewportWheel(ev))
      expect(result.current.stickyScrollLeft).toBe(300)
    })

    it('refs.current=null → getStickyMaxScroll 返回 0 → maxScroll≤1 短路', () => {
      const { result } = render({
        stickyViewportRef: makeRef<HTMLDivElement>(null),
        gridRef: makeRef<HTMLDivElement>(null),
      })
      const ev = makeWheel({ deltaX: 50 })
      act(() => result.current.onStickyViewportWheel(ev))
      expect(result.current.stickyScrollLeft).toBe(0)
      expect(ev.preventDefault).not.toHaveBeenCalled()
    })

    it('累积滚动：多次小 wheel 累加（每次增量生效）', () => {
      const { result } = setup()
      // +10 × 5 = 50
      for (let i = 0; i < 5; i++) {
        const ev = makeWheel({ deltaX: 10 })
        act(() => result.current.onStickyViewportWheel(ev))
      }
      expect(result.current.stickyScrollLeft).toBe(50)
    })
  })

  describe('callback / ref 稳定性', () => {
    it('onStickyViewportWheel 在 stickyEnabled/stickyScrollLeft 不变时引用稳定', () => {
      const { result, rerender } = renderHook(() =>
        useGridScrollSync({
          stickyEnabled: true,
          stickyViewportRef: makeRef<HTMLDivElement>({ clientWidth: 200 } as HTMLDivElement),
          gridRef: makeRef<HTMLDivElement>({ scrollWidth: 500, clientWidth: 500 } as HTMLDivElement),
        }),
      )
      const first = result.current.onStickyViewportWheel
      rerender()
      expect(result.current.onStickyViewportWheel).toBe(first)
    })

    it('setStickyScrollLeft 引用稳定（useState setter）', () => {
      const { result, rerender } = renderHook(() =>
        useGridScrollSync({
          stickyEnabled: true,
          stickyViewportRef: makeRef<HTMLDivElement>(null),
          gridRef: makeRef<HTMLDivElement>(null),
        }),
      )
      const first = result.current.setStickyScrollLeft
      rerender()
      expect(result.current.setStickyScrollLeft).toBe(first)
    })

    it('stickyScrollLeft 变化 → onStickyViewportWheel 引用变化（依赖数组包含 stickyScrollLeft）', () => {
      const { result } = render()
      const first = result.current.onStickyViewportWheel
      act(() => result.current.setStickyScrollLeft(10))
      // stickyScrollLeft 变化 → callback 重建（deps: [stickyEnabled, stickyScrollLeft]）
      expect(result.current.onStickyViewportWheel).not.toBe(first)
    })

    it('stickyEnabled 变化 → onStickyViewportWheel 引用变化', () => {
      let stickyEnabled = true
      const { result, rerender } = renderHook(() =>
        useGridScrollSync({
          stickyEnabled,
          stickyViewportRef: makeRef<HTMLDivElement>(null),
          gridRef: makeRef<HTMLDivElement>(null),
        }),
      )
      const first = result.current.onStickyViewportWheel
      stickyEnabled = false
      rerender()
      expect(result.current.onStickyViewportWheel).not.toBe(first)
    })
  })

  describe('集成：wheel → state → translate 派生链路', () => {
    it('wheel 触发后 stickyTranslateStyle 同步派生（整链路）', () => {
      const { result } = render({
        stickyEnabled: true,
        stickyViewportRef: makeRef<HTMLDivElement>({ clientWidth: 200 } as HTMLDivElement),
        gridRef: makeRef<HTMLDivElement>({ scrollWidth: 500, clientWidth: 500 } as HTMLDivElement),
      })
      // 初始：stickyScrollLeft=0 → null
      expect(result.current.stickyTranslateStyle).toBeNull()
      const ev = makeWheel({ deltaX: 75 })
      act(() => result.current.onStickyViewportWheel(ev))
      expect(result.current.stickyScrollLeft).toBe(75)
      expect(result.current.stickyTranslateStyle).toEqual({
        transform: 'translateX(-75px)',
        willChange: 'transform',
      })
    })
  })
})
