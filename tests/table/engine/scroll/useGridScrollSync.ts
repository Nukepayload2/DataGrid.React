import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  useGridScrollSync,
  type UseGridScrollSyncOptions,
} from '../../../../src/table/engine/useGridScrollSync'

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

/** 构造一个 wheel 事件 mock（只需 deltaX/deltaY/shiftKey + preventDefault/stopPropagation spy）。 */
function makeWheel(
  opts: Partial<{ deltaX: number; deltaY: number; shiftKey: boolean }> = {},
): WheelEvent & {
  preventDefault: ReturnType<typeof vi.fn>
  stopPropagation: ReturnType<typeof vi.fn>
} {
  const { deltaX = 0, deltaY = 0, shiftKey = false } = opts
  const preventDefault = vi.fn()
  const stopPropagation = vi.fn()
  return {
    deltaX,
    deltaY,
    shiftKey,
    preventDefault,
    stopPropagation,
    // WheelEvent 其他字段在 hook 内未被读取，省略。
  } as unknown as WheelEvent & {
    preventDefault: ReturnType<typeof vi.fn>
    stopPropagation: ReturnType<typeof vi.fn>
  }
}

/** 指针捕获两个方法的 spy 类型。`HTMLDivElement.setPointerCapture` 自带
 *  `(pointerId: number) => void` 签名，与下面的交叉类型合成 `((pointerId: number) => void) & Mock<…>`；
 * 裸 `vi.fn()`（`Mock<Constructable | Procedure>`）既不是可调用类型、也不带 `mock.calls` 的可用形状，
 * 赋不过去（TS2322）。标出真实签名后两侧同型，行为逐字不变。 */
type PointerCaptureSpy = Mock<(pointerId: number) => void>

function makePointer(
  opts: Partial<{
    pointerType: string
    pointerId: number
    clientX: number
    clientY: number
    isPrimary: boolean
    timeStamp: number
    type: string
  }> = {},
): React.PointerEvent<HTMLDivElement> & {
  preventDefault: ReturnType<typeof vi.fn>
  currentTarget: HTMLDivElement & {
    setPointerCapture: PointerCaptureSpy
    releasePointerCapture: PointerCaptureSpy
  }
} {
  const {
    pointerType = 'touch',
    pointerId = 1,
    clientX = 0,
    clientY = 0,
    isPrimary = true,
    timeStamp = 0,
    type = 'pointermove',
  } = opts
  const currentTarget = document.createElement('div') as HTMLDivElement & {
    setPointerCapture: PointerCaptureSpy
    releasePointerCapture: PointerCaptureSpy
  }
  currentTarget.setPointerCapture = vi.fn<(pointerId: number) => void>()
  currentTarget.releasePointerCapture = vi.fn<(pointerId: number) => void>()
  return {
    pointerType,
    pointerId,
    clientX,
    clientY,
    isPrimary,
    timeStamp,
    type,
    currentTarget,
    preventDefault: vi.fn(),
  } as unknown as React.PointerEvent<HTMLDivElement> & {
    preventDefault: ReturnType<typeof vi.fn>
    currentTarget: HTMLDivElement & {
      setPointerCapture: PointerCaptureSpy
      releasePointerCapture: PointerCaptureSpy
    }
  }
}

function makeElementWithSize(clientWidth: number): HTMLDivElement {
  const element = document.createElement('div')
  Object.defineProperty(element, 'clientWidth', {
    configurable: true,
    value: clientWidth,
  })
  return element
}

function makeTouchEvent(
  type: string,
  clientX: number,
  clientY: number,
): TouchEvent {
  const event = new Event(type, {
    bubbles: true,
    cancelable: true,
  }) as TouchEvent
  Object.defineProperty(event, 'touches', {
    configurable: true,
    value: type === 'touchend' || type === 'touchcancel'
      ? []
      : [{ clientX, clientY }],
  })
  return event
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
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('初始状态', () => {
    it('stickyScrollLeft 初始为 0', () => {
      const { result } = render()
      expect(result.current.stickyScrollLeft).toBe(0)
    })

    it('setStickyScrollLeft 直接调用可更新 stickyScrollLeftRef（StickyScrollBar 拖动回写路径）', () => {
      const { result } = render()
      act(() => result.current.setStickyScrollLeft(42))
      expect(result.current.stickyScrollLeftRef.current).toBe(42)
      // 高频 setter 不同步 React state，避免拖动/滚轮路径重渲染整张表。
      expect(result.current.stickyScrollLeft).toBe(0)
    })
  })

  describe('onStickyViewportWheel — 短路分支', () => {
    it('stickyEnabled=false → no-op（不更新 state、不 preventDefault）', () => {
      const { result } = render({ stickyEnabled: false })
      const ev = makeWheel({ deltaX: 50 })
      act(() => result.current.onStickyViewportWheel(ev))
      expect(result.current.stickyScrollLeft).toBe(0)
      expect(ev.preventDefault).not.toHaveBeenCalled()
      expect(ev.stopPropagation).not.toHaveBeenCalled()
    })

    it('maxScroll ≤ 1（grid 不溢出）→ 阻断横向默认手势但不更新 state', () => {
      // viewport=200, grid scrollWidth=200 → maxScroll=0
      const { result } = render({
        stickyViewportRef: makeRef<HTMLDivElement>({ clientWidth: 200 } as HTMLDivElement),
        gridRef: makeRef<HTMLDivElement>({ scrollWidth: 200, clientWidth: 200 } as HTMLDivElement),
      })
      const ev = makeWheel({ deltaX: 100 })
      act(() => result.current.onStickyViewportWheel(ev))
      expect(result.current.stickyScrollLeft).toBe(0)
      expect(ev.preventDefault).toHaveBeenCalledTimes(1)
      expect(ev.stopPropagation).toHaveBeenCalledTimes(1)
    })

    it('|rawDelta| ≤ 0.5 → no-op（噪声 wheel）', () => {
      const { result } = render()
      const ev = makeWheel({ deltaX: 0.3 })
      act(() => result.current.onStickyViewportWheel(ev))
      expect(result.current.stickyScrollLeft).toBe(0)
      expect(ev.preventDefault).not.toHaveBeenCalled()
      expect(ev.stopPropagation).not.toHaveBeenCalled()
    })

    it('deltaX=0 + shiftKey=false + deltaY 任意 → rawDelta=0 → no-op', () => {
      const { result } = render()
      // deltaY=100 但既无 deltaX 也无 shiftKey → rawDelta=0，|0|≤0.5 短路
      const ev = makeWheel({ deltaY: 100, shiftKey: false })
      act(() => result.current.onStickyViewportWheel(ev))
      expect(result.current.stickyScrollLeft).toBe(0)
      expect(ev.preventDefault).not.toHaveBeenCalled()
      expect(ev.stopPropagation).not.toHaveBeenCalled()
    })

    it('next === current（已到边界，clamp 后无增量）→ 阻断横向默认手势但不更新 state', () => {
      // maxScroll=300，stickyScrollLeft 已经=300，wheel 右滚 +50 → clamp 仍是 300 → no-op
      const { result } = render({
        stickyViewportRef: makeRef<HTMLDivElement>({ clientWidth: 200 } as HTMLDivElement),
        gridRef: makeRef<HTMLDivElement>({ scrollWidth: 500, clientWidth: 500 } as HTMLDivElement),
      })
      act(() => result.current.setStickyScrollLeft(300))
      const ev = makeWheel({ deltaX: 50 })
      act(() => result.current.onStickyViewportWheel(ev))
      expect(result.current.stickyScrollLeftRef.current).toBe(300)
      expect(ev.preventDefault).toHaveBeenCalledTimes(1)
      expect(ev.stopPropagation).toHaveBeenCalledTimes(1)
    })
  })

  describe('onStickyViewportWheel — delta 取值优先级（字节级对齐）', () => {
    it('deltaX 优先（|deltaX|>0 → 取 deltaX，忽略 deltaY/shiftKey）', () => {
      const { result } = render()
      const ev = makeWheel({ deltaX: 30, deltaY: 999, shiftKey: true })
      act(() => result.current.onStickyViewportWheel(ev))
      expect(result.current.stickyScrollLeftRef.current).toBe(30)
      expect(ev.preventDefault).toHaveBeenCalledTimes(1)
      expect(ev.stopPropagation).toHaveBeenCalledTimes(1)
    })

    it('无 deltaX + shiftKey=true → 取 deltaY', () => {
      const { result } = render()
      const ev = makeWheel({ deltaX: 0, deltaY: 40, shiftKey: true })
      act(() => result.current.onStickyViewportWheel(ev))
      expect(result.current.stickyScrollLeftRef.current).toBe(40)
    })

    it('无 deltaX + shiftKey=false → rawDelta=0 → no-op', () => {
      const { result } = render()
      const ev = makeWheel({ deltaX: 0, deltaY: 40, shiftKey: false })
      act(() => result.current.onStickyViewportWheel(ev))
      expect(result.current.stickyScrollLeft).toBe(0)
      expect(ev.preventDefault).not.toHaveBeenCalled()
      expect(ev.stopPropagation).not.toHaveBeenCalled()
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
      expect(result.current.stickyScrollLeftRef.current).toBe(300)
      expect(ev.preventDefault).toHaveBeenCalledTimes(1)
      expect(ev.stopPropagation).toHaveBeenCalledTimes(1)
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
      expect(result.current.stickyScrollLeftRef.current).toBe(300)
    })

    it('refs.current=null → 阻断横向默认手势但不更新 state', () => {
      const { result } = render({
        stickyViewportRef: makeRef<HTMLDivElement>(null),
        gridRef: makeRef<HTMLDivElement>(null),
      })
      const ev = makeWheel({ deltaX: 50 })
      act(() => result.current.onStickyViewportWheel(ev))
      expect(result.current.stickyScrollLeftRef.current).toBe(0)
      expect(ev.preventDefault).toHaveBeenCalledTimes(1)
      expect(ev.stopPropagation).toHaveBeenCalledTimes(1)
    })

    it('累积滚动：多次小 wheel 累加（每次增量生效）', () => {
      const { result } = setup()
      // +10 × 5 = 50
      for (let i = 0; i < 5; i++) {
        const ev = makeWheel({ deltaX: 10 })
        act(() => result.current.onStickyViewportWheel(ev))
      }
      expect(result.current.stickyScrollLeftRef.current).toBe(50)
    })

    it('同一个原生 wheel listener 收到连续事件时也累加（大表渲染期间不读陈旧闭包）', () => {
      const { result } = setup()
      const nativeListener = result.current.onStickyViewportWheel
      act(() => {
        for (let i = 0; i < 5; i++) {
          nativeListener(makeWheel({ deltaX: 10 }))
        }
      })
      expect(result.current.stickyScrollLeftRef.current).toBe(50)
      expect(result.current.onStickyViewportWheel).toBe(nativeListener)
    })
  })

  describe('sticky viewport touch drag', () => {
    it('横向触摸拖动数据区域 → 更新 stickyScrollLeft（手指左滑等价向右滚）', () => {
      const { result } = render({
        stickyViewportRef: makeRef<HTMLDivElement>({ clientWidth: 200 } as HTMLDivElement),
        gridRef: makeRef<HTMLDivElement>({ scrollWidth: 500, clientWidth: 500 } as HTMLDivElement),
      })
      const down = makePointer({ clientX: 100, clientY: 20 })
      act(() => result.current.onStickyViewportPointerDown(down))
      const move = makePointer({ pointerId: 1, clientX: 40, clientY: 23 })
      act(() => result.current.onStickyViewportPointerMove(move))
      expect(result.current.stickyScrollLeftRef.current).toBe(60)
      expect(move.preventDefault).toHaveBeenCalledTimes(1)
      expect(move.currentTarget.setPointerCapture).toHaveBeenCalledWith(1)
    })

    it('横向触摸拖动按 maxScroll clamp', () => {
      const { result } = render({
        stickyViewportRef: makeRef<HTMLDivElement>({ clientWidth: 200 } as HTMLDivElement),
        gridRef: makeRef<HTMLDivElement>({ scrollWidth: 500, clientWidth: 500 } as HTMLDivElement),
      })
      act(() => result.current.setStickyScrollLeft(280))
      act(() => result.current.onStickyViewportPointerDown(makePointer({ clientX: 100, clientY: 20 })))
      act(() => result.current.onStickyViewportPointerMove(makePointer({ clientX: -100, clientY: 20 })))
      expect(result.current.stickyScrollLeftRef.current).toBe(300)
    })

    it('纵向触摸意图 → 不接管，保留页面纵向滚动', () => {
      const { result } = render()
      act(() => result.current.onStickyViewportPointerDown(makePointer({ clientX: 100, clientY: 100 })))
      const move = makePointer({ clientX: 103, clientY: 130 })
      act(() => result.current.onStickyViewportPointerMove(move))
      expect(result.current.stickyScrollLeft).toBe(0)
      expect(move.preventDefault).not.toHaveBeenCalled()
      expect(move.currentTarget.setPointerCapture).not.toHaveBeenCalled()
    })

    it('mouse pointer 不启动内容拖动，避免影响桌面文本选择', () => {
      const { result } = render()
      act(() => result.current.onStickyViewportPointerDown(makePointer({
        pointerType: 'mouse',
        clientX: 100,
        clientY: 20,
      })))
      const move = makePointer({ pointerType: 'mouse', clientX: 40, clientY: 20 })
      act(() => result.current.onStickyViewportPointerMove(move))
      expect(result.current.stickyScrollLeft).toBe(0)
      expect(move.preventDefault).not.toHaveBeenCalled()
    })

    it('pointerup 清理当前触摸拖动，后续 move 不再更新', () => {
      const { result } = render()
      act(() => result.current.onStickyViewportPointerDown(makePointer({ clientX: 100, clientY: 20 })))
      const up = makePointer({ pointerId: 1, clientX: 100, clientY: 20 })
      act(() => result.current.onStickyViewportPointerUp(up))
      act(() => result.current.onStickyViewportPointerMove(makePointer({ pointerId: 1, clientX: 40, clientY: 20 })))
      expect(result.current.stickyScrollLeft).toBe(0)
      expect(up.currentTarget.releasePointerCapture).toHaveBeenCalledWith(1)
    })

    it('pointerup 后一次性更新到惯性目标，并用 1000ms transform transition 做 easing', () => {
      vi.useFakeTimers()
      const { result } = render({
        stickyViewportRef: makeRef<HTMLDivElement>({ clientWidth: 200 } as HTMLDivElement),
        gridRef: makeRef<HTMLDivElement>({ scrollWidth: 1200, clientWidth: 1200 } as HTMLDivElement),
      })

      act(() => result.current.onStickyViewportPointerDown(makePointer({
        clientX: 200,
        clientY: 20,
        timeStamp: 0,
        type: 'pointerdown',
      })))
      act(() => result.current.onStickyViewportPointerMove(makePointer({
        clientX: 100,
        clientY: 20,
        timeStamp: 100,
      })))
      expect(result.current.stickyScrollLeftRef.current).toBe(100)

      act(() => result.current.onStickyViewportPointerUp(makePointer({
        clientX: 100,
        clientY: 20,
        timeStamp: 100,
        type: 'pointerup',
      })))

      expect(result.current.stickyScrollLeft).toBe(600)
      expect(result.current.stickyScrollInertiaActive).toBe(true)

      act(() => vi.advanceTimersByTime(999))
      expect(result.current.stickyScrollInertiaActive).toBe(true)
      act(() => vi.advanceTimersByTime(1))
      expect(result.current.stickyScrollLeft).toBe(600)
      expect(result.current.stickyScrollInertiaActive).toBe(false)
    })

    it('触摸惯性按 maxScroll clamp', () => {
      const { result } = render({
        stickyViewportRef: makeRef<HTMLDivElement>({ clientWidth: 200 } as HTMLDivElement),
        gridRef: makeRef<HTMLDivElement>({ scrollWidth: 500, clientWidth: 500 } as HTMLDivElement),
      })

      act(() => result.current.onStickyViewportPointerDown(makePointer({
        clientX: 200,
        clientY: 20,
        timeStamp: 0,
        type: 'pointerdown',
      })))
      act(() => result.current.onStickyViewportPointerMove(makePointer({
        clientX: 100,
        clientY: 20,
        timeStamp: 50,
      })))
      act(() => result.current.onStickyViewportPointerUp(makePointer({
        clientX: 100,
        clientY: 20,
        timeStamp: 50,
        type: 'pointerup',
      })))

      expect(result.current.stickyScrollLeftRef.current).toBe(300)
    })

    it('pointercancel 只清理拖动，不启动触摸惯性', () => {
      const { result } = render()

      act(() => result.current.onStickyViewportPointerDown(makePointer({
        clientX: 200,
        clientY: 20,
        timeStamp: 0,
        type: 'pointerdown',
      })))
      act(() => result.current.onStickyViewportPointerMove(makePointer({
        clientX: 100,
        clientY: 20,
        timeStamp: 100,
      })))
      act(() => result.current.onStickyViewportPointerUp(makePointer({
        pointerId: 1,
        type: 'pointercancel',
      })))

      expect(result.current.stickyScrollLeftRef.current).toBe(100)
      expect(result.current.stickyScrollInertiaActive).toBe(false)
    })

    it('原生 touchmove 兜底：横向意图 preventDefault，阻断 body 横向导航手势', () => {
      const viewport = makeElementWithSize(200)
      render({
        stickyViewportRef: makeRef<HTMLDivElement>(viewport),
        gridRef: makeRef<HTMLDivElement>({ scrollWidth: 500, clientWidth: 500 } as HTMLDivElement),
      })

      viewport.dispatchEvent(makeTouchEvent('touchstart', 100, 20))
      const move = makeTouchEvent('touchmove', 40, 22)
      viewport.dispatchEvent(move)

      expect(move.defaultPrevented).toBe(true)
    })

    it('原生 touchmove 兜底：纵向意图不 preventDefault，保留页面纵向滚动', () => {
      const viewport = makeElementWithSize(200)
      render({
        stickyViewportRef: makeRef<HTMLDivElement>(viewport),
        gridRef: makeRef<HTMLDivElement>({ scrollWidth: 500, clientWidth: 500 } as HTMLDivElement),
      })

      viewport.dispatchEvent(makeTouchEvent('touchstart', 100, 20))
      const move = makeTouchEvent('touchmove', 102, 80)
      viewport.dispatchEvent(move)

      expect(move.defaultPrevented).toBe(false)
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

    it('stickyScrollLeft 变化 → onStickyViewportWheel 引用保持稳定（通过 ref 读取最新值）', () => {
      const { result } = render()
      const first = result.current.onStickyViewportWheel
      act(() => result.current.setStickyScrollLeft(10))
      expect(result.current.onStickyViewportWheel).toBe(first)
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

  describe('集成：wheel → ref → RAF DOM 写入链路', () => {
    it('连续 wheel 只排一个 RAF，并在 flush 时同步 grid/summary CSS var 与 thumb', () => {
      const rafCallbacks: FrameRequestCallback[] = []
      const requestAnimationFrameSpy = vi
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation((cb) => {
          rafCallbacks.push(cb)
          return rafCallbacks.length
        })
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

      const grid = document.createElement('div')
      Object.defineProperty(grid, 'clientWidth', { configurable: true, value: 500 })
      Object.defineProperty(grid, 'scrollWidth', { configurable: true, value: 500 })
      const summaryGrid = document.createElement('div')
      const updateThumb = vi.fn()
      const { result } = render({
        stickyEnabled: true,
        stickyViewportRef: makeRef<HTMLDivElement>({ clientWidth: 200 } as HTMLDivElement),
        gridRef: makeRef<HTMLDivElement>(grid),
        stickySummaryGridRef: makeRef<HTMLDivElement>(summaryGrid),
        stickyScrollBarUpdateThumbRef: { current: updateThumb },
      })

      requestAnimationFrameSpy.mockClear()
      updateThumb.mockClear()
      act(() => {
        result.current.onStickyViewportWheel(makeWheel({ deltaX: 25 }))
        result.current.onStickyViewportWheel(makeWheel({ deltaX: 25 }))
      })
      expect(result.current.stickyScrollLeftRef.current).toBe(50)
      expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1)
      expect(grid.style.getPropertyValue('--dg-sticky-scroll-left')).toBe('0px')
      expect(summaryGrid.style.getPropertyValue('--dg-sticky-scroll-left')).toBe('0px')
      expect(updateThumb).not.toHaveBeenCalled()

      act(() => rafCallbacks[0](0))
      expect(grid.style.getPropertyValue('--dg-sticky-scroll-left')).toBe('50px')
      expect(summaryGrid.style.getPropertyValue('--dg-sticky-scroll-left')).toBe('50px')
      expect(updateThumb).toHaveBeenCalledTimes(1)
    })
  })
})
