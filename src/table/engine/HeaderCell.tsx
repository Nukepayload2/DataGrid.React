/**
 * 多级表头格 + 列宽拖拽手柄。从 GridTable.tsx 抽出（执行单元 #2）。
 *
 * - `HeaderCell`：多级表头路径（grid-template-rows + 显式 grid-area 定位）的表头格组件。
 *   负责固定列 sticky / 表头纵向 sticky / corner cell 双 sticky z-index / 排序 / 筛选 /
 *   onHeaderCell+onHeaderRow 合并 / 多级表头逐行 sticky 偏移 / ellipsis 等。详见原
 *   GridTable.tsx 内的逐行注释（此处逐字搬运，未改 className 合并顺序、未动 sticky z-index、
 *   未动 try/catch 与幽灵点击防御、未改 props 解构顺序）。
 * - `ColumnResizer`：列宽拖拽手柄（叶子表头格右侧边缘）。HeaderCell 与单层路径 ColumnCells
 *   （仍在 GridTable.tsx）共用，故本文件 export。
 */
import {
  type CSSProperties,
} from 'react'
import {
  stickyHeaderCellStyle,
} from './useStickyColumns'
import { SortIndicator } from './SortIndicator'
import { FilterDropdown } from './FilterDropdown'
import type {
  Align,
  EngineHeaderCell,
  FixedSide,
} from './types'
// onHeaderCell 签名 `(column) => HTMLAttributes` 的 column 类型用 ColumnType 表达（与对外 types.ts 一致），仅 type-only。
import type { ColumnType, FilterValue } from '../types'
import {
  fixedClass,
  omitKey,
  shadowClass,
  toEllipsisTitle,
} from './cellRenderUtils'

function HeaderCell<RecordType>({
  cell,
  sticky,
  headerStickyTop,
  stickyHeaderOffset,
  headerStickyTopOffset,
  resizeEnabled,
  resizeSiblingKey,
  onResizerPointerDown,
  resizingKey,
  onSorterClick,
  onFilterApply,
  semanticHeader,
  // onHeaderRow / getPopupContainer / headerColumns。
  onHeaderRow,
  getPopupContainer,
  headerColumns,
  // Table 级 locale（透传到本表头格内的 FilterDropdown）。
  filterLocale,
}: {
  cell: EngineHeaderCell<RecordType>
  sticky?: { side: FixedSide; offset: number; isEdge: boolean }
  /**
   * 表头纵向 sticky（虚拟 + 非虚拟 scroll.y 共用）。详见 docs/design-notes/virtualization.md + sticky.md。
   *
   * `true` 时表头格额外 `position: sticky; top: 0`（相对滚动容器顶部固定，使表头不随纵向
   * 滚动消失）。z-index 提高到 4，高于表体（2）与表头横向固定（3）。
   *
   * 触发场景：
   *   - 虚拟滚动（virtual=true && scroll.y===true）：`.dg-virtual-scroll` 承载纵向滚动。
   *   - 固定表头（非 virtual && scroll.y===true）：`.dg-scroll` 承载纵向滚动（CSS 自动适应高度）。
   *
   * 与横向 sticky 共存（corner cell）：单个元素可同时 sticky left + top（浏览器原生支持；
   * antd rc-table corner cell 同款实现）。双 sticky 同时存在时 zIndex 取最高（5）> 仅纵向（4）>
   * 仅横向（3）。
   *
   * sticky prop 启用时本字段恒为 false（页面级与容器内互斥）；改由 `stickyHeaderOffset`
   * 驱动表头相对 viewport 固定（top: offsetHeader）。
   */
  headerStickyTop?: boolean
  /**
   * 表头页面级 sticky 偏移（px）。仅 `sticky` prop 启用时传入（否则 undefined）。
   *
   * `undefined`：不启用页面级 sticky（走容器内或默认无固定）。
   * `number`（含 0）：表头格 inline style 加 `position: sticky; top: <offset>px; zIndex: 4`
   * （或 corner 双 sticky 时 5），相对**页面 viewport** 固定（grid 不包 overflow 容器，无 overflow
   * 祖先拦截 sticky 上下文）。页面纵向滚动时表头钉在视口顶部 `<offset>px` 处。
   *
   * 与 `headerStickyTop` 互斥（同时启用时 sticky 优先，headerStickyTop 恒 false）。
   * 与横向 sticky 共存（corner cell 双 sticky）。
   */
  stickyHeaderOffset?: number
  /**
   * 表头纵向 sticky 的**逐行累计偏移**（px）。
   *
   * 多级表头（maxDepth>1）启用 `headerStickyTop`/`stickyHeaderOffset` 时，各表头行需**分层** sticky：
   *   - grid-row-start=1 的格 → 偏移 0
   *   - grid-row-start=2 的格 → 偏移 h1（row1 高度）
   *   - grid-row-start=N 的格 → 偏移 Σ h[0..N-2]
   * 由 `useHeaderRowHeights` 运行时测量，按 cell.gridRowStart 索引取值。未传 / 0 时退回原行为。
   * 单行表头（maxDepth=1）传 0。与 `stickyHeaderOffset`（页面级偏移）叠加：
   * sticky 多行表头同样逐行分层（top = stickyHeaderOffset + headerStickyTopOffset）。
   */
  headerStickyTopOffset?: number
  /** 是否启用列宽拖拽（仅在叶子表头格渲染 resizer）。 */
  resizeEnabled?: boolean
  /** 右侧相邻可见列 key。undefined 表示全局最后一个可见叶子列，右侧不可 resize。 */
  resizeSiblingKey?: string
  /** resizer pointerdown 回调（参数为列 key）。 */
  onResizerPointerDown?: (key: string, siblingKey?: string) => (event: React.PointerEvent<HTMLDivElement>) => void
  /** 当前正在拖拽的列 key（视觉反馈）。 */
  resizingKey?: string | null
  /** 排序点击回调（参数为列 key）。仅可排序叶子表头格响应。 */
  onSorterClick?: (columnKey: string) => void
  /** 筛选应用回调（参数：列 key + 新筛选值数组）。仅可筛选叶子表头格触发。 */
  onFilterApply?: (filterKey: string, nextFilteredValue: Array<FilterValue>) => void
  /** 语义化 header 部位（cell/row/wrapper 的 className 与 style）。 */
  semanticHeader?: import('./types').EngineSemantic['header']
  /**
   * onHeaderRow 行级 props 注入（来自 TableProps.onHeaderRow）。
   * grid 无独立 `<tr>`，引擎把 onHeaderRow 返回值透传到该表头行**所有表头格**（事件 + class + style）。
   * 未提供（undefined）时不注入。
   */
  onHeaderRow?: (
    columns: Array<unknown>,
    index: number,
  ) => import('react').HTMLAttributes<HTMLElement> | undefined
  /**
   * getPopupContainer（来自 TableProps.getPopupContainer）。
   * 作为该表头格内 FilterDropdown 的默认挂载容器（列级 filterDropdownProps.getPopupContainer 优先）。
   */
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement
  /**
   * onHeaderRow(columns, index) 的 columns 参数（顶层列 raw 数组）。
   * 由 GridTableInner 计算后传入（多级表头简化为顶层列）。
   */
  headerColumns?: Array<unknown>
  /** Table 级 locale（透传到本表头格内的 FilterDropdown）。 */
  filterLocale?: import('./types').EngineTableProps['filterLocale']
}) {
  // onHeaderCell 返回值（表头格 props 注入）。
  //   仅叶子表头格消费（cell.onHeaderCell 仅叶子格有值；分组格恒 undefined）。返回值整体合并到表头格 div
  //   的 props（className/style/onClick/...）。与 antd useSorter.tsx:217-219 同款合并逻辑
  //   （`column.onHeaderCell?.(col) || {}`）。
  //   try/catch 防御用户函数抛错（与 onCell 同款保护）。
  let onHeaderCellProps: import('react').HTMLAttributes<HTMLElement> | undefined
  if (cell.isLeaf && cell.onHeaderCell) {
    try {
      const raw = cell.raw as ColumnType | undefined
      onHeaderCellProps = cell.onHeaderCell(raw as unknown as ColumnType, cell.gridRowStart - 1)
    } catch {
      onHeaderCellProps = undefined
    }
  }
  // onHeaderRow 返回值（行级 props 注入）。表头行号 = cell.gridRowStart - 1（0-based）。
  //   columns 参数用 headerColumns（顶层列 raw）；单层表头 = 全部 columns。
  let onHeaderRowProps: import('react').HTMLAttributes<HTMLElement> | undefined
  if (onHeaderRow) {
    try {
      onHeaderRowProps = onHeaderRow(headerColumns ?? [], cell.gridRowStart - 1)
    } catch {
      onHeaderRowProps = undefined
    }
  }
  // 合并 cell 级 + 行级 className（cell.onHeaderCell.className + cell.className + 行 onHeaderRow.className）。
  // 顺序：基础 dg 类 → semantic.cell → cell.className（列级）→ onHeaderCell.className（单元格级）
  //   → onHeaderRow.className（行级，最后合并保证行级最优先）。
  const mergedHeaderExtraClass = [
    cell.className,
    onHeaderCellProps?.className,
    onHeaderRowProps?.className,
  ]
    .filter(Boolean)
    .join(' ') || undefined
  // 合并 cell 级 + 行级 style（后者覆盖前者同名字段）。
  const mergedHeaderExtraStyle: CSSProperties = {
    ...(cell.style ?? null),
    ...(onHeaderCellProps?.style ?? null),
    ...(onHeaderRowProps?.style ?? null),
  }
  // 提取事件 props（onHeaderCell + onHeaderRow 合并；行级优先覆盖单元格级同名字段）。
  //   仅取 on* 开头的事件 handler（排除 className/style 已单独合并；其余 onXxx 透传到 div）。
  const headerEventProps: Record<string, unknown> = {}
  for (const src of [onHeaderCellProps, onHeaderRowProps]) {
    if (!src) continue
    for (const k of Object.keys(src)) {
      if (k === 'className' || k === 'style') continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      headerEventProps[k] = (src as any)[k]
    }
  }
  // 分组表头格默认居中（与 antd 多级表头一致）；叶子表头格保留列对齐。
  // 表头横向合并格（headerColSpan>1）也居中（跨多列的表头，与 antd <th colspan> 一致）。
  const headerSpan = cell.headerColSpan ?? 1
  const selfAlign: Align | undefined = cell.isLeaf
    ? headerSpan > 1
      ? 'center'
      : cell.align
    : 'center'
  // 合并 sticky 样式：横向（左/右）+ 纵向 top:0（容器内）或 top:offsetHeader（页面级）。
  // 详见 docs/design-notes/fixed-column.md + sticky.md。
  const horizontalSticky = stickyHeaderCellStyle(sticky)
  const hasHorizontalSticky = !!sticky?.side // 固定列（左/右）
  // stickyHeaderOffset（页面级，相对 viewport）优先于 headerStickyTop（容器内，top:0）。
  //   两者互斥（sticky 启用时 headerStickyTop 恒 false），这里防御性取优先级。
  // 叠加逐行偏移 headerStickyTopOffset——多级表头各表头行按 gridRowStart 分层 sticky
  //   （row1 top:0、row2 top:h1、rowN top:Σh[0..N-2]），避免多行表头全堆叠在 top:0 重叠。
  //   sticky 多行表头同样逐行分层（top = stickyHeaderOffset + headerStickyTopOffset）。
  //   单行表头 headerStickyTopOffset=0。
  const rowTopOffset = headerStickyTopOffset ?? 0
  const verticalSticky: CSSProperties = stickyHeaderOffset !== undefined
    ? { position: 'sticky', top: `${stickyHeaderOffset + rowTopOffset}px`, zIndex: 4 }
    : headerStickyTop
      ? { position: 'sticky', top: `${rowTopOffset}px`, zIndex: 4 }
      : {}
  const hasVerticalSticky = stickyHeaderOffset !== undefined || !!headerStickyTop
  // corner cell（表头 × 固定列交叉格，双 sticky）：横向+纵向同时存在时，该格需要
  //   **最高 z-index**（5），保证横向滚动时始终盖住"只纵向 sticky 的中间表头格"（z-index 4）
  //   与"只横向 sticky 的固定列表头格"（z-index 3）。
  //   修复 bug：原实现 corner cell 取纵向 z-index（4），与中间表头格（4）相同，
  //   DOM 后渲染的中间表头格横向滚动时会盖住 corner cell。
  //   z-index 层级：普通(auto) < 表体固定列(2) < 表头固定列(3) < 表头顶部(4) < corner 双 sticky(5)。
  const cornerZIndex = 5
  const mergedSticky: CSSProperties = (() => {
    const merged: CSSProperties = { ...horizontalSticky, ...verticalSticky }
    if (hasHorizontalSticky && hasVerticalSticky) {
      merged.zIndex = cornerZIndex
    }
    return merged
  })()
  // 该表头格是否可排序（仅叶子表头格；分组格无排序）。
  const sortable = cell.isLeaf && cell.sortable === true && !cell.hidden
  // 当前排序态（null/ascend/descend）；仅可排序格有意义。
  const sortOrder = sortable ? (cell.sortOrder ?? null) : null
  // 是否为当前激活排序列（order 非 null）→ 加 dg-column-sort 类（表头/表体背景变淡灰）。
  const isSorted = sortable && sortOrder !== null
  // 该表头格是否可筛选（仅叶子表头格；分组格无筛选）。
  // filterable 标志由列树派生（useFilter.isFilterable）；但防御性兜底：即便 cell.filterable 未置位，
  // 只要 cell.filterDropdown 存在 / filters 已定义（含空数组）/ onFilter 存在也视为可筛选
  // （对齐 antd `useFilter/index.tsx:38`：filters || filterDropdown || onFilter 任一即 filterable；
  //   `filters: []` 是 truthy → 画漏斗 + 空面板走 renderEmpty）。
  const filterable =
    cell.isLeaf &&
    !cell.hidden &&
    (cell.filterable === true ||
      (cell.filterDropdown !== undefined && cell.filterDropdown !== null) ||
      !!cell.filters)
  // 表头格内部是否需要"右侧操作区"（sorter caret / filter 漏斗）。
  // sortable 或 filterable 任一为 true → 用 dg-column-sorters flex 容器（title + 右侧图标）。
  const hasActions = sortable || filterable
  // 表头 ellipsis（仅叶子表头格；对齐 antd：长 title 省略 + hover 显示完整标题）。详见 docs/design-notes/ellipsis.md。
  //   - cell.ellipsis=true 且无右侧操作区（非 sortable/filterable）→ 单 .dg-cell-inner 容器，
  //     该容器加 ellipsis 类 + title。
  //   - 有右侧操作区（sortable/filterable）→ 用 .dg-column-sorters 容器（title 在 .dg-column-title
  //     子元素里）；ellipsis 作用于 .dg-column-title（CSS 选择器见 table.css）。title 仍文本化加到
  //     .dg-column-title 上（hover 标题文字提示完整文案）。
  //   注：分组表头格（cell.isLeaf=false）不消费 ellipsis（columnTree 已置 undefined）。
  //   showTitle:false 时不加 native title（让 render/外部 Tooltip 接管）——与表体同款门。
  const headerEllipsis = cell.isLeaf && cell.ellipsis === true
  const headerTitle =
    headerEllipsis && cell.showTitle !== false ? toEllipsisTitle(cell.title) : undefined
  return (
    <div
      className={[
        'dg-cell',
        'dg-cell-header',
        cell.isLeaf ? undefined : 'dg-cell-header-group',
        fixedClass(cell.fixed),
        shadowClass(sticky),
        // 隐藏叶子列表头格加 dg-cell-hidden（详见 docs/design-notes/hidden-column.md）。
        cell.hidden ? 'dg-cell-hidden' : undefined,
        // 叶子表头格 ellipsis 加 dg-cell-ellipsis（作用于 .dg-cell-inner / .dg-column-title）。
        headerEllipsis ? 'dg-cell-ellipsis' : undefined,
        // 表头纵向 sticky：补不透明背景（防止表体透过）+ 配合 inline position/top/zIndex。
        // stickyHeaderOffset（页面级）同样需要不透明背景（grid 不包容器，表头悬浮于表体之上）。
        (headerStickyTop || stickyHeaderOffset !== undefined) ? 'dg-cell-header-vsticky' : undefined,
        // 可排序列表头格加 dg-column-has-sorters（cursor:pointer + hover 背景）。
        sortable ? 'dg-column-has-sorters' : undefined,
        // 可筛选列表头格加 dg-column-has-filter（hover 背景 + 漏斗区域视觉提示）。
        filterable ? 'dg-column-has-filter' : undefined,
        // 当前排序列表头格加 dg-column-sort（淡灰背景，对齐 antd tableHeaderSortBg）。
        isSorted ? 'dg-column-sort' : undefined,
        // 语义化 header.cell 部位 className（合并）。
        semanticHeader?.className?.cell,
        // 语义化 header.row 部位 className（行级 class 透传到该行所有表头格，
        //   与 body.row 对称——grid 无 tr，row class 分发到该行所有表头格）。
        semanticHeader?.className?.row,
        // cell.className（列级）+ onHeaderCell.className（格级）
        //   + onHeaderRow.className（行级）合并（顺序见 mergedHeaderExtraClass 注释）。
        mergedHeaderExtraClass,
      ]
        .filter(Boolean)
        .join(' ')}
      // aria-sort：对齐 antd useSorter.tsx:246-248——仅当该列表头格可排序
      //   且 sortOrder 非 null 时设 aria-sort（ascending/descending）；未排序时不设（与 antd
      //   一致——antd 也是 sortOrder 真值才设）。屏幕阅读器据此播报当前列排序方向。
      aria-sort={
        sortable && sortOrder === 'ascend'
          ? 'ascending'
          : sortable && sortOrder === 'descend'
            ? 'descending'
            : undefined
      }
      data-align={selfAlign ?? undefined}
      data-leaf={cell.isLeaf ? '1' : '0'}
      data-leaf-index={cell.isLeaf && cell.leafIndex !== undefined ? String(cell.leafIndex) : undefined}
      data-column-key={cell.isLeaf ? cell.key : undefined}
      // 表头分隔线排除标记（对齐 antd `thead th:not(:last-child)::before`）— 详见 docs/design-notes/header.md：
      //   data-leaf-last = 全局末列；data-group-last = 分组最右叶子（多级表头分组右边界）。
      //   由 columnTree.markLastLeaves 算出（见该函数注释）；CSS ::before 用 :not() 排除。
      data-leaf-last={cell.isLeaf && cell.isLastLeaf ? '' : undefined}
      data-group-last={cell.isLeaf && cell.isGroupLastLeaf ? '' : undefined}
      // 叶子表头格跨列数（>=2 时标记）。用于 CSS ::before 分割竖线排除跨列表头格
      //   （对齐 antd `thead th:not([colspan])::before`——跨列表头格无内部分割线）。
      //   headerColSpan 由 columnTree.applyHeaderColSpan 设置。
      data-header-colspan={
        cell.isLeaf && cell.headerColSpan !== undefined && cell.headerColSpan >= 2
          ? String(cell.headerColSpan)
          : undefined
      }
      data-sorter-order={isSorted ? (sortOrder ?? undefined) : undefined}
      // showSorterTooltip（非 false）→ hover 提示。简单实现为原生 title（对齐 antd 默认 locale：
      //   ascend → "Click to sort descending"，descend → "Cancel sorting"，null → "Click to sort ascending"）。
      //   完整 Tooltip + target 区分（full-header / sorter-icon）留后续视觉打磨。
      //   ellipsis 冲突处理：表头格 ellipsis 启用时，title 用于显示完整表头文案（对齐 antd：antd 用
      //   独立 Tooltip 显示排序提示、title 属性显示单元格内容，两者不冲突；data-grid 用原生 title
      //   只能取一，ellipsis 时优先 title=完整文案，排序提示让位——与 antd 视觉差异：少一个排序提示
      //   tooltip，但 ellipsis 的核心"hover 看完整文案"行为保留）。非 ellipsis 排序列保持原排序提示。
      title={
        headerEllipsis
          ? headerTitle
          : sortable && cell.showSorterTooltip !== false
            ? sortOrder === 'ascend'
              ? filterLocale?.triggerDesc ?? 'Click to sort descending'
              : sortOrder === 'descend'
                ? filterLocale?.cancelSort ?? 'Click to cancel sorting'
                : filterLocale?.triggerAsc ?? 'Click to sort ascending'
            : undefined
      }
      style={{
        gridColumn: `${cell.gridColumnStart} / ${cell.gridColumnEnd}`,
        gridRow: `${cell.gridRowStart} / ${cell.gridRowEnd}`,
        ...(selfAlign ? { textAlign: selfAlign } : null),
        ...mergedSticky,
        // 语义化 header.cell 部位 style（合并覆盖同名字段）。
        ...(semanticHeader?.style?.cell ?? null),
        // 语义化 header.row 部位 style（行级 style 透传到该行所有表头格，与 body.row 对称）。
        ...(semanticHeader?.style?.row ?? null),
        // cell.style + onHeaderCell.style + onHeaderRow.style 合并
        //   （后者覆盖前者同名字段；在 semantic 之后，保证用户注入最优先）。
        ...mergedHeaderExtraStyle,
      }}
      // 可排序列表头格点击触发排序循环。
      // 注意：filter trigger（FilterDropdown）内部已 stopPropagation，点击漏斗不会触发排序。
      onClick={
        sortable && onSorterClick
          ? (e) => {
              // 避免 resizer 手柄点击 / 链接冒泡误触发排序。
              // resizer 自身有 onClick stopPropagation，这里无需额外处理；
              // 但表头格内若有 <a> 等可点击元素，仍会冒泡——antd 行为：点击表头任意位置都触发排序，
              // 这里与 antd 一致（整表头格都是排序点击区）。
              //
              // 幽灵点击防御：仅当点击事件 target 真正落在本表头格内部时才触发排序。
              //   antd Dropdown 弹出层 portaled 到 body，正常情况下点击 OK/Checkbox 不会冒泡到表头格；
              //   但 React 17+ 根委托 + 弹出层在 click 分发途中卸载的边界下，残余 click 可能落到表头格
              //   坐标处（target 仍是弹出层内的元素）。用 currentTarget.contains(target) 判定可彻底
              //   切断这种"幽灵点击"误触发排序。
              if (!e.currentTarget.contains(e.target as Node)) return
              e.stopPropagation()
              // 嵌套叶子排序修复：传 sortKey（column.key ?? dataIndex，如 `'age'`）而非 key
              //   （完整路径如 `Other.Age`）——useSorter.onSorterClick 按 sortKey 查列，传 key 会让
              //   多级表头嵌套叶子的 columns.find 失败 → 不排序。sortKey 由 flattenHeaderCells 从
              //   node.raw 解析填入；顶层叶子 sortKey 与 key 相等。
              onSorterClick((cell.sortKey ?? cell.key) as string)
              // 合并后的 onClick（onHeaderCell + onHeaderRow）在排序之后触发
              //   （与 antd 表头 onClick 行为一致：排序 + 用户自定义 click 都执行）。
              ;(headerEventProps.onClick as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)?.(e)
            }
          : (headerEventProps.onClick as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)
      }
      // 其余事件 props（onDoubleClick/onMouseEnter/...）透传到表头格 div。
      //   onClick 已单独合并到排序逻辑（上方），这里跳过 onClick 避免重复触发。
      {...omitKey(headerEventProps, 'onClick')}
    >
      {hasActions ? (
        // 可排序或可筛选列用 dg-column-sorters 容器（flex space-between：title + 右侧操作区）。
        // 右侧操作区含 sorter caret + filter 漏斗，对齐 antd 同时有 sorter+filter 的列表头布局。
        // ellipsis 作用于 .dg-column-title（CSS `.dg-cell.dg-cell-ellipsis .dg-column-title`）。
        <div className="dg-column-sorters">
          <div
            className="dg-column-title"
            // ellipsis 列 hover 表头文字提示完整标题（非 ellipsis 列无 title）。
            title={headerTitle}
          >
            {cell.title ?? null}
          </div>
          <div className="dg-column-actions">
            {sortable ? (
              <SortIndicator sortOrder={sortOrder} priority={cell.sortPriority} />
            ) : null}
            {filterable && onFilterApply ? (
              <FilterDropdown
                filters={cell.filters ?? []}
                filterMultiple={cell.filterMultiple ?? true}
                filteredValue={cell.filteredValue ?? null}
                filterOnClose={cell.filterOnClose ?? true}
                onApply={(next) => onFilterApply((cell.filterKey ?? cell.key) as string, next)}
                customDropdown={cell.filterDropdown}
                customIcon={cell.filterIcon}
                dropdownProps={cell.filterDropdownProps}
                filterSearch={cell.filterSearch}
                filterMode={cell.filterMode}
                // Table 级 getPopupContainer 作为筛选下拉默认挂载容器。
                getPopupContainer={getPopupContainer}
                // Table 级 locale 透传到 FilterDropdown。
                locale={filterLocale}
              />
            ) : null}
          </div>
        </div>
      ) : (
        <div
          className="dg-cell-inner"
          // ellipsis 列 hover 表头提示完整标题（非 ellipsis 列无 title）。
          title={headerTitle}
        >
          {cell.title ?? null}
        </div>
      )}
      {/* 列宽拖拽 resizer：仅在叶子表头格 + 非隐藏列 + resizeEnabled 时渲染。
          分组表头格（isLeaf=false）无 resizer；隐藏列（cell.hidden）0fr track 无可调宽度。 */}
      {resizeEnabled && cell.isLeaf && !cell.hidden && resizeSiblingKey && onResizerPointerDown ? (
        <ColumnResizer
          columnKey={cell.key}
          active={resizingKey === cell.key}
          onPointerDown={onResizerPointerDown(cell.key, resizeSiblingKey)}
        />
      ) : null}
    </div>
  )
}

/**
 * 列宽拖拽 resizer 手柄。详见 docs/design-notes/column-width.md + `useColumnResize.ts` 文件头注释。
 *
 * 渲染在叶子表头格**右侧边缘**（绝对定位 `inset-inline-end:0`），默认透明且 pointer-events:none，
 * 表头 hover 时接收事件。pointerdown 由 `useColumnResize.onPointerDown(key)` 处理
 * （setPointerCapture + 原生 move/up 监听 → 实时改 resizedWidths → 重算 grid-template-columns）。
 *
 * 仅在 `resizeEnabled === true` 且**非隐藏列**时渲染（隐藏列 0fr track 无可调宽度）。
 * 分组表头格不渲染 resizer（无对应单一叶子列）。
 */
export function ColumnResizer({
  columnKey,
  active,
  onPointerDown,
}: {
  columnKey: string
  /** 是否正在拖拽该列（加 dg-resizer-active，保持 pointer 事件）。 */
  active: boolean
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
}) {
  return (
    <div
      className={['dg-resizer', active ? 'dg-resizer-active' : undefined]
        .filter(Boolean)
        .join(' ')}
      // pointerdown 触发拖拽（useColumnResize 内部 setPointerCapture + 注册 move/up）。
      onPointerDown={onPointerDown}
      // 阻止 click 冒泡到表头格（避免触发后续排序等 header click 交互）。
      onClick={(e) => e.stopPropagation()}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize column"
      data-column-key={columnKey}
    />
  )
}

export { HeaderCell }
