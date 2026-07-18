import {
  stickyCellStyle,
  type LeafStickyInfo,
} from './useStickyColumns'
import { SortIndicator } from './SortIndicator'
import { FilterDropdown } from './FilterDropdown'
import type {
  EngineLeafColumn,
} from './types'
// onHeaderCell 签名 `(column) => HTMLAttributes` 的 column 类型用 ColumnType 表达（与对外 types.ts 一致），仅 type-only。
import type { ColumnType, FilterValue } from '../types'
import { getRowKey, getValueByDataIndex } from './recordAccess'
import {
  fixedClass,
  normalizeRenderedCell,
  omitKey,
  renderCellContent,
  resolveBodyCellEllipsisTitle,
  shadowClass,
  toEllipsisTitle,
} from './cellRenderUtils'
import { resolveBodyCellInjectedProps } from './bodyCellUtils'
import { ColumnResizer } from './HeaderCell'
import {
  isRowSpanHovered,
  mergeHoverEventHandler,
  resolveHoverClass,
} from './hoverController'
// 表头格 className/style/event 合并 + sticky 合并纯函数簇（与 HeaderCell 共用，抽到 utils 便于单测 + 去重）。
import {
  mergeHeaderEventProps,
  mergeHeaderExtraClass,
  mergeHeaderExtraStyle,
  mergeHeaderStickyStyle,
} from './headerCellUtils'

/**
 * 单层表头快速路径单元格渲染。
 *
 * 与 HeaderCell（多级路径）的区别：
 * - 表头格不嵌套在 HeaderGrid 中，而是与表体格混排在同一 grid 容器。
 * - 单层表头无分组，column.key === sortKey（collectLeaves 产物无 parentPath），
 *   故 onSorterClick 直接用 column.key。
 * - 表头分隔线排除靠 data-leaf-last（单层末列），多级路径靠 data-group-last。
 *
 * sticky 信息（offset/side）来自 headerSticky；边缘阴影由 shadowClass 加。 */
interface ColumnCellsProps<RecordType> {
  column: EngineLeafColumn<RecordType>
  /** 叶子列索引（用于 ResizeObserver 测量标记与 sticky 取值）。 */
  colIdx: number
  /**
   * 表头分隔线排除：该列是否为全局末列（单层路径）。详见 docs/design-notes/header.md。
   * 多级路径不传（由 columnTree.markLastLeaves 算 cell.isLastLeaf → data-leaf-last）。
   * CSS 用 `:not([data-leaf-last])` 排除末列表头格的右侧分隔线。
   */
  isLastLeaf?: boolean
  dataSource: Array<RecordType>
  rowKey: string | ((record: RecordType) => string | number)
  showHeader: boolean
  hoveredRowIndex: number | null
  onHoverRow: (index: number | null) => void
  /** sticky 信息（来自 useStickyColumns.leafSticky[colIdx]）。 */
  sticky?: LeafStickyInfo
  /**
   * 表头纵向 sticky（虚拟 + 非虚拟 scroll.y 共用）。详见 HeaderCell 同名 prop。
   * flat 路径下表头格由本组件渲染，此处同样需要应用 sticky top（非 virtual 时
   * flat 路径会启用——无合并/多级 + scroll.y 仍走 flat，表头仍要固定）。
   */
  headerStickyTop?: boolean
  /**
   * 表头页面级 sticky 偏移（px）。详见 HeaderCell 同名 prop。
   * sticky prop 启用时表头格相对 viewport 固定（top: offsetHeader）。
   */
  stickyHeaderOffset?: number
  /**
   * 表头纵向 sticky 的逐行累计偏移（px）。详见 HeaderCell 同名 prop。
   * flat 路径为单行表头，恒传 0；与 HeaderCell 共用同一套 verticalSticky 逻辑。
   */
  headerStickyTopOffset?: number
  /** 是否启用列宽拖拽。 */
  resizeEnabled?: boolean
  /** 右侧相邻可见列 key。undefined 表示全局最后一个可见叶子列，右侧不可 resize。 */
  resizeSiblingKey?: string
  /** resizer pointerdown 回调（参数为列 key）。 */
  onResizerPointerDown?: (key: string, siblingKey?: string) => (event: React.PointerEvent<HTMLDivElement>) => void
  /** 当前正在拖拽的列 key（视觉反馈）。 */
  resizingKey?: string | null
  /** 排序点击回调（参数为列 key）。仅可排序列响应。 */
  onSorterClick?: (columnKey: string) => void
  /** 筛选应用回调（参数：列 key + 新筛选值数组）。仅可筛选列触发。 */
  onFilterApply?: (filterKey: string, nextFilteredValue: Array<FilterValue>) => void
  /** 自定义组件（components.body.cell 替换单元格内容；body.row 暂不在此路径消费）。 */
  components?: import('./types').EngineTableProps['components']
  /** 语义化 header 部位（cell/row/wrapper）。 */
  semanticHeader?: import('./types').EngineSemantic['header']
  /** 语义化 body 部位（cell/row/wrapper）。 */
  semanticBody?: import('./types').EngineSemantic['body']
  /**
   * onHeaderRow / onRow / rowClassName / getPopupContainer / rowHoverable。
   * 详见 EngineTableProps 同名字段 + GridTableInner 接入注释。flat 路径与 multi 路径同款接入。
   */
  onHeaderRow?: import('./types').EngineTableProps['onHeaderRow']
  onRow?: import('./types').EngineTableProps['onRow']
  rowClassName?: import('./types').EngineTableProps['rowClassName']
  getPopupContainer?: import('./types').EngineTableProps['getPopupContainer']
  rowHoverable?: boolean
  /** onHeaderRow(columns, index) 的 columns 参数（顶层列 raw 数组）。 */
  headerColumns?: Array<unknown>
  /** Table 级 locale（透传到本表头格内的 FilterDropdown）。 */
  filterLocale?: import('./types').EngineTableProps['filterLocale']
  /**
   * 行选中态判定回调。详见 docs/design-notes/selection.md。
   * 引擎在命中选中行的所有 body cell 上加 `dg-row-selected` 类（CSS 消费 antd token）。
   * 未提供（undefined）时不加类。详见 EngineTableProps.isRowSelected。
   */
  isRowSelected?: (record: RecordType) => boolean
  /**
   * 取第 index 行的最终/实测高（用于首列 cell 写 data-known-size，实测闭环）。详见 docs/design-notes/virtualization.md。
   * flat 路径与 multi 路径 BodyCell 同款。undefined 时不写 data-known-size。
   */
  effectiveRowHeight?: (index: number) => number
  /** 只渲染指定数据行；用于让 GridTable 按 row-major 组织 flat 路径 DOM。 */
  bodyRowIndex?: number
  /** 表体数据行之前的 grid track 数量；showHeader=true 时为 1，否则为 0。 */
  bodyGridRowOffset?: number
}

/** 单层路径的列渲染单元：可渲染表头格，或一个指定数据行的 body 格。
 *
 * 对齐：格子始终 stretch 占满列宽（不设 justifySelf），文字/内容对齐仅靠
 * .dg-cell[data-align] 的 flex justify-content + 内联 textAlign（与 antd 一致：
 * align 只控制文字，格子占满）。
 *
 * 表头格带 `data-leaf-index` 供 ResizeObserver 测量；sticky 来自 prop。
 * 表头格同样支持纵向 sticky top（与 multi 路径 HeaderCell 同款机制）。 */
export function ColumnCells<RecordType>(props: ColumnCellsProps<RecordType>) {
  const {
    column,
    colIdx,
    isLastLeaf,
    dataSource,
    rowKey,
    showHeader,
    hoveredRowIndex,
    onHoverRow,
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
    components,
    semanticHeader,
    semanticBody,
    onHeaderRow,
    onRow,
    rowClassName,
    getPopupContainer,
    rowHoverable = true,
    headerColumns,
    // 行选中态判定 → 加 dg-row-selected 类。
    isRowSelected,
    // 首列 cell 写 data-known-size（实测闭环）。
    effectiveRowHeight,
    bodyRowIndex,
    bodyGridRowOffset = showHeader ? 1 : 0,
    // Table 级 locale（透传到本表头格内的 FilterDropdown）。
    filterLocale,
  } = props
  const bodyRows = bodyRowIndex === undefined
    ? dataSource.map((record, localIndex) => ({ record, index: localIndex }))
    : dataSource[0] === undefined
      ? []
      : [{ record: dataSource[0], index: bodyRowIndex }]

  // onHeaderCell 返回值（flat 路径表头格 props 注入）。
  //   column.onHeaderCell 来自叶子列；返回值整体合并到表头格 div props。与 multi 路径 HeaderCell 同款。
  let onHeaderCellProps: import('react').HTMLAttributes<HTMLElement> | undefined
  if (column.onHeaderCell) {
    try {
      onHeaderCellProps = column.onHeaderCell(column.raw as unknown as ColumnType, 0)
    } catch {
      onHeaderCellProps = undefined
    }
  }
  // onHeaderRow 返回值（行级 props）。flat 路径单层表头，index 恒 0。
  let onHeaderRowProps: import('react').HTMLAttributes<HTMLElement> | undefined
  if (onHeaderRow) {
    try {
      onHeaderRowProps = onHeaderRow(headerColumns ?? [], 0)
    } catch {
      onHeaderRowProps = undefined
    }
  }
  const mergedHeaderExtraClassFlat = mergeHeaderExtraClass(
    column.className,
    onHeaderCellProps?.className,
    onHeaderRowProps?.className,
  )
  const mergedHeaderExtraStyleFlat = mergeHeaderExtraStyle(
    column.style,
    onHeaderCellProps?.style,
    onHeaderRowProps?.style,
  )
  const headerEventPropsFlat = mergeHeaderEventProps([onHeaderCellProps, onHeaderRowProps])

  // 合并 sticky 样式：横向（左/右）+ 纵向（容器内 top:0 或页面级 top:offsetHeader）。
  //   与 HeaderCell 同款逻辑（含 corner cell 双 sticky 取最高 z-index=5 修复 + 逐行偏移 headerStickyTopOffset），
  //   详细语义详见 headerCellUtils.ts:mergeHeaderStickyStyle + docs/design-notes/fixed-column.md + sticky.md。
  const mergedHeaderSticky = mergeHeaderStickyStyle(
    sticky,
    stickyHeaderOffset,
    headerStickyTop,
    headerStickyTopOffset,
  )

  // 该列是否可排序 + 当前排序态（与 HeaderCell 同款逻辑）。
  const sortable =
    !!column.sorter && !column.hidden &&
    (column.sorter === true || typeof column.sorter === 'function' || (typeof column.sorter === 'object' && column.sorter !== null))
  const sortOrder = sortable ? (column.sortOrder ?? null) : null
  const isSorted = sortable && sortOrder !== null
  // 该列是否可筛选（filters 已定义（含空数组）|| filterDropdown 存在 || onFilter 是函数）。
  // 对齐 antd `useFilter/index.tsx:38`：onFilter 非必需——服务端筛选列有 filters 但无 onFilter 也渲染漏斗；
  // `filters: []` 是 truthy → 画漏斗 + 空面板走 renderEmpty。
  const filterable =
    !column.hidden &&
    ((column.filterDropdown !== undefined && column.filterDropdown !== null) ||
      !!column.filters ||
      typeof column.onFilter === 'function')
  // 表头格内部是否需要"右侧操作区"（sorter / filter）。
  const hasActions = sortable || filterable
  // 表头 ellipsis（对齐 antd：长 title 省略 + hover 显示完整标题）。详见 HeaderCell 同款注释 + docs/design-notes/ellipsis.md。
  //   showTitle:false 时不加 native title（让 render/外部 Tooltip 接管）——与表体同款门。
  const headerEllipsis = column.ellipsis === true
  const headerTitle =
    headerEllipsis && column.showTitle !== false
      ? toEllipsisTitle(column.title)
      : undefined

  return (
    <>
      {showHeader ? (
        <div
          className={[
            'dg-cell',
            'ant-table-cell',
            'dg-cell-header',
            fixedClass(column.fixed),
            shadowClass(sticky),
            column.hidden ? 'dg-cell-hidden' : undefined,
            // 表头纵向 sticky（容器内 top:0）或页面级 sticky（top:offsetHeader）：
            //   均需不透明背景（防止表体透过）+ 配合 inline position/top/zIndex。
            (headerStickyTop || stickyHeaderOffset !== undefined) ? 'dg-cell-header-vsticky' : undefined,
            sortable ? 'dg-column-has-sorters ant-table-column-has-sorters' : undefined,
            filterable ? 'dg-column-has-filter' : undefined,
            isSorted ? 'dg-column-sort ant-table-column-sort' : undefined,
            // 叶子表头格 ellipsis 加 dg-cell-ellipsis（作用于 .dg-cell-inner / .dg-column-title）。
            headerEllipsis ? 'dg-cell-ellipsis' : undefined,
            // 语义化 header.cell 部位 className（合并）。
            semanticHeader?.className?.cell,
            // 语义化 header.row 部位 className（行级 class 透传到该行所有表头格，与 body.row 对称）。
            semanticHeader?.className?.row,
            // column.className + onHeaderCell.className + onHeaderRow.className。
            mergedHeaderExtraClassFlat,
          ]
            .filter(Boolean)
            .join(' ')}
          // aria-sort：对齐 antd useSorter.tsx:246-248——仅当该列表头格可排序
          //   且 sortOrder 非 null 时设 aria-sort（ascending/descending）；未排序时不设。
          aria-sort={
            sortable && sortOrder === 'ascend'
              ? 'ascending'
              : sortable && sortOrder === 'descend'
                ? 'descending'
                : undefined
          }
          data-align={column.align ?? undefined}
          data-leaf-index={String(colIdx)}
          data-column-key={column.key}
          // 表头分隔线排除（单层末列，对齐 antd `thead th:not(:last-child)::before`）— 详见 docs/design-notes/header.md。
          //   单层无分组，仅设 data-leaf-last；多级路径在 HeaderCell 设 data-group-last。
          data-leaf-last={isLastLeaf ? '' : undefined}
          data-sorter-order={isSorted ? (sortOrder ?? undefined) : undefined}
          // showSorterTooltip hover 提示（简单 title，详见 HeaderCell 同款注释）。
          //   ellipsis 冲突处理：ellipsis 启用时 title=完整表头文案（优先），排序提示让位（详见 HeaderCell）。
          title={
            headerEllipsis
              ? headerTitle
              : sortable && column.showSorterTooltip !== false
                ? sortOrder === 'ascend'
                  ? 'Click to sort descending'
                  : sortOrder === 'descend'
                    ? 'Cancel sorting'
                    : 'Click to sort ascending'
                : undefined
          }
          style={{
            gridColumn: `${colIdx + 1}`,
            gridRow: '1',
            ...(column.align ? { textAlign: column.align } : null),
            ...mergedHeaderSticky,
            // 语义化 header.cell 部位 style（合并覆盖同名字段）。
            ...(semanticHeader?.style?.cell ?? null),
            // 语义化 header.row 部位 style（行级 style 透传到该行所有表头格，与 body.row 对称）。
            ...(semanticHeader?.style?.row ?? null),
            // column.style + onHeaderCell.style + onHeaderRow.style。
            ...mergedHeaderExtraStyleFlat,
          }}
          onClick={
            sortable && onSorterClick
              ? (e) => {
                  // 幽灵点击防御：仅当点击 target 真正落在本表头格内部时才触发排序（同非虚拟分支）。
                  if (!e.currentTarget.contains(e.target as Node)) return
                  e.stopPropagation()
                  // 单层表头分支：column 是 EngineLeafColumn（collectLeaves 产物），无 parentPath
                  //   → column.key === sortKey（column.key ?? dataIndex）恒成立，故直接用 key 即正确。
                  //   多级表头嵌套叶子的 key≠sortKey 问题在上方 HeaderCell 分支用 cell.sortKey 解决。
                  onSorterClick(column.key)
                  // 合并后的 onClick 在排序之后触发。
                  ;(headerEventPropsFlat.onClick as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)?.(e)
                }
              : (headerEventPropsFlat.onClick as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)
          }
          // 其余事件 props 透传（onClick 已单独合并，跳过避免重复）。
          {...omitKey(headerEventPropsFlat, 'onClick')}
        >
          {hasActions ? (
            <div className="dg-column-sorters ant-table-column-sorters">
              <div
                className="dg-column-title ant-table-column-title"
                // ellipsis 列 hover 表头文字提示完整标题（非 ellipsis 列无 title）。
                title={headerTitle}
              >
                {column.title ?? null}
              </div>
              <div className="dg-column-actions">
                {sortable ? (
                  <SortIndicator sortOrder={sortOrder} priority={column.sortPriority} />
                ) : null}
                {filterable && onFilterApply ? (
                  <FilterDropdown
                    filters={column.filters ?? []}
                    filterMultiple={column.filterMultiple ?? true}
                    filteredValue={column.filteredValue ?? null}
                    filterOnClose={column.filterOnClose ?? true}
                    onApply={(next) => onFilterApply(column.key, next)}
                    customDropdown={column.filterDropdown}
                    customIcon={column.filterIcon}
                    dropdownProps={column.filterDropdownProps}
                    filterSearch={column.filterSearch}
                    filterMode={column.filterMode}
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
              {column.title ?? null}
            </div>
          )}
          {/* 列宽拖拽 resizer：非隐藏列 + resizeEnabled 时渲染。 */}
          {resizeEnabled && !column.hidden && resizeSiblingKey && onResizerPointerDown ? (
            <ColumnResizer
              columnKey={column.key}
              active={resizingKey === column.key}
              onPointerDown={onResizerPointerDown(column.key, resizeSiblingKey)}
            />
          ) : null}
        </div>
      ) : null}

      {bodyRows.map(({ record, index }) => {
        const text = getValueByDataIndex(record, column.dataIndex)
        const rawRendered: unknown = column.render
          ? column.render(text, record, index)
          : text
        const { children: rendered, props: renderedCellProps } = normalizeRenderedCell(rawRendered)
        // ellipsis 列默认 title 提示（详见 BodyCell 同款注释 + docs/design-notes/ellipsis.md）。取原始 dataIndex 值文本化。
        //   showTitle:false 时不加 native title（详见 BodyCell 同款注释）。
        const ellipsisTitle = resolveBodyCellEllipsisTitle(column.ellipsis, column.showTitle, text)
        const isHovered = isRowSpanHovered(index, 1, hoveredRowIndex)
        // 调用 onCell / onRow / rowClassName 并合并行级注入 props。与 multi 路径 BodyCell 同款。
        const bodyCellInjectedProps = resolveBodyCellInjectedProps({
          column,
          record,
          index,
          components,
          renderedCellProps,
          onRow,
          rowClassName,
          isRowSelected,
        })
        // rowHoverable=false 时不加 dg-row-hover（关闭内置 hover 视觉）。
        const hoverClass = resolveHoverClass(rowHoverable, isHovered)
        const bodyEventPropsFlat = bodyCellInjectedProps.restRowProps
        return (
          <div
            key={getRowKey(record, rowKey) ?? index}
            className={[
              'dg-cell',
              'ant-table-cell',
              'dg-cell-body',
              fixedClass(column.fixed),
              shadowClass(sticky),
              column.hidden ? 'dg-cell-hidden' : undefined,
              // ellipsis 列加 dg-cell-ellipsis 类（.dg-cell-inner 应用 ellipsis CSS）。
              //   showTitle:false 仍加类（CSS 省略号照常），只是不加 native title。
              column.ellipsis === true ? 'dg-cell-ellipsis' : undefined,
              // 当前排序列的表体格加 dg-column-sort（淡灰底，对齐 antd tableBodySortBg）。
              isSorted ? 'dg-column-sort ant-table-column-sort' : undefined,
              // rowHoverable=false 时关闭内置 hover 视觉。
              hoverClass,
              // 行选中态 → dg-row-selected 类。
              bodyCellInjectedProps.selectedClass,
              // 语义化 body.row 部位 className（行级 class 透传到该行所有单元格）。
              semanticBody?.className?.row,
              // 语义化 body.cell 部位 className（单元格级）。
              semanticBody?.className?.cell,
              // column.className + rowClassName + onRow.className。
              bodyCellInjectedProps.mergedClassName,
            ]
              .filter(Boolean)
              .join(' ')}
            data-align={column.align ?? undefined}
            data-row-index={index}
            // 实测闭环：写本行实测/最终高（effectiveRowHeight），仅首列（colIdx===0）写。
            //   与 multi 路径 BodyCell 同款（详见上方注释 + docs/design-notes/virtualization.md）。
            {...(colIdx === 0 && effectiveRowHeight ? { 'data-known-size': effectiveRowHeight(index) } : null)}
            // 表体格也标 data-column-key（与上方 BodyCell 多级表头路径 + 表头格一致）。
            //   选择列（key='__dg_selection__'）专用样式定位——antd selection.ts:49-61 选择列 padding
            //   = paddingXS(4px)，区别于普通列 cellPaddingInline。详见 BodyCell 同款注释 + docs/design-notes/selection.md。
            data-column-key={column.key}
            style={{
              gridColumn: `${colIdx + 1}`,
              gridRow: `${bodyGridRowOffset + index + 1}`,
              ...(column.align ? { textAlign: column.align } : null),
              ...stickyCellStyle(sticky),
              // 语义化 body.row 部位 style（行级）。
              ...(semanticBody?.style?.row ?? null),
              // 语义化 body.cell 部位 style（单元格级；后于 row 合并）。
              ...(semanticBody?.style?.cell ?? null),
              // column.style + onRow.style 合并。
              ...bodyCellInjectedProps.mergedStyle,
            }}
            onMouseEnter={mergeHoverEventHandler(
              rowHoverable,
              () => onHoverRow(index),
              bodyEventPropsFlat.onMouseEnter as ((e: React.MouseEvent<HTMLElement>) => void) | undefined,
            )}
            onMouseLeave={mergeHoverEventHandler(
              rowHoverable,
              () => onHoverRow(null),
              bodyEventPropsFlat.onMouseLeave as ((e: React.MouseEvent<HTMLElement>) => void) | undefined,
            )}
            // 其余 onRow 事件 props 透传（onMouseEnter/Leave 已单独合并，跳过）。
            {...omitKey(omitKey(bodyEventPropsFlat, 'onMouseEnter'), 'onMouseLeave')}
          >
            <div
              className="dg-cell-inner"
              // ellipsis 列默认 title 提示（hover 显示完整文本；非 ellipsis 列无 title）。
              title={ellipsisTitle}
            >
              {/* 若提供 components.body.cell，单元格内容用它渲染；否则直接渲染 rendered。 */}
              {renderCellContent({
                components,
                column,
                record,
                index,
                rendered,
                onCellProps: bodyCellInjectedProps.onCellProps,
              })}
            </div>
          </div>
        )
      })}
    </>
  )
}
