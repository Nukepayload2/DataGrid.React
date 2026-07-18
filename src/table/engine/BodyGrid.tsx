/**
 * 数据区（multi 路径）渲染：BodyCell + renderBodyCells。从 GridTable.tsx 抽出（执行单元 #3）。
 *
 * - `BodyCell`：单个数据单元格渲染（multi 路径，显式 grid 定位）。封装 dg-cell div（含
 *   gridColumn/gridRow/sticky/hover/align）+ 内部内容渲染（含 components.body.cell + 树形缩进）。
 *   仅被 renderBodyCells 内部使用，故本文件不 export。
 * - `renderBodyCells`：数据区单元格批量渲染（multi 路径入口）。被 renderGrid 调用，本文件 export。
 *
 * 数据格 DOM 按 row-major 输出，和视觉行顺序保持一致，避免浏览器原生文字选择按列穿透多行。
 */
import {
  type ReactNode,
} from 'react'
import {
  type CellMergeInfo,
  type CellMergePlan,
} from './cellMerge'
import {
  stickyCellStyle,
  type LeafStickyInfo,
} from './useStickyColumns'
import {
  fixedClass,
  normalizeRenderedCell,
  omitKey,
  renderCellContent,
  resolveBodyCellEllipsisTitle,
  shadowClass,
} from './cellRenderUtils'
import { resolveBodyCellInjectedProps } from './bodyCellUtils'
import {
  isRowSpanHovered,
  mergeHoverEventHandler,
  resolveHoverClass,
} from './hoverController'
import { renderTreeIndent } from './treeIndentRenderer'
import { getRowKey, getValueByDataIndex } from './recordAccess'
import {
  resolveStandardBodyCellKey,
  resolveStandardBodyRowKey,
} from './recyclingIdentity'
import type {
  EngineExpandState,
  EngineLeafColumn,
  EngineTreeState,
} from './types'

/**
 * 单个数据单元格渲染（multi 路径，显式 grid 定位）。详见 docs/design-notes/layout.md + header.md。
 *
 * 封装 dg-cell div（含 gridColumn/gridRow/sticky/hover/align）+ 内部内容渲染（含
 * components.body.cell + 树形缩进）。multi 路径的每个数据单元格都用此组件渲染，
 * 便于 renderBodyCells 按行/列遍历时复用。
 */
function BodyCell<RecordType>({
  column,
  colIdx,
  record,
  index,
  merge,
  rowSpanTracks,
  rowLine,
  info,
  isHovered,
  isSortedColumn,
  treeEnabled,
  treeState,
  treeFirstDataColumnIdx,
  rowKey,
  components,
  onHoverEnter,
  onHoverLeave,
  semanticBody,
  // onRow / rowClassName / rowHoverable 透传到单元格（grid 无 tr，行级 props 分发到该行所有单元格）。
  onRow,
  rowClassName,
  rowHoverable = true,
  renderRecyclingReactCells = false,
  // 行选中态判定 → 加 dg-row-selected 类（详见 docs/design-notes/selection.md）。
  isRowSelected,
  // 首列 cell 写 data-known-size（实测闭环，详见 docs/design-notes/virtualization.md）。
  effectiveRowHeight,
}: {
  column: EngineLeafColumn<RecordType>
  colIdx: number
  record: RecordType
  index: number
  merge: CellMergeInfo | undefined
  rowSpanTracks: number
  rowLine: number
  info: LeafStickyInfo | undefined
  isHovered: boolean
  isSortedColumn: boolean
  treeEnabled: boolean
  treeState: EngineTreeState | undefined
  treeFirstDataColumnIdx: number
  rowKey: string | ((record: RecordType) => string | number)
  components: import('./types').EngineTableProps['components']
  onHoverEnter: () => void
  onHoverLeave: () => void
  /** 语义化 body 部位（cell/row/wrapper 的 className 与 style）。 */
  semanticBody?: import('./types').EngineSemantic['body']
  /** onRow 行级 props 注入。 */
  onRow?: (record: any, index: number) => import('react').HTMLAttributes<HTMLElement> | undefined
  /** rowClassName 行级 class。 */
  rowClassName?: string | ((record: any, index: number) => string)
  /** rowHoverable 行 hover 开关，默认 true。 */
  rowHoverable?: boolean
  renderRecyclingReactCells?: boolean
  /** 行选中态判定回调。未提供时不加 dg-row-selected 类。 */
  isRowSelected?: (record: RecordType) => boolean
  /** 取本行最终/实测高（首列写 data-known-size，实测闭环）。 */
  effectiveRowHeight?: (index: number) => number
}) {
  const colSpan = merge?.colSpan ?? 1
  const text = getValueByDataIndex(record, column.dataIndex)
  const standardCellKey = resolveStandardBodyCellKey(record, rowKey, colIdx, index)
  const reactRenderer = renderRecyclingReactCells
    ? column.gridColumnOptions?.renderCellReact
    : undefined
  const rawRendered: unknown = reactRenderer
    ? reactRenderer(
        {
          value: text,
          record,
          rowIndex: index,
          columnIndex: colIdx,
          columnKey: column.key,
          dataIndex: column.dataIndex,
          rowKey: getRowKey(record, rowKey),
        },
        {
          key: standardCellKey,
        },
      )
    : column.render
      ? column.render(text, record, index)
      : text
  const { children: rendered } = normalizeRenderedCell(rawRendered)
  // ellipsis 列默认 title 悬浮提示（对齐 antd 默认行为）。详见 docs/design-notes/ellipsis.md。
  //   - 仅 ellipsis 列加 title（非 ellipsis 列不加，避免多余 tooltip）。
  //   - 取原始 dataIndex 值文本化（string/number）——对齐 antd 默认 title 来源（cellValue 文本化）。
  //   - 自定义 render 返回 JSX 时 antd 默认行为不显示 title（用户应自行 Tooltip）：
  //     这里用 text（dataIndex 原值）文本化，render 列仍能显示原值 title（比 antd 略宽松但不破坏
  //     Name render `<a>{text}</a>` 这种文本包裹的场景——hover Name 仍提示完整 name，符合直觉）。
  //   - text 非 string/number（如对象/数组）→ 不设 title。
  //   - 与 ellipsis={ showTitle: false } 兼容：showTitle:false 时**不加** native title，
  //     让 render 内 antd Tooltip 接管 hover 提示（antd ellipsis-custom-tooltip demo 用法）。
  const ellipsisTitle = resolveBodyCellEllipsisTitle(column.ellipsis, column.showTitle, text)
  // 调用 onCell / onRow / rowClassName 并合并行级注入 props。
  const bodyCellInjectedProps = resolveBodyCellInjectedProps({
    column,
    record,
    index,
    components,
    onRow,
    rowClassName,
    isRowSelected,
  })
  // rowHoverable=false 时不加 dg-row-hover（关闭内置 hover 视觉）。
  const hoverClass = resolveHoverClass(rowHoverable, isHovered)
  const bodyEventProps = bodyCellInjectedProps.restRowProps
  return (
    <div
      key={standardCellKey}
      className={[
        'dg-cell',
        'ant-table-cell',
        'dg-cell-body',
        column.rowScope === 'row' ? 'dg-cell-rowscope' : undefined,
        // rowSpan>1 的合并格标记，CSS 据此在有界行高模型下排除 min/max-height
        //   （合并格需跨多 track，被 max-height 截断会破坏 rowSpan 对齐——见 docs/design-notes/row-height.md）。
        rowSpanTracks > 1 ? 'dg-cell-rowspan' : undefined,
        fixedClass(column.fixed),
        shadowClass(info),
        column.hidden ? 'dg-cell-hidden' : undefined,
        // ellipsis 列加 dg-cell-ellipsis 类（.dg-cell-inner 应用 ellipsis CSS）。
        //   showTitle:false 仍加类（CSS 省略号照常），只是不加 native title。
        column.ellipsis === true ? 'dg-cell-ellipsis' : undefined,
        isSortedColumn ? 'dg-column-sort ant-table-column-sort' : undefined,
        // rowHoverable=false 时关闭内置 hover 视觉。
        hoverClass,
        // 行选中态 → dg-row-selected 类。
        bodyCellInjectedProps.selectedClass,
        // 语义化 body.row 部位 className（行级 class 透传到该行所有单元格）。
        semanticBody?.className?.row,
        // 语义化 body.cell 部位 className（单元格级）。
        semanticBody?.className?.cell,
        // column.className + rowClassName + onRow.className 合并。
        bodyCellInjectedProps.mergedClassName,
      ]
        .filter(Boolean)
        .join(' ')}
      data-align={column.align ?? undefined}
      data-row-index={index}
      // 实测闭环：写本行实测/最终高（effectiveRowHeight），避免 useRowMeasurements 每次报变化→死循环重渲染。
      // 仅在该行首个可见格（colIdx===0）写，减少冗余 attr。
      // 有界模式下 effectiveRowHeight 走 sizeOf 实测（clamp [min,max]）；固定模式下 = rowHeight 约定值。
      {...(colIdx === 0 && effectiveRowHeight ? { 'data-known-size': effectiveRowHeight(index) } : null)}
      // 表体格也标 data-column-key（与表头格对齐）。用于选择列（key='__dg_selection__'）专用样式定位
      //   ——antd selection.ts:49-61 给选择列单元格单独设 paddingInlineStart/End = paddingXS(4px)
      //   （区别于普通列的 cellPaddingInline），CSS 需精确命中。详见 docs/design-notes/selection.md。
      data-column-key={column.key}
      // aria-colspan/rowspan：合并的数据格补 aria 属性（对齐 antd 真实 td 的 colSpan/rowSpan 属性——
      //   antd td 直接渲染 HTML colspan/rowspan，屏幕阅读器据此合并播报）。
      //   仅 span>=2 时设（span=1 是默认值，不设避免噪声）。rowSpanTracks 含展开 track 偏移，
      //   与视觉跨行一致；aria-rowspan 用视觉值。
      {...(colSpan >= 2 ? { 'aria-colspan': colSpan } : null)}
      {...(rowSpanTracks >= 2 ? { 'aria-rowspan': rowSpanTracks } : null)}
      style={{
        gridColumn:
          colSpan > 1 ? `${colIdx + 1} / span ${colSpan}` : `${colIdx + 1}`,
        gridRow:
          rowSpanTracks > 1
            ? `${rowLine} / span ${rowSpanTracks}`
            : `${rowLine}`,
        ...(column.align ? { textAlign: column.align } : null),
        ...stickyCellStyle(info),
        // 语义化 body.row 部位 style（行级 style 透传到该行所有单元格）。
        ...(semanticBody?.style?.row ?? null),
        // 语义化 body.cell 部位 style（单元格级；后于 row 合并，覆盖 row 同名字段）。
        ...(semanticBody?.style?.cell ?? null),
        // column.style + onRow.style 合并。
        ...bodyCellInjectedProps.mergedStyle,
      }}
      onMouseEnter={mergeHoverEventHandler(
        rowHoverable,
        onHoverEnter,
        bodyEventProps.onMouseEnter as ((e: React.MouseEvent<HTMLElement>) => void) | undefined,
      )}
      onMouseLeave={mergeHoverEventHandler(
        rowHoverable,
        onHoverLeave,
        bodyEventProps.onMouseLeave as ((e: React.MouseEvent<HTMLElement>) => void) | undefined,
      )}
      // 其余 onRow 事件 props 透传（onMouseEnter/Leave 已单独合并，跳过）。
      {...omitKey(omitKey(bodyEventProps, 'onMouseEnter'), 'onMouseLeave')}
    >
      <div
        className="dg-cell-inner"
        // ellipsis 列默认 title 提示（hover 显示完整文本；非 ellipsis 列无 title）。
        //   showTitle:false 时 ellipsisTitle 已为 undefined（不加 native title，让 antd Tooltip 接管）。
        title={ellipsisTitle}
      >
        {treeEnabled && treeState && colIdx === treeFirstDataColumnIdx
          ? renderTreeIndent({ record, rowKey, treeState })
          : null}
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
}

/**
 * 数据区单元格批量渲染（multi 路径）。详见文件头 components 机制说明 + docs/design-notes/layout.md。
 *
 * - 当 `components.body.row` 提供时：按**行**优先遍历，每行用 body.row 组件包裹该行所有
 *   BodyCell（body.row 不产生 grid DOM——典型 EditableRow 用 antd Form + Context.Provider，
 *   Provider 不渲染真实 DOM 节点，BodyCell 仍是 grid 直接子元素，grid 显式定位保证布局正确）。
 *   透传给 body.row 的 props：`{ index, children, record, rowKey }`（对齐 antd body.row 签名
 *   `{ index, ...props }`，data-grid 额外提供 record/rowKey 便于行级逻辑）。
 * - 否则：同样按**行**优先遍历，保持 DOM 顺序与视觉行顺序一致。
 */
export function renderBodyCells<RecordType>({
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
  semanticBody,
  // onRow / rowClassName / rowHoverable 透传到表体单元格。
  onRow,
  rowClassName,
  rowHoverable = true,
  renderRecyclingReactCells = false,
  // 行选中态判定 → 加 dg-row-selected 类（详见 docs/design-notes/selection.md）。
  isRowSelected,
  // 首列 cell 写 data-known-size（实测闭环，详见 docs/design-notes/virtualization.md）。
  effectiveRowHeight,
}: {
  leafColumns: Array<EngineLeafColumn<RecordType>>
  dataSource: Array<RecordType>
  virtualEnabled: boolean
  virtualState: { start: number; end: number }
  cellMergePlan: CellMergePlan | null
  expandEnabled: boolean
  expandState: EngineExpandState | undefined
  rowKey: string | ((record: RecordType) => string | number)
  hoveredRowIndex: number | null
  setHoveredRowIndex: (index: number | null) => void
  rowLineBase: (index: number) => number
  leafSticky: Array<LeafStickyInfo | undefined>
  treeEnabled: boolean
  treeState: EngineTreeState | undefined
  treeFirstDataColumnIdx: number
  components: import('./types').EngineTableProps['components']
  /** 语义化 body 部位（cell/row/wrapper）。 */
  semanticBody?: import('./types').EngineSemantic['body']
  /** onRow 行级 props 注入。 */
  onRow?: (record: any, index: number) => import('react').HTMLAttributes<HTMLElement> | undefined
  /** rowClassName 行级 class。 */
  rowClassName?: string | ((record: any, index: number) => string)
  /** rowHoverable 行 hover 开关，默认 true。 */
  rowHoverable?: boolean
  renderRecyclingReactCells?: boolean
  /** 行选中态判定回调。 */
  isRowSelected?: (record: RecordType) => boolean
  /** 取本行最终/实测高（首列写 data-known-size，实测闭环）。 */
  effectiveRowHeight?: (index: number) => number
}): Array<ReactNode> {
  // 按行预计算 onRow 返回值 + rowClassName（同行的每个单元格共享）。
  //   预计算避免在 BodyCell 内重复调用（onRow 是用户函数，重复调用既浪费也可能有副作用）。
  const lo = virtualEnabled ? virtualState.start : 0
  const hi = virtualEnabled ? virtualState.end : dataSource.length
  const BodyRow = components?.body?.row
  const out: Array<ReactNode> = []

  // 计算某 (colIdx, index) 的合并 span 信息（含展开 track 偏移）。
  const computeMerge = (colIdx: number, index: number) => {
    const merge: CellMergeInfo | undefined = cellMergePlan?.[colIdx]?.[index]
    if (merge?.hidden) return null // 被覆盖格跳过
    let rowSpanTracks = merge?.rowSpan ?? 1
    if (rowSpanTracks > 1 && expandEnabled && expandState) {
      let extraTracks = 0
      for (let r = index; r < index + rowSpanTracks && r < dataSource.length; r += 1) {
        const rec = dataSource[r]
        if (rec === undefined) continue
        const key = getRowKey(rec, rowKey)
        if (key !== undefined && expandState.isExpandable(key)) extraTracks += 1
      }
      rowSpanTracks += extraTracks
    }
    if (expandEnabled && expandState) {
      const rawOffset = expandState.expandedRowOffset
      const offset = typeof rawOffset === 'number' && Number.isFinite(rawOffset)
        ? Math.min(Math.max(0, Math.floor(rawOffset)), Math.max(leafColumns.length - 1, 0))
        : 0
      const colSpan = merge?.colSpan ?? 1
      const cellEnd = colIdx + colSpan
      const record = dataSource[index]
      const key = record === undefined ? undefined : getRowKey(record, rowKey)
      if (
        (merge?.rowSpan ?? 1) === 1 &&
        offset > 0 &&
        cellEnd <= offset &&
        key !== undefined &&
        expandState.isExpandable(key) &&
        expandState.isExpanded(key)
      ) {
        rowSpanTracks += 1
      }
    }
    return { merge, rowSpanTracks }
  }

  if (BodyRow) {
    // 行优先遍历：每行用 body.row 包裹。
    for (let index = lo; index < hi; index += 1) {
      const record = dataSource[index]
      if (record === undefined) continue
      const rowLine = rowLineBase(index)
      const rowCells: Array<ReactNode> = []
      for (let colIdx = 0; colIdx < leafColumns.length; colIdx += 1) {
        const column = leafColumns[colIdx]
        const m = computeMerge(colIdx, index)
        if (m === null) continue
        const isSortedColumn =
          !!column.sorter && column.sortOrder !== null && column.sortOrder !== undefined
        // rowSpan-aware hover：合并格按区间相交判定。
        //   rowSpan=1 退化为 hoveredRowIndex===index。
        const isHovered = isRowSpanHovered(index, m.merge?.rowSpan ?? 1, hoveredRowIndex)
        const standardCellKey = resolveStandardBodyCellKey(record, rowKey, colIdx, index)
        rowCells.push(
          <BodyCell<RecordType>
            key={standardCellKey}
            column={column}
            colIdx={colIdx}
            record={record}
            index={index}
            merge={m.merge}
            rowSpanTracks={m.rowSpanTracks}
            rowLine={rowLine}
            info={leafSticky[colIdx]}
            isHovered={isHovered}
            isSortedColumn={isSortedColumn}
            treeEnabled={treeEnabled}
            treeState={treeState}
            treeFirstDataColumnIdx={treeFirstDataColumnIdx}
            rowKey={rowKey}
            components={components}
            semanticBody={semanticBody}
            onHoverEnter={() => setHoveredRowIndex(index)}
            onHoverLeave={() => setHoveredRowIndex(null)}
            // onRow / rowClassName / rowHoverable 透传。
            onRow={onRow}
            rowClassName={rowClassName}
            rowHoverable={rowHoverable}
            renderRecyclingReactCells={renderRecyclingReactCells}
            // 行选中态判定 → 加 dg-row-selected 类。
            isRowSelected={isRowSelected}
            // 首列写 data-known-size（实测闭环）。
            effectiveRowHeight={effectiveRowHeight}
          />,
        )
      }
      // 用 body.row 组件包裹该行所有单元格。
      // body.row 组件应返回**不产生 grid DOM**的结构（如 antd Form + Context.Provider，
      // Provider 不渲染真实 DOM；或直接返回 children）。这样 BodyCell 仍是 grid 直接子元素，
      // grid 显式定位保证布局正确。
      // 透传 props：对齐 antd body.row 签名 { index, ...props } + data-grid 扩展 record/rowKey。
      out.push(
        <BodyRow
          key={`row-${resolveStandardBodyRowKey(record, rowKey, index)}`}
          index={index}
          record={record}
          rowKey={resolveStandardBodyRowKey(record, rowKey, index)}
        >
          {rowCells}
        </BodyRow>,
      )
    }
    return out
  }

  // 行优先遍历（无 body.row 时）：DOM 顺序与视觉行顺序一致，便于原生文字选择。
  for (let index = lo; index < hi; index += 1) {
    const record = dataSource[index]
    if (record === undefined) continue
    const rowLine = rowLineBase(index)
    for (let colIdx = 0; colIdx < leafColumns.length; colIdx += 1) {
      const column = leafColumns[colIdx]
      const m = computeMerge(colIdx, index)
      if (m === null) continue
      const isSortedColumn =
        !!column.sorter && column.sortOrder !== null && column.sortOrder !== undefined
      // rowSpan-aware hover：合并格按区间相交判定。
      //   rowSpan=1 退化为 hoveredRowIndex===index。
      const isHovered = isRowSpanHovered(index, m.merge?.rowSpan ?? 1, hoveredRowIndex)
      const standardCellKey = resolveStandardBodyCellKey(record, rowKey, colIdx, index)
      out.push(
        <BodyCell<RecordType>
          key={standardCellKey}
          column={column}
          colIdx={colIdx}
          record={record}
          index={index}
          merge={m.merge}
          rowSpanTracks={m.rowSpanTracks}
          rowLine={rowLine}
          info={leafSticky[colIdx]}
          isHovered={isHovered}
          isSortedColumn={isSortedColumn}
          treeEnabled={treeEnabled}
          treeState={treeState}
          treeFirstDataColumnIdx={treeFirstDataColumnIdx}
          rowKey={rowKey}
          components={components}
          semanticBody={semanticBody}
          onHoverEnter={() => setHoveredRowIndex(index)}
          onHoverLeave={() => setHoveredRowIndex(null)}
          // onRow / rowClassName / rowHoverable 透传。
          onRow={onRow}
          rowClassName={rowClassName}
          rowHoverable={rowHoverable}
          renderRecyclingReactCells={renderRecyclingReactCells}
          // 行选中态判定 → 加 dg-row-selected 类。
          isRowSelected={isRowSelected}
          // 首列写 data-known-size（实测闭环）。
          effectiveRowHeight={effectiveRowHeight}
        />,
      )
    }
  }
  return out
}
