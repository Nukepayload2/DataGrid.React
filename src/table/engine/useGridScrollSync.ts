/**
 * sticky 横向滚动同步 hook（从 GridTable 抽出，行为字节级保持）。
 *
 * 职责：维护 sticky 模式下"虚拟横向 scrollLeft"的状态与事件处理——
 *   wheel 事件 → 更新 `stickyScrollLeft` → 派生 `stickyTranslateStyle`（translateX 驱动 grid 位移），
 *   并与 `StickyScrollBar.getStickyMaxScroll` 协同（用 maxScroll clamp 防止越界）。
 *
 * 背景：sticky 模式下 grid 只包一层 `overflow: clip` 视口，无横向滚动容器；
 *   横向位移由虚拟 `stickyScrollLeft` + `transform: translateX(...)` 模拟。
 *   用户的横向 wheel（shift+wheel 或触控板 deltaX）在本 hook 处理为虚拟 scrollLeft 增量；
 *   `StickyScrollBar` 拖动则通过 `setStickyScrollLeft` 回写同一份 state（路径在 ScrollContainer）。
 *
 * 抽取边界：
 *   - state（`stickyScrollLeft`）+ setter（`setStickyScrollLeft`）+ wheel/touch handlers
 *     + 派生 transform style（`stickyTranslateStyle`）全部返回。
 *   - `getStickyMaxScroll` 仍由 `StickyScrollBar.tsx` 提供，本 hook 只调用不改。
 *
 * 详见 docs/design-notes/sticky.md（页面级 sticky 的虚拟横向滚动）。
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { clampScrollLeft } from './gridScrollUtils'
import { getStickyMaxScroll } from './StickyScrollBar'

const STICKY_TOUCH_DRAG_THRESHOLD = 6
const STICKY_TOUCH_INERTIA_DURATION = 1000
const STICKY_TOUCH_INERTIA_MIN_VELOCITY = 0.02
const STICKY_TOUCH_INERTIA_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

interface StickyTouchDragState {
  pointerId: number
  startX: number
  startY: number
  startScrollLeft: number
  lastScrollLeft: number
  lastTime: number
  velocity: number
  maxScroll: number
  mode: 'pending' | 'horizontal'
}

interface StickyNativeTouchIntentState {
  startX: number
  startY: number
  mode: 'pending' | 'horizontal' | 'vertical'
}

function pointerEventTime(event: ReactPointerEvent<HTMLDivElement>): number {
  return Number.isFinite(event.timeStamp) ? event.timeStamp : performance.now()
}

export interface UseGridScrollSyncOptions {
  /** sticky 模式启用（决定 wheel 处理是否短路 + transform 是否启用）。 */
  stickyEnabled: boolean
  /** sticky 视口 ref（getStickyMaxScroll 读 clientWidth）。 */
  stickyViewportRef: React.RefObject<HTMLDivElement | null>
  /** 主 grid ref（getStickyMaxScroll 读 scrollWidth/clientWidth）。 */
  gridRef: React.RefObject<HTMLDivElement | null>
}

export interface UseGridScrollSyncResult {
  /** sticky 当前虚拟横向 scrollLeft（驱动 StickyScrollBar thumb + grid transform）。 */
  stickyScrollLeft: number
  /** sticky scrollLeft setter（StickyScrollBar 拖动/同步回写）。 */
  setStickyScrollLeft: (next: number) => void
  /** sticky 视口 wheel 处理（更新虚拟 stickyScrollLeft）。 */
  onStickyViewportWheel: (event: WheelEvent) => void
  /** sticky 视口触摸拖动开始：横向拖动数据区域时更新虚拟 stickyScrollLeft。 */
  onStickyViewportPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  /** sticky 视口触摸拖动移动：横向意图接管，纵向意图交给页面滚动。 */
  onStickyViewportPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void
  /** sticky 视口触摸拖动结束/取消。 */
  onStickyViewportPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void
  /** sticky 触摸释放后的 compositor transition 惯性状态。 */
  stickyScrollInertiaActive: boolean
  /** sticky transform style（translateX 驱动 grid + summary 同步位移）。 */
  stickyTranslateStyle: CSSProperties | null
}

/**
 * sticky 模式横向滚动同步（先移动不重写，字节级对齐原 GridTable 内联实现）。
 *
 * 行为保持：
 * - `stickyScrollLeft` 初始值 0；wheel / StickyScrollBar 拖动均通过 `setStickyScrollLeft` 更新。
 * - `onStickyViewportWheel`：sticky 未启用短路；maxScroll≤1 短路；delta≤0.5 短路；
 *   clamp 边界（不超 maxScroll）；next===current 短路；preventDefault + setState。
 * - `stickyTranslateStyle`：sticky 启用且 stickyScrollLeft>0 时构造 `translateX(-x)px` + willChange:transform；
 *   否则 null（无 transform）。
 */
export function useGridScrollSync({
  stickyEnabled,
  stickyViewportRef,
  gridRef,
}: UseGridScrollSyncOptions): UseGridScrollSyncResult {
  const [stickyScrollLeft, setStickyScrollLeftState] = useState(0)
  const [stickyScrollInertiaActive, setStickyScrollInertiaActive] = useState(false)
  const stickyScrollLeftRef = useRef(0)
  const touchDragRef = useRef<StickyTouchDragState | null>(null)
  const touchInertiaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nativeTouchIntentRef = useRef<StickyNativeTouchIntentState | null>(null)

  const cancelStickyTouchInertia = useCallback(() => {
    if (touchInertiaTimerRef.current !== null) {
      clearTimeout(touchInertiaTimerRef.current)
      touchInertiaTimerRef.current = null
    }
    setStickyScrollInertiaActive(false)
  }, [])

  const setStickyScrollLeftValue = useCallback((next: number) => {
    stickyScrollLeftRef.current = next
    setStickyScrollLeftState(next)
  }, [])

  const setStickyScrollLeft = useCallback(
    (next: number) => {
      cancelStickyTouchInertia()
      setStickyScrollLeftValue(next)
    },
    [cancelStickyTouchInertia, setStickyScrollLeftValue],
  )

  useEffect(() => cancelStickyTouchInertia, [cancelStickyTouchInertia])

  useEffect(() => {
    if (!stickyEnabled) cancelStickyTouchInertia()
  }, [stickyEnabled, cancelStickyTouchInertia])

  useEffect(() => {
    if (!stickyEnabled) return
    const viewport = stickyViewportRef.current
    if (!viewport) return
    if (typeof viewport.addEventListener !== 'function') return

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (!touch) return
      nativeTouchIntentRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        mode: 'pending',
      }
    }

    const onTouchMove = (event: TouchEvent) => {
      const intent = nativeTouchIntentRef.current
      const touch = event.touches[0]
      if (!intent || !touch) return
      const dx = touch.clientX - intent.startX
      const dy = touch.clientY - intent.startY
      if (intent.mode === 'pending') {
        const absX = Math.abs(dx)
        const absY = Math.abs(dy)
        if (absX < STICKY_TOUCH_DRAG_THRESHOLD && absY < STICKY_TOUCH_DRAG_THRESHOLD) return
        intent.mode = absX > absY ? 'horizontal' : 'vertical'
      }
      if (intent.mode === 'horizontal') {
        event.preventDefault()
      }
    }

    const onTouchEnd = () => {
      nativeTouchIntentRef.current = null
    }

    viewport.addEventListener('touchstart', onTouchStart, { passive: true })
    viewport.addEventListener('touchmove', onTouchMove, { passive: false })
    viewport.addEventListener('touchend', onTouchEnd)
    viewport.addEventListener('touchcancel', onTouchEnd)
    return () => {
      viewport.removeEventListener('touchstart', onTouchStart)
      viewport.removeEventListener('touchmove', onTouchMove)
      viewport.removeEventListener('touchend', onTouchEnd)
      viewport.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [stickyEnabled, stickyViewportRef])

  const startStickyTouchInertia = useCallback(
    (velocity: number, startScrollLeft: number, maxScroll: number) => {
      if (Math.abs(velocity) < STICKY_TOUCH_INERTIA_MIN_VELOCITY) return
      const targetScrollLeft = clampScrollLeft(
        startScrollLeft + velocity * STICKY_TOUCH_INERTIA_DURATION / 2,
        maxScroll,
      )
      if (targetScrollLeft === startScrollLeft) return

      cancelStickyTouchInertia()
      setStickyScrollInertiaActive(true)
      setStickyScrollLeftValue(targetScrollLeft)
      touchInertiaTimerRef.current = setTimeout(() => {
        touchInertiaTimerRef.current = null
        setStickyScrollInertiaActive(false)
      }, STICKY_TOUCH_INERTIA_DURATION)
    },
    [cancelStickyTouchInertia, setStickyScrollLeftValue],
  )

  const onStickyViewportWheel = useCallback(
    (event: WheelEvent) => {
      if (!stickyEnabled) return
      const rawDelta = Math.abs(event.deltaX) > 0
        ? event.deltaX
        : event.shiftKey
          ? event.deltaY
          : 0
      if (Math.abs(rawDelta) <= 0.5) return
      event.preventDefault()
      event.stopPropagation()

      const maxScroll = getStickyMaxScroll(stickyViewportRef.current, gridRef.current)
      if (maxScroll <= 1) return
      const current = clampScrollLeft(stickyScrollLeftRef.current, maxScroll)
      const next = clampScrollLeft(current + rawDelta, maxScroll)
      if (next === current) return
      cancelStickyTouchInertia()
      setStickyScrollLeftValue(next)
    },
    // refs 不进 deps（与原 GridTable 内联块一致；ref 对象稳定恒等）。
    [stickyEnabled, cancelStickyTouchInertia, setStickyScrollLeftValue],
  )

  const onStickyViewportPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!stickyEnabled || event.pointerType !== 'touch') return
      if (event.isPrimary === false) return
      const maxScroll = getStickyMaxScroll(stickyViewportRef.current, gridRef.current)
      if (maxScroll <= 1) return
      cancelStickyTouchInertia()
      const startScrollLeft = clampScrollLeft(stickyScrollLeft, maxScroll)
      touchDragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startScrollLeft,
        lastScrollLeft: startScrollLeft,
        lastTime: pointerEventTime(event),
        velocity: 0,
        maxScroll,
        mode: 'pending',
      }
    },
    [stickyEnabled, stickyScrollLeft, cancelStickyTouchInertia],
  )

  const onStickyViewportPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = touchDragRef.current
      if (!stickyEnabled || !drag || drag.pointerId !== event.pointerId) return
      const dx = event.clientX - drag.startX
      const dy = event.clientY - drag.startY
      if (drag.mode === 'pending') {
        const absX = Math.abs(dx)
        const absY = Math.abs(dy)
        if (absX < STICKY_TOUCH_DRAG_THRESHOLD && absY < STICKY_TOUCH_DRAG_THRESHOLD) return
        if (absY >= absX) {
          touchDragRef.current = null
          return
        }
        drag.mode = 'horizontal'
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          // Some test/browser environments do not expose pointer capture on divs.
        }
      }
      event.preventDefault()
      const next = clampScrollLeft(drag.startScrollLeft - dx, drag.maxScroll)
      const now = pointerEventTime(event)
      const elapsed = Math.max(1, now - drag.lastTime)
      drag.velocity = (next - drag.lastScrollLeft) / elapsed
      drag.lastScrollLeft = next
      drag.lastTime = now
      setStickyScrollLeftValue(next)
    },
    [stickyEnabled, setStickyScrollLeftValue],
  )

  const onStickyViewportPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = touchDragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      touchDragRef.current = null
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        // Pointer capture may not have been acquired if the gesture stayed pending.
      }
      if (drag.mode === 'horizontal' && event.type !== 'pointercancel') {
        startStickyTouchInertia(drag.velocity, drag.lastScrollLeft, drag.maxScroll)
      }
    },
    [startStickyTouchInertia],
  )

  const stickyTranslateStyle: CSSProperties | null =
    stickyEnabled && (stickyScrollLeft > 0 || stickyScrollInertiaActive)
      ? {
          transform: `translateX(${-stickyScrollLeft}px)`,
          willChange: 'transform',
          ...(stickyScrollInertiaActive
            ? {
                transition: `transform ${STICKY_TOUCH_INERTIA_DURATION}ms ${STICKY_TOUCH_INERTIA_EASING}`,
              }
            : null),
        }
      : null

  return {
    stickyScrollLeft,
    setStickyScrollLeft,
    onStickyViewportWheel,
    onStickyViewportPointerDown,
    onStickyViewportPointerMove,
    onStickyViewportPointerUp,
    stickyScrollInertiaActive,
    stickyTranslateStyle,
  }
}
