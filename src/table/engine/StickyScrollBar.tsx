import {
  useCallback,
  useEffect,
  useRef,
} from 'react'
import {
  clampScrollLeft,
  computeStickyMaxScroll,
  scrollLeftValue,
} from './gridScrollUtils'
import {
  TRACK_REPEAT_DELAY_MS,
  TRACK_REPEAT_INTERVAL_MS,
  computeTrackJump,
} from './floatingScrollBarUtils'

const STICKY_THUMB_MIN_WIDTH = 20
const STICKY_TOUCH_THUMB_MIN_WIDTH = 32

function getStickyMaxScroll(
  viewport: HTMLDivElement | null,
  grid: HTMLDivElement | null,
): number {
  if (!viewport || !grid) return 0
  return computeStickyMaxScroll(viewport.clientWidth, grid.scrollWidth, grid.clientWidth)
}

/**
 * 页面级 sticky 的底部横向滚动条（对齐 antd `StickyScrollBar`）。详见 docs/features/layout/sticky.md。
 *
 * 背景：sticky 模式下不能用普通 `overflow-x:auto` 包住 grid，否则该 overflow 祖先会拦截表头
 * sticky 的纵向参照。这里用 `overflow: clip` 只裁剪宽表，再用 transform 模拟横向位移。
 * 本组件提供"底部固定的横向滚动条"：`position: sticky; bottom: offsetScroll`，
 * 页面纵向滚动时钉在视口底部；内部 thumb 反映 sticky 视口的虚拟横向 scrollLeft。
 *
 * 与 antd 差异：antd 的 StickyScrollBar 同步表体滚动容器；data-grid sticky 模式没有横向
 * overflow 容器，本组件直接维护虚拟 scrollLeft，并驱动 grid transform。
 *
 * 实现：
 * - sticky 视口模式按 `virtualScrollLeft / (grid.scrollWidth - viewport.clientWidth)` 计算 thumb。
 * - 拖动 thumb（pointer 事件）：按 pointer 移动量换算虚拟 scrollLeft。
 * - 旧的非视口分支保留给 window/HTMLElement 同步场景。
 *
 * 仅 sticky 启用时渲染（渲染宿主是 ScrollContainer 的 sticky 分支，GridTable 不直接 import 本件）；其余路径不渲染。
 */
export function StickyScrollBar({
  offsetScroll,
  getContainer,
  gridRef,
  viewportRef,
  scrollLeft,
  scrollLeftRef,
  onScrollLeftChange,
  updateThumbRef,
  scrollInertiaActive,
}: {
  offsetScroll: number
  getContainer?: () => HTMLElement | Window | undefined
  gridRef: React.RefObject<HTMLDivElement | null>
  viewportRef?: React.RefObject<HTMLDivElement | null>
  scrollLeft?: number
  scrollLeftRef?: React.RefObject<number>
  onScrollLeftChange?: (next: number) => void
  updateThumbRef?: {
    current: (() => void) | null
  }
  scrollInertiaActive?: boolean
}) {
  const barRef = useRef<HTMLDivElement | null>(null)
  const thumbRef = useRef<HTMLDivElement | null>(null)
  // 拖动状态 ref（避免重渲染；pointermove 直接操作 DOM）。
  const dragStateRef = useRef<{
    pointerId: number | null
    startPointerX: number
    startScrollLeft: number
  } | null>(null)
  const repeatTimeoutRef = useRef<number | null>(null)
  const repeatIntervalRef = useRef<number | null>(null)
  const repeatStopRef = useRef<(() => void) | null>(null)
  const touchThumbActiveRef = useRef(false)
  const touchMoveStopRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      barRef.current?.classList.remove('dg-sticky-scroll-bar-dragging')
      barRef.current?.classList.remove('dg-sticky-scroll-bar-touch-active')
      document.body.classList.remove('dg-scrollbar-pointer-capturing')
      repeatStopRef.current?.()
      touchMoveStopRef.current?.()
      touchMoveStopRef.current = null
    }
  }, [])

  // 解析 container（window 或 HTMLElement；undefined/null 回退 window）。
  const resolveContainer = useCallback((): Window | HTMLElement => {
    if (getContainer) {
      const c = getContainer()
      if (c instanceof Window) return c
      if (c && 'scrollTo' in c) return c as HTMLElement
    }
    return typeof window !== 'undefined' ? window : (null as unknown as Window)
  }, [getContainer])

  const readVirtualScrollLeft = useCallback(
    () => scrollLeftRef?.current ?? scrollLeftValue(scrollLeft),
    [scrollLeftRef, scrollLeft],
  )

  const readScrollGeometry = useCallback(() => {
    const container = resolveContainer()
    const bar = barRef.current
    if (!bar) return null

    let currentScrollLeft: number
    let clientWidth: number
    let scrollWidth: number
    if (viewportRef?.current && gridRef.current) {
      currentScrollLeft = readVirtualScrollLeft()
      clientWidth = viewportRef.current.clientWidth || 0
      scrollWidth = gridRef.current.scrollWidth || gridRef.current.clientWidth || 0
    } else if (container instanceof Window) {
      currentScrollLeft = container.scrollX || 0
      clientWidth = container.innerWidth || 0
      scrollWidth = container.document?.documentElement?.scrollWidth || 0
    } else {
      currentScrollLeft = container.scrollLeft || 0
      clientWidth = container.clientWidth || 0
      scrollWidth = container.scrollWidth || 0
    }

    const barWidth = bar.clientWidth || clientWidth
    const thumbRatio = scrollWidth > 0 ? clientWidth / scrollWidth : 1
    const minThumbWidth = touchThumbActiveRef.current
      ? STICKY_TOUCH_THUMB_MIN_WIDTH
      : STICKY_THUMB_MIN_WIDTH
    const thumbWidth = Math.max(minThumbWidth, barWidth * thumbRatio)
    const thumbMaxLeft = Math.max(0, barWidth - thumbWidth)
    const maxScroll = scrollWidth - clientWidth

    return {
      container,
      currentScrollLeft,
      clientWidth,
      scrollWidth,
      barWidth,
      thumbWidth,
      thumbMaxLeft,
      maxScroll,
    }
  }, [resolveContainer, gridRef, viewportRef, readVirtualScrollLeft])

  const applyScrollLeft = useCallback(
    (container: Window | HTMLElement, next: number, maxScroll: number): number => {
      const clamped = clampScrollLeft(next, maxScroll)
      if (viewportRef?.current && onScrollLeftChange) {
        onScrollLeftChange(clamped)
      } else if (container instanceof Window) {
        container.scrollTo(clamped, container.scrollY || 0)
      } else {
        ;(container as HTMLElement).scrollLeft = clamped
      }
      return clamped
    },
    [viewportRef, onScrollLeftChange],
  )

  // 更新 thumb 位置 + 宽度（按当前 scrollLeft / scrollWidth 比例）。
  const updateThumb = useCallback(() => {
    const bar = barRef.current
    const thumb = thumbRef.current
    if (!bar || !thumb) return
    const geometry = readScrollGeometry()
    if (!geometry) return
    const { currentScrollLeft, maxScroll } = geometry
    if (maxScroll <= 1) {
      bar.style.display = 'none'
      if (readVirtualScrollLeft() !== 0) onScrollLeftChange?.(0)
      return
    }
    bar.style.display = 'block'
    if (viewportRef?.current && onScrollLeftChange) {
      const current = readVirtualScrollLeft()
      const clamped = clampScrollLeft(current, maxScroll)
      if (clamped !== current) {
        onScrollLeftChange(clamped)
        return
      }
    }
    const ratio = maxScroll > 0 ? currentScrollLeft / maxScroll : 0
    // thumb 宽度 = bar 宽度 × (clientWidth / scrollWidth)（至少 20px，避免太窄）。
    thumb.style.width = `${geometry.thumbWidth}px`
    thumb.style.transform = `translateX(${ratio * geometry.thumbMaxLeft}px)`
  }, [readScrollGeometry, viewportRef, readVirtualScrollLeft, onScrollLeftChange])

  useEffect(() => {
    if (!updateThumbRef) return
    updateThumbRef.current = updateThumb
    return () => {
      if (updateThumbRef.current === updateThumb) {
        updateThumbRef.current = null
      }
    }
  }, [updateThumbRef, updateThumb])

  const deactivateTouchThumb = useCallback(() => {
    const bar = barRef.current
    if (!touchThumbActiveRef.current) return
    touchThumbActiveRef.current = false
    bar?.classList.remove('dg-sticky-scroll-bar-touch-active')
    updateThumb()
  }, [updateThumb])

  // 监听 container scroll + resize 更新 thumb。
  useEffect(() => {
    const container = resolveContainer()
    const target = container instanceof Window ? container : (container as HTMLElement)
    target.addEventListener('scroll', updateThumb, { passive: true })
    if (container instanceof Window) {
      container.addEventListener('resize', updateThumb)
    }
    const resizeObserver = new ResizeObserver(updateThumb)
    if (viewportRef?.current) resizeObserver.observe(viewportRef.current)
    if (gridRef.current) resizeObserver.observe(gridRef.current)
    // 初始更新。
    updateThumb()
    return () => {
      target.removeEventListener('scroll', updateThumb)
      if (container instanceof Window) {
        container.removeEventListener('resize', updateThumb)
      }
      resizeObserver.disconnect()
    }
  }, [resolveContainer, updateThumb, gridRef, viewportRef])

  // bar pointer：命中 thumb 走拖动；命中轨道空白按页滚动，并按 floating scrollbar 语义支持按住 repeat。
  const onBarPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const thumb = thumbRef.current
    const bar = barRef.current
    if (!thumb || !bar) return
    e.preventDefault()
    e.stopPropagation()

    const geometry = readScrollGeometry()
    if (!geometry || geometry.maxScroll <= 1) return

    const isTouchPointer = e.pointerType === 'touch'
    const targetNode = e.target instanceof Node ? e.target : null
    const thumbRect = thumb.getBoundingClientRect()
    const expandedThumbStart = isTouchPointer
      ? thumbRect.left - Math.max(0, STICKY_TOUCH_THUMB_MIN_WIDTH - thumbRect.width) / 2
      : thumbRect.left
    const expandedThumbEnd = isTouchPointer
      ? thumbRect.right + Math.max(0, STICKY_TOUCH_THUMB_MIN_WIDTH - thumbRect.width) / 2
      : thumbRect.right
    const clickedThumb = (targetNode ? thumb.contains(targetNode) : false)
      || (isTouchPointer && e.clientX >= expandedThumbStart && e.clientX <= expandedThumbEnd)
    if (!clickedThumb) {
      const jump = computeTrackJump({
        currentScroll: geometry.currentScrollLeft,
        viewportSize: geometry.clientWidth,
        clientPos: e.clientX,
        thumbStart: thumbRect.left,
        thumbEnd: thumbRect.right,
        maxScroll: geometry.maxScroll,
      })
      if (jump.zone !== 'thumb') {
        const beforeJump = geometry.currentScrollLeft
        let repeatScrollLeft = applyScrollLeft(
          geometry.container,
          jump.nextScroll,
          geometry.maxScroll,
        )
        if (repeatScrollLeft !== beforeJump) {
          const pointerId = e.pointerId
          const clientPos = e.clientX
          const stop = () => {
            if (repeatTimeoutRef.current !== null) {
              clearTimeout(repeatTimeoutRef.current)
              repeatTimeoutRef.current = null
            }
            if (repeatIntervalRef.current !== null) {
              clearInterval(repeatIntervalRef.current)
              repeatIntervalRef.current = null
            }
            window.removeEventListener('pointerup', stop)
            window.removeEventListener('pointercancel', stop)
            window.removeEventListener('pointermove', onMoveCheck)
            repeatStopRef.current = null
          }
          const onMoveCheck = (ev: PointerEvent) => {
            if (ev.pointerId !== pointerId) return
            const rect = thumb.getBoundingClientRect()
            if (ev.clientX >= rect.left && ev.clientX <= rect.right) {
              stop()
            }
          }
          const tick = () => {
            const rect = thumb.getBoundingClientRect()
            const next = computeTrackJump({
              currentScroll: repeatScrollLeft,
              viewportSize: geometry.clientWidth,
              clientPos,
              thumbStart: rect.left,
              thumbEnd: rect.right,
              maxScroll: geometry.maxScroll,
            })
            if (next.nextScroll === repeatScrollLeft) {
              stop()
              return
            }
            repeatScrollLeft = applyScrollLeft(
              geometry.container,
              next.nextScroll,
              geometry.maxScroll,
            )
          }
          repeatStopRef.current = stop
          window.addEventListener('pointerup', stop)
          window.addEventListener('pointercancel', stop)
          window.addEventListener('pointermove', onMoveCheck)
          repeatTimeoutRef.current = window.setTimeout(() => {
            repeatTimeoutRef.current = null
            tick()
            if (repeatStopRef.current === stop) {
              repeatIntervalRef.current = window.setInterval(
                tick,
                TRACK_REPEAT_INTERVAL_MS,
              )
            }
          }, TRACK_REPEAT_DELAY_MS)
        }
        return
      }
    }

    let dragGeometry = geometry
    if (isTouchPointer) {
      touchThumbActiveRef.current = true
      bar.classList.add('dg-sticky-scroll-bar-touch-active')
      updateThumb()
      dragGeometry = readScrollGeometry() ?? geometry
    }

    dragStateRef.current = {
      pointerId: e.pointerId,
      startPointerX: e.clientX,
      startScrollLeft: dragGeometry.currentScrollLeft,
    }
    bar.classList.add('dg-sticky-scroll-bar-dragging')
    document.body.classList.add('dg-scrollbar-pointer-capturing')
    try {
      bar.setPointerCapture(e.pointerId)
    } catch {
      // Some environments do not expose pointer capture on divs.
    }
    const onNativeTouchMove = (ev: TouchEvent) => {
      ev.preventDefault()
      ev.stopPropagation()
    }
    if (isTouchPointer) {
      bar.addEventListener('touchmove', onNativeTouchMove, { passive: false })
      const stopTouchMove = () => {
        bar.removeEventListener('touchmove', onNativeTouchMove)
        if (touchMoveStopRef.current === stopTouchMove) {
          touchMoveStopRef.current = null
        }
      }
      touchMoveStopRef.current = stopTouchMove
    }
    // 用闭包捕获拖动几何（拖动期间 DOM 不变，无需重读）。
    const capturedDragGeometry = {
      thumbMaxLeft: dragGeometry.thumbMaxLeft,
      maxScroll: dragGeometry.maxScroll,
    }
    const onMove = (ev: PointerEvent) => {
      const ds = dragStateRef.current
      if (!ds || ds.pointerId !== ev.pointerId) return
      ev.preventDefault()
      ev.stopPropagation()
      const dx = ev.clientX - ds.startPointerX
      const scrollDelta = capturedDragGeometry.thumbMaxLeft > 0
        ? (dx / capturedDragGeometry.thumbMaxLeft) * capturedDragGeometry.maxScroll
        : 0
      applyScrollLeft(
        dragGeometry.container,
        ds.startScrollLeft + scrollDelta,
        capturedDragGeometry.maxScroll,
      )
    }
    const onUp = (ev: PointerEvent) => {
      const ds = dragStateRef.current
      if (!ds || ds.pointerId !== ev.pointerId) return
      dragStateRef.current = null
      bar.classList.remove('dg-sticky-scroll-bar-dragging')
      document.body.classList.remove('dg-scrollbar-pointer-capturing')
      try {
        bar.releasePointerCapture(ds.pointerId)
      } catch {
        // Pointer capture may not have been acquired in this environment.
      }
      if (isTouchPointer) {
        touchMoveStopRef.current?.()
        deactivateTouchThumb()
      }
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  return (
    <div
      ref={barRef}
      className={[
        'dg-sticky-scroll-bar',
        scrollInertiaActive ? 'dg-sticky-scroll-bar-inertia' : undefined,
      ].filter(Boolean).join(' ')}
      onPointerDown={onBarPointerDown}
      style={{
        position: 'sticky',
        bottom: `${offsetScroll}px`,
        // 8px hit 区保留；用负 margin 抵消布局高度，使 sticky 横向条像 FloatingScrollBar 一样悬浮。
        height: 'var(--ant-table-scroll-thumb-size, 8px)',
        marginTop: 'calc(var(--ant-table-scroll-thumb-size, 8px) * -1)',
        // z-index 6 高于表头 corner（z5），避免同级；几何不重叠时无视觉变化，防未来回归。
        zIndex: 6,
        // bar 宽度与 grid 对齐：grid 多宽 bar 多宽（gridRef 提供 grid 宽度参考）。
        // sticky 元素宽度保持为当前表格视口宽，不再用宽表 min-width 撑宽文档流。
      }}
    >
      <div
        ref={thumbRef}
        className="dg-sticky-scroll-bar-thumb"
        style={{
          width: '20px',
        }}
      />
    </div>
  )
}

export { getStickyMaxScroll }
