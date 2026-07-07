/**
 * data-grid 对外 Table 组件（antd 兼容适配层）。
 *
 * 把 antd 兼容 props（`TableProps`）映射到内部引擎（`GridTable`）。
 *
 * 虚拟滚动 ref 适配：
 * - `forwardRef` 暴露 `TableRef`（含 `scrollTo` 与 `nativeElement`）。
 * - `scrollTo({ key })`：在适配层根据 `rowKey` 把 key → index，再转给引擎 `scrollTo({ index })`。
 *   引擎层只处理 index/scrollTop（虚拟窗口内逻辑），保持解耦。
 * - 非 virtual 模式下 `scrollTo` 为 no-op（不报错；与 antd 在非虚拟下 ref.scrollTo 不可用一致）。
 *
 * 行选择适配：`rowSelection` 传入时在最前插入一个"选择列"叶子节点（`buildSelectionColumnNode`），
 *   该节点对引擎透明（普通 `EngineColumnNode`，无 children → 叶子），与多级表头 / 固定列 / 合并 /
 *   虚拟滚动无缝组合。详见 `docs/design-notes/selection.md`。
 */

import {
  forwardRef,
  useContext,
  useImperativeHandle,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { ConfigProvider } from 'antd'
import defaultLocale from 'antd/es/locale/en_US'
import { GridTable, getRowKey } from './engine/GridTable'
import { Summary as SummaryComponent } from './engine/Summary'
import {
  type SelectionItem,
  SELECTION_ALL,
  SELECTION_NONE,
  SELECTION_INVERT,
} from './engine/useRowSelection'
import { useRowExpand } from './engine/useRowExpand'
import { useSorter } from './engine/useSorter'
import { useFilter } from './engine/useFilter'
import { useTreeData } from './engine/useTreeData'
import { useSemanticClassNames } from './useSemanticClassNames'
import type { EngineExpandState, EngineTreeState } from './engine/types'
import {
  EXPAND_COLUMN,
  SELECTION_COLUMN,
  type ColumnGroupProps,
  type ColumnOrSentinel,
  type ColumnProps,
  type ColumnType,
  type Expandable,
  type GridSelectionOptions,
  type SizeType,
  type TableLocale,
  type TablePaginationConfig,
  type TablePaginationState,
  type TableProps,
  type TableRef,
  type TableRowSelection,
} from './types'
import {
  useTableThemeVars,
} from './useTableThemeVars'
import {
  applyColumnDefaults,
  convertChildrenToColumns,
  flattenLeafColumns,
} from './columnAdapter'
import { buildExpandColumnNode } from './expandAdapter'
import {
  buildSelectionColumnNode,
} from './selectionAdapter'
import {
  TableLoadingContainer,
  useTableEmptyText,
} from './emptyLoadingAdapter'
import { resolveTableLayout } from './tableLayoutResolver'
import { useResponsiveColumns } from './useResponsiveColumns'
import { buildTableRefHandle } from './buildTableRefHandle'
import { useScrollbarTouch } from './useScrollbarTouch'
import { useColumnTreeBuilder } from './useColumnTreeBuilder'
import { usePaginationAdapter } from './usePaginationAdapter'
import { useSelectionAdapter } from './useSelectionAdapter'
import { useExpandRowBinding } from './useExpandRowBinding'
import './style/tokens.css'
import './style/table.css'

const { ConfigContext } = ConfigProvider
const defaultTableLocaleWithoutEmptyText: TableLocale = {
  ...((defaultLocale.Table ?? {}) as TableLocale),
}
delete defaultTableLocaleWithoutEmptyText.emptyText

/**
 * JSX 风格 API：`<Table.Column>` 单列声明组件（对齐 antd v6 `Table.Column`）。
 *
 * **不渲染 DOM**（渲染 null）——它是 `columns` prop 的语法糖，仅作 `<Table>` JSX 子元素
 * 声明一列的数据载体。Table 适配层（`convertChildrenToColumns`）遍历 JSX 子元素时取出其 props
 * 转换为 ColumnType。
 *
 * props = ColumnType 全部字段（title/dataIndex/key/render/width/align/fixed/...）；
 * `children` 禁止（Column 是叶子列，多级表头用 ColumnGroup）。
 *
 * 与 antd 一致："This is a syntactic sugar for `columns` prop. So HOC will not work on this."
 * （不通过 HOC 增强，纯数据载体）。
 *
 * 用类型断言 `as unknown as (props: ColumnProps<RecordType>) => null` 绕过 TS 对泛型箭头函数
 * 的限制（与 antd `<RecordType extends AnyObject>(_: ColumnProps<RecordType>) => null` 同款）。
 *
 * 详见 `docs/design-notes/jsx-api.md`。
 */
function TableColumn<RecordType = any>(_: ColumnProps<RecordType>): null {
  return null
}
// 显式声明为函数组件（displayName 便于 devtools 识别 + 运行时挂 type 标记供解析识别）。
const Column: <RecordType = any>(props: ColumnProps<RecordType>) => null =
  TableColumn as <RecordType = any>(props: ColumnProps<RecordType>) => null
;(Column as unknown as { displayName: string }).displayName = 'Table.Column'

/**
 * JSX 风格 API：`<Table.ColumnGroup>` 分组列声明组件（对齐 antd v6 `Table.ColumnGroup`）。
 *
 * **不渲染 DOM**（渲染 null）。声明一个多级表头分组列（`columns[].children` 的 JSX 等价物）。
 * props：`title`（分组列表头）+ `children`（Column / ColumnGroup 的 ReactElement 数组，任意深度嵌套）。
 * Table 适配层把它转换为 `{ title, ...rest, children: [...] }`（复用多级表头渲染）。
 *
 * 详见 `docs/design-notes/jsx-api.md`。
 */
function TableColumnGroup<RecordType = any>(_: ColumnGroupProps<RecordType>): null {
  return null
}
const ColumnGroup: <RecordType = any>(props: ColumnGroupProps<RecordType>) => null =
  TableColumnGroup as <RecordType = any>(props: ColumnGroupProps<RecordType>) => null
;(ColumnGroup as unknown as { displayName: string }).displayName = 'Table.ColumnGroup'

/**
 * 运行时类型标记——用于 `convertChildrenToColumns` 识别 JSX 子元素是 Column 还是 ColumnGroup。
 *
 * antd 依赖 React `type` 引用相等（node.type === Column）区分；data-grid 同款实现（Column 与
 * ColumnGroup 是模块内唯一函数引用，children 解析时用 `===` 比对）。同时挂 `__isDgColumn`/
 * `__isDgColumnGroup` 布尔标记作为防御性识别（避免混淆/打包重命名导致引用失配）。
 */
;(Column as unknown as { __isDgColumn: boolean }).__isDgColumn = true
;(ColumnGroup as unknown as { __isDgColumnGroup: boolean }).__isDgColumnGroup = true

function sizeToClass(size: SizeType | undefined): string | undefined {
  switch (size) {
    case 'small':
      return 'dg-size-small'
    case 'middle':
    // antd v6 'medium' 视觉等价 v5 'middle'（InternalTable.tsx:294 把 'middle' 映射为 'medium'）；
    // 共用 dg-size-middle 类（cell padding block 12 / inline 8）。
    case 'medium':
      return 'dg-size-middle'
    case 'compact':
      // antd v6 Table 组件本身**不存在 compact size**（SizeType = 'small'|'medium'|'middle'|'large'，
      //   config-provider/SizeContext.tsx:6；Table style 只输出 large/MD/SM 三档 token，
      //   table/style/index.ts:516-528）。compact 是 Button/Space/Input 等其它组件的尺寸概念。
      //   data-grid 的 SizeType 保留 'compact'（用于 <ConfigProvider componentSize> 全局消费的兜底），
      //   Table 层视觉等价 'small'（与 antd 6.4.4 实测最紧凑 Table 尺寸一致）。
      return 'dg-size-small'
    case 'large':
      // 显式 'large'：dg-size-large 类无样式覆写（等价默认无 size 类，padding 16/16）。
      return 'dg-size-large'
    default:
      return undefined
  }
}

/**
 * `Table` 对外组件（含静态属性 `Table.EXPAND_COLUMN` / `Table.SELECTION_COLUMN`，
 * 对齐 antd——在 `columns` 数组中插入哨兵对象可控制展开列 / 选择列位置）。
 *
 * 静态属性挂载在运行时 forwardRef 组件上（与 antd `ForwardTable.EXPAND_COLUMN = ...` 同款实现）。
 */
const TableComponent = forwardRef(TableInner) as <RecordType = any>(
  props: TableProps<RecordType> & { ref?: React.Ref<TableRef> },
) => React.ReactElement

// 运行时挂载静态属性（forwardRef 组件是函数对象，可挂属性；与 antd 同款实现）。
// 追加 SELECTION_ALL / SELECTION_NONE / SELECTION_INVERT（对齐 antd ForwardTable）、
// Summary（对齐 antd ForwardTable.Summary，含 .Row / .Cell 静态属性）、
// Column / ColumnGroup（对齐 antd `Table.Column` / `Table.ColumnGroup`，
// JSX 风格 API——`<Table.Column>` / `<Table.ColumnGroup>` 子元素声明列）。
Object.assign(TableComponent, {
  EXPAND_COLUMN,
  SELECTION_COLUMN,
  SELECTION_ALL,
  SELECTION_NONE,
  SELECTION_INVERT,
  Summary: SummaryComponent,
  Column,
  ColumnGroup,
})

export const Table = TableComponent as typeof TableComponent & {
  EXPAND_COLUMN: typeof EXPAND_COLUMN
  SELECTION_COLUMN: typeof SELECTION_COLUMN
  SELECTION_ALL: SelectionItem
  SELECTION_NONE: SelectionItem
  SELECTION_INVERT: SelectionItem
  /** 汇总组件（对齐 antd `Table.Summary`，含 .Row / .Cell）。 */
  Summary: typeof SummaryComponent
  /**
   * JSX 风格 API 单列组件（对齐 antd `Table.Column`）。
   * `<Table.Column title="..." dataIndex="..." />` 等价于在 `columns` 里声明一列。详见 `ColumnProps`。
   */
  Column: typeof Column
  /**
   * JSX 风格 API 分组列组件（对齐 antd `Table.ColumnGroup`）。
   * `<Table.ColumnGroup title="..."><Table.Column/></Table.ColumnGroup>` 等价于 `columns[].children`。详见 `ColumnGroupProps`。
   */
  ColumnGroup: typeof ColumnGroup
}

function TableInner<RecordType = any>(
  props: TableProps<RecordType>,
  ref: React.Ref<TableRef>,
) {
  const {
    dataSource = [],
    rowKey = 'key',
    bordered = false,
    size,
    showHeader = true,
    title,
    footer,
    gridOptions,
    scroll,
    virtual,
    rowSelection,
    expandable,
    pagination,
    loading,
    className,
    style,
    onChange,
    showSorterTooltip,
    components,
    summary,
    // 列宽策略 tableLayout（对齐 antd `TableProps.tableLayout`）。详见下方 derivedTableLayout 注释。
    tableLayout: tableLayoutProp,
    locale,
    classNames,
    styles,
    // Table 级列默认属性（对齐 antd `TableProps.column`）。undefined 时不合并（零回归）。
    column,
    // 页面级粘性表头（对齐 antd `TableProps.sticky`）。undefined/false 不启用（零回归）。
    sticky,
    // 新公共 API：onHeaderRow / onRow / rowClassName / getPopupContainer / rowHoverable。
    // 全部 undefined 时引擎零回归（不注入任何额外 DOM/props）。
    onHeaderRow,
    onRow,
    rowClassName,
    getPopupContainer,
    rowHoverable,
  } = props

  // === JSX 风格 API：columns 或 children 二选一 ===
  // 与 antd `columns || convertChildrenToColumns(children)`（InternalTable.tsx:231）逐字对齐：
  //   - 传 `columns` prop（含显式 `[]`）→ 走 columns 路径（所有现有 demo，零回归），JSX children 忽略。
  //   - 未传 `columns` prop（undefined）但传 JSX children（`<Table.Column>` / `<Table.ColumnGroup>`）
  //     → 走解析路径，用 convertChildrenToColumns 把 JSX 子元素转为 columns 数组。
  //   - 两者都未传 → columns=[] 空表（无列）。
  // ★ 关键：用 `props.columns === undefined` 区分"未传"与"显式传 []"（解构默认值无法区分，故不从解构取 columns）。
  //   仅当 columns 未传时才解析 children，保证传 columns 的所有现有 demo 零回归（visibleColumns/columnTree 等
  //   下游 useMemo 依赖项不变）。
  const columns: Array<ColumnOrSentinel<RecordType>> = useMemo(() => {
    let raw: Array<ColumnOrSentinel<RecordType>>
    if (props.columns !== undefined) {
      raw = props.columns
    } else if (props.children !== undefined && props.children !== null) {
      raw = convertChildrenToColumns<RecordType>(props.children)
    } else {
      raw = []
    }
    // 把 Table 级 `column` 默认属性浅合并到每个列（列自身优先；哨兵豁免；多级表头递归）。
    //   `column` undefined 时 applyColumnDefaults 原样返回 raw（零回归：现有 demo 列引用不变）。
    //   合并位置在 responsive 过滤 / 排序 / 筛选 / 列树构建之前，保证 column 默认（如 align/ellipsis/
    //   responsive/sorter/...）对所有下游机制生效（对齐 antd `useFilledColumns(rawColumns, column)`
    //   在 InternalTable 派生 baseColumns 时合并，下游消费 baseColumns）。
    return applyColumnDefaults<RecordType>(raw, column)
    // children 是 ReactNode（含 ReactElement），引用稳定（JSX 每次渲染产生新数组但元素引用稳定；
    // convertChildrenToColumns 依赖元素 props，props 变化时父组件本就会重渲染）。依赖 columns + children + column。
  }, [props.columns, props.children, column])

  const rowKeyResolved = rowKey as string | ((record: RecordType) => string | number)
  const { locale: contextLocale } = useContext(ConfigContext)
  const contextTableLocale = contextLocale?.Table as TableLocale | undefined
  const mergedLocale = useMemo<TableLocale>(
    () => ({
      ...defaultTableLocaleWithoutEmptyText,
      ...(contextTableLocale as TableLocale),
      ...locale,
    }),
    [contextTableLocale, locale],
  )

  // === 响应式 responsive：按当前视口断点过滤列（对齐 antd InternalTable.tsx:235-246）===
  // 实现移至 `useResponsiveColumns` hook（needResponsive 短路 + Grid.useBreakpoint + 按 screens 过滤）。
  //   - needResponsive=false（所有现有 demo 默认）：返回原 columns 引用（短路，下游 useMemo 不重算）。
  //   - needResponsive=true：按 screens 过滤；哨兵（EXPAND_COLUMN / SELECTION_COLUMN）不带 responsive，
  //     跳过判定并始终保留。
  const visibleColumns = useResponsiveColumns<RecordType>(columns)

  // === 单列 + 多列排序（须在选择 / 展开之前派生 sortedDataSource，供下游 hooks 消费）===
  // useSorter 从原始 antd columns 派生排序状态（受控/非受控、sortDirections 循环、defaultSortOrder、
  // 多列 multiple 优先级）。
  // - sortOrderMap：每列 sortOrder（键 = resolveColumnSortKey(column) = column.key ?? dataIndex，
  //   与 antd sorter.columnKey 取值一致）。单列模式下仅一列非 null；多列模式下可多列非 null。
  // - sortPriorityMap：多列模式下激活列的优先级序号（1-based，按 multiple 降序，
  //   multiple 最大=编号 1=最高优先级，对齐 antd getSortData 实际比较顺序）；单列模式空。
  // - sortedDataSource：非受控时为排序后的 dataSource 副本（单列直接排；多列按 multiple 链式叠加）；
  //   受控时为原 dataSource。
  // - onSorterClick：引擎表头格点击时触发（该列自身 sortDirections 循环 + 单列/多列状态切换 + onChange 分发）。
  // 注意：传入的 columns 是**已过滤哨兵**的原始 antd 列（哨兵不是可排序列）。
  // 详见 `docs/design-notes/filter-sorter.md`。
  // === 分页状态占位 ref ===
  // useSorter（在下方）/ useFilter（下方）的 onChange 在用户交互时触发（滞后于 render），
  // 届时 ref 已被 usePagination（更下方）同步为最新分页状态。这样 sort/filter 触发的 onChange
  // 的 pagination 参数始终反映当前分页（对齐 antd：onChange 的 pagination 始终反映当前分页）。
  // 初始值兜底（pagination 未启用时也安全——下方 useMemo 会算出"未启用"态注入）。
  const paginationStateRef = useRef<TablePaginationState>({ current: 1, pageSize: 0, total: 0 })

  const sortableColumns = useMemo(
    () =>
      // 嵌套叶子排序/筛选修复（grouping-columns）：useSorter/useFilter 的 columns 入参必须是
      //   **扁平叶子列**。原实现直接传顶层 visibleColumns（保留 children 嵌套），导致 onSorterClick/
      //   setFilterValue 内的 `columns.find(c => resolveColumnSortKey(c) === key)` 仅扫顶层列——
      //   多级表头下嵌套叶子（如 Other.Age，sortKey='age'）找不到（顶层只有 Other，sortKey='other'）
      //   → 点击排序/应用筛选静默失效。修复：递归展开 children 取叶子列传入。
      //   对齐 antd（antd InternalTable 用 flattenColumns 扁平化后给 useSorter/useFilter）。
      //   顶层叶子 demo（head 等）扁平化后仍是自身，零回归。
      flattenLeafColumns(
        (visibleColumns as Array<ColumnOrSentinel<RecordType>>).filter(
          (c): c is ColumnType<RecordType> =>
            c !== SELECTION_COLUMN && c !== EXPAND_COLUMN,
        ),
      ),
    [visibleColumns],
  )
  const { sortOrderMap, sortPriorityMap, sortedDataSource, onSorterClick, currentSorterResult } = useSorter<RecordType>({
    columns: sortableColumns,
    dataSource,
    // 包装 onChange，把 useSorter 内部传入的占位 pagination `{}` 替换为当前实际分页状态
    // （paginationStateRef.current，对齐 antd：onChange 的 pagination 始终反映当前分页）。
    // filters/sorter/extra 原样透传（useSorter 内部已组装 filters={} / sorter / action:'sort'）。
    onChange: onChange
      ? (_pagination, filters, sorter, extra) => {
          onChange(paginationStateRef.current, filters, sorter, extra)
        }
      : undefined,
  })

  // === 基础列筛选（须在选择 / 展开之前派生 filteredDataSource，供下游 hooks 消费）===
  // useFilter 从原始 antd columns + sortedDataSource 派生筛选状态（受控/非受控、filteredValue、
  // defaultFilteredValue、filterMultiple）。
  // - filteredValueMap：每列激活筛选值（键 = resolveFilterKey(column) = column.key ?? dataIndex，
  //   与 sortKey 一致）。
  // - filteredDataSource：非受控时为"排序后 → 筛选后"的数据源（叠加顺序：raw → sort → filter，
  //   对齐 antd）；受控时为 sortedDataSource（外部控制）。
  // - setFilterValue：FilterDropdown 应用/重置时触发（引擎层 onFilterApply 转发到此）。
  // 注意：传入 sortedDataSource（排序后），实现 raw → sort → filter 叠加（与 antd 一致）。
  // 排序结果（sortOrderMap/sortedDataSource）变化时，useFilter 的输入随之变化，filteredDataSource
  // 重算（筛选条件基于新排序结果——虽然筛选是数据集合层面操作、与顺序无关，但叠加链顺序对齐 antd）。
  // 详见 `docs/design-notes/filter-sorter.md`。
  const { filteredValueMap, filteredDataSource, setFilterValue, getFiltersArg } = useFilter<RecordType>({
    columns: sortableColumns,
    dataSource: sortedDataSource,
    onFilterChange: (filters, currentDataSource) => {
      // 适配层注入最新 sorter（useSorter.currentSorterResult），组装完整 onChange。
      // sorter 取当前排序状态（非"本次筛选前的"也非"点击排序触发的 nextStates"——
      // 筛选不改变排序，sorter 应反映当前已应用的排序）。
      // 注入当前分页状态（对齐 antd：onChange 的 pagination 始终反映当前分页）。
      if (!onChange) return
      onChange(
        paginationStateRef.current,
        filters,
        currentSorterResult,
        { currentDataSource, action: 'filter' },
      )
    },
  })

  // === 树形数据（须在选择 / 展开之前派生 flattenedDataSource，供下游 hooks 消费）===
  // 解析 childrenColumnName / indentSize：expandable.* 字段优先（对齐 antd getExpandableProps），
  // 未设时用 Table 级字段；都未设时用默认 'children' / 15（对齐 antd 6.4.4 实测 InternalTable.tsx:611）。
  const childrenColumnName =
    expandable?.childrenColumnName ?? props.childrenColumnName ?? 'children'
  const indentSize = expandable?.indentSize ?? 15

  // useTreeData：检测树形（任一 record 含 childrenColumnName 非空数组）→ 扁平化 + 展开过滤。
  // 非树形 → flattenedData 原样 filteredDataSource（零回归）；rowInfoMap/parentChildrenMap 空。
  const tree = useTreeData<RecordType>({
    dataSource: filteredDataSource,
    childrenColumnName,
    rowKey: rowKeyResolved,
    expandable: expandable as Expandable<RecordType> | undefined,
  })
  const treeEnabled = tree.treeEnabled
  // 树形模式下，下游选择/展开/分页/渲染都消费 flattenedData（仅可见行）。
  // 非树形 → flattenedData === filteredDataSource（同引用，零回归）。
  const flattenedDataSource = tree.flattenedData

  // === 行选择（useSelectionAdapter：模式解析 + selectionLookup + 受控/非受控 state +
  //   useRowSelection 调用 + fireSelectionChange 分发，详见 ./useSelectionAdapter.ts）===
  const {
    selectionEnabled,
    nativeSelectionConfigured,
    resolvedSelectionMode,
    resolvedRowSel,
    showSelectionColumn,
    selection,
    effectiveSelectedKeys,
    fireSelectionChange,
    selectionAnchorKey,
    setSelectionAnchorKey,
  } = useSelectionAdapter<RecordType>({
    rowSelection: rowSelection as TableRowSelection<RecordType> | undefined,
    gridSelection: gridOptions?.selection as GridSelectionOptions<RecordType> | undefined,
    flattenedDataSource,
    filteredDataSource,
    treeEnabled,
    childrenColumnName,
    rowKey: rowKeyResolved,
    parentChildrenMap: tree.parentChildrenMap,
  })

  // === 行展开状态（useRowExpand hook 派生；引擎 + 展开列 render 闭包共同消费）===
  // 用排序后的顺序 + 筛选后的数据源（与引擎实际渲染顺序一致）。
  // 树形模式下**不启用** expandState（antd 行为：tree-data 与 expandedRowRender 互斥，树形优先）。
  //   故 useRowExpand 仍调用（非树形 demo 不破），但 engineExpandState 在树形模式下返回 undefined
  //   （见下方 useMemo 守卫）。
  const expand = useRowExpand<RecordType>({
    expandable: expandable as Expandable<RecordType> | undefined,
    dataSource: flattenedDataSource,
    rowKey: rowKeyResolved,
  })
  // 树形模式下禁用 expand（即使 expandable.expandedRowRender 存在）——树形优先。
  const expandEnabled = !treeEnabled && expand.expandEnabled
  const showExpandColumn =
    expandEnabled && (expandable?.showExpandColumn !== false)

  // === 构建引擎列树（支持任意深度 children）。引擎内部按需退化为单层快速路径（maxDepth===1）。===
  // 若 rowSelection 传入，在最前插入一个"选择列"叶子节点（参与 grid 布局）。
  //   选择列的 render/title 是闭包（捕获当前 selection state），每次切换勾选都会重建 columnTree。
  //   引擎 resolveColumnTree 随之重算（O(cols)），可接受（antd rc-table 同样每次切换重渲染）。
  // 若 expandable 传入且至少有一行可展开，在最前插入一个"展开列"叶子节点（在选择列之后）。
  //   展开列的 render 是闭包（捕获当前 expand state），每次展开/收起都会重建 columnTree。
  //
  // === Table.EXPAND_COLUMN / Table.SELECTION_COLUMN 哨兵（order-column demo）===
  // 若 columns 数组含哨兵对象，选择列 / 展开列插在哨兵位置（而非默认最前）。
  // 不含哨兵时按默认位置：选择列最前，展开列在选择列之后。
  const selectionNode = resolvedRowSel && showSelectionColumn
    ? buildSelectionColumnNode<RecordType>(
        resolvedRowSel,
        selection,
        fireSelectionChange,
        rowKeyResolved,
        mergedLocale,
      )
    : null
  const expandNode =
    expandEnabled && showExpandColumn
      ? buildExpandColumnNode<RecordType>(
          expandable as Expandable<RecordType>,
          expand,
          rowKeyResolved,
          mergedLocale,
        )
      : null

  const { columnTreeWithSortAndFilter } = useColumnTreeBuilder<RecordType>({
    visibleColumns,
    selectionNode,
    expandNode,
    showSorterTooltip,
    sortOrderMap,
    sortPriorityMap,
    filteredValueMap,
  })

  // === 语义化样式 classNames/styles 求值 ===
  // 支持对象（静态）或函数 `(info) => 对象`（动态，按 info.props 求值）。对齐 antd v6：
  //   - info.props 含 size/bordered/virtual/scroll/pagination 子集（与 antd 一致：暴露当前生效 props）。
  //   - 求值后统一得到 `TableSemanticClassNames`/`TableSemanticStyles` 对象。
  // 适配层直接消费 root/title/footer/pagination.*（注入到对应 DOM）；section/content/header/body
  //   透传给引擎（GridTable.semantic）由引擎注入到 grid 内部部位。
  // 未提供（undefined）时 semanticResolved 为 undefined，所有部位走默认 class/style，零回归。
  // 求值 + 引擎子集构造抽出为独立 hook `useSemanticClassNames`（行为零差异，先移动不重写）。
  const { classNamesResolved, stylesResolved, engineSemantic } = useSemanticClassNames(
    classNames,
    styles,
    size,
    bordered,
    virtual,
    scroll,
    pagination as false | TablePaginationConfig | undefined,
  )

  const {
    scrollBarShowOnTableHover,
    scrollBarExpandOnHover,
    scrollBarTouchedActive,
    activateScrollBarByTouch,
  } = useScrollbarTouch({ scrollBarFoldMode: gridOptions?.scrollBarFoldMode })

  // sticky 启用时给 .dg-wrapper 加 dg-sticky 修饰类。
  //   table.css 的 .dg-wrapper 默认 overflow:hidden + width:100%（圆角裁剪 + 容器约束），
  //   但 overflow:hidden 使 .dg-wrapper 成为表头 sticky 的非 visible 溢出祖先（CSS 规范），
  //   拦截 sticky 上下文，导致页面级 sticky 表头相对 viewport 永不触发。
  //   sticky 模式改用 .dg-sticky：overflow:clip 裁剪宽表但不创建滚动容器，横向位移由
  //   GridTable 内部的 StickyScrollBar + transform 驱动，避免撑宽外层文档流。
  //   详见 `docs/design-notes/sticky.md`。
  const stickyClassEnabled = sticky !== undefined && sticky !== false
  // scroll.y===true 数据区域模式 → .dg-wrapper 加 dg-data-area 修饰类
  //   （display:flex; flex-direction:column; height:100%），让表体区（.dg-scroll-wrap）
  //   flex:1 填满父容器剩余空间（CSS 自动适应高度，不用 JS 算数字）。父容器需有明确 height。
  //   详见 `docs/design-notes/layout.md`。
  const dataAreaClassEnabled = scroll?.y === true
  const wrapperClass = [
    'dg-wrapper',
    sizeToClass(size),
    bordered ? 'dg-bordered' : '',
    stickyClassEnabled ? 'dg-sticky' : '',
    dataAreaClassEnabled ? 'dg-data-area' : '',
    scrollBarShowOnTableHover ? 'dg-scrollbar-table-hover' : '',
    scrollBarExpandOnHover ? '' : 'dg-scrollbar-no-expand',
    scrollBarTouchedActive ? 'dg-scrollbar-touched' : '',
    className ?? '',
    // 语义化 root 部位 className（合并到根容器）。
    classNamesResolved?.root ?? '',
    // dg-content-scrolled 类在下方 contentScrolledEnabled 计算后动态拼接
    //   （依赖 topPaginationNode/bottomPaginationNode，它们在 paginationInfo/placement 之后声明）。
  ]
    .filter(Boolean)
    .join(' ')

  // 主题注入：alias/table token → CSS vars 编排 + wrapperStyle 合并。
  // 集中 antd 内部 API 依赖（useAntdInternalToken / tokenBridge）于 hook，逻辑详见 `./useTableThemeVars.ts`。
  const { wrapperStyle } = useTableThemeVars(style, stylesResolved)

  // 列宽策略 tableLayout 派生（对齐 antd rc-table `Table.tsx:613-627` mergedTableLayout）。
  // 派生规则与设计依据详见 `./tableLayoutResolver.ts` 顶层注释。
  const derivedTableLayout: 'auto' | 'fixed' = useMemo(
    () => resolveTableLayout(tableLayoutProp, visibleColumns, scroll?.x, scroll?.y, sticky),
    [tableLayoutProp, visibleColumns, scroll?.x, scroll?.y, sticky],
  )

  // 引擎层 ref（暴露 scrollTo 等）。本组件的 forwardRef ref 桥接到它。
  const engineRef = useRef<TableEngineHandle | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useImperativeHandle(
    ref,
    () => buildTableRefHandle<RecordType>(
        engineRef.current,
        rootRef.current,
        flattenedDataSource,
        rowKeyResolved,
      ),
    [flattenedDataSource, rowKeyResolved],
  )

  // === 引擎展开状态对象 ===
  // 把 useRowExpand 的派生结果封装为 EngineExpandState，传给引擎。
  // 引擎据此插展开内容 track（0fr/1fr）+ 渲染展开内容；展开列 render 闭包直接用 expand（hook 结果）。
  // 树形模式下 engineExpandState 恒 undefined（树形优先；treeState 单独传）。
  const engineExpandState: EngineExpandState | undefined = useMemo(() => {
    if (treeEnabled) return undefined
    if (!expandEnabled || !expandable?.expandedRowRender) return undefined
    return {
      expandEnabled,
      isExpanded: expand.isExpanded,
      expandableKeySet: expand.expandableKeySet,
      isExpandable: (key) => expand.expandableKeySet.has(key),
      expandedRowRender: (record, index, expanded) =>
        expandable.expandedRowRender!(record, index, 0, expanded),
      expandedRowOffset: expandable.expandedRowOffset,
      toggleExpand: expand.toggleExpand,
      showExpandColumn,
      expandIcon: expandable.expandIcon,
    }
  }, [treeEnabled, expandEnabled, expandable, expand, showExpandColumn])

  // === 行展开 + 行点击绑定（useExpandRowBinding：expandRowByClick 派生 + onRowWithExpand
  //   行点击选择 single/multiple/extended-shift + expandRowByClick 叠加 + rowClassNameWithExpand
  //   展开行追加 class，详见 ./useExpandRowBinding.ts）===
  const { onRowWithExpand, rowClassNameWithExpand } = useExpandRowBinding<RecordType>({
    expandEnabled,
    expandable: expandable as Expandable<RecordType> | undefined,
    expand,
    onRow,
    rowClassName,
    rowKey: rowKeyResolved,
    nativeSelectionConfigured,
    resolvedSelectionMode,
    selection,
    selectionAnchorKey,
    setSelectionAnchorKey,
    effectiveSelectedKeys,
    fireSelectionChange,
  })


  // 把 useTreeData 的派生结果封装为 EngineTreeState，传给引擎。
  // 引擎据此在第一列数据单元格内按 level × indentSize 左缩进 + 渲染展开/收起图标。
  // 非树形 → undefined（零回归，引擎不消费）。
  // 详见 `docs/design-notes/header.md`（树形缩进）。
  const engineTreeState: EngineTreeState | undefined = useMemo(() => {
    if (!treeEnabled) return undefined
    return {
      treeEnabled,
      indentSize,
      rowInfoMap: tree.rowInfoMap,
      isExpanded: tree.isExpanded,
      toggleExpand: tree.toggleExpand,
    }
  }, [treeEnabled, indentSize, tree])

  // === 页面级粘性表头归一化 ===
  // 对外 `sticky?: boolean | StickyConfig`（对齐 antd v6）→ 引擎层统一为
  // `{ offsetHeader?, offsetScroll?, getContainer? } | undefined`。
  //   - undefined / false：不启用（engineSticky=undefined，零回归）。
  //   - true：启用（默认偏移 0；engineSticky={}，引擎读 offsetHeader/offsetScroll 时兜底 0）。
  //   - 对象：原样透传。
  //   详见 `docs/design-notes/sticky.md`。
  const engineSticky = useMemo(() => {
    if (sticky === undefined || sticky === false) return undefined
    if (sticky === true) return {}
    return sticky
  }, [sticky])

  // === 分页集成（usePaginationAdapter：派生 + 切片 + 渲染分页节点）===
  // paginationStateRef 在顶部声明（L343，在 useSorter 之前），供 useSorter/useFilter 的 onChange
  //   闭包注入最新分页。hook 内写 .current，外部读。
  const {
    pagedDataSource,
    topPaginationNode,
    bottomPaginationNode,
  } = usePaginationAdapter<RecordType>({
    pagination,
    flattenedDataSource,
    paginationStateRef,
    onChange,
    getFiltersArg,
    currentSorterResult,
    size,
    classNamesResolved,
    stylesResolved,
  })

  // === 汇总 summary 解析 ===
  // summary prop：函数 → 用 pagedDataSource（当前页数据）调用；ReactNode → 原样。
  // ★ 与 title/footer 传 filteredDataSource（全量）不同：summary 传 **pagedDataSource**（当前页），
  //   对齐 antd summary 实际行为（antd summary 的 pageData 也是当前页数据）。未启用分页时
  //   pagedDataSource = filteredDataSource（全量）。
  //   详见 `docs/design-notes/summary.md`。
  const summaryNode: ReactNode = useMemo(() => {
    if (summary === undefined || summary === null) return null
    if (typeof summary === 'function') {
      return (summary as (pageData: Array<RecordType>) => ReactNode)(pagedDataSource)
    }
    return summary
  }, [summary, pagedDataSource])

  const emptyText = useTableEmptyText({
    rowCount: pagedDataSource.length,
    locale: mergedLocale,
  })

  // ★ 内容区滚动模式（pagination/footer 滚动条出框修复）。
  //
  // 【背景】antd 范式：横向滚动条落在表格**内容区**内（`.ant-table-content`，圆角框内、
  //   pagination 之上）。data-grid 原 `.dg-wrapper{overflow-x:auto}` 把滚动条挂在 wrapper 底沿——
  //   当存在 pagination/footer 时，wrapper 底沿在 pagination/footer **之下**、表格圆角框**外**，
  //   滚动条视觉出框（实测 bug）。
  //
  // 【修复】引入"内容区滚动模式"（dg-content-scrolled）：
  //   - 触发条件：存在 pagination（top 或 bottom）或 footer，**且**非数据区域模式（scroll.y）
  //     **且**非 sticky 模式（sticky 走页面级滚动，不适用容器内出条）。
  //   - 行为：`.dg-wrapper` 改 overflow-x:hidden（抑制外层出条），由内部 `.dg-scroll`
  //     （overflow-x:auto，Table 组装层包在 `<GridTable>` 外）承载横向滚动——该 `.dg-scroll`
  //     只含 `<GridTable>`（表格内容区），不含 pagination/footer（它们仍是 `.dg-wrapper`
  //     直接子节点，在 `.dg-scroll` 之外）。滚动条落在表格内容区内（圆角框内、pagination 之上）。
  //
  // 【与 GridTable 内部 .dg-scroll 的协调】：GridTable 在 scroll.x 或 hasFixed 时内部自包
  //   `.dg-scroll`（GridTable.tsx:1468/1511）。外层再包一层 `.dg-scroll` 时：
  //   - 内层 `.dg-scroll`（width:100%）不撑宽外层 → 外层 scrollWidth===clientWidth → 外层不出条。
  //   - 固定列 sticky 相对**最近的**可滚动祖先（内层 `.dg-scroll`）工作，行为正确。
  //   - 故"有固定列 + 有 pagination"组合：内层出条（正确），外层不出条（wrapper hidden），
  //     无副作用、无 sticky 上下文破坏。
  //
  // 【零回归】：basic/head/ellipsis/row-selection 等无 pagination/footer 的 demo
  //   contentScrolledEnabled===false，不包外层 `.dg-scroll`、wrapper 保留 overflow-x:auto（现状）。
  //
  // 【为何此处才计算】：依赖 topPaginationNode/bottomPaginationNode（上方刚声明），它们又依赖
  //   paginationInfo/placement/showPagination（更后置），无法在上面的 wrapperClass 原地处计算，
  //   故采用 finalWrapperClass 二次拼接 dg-content-scrolled 类。
  //
  // 详见 `docs/design-notes/scrollbar.md`（横向滚动条位置策略）。
  const contentScrolledEnabled =
    (!!topPaginationNode || !!bottomPaginationNode || !!footer) &&
    !dataAreaClassEnabled &&
    !stickyClassEnabled
  const finalWrapperClass = contentScrolledEnabled
    ? `${wrapperClass} dg-content-scrolled`
    : wrapperClass

  // 表格内容（topPagination / title / 表体 / footer / bottomPagination）。
  // loading 启用时用 Spin 包裹；未启用时直接渲染（零 DOM 变化）。
  // title/footer 注入 semantic.title / semantic.footer 的 className/style；
  //   GridTable 接收 engineSemantic（section/content/header/body 子集）。
  const titleClassName = classNamesResolved?.title
  const titleStyle = stylesResolved?.title
  const footerClassName = classNamesResolved?.footer
  const footerStyle = stylesResolved?.footer
  const tableContent = (
    <>
      {topPaginationNode}
      {title ? (
        <div
          className={['dg-title', titleClassName].filter(Boolean).join(' ')}
          style={titleStyle}
        >
          {title(flattenedDataSource)}
        </div>
      ) : null}
      {/*
        内容区滚动模式（contentScrolledEnabled）下把 `<GridTable>` 包一层 `.dg-scroll`。
        该 `.dg-scroll` 只含 `<GridTable>`，不含 pagination/footer（它们在 `.dg-scroll` 之外，
        仍是 `.dg-wrapper` 直接子节点）——即此层仅作"内容区边界"。

        横向滚动现已统一交给 GridTable 内部的 FloatingScrollBar（见 GridTable renderScrollContainer
        路由：非 sticky 模式 horizontal 始终 true，原生横滚动条永不出现）。因此外层 `.dg-scroll`
        overflow-x:hidden——不再自身出条，仅承载圆角裁剪与内容区边界语义。

        不启用时（basic/head 等无 pagination/footer 的 demo）直接渲染 `<GridTable>`，零 DOM 变化。
        详见 `docs/design-notes/scrollbar.md`。
      */}
      {contentScrolledEnabled ? (
        <div className="dg-scroll" style={{ overflowX: 'hidden' }}>
          <GridTable<RecordType>
            ref={engineRef as unknown as React.Ref<TableEngineHandle>}
            columnTree={columnTreeWithSortAndFilter}
            dataSource={pagedDataSource}
            rowKey={rowKeyResolved}
            gridOptions={gridOptions}
            showHeader={showHeader}
            scroll={scroll}
            virtual={virtual}
            expandState={engineExpandState}
            treeState={engineTreeState}
            tableLayout={derivedTableLayout}
            onSorterClick={onSorterClick}
            onFilterApply={setFilterValue}
            components={components}
            summary={summaryNode}
            emptyText={emptyText}
            semantic={engineSemantic}
            sticky={engineSticky}
            onHeaderRow={onHeaderRow}
            onRow={onRowWithExpand}
            rowClassName={rowClassNameWithExpand}
            getPopupContainer={getPopupContainer}
            rowHoverable={rowHoverable}
            isRowSelected={
              selectionEnabled
                ? (record: RecordType) => selection.isSelected(getRowKey(record, rowKeyResolved))
                : undefined
            }
            // Table 级 locale 透传到引擎 → FilterDropdown（filterConfirm/Reset/EmptyText/
            //   SearchPlaceholder/CheckAll）。locale 为 undefined 时引擎/FilterDropdown 回退到内置默认值。
            filterLocale={mergedLocale}
          />
        </div>
      ) : (
        <GridTable<RecordType>
          ref={engineRef as unknown as React.Ref<TableEngineHandle>}
          columnTree={columnTreeWithSortAndFilter}
          dataSource={pagedDataSource}
          rowKey={rowKeyResolved}
          gridOptions={gridOptions}
          showHeader={showHeader}
          scroll={scroll}
          virtual={virtual}
          expandState={engineExpandState}
          treeState={engineTreeState}
          tableLayout={derivedTableLayout}
          onSorterClick={onSorterClick}
          onFilterApply={setFilterValue}
          components={components}
          summary={summaryNode}
          emptyText={emptyText}
          semantic={engineSemantic}
          sticky={engineSticky}
          onHeaderRow={onHeaderRow}
          onRow={onRowWithExpand}
          rowClassName={rowClassNameWithExpand}
          getPopupContainer={getPopupContainer}
          rowHoverable={rowHoverable}
          // 行选中态判定 → 引擎加 dg-row-selected 类（CSS 消费
          //   --ant-table-row-selected-bg / row-selected-hover-bg）。仅 rowSelection 启用时提供
          //   （无选择 demo 零回归，避免每 cell 多一次回调）；record→key 用 canonical getRowKey（与引擎一致）。
          isRowSelected={
            selectionEnabled
              ? (record: RecordType) => selection.isSelected(getRowKey(record, rowKeyResolved))
              : undefined
          }
          // Table 级 locale 透传到引擎 → FilterDropdown（filterConfirm/Reset/EmptyText/
          //   SearchPlaceholder/CheckAll）。locale 为 undefined 时引擎/FilterDropdown 回退到内置默认值。
          filterLocale={mergedLocale}
        />
      )}
      {footer ? (
        <div
          className={['dg-footer', footerClassName].filter(Boolean).join(' ')}
          style={footerStyle}
        >
          {footer(flattenedDataSource)}
        </div>
      ) : null}
      {bottomPaginationNode}
    </>
  )

  return (
    <div
      className={finalWrapperClass}
      style={wrapperStyle}
      ref={rootRef}
      onPointerDownCapture={scrollBarShowOnTableHover ? activateScrollBarByTouch : undefined}
    >
      <TableLoadingContainer loading={loading}>{tableContent}</TableLoadingContainer>
    </div>
  )
}

/**
 * 引擎对外暴露的句柄（仅 scrollTo）。与 `engine/GridTable.tsx` 的 `GridTableHandle`
 * 结构一致（这里独立定义避免引擎类型外泄到对外 API 文档）。
 */
interface TableEngineHandle {
  scrollTo: (config: {
    index?: number
    scrollTop?: number
    offset?: number
    align?: 'start' | 'center' | 'end' | 'nearest'
    /** 'auto'（默认，瞬时）| 'smooth'（原生平滑动画 + 到达检测）。 */
    behavior?: 'auto' | 'smooth'
  }) => void
}

export { getRowKey }
// 命名导出 Column / ColumnGroup 组件（同时挂为 Table.Column / Table.ColumnGroup 静态属性）。
export { Column, ColumnGroup }
export type {
  TableProps,
  ColumnType,
  ColumnProps,
  ColumnGroupProps,
  GridSelectionOptions,
  GridSelectionMode,
  GridSelectionValue,
  SizeType,
  TableRef,
  TableLocale,
  TablePaginationConfig,
  TablePaginationPlacement,
  TablePaginationState,
  ScrollBarFoldMode,
} from './types'
