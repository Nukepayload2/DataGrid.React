/**
 * 滚动容器路由组件（从 GridTable 抽出，行为字节级保持）。
 *
 * 三路 return 渲染分支：
 * 1. **sticky 模式**（`stickyEnabled`）：grid 包一层 `overflow: clip` 视口（裁剪宽表但不创建
 *    滚动容器），表头 sticky 相对外层页面/内容滚动容器固定；横向位移由虚拟 `stickyScrollLeft`
 *    + transform 驱动；底部 `StickyScrollBar`（position: sticky; bottom: offsetScroll）作为
 *    固定横向滚动条；summary 存在时提取为独立兄弟 grid（顺序 grid → StickyScrollBar → summary-grid，
 *    使横向滚动条落在 summary 上方）。详见 docs/design-notes/sticky.md。
 * 2. **兜底分支**（`stickyEnabled` 但理论上不会到——sticky 已在分支 1 return；保留防御）：
 *    直接渲染 grid 内容，不走 FloatingScrollBar。
 * 3. **FloatingScrollBar 分支**（非 sticky）：横向滚动统一悬浮条（`horizontal=true` 始终），
 *    原生横滚动条由 `.dg-scroll-floating` 修饰类隐藏；纵向按 `scrollYEnabled` 开关。
 *    详见 docs/design-notes/scrollbar.md。
 *
 * 抽取边界：本组件只负责渲染路由（三路 return + style/class 拼装）。
 * `stickyScrollLeft` state 与 `onStickyViewportWheel` callback 留在 GridTable（task43 处理），
 * 作 props 传入。
 */
import {
  type CSSProperties,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { FloatingScrollBar } from './FloatingScrollBar'
import { StickyScrollBar } from './StickyScrollBar'
import {
  SummaryLayer,
  type SummaryParsedRows,
} from './SummaryLayer'
import type { LeafStickyInfo } from './useStickyColumns'

export interface ScrollContainerProps {
  /** grid 内容（GridTable 的 renderGrid() 输出）。 */
  children: ReactNode
  /** sticky 模式启用（页面级粘性表头）。 */
  stickyEnabled: boolean
  /** sticky 视口 ref（StickyScrollBar 同步 + onWheel 监听）。 */
  stickyViewportRef: React.RefObject<HTMLDivElement | null>
  /** sticky 视口 wheel 处理（更新虚拟 stickyScrollLeft）。 */
  onStickyViewportWheel: (event: React.WheelEvent<HTMLDivElement>) => void
  /** sticky 视口触摸拖动开始。 */
  onStickyViewportPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  /** sticky 视口触摸拖动移动。 */
  onStickyViewportPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void
  /** sticky 视口触摸拖动结束/取消。 */
  onStickyViewportPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void
  /** sticky 当前虚拟横向 scrollLeft（驱动 StickyScrollBar thumb + grid transform）。 */
  stickyScrollLeft: number
  /** sticky scrollLeft setter（StickyScrollBar 拖动/同步回写）。 */
  setStickyScrollLeft: (next: number) => void
  /** sticky 触摸释放后的 compositor transition 惯性状态。 */
  stickyScrollInertiaActive: boolean
  /** StickyScrollBar bottom 偏移（避开页面底部内容）。 */
  stickyOffsetScroll: number
  /** StickyScrollBar 解析容器的 getter（window / HTMLElement）。 */
  stickyGetContainer?: () => HTMLElement | Window | undefined
  /** 主 grid ref（StickyScrollBar 读 scrollWidth/clientWidth 算 thumb）。 */
  gridRef: React.RefObject<HTMLDivElement | null>
  /** sticky 模式且 summary 存在时，summary 提取为独立兄弟 grid。 */
  extractSummary: boolean
  /** 解析后的 summary（rows + fixed + count）。 */
  summaryParsed: SummaryParsedRows | null
  /** 固定列横向 sticky 信息（与表体同源，透传给提取出的 summary grid）。 */
  leafSticky: Array<LeafStickyInfo | undefined>
  /** grid 根 className（透传给提取出的 summary grid 保持列对齐）。 */
  gridClassName: string
  /** grid-template-columns（透传给提取出的 summary grid 保持列对齐）。 */
  gridTemplateColumns: string | undefined
  /** scroll.x 解析的 min-width（透传给提取出的 summary grid 横向同宽）。 */
  scrollMinWidth: number | string | undefined
  /** sticky transform style（translateX 驱动 grid + summary 同步位移）。 */
  stickyTranslateStyle: CSSProperties | null
  /** 数据区域模式（scroll.y）— 决定 wrap/container 是否 flex 填满。 */
  scrollYEnabled: boolean
  /** scroll.x 启用（用于决定附加 `dg-x-scroll` 修饰类）。 */
  scrollXEnabled: boolean
  /** 虚拟滚动启用 — 决定 `dg-virtual-scroll` 修饰类 + scrollContainerRef 传入。 */
  virtualEnabled: boolean
  /** 非虚拟的容器内固定表头模式 — 决定 `dg-fixed-header-scroll` 修饰类。 */
  scrollYNonVirtual: boolean
  /** 虚拟滚动 ref（FloatingScrollBar 传入作为 scrollContainerRef）。 */
  virtualScrollRef: React.RefObject<HTMLDivElement | null>
  /** semantic.section className（注入到 .dg-scroll-wrap 外层）。 */
  sectionClassName?: string
  /** semantic.section style（注入到 .dg-scroll-wrap 外层）。 */
  sectionStyle?: CSSProperties
}

/**
 * 合并 semantic.section.style 到基础 style（保持 GridTable 原 mergeSectionStyle 行为）。
 */
function mergeSectionStyle(
  base: CSSProperties | undefined,
  sectionStyle: CSSProperties | undefined,
): CSSProperties | undefined {
  if (!sectionStyle) return base
  return { ...(base ?? null), ...sectionStyle }
}

/**
 * 合并 semantic.section.className 到基础 class（保持 GridTable 原 mergeSectionClass 行为）。
 */
function mergeSectionClass(
  base: Array<string | undefined>,
  sectionClassName: string | undefined,
): string | undefined {
  return [...base, sectionClassName].filter(Boolean).join(' ') || undefined
}

export function ScrollContainer(props: ScrollContainerProps): ReactNode {
  const {
    children,
    stickyEnabled,
    stickyViewportRef,
    onStickyViewportWheel,
    onStickyViewportPointerDown,
    onStickyViewportPointerMove,
    onStickyViewportPointerUp,
    stickyScrollLeft,
    setStickyScrollLeft,
    stickyScrollInertiaActive,
    stickyOffsetScroll,
    stickyGetContainer,
    gridRef,
    extractSummary,
    summaryParsed,
    leafSticky,
    gridClassName,
    gridTemplateColumns,
    scrollMinWidth,
    stickyTranslateStyle,
    scrollYEnabled,
    scrollXEnabled,
    virtualEnabled,
    scrollYNonVirtual,
    virtualScrollRef,
    sectionClassName,
    sectionStyle,
  } = props

  // === 页面级粘性表头（区别于容器内固定）— 详见 docs/design-notes/sticky.md ===
  // sticky 启用时：grid 只包一层 `overflow: clip` 视口，裁剪宽表但不创建滚动容器；
  // 横向位移由虚拟 scrollLeft + transform 驱动。表头 grid item 用 stickyHeaderOffset 驱动
  // （position: sticky; top: offsetHeader，相对 viewport 固定，已在上游 HeaderCell/ColumnCells 应用）。
  // grid 之后渲染 StickyScrollBar（position: sticky; bottom: offsetScroll）作为底部固定横向滚动条。
  //
  // 关键：`overflow: clip` 不提供滚动机制，表头 sticky 仍相对外层页面/内容滚动容器固定
  //   （页面纵向滚动时表头钉在视口顶部 offsetHeader 处）。这是 sticky 与容器内固定表头
  //   的本质区别（容器内固定表头相对 .dg-fixed-header-scroll 容器固定，容器内滚动）。
  //
  // 横向滚动：StickyScrollBar 与横向 wheel 更新同一份虚拟 scrollLeft，避免宽表撑宽外层文档流。
  //
  // 与固定列组合：固定列 grid item 的 position: sticky; left/right 与表头的 position: sticky; top
  //   在同一元素上叠加（corner cell 双 sticky，浏览器原生支持）。
  if (stickyEnabled) {
    // summary 存在时从主 grid 提取为独立兄弟 grid，渲染顺序
    //   grid(数据) → StickyScrollBar → summary-grid，使横向滚动条落在 summary 上方（数据区末尾）。
    //
    // 独立 summary grid 复用主 grid 的 grid-template-columns（列对齐）+ min-width:scrollX（横向滚动
    //   时与主 grid 同宽），grid-template-rows 仅含 summary tracks（每行 'auto'）。summary Cell 的
    //   grid-row 重置为 rowIndex+1（独立 grid 第 1 track）；fixed bottom（position:sticky;bottom:0）
    //   相对页面滚动容器仍生效（与主 grid 内行为一致）。横向 sticky 通过 __leafSticky 透传同样生效。
    return (
      <>
        <div
          ref={stickyViewportRef}
          className="dg-sticky-scroll-viewport"
          onWheel={onStickyViewportWheel}
          onPointerDown={onStickyViewportPointerDown}
          onPointerMove={onStickyViewportPointerMove}
          onPointerUp={onStickyViewportPointerUp}
          onPointerCancel={onStickyViewportPointerUp}
        >
          {children}
        </div>
        <StickyScrollBar
          offsetScroll={stickyOffsetScroll}
          getContainer={stickyGetContainer}
          gridRef={gridRef}
          viewportRef={stickyViewportRef}
          scrollLeft={stickyScrollLeft}
          onScrollLeftChange={setStickyScrollLeft}
          scrollInertiaActive={stickyScrollInertiaActive}
        />
        {/* summary 提取到 StickyScrollBar 之后 → 横向滚动条落在 summary 上方。 */}
        {extractSummary ? (
          <div
            className="dg-sticky-scroll-viewport"
            onWheel={onStickyViewportWheel}
            onPointerDown={onStickyViewportPointerDown}
            onPointerMove={onStickyViewportPointerMove}
            onPointerUp={onStickyViewportPointerUp}
            onPointerCancel={onStickyViewportPointerUp}
          >
            <SummaryLayer
              summary={summaryParsed}
              startLine={1}
              leafSticky={leafSticky}
              extracted
              gridClassName={gridClassName}
              gridTemplateColumns={gridTemplateColumns}
              scrollMinWidth={scrollMinWidth}
              stickyTranslateStyle={stickyTranslateStyle}
            />
          </div>
        ) : null}
      </>
    )
  }

  // === 滚动容器路由 — 详见 docs/design-notes/scrollbar.md ===
  //
  // **横向滚动统一悬浮条**（用户规约：绝不出占布局的原生横滚动条）：
  //   - 非 sticky 模式一律走 FloatingScrollBar（horizontal=true）。
  //   - 滚动容器 `.dg-scroll` 始终 overflow-x:auto 作为"滚动源"，原生横滚动条由
  //     `.dg-scroll-floating` 修饰类（FloatingScrollBar 自动添加）隐藏 width/height:0。
  //   - 横向不溢出时，HorizontalFloatingScrollBar 的 thumb 自动 display:none → 无任何条；
  //     溢出时显示悬浮条（细线 2px + hit 上下各 8px + hover 变粗 8px + 拖动/同步 translateX）。
  //   - 因此原生横滚动条**永不出现**：basic / fixed-columns / scroll.x / scroll.y / virtual 全部覆盖。
  //
  // **纵向滚动**（scroll.y === true，数据区域模式）：
  //   - 高度 CSS 自动适应：`.dg-scroll-wrap`（FloatingScrollBar 包装）`flex:1; min-height:0`，
  //     `.dg-scroll`（滚动容器）`flex:1; min-height:0; overflow-y:auto`。
  //     外层 `.dg-wrapper.dg-data-area`（Table.tsx 注入）`display:flex; flex-direction:column; height:100%`，
  //     让 wrap 填满父容器剩余空间——**不用 JS 算数字**。
  //   - 表头 sticky top（HeaderCell 的 headerStickyTop 标志驱动）钉顶，表体限高滚动。
  //   - 纵向悬浮滚动条（FloatingScrollBar 组件 vertical）。
  //
  // **sticky 例外**：stickyEnabled 已在上方返回 sticky clip 视口 + StickyScrollBar，
  //   不走 FloatingScrollBar。
  //
  // 虚拟滚动：scrollContainerRef 必须传入（virtualScrollRef）。

  // sticky 模式已在上方返回；这里保留兜底，不走 FloatingScrollBar。
  // 注意：stickyEnabled 已在上方 if 提前 return，本兜底分支理论上不会到达（保留防御）。
  if (stickyEnabled) {
    return children
  }

  // 非 sticky 模式：横向滚动统一 FloatingScrollBar（horizontal 始终 true；纵向按 scrollYEnabled）。
  // wrapStyle：数据区域模式下 wrap 填满（flex:1; min-height:0）；否则默认布局。
  const wrapBaseStyle: CSSProperties = scrollYEnabled
    ? { flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column' }
    : {}
  // 滚动容器 style：overflowX 始终 auto（作为横向滚动源，原生条由 .dg-scroll-floating 隐藏）；
  // overflowY 按 scrollYEnabled 开关（数据区域模式纵向滚动）。
  const containerStyle: CSSProperties = {
    // 数据区域模式：滚动容器 flex 填满 wrap；横向滚动模式：自适应内容高。
    ...(scrollYEnabled ? { flex: '1', minHeight: '0' } : null),
    overflowY: scrollYEnabled ? 'auto' : 'hidden',
    overflowX: 'auto',
  }
  const containerClasses = [
    'dg-scroll',
    'ant-table-content',
    virtualEnabled ? 'dg-virtual-scroll' : null,
    scrollYNonVirtual ? 'dg-fixed-header-scroll' : null,
    scrollXEnabled && !scrollYEnabled ? 'dg-x-scroll' : null,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <FloatingScrollBar
      wrapClassName={mergeSectionClass(['dg-scroll-wrap', 'ant-table-container'], sectionClassName)}
      wrapStyle={mergeSectionStyle(wrapBaseStyle, sectionStyle)}
      scrollContainerClassName={containerClasses}
      scrollContainerStyle={containerStyle}
      scrollContainerRef={virtualEnabled ? virtualScrollRef : undefined}
      measurementKey={gridTemplateColumns}
      // 非 sticky 模式横向悬浮滚动条始终启用；不溢出时 thumb 自动隐藏（无视觉副作用）。
      horizontal={true}
    >
      {children}
    </FloatingScrollBar>
  )
}
