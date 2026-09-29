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
import { SortIndicator } from './SortIndicator'
import { FilterDropdown } from './FilterDropdown'
import type {
  EngineAlign,
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
// 表头格 className/style/event 合并 + sticky 合并纯函数簇（与 FlatColumnCells 共用，抽到 utils 便于单测 + 去重）。
import {
  mergeHeaderEventProps,
  mergeHeaderExtraClass,
  mergeHeaderExtraStyle,
  mergeHeaderStickyStyle,
} from './headerCellUtils'

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
  // Table 级 locale（FilterDropdown/排序 title）+ a11y locale（global 段 → aria-description）。
  filterLocale, a11yLocale,
}: {
  cell: EngineHeaderCell<RecordType>
  sticky?: { side: FixedSide; offset: number; isEdge: boolean }
  /**
   * 表头纵向 sticky（虚拟 + 非虚拟 scroll.y 共用）。详见 docs/features/scrolling/virtualization.md + docs/features/layout/sticky.md。
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
   * （或 corner 双 sticky 时 5），相对**页面 viewport** 固定（grid 包在 `overflow: clip` 视口里，
   * 而 clip 不建滚动容器 ⇒ 无 overflow 祖先拦截 sticky 上下文）。页面纵向滚动时表头钉在视口顶部 `<offset>px` 处。
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
  /** Table 级 locale（FilterDropdown/排序 title）+ a11y locale（表头 aria-description）。 */
  filterLocale?: import('./types').EngineTableProps['filterLocale']; a11yLocale?: import('./types').EngineTableProps['a11yLocale']
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
  const mergedHeaderExtraClass = mergeHeaderExtraClass(
    cell.className,
    onHeaderCellProps?.className,
    onHeaderRowProps?.className,
  )
  // 合并 cell 级 + 行级 style（后者覆盖前者同名字段）。
  const mergedHeaderExtraStyle = mergeHeaderExtraStyle(
    cell.style,
    onHeaderCellProps?.style,
    onHeaderRowProps?.style,
  )
  // 提取事件 props（onHeaderCell + onHeaderRow 合并；行级优先覆盖单元格级同名字段）。
  //   仅取 on* 开头的事件 handler（排除 className/style 已单独合并；其余 onXxx 透传到 div）。
  const headerEventProps = mergeHeaderEventProps([onHeaderCellProps, onHeaderRowProps])
  // 用户注入的 onKeyDown（onHeaderCell / onHeaderRow 两条来源，已由上面合并）。可排序格按 Enter
  //   触发排序时**必须链式调用它**、不能覆盖——antd 同款：useSorter.js:155 取 originOKeyDown、
  //   :173 `originOKeyDown?.(event)`。onClick 的处理方式一致（见下方排序分支末尾）。
  const userHeaderKeyDown = headerEventProps.onKeyDown as
    | ((e: React.KeyboardEvent<HTMLElement>) => void)
    | undefined
  // 分组表头格默认居中（与 antd 多级表头一致）；叶子表头格保留列对齐。
  // 表头横向合并格（headerColSpan>1）也居中（跨多列的表头，与 antd <th colspan> 一致）。
  const headerSpan = cell.headerColSpan ?? 1
  const selfAlign: EngineAlign | undefined = cell.isLeaf
    ? headerSpan > 1
      ? 'center'
      : cell.align
    : 'center'
  // 合并 sticky 样式：横向（左/右）+ 纵向 top:0（容器内）或 top:offsetHeader（页面级）。
  //   详细语义（含 corner cell 双 sticky 取最高 z-index=5 的修复、逐行偏移 headerStickyTopOffset）
  //   详见 headerCellUtils.ts:mergeHeaderStickyStyle + docs/features/columns/fixed-column.md + docs/features/layout/sticky.md。
  const mergedSticky = mergeHeaderStickyStyle(
    sticky,
    stickyHeaderOffset,
    headerStickyTop,
    headerStickyTopOffset,
  )
  // 该表头格是否可排序（仅叶子表头格；分组格无排序）。
  const sortable = cell.isLeaf && cell.sortable === true && !cell.hidden
  // 当前排序态（null/ascend/descend）；仅可排序格有意义。
  const sortOrder = sortable ? (cell.sortOrder ?? null) : null
  // 是否为当前激活排序列（order 非 null）→ 加 dg-column-sort 类（表头/表体背景变淡灰）。
  const isSorted = sortable && sortOrder !== null
  // 该表头格是否可筛选（19-A 之后：**叶子格与分组格都可以是漏斗宿主**）。
  //   依据 antd@6.4.4 `es/table/hooks/useFilter/index.js`：`getMergedColumns:151-156` 保留分组节点
  //   本身、`injectFilter:42-85` 把漏斗挂在**该列自己的** title 上 ⇒ 分组表头格同样是宿主。
  //   此前用 `cell.isLeaf` 收口，是「分组列筛选静默失效」的最后一环（探针 A3：dg 连触发器都没有）。
  // filterable 标志由列树派生（engine/columnTree.ts flattenHeaderCells，与 useFilter.isFilterable
  //   同一判据）；这里保留防御性兜底：即便 cell.filterable 未置位，只要 cell.filterDropdown 存在 /
  //   filters 已定义（含空数组）也视为可筛选（对齐仓库既有的三条件放宽口径——
  //   `filters || filterDropdown || onFilter` 任一即画漏斗；`filters: []` 是 truthy →
  //   画漏斗 + 空面板走 renderEmpty）。⚠ 判据本批**未改**，只扩了宿主面（差异登记见步骤 49 日志 §7）。
  const filterable =
    !cell.hidden &&
    (cell.filterable === true ||
      (cell.filterDropdown !== undefined && cell.filterDropdown !== null) ||
      !!cell.filters)
  // 表头格内部是否需要"右侧操作区"（sorter caret / filter 漏斗）。
  // sortable 或 filterable 任一为 true → 用 dg-column-sorters flex 容器（title + 右侧图标）。
  const hasActions = sortable || filterable
  // 表头 ellipsis（仅叶子表头格；对齐 antd：长 title 省略 + hover 显示完整标题）。详见 docs/features/display/ellipsis.md。
  //   - cell.ellipsis=true 且无右侧操作区（非 sortable/filterable）→ 单 .dg-cell-inner 容器加 ellipsis 类 + title；
  //     有右侧操作区 → .dg-column-sorters 容器（title 在 .dg-column-title 子元素里），ellipsis 与文本化 native
  //     title 都作用于 .dg-column-title（CSS 选择器见 table.css；hover 提示完整文案）。
  //   注：分组表头格（cell.isLeaf=false）不消费 ellipsis（columnTree 已置 undefined）；showTitle:false 时不加
  //     native title（让 render/外部 Tooltip 接管）——与表体同款门。
  // 【函数式 title】本层把 title 原样当 React child ⇒ 传函数时**渲染为空且不抛错**（框架只写一条按父组件名去重
  //   的 console 错误），且 toEllipsisTitle 对函数返回 undefined ⇒ headerTitle 落空、原生 title 同档丢失；告警不在这里发（判据在归一层 warnFunctionTitleOnce，前缀/去重/环境门在出口 `src/table/devWarn.ts`）。
  const headerEllipsis = cell.isLeaf && cell.ellipsis === true
  const headerTitle =
    headerEllipsis && cell.showTitle !== false ? toEllipsisTitle(cell.title) : undefined
  return (
    <div
      className={[
        'dg-cell',
        'ant-table-cell',
        'dg-cell-header',
        cell.isLeaf ? undefined : 'dg-cell-header-group',
        fixedClass(cell.fixed),
        shadowClass(sticky),
        // 隐藏叶子列表头格加 dg-cell-hidden（详见 docs/features/columns/hidden-column.md）。
        cell.hidden ? 'dg-cell-hidden' : undefined,
        // 叶子表头格 ellipsis 加 dg-cell-ellipsis（作用于 .dg-cell-inner / .dg-column-title）。
        headerEllipsis ? 'dg-cell-ellipsis' : undefined,
        // 表头纵向 sticky：补不透明背景（防止表体透过）+ 配合 inline position/top/zIndex。
        // stickyHeaderOffset（页面级）同样需要不透明背景（grid 不包容器，表头悬浮于表体之上）。
        (headerStickyTop || stickyHeaderOffset !== undefined) ? 'dg-cell-header-vsticky' : undefined,
        // 可排序列表头格加 dg-column-has-sorters（cursor:pointer + hover 背景）。
        sortable ? 'dg-column-has-sorters ant-table-column-has-sorters' : undefined,
        // 可筛选列表头格加 dg-column-has-filter（hover 背景 + 漏斗区域视觉提示）。
        filterable ? 'dg-column-has-filter' : undefined,
        // 当前排序列表头格加 dg-column-sort（淡灰背景，对齐 antd tableHeaderSortBg）。
        isSorted ? 'dg-column-sort ant-table-column-sort' : undefined,
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
      // 【刻意不加】antd useSorter.js:184 的 `aria-label`（值 = displayTitle）：
      //   antd 把它落在 <th>（隐式 role=columnheader）上合法；本项目两条表头路径的格子元素
      //   都是**无 role 的 <div>**（探针读数 tag=DIV / role=null，祖先链 .dg-grid → .dg-wrapper
      //   全程无 role，故 axe 也不会因「祖先 widget role」短路）。axe-core 4.13 的标准表把 div
      //   记为 namingProhibited（axe.js:14036-14041），listProhibitedAttrs 因此对本格返回
      //   ['aria-label','aria-labelledby']（axe.js:27944-27960）。探针实测 axe 对该格的
      //   aria-prohibited-attr 判定：messageKey='noRoleSingular'、data.role=null、
      //   prohibited=['aria-label']——即属性本身被判**禁止**，只是当格内有文本时降级为
      //   needs-review（incomplete，impact=serious，"aria-label attribute is not well supported
      //   on a div with no valid role attribute"），把格内子树文本清空后同一节点直接落
      //   **violations**（"aria-label attribute cannot be used…"）。补 role 合法化会立刻转
      //   aria-required-parent（探针实测）＝用户已裁定本轮不修的 L3 ARIA 链边界。
      //   对应保留 skip 的用例：Table.sorter.test.tsx 的 'should have aria-label if the column
      //   is sortable and is not sorted'。
      // 【已接线】antd useSorter.js:183 的 `aria-description`（本批 BAT-20）：axe 对它判 pass
      //   （"ARIA attribute is allowed"，同批探针复测）；当年唯一阻塞是「值在 locale 的 **global**
      //   段、表头只收到 Table 段」⇒ 按参照同形补兄弟通道：compat/locale.ts A11yLocale →
      //   Table.tsx mergedA11yLocale → GridTable.tsx a11yLocale → 本文件与 FlatColumnCells.tsx（成对）。
      //   写入点在下方 tabIndex 那条 spread 内——必须在用户 onHeaderCell spread **之后**（参照 :153
      //   以用户结果为底、:183 再赋值 ⇒ 计算值覆盖用户值，locale 缺值时连用户值也不写）。缺 sortable
      //   **不写该属性**、禁止硬编码文案（缺口 #19 判据）；原 skip 那条已转直测。
      data-align={selfAlign ?? undefined}
      data-leaf={cell.isLeaf ? '1' : '0'}
      data-leaf-index={cell.isLeaf && cell.leafIndex !== undefined ? String(cell.leafIndex) : undefined}
      data-column-key={cell.isLeaf ? cell.key : undefined}
      // 表头分隔线排除标记（对齐 antd `thead th:not(:last-child)::before`）— 详见 docs/features/layout/header-and-span.md：
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
      // showSorterTooltip（非 false）→ hover 提示。简单实现为原生 title：文案取 Table 级 locale
      //   （ascend → triggerDesc，descend → cancelSort，null → triggerAsc），未提供时回退
      //   antd en_US 默认 locale 的同款英文（"Click to sort descending" / "Click to cancel sorting"
      //   / "Click to sort ascending"）。单层 flat 路径同款表达式见 FlatColumnCells.tsx。
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
      // 键盘可达性（对齐 antd useSorter.js:165-176 的 cell.onKeyDown + :185 的 cell.tabIndex = 0）。
      //   ⚠️ 单层快速路径（FlatColumnCells.tsx 的表头格）必须与本文件**成对**实现：只改一边就是
      //   缺口 #19（同配置两条渲染路径行为不同）的键盘版——多级能按 Enter 排序、单层不能。
      //   Enter 的方向循环复用点击那一条 onSorterClick（内部走 sorterUtils.nextSortDirection），
      //   不另造方向逻辑，故键盘序列与鼠标序列逐值相同、onChange 的 sorter 参数也相同。
      //   Enter 判据：antd 只认 `event.keyCode === KeyCode.ENTER`（useSorter.js:166）；这里额外认
      //   `event.key === 'Enter'`——jsdom 下 `fireEvent.keyDown(el, { key: 'Enter' })` 的 keyCode
      //   恒为 0（探针实测 keydown-event-shapes 读数），只认 keyCode 会让这条链路在测试里不可复现。
      //   真实浏览器两者同真，覆盖面不小于 antd。
      //   `e.target === e.currentTarget` 门：筛选面板由 Dropdown portal 出 DOM，但 React 仍沿
      //   **组件树**把 keydown 冒泡到本格，若不设门就会「在筛选面板里按 Enter → 顺带排序」，
      //   正是 antd issue 38579（对应用例 'should not sort records when press enter in filter dropdown'）。
      //   与 antd 一样不调 stopPropagation（用户注在祖先上的 onKeyDown 不受本分支影响）。
      onKeyDown={
        sortable && onSorterClick
          ? (e) => {
              if ((e.key === 'Enter' || e.keyCode === 13) && e.target === e.currentTarget) {
                onSorterClick((cell.sortKey ?? cell.key) as string)
              }
              // 用户自带 onKeyDown 恒链式调用（含非 Enter 键、面板冒泡的 keydown），不被排序分支吞掉。
              userHeaderKeyDown?.(e)
            }
          : userHeaderKeyDown
      }
      // 其余事件 props（onDoubleClick/onMouseEnter/...）透传到表头格 div。
      //   onClick / onKeyDown 已单独合并到排序逻辑（上方），这里跳过避免覆盖排序分支。
      {...omitKey(omitKey(headerEventProps, 'onClick'), 'onKeyDown')}
      // 可排序表头格的 a11y 注入（antd useSorter.js:185 `cell.tabIndex = 0` + :183 `cell['aria-description']
      //   = a11yLocale?.sortable`，两条同在 :74 `if (newColumn.sorter)` 门内、都盖在用户 onHeaderCell 结果
      //   之上 ⇒ 必须放在上方 spread 之后）。tabIndex 覆盖用户注入值；aria-description 取 locale **global**
      //   段、缺值即不写（禁硬编码文案＝缺口 #19）；非可排序列两者都不注入。axe 实测两属性零违规。
      {...(sortable ? { tabIndex: 0, 'aria-description': a11yLocale?.sortable } : null)}
    >
      {hasActions ? (
        // 可排序或可筛选列用 dg-column-sorters 容器（flex space-between：title + 右侧操作区）。
        // 右侧操作区含 sorter caret + filter 漏斗，对齐 antd 同时有 sorter+filter 的列表头布局。
        // ellipsis 作用于 .dg-column-title（CSS `.dg-cell.dg-cell-ellipsis .dg-column-title`）。
        <div className="dg-column-sorters ant-table-column-sorters">
          <div
            className="dg-column-title ant-table-column-title"
            // ellipsis 列 hover 表头文字提示完整标题（非 ellipsis 列无 title）。
            title={headerTitle}
          >
            {cell.title ?? null}
          </div>
          <div className="dg-column-actions">
            {sortable ? (
              cell.sortIcon ? (
                cell.sortIcon({ sortOrder })
              ) : (
                <SortIndicator
                  sortOrder={sortOrder}
                  priority={cell.sortPriority}
                  // 生效方向（23-A 端到端）。BAT-25 25-D 起 `EngineHeaderCell` 正式带 `sortDirections`
                  // 字段（声明 `engineTypes.ts` 的 EngineHeaderCell、生产点 `columnTree.ts` 的
                  // flattenHeaderCells 叶子分支），本处直接读 `cell.sortDirections`，与单层路径
                  // `FlatColumnCells` 的 `column.sortDirections`（collectLeaves 透传）**读同名对称字段**，
                  // 不再反向掏 `cell.node`。两侧透传的都是 `columnAdapter.toEngineColumns` 里
                  // `col.sortDirections ?? tableSortDirections` 合并后的**同一个节点值** ⇒ 判据只有一份实现。
                  // 零行为变化：`sortable` 门（`cell.isLeaf && cell.sortable && !cell.hidden`）使本分支
                  // 只在叶子表头格执行，而 flattenHeaderCells 对叶子格填的正是 `node.sortDirections`
                  // （分组格 undefined，但分组格走不到这一支）——与改前的 `cell.node?.sortDirections` 同值。
                  sortDirections={cell.sortDirections}
                />
              )
            ) : null}
            {filterable && onFilterApply ? (
              <FilterDropdown
                filters={cell.filters ?? []}
                filterMultiple={cell.filterMultiple ?? true}
                filteredValue={cell.filteredValue ?? null}
                forceFiltered={cell.filtered === true}
                filterOnClose={cell.filterOnClose ?? true}
                defaultFilteredValue={cell.defaultFilteredValue ?? null}
                filterResetToDefaultFilteredValue={cell.filterResetToDefaultFilteredValue === true}
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
 * 列宽拖拽 resizer 手柄。详见 docs/features/columns/column-width.md + `useColumnResize.ts` 文件头注释。
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
