/**
 * data-grid CSS Grid 渲染引擎根组件。
 *
 * 渲染思路：用 `display:grid` + `grid-template-rows/columns` + 显式 grid-area 定位
 * 替代 antd 的 `<table>`/`<tr>`/`<td>`，所有单元格是同一个 `.dg-grid` 的 grid item。
 *
 * 两条渲染路径：
 *
 * 1) **快速路径（flat）**：单层表头且无合并 / 虚拟 / 展开 / 树形 / summary / empty。
 *    使用显式 grid 定位，DOM 按表头行、数据行顺序输出。
 *
 * 2) **多级表头路径（multi）**：columnTree 提供且 maxDepth>1，或任一能力要求显式定位
 *    （合并 / 虚拟 / 展开 / 树形 / summary / empty / components.body.row）。
 *    - `grid-template-rows`：表头部分 = `maxDepth` 行（统一 headerHeight），数据行跟在其后。
 *    - 表头格 / 数据格都用**显式** `grid-column` / `grid-row` 定位（不依赖 auto-flow）。
 *    - 关闭 `grid-auto-flow:column`（用默认 row 流，配显式定位最稳）。
 *
 * 关键能力对应主题文件（机制 / 算法 / 易踩坑详见对应 md）：
 * - 列宽 track 策略（auto/fixed/minmax/百分比）→ docs/design-notes/column-width.md
 * - 滚动容器路由 + 横向悬浮条 → docs/design-notes/scrollbar.md
 * - 固定列 sticky + 边缘阴影 + z-index 层叠 → docs/design-notes/fixed-column.md
 * - 多级表头 + 表头分割竖线 → docs/design-notes/header.md
 * - 隐藏列（0fr track + dg-cell-hidden）→ docs/design-notes/hidden-column.md
 * - 行高（有界模型 / rowSpan 豁免）→ docs/design-notes/row-height.md
 * - 虚拟滚动（AATree/offsetTree/动态行高/FillerRow/虚拟窗口）→ docs/design-notes/virtualization.md
 * - 行展开（0fr↔1fr track 过渡）→ docs/design-notes/expand.md
 * - 整体容器结构与修饰类 → docs/design-notes/layout.md
 * - 页面级 sticky（grid 不包 overflow 容器）→ docs/design-notes/sticky.md
 * - 行 hover / 行选中 / 行 className → docs/design-notes/layout.md + selection.md
 *
 * 整行 hover — 详见 docs/design-notes/layout.md：
 * 显式定位下纯 CSS 无法关联整行；
 * 用 JS 方案——根组件持有 hoveredRowIndex state，命中行所有 body cell 加 `dg-row-hover` 类。
 */

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import {
  resolveColumnTree,
} from './columnTree'
import {
  computeCellMergePlan,
  hasCellMergeDeclaration,
  type CellMergePlan,
} from './cellMerge'
import {
  useStickyColumns,
} from './useStickyColumns'
import { useHeaderRowHeights } from './useHeaderRowHeights'
import {
  useVirtualList,
} from './useVirtualList'
import { useColumnResize, type ColumnResizeMode } from './useColumnResize'
import { useScrollMode } from './useScrollMode'
import { useRowHeightSystem, useEffectiveRowHeight } from './useRowHeightSystem'
import { useGridLayout } from './useGridLayout'
import { useGridScrollSync } from './useGridScrollSync'
import { HeaderGrid } from './HeaderGrid'
import { parseSummaryNode } from './Summary'
import { getRowKey } from './recordAccess'
import type {
  EngineColumnNode,
  EngineHeaderCell,
  EngineLeafColumn,
  EngineTableProps,
} from './types'
// onHeaderCell 签名 `(column) => HTMLAttributes` 的 column 类型用 ColumnType 表达（与对外 types.ts 一致），仅 type-only。
// FloatingScrollBar / StickyScrollBar 由 ScrollContainer 内部调用（不再直接 import）。
// clampScrollLeft / getStickyMaxScroll 已下移到 useGridScrollSync.ts（task43），此处不再 import。
import { resolveHeaderContentOffset } from './headerHeightUtils'
import { computeTreeFirstDataColumnIdx } from './treeColumnUtils'
import { computeExpandLayout } from './expandLayoutUtils'
import { renderExpandedContents } from './expandLayerUtils'
import { SummaryLayer } from './SummaryLayer'
import { ScrollContainer } from './ScrollContainer'
import { HeaderCell } from './HeaderCell'
import { renderBodyCells } from './BodyGrid'
import { RecyclingBodyGrid } from './RecyclingBodyGrid'
import { ColumnCells } from './FlatColumnCells'
import { buildResizeSiblingByKey } from './resizeColumnUtils'

function toResizablePixelWidth(value: number | string | undefined): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value !== 'string') return undefined
  const match = value.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)px$/)
  if (!match) return undefined
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * 自定义组件渲染（components.body.cell / components.body.row）— 详见 docs/design-notes/header.md 与 selection.md。
 *
 * data-grid 用 div 渲染单元格（`.dg-cell`，非 antd 的 `<td>`），components 机制做如下适配：
 *
 * 1. **components.body.cell**：dg-cell div 的**内部内容**（即 `.dg-cell-inner` 位置）用 cell 组件渲染。
 *    cell 组件签名对齐 antd v6：`{ children, record, index, dataIndex, ...onCell返回值 }`，
 *    返回 ReactNode（单元格内容，放进 dg-cell div 内——因 data-grid 无 td）。
 *    与 antd 差异：antd 的 EditableCell demo 返回 `<td>`；data-grid 复刻时改为返回内容 ReactNode
 *    （去掉 td 外壳），其余逻辑照搬。
 *
 * 2. **components.body.row**：行级上下文提供者（典型 EditableRow 包 antd Form + Context.Provider）。
 *    关键约束：grid item 必须是 grid 容器的**直接子元素**，故 row 组件**不真正包裹 DOM**——
 *    内部用 React.Fragment（Fragment 不产生 DOM，其 children 被"穿透"为 grid 直接子元素，
 *    满足 grid 显式定位）。body.row 提供时强制走 multi 路径（行优先遍历 + Provider 包裹）。
 *
 * 3. **onCell 返回值透传**：除 colSpan/rowSpan（cellMerge 消费）外，其余字段透传给 cell props
 *    （与 antd v6 additionalProps 一致）。
 *
 * 4. **shouldCellUpdate**：作为 prop 透传给 cell 组件，cell 组件可自行用 React.memo + 该函数做 memo
 *    （引擎简化为透传，cell 组件自行决定是否 memo）。默认渲染路径不消费（零回归）。
 *
 * 5. **回归保证**：components 未提供时所有渲染走默认路径；onCell 仍可能存在（合并用），但无
 *    components 时 onCell 的其余字段被忽略（仅取 colSpan/rowSpan）。
 */

export { getRowKey, getValueByDataIndex } from './recordAccess'

export interface GridTableProps<RecordType = any> extends EngineTableProps<RecordType> {
  /** 额外 className（来自适配层，如 size/bordered）。 */
  className?: string
}

/** 引擎对外暴露的句柄（仅虚拟 scrollTo）。对外请走 Table.tsx 的 TableRef。 */
export interface GridTableHandle {
  scrollTo: (config: {
    index?: number
    scrollTop?: number
    offset?: number
    align?: 'start' | 'center' | 'end' | 'nearest'
    /** 'auto'（默认，瞬时）| 'smooth'（JS RAF easing 平滑动画 + 到达检测）。 */
    behavior?: 'auto' | 'smooth'
  }) => void
}

/**
 * 渲染引擎根组件。
 * 不对外暴露；对外统一走 `src/table/Table.tsx`。
 */
export const GridTable = forwardRef(GridTableInner) as <RecordType = any>(
  props: GridTableProps<RecordType> & { ref?: React.Ref<GridTableHandle> },
) => React.ReactElement

function GridTableInner<RecordType = any>(
  props: GridTableProps<RecordType>,
  ref: React.Ref<GridTableHandle>,
) {
  const {
    columns,
    columnTree,
    dataSource,
    rowKey,
    gridOptions,
    showHeader = true,
    scroll,
    virtual,
    expandState,
    treeState,
    tableLayout,
    onSorterClick,
    onFilterApply,
    className,
    components,
    summary,
    emptyText,
    semantic,
    sticky,
    // 接口兼容字段：onHeaderRow / onRow / rowClassName / getPopupContainer / rowHoverable
    // （grid 无 tr，这些行级 props 由引擎分发到该行所有单元格）。
    onHeaderRow,
    onRow,
    rowClassName,
    getPopupContainer,
    rowHoverable,
    // 行选中态判定 → 加 dg-row-selected 类（详见 docs/design-notes/selection.md）。
    isRowSelected,
    // Table 级 locale（FilterDropdown 消费 filterConfirm/Reset/EmptyText/SearchPlaceholder/CheckAll）。
    filterLocale,
  } = props

  // rowHeight / headerHeight / resizable* 全部从 gridOptions 读取（顶层无 alias）。
  const {
    rowHeight,
    headerHeight,
    resizable,
    columnResizeMode,
    virtualizationMode,
  } = gridOptions ?? {}

  const gridRef = useRef<HTMLDivElement | null>(null)
  const [gridElement, setGridElement] = useState<HTMLDivElement | null>(null)
  const setGridNode = useCallback((node: HTMLDivElement | null) => {
    gridRef.current = node
    setGridElement(node)
  }, [])
  const stickyViewportRef = useRef<HTMLDivElement | null>(null)
  const stickySummaryGridRef = useRef<HTMLDivElement | null>(null)
  const stickyScrollBarUpdateThumbRef = useRef<(() => void) | null>(null)

  // === 滚动模式互斥判定（sticky / virtual / 容器内固定表头）— 详见 useScrollMode.ts ===
  const {
    stickyEnabled,
    stickyOffsetScroll,
    stickyGetContainer,
    scrollYEnabled,
    virtualEnabled,
    scrollYNonVirtual,
    headerStickyTop,
    stickyHeaderOffset,
  } = useScrollMode({ sticky, scroll, virtual })

  // === sticky 横向滚动同步（stickyScrollLeftRef + onStickyViewportWheel + CSS var）
  //   已抽出到 useGridScrollSync.ts（task43）；依赖 stickyEnabled 故在 useScrollMode 之后调用。
  //   行为字节级保持：wheel 处理 / clamp 边界 / getStickyMaxScroll 协同 / translateX 派生全部
  //   在 hook 内，本组件只透传 props 给 ScrollContainer。
  const {
    stickyScrollLeftRef,
    setStickyScrollLeft,
    onStickyViewportWheel,
    onStickyViewportPointerDown,
    onStickyViewportPointerMove,
    onStickyViewportPointerUp,
    stickyScrollInertiaActive,
  } = useGridScrollSync({
    stickyEnabled,
    stickyViewportRef,
    gridRef,
    stickySummaryGridRef,
    stickyScrollBarUpdateThumbRef,
  })

  // 是否启用展开（expandState.expandEnabled）。展开启用时强制 multi 路径——
  // 展开内容 track 需要精确 grid-row 定位，flat 路径（grid-auto-flow:column）无法插入。
  const expandEnabled = !!expandState?.expandEnabled

  // 树形模式（treeState.treeEnabled）。非树形 → undefined。
  // 树形模式下：第一列数据单元格内按 level × indentSize 左缩进 + hasChildren 行渲染展开图标。
  const treeEnabled = !!treeState?.treeEnabled

  // === 汇总 summary 解析（须在 resolved 之前——summary 启用会强制 multi 路径）===
  // 解析 summary prop：提取 fixed 标志 + Row 元素列表。
  // summary 由适配层（Table.tsx）解析自 TableProps.summary（函数→调用、ReactNode→原样）后传入。
  // 引擎只负责：① grid-template-rows 末尾追加 summary 行 track；② 渲染 summary 区（cloneElement
  //   给每个 Row 注入 __rowLine + __fixed）。
  const summaryParsed = useMemo(() => {
    if (!summary) return null
    const { fixed, rows } = parseSummaryNode(summary)
    if (rows.length === 0) return null
    return { fixed, rows, count: rows.length }
  }, [summary])
  const summaryEnabled = !!summaryParsed

  // sticky 模式 + summary 存在时，summary 行从主 grid 提取为独立兄弟 grid，
  // 渲染顺序 grid(数据) → StickyScrollBar → summary-grid，使横向滚动条落在 summary 上方（数据区末尾）。
  // 非 sticky 模式 / 无 summary → false（summary 留在主 grid 内）。详见 sticky 分支。
  const extractSummary = stickyEnabled && !!summaryParsed

  // 解析列：优先 columnTree（多级表头），否则退化到 columns（单层）。
  // 强制 multi 路径的条件（任一即走显式 grid-column/grid-row 定位）：
  //   - 任一叶子列声明了 onCell（单元格合并）或 colSpan 字段（表头横向合并）——grid-auto-flow:column
  //     下跨列 span 会打乱列顺序，必须显式定位才能稳定放置合并格。
  //   - 虚拟滚动（占位 track 机制需要精确 grid-row 控制）。
  //   - 展开启用（需精确 grid-row 插入展开 track）。
  //   - summary 启用（summary Cell 用显式定位，auto-flow:column 会与之冲突）。
  //   - components.body.row 提供（行优先 DOM + Provider 包裹需要显式定位）。
  //   - empty 区启用（跨列 empty 区显式定位）。
  const resolved = useMemo(() => {
    // empty 区启用条件——emptyText 提供且 dataSource 空（无数据可显示）。
    // 启用时强制 multi 路径（显式 grid-row/grid-column 定位 empty 区），与 summary/expand 同款理由。
    const emptyEnabled = !!emptyText && dataSource.length === 0
    if (columnTree && columnTree.length > 0) {
      const r = resolveColumnTree(columnTree)
      // 检测单元格合并（onCell）或表头合并（colSpan≠1 或存在 covered 表头格）。
      const hasCellMerge = hasCellMergeDeclaration(r.leafColumns, dataSource)
      const hasHeaderMerge = r.headerCells.some(
        (h) => (h.headerColSpan ?? 1) !== 1 || h.covered === true,
      )
      const forceMulti = hasCellMerge || hasHeaderMerge
      const multi = r.maxDepth > 1 || forceMulti
      return {
        mode: (multi || virtualEnabled || expandEnabled || treeEnabled || summaryEnabled || emptyEnabled || !!components?.body?.row ? ('multi' as const) : ('flat' as const)),
        maxDepth: r.maxDepth,
        leafColumns: r.leafColumns,
        headerCells: r.headerCells,
      }
    }
    // 单层路径：columns 即叶子列。
    // 同样检测合并需求；若有 onCell 或 colSpan 字段，把 columns 包装成单层 columnTree
    // 走 resolveColumnTree（得到 headerCells 供 covered 处理），再强制 multi。
    // 虚拟 / 展开 / 树形 / summary / empty / components.body.row 提供时也包装成 multi（理由同 columnTree 分支）。
    const flatLeavesRaw: Array<EngineLeafColumn<RecordType>> = columns ?? []
    const hasCellMergeFlat = hasCellMergeDeclaration(flatLeavesRaw, dataSource)
    const hasHeaderColSpanFlat = flatLeavesRaw.some(
      (c) => c.colSpan !== undefined && c.colSpan !== 1,
    )
    if (hasCellMergeFlat || hasHeaderColSpanFlat || virtualEnabled || expandEnabled || treeEnabled || summaryEnabled || emptyEnabled || !!components?.body?.row) {
      // 包装成单层 columnTree（每个叶子列作为根节点）。
      const pseudoTree = flatLeavesRaw.map((c) => ({ ...c, children: undefined }))
      const r = resolveColumnTree(pseudoTree)
      return {
        mode: 'multi' as const,
        maxDepth: 1,
        leafColumns: r.leafColumns,
        headerCells: r.headerCells,
      }
    }
    // 无合并的单层 → flat 快速路径。
    return {
      mode: 'flat' as const,
      maxDepth: 1,
      leafColumns: flatLeavesRaw,
      headerCells: [] as Array<EngineHeaderCell<RecordType>>,
    }
  }, [columnTree, columns, virtualEnabled, expandEnabled, treeEnabled, summaryEnabled, emptyText, dataSource, components])

  const { mode, maxDepth, leafColumns, headerCells } = resolved

  // === 多级表头逐行累计 sticky 偏移 ===
  // 多行表头（maxDepth>1，如 grouping-columns）启用 headerStickyTop 时，若所有表头格都 sticky top:0，
  // 多行表头会堆叠在同一 y 重叠。本 hook 运行时测量每行高度，返回按行号升序的累计偏移数组
  // （index k = grid-row-start k+1 的 sticky top）。表头格按其 gridRowStart 取对应偏移，逐行分层 sticky。
  // 单行表头（maxDepth=1）→ [0] → 所有格 top:0，行为不变；showHeader=false → [] → 无影响。
  // 仅在表头纵向 sticky 启用时才有意义（否则不消费），但 hook 本身低成本，无条件调用保持引用稳定。
  const headerRowOffsets = useHeaderRowHeights(gridRef, showHeader ? maxDepth : 0)

  // 为 onHeaderRow(columns, index) 准备 columns 参数。
  // antd onHeaderRow 传入"当前表头行涉及的列"——单层表头即全部 columns；多级表头按层。
  // data-grid 简化：统一传**顶层列**（columnTree.raw 或 columns.raw）作为 columns 参数（调用方
  // 一般不读 columns 内容，仅按行返回固定 props；传顶层列已足够满足典型用例——onClick 行级交互等）。
  // 多级表头按层传不同列集较复杂，且 antd demo 无此用例，故简化为顶层列。
  const headerColumns = useMemo(
    () =>
      (columnTree && columnTree.length > 0
        ? columnTree
        : (leafColumns as unknown as Array<{ raw?: unknown }>)
      ).map((n) => n.raw),
    [columnTree, leafColumns],
  )

  // 第一列数据列索引（树形模式下渲染缩进 + 展开图标的目标列）。
  // 对齐 antd `expandIconColumnIndex`（nest 模式默认：有 rowSelection → 1，否则 → 0；
  // 但数据列在哨兵之后）。data-grid 用"第一个含 dataIndex 的叶子列"判定（哨兵列 SELECTION/
  // EXPAND 无 dataIndex）。无树形模式 → -1（不渲染缩进）。
  const treeFirstDataColumnIdx = useMemo(
    () => computeTreeFirstDataColumnIdx(treeEnabled, leafColumns),
    [treeEnabled, leafColumns],
  )

  const resizeSiblingByKey = useMemo(
    () => buildResizeSiblingByKey(leafColumns),
    [leafColumns],
  )
  const columnResizeMinByKey = useMemo(() => {
    const map = new Map<string, number>()
    for (const column of leafColumns) {
      const minWidth = toResizablePixelWidth(column.gridColumnOptions?.minWidth)
      if (minWidth !== undefined) map.set(column.key, minWidth)
    }
    return map
  }, [leafColumns])
  const columnResizeMaxByKey = useMemo(() => {
    const map = new Map<string, number>()
    for (const column of leafColumns) {
      const maxWidth = toResizablePixelWidth(column.gridColumnOptions?.maxWidth)
      if (maxWidth !== undefined) map.set(column.key, maxWidth)
    }
    return map
  }, [leafColumns])
  const resolveResizeMinWidth = useCallback(
    (key: string) => {
      const columnMinWidth = columnResizeMinByKey.get(key)
      if (columnMinWidth !== undefined) return columnMinWidth
      return 30
    },
    [columnResizeMinByKey],
  )
  const resolveResizeMaxWidth = useCallback(
    (key: string) => {
      const columnMaxWidth = columnResizeMaxByKey.get(key)
      if (columnMaxWidth !== undefined) return columnMaxWidth
      return Infinity
    },
    [columnResizeMaxByKey],
  )

  // === 列宽拖拽调整 — 详见 docs/design-notes/column-width.md ===
  // columnResizeMode 显式配置时优先；未配置时保留 resizable=true 的旧行为（ResizeLeft）。
  // 只有右侧存在下一列的可见叶子列才渲染手柄，所以最后一列右边不可 resize。
  const effectiveColumnResizeMode: ColumnResizeMode =
    columnResizeMode ?? (resizable === true ? 'ResizeLeft' : 'Disabled')
  const resizeEnabled = effectiveColumnResizeMode !== 'Disabled'
  const { resizedWidths, resizingKey, onPointerDown: onResizerPointerDown } =
    useColumnResize({
      enabled: resizeEnabled,
      mode: effectiveColumnResizeMode,
      minWidth: resolveResizeMinWidth,
      maxWidth: resolveResizeMaxWidth,
    })

  // === 固定列 sticky 偏移 — 详见 docs/design-notes/fixed-column.md ===
  // useStickyColumns 用 ResizeObserver 监听叶子表头格宽度变化重算。
  const { leafSticky, headerSticky } = useStickyColumns(
    leafColumns,
    headerCells,
    gridRef,
  )

  // === 单元格合并计划 ===
  // computeCellMergePlan 内部已检测 onCell 是否存在；无 onCell 返回 null（无合并，跳过开销）。
  const cellMergePlan: CellMergePlan | null = useMemo(
    () => computeCellMergePlan(leafColumns, dataSource),
    [leafColumns, dataSource],
  )

  // === 行高系统 — 详见 useRowHeightSystem.ts 与 docs/design-notes/virtualization.md / row-height.md ===
  // 阶段 1：派生 gridRowHeightOpt/minRowHeight/maxRowHeight/resolvedRowHeight/boundedRowHeight +
  // getRowHeight（每行调用，useVirtualList offset/totalSize 唯一行高来源）。
  // 虚拟滚动核心，铁律：只搬编排不重写不优化，引用稳定。
  // 注：effectiveRowHeight 依赖 virtualState.sizeOf，必须在 useVirtualList 之后通过
  // useEffectiveRowHeight 计算（依赖顺序：getRowHeight → virtualState → effectiveRowHeight）。
  const {
    minRowHeight,
    maxRowHeight,
    boundedRowHeight,
    getRowHeight,
  } = useRowHeightSystem({ gridOptions, dataSource, virtualEnabled })

  // 滚动容器 ref（虚拟下承载纵向滚动；非虚拟时不使用）。
  const virtualScrollRef = useRef<HTMLDivElement | null>(null)

  // 表头占高（用于虚拟滚动 contentOffset 校正）：showHeader 时 = maxDepth × headerHeight(数值)，
  // 缺省 headerHeight 走 CSS 'auto'——虚拟下需要数值，给一个近似值 40（与默认行高一致）。
  // 这里只是给 useVirtualList 校正 scrollTop/viewportSize 用，对最终视觉无影响（表头实际高度由
  // grid-template-rows 的 headerTracks 决定，paddingTop/Bottom 是数据区独立计算）。
  const headerHeightNum = resolveHeaderContentOffset(showHeader, maxDepth, headerHeight)

  const virtualState = useVirtualList({
    itemCount: dataSource.length,
    getRowHeight,
    containerRef: virtualScrollRef,
    enabled: virtualEnabled,
    // 固定行高（rowHeight 为 number）时禁用测量：body track 是定值 `${h}px`，每行实际高度恒等于
    // getRowHeight(i)，测量不提供新信息 → 跳过（省 overhead，也避免回收/瞬态布局期 offsetHeight 误读）。
    // 仅当行高真可能随内容或行变化时才测量：rowHeight 未给（undefined，按 antd 策略=内容撑高）/ 是函数 / 有界(min/max)。
    measurementEnabled: boundedRowHeight || typeof rowHeight !== 'number',
    fixedRowHeight: !boundedRowHeight && typeof rowHeight === 'number'
      ? rowHeight
      : undefined,
    contentOffset: headerHeightNum,
    // .dg-grid 默认 row-gap:0（CSS 未声明）。data-grid 表格通常无行间距。
    gap: 0,
  })

  // 阶段 2：effectiveRowHeight（body track 行高取值，有界/固定二分支）— 须在 virtualState 之后。
  const effectiveRowHeight = useEffectiveRowHeight({
    boundedRowHeight,
    virtualEnabled,
    virtualState,
    getRowHeight,
    minRowHeight,
    maxRowHeight,
  })

  const recyclingRequested = virtualizationMode === 'recycling'
  const recyclingBodyEnabled =
    recyclingRequested &&
    virtualEnabled &&
    !stickyEnabled &&
    !treeEnabled &&
    !expandEnabled &&
    !components?.body?.row &&
    !components?.body?.cell &&
    !hasCellMergeDeclaration(leafColumns, dataSource)
  const recyclingDegradedToStandard = recyclingRequested && !recyclingBodyEnabled

  // 暴露 scrollTo（仅在虚拟模式下有效；非虚拟调用为 no-op）。
  useImperativeHandle(
    ref,
    (): GridTableHandle => ({
      scrollTo: (config) => {
        if (!virtualEnabled) return
        virtualState.scrollTo(config)
      },
    }),
    [virtualEnabled, virtualState],
  )

  // === 行展开布局信息 — 详见 docs/design-notes/expand.md ===
  // 为每个可见数据行计算其在 grid 中的 row line（含展开 track 偏移）+ 该行展开 track 的 row line。
  // expandLayout: Map<rowIndex, { rowLine, expandTrackLine? }>。
  //   - rowLine：该数据行 track 的起始线（1-based grid row line）。
  //   - expandTrackLine：该行下方展开内容 track 的起始线（仅可展开行有；= rowLine + 1）。
  // expandTrackSizes: Map<rowIndex, '0fr' | '1fr'>（可展开行的展开 track 大小）。
  // 在 gridTemplateRows 构建时与 bodyTracks 拼接；在渲染数据格 / 展开内容时取定位。
  const expandLayout = useMemo(() => computeExpandLayout({
    expandEnabled,
    isExpandable: expandState?.isExpandable,
    showHeader,
    maxDepth,
    virtualEnabled,
    virtualState,
    dataSource,
    rowKey,
  }), [expandEnabled, expandState, showHeader, maxDepth, virtualEnabled, virtualState, dataSource, rowKey])

  // === grid 模板 ===
  // 虚拟模式：headerTracks + paddingTopTrack + [start,end) 数据行 tracks（含展开 track）+ paddingBottomTrack。
  // 非虚拟：headerTracks + 全部数据行 tracks（含展开 track）。无展开时退化为简单行 track。
  // summary 启用时末尾追加 summaryTracks（每行一条 'auto'），并返回 summaryStartLine
  //   供渲染时给 summary Row 注入 grid-row 线号。
  // 实现已抽出到 useGridLayout.ts（先移动不重写，字节级对齐；详见该 hook 注释）。
  const { gridTemplateRows, gridTemplateColumns, gridAutoFlow, summaryStartLine, paddingTopLine, paddingBottomLine } = useGridLayout({
    mode,
    maxDepth,
    showHeader,
    headerHeight,
    virtualEnabled,
    virtualState,
    boundedRowHeight,
    minRowHeight,
    maxRowHeight,
    effectiveRowHeight,
    getRowHeight,
    expandEnabled,
    expandState,
    dataSource,
    rowKey,
    rowHeight,
    leafColumns,
    resizedWidths,
    tableLayout,
    summaryParsed,
    summaryEnabled,
  })

  // 整行 hover：记录当前 hover 的数据行 index（null 表示未 hover）。
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null)

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateRows,
    gridTemplateColumns,
    ...(gridAutoFlow ? { gridAutoFlow } : null),
    // 有界行高模型：注入 CSS 变量供 .dg-cell-body（dg-grid-bounded 下）消费
    //   （cell min-height/max-height）。仅 boundedRowHeight 时设；不设时 CSS 规则不命中。
    ...(boundedRowHeight
      ? ({
          '--dg-row-min-h': `${minRowHeight}px`,
          '--dg-row-max-h': `${maxRowHeight}px`,
        } as CSSProperties)
      : null),
    // `.dg-grid` 恒定 `width:100%`（对齐 antd `<table>` CSS `.ant-table table{width:100%}`）。
    // 详见 docs/design-notes/column-width.md 的「.dg-grid { width: 100% } 配合」一节。
    // sticky 模式例外：sticky 下不加 width:100%（保留 width:auto）——详见 docs/design-notes/sticky.md。
    ...(!stickyEnabled ? { width: '100%' } : null),
  }

  // === 滚动容器 ===
  // `scroll.x` 存在时，grid 自身 min-width=x（撑宽内部 .dg-scroll 触发横向滚动）。
  // 外层滚动包装统一由下方 renderScrollContainer 路由处理（非 sticky 一律 FloatingScrollBar）。
  // 虚拟：FloatingScrollBar 内部 .dg-scroll overflow-y:auto 双向（虚拟路径）。
  const scrollX = scroll?.x
  const scrollMinWidth =
    scrollX !== undefined && scrollX !== true
      ? typeof scrollX === 'number'
        ? `${scrollX}px`
        : scrollX
      : undefined
  const gridFinalStyle: CSSProperties = scrollMinWidth
    ? { ...gridStyle, minWidth: scrollMinWidth }
    : gridStyle
  // 语义化 content 部位 style（合并到 grid 根容器 style）。
  const semanticContentStyle = semantic?.content?.style
  // semantic content style 合并到 grid 根 style（gridFinalStyle 之后覆盖）。
  const gridFinalStyleWithSemantic: CSSProperties = semanticContentStyle
    ? { ...gridFinalStyle, ...semanticContentStyle }
    : gridFinalStyle

  const gridClassName = [
    'dg-grid',
    'ant-table',
    // 语义化 content 部位 class（合并到 grid 根容器）。
    semantic?.content?.className,
    // 拖拽进行中加 dg-grid-resizing 类，禁用 grid-template-columns 过渡
    // （否则拖拽时 0.3s 过渡会与实时更新叠加产生抖动/延迟）。
    resizingKey !== null ? 'dg-grid-resizing' : undefined,
    // 有界行高模型：加标记类，CSS 据此给 .dg-cell-body 加 min/max-height（约束 auto track）。
    boundedRowHeight ? 'dg-grid-bounded' : undefined,
    stickyEnabled ? 'dg-sticky-scroll-translated' : undefined,
    stickyScrollInertiaActive ? 'dg-sticky-scroll-inertia' : undefined,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  // 渲染表格 grid 内容（multi 与 flat 两路径）；外层滚动包装由 renderScrollContainer 路由决定。
  const renderGrid = () => {
    if (mode === 'multi') {
      // 1-based 数据行起始线号。
      // - 非虚拟：headerRowsUsed + index + 1。
      // - 虚拟：headerRowsUsed + 1(paddingTop track) + (index - virtualState.start) + 1
      //   （占位 track 多占一行，数据行向后偏移 1）。
      // - 展开启用：数据行间穿插展开内容 track，行线号偏移由 expandLayout 给出。
      const headerRowsUsed = showHeader ? maxDepth : 0
      const rowLineBase = (index: number) => {
        // 展开 track 偏移由 expandLayout 预计算（含可展开行多占的展开 track）。
        const fromExpand = expandLayout.layout.get(index)
        if (fromExpand) return fromExpand.rowLine
        // 无展开 / 兜底：退化为原计算。
        return virtualEnabled
          ? headerRowsUsed + 1 + (index - virtualState.start) + 1
          : headerRowsUsed + index + 1
      }
      return (
        <div className={gridClassName} style={gridFinalStyleWithSemantic} ref={setGridNode}>
          {/* 虚拟模式下渲染独立 FillerRow grid item 撑 paddingTop（替代原 grid-template-rows 的
              `${paddingTop}px` track）— 详见 docs/design-notes/virtualization.md 的「占位 track / FillerRow」一节。
              grid-template-rows 该 track 改 'auto'，FillerRow 用 height 撑高（auto track 包裹子元素高）。
              FillerRow 不打 data-row-index，useRowMeasurements 跳过它。grid-column:1/-1 跨整行
              不影响固定列/合并 cell 的列定位；grid-row 显式定位到 paddingTopLine。 */}
          {virtualEnabled ? (
            <div
              className="dg-filler-row dg-filler-top"
              style={{
                gridColumn: '1 / -1',
                gridRow: paddingTopLine,
                height: virtualState.paddingTop,
                pointerEvents: 'none',
              }}
            />
          ) : null}
          {/* 表头区：显式定位的表头格（sticky 信息来自 headerSticky）— 详见 docs/design-notes/header.md 与 fixed-column.md。
              跳过 covered 表头格（被前面的 colSpan>1 表头覆盖，不渲染 DOM）。
              虚拟 / 非虚拟 scroll.y：表头格额外 position:sticky; top:0（z-index 4），
              相对滚动容器顶部固定（由 headerStickyTop 标志统一驱动）。 */}
          <HeaderGrid
            showHeader={showHeader}
            headerCells={headerCells}
            headerSticky={headerSticky}
            headerRowOffsets={headerRowOffsets}
            renderHeaderCell={({ cell, sticky, headerStickyTopOffset }) => (
              <HeaderCell
                key={`h-${cell.key}`}
                cell={cell}
                sticky={sticky}
                headerStickyTop={headerStickyTop}
                stickyHeaderOffset={stickyHeaderOffset}
                // 按 cell.gridRowStart 取逐行累计偏移，多级表头分层 sticky 避免堆叠。
                headerStickyTopOffset={headerStickyTopOffset}
                resizeEnabled={resizeEnabled}
                resizeSiblingKey={resizeSiblingByKey.get(cell.key)}
                onResizerPointerDown={onResizerPointerDown}
                resizingKey={resizingKey}
                semanticHeader={semantic?.header}
                onSorterClick={onSorterClick}
                onFilterApply={onFilterApply}
                // onHeaderRow 行级 props 透传到表头格（grid 无 tr，行 props 分发到该行所有表头格）。
                onHeaderRow={onHeaderRow}
                getPopupContainer={getPopupContainer}
                headerColumns={headerColumns}
                // Table 级 locale 透传到表头格内的 FilterDropdown。
                filterLocale={filterLocale}
              />
            )}
          />
          {/* 数据区：按数据行 × 叶子列显式定位（sticky 来自 leafSticky[colIdx]）— 详见 docs/design-notes/fixed-column.md。
              当 components.body.row 提供时，按**行**优先遍历，每行用 body.row 组件包裹该行所有单元格
              （body.row 不产生 DOM 或产生不影响 grid 的 DOM——典型 EditableRow 用 antd Form + Context.Provider，
              Provider 不渲染真实 DOM，单元格仍是 grid 直接子元素，grid 显式定位保证布局正确）。
              无 body.row 时按列优先遍历（单元格 DOM 列连续，性能略优）。
              cellMergePlan 驱动——hidden 格不渲染 DOM；非隐藏格设 grid-column/grid-row span。
                - 合并格若落在固定列区域，sticky 偏移取左上角列（colIdx）的 leafSticky，自然正确
                  （被覆盖格不渲染，仅左上角格渲染并整体固定）。
              虚拟：只遍历 [start, end)；其余由占位 track 撑总高。
                已知简化：若某 rowSpan>1 的左上角在可视区**外**（start 之前），其延伸到可视区内的
                覆盖格本就不渲染（hidden），故可视区会出现"缺一块"。详见 docs/design-notes/virtualization.md。 */}
          {recyclingBodyEnabled && gridElement ? (
            <RecyclingBodyGrid<RecordType>
              gridRef={gridRef}
              leafColumns={leafColumns}
              dataSource={dataSource}
              virtualState={virtualState}
              rowLineBase={rowLineBase}
              leafSticky={leafSticky}
              rowKey={rowKey}
              hoveredRowIndex={hoveredRowIndex}
              setHoveredRowIndex={setHoveredRowIndex}
              rowHoverable={rowHoverable}
              onRow={onRow}
              rowClassName={rowClassName}
              isRowSelected={isRowSelected}
              effectiveRowHeight={effectiveRowHeight}
              semanticBody={semantic?.body}
            />
          ) : renderBodyCells({
            leafColumns,
            dataSource,
            virtualEnabled,
            virtualState,
            cellMergePlan,
            expandEnabled,
            expandState,
            rowKey,
            hoveredRowIndex,
            setHoveredRowIndex,
            rowLineBase,
            leafSticky,
            treeEnabled,
            treeState,
            treeFirstDataColumnIdx,
            components,
            semanticBody: semantic?.body,
            // onRow / rowClassName 透传到表体单元格（grid 无 tr，行 props / 行 class 分发到该行所有单元格）。
            onRow,
            rowClassName,
            rowHoverable,
            renderRecyclingReactCells: recyclingDegradedToStandard,
            // 行选中态判定 → 加 dg-row-selected 类（详见 docs/design-notes/selection.md）。
            isRowSelected,
            // 首列写 data-known-size（实测闭环，详见 docs/design-notes/virtualization.md）。
            effectiveRowHeight,
          })}
          {/* 行展开内容：每个可展开 + 展开中的数据行渲染一条展开内容 grid item — 详见 docs/design-notes/expand.md。
              grid-column: 1 / -1 跨整行，grid-row 指向该行下方的展开内容 track。
              track size 已由 grid-template-rows 设为 1fr（展开）/0fr（收起），这里只渲染内容容器。
              容器 overflow:hidden + min-height:0——0fr track 下被裁剪不可见，1fr track 下自然展开。
              虚拟 × 展开：展开内容只在可视区数据行范围内渲染（与数据行同窗口），虚拟窗口大小仍按收起态算。 */}
          {expandEnabled && expandState
            ? renderExpandedContents({
                dataSource,
                virtualEnabled,
                virtualState,
                expandState,
                expandLayout: expandLayout.layout,
                rowKey,
                leafColumns,
              })
            : null}
          {/* 自定义空状态：dataSource 空时渲染跨所有列的 empty 占位区。
              empty grid item 显式定位到 headerTracks 之后的第一条 track（grid-row: headerRowsUsed+1），
              grid-column: 1 / -1 跨所有列；内容居中（.dg-empty 区 padding + flex center）。
              内容来自 emptyText（适配层已按 TableProps.locale.emptyText >
              ConfigProvider locale.Table.emptyText > ConfigProvider.renderEmpty('Table') > 默认 Empty
              优先级解析；表体 empty 不区分空数据 vs 筛选无结果）。
              非空时不渲染。 */}
          {emptyText && dataSource.length === 0 ? (
            <div
              className="dg-empty"
              style={{
                gridColumn: '1 / -1',
                gridRow: headerRowsUsed + 1,
                padding: '32px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {emptyText}
            </div>
          ) : null}
          {/* 汇总 summary 区：grid 末尾的 summary 行 — 详见 docs/design-notes/summary.md。
              summaryParsed.rows 为解析得到的 Summary.Row 元素列表；引擎对每个 Row cloneElement
              注入 __rowLine（grid-row 起始线号 = summaryStartLine + rowIndex）+ __fixed（sticky bottom）
              + __leafSticky（固定列横向 sticky 信息，与表体固定列同源 leafSticky）。
              Row 内部通过 Context 把 rowLine/fixed/leafSticky 传给其 Cell 子节点，Cell 据此设 grid-row +
              gridColumn + sticky bottom + 横向 sticky left/right。
              sticky 模式启用且 summary 存在时，summary 行从此 grid 内挪出，改在 sticky 分支作为独立 grid
              渲染（顺序 grid(数据) → StickyScrollBar → summary-grid），使横向滚动条落在 summary **上方**
              （数据区末尾）。此处 skip 渲染；summaryStartLine 对应的 'auto' track 无 grid item → 折叠为 0 高。 */}
          {/* 虚拟模式下渲染独立 FillerRow grid item 撑 paddingBottom（同 paddingTop，线号 paddingBottomLine）。
              放在 summary 之前（若有 summary，paddingBottom 在表体末、summary 前）。 */}
          {virtualEnabled ? (
            <div
              className="dg-filler-row dg-filler-bottom"
              style={{
                gridColumn: '1 / -1',
                gridRow: paddingBottomLine,
                height: virtualState.paddingBottom,
                pointerEvents: 'none',
              }}
            />
          ) : null}
          {!extractSummary ? (
            <SummaryLayer
              summary={summaryParsed}
              startLine={summaryStartLine}
              leafSticky={leafSticky}
            />
          ) : null}
        </div>
      )
    }

    // 单层快速路径：显式定位，DOM 按表头行、数据行顺序输出。
    // 注意：虚拟模式下不会走到这里（虚拟强制 multi）。
    const flatBodyGridRowOffset = showHeader ? 1 : 0
    const renderFlatColumnCells = ({
      column,
      colIdx,
      keyPrefix,
      bodyRowIndex,
      dataSourceOverride,
      showHeaderOverride,
    }: {
      column: EngineLeafColumn<RecordType>
      colIdx: number
      keyPrefix: string
      bodyRowIndex?: number
      dataSourceOverride: Array<RecordType>
      showHeaderOverride: boolean
    }) => (
      <ColumnCells<RecordType>
        key={`${keyPrefix}-${column.key}`}
        column={column}
        colIdx={colIdx}
        // 表头分隔线排除：单层末列标记（对齐 antd `thead th:not(:last-child)::before`）— 详见 docs/design-notes/header.md。
        //   单层无分组，仅需末列排除；多级路径由 columnTree.markLastLeaves 算 data-group-last。
        isLastLeaf={colIdx === leafColumns.length - 1}
        dataSource={dataSourceOverride}
        rowKey={rowKey}
        showHeader={showHeaderOverride}
        hoveredRowIndex={hoveredRowIndex}
        onHoverRow={setHoveredRowIndex}
        sticky={leafSticky[colIdx]}
        headerStickyTop={headerStickyTop}
        stickyHeaderOffset={stickyHeaderOffset}
        // flat 单行表头 → headerRowOffsets=[0]，表头格 top:0。
        headerStickyTopOffset={headerRowOffsets[0] ?? 0}
        resizeEnabled={resizeEnabled}
        resizeSiblingKey={resizeSiblingByKey.get(column.key)}
        onResizerPointerDown={onResizerPointerDown}
        resizingKey={resizingKey}
        onSorterClick={onSorterClick}
        onFilterApply={onFilterApply}
        semanticHeader={semantic?.header}
        semanticBody={semantic?.body}
        components={components}
        // onHeaderRow / onRow / rowClassName 透传到 flat 路径的表头格 + 表体单元格（与 multi 路径同款接入）。
        onHeaderRow={onHeaderRow}
        onRow={onRow}
        rowClassName={rowClassName}
        rowHoverable={rowHoverable}
        getPopupContainer={getPopupContainer}
        headerColumns={headerColumns}
        // 行选中态判定 → 加 dg-row-selected 类（详见 docs/design-notes/selection.md）。
        isRowSelected={isRowSelected}
        // 实测闭环：flat 路径表体首列写 data-known-size（与 multi 路径 BodyCell 同款）。
        effectiveRowHeight={effectiveRowHeight}
        bodyRowIndex={bodyRowIndex}
        bodyGridRowOffset={flatBodyGridRowOffset}
        // Table 级 locale 透传到表头格内的 FilterDropdown。
        filterLocale={filterLocale}
      />
    )
    return (
      <div className={gridClassName} style={gridFinalStyleWithSemantic} ref={setGridNode}>
        {showHeader
          ? leafColumns.map((column, colIdx) =>
              renderFlatColumnCells({
                column,
                colIdx,
                keyPrefix: 'h',
                dataSourceOverride: [],
                showHeaderOverride: true,
              }),
            )
          : null}
        {dataSource.map((record, rowIndex) =>
          leafColumns.map((column, colIdx) =>
            renderFlatColumnCells({
              column,
              colIdx,
              keyPrefix: `b-${getRowKey(record, rowKey) ?? rowIndex}`,
              bodyRowIndex: rowIndex,
              dataSourceOverride: [record],
              showHeaderOverride: false,
            }),
          ),
        )}
      </div>
    )
  }

  // 语义化 section 部位 class/style（注入到滚动容器外层；无 semantic 时 sectionClassName=undefined）。
  // 合并逻辑（mergeSectionClass/mergeSectionStyle）已随 ScrollContainer 抽出。
  const sectionClassName = semantic?.section?.className
  const sectionStyle = semantic?.section?.style

  // === 滚动容器路由 — 由 ScrollContainer 组件负责三路 return（sticky / 兜底 / FloatingScrollBar）===
  //   详见 docs/design-notes/sticky.md（sticky 分支）与 docs/design-notes/scrollbar.md（FloatingScrollBar 分支）。
  //   stickyScrollLeftRef + onStickyViewportWheel 由 useGridScrollSync（task43）派生，
  //   作 props 传入 ScrollContainer。
  return (
    <ScrollContainer
      stickyEnabled={stickyEnabled}
      stickyViewportRef={stickyViewportRef}
      onStickyViewportWheel={onStickyViewportWheel}
      onStickyViewportPointerDown={onStickyViewportPointerDown}
      onStickyViewportPointerMove={onStickyViewportPointerMove}
      onStickyViewportPointerUp={onStickyViewportPointerUp}
      stickyScrollLeftRef={stickyScrollLeftRef}
      setStickyScrollLeft={setStickyScrollLeft}
      stickyScrollBarUpdateThumbRef={stickyScrollBarUpdateThumbRef}
      stickyScrollInertiaActive={stickyScrollInertiaActive}
      stickyOffsetScroll={stickyOffsetScroll}
      stickyGetContainer={stickyGetContainer}
      gridRef={gridRef}
      stickySummaryGridRef={stickySummaryGridRef}
      extractSummary={extractSummary}
      summaryParsed={summaryParsed}
      leafSticky={leafSticky}
      gridClassName={gridClassName}
      gridTemplateColumns={gridTemplateColumns}
      scrollMinWidth={scrollMinWidth}
      scrollYEnabled={scrollYEnabled}
      scrollXEnabled={scrollX !== undefined}
      virtualEnabled={virtualEnabled}
      scrollYNonVirtual={scrollYNonVirtual}
      virtualScrollRef={virtualScrollRef}
      sectionClassName={sectionClassName}
      sectionStyle={sectionStyle}
    >
      {renderGrid()}
    </ScrollContainer>
  )
}

/**
 * 行展开内容渲染（multi 路径专用；flat 路径不启用展开——展开强制 multi）。详见 docs/design-notes/expand.md。
 *
 * 遍历可视区（虚拟）或全集（非虚拟）数据行，对"可展开 + 展开中"的行渲染一个展开内容 grid item：
 *   - grid-row：该行展开内容 track 的起始线（来自 expandLayout）。
 *   - grid-column：默认 1 / -1 跨整行；expandedRowOffset=N 时从第 N+1 个叶子列开始。
 *   - 容器 `overflow:hidden + min-height:0`：配合 track 0fr/1fr 过渡——0fr 时被裁剪、1fr 时自然展开。
 *
 * 收起的可展开行不渲染内容（节省 DOM）——track 仍存在（0fr）但无 grid item 占位，
 * 因为 0fr track 高度为 0，没有 grid item 也不影响布局。
 *
 * 注意：展开 track 在 grid-template-rows 中已定义为 1fr/0fr；这里只渲染内容容器 grid item。
 * 即便某行收起（track 0fr），渲染内容容器也无妨（会被 overflow:hidden 裁剪到 0），但为省 DOM，
 * 仅展开的行才渲染（与 antd rc-table 行为一致：展开才 mount 内容）。
 */
// 仅为兼容潜在的外部导入（columnTree 类型）；引擎外部应通过 Table.tsx 适配层使用。
export type { EngineColumnNode }
