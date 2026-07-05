/**
 * data-grid CSS Grid 渲染引擎根组件。
 *
 * 渲染思路：用 `display:grid` + `grid-template-rows/columns` + 显式 grid-area 定位
 * 替代 antd 的 `<table>`/`<tr>`/`<td>`，所有单元格是同一个 `.dg-grid` 的 grid item。
 *
 * 两条渲染路径：
 *
 * 1) **快速路径（flat）**：单层表头且无合并 / 虚拟 / 展开 / 树形 / summary / empty。
 *    使用 `grid-auto-flow:column`：每列 DOM 连续（表头格 + 每数据行格）。
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
 * grid-auto-flow:column / 显式定位下"同行"DOM 都不连续，纯 CSS 无法关联整行；
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
import { HeaderGrid } from './HeaderGrid'
import { parseSummaryNode } from './Summary'
import type {
  EngineColumnNode,
  EngineHeaderCell,
  EngineLeafColumn,
  EngineTableProps,
} from './types'
// onHeaderCell 签名 `(column) => HTMLAttributes` 的 column 类型用 ColumnType 表达（与对外 types.ts 一致），仅 type-only。
import { FloatingScrollBar } from './FloatingScrollBar'
import { getRowKey } from './recordAccess'
import {
  clampSize,
  resolveNumericRowHeight,
  toTrack,
} from './cellRenderUtils'
import {
  clampScrollLeft,
} from './gridScrollUtils'
import { computeGridTemplateColumns } from './gridTemplateColumnsUtils'
import { resolveHeaderContentOffset } from './headerHeightUtils'
import { computeTreeFirstDataColumnIdx } from './treeColumnUtils'
import { computeExpandLayout } from './expandLayoutUtils'
import { renderExpandedContents } from './expandLayerUtils'
import { SummaryLayer, summaryRowsTrack } from './SummaryLayer'
import { StickyScrollBar, getStickyMaxScroll } from './StickyScrollBar'
import { HeaderCell } from './HeaderCell'
import { renderBodyCells } from './BodyGrid'
import { ColumnCells } from './FlatColumnCells'
import { buildResizeSiblingByKey } from './resizeColumnUtils'

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
    resizableMinWidth,
    resizableMaxWidth,
    columnResizeMode,
  } = gridOptions ?? {}

  const gridRef = useRef<HTMLDivElement | null>(null)
  const stickyViewportRef = useRef<HTMLDivElement | null>(null)
  const [stickyScrollLeft, setStickyScrollLeft] = useState(0)

  // === 页面级粘性表头（区别于容器内固定）— 详见 docs/design-notes/sticky.md ===
  // sticky prop 启用时：表头相对**页面 viewport** 固定（position:sticky; top:offsetHeader），
  // 而非相对表格滚动容器固定。
  //
  // 与虚拟 / 容器内固定表头互斥：sticky 启用时走"页面级"路径（grid 不包 overflow 容器，避免拦截
  // sticky 上下文），virtual / scrollYNonVirtual 的容器内固定表头不生效（headerStickyTop 仍为 false，
  // 由 stickyHeaderOffset 驱动）。
  const stickyEnabled = sticky !== undefined && sticky !== null
  const stickyOffsetHeader = (sticky && typeof sticky === 'object' ? sticky.offsetHeader : undefined) ?? 0
  const stickyOffsetScroll = (sticky && typeof sticky === 'object' ? sticky.offsetScroll : undefined) ?? 0
  const stickyGetContainer =
    sticky && typeof sticky === 'object' && sticky.getContainer ? sticky.getContainer : undefined

  // === 虚拟滚动判定 — 详见 docs/design-notes/virtualization.md ===
  // virtual=true 且 scroll.y === true 时启用纵向虚拟滚动（scroll.y 仅 true/undefined）。
  // 虚拟窗口高度由 CSS 自动适应（容器 clientHeight，ResizeObserver 实时测量——见 useVirtualList）。
  // sticky 启用时禁用虚拟（页面级与容器内虚拟互斥；sticky 下页面滚动，虚拟窗口失去意义）。
  const scrollY = scroll?.y
  const scrollYEnabled = scrollY === true
  const virtualEnabled = !stickyEnabled && virtual === true && scrollYEnabled

  // === 容器内固定表头（非 virtual）判定 ===
  // 非 virtual 且 scroll.y === true 时启用：表头 sticky top + 表体限高纵向滚动（CSS 自动适应高度）。
  // 与虚拟互斥（虚拟优先）。sticky 启用时禁用（页面级优先）。
  const scrollYNonVirtual = !stickyEnabled && !virtualEnabled && scrollYEnabled

  // === 表头纵向 sticky 统一标志（虚拟 + 容器内固定表头共用）===
  // 无论虚拟还是非虚拟 scroll.y，表头都需要 `position: sticky; top: 0` 钉在滚动容器顶部。
  // 该标志传入 HeaderCell / ColumnCells 的 `headerStickyTop` prop，统一驱动表头 sticky 行为，
  // 避免两套不一致的实现。
  // sticky 页面级固定**不**走此标志（该标志驱动的是"容器内 top:0"）；sticky 由 stickyHeaderOffset
  // 单独驱动（表头格 inline style 用 top: offsetHeader，相对 viewport），见下方 stickyHeaderOffset。
  const headerStickyTop = virtualEnabled || scrollYNonVirtual

  // === 表头页面级 sticky 偏移（仅 sticky 启用时有效）===
  // 传入 HeaderCell / ColumnCells 的 `stickyHeaderOffset` prop：sticky 启用时表头格 inline style
  // 加 `position: sticky; top: offsetHeader; zIndex`，相对 viewport 固定。与 headerStickyTop（容器内）
  // 互斥——同时为 true 时 sticky 优先（sticky 启用时 headerStickyTop 恒 false，见上）。
  const stickyHeaderOffset: number | undefined = stickyEnabled ? stickyOffsetHeader : undefined

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
      const hasOnCell = r.leafColumns.some((c) => typeof c.onCell === 'function')
      const hasHeaderMerge = r.headerCells.some(
        (h) => (h.headerColSpan ?? 1) !== 1 || h.covered === true,
      )
      const forceMulti = hasOnCell || hasHeaderMerge
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
    const hasOnCellFlat = flatLeavesRaw.some((c) => typeof c.onCell === 'function')
    const hasHeaderColSpanFlat = flatLeavesRaw.some(
      (c) => c.colSpan !== undefined && c.colSpan !== 1,
    )
    if (hasOnCellFlat || hasHeaderColSpanFlat || virtualEnabled || expandEnabled || treeEnabled || summaryEnabled || emptyEnabled || !!components?.body?.row) {
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
      minWidth: resizableMinWidth,
      maxWidth: resizableMaxWidth,
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

  // === 虚拟滚动：约定行高 + 有界行高模型 — 详见 docs/design-notes/virtualization.md 与 row-height.md ===
  // getRowHeight 是 useVirtualList 算 offset/totalSize 的唯一行高来源。
  // 此处只用"收起态"约定行高，不感知展开态（详见 useVirtualList 注释 + docs/design-notes/virtualization.md）。
  //
  // rowHeight 仅来自 `gridOptions.rowHeight`。优先级：`gridOptions.rowHeight` > 虚拟默认 56
  //   （对齐 antd virtual-list 表观行高，antd large ≈ 55）。
  // boundedRowHeight：minRowHeight 与 maxRowHeight **同时**为正数时启用「有界行高模型」
  //   （行随内容在 [min,max] 变高，body track=auto + 行容器 min/max-height 约束）。
  //   仅设其一或都未设 → 固定行高模型（body track = `${effectiveRowHeight}px`）。
  const gridRowHeightOpt = gridOptions?.rowHeight
  const minRowHeightRaw = gridOptions?.minRowHeight
  const maxRowHeightRaw = gridOptions?.maxRowHeight
  const resolvedRowHeight = gridRowHeightOpt ?? (virtualEnabled ? 56 : undefined)
  const boundedRowHeight =
    typeof minRowHeightRaw === 'number' &&
    minRowHeightRaw > 0 &&
    typeof maxRowHeightRaw === 'number' &&
    maxRowHeightRaw > 0 &&
    minRowHeightRaw <= maxRowHeightRaw
  const minRowHeight = boundedRowHeight ? (minRowHeightRaw as number) : undefined
  const maxRowHeight = boundedRowHeight ? (maxRowHeightRaw as number) : undefined
  const getRowHeight = useCallback(
    (index: number) => {
      // 有界模式下，未测行回退用 minRowHeight（而非 rowHeight），保证 track=auto + 行容器 min-height
      // 时虚拟窗口初始 offset 与首屏一致（首测后由 sizeOf 实测接管）。
      if (boundedRowHeight) {
        const rec = dataSource[index]
        const declared =
          typeof gridRowHeightOpt === 'function'
            ? resolveNumericRowHeight(gridRowHeightOpt, rec, index)
            : typeof gridRowHeightOpt === 'number'
              ? gridRowHeightOpt
              : minRowHeightRaw
        return clampSize(declared, minRowHeightRaw, maxRowHeightRaw)
      }
      return resolvedRowHeight === undefined
        ? 0
        : resolveNumericRowHeight(resolvedRowHeight, dataSource[index], index)
    },
    [
      boundedRowHeight,
      gridRowHeightOpt,
      minRowHeight,
      maxRowHeight,
      dataSource,
      resolvedRowHeight,
    ],
  )

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
    contentOffset: headerHeightNum,
    // .dg-grid 默认 row-gap:0（CSS 未声明），故传 0；将来若 CSS 引入 row-gap，
    // 此处读 CSS 变量 --dg-row-gap（默认 0）传入。data-grid 表格通常无行间距。
    gap: 0,
  })

  // === effectiveRowHeight：body track 行高取值 — 详见 docs/design-notes/virtualization.md ===
  //   - 有界模型（minRowHeight/maxRowHeight 均设）：实测优先（sizeOf 闭环），未测回退 getRowHeight；
  //     clamp 到 [min,max]；body track 取该值（min-height/max-height 同样约束行容器，二者一致保对齐）。
  //   - 固定模型（默认）：取 getRowHeight(i)（= resolvedRowHeight 数值化）。
  // 该值同时回填到每行 cell 的 `data-known-size`（实测闭环，避免 useRowMeasurements 死循环）。
  const effectiveRowHeight = useCallback(
    (i: number): number => {
      if (boundedRowHeight) {
        const measured = virtualEnabled ? virtualState.sizeOf(i) : 0
        const base = measured > 0 ? measured : getRowHeight(i)
        return clampSize(base, minRowHeight, maxRowHeight)
      }
      return getRowHeight(i)
    },
    [boundedRowHeight, virtualEnabled, virtualState, getRowHeight, minRowHeight, maxRowHeight],
  )

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
  const { gridTemplateRows, gridTemplateColumns, gridAutoFlow, summaryStartLine, paddingTopLine, paddingBottomLine } = useMemo(() => {
    const headerRows = showHeader ? maxDepth : 0
    const headerTrackUnit = toTrack(headerHeight) ?? 'auto'
    const headerTracks: string[] = []
    for (let i = 0; i < headerRows; i += 1) headerTracks.push(headerTrackUnit)

    let bodyTracks: string[]
    if (virtualEnabled) {
      // 虚拟：只列可视区数据行 tracks（约定行高数值化）。前后各加一条占位 track 撑总高。
      // 展开内容 track 穿插在可视区数据行间（可展开行后插一条 0fr/1fr）。
      //   展开 track 不参与虚拟窗口大小（paddingTop/Bottom 仍按收起态 totalSize 算），展开会让实际
      //   DOM 总高 > totalSize，浏览器滚动条位置可能轻微偏移，但窗口稳定不崩。
      const visibleTracks: string[] = []
      for (let i = virtualState.start; i < virtualState.end; i += 1) {
        // 有界行高模型（详见 docs/design-notes/row-height.md）：
        //   - 有界模式（min/max 均设）：track = `auto`（行随内容自适应），每行 cell 加
        //     `min-height:minRowHeight; max-height:maxRowHeight`（dg-cell-bounded 类，见 table.css）。
        //     不能用 `minmax(min,max)` track：grid 的 free-space 分配会把所有 minmax track 拉满到 max
        //     （因为 paddingBottom track 撑大 grid 容器→grid 有大量 free space→minmax track 全部吸满）。
        //     用 `auto` track 不吸 free space，cell 的 min/max-height 约束真实高，实测闭环正确。
        //   - 固定模式（默认）：track = `${effectiveRowHeight(i)}px`（含 sizeOf 实测闭环；
        //     measurement 跑但实测≈固定值，视觉不变）。
        if (boundedRowHeight) {
          visibleTracks.push('auto')
        } else {
          visibleTracks.push(`${effectiveRowHeight(i)}px`)
        }
        // 展开内容 track（可展开行后紧跟一条）。
        if (expandEnabled && expandState) {
          const record = dataSource[i]
          if (record !== undefined) {
            const key = getRowKey(record, rowKey)
            if (expandState.isExpandable(key)) {
              visibleTracks.push(expandState.isExpanded(key) ? '1fr' : '0fr')
            }
          }
        }
      }
      // paddingTop/paddingBottom track 用 `'auto'`，由独立的 FillerRow grid item 撑高——
      // 详见 docs/design-notes/virtualization.md 的「占位 track / FillerRow（spacer 解耦）」一节。
      bodyTracks = ['auto', ...visibleTracks, 'auto']
    } else {
      // 非虚拟下数据行间穿插展开内容 track（可展开行后插一条 0fr/1fr）。无展开时退化为 dataSource.map。
      if (expandEnabled && expandState) {
        const tracks: string[] = []
        dataSource.forEach((record, index) => {
          // 有界行高模型（非虚拟分支同款）：有界模式用 auto track + cell min/max-height。
          let baseTrack: string
          if (boundedRowHeight) {
            baseTrack = 'auto'
          } else if (typeof rowHeight === 'function') {
            baseTrack = toTrack(rowHeight(record, index)) ?? 'auto'
          } else {
            baseTrack = rowHeight !== undefined ? `${rowHeight}px` : 'auto'
          }
          tracks.push(baseTrack)
          const key = getRowKey(record, rowKey)
          if (expandState.isExpandable(key)) {
            tracks.push(expandState.isExpanded(key) ? '1fr' : '0fr')
          }
        })
        bodyTracks = tracks
      } else {
        bodyTracks = dataSource.map((record, index) => {
          // 有界行高模型（非虚拟分支同款）：有界模式用 auto track + cell min/max-height。
          if (boundedRowHeight) {
            return 'auto'
          }
          if (typeof rowHeight === 'function') {
            const v = rowHeight(record, index)
            return toTrack(v) ?? 'auto'
          }
          return rowHeight !== undefined ? `${rowHeight}px` : 'auto'
        })
      }
    }

    const gridTemplateColumns = computeGridTemplateColumns({
      leafColumns,
      resizedWidths,
      tableLayout: tableLayout ?? 'auto',
    })

    // summary 区 tracks（grid-template-rows 末尾追加，每行一条 'auto' track）。
    // summary 行高按内容自适应（'auto'），与表体行高约定无关——summary 通常是单行文本，
    // 不需要参与虚拟窗口/行高约定计算。
    const summaryTracks = summaryParsed ? summaryRowsTrack(summaryParsed.count).split(' ').filter(Boolean) : []
    // summary 区起始线号 = headerTracks + bodyTracks + 1（1-based grid line）。
    // summary 第 0 行 track 占 [summaryStartLine, summaryStartLine+1]。
    const summaryStartLine = summaryParsed
      ? headerTracks.length + bodyTracks.length + 1
      : 0

    // FillerRow（撑 paddingTop/Bottom 的独立 grid item）所在 grid-row 线号。
    //   - paddingTop track 紧跟 headerTracks：其 1-based 起始线 = headerTracks.length + 1。
    //   - paddingBottom track 是 bodyTracks 末条：起始线 = headerTracks.length + bodyTracks.length。
    //     （summaryStartLine>0 时 = summaryStartLine - 1；summaryStartLine=0 时直接由 tracks 长度算。）
    //   虚拟模式下 bodyTracks 首末恒为 'auto'（FillerRow 用 height 撑高其 auto track）。
    //   非虚拟下 bodyTracks 无 padding track（无 FillerRow），此处的线号仅虚拟场景使用。
    //   详见 docs/design-notes/virtualization.md 的「占位 track / FillerRow（spacer 解耦）」一节。
    const paddingTopLine = headerTracks.length + 1
    const paddingBottomLine = headerTracks.length + bodyTracks.length

    // 多级表头路径：关闭 auto-flow（用显式 grid-column/grid-row 定位）。
    // 单层路径：保持 grid-auto-flow:column。
    // summary 启用时强制关闭 auto-flow（用显式定位）——summary Cell 用 gridColumn/gridRow 显式定位，
    // auto-flow:column 会导致表体格 DOM 按列连续填充时与 summary Cell 的显式定位冲突。
    return {
      gridTemplateRows: [...headerTracks, ...bodyTracks, ...summaryTracks].join(' ') || 'none',
      gridTemplateColumns,
      gridAutoFlow: mode === 'multi' || summaryEnabled ? undefined : ('column' as const),
      summaryStartLine,
      paddingTopLine,
      paddingBottomLine,
    }
  }, [
    mode,
    maxDepth,
    leafColumns,
    dataSource,
    rowHeight,
    boundedRowHeight,
    minRowHeight,
    maxRowHeight,
    effectiveRowHeight,
    headerHeight,
    showHeader,
    virtualEnabled,
    virtualState,
    getRowHeight,
    resizedWidths,
    expandEnabled,
    expandState,
    rowKey,
    summaryParsed,
    summaryEnabled,
    tableLayout,
  ])

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
  const scrollMinWidth = scrollX !== undefined ? (typeof scrollX === 'number' ? `${scrollX}px` : scrollX) : undefined
  const stickyTranslateStyle: CSSProperties | null =
    stickyEnabled && stickyScrollLeft > 0
      ? {
          transform: `translateX(${-stickyScrollLeft}px)`,
          willChange: 'transform',
        }
      : null
  const gridFinalStyle: CSSProperties = scrollMinWidth
    ? { ...gridStyle, minWidth: scrollMinWidth, ...(stickyTranslateStyle ?? null) }
    : { ...gridStyle, ...(stickyTranslateStyle ?? null) }
  // 语义化 content 部位 style（合并到 grid 根容器 style）。
  const semanticContentStyle = semantic?.content?.style
  // semantic content style 合并到 grid 根 style（gridFinalStyle 之后覆盖）。
  const gridFinalStyleWithSemantic: CSSProperties = semanticContentStyle
    ? { ...gridFinalStyle, ...semanticContentStyle }
    : gridFinalStyle

  const onStickyViewportWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!stickyEnabled) return
      const maxScroll = getStickyMaxScroll(stickyViewportRef.current, gridRef.current)
      if (maxScroll <= 1) return
      const rawDelta = Math.abs(event.deltaX) > 0
        ? event.deltaX
        : event.shiftKey
          ? event.deltaY
          : 0
      if (Math.abs(rawDelta) <= 0.5) return
      const current = clampScrollLeft(stickyScrollLeft, maxScroll)
      const next = clampScrollLeft(current + rawDelta, maxScroll)
      if (next === current) return
      event.preventDefault()
      setStickyScrollLeft(next)
    },
    [stickyEnabled, stickyScrollLeft],
  )

  const gridClassName = [
    'dg-grid',
    // 语义化 content 部位 class（合并到 grid 根容器）。
    semantic?.content?.className,
    // 拖拽进行中加 dg-grid-resizing 类，禁用 grid-template-columns 过渡
    // （否则拖拽时 0.3s 过渡会与实时更新叠加产生抖动/延迟）。
    resizingKey !== null ? 'dg-grid-resizing' : undefined,
    // 有界行高模型：加标记类，CSS 据此给 .dg-cell-body 加 min/max-height（约束 auto track）。
    boundedRowHeight ? 'dg-grid-bounded' : undefined,
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
        <div className={gridClassName} style={gridFinalStyleWithSemantic} ref={gridRef}>
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
          {renderBodyCells({
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

    // 单层快速路径：grid-auto-flow:column，每列 DOM 连续。
    // 注意：虚拟模式下不会走到这里（虚拟强制 multi）。
    return (
      <div className={gridClassName} style={gridFinalStyleWithSemantic} ref={gridRef}>
        {leafColumns.map((column, colIdx) => (
          <ColumnCells<RecordType>
            key={column.key}
            column={column}
            colIdx={colIdx}
            // 表头分隔线排除：单层末列标记（对齐 antd `thead th:not(:last-child)::before`）— 详见 docs/design-notes/header.md。
            //   单层无分组，仅需末列排除；多级路径由 columnTree.markLastLeaves 算 data-group-last。
            isLastLeaf={colIdx === leafColumns.length - 1}
            dataSource={dataSource}
            rowKey={rowKey}
            showHeader={showHeader}
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
            // Table 级 locale 透传到表头格内的 FilterDropdown。
            filterLocale={filterLocale}
          />
        ))}
      </div>
    )
  }

  // 语义化 section 部位 class/style（注入到滚动容器；无 semantic 时 sectionClassName=undefined）。
  const sectionClassName = semantic?.section?.className
  const sectionStyle = semantic?.section?.style
  const mergeSectionClass = (...base: Array<string | undefined>) =>
    [...base, sectionClassName].filter(Boolean).join(' ') || undefined
  const mergeSectionStyle = (base: CSSProperties | undefined): CSSProperties | undefined => {
    if (!sectionStyle) return base
    return { ...(base ?? null), ...sectionStyle }
  }

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
        >
          {renderGrid()}
        </div>
        <StickyScrollBar
          offsetScroll={stickyOffsetScroll}
          getContainer={stickyGetContainer}
          gridRef={gridRef}
          viewportRef={stickyViewportRef}
          scrollLeft={stickyScrollLeft}
          onScrollLeftChange={setStickyScrollLeft}
        />
        {/* summary 提取到 StickyScrollBar 之后 → 横向滚动条落在 summary 上方。 */}
        {extractSummary ? (
          <div className="dg-sticky-scroll-viewport" onWheel={onStickyViewportWheel}>
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

  // 横向滚动是否启用（scroll.x）。用于决定是否附加 `dg-x-scroll` 修饰类（仅 scroll.x 无 scroll.y 时）。
  // 注意：无论 scrollXEnabled 是否为 true，非 sticky 模式下横向悬浮条始终启用——不溢出时 thumb 隐藏。
  const scrollXEnabled = scrollX !== undefined

  // sticky 模式已在上方返回；这里保留兜底，不走 FloatingScrollBar。
  if (stickyEnabled) {
    return renderGrid()
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
    virtualEnabled ? 'dg-virtual-scroll' : null,
    scrollYNonVirtual ? 'dg-fixed-header-scroll' : null,
    scrollXEnabled && !scrollYEnabled ? 'dg-x-scroll' : null,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <FloatingScrollBar
      wrapClassName={mergeSectionClass('dg-scroll-wrap')}
      wrapStyle={mergeSectionStyle(wrapBaseStyle)}
      scrollContainerClassName={containerClasses}
      scrollContainerStyle={containerStyle}
      scrollContainerRef={virtualEnabled ? virtualScrollRef : undefined}
      // 非 sticky 模式横向悬浮滚动条始终启用；不溢出时 thumb 自动隐藏（无视觉副作用）。
      horizontal={true}
    >
      {renderGrid()}
    </FloatingScrollBar>
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
