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

function getStickyMaxScroll(
  viewport: HTMLDivElement | null,
  grid: HTMLDivElement | null,
): number {
  if (!viewport || !grid) return 0
  return computeStickyMaxScroll(viewport.clientWidth, grid.scrollWidth, grid.clientWidth)
}

/**
 * 页面级 sticky 的底部横向滚动条（对齐 antd `StickyScrollBar`）。详见 docs/design-notes/sticky.md。
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
 * 仅 sticky 启用时渲染（GridTable 在 sticky 分支调用）；其余路径不渲染。
 */
export function StickyScrollBar({
  offsetScroll,
  getContainer,
  gridRef,
  viewportRef,
  scrollLeft,
  onScrollLeftChange,
}: {
  offsetScroll: number
  getContainer?: () => HTMLElement | Window | undefined
  gridRef: React.RefObject<HTMLDivElement | null>
  viewportRef?: React.RefObject<HTMLDivElement | null>
  scrollLeft?: number
  onScrollLeftChange?: (next: number) => void
}) {
  const barRef = useRef<HTMLDivElement | null>(null)
  const thumbRef = useRef<HTMLDivElement | null>(null)
  // 拖动状态 ref（避免重渲染；pointermove 直接操作 DOM）。
  const dragStateRef = useRef<{
    pointerId: number | null
    startPointerX: number
    startScrollLeft: number
  } | null>(null)

  useEffect(() => {
    return () => {
      barRef.current?.classList.remove('dg-sticky-scroll-bar-dragging')
      document.body.classList.remove('dg-scrollbar-pointer-capturing')
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

  // 更新 thumb 位置 + 宽度（按当前 scrollLeft / scrollWidth 比例）。
  const updateThumb = useCallback(() => {
    const container = resolveContainer()
    const bar = barRef.current
    const thumb = thumbRef.current
    if (!bar || !thumb) return
    // 容器滚动几何：window 用 scrollX/innerWidth/document.scrollWidth；
    // HTMLElement 用 scrollLeft/clientWidth/scrollWidth。
    let currentScrollLeft: number
    let clientWidth: number
    let scrollWidth: number
    if (viewportRef?.current && gridRef.current) {
      currentScrollLeft = scrollLeftValue(scrollLeft)
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
    const maxScroll = scrollWidth - clientWidth
    if (maxScroll <= 1) {
      bar.style.display = 'none'
      if (scrollLeftValue(scrollLeft) !== 0) onScrollLeftChange?.(0)
      return
    }
    bar.style.display = 'block'
    if (viewportRef?.current && onScrollLeftChange) {
      const clamped = clampScrollLeft(scrollLeftValue(scrollLeft), maxScroll)
      if (clamped !== scrollLeftValue(scrollLeft)) {
        onScrollLeftChange(clamped)
        return
      }
    }
    const ratio = maxScroll > 0 ? currentScrollLeft / maxScroll : 0
    const thumbRatio = scrollWidth > 0 ? clientWidth / scrollWidth : 1
    // thumb 宽度 = bar 宽度 × (clientWidth / scrollWidth)（至少 20px，避免太窄）。
    const barWidth = bar.clientWidth || clientWidth
    const thumbWidth = Math.max(20, barWidth * thumbRatio)
    const thumbMaxLeft = Math.max(0, barWidth - thumbWidth)
    thumb.style.width = `${thumbWidth}px`
    thumb.style.transform = `translateX(${ratio * thumbMaxLeft}px)`
  }, [resolveContainer, gridRef, viewportRef, scrollLeft, onScrollLeftChange])

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

  // thumb pointer 拖动：换算 pointer 移动量 → container scrollLeft。
  const onThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = resolveContainer()
    const thumb = thumbRef.current
    const bar = barRef.current
    if (!thumb || !bar) return
    e.preventDefault()
    e.stopPropagation()
    let clientWidth: number
    let scrollWidth: number
    let currentScrollLeft: number
    if (viewportRef?.current && gridRef.current) {
      clientWidth = viewportRef.current.clientWidth || 0
      scrollWidth = gridRef.current.scrollWidth || gridRef.current.clientWidth || 0
      currentScrollLeft = scrollLeftValue(scrollLeft)
    } else if (container instanceof Window) {
      clientWidth = container.innerWidth || 0
      scrollWidth = container.document?.documentElement?.scrollWidth || 0
      currentScrollLeft = container.scrollX || 0
    } else {
      clientWidth = container.clientWidth || 0
      scrollWidth = container.scrollWidth || 0
      currentScrollLeft = container.scrollLeft || 0
    }
    const barWidth = bar.clientWidth || 0
    const thumbRatio = scrollWidth > 0 ? clientWidth / scrollWidth : 1
    const thumbWidth = Math.max(20, barWidth * thumbRatio)
    const thumbMaxLeft = Math.max(0, barWidth - thumbWidth)
    const maxScroll = scrollWidth - clientWidth
    if (maxScroll <= 1) return
    dragStateRef.current = {
      pointerId: e.pointerId,
      startPointerX: e.clientX,
      startScrollLeft: currentScrollLeft,
    }
    bar.classList.add('dg-sticky-scroll-bar-dragging')
    document.body.classList.add('dg-scrollbar-pointer-capturing')
    // 用闭包捕获拖动几何（拖动期间 DOM 不变，无需重读）。
    const geometry = { thumbMaxLeft, maxScroll }
    const onMove = (ev: PointerEvent) => {
      const ds = dragStateRef.current
      if (!ds || ds.pointerId !== ev.pointerId) return
      const dx = ev.clientX - ds.startPointerX
      const scrollDelta = geometry.thumbMaxLeft > 0 ? (dx / geometry.thumbMaxLeft) * geometry.maxScroll : 0
      const next = ds.startScrollLeft + scrollDelta
      if (viewportRef?.current && onScrollLeftChange) {
        onScrollLeftChange(clampScrollLeft(next, geometry.maxScroll))
      } else if (container instanceof Window) {
        container.scrollTo(next, container.scrollY || 0)
      } else {
        ;(container as HTMLElement).scrollLeft = next
      }
    }
    const onUp = (ev: PointerEvent) => {
      const ds = dragStateRef.current
      if (!ds || ds.pointerId !== ev.pointerId) return
      dragStateRef.current = null
      bar.classList.remove('dg-sticky-scroll-bar-dragging')
      document.body.classList.remove('dg-scrollbar-pointer-capturing')
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
      className="dg-sticky-scroll-bar"
      style={{
        position: 'sticky',
        bottom: `${offsetScroll}px`,
        // 8px hit 区保留；thumb 的 2px/8px 折叠展开由 CSS 控制。
        height: 'var(--ant-table-scroll-thumb-size, 8px)',
        // z-index 6 高于表头 corner（z5），避免同级；几何不重叠时无视觉变化，防未来回归。
        zIndex: 6,
        // bar 宽度与 grid 对齐：grid 多宽 bar 多宽（gridRef 提供 grid 宽度参考）。
        // sticky 元素宽度保持为当前表格视口宽，不再用宽表 min-width 撑宽文档流。
      }}
    >
      <div
        ref={thumbRef}
        onPointerDown={onThumbPointerDown}
        className="dg-sticky-scroll-bar-thumb"
        style={{
          width: '20px',
        }}
      />
    </div>
  )
}

export { getStickyMaxScroll }
