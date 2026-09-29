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
 * 6. 性能（Stage 5 优化）：
 *    - thumb 几何（height/display/track inset）+ 缓存的几何参数（scrollHeight/clientHeight/
 *      thumbHeight/thumbMaxOffset/headerH/summaryH）**只**在 `recomputeVertical`/`recomputeHorizontal`
 *      里读 + 写（recompute 由 RO 触发，频率远低于 scroll）。
 *    - `onScroll` 不直接读布局属性（`scrollHeight/clientHeight/scrollWidth/clientWidth` 会强制 reflow）：
 *      改为 `requestAnimationFrame` 节流，每帧最多一次 `doSync`，doSync 内**只读** `container.scrollTop/
 *      scrollLeft`（不 reflow）+ 用 `geometryRef` 缓存 + 现有 `trackInsetRef` 算 ratio → 写 thumb transform。
 *    - 不再使用 `setState`（`setTrackInset`/`setVThumbStyle` 等）—— 避免组件自身在 scroll 期重渲；
 *      所有 thumb 几何直接写 DOM。
 *
 * 仅 scroll.y/scroll.x 启用时渲染（GridTable 显式调用本组件）；无 scroll 路径完全不渲染本组件。
 * 详见 [docs/features/scrolling/scrollbar.md](../../../docs/features/scrolling/scrollbar.md)。
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type MutableRefObject,
  type ReactNode,
} from 'react'
import {
  EMPTY_FLOATING_SCROLLBAR_GEOMETRY,
  TRACK_REPEAT_DELAY_MS,
  TRACK_REPEAT_INTERVAL_MS,
  computeFloatingDragScrollOffset,
  computeFloatingScrollbarGeometry,
  computeFloatingThumbOffset,
  computeTrackJump,
  type FloatingScrollbarGeometry,
} from './floatingScrollBarUtils'

const FLOATING_SCROLLBAR_TOUCH_ACTIVE_CLASS = 'dg-floating-scrollbar-touch-active'

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
  /** 外部布局测量信号；变化时强制重算 thumb 几何。 */
  measurementKey?: unknown
}

/**
 * 纵向 thumb 几何缓存（由 recomputeVertical 写入；onScroll 读）。
 * 拆分 maxScroll 是为了 onScroll 不重复算减法。
 */
type VerticalGeometry = FloatingScrollbarGeometry

/** 横向 thumb 几何缓存（由 recomputeHorizontal 写入；onScroll 读）。 */
type HorizontalGeometry = FloatingScrollbarGeometry

/** 空几何（display:none / 不溢出 时）：所有比值为 0、maxScroll=0 → doSync 早返回。 */
const EMPTY_VERTICAL_GEOMETRY: VerticalGeometry = EMPTY_FLOATING_SCROLLBAR_GEOMETRY
const EMPTY_HORIZONTAL_GEOMETRY: HorizontalGeometry = EMPTY_FLOATING_SCROLLBAR_GEOMETRY

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
  measurementKey,
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

  // === 纵向悬浮条 ===
  // 全部走 ref + DOM 直写（不触发 React 重渲）。
  const vThumbRef = useRef<HTMLDivElement | null>(null)
  const vHitRef = useRef<HTMLDivElement | null>(null)
  // track inset（top=表头高，bottom=summary 高）。recompute 里写 DOM + 同步 ref；
  // onScroll / pointerdown 通过 ref 读，避免闭包陈旧。
  // 初值用 NaN 哨兵：recomputeVertical 的「skip if unchanged」守卫对 NaN 永远判不等
  // （NaN !== 任何值 含自身），保证首帧 inline top/bottom 一定被写入 DOM —— 即使
  // headerH=0 && summaryH=0（无表头/无 summary 场景）。否则首帧被跳过 → hit 容器退回
  // CSS 默认定位（.dg-floating-scrollbar-v 无 top/bottom 兜底）→ 滚动条跑到容器顶部。
  const trackInsetRef = useRef<{ top: number; bottom: number }>({
    top: Number.NaN,
    bottom: Number.NaN,
  })
  // thumb 几何缓存。recompute 里写；onScroll 里读（不再读 container.scrollHeight/clientHeight）。
  const vGeometryRef = useRef<VerticalGeometry>(EMPTY_VERTICAL_GEOMETRY)
  // thumb 当前可见性（display:none|block）。recompute 写 DOM 后同步此 ref，onScroll 用它判 hidden→visible 兜底。
  const vVisibleRef = useRef<boolean>(false)
  const vDragStateRef = useRef<{
    pointerId: number
    startY: number
    startScrollTop: number
  } | null>(null)

  // === 纵向轨道 repeat（Windows repeat button）===
  // pointerdown 命中轨道空白时启动：500ms 初始延迟后每 50ms 跳一页，直到松开 / 到边界 / pointer 进入 thumb。
  // timeoutRef = 初始延迟；intervalRef = 后续周期；stopRef = 当前会话的 stop 函数（供任意停止条件调用）。
  const vRepeatTimeoutRef = useRef<number | null>(null)
  const vRepeatIntervalRef = useRef<number | null>(null)
  const vRepeatStopRef = useRef<(() => void) | null>(null)
  const vTouchMoveStopRef = useRef<(() => void) | null>(null)

  // === 横向悬浮条 ===
  const hThumbRef = useRef<HTMLDivElement | null>(null)
  const hHitRef = useRef<HTMLDivElement | null>(null)
  // 初值用 NaN 哨兵（同 trackInsetRef）：保证 recomputeHorizontal 首帧一定写入 inline
  // left/right/bottom —— 否则 summaryH=0 时守卫 `0!==0 || 0!==0 || 0!==0` 为 false 跳过
  // 写入，hit 容器退回 CSS 默认（.dg-floating-scrollbar-h 无 bottom 兜底）→ 横向滚动条
  // 跑到容器顶部（用户报的回归：跑到第一行上方）。
  const hTrackInsetRef = useRef<{ left: number; right: number; bottom: number }>({
    left: Number.NaN,
    right: Number.NaN,
    bottom: Number.NaN,
  })
  const hGeometryRef = useRef<HorizontalGeometry>(EMPTY_HORIZONTAL_GEOMETRY)
  const hVisibleRef = useRef<boolean>(false)
  const hDragStateRef = useRef<{
    pointerId: number
    startX: number
    startScrollLeft: number
  } | null>(null)

  // === 横向轨道 repeat（Windows repeat button）===
  // 同纵向：500ms 初始延迟 + 50ms 周期，三种停止条件。
  const hRepeatTimeoutRef = useRef<number | null>(null)
  const hRepeatIntervalRef = useRef<number | null>(null)
  const hRepeatStopRef = useRef<(() => void) | null>(null)
  const hTouchMoveStopRef = useRef<(() => void) | null>(null)

  // === onScroll RAF 节流句柄 ===
  // -1 表示未调度；多次 scroll 事件合并到每帧一次 doSync。
  const scrollRafRef = useRef<number>(-1)

  // === 表头高度缓存（Stage 5 残余优化）===
  // 表头高度在滚动期间稳定（不随虚拟 padding / 滚动位置变化），无需每 RO 重测。
  // - headerHeightRef：缓存 measureHeaderHeight 的结果；null=尚未测过。
  // - headerCellCountRef：上次测量时的表头格数量；用于兜底检测"列增删导致表头格变化"场景
  //   （表头 RO 只 observe 到挂载时的格，新增格不会被 observe，但 grid RO 会触发 recompute →
  //   recomputeVertical 读 countRef 发现变化 → 重测一次刷新缓存 + countRef）。
  const headerHeightRef = useRef<number | null>(null)
  const headerCellCountRef = useRef<number>(0)

  useEffect(() => {
    return () => {
      vHitRef.current?.classList.remove('dg-floating-scrollbar-dragging')
      hHitRef.current?.classList.remove('dg-floating-scrollbar-dragging')
      vHitRef.current?.classList.remove(FLOATING_SCROLLBAR_TOUCH_ACTIVE_CLASS)
      hHitRef.current?.classList.remove(FLOATING_SCROLLBAR_TOUCH_ACTIVE_CLASS)
      document.body.classList.remove('dg-scrollbar-pointer-capturing')
      // 卸载时取消未完成的 RAF，防止卸载后写 null DOM。
      if (scrollRafRef.current !== -1) {
        cancelAnimationFrame(scrollRafRef.current)
        scrollRafRef.current = -1
      }
      // 卸载时也清轨道 repeat 定时器（防止卸载后仍触发跳页）。
      vRepeatStopRef.current?.()
      hRepeatStopRef.current?.()
      vTouchMoveStopRef.current?.()
      hTouchMoveStopRef.current?.()
      vTouchMoveStopRef.current = null
      hTouchMoveStopRef.current = null
    }
  }, [])

  const startTouchDragSession = (
    hitEl: HTMLDivElement,
    stopRef: MutableRefObject<(() => void) | null>,
  ) => {
    hitEl.classList.add(FLOATING_SCROLLBAR_TOUCH_ACTIVE_CLASS)
    const onNativeTouchMove = (ev: TouchEvent) => {
      ev.preventDefault()
      ev.stopPropagation()
    }
    hitEl.addEventListener('touchmove', onNativeTouchMove, { passive: false })
    const stop = () => {
      hitEl.removeEventListener('touchmove', onNativeTouchMove)
      hitEl.classList.remove(FLOATING_SCROLLBAR_TOUCH_ACTIVE_CLASS)
      if (stopRef.current === stop) {
        stopRef.current = null
      }
    }
    stopRef.current = stop
    return stop
  }

  // 核心：重算纵向 thumb 几何 + track inset。
  // 直接写 DOM（thumb.style.height/display + hit.style.top/bottom + thumb.style.transform），
  // 同步刷新 geometryRef / trackInsetRef / vVisibleRef，供 onScroll（不读布局）使用。
  const recomputeVertical = useCallback(() => {
    const container = innerScrollRef.current
    const thumb = vThumbRef.current
    const hit = vHitRef.current
    if (!container || !thumb || !hit) return

    const grid = container.querySelector<HTMLElement>('.dg-grid')
    // 表头高度走缓存（headerHeightRef）—— 仅在 (a) 首帧竞态未初始化 或 (b) 表头格数量变化（列增删）
    // 时才重测一次。表头尺寸变化（换行/分组展开/locale/主题）由独立的表头 RO 负责重测并刷缓存 +
    // 触发 recompute（见下方表头 RO effect）。这样滚动期 container/grid RO 触发的 recompute 不再
    // 遍历表头格 getBoundingClientRect（消除 182-202ms ForcedReflow）。
    const headerCells = grid?.querySelectorAll<HTMLElement>(
      '.dg-cell-header, .dg-cell-header-vsticky',
    )
    const headerCellCount = headerCells?.length ?? 0
    if (
      headerHeightRef.current === null ||
      headerCellCount !== headerCellCountRef.current
    ) {
      headerHeightRef.current = measureHeaderHeight(grid, container)
      headerCellCountRef.current = headerCellCount
    }
    const headerH = headerHeightRef.current
    const summaryH = measureSummaryHeight(grid, container)
    if (trackInsetRef.current.top !== headerH || trackInsetRef.current.bottom !== summaryH) {
      trackInsetRef.current = { top: headerH, bottom: summaryH }
      hit.style.top = `${headerH}px`
      hit.style.bottom = `${summaryH}px`
    }

    const clientHeight = container.clientHeight
    const scrollHeight = container.scrollHeight
    const trackHeight = Math.max(0, clientHeight - headerH - summaryH)
    const geometry = computeFloatingScrollbarGeometry({
      clientSize: clientHeight,
      scrollSize: scrollHeight,
      trackSize: trackHeight,
    })
    // 内容不溢出 → 隐藏纵向悬浮条。
    if (!geometry.visible) {
      if (vVisibleRef.current) {
        vVisibleRef.current = false
        thumb.style.display = 'none'
      }
      vGeometryRef.current = EMPTY_VERTICAL_GEOMETRY
      return
    }
    const scrollTop = container.scrollTop
    const thumbOffset = computeFloatingThumbOffset(scrollTop, geometry)

    // thumb 几何 + 可见性：DOM 直写（与原 setVThumbStyle 等价，但不触发 React 重渲）。
    if (thumb.style.height !== `${geometry.thumbSize}px`) {
      thumb.style.height = `${geometry.thumbSize}px`
    }
    if (!vVisibleRef.current) {
      vVisibleRef.current = true
      thumb.style.display = 'block'
    }

    // 几何缓存（供 onScroll 的 doSync 读 —— doSync 不再读 container.scrollHeight/clientHeight）。
    vGeometryRef.current = geometry

    // 位置（transform）也由 recompute 写一次（与 onScroll 单一写源，刚加载/RO 触发时立即对齐）。
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
    if (
      hTrackInsetRef.current.bottom !== summaryH ||
      hTrackInsetRef.current.left !== 0 ||
      hTrackInsetRef.current.right !== 0
    ) {
      hTrackInsetRef.current = { left: 0, right: 0, bottom: summaryH }
      hit.style.left = '0px'
      hit.style.right = '0px'
      hit.style.bottom = `${summaryH}px`
    }

    const clientWidth = container.clientWidth
    const scrollWidth = container.scrollWidth
    const geometry = computeFloatingScrollbarGeometry({
      clientSize: clientWidth,
      scrollSize: scrollWidth,
      trackSize: clientWidth,
    })
    // 内容不横向溢出 → 隐藏横向悬浮条。
    if (!geometry.visible) {
      if (hVisibleRef.current) {
        hVisibleRef.current = false
        thumb.style.display = 'none'
      }
      hGeometryRef.current = EMPTY_HORIZONTAL_GEOMETRY
      return
    }
    const scrollLeft = container.scrollLeft
    const thumbOffset = computeFloatingThumbOffset(scrollLeft, geometry)

    if (thumb.style.width !== `${geometry.thumbSize}px`) {
      thumb.style.width = `${geometry.thumbSize}px`
    }
    if (!hVisibleRef.current) {
      hVisibleRef.current = true
      thumb.style.display = 'block'
    }

    hGeometryRef.current = geometry

    thumb.style.transform = `translateX(${thumbOffset}px)`
  }, [])

  const recompute = useCallback(() => {
    recomputeVertical()
    if (horizontal) recomputeHorizontal()
  }, [recomputeVertical, recomputeHorizontal, horizontal])

  // === Stage 6 #5: 把 recompute 的"最新引用"放进 ref，让 onScroll effect 不必把
  // recomputeVertical/recomputeHorizontal 列入 deps（避免 react-doctor
  // prefer-use-effect-event 警告：effect 因 callback 引用变化而 re-subscribe）。
  // 这里 recomputeVertical/recomputeHorizontal 本身是 useCallback([]) 稳定引用，
  // 但通过 ref 读 latest 可让 effect deps 收敛到只剩 `horizontal`，行为等价。
  // 注意：不动 onScroll RAF 节流 + geometryRef 缓存（Stage 5 #1 成果）—— doSync
  // 内仍只读 container.scrollTop/scrollLeft + geometryRef，仅在"内容从无溢出变溢出"
  // 兜底分支调一次 recompute（通过 ref 取最新）。
  const recomputeVerticalRef = useRef(recomputeVertical)
  const recomputeHorizontalRef = useRef(recomputeHorizontal)
  recomputeVerticalRef.current = recomputeVertical
  recomputeHorizontalRef.current = recomputeHorizontal

  // 监听容器 scroll（滚轮/键盘/程序滚动）→ 同步纵/横 thumb。
  // 关键性能点：onScroll 内**不**直接读 scrollHeight/clientHeight/scrollWidth/clientWidth
  // （会强制 reflow）；改为 RAF 节流 + 几何缓存（recompute 时算一次写入 geometryRef）。
  // doSync 每帧只读 container.scrollTop/scrollLeft（不 reflow）+ geometryRef → 写 transform。
  useEffect(() => {
    const container = innerScrollRef.current
    if (!container) return

    const doSync = () => {
      scrollRafRef.current = -1
      // === 纵向 ===
      const vThumb = vThumbRef.current
      if (vThumb) {
        if (vVisibleRef.current) {
          // 已可见：用缓存几何算 ratio，仅读 scrollTop（不 reflow）。
          const g = vGeometryRef.current
          if (g.maxScroll > 0 && g.thumbMaxOffset > 0) {
            vThumb.style.transform = `translateY(${computeFloatingThumbOffset(container.scrollTop, g)}px)`
          }
        } else {
          // 兜底：内容从无溢出变溢出（display 由 recompute 刚从 none→block）。
          // recompute 已把 vVisibleRef 设为 true 并刷好几何，但本帧 onScroll 可能在 recompute
          // 完成前先触发 —— 这里调用 recomputeVertical 重算一次确保可见性 + 几何正确。
          recomputeVerticalRef.current()
        }
      }
      // === 横向 ===
      if (horizontal) {
        const hThumb = hThumbRef.current
        if (hThumb) {
          if (hVisibleRef.current) {
            const g = hGeometryRef.current
            if (g.maxScroll > 0 && g.thumbMaxOffset > 0) {
              hThumb.style.transform = `translateX(${computeFloatingThumbOffset(container.scrollLeft, g)}px)`
            }
          } else {
            recomputeHorizontalRef.current()
          }
        }
      }
    }

    const onScroll = () => {
      // RAF 节流：多个 scroll 事件合并到每帧一次 doSync。
      if (scrollRafRef.current === -1) {
        scrollRafRef.current = requestAnimationFrame(doSync)
      }
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', onScroll)
      if (scrollRafRef.current !== -1) {
        cancelAnimationFrame(scrollRafRef.current)
        scrollRafRef.current = -1
      }
    }
  }, [horizontal])

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

  // 首次挂载 useLayoutEffect：确保 thumb 几何在首屏绘制前到位（避免首帧 0 高度 thumb 闪烁）。
  // recompute 自身会读 DOM（clientHeight/scrollHeight）+ 写 DOM，必须在 layout 阶段同步跑一次。
  // measurementKey 覆盖 CSS Grid track 改变但 border-box 不变的场景（scrollWidth 变了，RO 不一定触发）。
  useLayoutEffect(() => {
    recompute()
  }, [recompute, measurementKey])

  // 表头高度独立 RO（Stage 5 残余优化）：仅观察表头格，捕获表头尺寸变化（列宽拖拽致换行、
  // 分组列展开/收起、locale/主题切换、数据驱动标题变化、sticky 表头场景）。表头变化 → 重测一次
  // measureHeaderHeight 刷缓存 + 触发一次 recompute（让 track inset 与新表头高对齐）。
  //
  // 这是浏览器权威的"表头尺寸变了"信号，不依赖人工枚举 deps（比 depsRef 方案稳：漏了场景→track 错位）。
  //
  // 限制：本 RO 只 observe 到挂载时刻存在的表头格；列增删（dg 显隐列）会引入未被 observe 的新格，
  //       但 grid RO 会因 grid bbox 变化触发 recompute → recomputeVertical 的 count 兜底重测 → 缓存自愈。
  useEffect(() => {
    const container = innerScrollRef.current
    if (!container) return
    const grid = container.querySelector<HTMLElement>('.dg-grid')
    if (!grid) return
    const headers = grid.querySelectorAll<HTMLElement>(
      '.dg-cell-header, .dg-cell-header-vsticky',
    )
    if (headers.length === 0) {
      // 无表头格（showHeader=false）：缓存 0 + count 0，避免 recompute 走 measure 路径。
      headerHeightRef.current = 0
      headerCellCountRef.current = 0
      return
    }
    const remeasureAndRecompute = () => {
      // 重测表头高度并刷缓存；若真变化才触发一次 recompute（避免无谓重算）。
      const prev = headerHeightRef.current
      const next = measureHeaderHeight(grid, container)
      headerHeightRef.current = next
      headerCellCountRef.current =
        grid.querySelectorAll<HTMLElement>(
          '.dg-cell-header, .dg-cell-header-vsticky',
        ).length
      if (next !== prev) recompute()
    }
    const ro = new ResizeObserver(remeasureAndRecompute)
    headers.forEach((h) => ro.observe(h, { box: 'border-box' }))
    // 挂载时立即测一次（覆盖"cells 在 recompute 首跑之后才到 DOM"的竞态：recompute 走 null 分支
    // 测的是当时（可能为 0/旧值），此处同步刷成最新真值；recompute 后续读缓存即对齐）。
    remeasureAndRecompute()
    return () => ro.disconnect()
  }, [recompute])

  // 纵向拖动 / 轨道按页跳 / Windows repeat button（pointerdown 绑在 hit 容器，整个 8px hit 区可靠抓取，
  // 不依赖 thumb 先 hover 展开）：
  //   - 命中 thumb：pointerdown → capture（hit 容器自身）→ move 换算 → 容器 scrollTop。
  //   - 命中轨道空白（thumb 上方/下方）：立即按页跳一页（±viewportSize），并启动 Windows repeat button
  //     ——500ms 后每 50ms 再跳一页，三种条件停止：pointerup/pointercancel、到边界（nextScroll 无变化）、
  //     pointer 进入 thumb。repeat 期间不进入增量拖动循环。
  // thumb 仅用于几何计算 + transform 同步，其 ref 仍保留（vThumbRef）但不再绑 pointerdown。
  const onVHitPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = innerScrollRef.current
    if (!container) return
    e.preventDefault()
    e.stopPropagation()
    // 用 geometryRef 缓存（不读 container.scrollHeight/clientHeight，避免拖动起点 reflow）。
    const g = vGeometryRef.current
    if (g.maxScroll <= 0) return

    // === 轨道点击按页跳转命中检测 ===
    // 读 thumb 屏幕坐标（垂直=clientY vs thumb 的 top/bottom）；viewportSize = 可见数据区高度
    // （clientSize − headerH − summaryH），与"一页"语义一致。getBoundingClientRect 在 pointerdown
    // 触发一次（非高频路径，reflow 可接受）。
    const thumbEl = vThumbRef.current
    if (thumbEl) {
      const thumbRect = thumbEl.getBoundingClientRect()
      const inset = trackInsetRef.current
      const headerH = Number.isFinite(inset.top) ? inset.top : 0
      const summaryH = Number.isFinite(inset.bottom) ? inset.bottom : 0
      const viewportSize = Math.max(0, g.clientSize - headerH - summaryH)
      const jump = computeTrackJump({
        currentScroll: container.scrollTop,
        viewportSize,
        clientPos: e.clientY,
        thumbStart: thumbRect.top,
        thumbEnd: thumbRect.bottom,
        maxScroll: g.maxScroll,
      })
      if (jump.zone !== 'thumb') {
        // 命中轨道空白：立即跳一页，不进入增量拖动循环。
        const beforeJump = container.scrollTop
        container.scrollTop = jump.nextScroll
        // 启动 Windows repeat button：500ms 后每 50ms 再跳一页。
        // 首跳已到边界（nextScroll === beforeJump，无空间可跳）→ 不启动 repeat。
        if (jump.nextScroll !== beforeJump) {
          const pointerId = e.pointerId
          const clientPos = e.clientY
          // stop：清两个定时器 + 移除三个 window 监听 + 清 stopRef（标记 repeat 会话结束）。
          // onMoveCheck：停止条件 3 —— pointer 进入 thumb 屏幕范围 → 停止 repeat（用户可能想转去拖 thumb）。
          // tick：停止条件 2 —— computeTrackJump 重算后 nextScroll === currentScroll（到边界 / thumb 已
          //   到 pointer）→ 停止；否则赋 nextScroll 继续跳。每次重读 thumb rect 因 thumb 随滚动位移。
          const stop = () => {
            if (vRepeatTimeoutRef.current !== null) {
              clearTimeout(vRepeatTimeoutRef.current)
              vRepeatTimeoutRef.current = null
            }
            if (vRepeatIntervalRef.current !== null) {
              clearInterval(vRepeatIntervalRef.current)
              vRepeatIntervalRef.current = null
            }
            window.removeEventListener('pointerup', stop)
            window.removeEventListener('pointercancel', stop)
            window.removeEventListener('pointermove', onMoveCheck)
            vRepeatStopRef.current = null
          }
          const onMoveCheck = (ev: PointerEvent) => {
            if (ev.pointerId !== pointerId) return
            // 停止条件 3：当前 pointer 屏幕位置（ev.clientY）落在 thumb 范围内 → 停止 repeat。
            // 注意：用 ev.clientY 而非闭包的 clientPos（clientPos 是 pointerdown 点击位置，固定不变；
            // 用户移动鼠标后应用最新位置判定是否进入 thumb）。
            const rect = thumbEl.getBoundingClientRect()
            if (ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
              stop()
            }
          }
          const tick = () => {
            const currentScroll = container.scrollTop
            const rect = thumbEl.getBoundingClientRect()
            const next = computeTrackJump({
              currentScroll,
              viewportSize,
              clientPos,
              thumbStart: rect.top,
              thumbEnd: rect.bottom,
              maxScroll: g.maxScroll,
            })
            if (next.nextScroll === currentScroll) {
              stop()
              return
            }
            container.scrollTop = next.nextScroll
          }
          vRepeatStopRef.current = stop
          // 停止条件 1：pointerup / pointercancel（不管 pointer 位置，对齐 Windows）。
          window.addEventListener('pointerup', stop)
          window.addEventListener('pointercancel', stop)
          // 停止条件 3：pointer 进入 thumb → 停止 repeat。
          window.addEventListener('pointermove', onMoveCheck)
          // 初始延迟 500ms；触发后立即跑首次 repeat tick（Windows 习惯：延迟结束即触发首次额外跳），
          // 若 tick 未触发 stop（未到边界 / 未进 thumb）则启动 setInterval 每 50ms 一跳。
          vRepeatTimeoutRef.current = window.setTimeout(() => {
            vRepeatTimeoutRef.current = null
            tick()
            if (vRepeatStopRef.current === stop) {
              vRepeatIntervalRef.current = window.setInterval(
                tick,
                TRACK_REPEAT_INTERVAL_MS,
              )
            }
          }, TRACK_REPEAT_DELAY_MS)
        }
        return
      }
    }

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
    const stopTouchDrag = e.pointerType === 'touch'
      ? startTouchDragSession(hitEl, vTouchMoveStopRef)
      : null
    const onMove = (ev: PointerEvent) => {
      const ds = vDragStateRef.current
      if (!ds || ds.pointerId !== ev.pointerId) return
      ev.preventDefault()
      ev.stopPropagation()
      const dy = ev.clientY - ds.startY
      container.scrollTop = computeFloatingDragScrollOffset(ds.startScrollTop, dy, g)
    }
    const onUp = (ev: PointerEvent) => {
      const ds = vDragStateRef.current
      if (!ds || ds.pointerId !== ev.pointerId) return
      vDragStateRef.current = null
      hitEl.classList.remove('dg-floating-scrollbar-dragging')
      document.body.classList.remove('dg-scrollbar-pointer-capturing')
      hitEl.releasePointerCapture(ds.pointerId)
      stopTouchDrag?.()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  // 横向拖动 / 轨道按页跳 / Windows repeat button（pointerdown 绑在 hit 容器，整个 8px hit 区可靠抓取）：
  //   - 命中 thumb：pointerdown → capture（hit 容器自身）→ move 换算 → 容器 scrollLeft。
  //   - 命中轨道空白（thumb 左/右）：立即按页跳一页（±viewportSize），并启动 Windows repeat button
  //     ——500ms 后每 50ms 再跳一页，三种条件停止：pointerup/pointercancel、到边界、pointer 进入 thumb。
  // thumb ref 保留但不绑 pointerdown。
  const onHHitPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = innerScrollRef.current
    if (!container) return
    e.preventDefault()
    e.stopPropagation()
    const g = hGeometryRef.current
    if (g.maxScroll <= 0) return

    // === 轨道点击按页跳转命中检测 ===
    // 读 thumb 屏幕坐标（水平=clientX vs thumb 的 left/right）；viewportSize = 可见数据区宽度
    // （clientSize − left inset − right inset，横向通常 = clientWidth）。
    const thumbEl = hThumbRef.current
    if (thumbEl) {
      const thumbRect = thumbEl.getBoundingClientRect()
      const inset = hTrackInsetRef.current
      const leftInset = Number.isFinite(inset.left) ? inset.left : 0
      const rightInset = Number.isFinite(inset.right) ? inset.right : 0
      const viewportSize = Math.max(0, g.clientSize - leftInset - rightInset)
      const jump = computeTrackJump({
        currentScroll: container.scrollLeft,
        viewportSize,
        clientPos: e.clientX,
        thumbStart: thumbRect.left,
        thumbEnd: thumbRect.right,
        maxScroll: g.maxScroll,
      })
      if (jump.zone !== 'thumb') {
        const beforeJump = container.scrollLeft
        container.scrollLeft = jump.nextScroll
        // 启动 Windows repeat button（同纵向，方向改为水平）。
        if (jump.nextScroll !== beforeJump) {
          const pointerId = e.pointerId
          const clientPos = e.clientX
          const stop = () => {
            if (hRepeatTimeoutRef.current !== null) {
              clearTimeout(hRepeatTimeoutRef.current)
              hRepeatTimeoutRef.current = null
            }
            if (hRepeatIntervalRef.current !== null) {
              clearInterval(hRepeatIntervalRef.current)
              hRepeatIntervalRef.current = null
            }
            window.removeEventListener('pointerup', stop)
            window.removeEventListener('pointercancel', stop)
            window.removeEventListener('pointermove', onMoveCheck)
            hRepeatStopRef.current = null
          }
          const onMoveCheck = (ev: PointerEvent) => {
            if (ev.pointerId !== pointerId) return
            // 停止条件 3：当前 pointer 屏幕位置（ev.clientX）落在 thumb 范围内 → 停止 repeat。
            // 用 ev.clientX 而非闭包 clientPos（同纵向：用户移动鼠标后用最新位置判定）。
            const rect = thumbEl.getBoundingClientRect()
            if (ev.clientX >= rect.left && ev.clientX <= rect.right) {
              stop()
            }
          }
          const tick = () => {
            const currentScroll = container.scrollLeft
            const rect = thumbEl.getBoundingClientRect()
            const next = computeTrackJump({
              currentScroll,
              viewportSize,
              clientPos,
              thumbStart: rect.left,
              thumbEnd: rect.right,
              maxScroll: g.maxScroll,
            })
            if (next.nextScroll === currentScroll) {
              stop()
              return
            }
            container.scrollLeft = next.nextScroll
          }
          hRepeatStopRef.current = stop
          window.addEventListener('pointerup', stop)
          window.addEventListener('pointercancel', stop)
          window.addEventListener('pointermove', onMoveCheck)
          hRepeatTimeoutRef.current = window.setTimeout(() => {
            hRepeatTimeoutRef.current = null
            tick()
            if (hRepeatStopRef.current === stop) {
              hRepeatIntervalRef.current = window.setInterval(
                tick,
                TRACK_REPEAT_INTERVAL_MS,
              )
            }
          }, TRACK_REPEAT_DELAY_MS)
        }
        return
      }
    }

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
    const stopTouchDrag = e.pointerType === 'touch'
      ? startTouchDragSession(hitEl, hTouchMoveStopRef)
      : null
    const onMove = (ev: PointerEvent) => {
      const ds = hDragStateRef.current
      if (!ds || ds.pointerId !== ev.pointerId) return
      ev.preventDefault()
      ev.stopPropagation()
      const dx = ev.clientX - ds.startX
      container.scrollLeft = computeFloatingDragScrollOffset(ds.startScrollLeft, dx, g)
    }
    const onUp = (ev: PointerEvent) => {
      const ds = hDragStateRef.current
      if (!ds || ds.pointerId !== ev.pointerId) return
      hDragStateRef.current = null
      hitEl.classList.remove('dg-floating-scrollbar-dragging')
      document.body.classList.remove('dg-scrollbar-pointer-capturing')
      hitEl.releasePointerCapture(ds.pointerId)
      stopTouchDrag?.()
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
            hover 变粗时向左生长（右边缘不动，原位贴边）。默认 width 2px，hit 容器 :hover 时 8px（CSS）。
          初始 style.top/bottom 留空（recompute 在 useLayoutEffect 里同步写入 DOM）；display 初始 none
            （recompute 在挂载布局期写为 block，避免首帧空 thumb 闪烁）。 */}
      <div
        ref={vHitRef}
        className="dg-floating-scrollbar dg-floating-scrollbar-v"
        onPointerDown={onVHitPointerDown}
      >
        <div
          ref={vThumbRef}
          className="dg-floating-scrollbar-thumb"
          style={{ display: 'none' }}
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
          onPointerDown={onHHitPointerDown}
        >
          <div
            ref={hThumbRef}
            className="dg-floating-scrollbar-thumb-h"
            style={{ display: 'none' }}
          />
        </div>
      ) : null}
    </div>
  )
}
