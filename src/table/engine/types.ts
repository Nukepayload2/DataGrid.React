/**
 * data-grid 内部渲染引擎类型定义。
 *
 * 这是 CSS Grid 渲染层（F1）的内部约定，**不**对外暴露。
 * 对外 antd 兼容接口见 `src/table/Table.tsx`（F2 适配层）。
 *
 * 设计目标：
 * - 不使用 `<table>` 元素，纯 div + CSS Grid。
 * - 行高走"行高约定"（rowHeight 数字或函数），不做动态测量（决策 1）。
 * - 预留 fixed / virtual / children(多级表头) / colSpan / rowSpan / rowExpand 钩子（本阶段仅接口位）。
 */

import type { ReactNode } from 'react'

/** 对齐方式（antd column.align 子集）。 */
export type Align = 'start' | 'center' | 'end'

/** 固定列方向。antd 同时接受 'left'/'right'，这里在适配层做归一化为 'start'/'end'。 */
export type FixedSide = 'start' | 'end'

/**
 * 筛选项（S3，引擎层独立类型；与对外 `ColumnFilterItem` 同语义）。
 * 引擎只消费 `text`/`value`（渲染下拉项 + 勾选比对）；`children`（S7 树形）引擎不消费。
 */
export interface EngineFilterItem {
  text: ReactNode
  value: string | number
  children?: Array<EngineFilterItem>
}

/**
 * 排序方向（S1）。对齐 antd `SortOrder`。
 * 注意：引擎层与对外 `SortOrder` 同语义，这里独立定义避免对外类型外泄到内部约定。
 */
export type EngineSortOrder = 'ascend' | 'descend' | null

/**
 * 排序比较函数（S1）。对齐 antd `CompareFn`。
 */
export type EngineCompareFn<RecordType = any> = (
  a: RecordType,
  b: RecordType,
  sortOrder?: EngineSortOrder,
) => number

/**
 * 排序器配置（S1）。与对外 `ColumnSorter` 同语义；引擎层独立类型。
 */
export type EngineColumnSorter<RecordType = any> =
  | boolean
  | EngineCompareFn<RecordType>
  | { compare?: EngineCompareFn<RecordType>; multiple?: number }

/**
 * 引擎内部使用的叶子列描述。
 * 由 antd `columns`（适配层）扁平化 + 规整后得到。
 */
export interface EngineLeafColumn<RecordType = any> {
  /** 稳定 key（antd column.key 或 dataIndex）。 */
  key: string
  /** 数据取值路径（antd column.dataIndex）。 */
  dataIndex?: string | number | Array<string | number>
  /** 表头文本或节点。 */
  title?: ReactNode
  /** 列宽（数字按 px，字符串直接作为 track size，如 '200px' / '1fr' / 'max-content'）。 */
  width?: number | string
  /** 对齐方式。 */
  align?: Align
  /** 是否固定列（已归一化为 start/end）。 */
  fixed?: FixedSide
  /** 是否单行省略号。本阶段仅样式占位（详见 S20 任务）。 */
  ellipsis?: boolean
  /**
   * 是否隐藏该列（M6）。
   * `true`：该叶子列在 `grid-template-columns` 中占一条 `0fr` track（track 仍存在，线号不变），
   * 单元格/表头格内容用 `visibility:hidden + overflow:hidden` 隐藏；`.dg-grid` 上
   * `transition: grid-template-columns` 实现 0fr↔原宽平滑过渡（lun 思路）。
   *
   * 关键：隐藏列**不删除 track**，只置 0fr，保证 M1 多级表头线号 / M2 固定列偏移 /
   * M3 合并 span / M4 虚拟 / M5 选择列均不受线号跳变影响。
   */
  hidden?: boolean
  /**
   * 自定义单元格渲染。
   * 签名对齐 antd column.render 的常用子集：
   *   (text, record, index) => ReactNode
   */
  render?: (text: any, record: RecordType, index: number) => ReactNode
  /**
   * 单元格合并入口（M3）。
   * 返回 { colSpan?, rowSpan? }；含 0 表示该格被覆盖（不渲染）。
   * 详见对外 types.ts ColumnType.onCell 注释。
   */
  onCell?: (record: RecordType, index: number) => { colSpan?: number; rowSpan?: number } | undefined
  /**
   * 表头格横向跨列数（M3）。
   * `colSpan: N` (N>=2)：表头格跨 N 个叶子列；后续 N-1 叶子列需 `colSpan: 0`（被覆盖，不渲染表头格）。
   * `colSpan: 0`：表头格被覆盖，不渲染。详见对外 types.ts ColumnType.colSpan。
   */
  colSpan?: number
  /** 行标题语义（M3，a11y/视觉占位，不影响布局）。 */
  rowScope?: 'row'
  /**
   * 排序器（S1）。true=默认比较；函数=自定义；false/undefined=不可排序。
   * 引擎不消费此字段做排序逻辑（排序由适配层 useSorter 完成），仅用于渲染排序图标 + 判定该列是否可排序。
   */
  sorter?: EngineColumnSorter<RecordType>
  /**
   * 当前排序方向（S1，由适配层 useSorter 解析后传入）。
   * 引擎据此渲染排序图标三态（升序 caret-up 高亮 / 降序 caret-down 高亮 / null 两 caret 灰）。
   */
  sortOrder?: EngineSortOrder
  /**
   * 多列排序优先级序号（S2，1-based，由适配层 useSorter 解析后传入）。
   * 仅当该列激活（sortOrder 非 null）且处于多列模式时有值；引擎据此在表头 caret 旁渲染优先级数字。
   * undefined/0 表示不显示序号（单列模式或未激活列）。
   */
  sortPriority?: number
  /**
   * 点击表头切换排序的循环顺序（S1）。
   * 引擎不消费，仅透传到 headerCells 供表头格渲染参考（当前未直接用；循环逻辑在适配层）。
   */
  sortDirections?: Array<'ascend' | 'descend'>
  /**
   * 是否显示排序提示 tooltip（S1）。引擎不消费，仅透传到 headerCells 供表头格渲染 tooltip。
   */
  showSorterTooltip?: boolean | { target?: 'full-header' | 'sorter-icon' }
  /**
   * 筛选项列表（S3，仅叶子列消费）。非空 + onFilter 时该列表头渲染筛选漏斗图标。
   * 引擎只消费顶层项（`children` 不渲染二级菜单 UI——属 S7）；适配层 useFilter 已把 children 扁平化。
   */
  filters?: Array<EngineFilterItem>
  /**
   * 筛选判定函数（S3，仅叶子列消费）。引擎不调用（适配层 useFilter 调），仅作为"该列可筛选"的标志
   * （与 filters 同时存在才渲染漏斗）。
   */
  onFilter?: (value: string | number, record: RecordType) => boolean
  /**
   * 是否多选筛选（S3，默认 true）。引擎据此决定下拉用 Checkbox.Group 还是 Radio。
   */
  filterMultiple?: boolean
  /**
   * 当前激活的筛选值数组（S3，由适配层 useFilter 解析后传入，受控/非受控统一在此）。
   * 引擎据此渲染漏斗激活态（FilterFilled 高亮）+ 下拉默认勾选。
   * 空数组/undefined/null 均视为"无激活筛选"（漏斗为 FilterOutlined 灰态）。
   */
  filteredValue?: Array<string | number> | null
  /**
   * 关闭下拉即应用（S3，默认 true）。引擎据此控制 Dropdown 的 onOpenChange 行为。
   */
  filterOnClose?: boolean
  /** 原始 antd column，按需透传（后续任务 colSpan/rowSpan/onCell 等使用）。 */
  raw?: unknown
}

/**
 * 引擎列树节点（M1 多级表头）。
 *
 * 由 antd `columns[].children` 嵌套映射而来，**任意深度**。
 * - 叶子节点（`children` 为空/undefined）：参与 `grid-template-columns` 列宽拼接与数据行渲染，
 *   与 `EngineLeafColumn` 一一对应（前序遍历即叶子列顺序）。
 * - 非叶子节点：仅作为表头分组，渲染一个跨多列的表头格。
 *
 * 树的遍历顺序（前序）即 antd 列的渲染顺序；固定列 `fixed` 由父节点向子节点继承
 * （M2 落地，本阶段仅透传字段）。
 */
export interface EngineColumnNode<RecordType = any> {
  /** 稳定 key（叶子列：antd column.key/dataIndex；分组列：由路径派生）。 */
  key: string
  /** 表头文本或节点（分组列的 group title）。 */
  title?: ReactNode
  /** 对齐方式（仅叶子列消费）。 */
  align?: Align
  /** 是否固定列（已归一化；M2 落地，本阶段仅透传）。 */
  fixed?: FixedSide
  /** 是否单行省略号（仅叶子列消费）。 */
  ellipsis?: boolean
  /**
   * 是否隐藏该列（M6，仅叶子节点消费；分组节点的 hidden 无意义——多级表头隐藏通过隐藏
   * 子叶子实现，父分组格随之收缩）。
   */
  hidden?: boolean
  /**
   * 子列。空数组或 undefined 表示叶子列。
   * 规约：有 children 一律视为分组列；dataIndex/render/width 仅取自无 children 的叶子节点。
   */
  children?: Array<EngineColumnNode<RecordType>>
  /** 叶子列属性（dataIndex/width/render；仅当本节点为叶子时使用）。 */
  dataIndex?: string | number | Array<string | number>
  width?: number | string
  render?: (text: any, record: RecordType, index: number) => ReactNode
  /**
   * 单元格合并入口（M3，仅叶子节点消费）。详见 EngineLeafColumn.onCell。
   */
  onCell?: (record: RecordType, index: number) => { colSpan?: number; rowSpan?: number } | undefined
  /**
   * 表头格横向跨列数（M3，仅叶子节点消费）。详见 EngineLeafColumn.colSpan。
   */
  colSpan?: number
  /** 行标题语义（M3，仅叶子节点消费）。详见 EngineLeafColumn.rowScope。 */
  rowScope?: 'row'
  /**
   * 排序器（S1，仅叶子节点消费）。详见 EngineLeafColumn.sorter。
   */
  sorter?: EngineColumnSorter<RecordType>
  /**
   * 当前排序方向（S1，仅叶子节点消费）。详见 EngineLeafColumn.sortOrder。
   */
  sortOrder?: EngineSortOrder
  /**
   * 多列排序优先级序号（S2，仅叶子节点消费）。详见 EngineLeafColumn.sortPriority。
   */
  sortPriority?: number
  /**
   * 点击表头切换排序的循环顺序（S1，仅叶子节点消费）。
   */
  sortDirections?: Array<'ascend' | 'descend'>
  /**
   * 是否显示排序提示 tooltip（S1，仅叶子节点消费）。
   */
  showSorterTooltip?: boolean | { target?: 'full-header' | 'sorter-icon' }
  /**
   * 筛选项列表（S3，仅叶子节点消费）。详见 EngineLeafColumn.filters。
   */
  filters?: Array<EngineFilterItem>
  /**
   * 筛选判定函数（S3，仅叶子节点消费）。详见 EngineLeafColumn.onFilter。
   */
  onFilter?: (value: string | number, record: RecordType) => boolean
  /**
   * 是否多选筛选（S3，仅叶子节点消费，默认 true）。
   */
  filterMultiple?: boolean
  /**
   * 当前激活筛选值（S3，仅叶子节点消费，由适配层 useFilter 解析后回填）。
   */
  filteredValue?: Array<string | number> | null
  /**
   * 关闭下拉即应用（S3，仅叶子节点消费，默认 true）。
   */
  filterOnClose?: boolean
  /** 原始 antd column（透传）。 */
  raw?: unknown
}

/**
 * 表头格布局描述（M1）。
 *
 * 引擎把列树展开为表头格平面表，每项对应 DOM 中一个 `<div role="columnheader">`：
 *   - `gridColumnStart/gridColumnEnd`：横跨的列范围（1-based，grid 索引）。
 *   - `gridRowStart/gridRowEnd`：纵跨的行范围（仅表头区，1-based）。
 *   - 叶子表头格：纵向占满到表头底部（与 antd 多级表头一致）。
 *   - 分组表头格：横跨其下所有叶子列。
 *
 * grid 放置采用显式 `grid-column` / `grid-row`（而非纯依赖 `grid-auto-flow:column`），
 * 避免多级表头下放置错乱。
 */
export interface EngineHeaderCell<RecordType = any> {
  /** 稳定 key（用作 React key）。 */
  key: string
  /** 表头文本或节点。 */
  title?: ReactNode
  /** 对齐方式（仅叶子表头格消费；分组格通常居中）。 */
  align?: Align
  /** 是否固定列（透传）。 */
  fixed?: FixedSide
  /** 1-based 起始列号（对应 grid-template-columns 的第 N 条 track）。 */
  gridColumnStart: number
  /** 1-based 结束列号（exclusive，即 gridColumnEnd = gridColumnStart + colSpan）。 */
  gridColumnEnd: number
  /** 1-based 起始表头行号（仅表头区，数据行不在此计数内）。 */
  gridRowStart: number
  /** 1-based 结束表头行号（exclusive）。 */
  gridRowEnd: number
  /** 是否叶子表头格（无 children）。 */
  isLeaf: boolean
  /** 对应的叶子列索引（仅叶子表头格有值，用于关联数据单元格的对齐/列宽）。 */
  leafIndex?: number
  /** 原始 antd column（透传，供后续 onHeaderCell 等使用）。 */
  raw?: unknown
  /** 关联的 EngineColumnNode（用于 render 等访问）。 */
  node?: EngineColumnNode<RecordType>
  /**
   * 表头格是否被覆盖（M3）。
   * `true`：该表头格被前面的 colSpan>1 表头覆盖，**不渲染 DOM**。
   * 默认 undefined/false。
   */
  covered?: boolean
  /**
   * 表头格横跨列数（M3，来自 column.colSpan）。
   * 仅当 `covered !== true` 时有意义；默认 1。
   */
  headerColSpan?: number
  /** 行标题语义（M3，仅 a11y/视觉，不影响布局）。 */
  rowScope?: 'row'
  /**
   * 该叶子表头格对应列是否隐藏（M6）。
   * - 仅叶子表头格（`isLeaf === true`）有值；分组表头格恒为 false（其 hidden 不由父节点控制，
   *   父分组格因某子叶子 track 为 0fr 而自动收缩，不需自身 hidden）。
   * - `true`：表头格加 `dg-cell-hidden` 类（内容 visibility:hidden + overflow:hidden）。
   *   track 仍占 0fr（列线号不变），配合 `.dg-grid` 的 grid-template-columns 过渡实现 0fr↔原宽动画。
   */
  hidden?: boolean
  /**
   * 该列是否可排序（S1，仅叶子表头格有值）。
   * `true`：表头格渲染排序图标（caret-up / caret-down 三态）+ 绑定点击排序。
   * 由 `column.sorter` 是否为 truthy 派生（true/函数/对象均为可排序）。
   */
  sortable?: boolean
  /**
   * 该列当前排序方向（S1，仅叶子表头格有值）。
   * 引擎据此渲染排序图标三态：'ascend' caret-up 高亮 / 'descend' caret-down 高亮 / null 两 caret 灰。
   */
  sortOrder?: EngineSortOrder
  /**
   * 多列排序优先级序号（S2，仅叶子表头格有值）。
   * 引擎据此在 caret 旁渲染优先级数字（1/2/3…）；undefined/0 不渲染。
   */
  sortPriority?: number
  /**
   * 是否显示排序提示 tooltip（S1，仅叶子表头格有值）。
   */
  showSorterTooltip?: boolean | { target?: 'full-header' | 'sorter-icon' }
  /**
   * 该列是否可筛选（S3，仅叶子表头格有值）。
   * `true`：表头格渲染筛选漏斗图标（FilterOutlined/FilterFilled）+ 绑定点击打开筛选下拉。
   * 由 `filters` 非空 + `onFilter` 存在派生。
   */
  filterable?: boolean
  /**
   * 该列筛选项列表（S3，仅叶子表头格有值）。供 FilterDropdown 渲染 Checkbox/Radio 项。
   */
  filters?: Array<EngineFilterItem>
  /**
   * 是否多选筛选（S3，仅叶子表头格有值，默认 true）。决定下拉用 Checkbox.Group 或 Radio.Group。
   */
  filterMultiple?: boolean
  /**
   * 当前激活筛选值（S3，仅叶子表头格有值）。决定漏斗激活态（Filled 高亮）+ 下拉默认勾选。
   * 空数组/null 均视为无激活（漏斗为 Outlined 灰态）。
   */
  filteredValue?: Array<string | number> | null
  /**
   * 关闭下拉即应用（S3，仅叶子表头格有值，默认 true）。
   */
  filterOnClose?: boolean
}

/**
 * 行高约定。
 * - number：所有行固定高度（px）。
 * - (record, index) => number | string：按行计算；返回数字按 px，字符串原样作为 grid track size。
 *
 * 不实现 measureRowRender / 动态测量（决策 1）。
 */
export type RowHeight<RecordType = any> =
  | number
  | ((record: RecordType, index: number) => number | string)

/** 引擎 props。 */
export interface EngineTableProps<RecordType = any> {
  /**
   * 叶子列（已扁平化，不含 children）。
   *
   * **M1 起两种取法之一**：
   *   - 单层表头（无 children）：直接传叶子列数组，引擎走 `grid-auto-flow:column` 快速路径。
   *   - 多级表头：优先传 `columnTree`，引擎从中推导出叶子列、表头格布局、表头行数；
   *     此时 `columns` 字段被忽略（由引擎从树中前序遍历得到叶子列）。
   */
  columns?: Array<EngineLeafColumn<RecordType>>
  /**
   * 列树（M1 多级表头）。任意深度；前序遍历即列顺序。
   * 当传入时优先于 `columns`。无 children 的节点等价于单层叶子列。
   */
  columnTree?: Array<EngineColumnNode<RecordType>>
  /** 数据源。 */
  dataSource: Array<RecordType>
  /** 行 key 取值函数或属性名。 */
  rowKey: string | ((record: RecordType) => string | number)
  /** 行高约定（默认 'auto'，即不强制）。 */
  rowHeight?: RowHeight<RecordType>
  /** 表头行高约定（默认 'auto'）。
   *  多级表头下，所有表头行统一使用此高度。 */
  headerHeight?: number | string
  /** 是否显示表头。 */
  showHeader?: boolean
  /**
   * 滚动配置。
   * - `x`：横向滚动（M2）。number → 内容最小宽度（px）；string → 原样作 min-width。
   *   不传时表格自适应容器宽度，无横向滚动（M0/M1 行为）。
   * - `y`：纵向可视高度。
   *     - 配合 `virtual=true`（M4）：开启纵向虚拟滚动（number→px 表体可视区高度）。
   *     - 不配合 `virtual`（M8）：表头纵向固定（表体容器 max-height=y 纵向滚动，表头 sticky top）。
   */
  scroll?: { x?: number | string; y?: number | string }
  /**
   * 虚拟滚动开关（M4）。`virtual=true` 且 `scroll.y` 为 number 时启用纵向虚拟滚动。
   * 详见对外 types.ts TableProps.virtual 注释。
   */
  virtual?: boolean
  /**
   * 单元格自定义渲染总入口（预留，供后续 components.body.cell 等使用）。
   * 本阶段未消费。
   */
  cell?: (
    column: EngineLeafColumn<RecordType>,
    record: RecordType,
    index: number,
  ) => ReactNode
  /**
   * 列宽拖拽调整开关（M7）。
   *
   * - `true`（或 undefined，由适配层默认值决定）：在**叶子表头格右侧**渲染 resizer 手柄，
   *   pointer 拖拽实时改列宽（写入引擎内部 `resizedWidths`，覆盖 column.width）。
   *   详见 `useColumnResize`。
   * - `false`：不渲染手柄，列宽完全由 column.width / max-content 决定（M0–M6 行为，零回归）。
   *
   * 组合：
   *   - M1 多级表头：只有叶子表头格有手柄；分组表头格无手柄。
   *   - M2 固定列：拖拽改宽后 useStickyColumns 的 ResizeObserver 自动重算 sticky 偏移。
   *   - M4 虚拟：拖拽不影响虚拟行渲染窗口（列/行 track 正交）。
   *   - M6 隐藏列：0fr track 的列不渲染手柄（隐藏列无可调宽度）。
   *
   * 默认值由适配层（Table.tsx）决定；引擎层 false 表示明确关闭。
   */
  resizable?: boolean
  /**
   * M7 列宽拖拽最小宽度（px）。number → 统一；函数 → 按 key 逐列。
   * 默认 30。仅在 `resizable` 生效时有意义。
   */
  resizableMinWidth?: number | ((key: string) => number)
  /**
   * M7 列宽拖拽最大宽度（px）。number → 统一；函数 → 按 key 逐列。
   * 默认 Infinity（不限制）。
   */
  resizableMaxWidth?: number | ((key: string) => number)
  /**
   * M9 行展开状态（由适配层 useRowExpand 派生，引擎只消费、不持有状态）。
   *
   * 引擎据此：
   *   1. 在 grid-template-rows 中为每个可展开数据行紧跟一条"展开内容 track"：
   *        展开时 `1fr`、收起时 `0fr`；`.dg-grid` 上 `transition: grid-template-rows 0.3s ease`
   *        实现 0fr↔1fr 平滑过渡（lun 思路）。
   *   2. 展开内容作为 grid item 渲染在该 track（grid-column: 1 / -1 跨整行），overflow:hidden+min-height:0。
   *   3. ★ 决策 2：虚拟模式下，虚拟窗口（useVirtualList）仍按收起态算；展开 track 不参与窗口大小。
   */
  expandState?: EngineExpandState
  /**
   * 排序点击回调（S1）。
   * 用户点击可排序叶子表头格（含排序图标区域）时触发。参数为该列的稳定 key（来自 columnTree，
   * 即 `column.key` / dataIndex / 匿名 col-N）。
   * 排序状态机（受控/非受控、sortDirections 循环、defaultSortOrder）由适配层 useSorter 维护；
   * 引擎只负责触发此回调，不持有排序状态。
   */
  onSorterClick?: (columnKey: string) => void
  /**
   * 筛选应用回调（S3）。
   * 用户在筛选下拉（FilterDropdown）应用筛选（关闭下拉/点确定）时触发。参数：
   *   - filterKey：该列的稳定筛选 key（与 column.key/dataIndex 一致；与 onSorterClick 同源）。
   *   - nextFilteredValue：新的筛选值数组（空数组表示清除该列筛选）。
   * 筛选状态机（受控/非受控、filteredValue、defaultFilteredValue）由适配层 useFilter 维护；
   * 引擎只负责触发此回调，不持有筛选状态。
   */
  onFilterApply?: (filterKey: string, nextFilteredValue: Array<string | number>) => void
}

/**
 * 引擎层展开状态（M9）。适配层 useRowExpand 派生后传入；引擎只读不写。
 */
export interface EngineExpandState {
  /** 是否启用展开（决定渲染展开列 / 展开内容 track）。 */
  expandEnabled: boolean
  /** 某 key 是否展开。 */
  isExpanded: (key: React.Key) => boolean
  /** 所有可展开 key 集合（用于判定某行是否需要展开 track）。 */
  expandableKeySet: Set<React.Key>
  /** 展开内容渲染器（来自 expandable.expandedRowRender）。 */
  expandedRowRender: (record: any, index: number, expanded: boolean) => ReactNode
  /**
   * 切换某行展开态（点击展开图标触发）。引擎在展开列单元格点击时调用。
   * 参数：(key, record)。返回的新展开 keys 由适配层 state 管理。
   */
  toggleExpand: (key: React.Key, record: any) => void
  /** 某 key 是否在 expandableKeySet 中（引擎为性能直接传函数）。 */
  isExpandable: (key: React.Key) => boolean
  /** 是否渲染展开图标列（expandable.showExpandColumn !== false 时为 true）。 */
  showExpandColumn: boolean
  /**
   * 自定义展开图标渲染器（来自 expandable.expandIcon）。
   * 当前由适配层（Table.tsx buildExpandColumnNode）在展开列 render 中消费；引擎透传不直接使用。
   * 保留在引擎类型中便于未来引擎直渲染展开列时复用。未提供时用默认 ExpandIcon 组件。
   * 参数对齐 antd ExpandIcon props：{ expanded, onExpand(record,e), record }。
   */
  expandIcon?: (props: {
    expanded: boolean
    onExpand: (record: any, e: import('react').MouseEvent) => void
    record: any
  }) => ReactNode
}
