/**
 * data-grid 悬浮自定义滚动条（macOS 风格：细线默认 + hover 变粗）。
 *
 * 设计目标：
 *
 * 1. 纵向悬浮滚动条（scroll.y === true 启用）：替换浏览器原生纵向滚动条。
 *    - 默认：右侧悬浮一条细线（thumb 视觉宽 ~2px，半透明灰）。
 *    - 8px hit test 区域：实际可交互/hover 命中区 8px（比视觉线宽，方便鼠标命中）。
 *    - hover（鼠标进入 8px hit 区）：线条变粗（thumb 视觉宽 ~8px，实色），transition 0.2s。
 *    - 滚动条位于数据区域（表头下方、summary 上方，表体右侧）——不延伸到表头/summary。
 *
 * 2. 横向悬浮滚动条（scroll.x 启用）：替换浏览器原生横向滚动条。
 *    - 默认：底部悬浮一条细线（thumb 视觉高 ~2px，半透明灰）。
 *    - hit 区上下各 8px（thumb 居中），hover 变粗 8px。
 *    - 定位数据区域底部（summary 上方，bottom=summary 高度）。
 *
 * 实现要点：
 *
 * 1. 不接管滚动行为：原生容器仍 `overflow-y/x: auto`（保留原生滚轮 + 程序 scrollLeft/scrollTop
 *    + scroll 事件）；视觉原生滚动条通过 CSS（`scrollbar-width: none` / `::-webkit-scrollbar{width/height:0}`）
 *    隐藏。本组件只同步显示反映 scroll 位置的悬浮 thumb，并支持拖动 thumb 驱动容器 scroll。
 *
 * 2. 定位锚点：悬浮条绝对定位在数据区域（纵向：top=表头高，bottom=summary 高，right=0；
 *    横向：left=0，right=0，bottom=summary 高）。滚动容器 overflow 会卷动其 absolute 子元素，
 *    故悬浮条不能直接放在滚动容器内部。组件返回一个包装层 `.dg-scroll-wrap`（position:relative，
 *    overflow:visible），内部放滚动容器 + 悬浮条（absolute 相对 wrap 定位）。GridTable 在
 *    scroll.y/scroll.x 分支调用 `<FloatingScrollBar><内容/></FloatingScrollBar>`。
 *
 * 3. 表头/summary 高度测量：ResizeObserver 监听 grid 内的"表头区"和"summary 区"高度变化。
 *
 * 4. 交互：hover（CSS 让 thumb 变粗，纯 CSS）；拖动 thumb（pointerdown → setPointerCapture →
 *    pointermove 换算 delta → 更新容器 scroll）；滚轮（容器原生 overflow 处理 → scroll 事件同步 thumb）；
 *    同步（容器 scroll + ResizeObserver → 重算 thumb 尺寸/位置/可见性）。
 *
 * 5. 可见性：内容不溢出 → 隐藏悬浮条（display:none）。
 *
 * 仅 scroll.y/scroll.x 启用时渲染（GridTable 显式调用本组件）；无 scroll 路径完全不渲染本组件。
 * 详见 [docs/design-notes/scrollbar.md](../../../docs/design-notes/scrollbar.md)。
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

/**
 * 测量"表头区高度"（表头 sticky 区相对滚动容器顶部的距离）。
 *
 * 表头区 = `.dg-cell-header` 元素相对滚动容器顶部的最大底部偏移。
 * showHeader=false 时无表头格 → 返回 0（悬浮条从顶部开始）。
 *
 * 参照系必须是滚动容器（container），不是 `.dg-grid`（grid）：
 *   - `.dg-grid` 是全量内容（虚拟下高 40 万 px），其 `getBoundingClientRect().top`
 *     随 scrollTop 变负（≈ -scrollTop）；
 *   - 表头 sticky 相对滚动容器顶固定，视觉位置不动；
 *   - 若参照 grid：`r.bottom - gridRect.top ≈ scrollTop + 40`，headerH 随 scrollTop 暴涨
 *     → 悬浮条 hit 容器 top=headerH 被推出 wrap、thumb transform 锁 0 → 滚动条消失。
 *   - 改参照 container：`r.bottom - containerRect.top ≈ 40`（恒定），headerH 稳定≈40。
 */
function measureHeaderHeight(
  grid: HTMLElement | null,
  container: HTMLElement | null,
): number {
  if (!grid || !container) return 0
  const containerRect = container.getBoundingClientRect()
  let maxBottom = 0
  const headers = grid.querySelectorAll<HTMLElement>(
    '.dg-cell-header, .dg-cell-header-vsticky',
  )
  headers.forEach((h) => {
    const r = h.getBoundingClientRect()
    const bottomRelativeToContainer = r.bottom - containerRect.top
    if (bottomRelativeToContainer > maxBottom) maxBottom = bottomRelativeToContainer
  })
  return Math.max(0, maxBottom)
}

/**
 * 测量"summary 区高度"（底部 summary 区占用的高度）。
 *
 * summary 区 = `.dg-cell-summary` 元素的并集高度（顶部偏移最小值到底部偏移最大值的范围）。
 * 无 summary → 返回 0（悬浮条延伸到底部）。
 *
 * 参照系同为滚动容器（container）：summary 是 `position: sticky; bottom: 0` 相对滚动容器底部固定；
 * 用 container 作参照才能在任意 scrollTop 下稳定测得其高度（不随 grid 的 -scrollTop 偏移而漂移）。
 *
 * 仅当 summary 确实 sticky bottom 固定时才计高，否则返回 0：未固定时若计高会让横向浮动条错误压在
 * 底部上方一行（条总是预留一行空间）。判定依据：取第一个 summary cell 的 getComputedStyle，仅当
 * `position==='sticky'` 且 `bottom` 解析为 0（SummaryCell fixed 分支注入 position:sticky;bottom:0）
 * 时才计高；否则返回 0（让条贴数据区底部，未固定时不为 summary 预留浮动条空间）。
 * recomputeVertical 消费同一函数，summary 未固定时纵向 thumb 也延伸到底。
 */
function measureSummaryHeight(
  grid: HTMLElement | null,
  container: HTMLElement | null,
): number {
  if (!grid || !container) return 0
  const containerRect = container.getBoundingClientRect()
  const summaries = grid.querySelectorAll<HTMLElement>('.dg-cell-summary')
  if (summaries.length === 0) return 0
  // 判定 summary 是否确实 sticky bottom 固定（取第一个 summary cell 探测）。
  // 未固定时（position 非 sticky / bottom 非 0）→ 直接返回 0，不为 summary 预留浮动条空间。
  const firstStyle = getComputedStyle(summaries[0])
  const isStickyBottom =
    firstStyle.position === 'sticky' && parseFloat(firstStyle.bottom) === 0
  if (!isStickyBottom) return 0
  let minTop = Infinity
  let maxBottom = -Infinity
  summaries.forEach((s) => {
    const r = s.getBoundingClientRect()
    const topRelativeToContainer = r.top - containerRect.top
    const bottomRelativeToContainer = r.bottom - containerRect.top
    if (topRelativeToContainer < minTop) minTop = topRelativeToContainer
    if (bottomRelativeToContainer > maxBottom) maxBottom = bottomRelativeToContainer
  })
  if (!Number.isFinite(minTop) || !Number.isFinite(maxBottom)) return 0
  return Math.max(0, maxBottom - minTop)
}

export interface FloatingScrollBarProps {
  /** 子节点（实际的滚动容器 `.dg-scroll`/`.dg-fixed-header-scroll`/`.dg-virtual-scroll`）。 */
  children: ReactNode
  /**
   * 滚动容器的 className（用于本组件在内部克隆/包装时识别 + 添加隐藏原生滚动条的修饰类）。
   * 由 GridTable 传入（如 'dg-scroll dg-fixed-header-scroll' / 'dg-scroll dg-virtual-scroll'）。
   */
  scrollContainerClassName?: string
  /** 滚动容器的 inline style（GridTable 原本要传给容器的 maxHeight/height/overflow 等）。 */
  scrollContainerStyle?: CSSProperties
  /** 滚动容器的 ref（GridTable 内部需引用，如虚拟滚动的 virtualScrollRef）。 */
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>
  /** 滚动容器额外 props（如 onScroll 等；目前 GridTable 未直接绑定 onScroll，预留）。 */
  scrollContainerProps?: Record<string, unknown>
  /**
   * 包装层的 className（来自 GridTable 的 semantic.section 等，原应注入到滚动容器的 class）。
   * 本组件把 sectionClass 注入到外层 .dg-scroll-wrap，保证 semantic 不丢失。
   */
  wrapClassName?: string
  /** 包装层的 inline style（semantic.section.style 等）。 */
  wrapStyle?: CSSProperties
  /**
   * 是否渲染横向悬浮滚动条（scroll.x 启用）。
   * 横向悬浮条定位数据区域底部（summary 上方），细线 2px + hit 上下各 8px + hover 变粗 8px + 拖动/同步。
   * 默认 false（仅纵向悬浮条）。
   */
  horizontal?: boolean
}

/**
 * 悬浮滚动条包装组件（纵向 + 横向）。
 *
 * 渲染结构：
 * ```
 * <div class="dg-scroll-wrap dg-scroll-floating" style={wrapStyle}>   // position:relative; overflow:visible
 *   <div class={scrollContainerClassName} ref={scrollContainerRef} style={scrollContainerStyle}>
 *     {children}   // .dg-grid 等
 *   </div>
 *   <VerticalThumb ... />   // 纵向：绝对定位锚定 wrap（数据区右侧）
 *   <HorizontalThumb ... /> // 横向：绝对定位锚定 wrap（数据区底部，summary 上方），仅 horizontal=true
 * </div>
 * ```
 *
 * `.dg-scroll-floating` 修饰类触发：滚动容器 `scrollbar-width:none` + `::-webkit-scrollbar{width:0;height:0}`
 * （隐藏原生纵/横滚动条）—— 由 CSS 选择器 `.dg-scroll-floating .dg-scroll` 提供（见 table.css）。
 */
export function FloatingScrollBar({
  children,
  scrollContainerClassName,
  scrollContainerStyle,
  scrollContainerRef,
  scrollContainerProps,
  wrapClassName,
  wrapStyle,
  horizontal = false,
}: FloatingScrollBarProps) {
  // 本组件内部 ref（始终绑定到包装层内的滚动容器 div）。
  const innerScrollRef = useRef<HTMLDivElement | null>(null)
  // 统一 ref：若外部传入 scrollContainerRef（虚拟场景），同时赋值给内外两个 ref。
  const setScrollRef = useCallback(
    (node: HTMLDivElement | null) => {
      innerScrollRef.current = node
      if (scrollContainerRef) {
        ;(scrollContainerRef as { current: HTMLDivElement | null }).current = node
      }
    },
    [scrollContainerRef],
  )

  const wrapRef = useRef<HTMLDivElement | null>(null)

  // === 纵向悬浮条 state ===
  const vThumbRef = useRef<HTMLDivElement | null>(null)
  const vHitRef = useRef<HTMLDivElement | null>(null)
  // state 不含 transform —— transform 由 DOM 直接写（onScroll / recompute），
  //   避免 React 重渲染用 state.transform 覆盖 DOM transform 造成滚动中闪烁。
  const [vThumbStyle, setVThumbStyle] = useState<CSSProperties>({
    height: 0,
    display: 'none',
  })
  const [trackInset, setTrackInset] = useState<{ top: number; bottom: number }>({
    top: 0,
    bottom: 0,
  })
  const vDragStateRef = useRef<{
    pointerId: number
    startY: number
    startScrollTop: number
  } | null>(null)

  // === 横向悬浮条 state ===
  const hThumbRef = useRef<HTMLDivElement | null>(null)
  const hHitRef = useRef<HTMLDivElement | null>(null)
  // state 不含 transform，横向 thumb 位置由 DOM 直接写（同纵向）。
  const [hThumbStyle, setHThumbStyle] = useState<CSSProperties>({
    width: 0,
    display: 'none',
  })
  const [hTrackInset, setHTrackInset] = useState<{ left: number; right: number; bottom: number }>({
    left: 0,
    right: 0,
    bottom: 0,
  })
  const hDragStateRef = useRef<{
    pointerId: number
    startX: number
    startScrollLeft: number
  } | null>(null)

  useEffect(() => {
    return () => {
      vHitRef.current?.classList.remove('dg-floating-scrollbar-dragging')
      hHitRef.current?.classList.remove('dg-floating-scrollbar-dragging')
      document.body.classList.remove('dg-scrollbar-pointer-capturing')
    }
  }, [])

  // 核心：重算纵向 thumb 几何 + track inset。
  const recomputeVertical = useCallback(() => {
    const container = innerScrollRef.current
    const thumb = vThumbRef.current
    const hit = vHitRef.current
    if (!container || !thumb || !hit) return

    const grid = container.querySelector<HTMLElement>('.dg-grid')
    const headerH = measureHeaderHeight(grid, container)
    const summaryH = measureSummaryHeight(grid, container)
    setTrackInset((prev) =>
      prev.top === headerH && prev.bottom === summaryH
        ? prev
        : { top: headerH, bottom: summaryH },
    )

    const clientHeight = container.clientHeight
    const scrollHeight = container.scrollHeight
    // 内容不溢出 → 隐藏纵向悬浮条。
    if (scrollHeight <= clientHeight + 1) {
      setVThumbStyle((prev) =>
        prev.display === 'none' ? prev : { ...prev, display: 'none' },
      )
      return
    }
    // track 高度 = clientHeight - headerH - summaryH（数据区可视高）。
    const trackHeight = Math.max(0, clientHeight - headerH - summaryH)
    // thumb 高度 = clientHeight × (clientHeight / scrollHeight)，最少 32px
    // （让 thumb 视觉更清晰，避免滚动中「滚到中途看不见」）。
    const thumbHeight = Math.max(32, trackHeight * (clientHeight / scrollHeight))
    const maxScroll = scrollHeight - clientHeight
    const scrollTop = container.scrollTop
    const thumbMaxOffset = Math.max(0, trackHeight - thumbHeight)
    const ratio = maxScroll > 0 ? scrollTop / maxScroll : 0
    const thumbOffset = ratio * thumbMaxOffset
    // thumb 位置（transform）由 DOM 单一路径负责。
    //   recompute 与 onScroll 都通过 `thumb.style.transform = ...` 直接写 DOM，
    //   state（vThumbStyle）不携带 transform，只管几何（height）+ 可见性（display）。
    //   这样 React 重渲染时不会用 state.transform 覆盖 DOM 上 onScroll 刚写的 transform，
    //   消除「state transform ↔ DOM transform 竞争覆盖」导致的滚动中 thumb 闪烁。
    setVThumbStyle((prev) => {
      // height/display 不变则跳过（避免 RO 频繁触发引起不必要重渲）。
      if (prev.height === thumbHeight && prev.display === 'block') return prev
      return { height: thumbHeight, display: 'block' }
    })
    // 位置直接写 DOM（与 onScroll 同一路径，单源）。
    thumb.style.transform = `translateY(${thumbOffset}px)`
  }, [])

  // 核心：重算横向 thumb 几何。
  const recomputeHorizontal = useCallback(() => {
    const container = innerScrollRef.current
    const thumb = hThumbRef.current
    const hit = hHitRef.current
    if (!container || !thumb || !hit) return

    const grid = container.querySelector<HTMLElement>('.dg-grid')
    const summaryH = measureSummaryHeight(grid, container)
    // 横向 track 定位：left=0, right=0, bottom=summary 高度（summary 上方）。
    setHTrackInset((prev) =>
      prev.bottom === summaryH ? prev : { left: 0, right: 0, bottom: summaryH },
    )

    const clientWidth = container.clientWidth
    const scrollWidth = container.scrollWidth
    // 内容不横向溢出 → 隐藏横向悬浮条。
    if (scrollWidth <= clientWidth + 1) {
      setHThumbStyle((prev) =>
        prev.display === 'none' ? prev : { ...prev, display: 'none' },
      )
      return
    }
    // thumb 宽度 = track 宽度 × (clientWidth / scrollWidth)，最少 32px（与纵向一致）。
    const trackWidth = clientWidth
    const thumbWidth = Math.max(32, trackWidth * (clientWidth / scrollWidth))
    const maxScroll = scrollWidth - clientWidth
    const scrollLeft = container.scrollLeft
    const thumbMaxOffset = Math.max(0, trackWidth - thumbWidth)
    const ratio = maxScroll > 0 ? scrollLeft / maxScroll : 0
    const thumbOffset = ratio * thumbMaxOffset
    // state 不携带 transform，位置由 DOM 直接写（单一源，同纵向）。
    setHThumbStyle((prev) => {
      if (prev.width === thumbWidth && prev.display === 'block') return prev
      return { width: thumbWidth, display: 'block' }
    })
    thumb.style.transform = `translateX(${thumbOffset}px)`
  }, [])

  const recompute = useCallback(() => {
    recomputeVertical()
    if (horizontal) recomputeHorizontal()
  }, [recomputeVertical, recomputeHorizontal, horizontal])

  // 监听容器 scroll（滚轮/键盘/程序滚动）→ 同步纵/横 thumb。
  useEffect(() => {
    const container = innerScrollRef.current
    if (!container) return
    const onScroll = () => {
      // === 纵向 ===
      const vThumb = vThumbRef.current
      if (vThumb && vThumb.style.display !== 'none') {
        const scrollHeight = container.scrollHeight
        const clientHeight = container.clientHeight
        const maxScroll = scrollHeight - clientHeight
        if (maxScroll > 0) {
          const headerH = trackInset.top
          const summaryH = trackInset.bottom
          const trackHeight = Math.max(0, clientHeight - headerH - summaryH)
          const thumbHeight = Math.max(32, trackHeight * (clientHeight / scrollHeight))
          const thumbMaxOffset = Math.max(0, trackHeight - thumbHeight)
          const ratio = container.scrollTop / maxScroll
          vThumb.style.transform = `translateY(${ratio * thumbMaxOffset}px)`
        }
      } else {
        recomputeVertical()
      }
      // === 横向 ===
      if (horizontal) {
        const hThumb = hThumbRef.current
        if (hThumb && hThumb.style.display !== 'none') {
          const scrollWidth = container.scrollWidth
          const clientWidth = container.clientWidth
          const maxScroll = scrollWidth - clientWidth
          if (maxScroll > 0) {
            const trackWidth = clientWidth
            const thumbWidth = Math.max(32, trackWidth * (clientWidth / scrollWidth))
            const thumbMaxOffset = Math.max(0, trackWidth - thumbWidth)
            const ratio = container.scrollLeft / maxScroll
            hThumb.style.transform = `translateX(${ratio * thumbMaxOffset}px)`
          }
        } else {
          recomputeHorizontal()
        }
      }
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [recomputeVertical, recomputeHorizontal, trackInset, horizontal])

  // ResizeObserver：容器尺寸/内容尺寸变化 → 全量 recompute。
  useEffect(() => {
    const container = innerScrollRef.current
    const grid = container?.querySelector<HTMLElement>('.dg-grid')
    if (!container) return
    const roContainer = new ResizeObserver(() => recompute())
    roContainer.observe(container)
    const roGrid = new ResizeObserver(() => recompute())
    if (grid) roGrid.observe(grid)
    recompute()
    return () => {
      roContainer.disconnect()
      roGrid.disconnect()
    }
  }, [recompute])

  // 纵向拖动（pointerdown 绑在 hit 容器，整个 8px hit 区可靠抓取，不依赖 thumb 先 hover 展开）：
  // pointerdown → capture（hit 容器自身）→ move 换算 → 容器 scrollTop。
  // thumb 仅用于几何计算 + transform 同步，其 ref 仍保留（vThumbRef）但不再绑 pointerdown。
  const onVHitPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = innerScrollRef.current
    if (!container) return
    e.preventDefault()
    e.stopPropagation()
    const scrollHeight = container.scrollHeight
    const clientHeight = container.clientHeight
    const maxScroll = scrollHeight - clientHeight
    if (maxScroll <= 0) return
    const headerH = trackInset.top
    const summaryH = trackInset.bottom
    const trackHeight = Math.max(0, clientHeight - headerH - summaryH)
    const thumbHeight = Math.max(32, trackHeight * (clientHeight / scrollHeight))
    const thumbMaxOffset = Math.max(0, trackHeight - thumbHeight)
    vDragStateRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      startScrollTop: container.scrollTop,
    }
    // onUp 注册在 window 上，触发时 pointerdown 事件对象 e 的 currentTarget 已为 null，
    //   导致 `e.currentTarget.releasePointerCapture` 抛 null。这里在 pointerdown 入口
    //   （e.currentTarget = hit 容器有效）把捕获目标元素引用存进闭包，set/release 都用同一元素。
    const hitEl = e.currentTarget
    hitEl.classList.add('dg-floating-scrollbar-dragging')
    document.body.classList.add('dg-scrollbar-pointer-capturing')
    hitEl.setPointerCapture(e.pointerId)
    const onMove = (ev: PointerEvent) => {
      const ds = vDragStateRef.current
      if (!ds || ds.pointerId !== ev.pointerId) return
      const dy = ev.clientY - ds.startY
      const scrollDelta = thumbMaxOffset > 0 ? (dy / thumbMaxOffset) * maxScroll : 0
      container.scrollTop = ds.startScrollTop + scrollDelta
    }
    const onUp = (ev: PointerEvent) => {
      const ds = vDragStateRef.current
      if (!ds || ds.pointerId !== ev.pointerId) return
      vDragStateRef.current = null
      hitEl.classList.remove('dg-floating-scrollbar-dragging')
      document.body.classList.remove('dg-scrollbar-pointer-capturing')
      hitEl.releasePointerCapture(ds.pointerId)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  // 横向拖动（pointerdown 绑在 hit 容器，整个 8px hit 区可靠抓取）：pointerdown → capture
  // （hit 容器自身）→ move 换算 → 容器 scrollLeft。thumb ref 保留但不绑 pointerdown。
  const onHHitPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = innerScrollRef.current
    if (!container) return
    e.preventDefault()
    e.stopPropagation()
    const scrollWidth = container.scrollWidth
    const clientWidth = container.clientWidth
    const maxScroll = scrollWidth - clientWidth
    if (maxScroll <= 0) return
    const trackWidth = clientWidth
    const thumbWidth = Math.max(32, trackWidth * (clientWidth / scrollWidth))
    const thumbMaxOffset = Math.max(0, trackWidth - thumbWidth)
    hDragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScrollLeft: container.scrollLeft,
    }
    // 同纵向：onUp 注册在 window 上，触发时 e.currentTarget 已为 null。
    //   在 pointerdown 入口把捕获目标元素引用存进闭包，set/release 都用同一元素。
    const hitEl = e.currentTarget
    hitEl.classList.add('dg-floating-scrollbar-dragging')
    document.body.classList.add('dg-scrollbar-pointer-capturing')
    hitEl.setPointerCapture(e.pointerId)
    const onMove = (ev: PointerEvent) => {
      const ds = hDragStateRef.current
      if (!ds || ds.pointerId !== ev.pointerId) return
      const dx = ev.clientX - ds.startX
      const scrollDelta = thumbMaxOffset > 0 ? (dx / thumbMaxOffset) * maxScroll : 0
      container.scrollLeft = ds.startScrollLeft + scrollDelta
    }
    const onUp = (ev: PointerEvent) => {
      const ds = hDragStateRef.current
      if (!ds || ds.pointerId !== ev.pointerId) return
      hDragStateRef.current = null
      hitEl.classList.remove('dg-floating-scrollbar-dragging')
      document.body.classList.remove('dg-scrollbar-pointer-capturing')
      hitEl.releasePointerCapture(ds.pointerId)
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
      ref={wrapRef}
      className={['dg-scroll-wrap', 'dg-scroll-floating', wrapClassName]
        .filter(Boolean)
        .join(' ')}
      style={wrapStyle}
    >
      <div
        ref={setScrollRef}
        className={scrollContainerClassName}
        style={scrollContainerStyle}
        {...(scrollContainerProps ?? {})}
      >
        {children}
      </div>
      {/* 纵向悬浮滚动条 hit 容器：绝对定位数据区右侧（top=表头高，bottom=summary 高，right=0，width=8px）。
          hit 容器宽度 = 8px（= thumb 展开后宽度，整个 8px 都是抓取/hover 区；pointer-events:auto 使该
          8px 可抓可 hover，区外点击穿透）。onPointerDown 绑在 hit 容器，整个 8px 区可靠抓取。
          thumb 贴右边缘（CSS right:0; left:auto），transform 仅 translateY（无 translateX），
            hover 变粗时向左生长（右边缘不动，原位贴边）。默认 width 2px，hit 容器 :hover 时 8px（CSS）。 */}
      <div
        ref={vHitRef}
        className="dg-floating-scrollbar dg-floating-scrollbar-v"
        style={{
          top: `${trackInset.top}px`,
          bottom: `${trackInset.bottom}px`,
        }}
        onPointerDown={onVHitPointerDown}
      >
        <div
          ref={vThumbRef}
          className="dg-floating-scrollbar-thumb"
          style={vThumbStyle}
        />
      </div>
      {/* 横向悬浮滚动条：绝对定位数据区底部（summary 上方）。
          hit 容器高度 = 8px（= thumb 展开后高度，整个 8px 都是抓取/hover 区；pointer-events:auto 使该
          8px 可抓可 hover，区外点击穿透）。onPointerDown 绑在 hit 容器，整个 8px 区可靠抓取。
          thumb 贴底边缘（CSS bottom:0; top:auto），transform 仅 translateX（无 translateY），
            hover 变粗时向上生长（底边缘不动，原位贴边）。默认 height 2px，hit 容器 :hover 时 8px（CSS）。 */}
      {horizontal ? (
        <div
          ref={hHitRef}
          className="dg-floating-scrollbar dg-floating-scrollbar-h"
          style={{
            left: `${hTrackInset.left}px`,
            right: `${hTrackInset.right}px`,
            bottom: `${hTrackInset.bottom}px`,
          }}
          onPointerDown={onHHitPointerDown}
        >
          <div
            ref={hThumbRef}
            className="dg-floating-scrollbar-thumb-h"
            style={hThumbStyle}
          />
        </div>
      ) : null}
    </div>
  )
}
