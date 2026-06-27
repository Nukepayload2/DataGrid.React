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
  /**
   * ★ 接口全兼容（决策 3 第二步，对齐 antd `column.className`）。该列单元格额外 className
   * （透传到数据单元格 + 表头格）。详见对外 types.ts ColumnType.className。
   */
  className?: string
  /**
   * ★ 接口全兼容（决策 3 第二步，对齐 antd `column.style`）。该列单元格额外 inline style。
   * 详见对外 types.ts ColumnType.style。
   */
  style?: import('react').CSSProperties
  /**
   * 是否单行省略号（S20 + S21）。由适配层 normalize：外部 `boolean | {showTitle}` 统一解析为
   * `boolean`（控制是否加 `dg-cell-ellipsis` CSS 类）；`showTitle` 单独透传（见下）。
   */
  ellipsis?: boolean
  /**
   * 是否显示默认 native title（S21，对齐 antd `ellipsis.showTitle`）。
   * 由适配层 normalize 自 `{ showTitle: false }` 解析：`undefined`/`true` → 显示默认 title；
   * `false` → cell-inner **不加** native title（让 render 内 antd Tooltip 接管 hover）。
   * 仅 `ellipsis: true` 列消费（非 ellipsis 列无 title，本字段无意义）。
   */
  showTitle?: boolean
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
   * 单元格事件 + 合并入口（M3 + S15）。
   * 返回 { colSpan?, rowSpan?, ...任意字段 }；含 colSpan/rowSpan=0 表示该格被覆盖（不渲染）。
   * 返回值的**其余字段**（除 colSpan/rowSpan）由渲染层透传给 components.body.cell（S15）。
   * 详见对外 types.ts ColumnType.onCell 注释。
   *
   * 引擎消费：cellMerge 只读 colSpan/rowSpan（M3）；GridTable 渲染单元格时若提供了
   * components.body.cell，会调用 onCell 取完整返回值透传给 cell 组件。
   */
  onCell?: (record: RecordType, index: number) => Record<string, any> | undefined
  /**
   * ★ 接口全兼容（决策 3 第二步，对齐 antd `column.onHeaderCell`）。表头格 props 注入。
   * flat 路径（ColumnCells）用 leafColumn 消费本字段；multi 路径由 EngineColumnNode.onHeaderCell
   * 经 flattenHeaderCells 透传到 EngineHeaderCell.onHeaderCell。详见 EngineColumnNode.onHeaderCell。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onHeaderCell?: (
    column: any,
    index: number,
  ) => import('react').HTMLAttributes<HTMLElement> | undefined
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
  /**
   * 自定义筛选下拉面板（S5，透传对外 `column.filterDropdown`）。
   * 引擎渲染层（FilterDropdown）据此切换：有 filterDropdown → 渲染自定义面板（注入 antd 兼容 props）；
   * 无 → 渲染内置 Checkbox/Radio 面板。函数签名见对外 types.ts `FilterDropdownProps`。
   */
  filterDropdown?:
    | React.ReactNode
    | ((props: import('../types').FilterDropdownProps) => React.ReactNode)
  /**
   * 自定义漏斗图标（S5，透传对外 `column.filterIcon`）。
   * 函数 `(filtered: boolean) => ReactNode`；或直接 ReactNode。缺省用自绘 FilterOutlined/Filled。
   */
  filterIcon?:
    | React.ReactNode
    | ((filtered: boolean) => React.ReactNode)
  /**
   * 透传给筛选下拉 antd Dropdown 的 props（S5，透传对外 `column.filterDropdownProps`）。
   * 含 open（受控）/onOpenChange/triggerClassName/overlayClassName 等。
   */
  filterDropdownProps?: import('../types').ColumnFilterDropdownProps
  /**
   * 筛选项搜索（S6，透传对外 `column.filterSearch`；仅叶子列消费）。
   * true → 默认 contains 匹配；函数 → 自定义；undefined/false → 不渲染搜索框。
   * 仅 menu 模式内置面板生效；自定义面板（filterDropdown）不消费。详见对外 types.ts。
   */
  filterSearch?:
    | true
    | ((input: string, record: import('./types').EngineFilterItem) => boolean)
  /**
   * 筛选下拉展示模式（S7，透传对外 `column.filterMode`，默认 'menu'）。
   * 'tree' → 内置下拉用 antd `<Tree checkable>` 渲染树形结构（filters.children）；'menu' → Checkbox/Radio。
   * 自定义面板（filterDropdown）存在时 filterMode 无效（被取代）。详见对外 types.ts。
   */
  filterMode?: 'menu' | 'tree'
  /** 原始 antd column，按需透传（后续任务 colSpan/rowSpan/onCell 等使用）。 */
  raw?: unknown
  /**
   * 单元格重渲染优化（S15，对齐 antd `column.shouldCellUpdate`）。
   * 返回 false 时该单元格（components.body.cell）在 record 变化时不重渲染。
   * 仅当 components.body.cell 提供时消费。详见对外 types.ts ColumnType.shouldCellUpdate。
   */
  shouldCellUpdate?: (prevRecord: RecordType, nextRecord: RecordType) => boolean
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
  /**
   * ★ 接口全兼容（决策 3 第二步，对齐 antd `column.className`）。该列单元格/表头格额外 className。
   * 详见 EngineLeafColumn.className / 对外 types.ts ColumnType.className。
   */
  className?: string
  /**
   * ★ 接口全兼容（决策 3 第二步，对齐 antd `column.style`）。该列单元格/表头格额外 inline style。
   * 详见 EngineLeafColumn.style / 对外 types.ts ColumnType.style。
   */
  style?: import('react').CSSProperties
  /** 是否单行省略号（仅叶子列消费，已 normalize 为 boolean）。详见 EngineLeafColumn.ellipsis。 */
  ellipsis?: boolean
  /**
   * 是否显示默认 native title（S21，仅叶子列消费，已 normalize）。详见 EngineLeafColumn.showTitle。
   */
  showTitle?: boolean
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
   * 单元格事件 + 合并入口（M3 + S15，仅叶子节点消费）。详见 EngineLeafColumn.onCell。
   */
  onCell?: (record: RecordType, index: number) => Record<string, any> | undefined
  /**
   * ★ 接口全兼容（决策 3 第二步，对齐 antd `column.onHeaderCell`）。表头格 props 注入
   * （仅叶子节点消费；分组表头格无 onHeaderCell）。签名 `(column, index) => HTMLAttributes`，
   * 返回值整体合并到表头格 div 的 props（className/style/onClick/...）。
   * 详见对外 types.ts ColumnType.onHeaderCell。
   *
   * ★ column 参数用 `any`（对齐 antd `GetComponentProps` 的 data 参数风格）——适配层传入强类型
   *   `(column: ColumnType, index) => ...` 可赋值给本字段（参数逆变 any 兼容）。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onHeaderCell?: (
    column: any,
    index: number,
  ) => import('react').HTMLAttributes<HTMLElement> | undefined
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
  /**
   * 自定义筛选下拉面板（S5，仅叶子节点消费，透传 `column.filterDropdown`）。
   * 详见 EngineLeafColumn.filterDropdown。
   */
  filterDropdown?:
    | React.ReactNode
    | ((props: import('../types').FilterDropdownProps) => React.ReactNode)
  /**
   * 自定义漏斗图标（S5，仅叶子节点消费，透传 `column.filterIcon`）。
   */
  filterIcon?:
    | React.ReactNode
    | ((filtered: boolean) => React.ReactNode)
  /**
   * 透传给筛选下拉 antd Dropdown 的 props（S5，仅叶子节点消费，透传 `column.filterDropdownProps`）。
   */
  filterDropdownProps?: import('../types').ColumnFilterDropdownProps
  /**
   * 筛选项搜索（S6，仅叶子节点消费，透传 `column.filterSearch`）。
   * 详见 EngineLeafColumn.filterSearch。
   */
  filterSearch?:
    | true
    | ((input: string, record: import('./types').EngineFilterItem) => boolean)
  /**
   * 筛选下拉展示模式（S7，仅叶子节点消费，透传 `column.filterMode`，默认 'menu'）。
   * 详见 EngineLeafColumn.filterMode。
   */
  filterMode?: 'menu' | 'tree'
  /** 原始 antd column（透传）。 */
  raw?: unknown
  /**
   * 单元格重渲染优化（S15，仅叶子节点消费）。详见 EngineLeafColumn.shouldCellUpdate。
   */
  shouldCellUpdate?: (prevRecord: RecordType, nextRecord: RecordType) => boolean
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
  /**
   * ★ 接口全兼容（决策 3 第二步，对齐 antd `column.className`）。该列表头格额外 className
   * （来自 column.className，仅叶子表头格消费；分组表头格恒 undefined）。合并到表头格 div 的
   * className 列表。详见对外 types.ts ColumnType.className。
   */
  className?: string
  /**
   * ★ 接口全兼容（决策 3 第二步，对齐 antd `column.style`）。该列表头格额外 inline style
   * （来自 column.style，仅叶子表头格消费）。合并到表头格 div 的 inline style。详见对外
   * types.ts ColumnType.style。
   */
  style?: import('react').CSSProperties
  /**
   * ★ 接口全兼容（决策 3 第二步，对齐 antd `column.onHeaderCell`）。表头格 props 注入
   * （仅叶子表头格消费；分组表头格恒 undefined）。详见 EngineColumnNode.onHeaderCell /
   * 对外 types.ts ColumnType.onHeaderCell。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onHeaderCell?: (
    column: any,
    index: number,
  ) => import('react').HTMLAttributes<HTMLElement> | undefined
  /**
   * 是否单行省略号（S20 + S21，仅叶子表头格有值；已 normalize 为 boolean）。
   * `true`：表头格加 `dg-cell-ellipsis` 类（`.dg-cell-inner` 应用 overflow:hidden +
   * white-space:nowrap + text-overflow:ellipsis）；title 为 string 时额外设 native title
   * 悬浮提示（对齐 antd：长 title 省略 + hover 显示完整标题）——是否加 title 受 `showTitle` 门控。
   */
  ellipsis?: boolean
  /**
   * 是否显示默认 native title（S21，仅叶子表头格有值，已 normalize）。
   * `showTitle: false` → 表头格不加 native title（让 render/外部 Tooltip 接管）。
   * 详见 EngineLeafColumn.showTitle。
   */
  showTitle?: boolean
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
  /**
   * 该叶子表头格是否为**全局末列**（所有叶子中 leafIndex 最大者）。
   * 仅叶子表头格有值。用于 CSS ::before 表头分隔线排除——对齐 antd
   * `thead th:not(:last-child)::before`（antd 末列不画右侧分隔线）。
   * data-grid 因 grid 容器扁平（表头/表体格同为 `.dg-grid` 子节点），
   * `:last-child` 恒指表体格，无法用 CSS 排除末列表头格，故由引擎打标记
   * `data-leaf-last`，CSS 用 `:not([data-leaf-last])` 排除。详见 table.css 注释。
   */
  isLastLeaf?: boolean
  /**
   * 该叶子表头格是否为**其所属分组（含 >=2 叶子的祖先分组）的最右叶子**。
   * 仅叶子表头格有值。用于 CSS ::before 表头分隔线排除——多级表头下分组右边界
   * （即分组最右叶子的右缘）不画分隔线，对齐 antd 视觉（jsx demo：Name 分组下
   * Last Name 不画；单层表头无分组则全部 false）。由 `gridColumnEnd` 命中某分组
   * 表头格的 `gridColumnEnd`（且该分组跨越 >=2 叶子）判定。详见 table.css 注释。
   */
  isGroupLastLeaf?: boolean
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
   * 该列的**排序标识**（仅叶子表头格有值，由 flattenHeaderCells 从 node.raw 经
   * `resolveColumnSortKey` 解析填入）。
   *
   * 与 `key`（= 完整路径，如嵌套叶子 `Other.Age`）区分：`key` 用作 React key / CSS track 关联，
   * 内部唯一即可；`sortKey` 是**对外排序语义标识**（column.key ?? dataIndex，如 `'age'`），
   * 与 useSorter.onSorterClick 的入参契约一致。表头格点击排序时传 `sortKey` 而非 `key`——
   * 否则多级表头下嵌套叶子（key=`Other.Age`）的 sortKey（`'age'`）不匹配，点击无响应
   * （useSorter 按 `resolveColumnSortKey(c) === columnKey` 查找列）。
   */
  sortKey?: string | number
  /**
   * 该列的**筛选标识**（仅叶子表头格有值，由 flattenHeaderCells 从 node.raw 经
   * `resolveFilterKey` 解析填入）。与 sortKey 同算法（column.key ?? dataIndex），
   * 与 useFilter.onFilterApply 的入参契约一致。筛选应用时传 `filterKey` 而非 `key`，
   * 避免嵌套叶子列的筛选失效（与 sortKey 同款根因）。
   */
  filterKey?: string
  /**
   * 该列是否可筛选（S3，仅叶子表头格有值）。
   * `true`：表头格渲染筛选漏斗图标（FilterFilled）+ 绑定点击打开筛选下拉。
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
  /**
   * 自定义筛选下拉面板（S5，仅叶子表头格有值，透传 `column.filterDropdown`）。
   * 有值时引擎渲染层（FilterDropdown）渲染自定义面板（注入 antd 兼容 props），
   * 否则渲染内置 Checkbox/Radio 面板。
   */
  filterDropdown?:
    | React.ReactNode
    | ((props: import('../types').FilterDropdownProps) => React.ReactNode)
  /**
   * 自定义漏斗图标（S5，仅叶子表头格有值，透传 `column.filterIcon`）。
   */
  filterIcon?:
    | React.ReactNode
    | ((filtered: boolean) => React.ReactNode)
  /**
   * 透传给筛选下拉 antd Dropdown 的 props（S5，仅叶子表头格有值，透传 `column.filterDropdownProps`）。
   */
  filterDropdownProps?: import('../types').ColumnFilterDropdownProps
  /**
   * 筛选项搜索（S6，仅叶子表头格有值，透传 `column.filterSearch`）。
   * 引擎渲染层（FilterDropdown）据此在内置 menu 面板顶部渲染 antd Input 搜索框 + 过滤 flatItems。
   * true → 默认 contains；函数 → 自定义；undefined/false → 不渲染搜索框。详见对外 types.ts。
   */
  filterSearch?:
    | true
    | ((input: string, record: import('./types').EngineFilterItem) => boolean)
  /**
   * 筛选下拉展示模式（S7，仅叶子表头格有值，透传 `column.filterMode`，默认 'menu'）。
   * 引擎渲染层（FilterDropdown）据此切换内置面板：'tree' → antd `<Tree checkable>` 树形；
   * 'menu'/undefined → Checkbox.Group/Radio.Group。详见对外 types.ts。
   */
  filterMode?: 'menu' | 'tree'
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
  /**
   * data-grid 专属 grid 布局选项（Phase 4 有界行高模型 + M7 列宽拖拽 + 表头行高）。
   *
   * **T8 硬迁移**：原顶层 `rowHeight`/`headerHeight`/`resizable`/`resizableMinWidth`/
   * `resizableMaxWidth` 全部迁入 `gridOptions`（删顶层、无 alias）。引擎从此命名空间读取。
   * 详见对外 types.ts `TableProps.gridOptions` 注释（data-grid 专属，与 antd 不兼容）。
   */
  gridOptions?: {
    /** 行高约定（数字 px 或函数；默认 'auto'，虚拟下默认 56）。 */
    rowHeight?: RowHeight<RecordType>
    minRowHeight?: number
    maxRowHeight?: number
    /** 表头行高约定（默认 'auto'）。多级表头下所有表头行统一使用此高度。 */
    headerHeight?: number | string
    /** 列宽拖拽开关（M7）；引擎层 undefined/false 不启用。 */
    resizable?: boolean
    /** M7 列宽拖拽最小宽度（px）。默认 30。 */
    resizableMinWidth?: number | ((key: string) => number)
    /** M7 列宽拖拽最大宽度（px）。默认 Infinity。 */
    resizableMaxWidth?: number | ((key: string) => number)
  }
  /** 是否显示表头。 */
  showHeader?: boolean
  /**
   * 滚动配置（决策 7 + 决策 8 改造）。
   * - `x`：横向滚动（M2）。number → 内容最小宽度（px）；string → 原样作 min-width。
   *   不传时表格自适应容器宽度，无横向滚动（M0/M1 行为）。
   *   启用时额外渲染横向悬浮滚动条（决策 8，定位数据区域底部）。
   * - `y`：纵向滚动（**决策 7，仅 `true`**）。
   *     - `true`：数据区域模式——表头固定 + 表体滚动 + #35 纵向悬浮滚动条，
   *       **CSS 自动适应高度**（flex 1fr 表体填满 `.dg-wrapper` 可用高度，不用 JS 算数字）。
   *     - 配合 `virtual=true`（M4）：开启纵向虚拟滚动（虚拟窗口高度=CSS 自适应可视高）。
   *     - `undefined`：无表体滚动区（零回归）。
   */
  scroll?: { x?: number | string; y?: true }
  /**
   * 虚拟滚动开关（M4）。`virtual=true` 且 `scroll.y === true` 时启用纵向虚拟滚动（决策 7）。
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
   * 自定义组件（S15，对齐 antd v6 `TableComponents` 子集；data-grid div 渲染适配）。
   * - `body.cell`：提供时替换 dg-cell div **内部内容**渲染（返回 ReactNode）；props 含
   *   `{ children, record, index, dataIndex, ...onCell返回值 }`。
   * - `body.row`：提供时每行渲染一个包裹层组件（用于 Form/Context 等）。
   * - `header.cell`：表头格（S19 用，本任务占位不消费）。
   * 详见对外 types.ts TableComponents 注释。
   */
  components?: {
    header?: { cell?: React.ComponentType<any> }
    body?: { row?: React.ComponentType<any>; cell?: React.ComponentType<any> }
  }
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
   * S13 树形数据状态（由适配层 useTreeData 派生，引擎只消费、不持有状态）。
   *
   * 引擎据此在**第一列数据列**单元格内按 `level × indentSize` 左缩进 + `hasChildren` 行渲染展开/收起图标。
   * 数据源已由适配层扁平化（按展开状态过滤未展开父行的子孙行），引擎按普通扁平表格渲染。
   *
   * 与 M9 expandState（expandedRowRender 自定义展开内容）互斥：树形模式下不启用 expandState
   * （antd 行为：tree-data 优先于 expandedRowRender）。
   */
  treeState?: EngineTreeState
  /**
   * ★ §9 / C1 列宽策略 tableLayout（对齐 antd `TableProps.tableLayout` + rc-table mergedTableLayout）。
   *
   * **语义**：
   *   - `'auto'`：grid 列 track 走 `max-content`（无 width 列）/ `minmax(width, max-content)`（绝对 width 列）；
   *     `.dg-grid` 加 `width:100%`（对齐 antd `<table>` CSS）+ `.dg-wrapper{overflow-x:auto}`：
   *     内容>容器时 grid 撑宽 → `.dg-wrapper` 出横向滚动条（修 basic Action 截断）；内容<容器时撑满不留白。
   *   - `'fixed'`：约束模式——
   *       * `.dg-grid` 加 `width:100%`（约束=容器宽）；
   *       * 无 width 列 track 改为 `minmax(0, 1fr)`（均分剩余，`min:0` 允许收缩 < content → ellipsis 视觉生效）；
   *       * 绝对 width 列 track 改为 `minmax(width, 1fr)`（min=width 保底 + 1fr 比例分剩余，§11「最小绝对+比例」语义）。
   *       * hidden 列仍 `0fr`（M6 不变）；resized 列仍 px（M7 不变，不参与 1fr）。
   *
   * **派生位置**：由适配层 Table.tsx 派生（对齐 antd mergedTableLayout：显式 tableLayout >
   *   fixColumn ? (scroll.x==='max-content' ? 'auto' : 'fixed') > (fixHeader||sticky||ellipsis ? 'fixed' : 'auto')）
   *   后传入。引擎层只消费、不派生（保持单一真理源）。
   *
   * **与 scroll.x/M2 固定列/M4 虚拟/S34 sticky 的关系**：
   *   - C1 完整版派生**包含 fixColumn/fixHeader/sticky 触发 fixed**（对齐 antd，修 §9 task#38 virtual-list
   *     fixed-end 脱离：fixed 模式下无 width 列 minmax(0,1fr) 填满 scrollX，fixed-end 始终贴右）；
   *     max-content scroll.x 下 fixColumn 保持 auto（让内容自然撑宽）。
   *   - M2 固定列偏移不受影响（useStickyColumns 用 ResizeObserver 实测 DOM 宽度，不依赖 col.width 数值）。
   *   - S34 sticky 模式：`.dg-grid` 不加 width:100%（保留 width:auto，让 min-width:scrollX 撑宽页面），
   *     1fr track 在 auto-sized grid 中退化为 max-content（视觉等价原 auto 行为）。
   *   - 若用户显式传 `tableLayout:'fixed'`，则覆盖派生（用户自负）。
   */
  tableLayout?: 'auto' | 'fixed'
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
  /**
   * 汇总栏 summary（S22，透传对外 `TableProps.summary` 解析后的 ReactNode）。
   *
   * 适配层在 Table.tsx 解析 `summary` prop：
   *   - 函数 → 用 pagedDataSource 调用得到 ReactNode。
   *   - ReactNode → 原样。
   * 解析后的 ReactNode 传给引擎；引擎渲染到 grid 末尾的 summary 区。
   *
   * 引擎渲染：遍历 ReactNode（应为 `Table.Summary` 容器内含 `Table.Summary.Row` 列表），
   * 给每个 Row cloneElement 注入 `__rowLine`（grid-row 线号）+ `__fixed`（sticky bottom 标志），
   * Row 再通过 Context 把 rowLine/fixed 传给 Cell，Cell 据此设 grid-row + sticky bottom。
   *
   * 未提供（undefined）时不渲染 summary 区（零回归）。
   */
  summary?: ReactNode
  /**
   * 空状态占位内容（S23）。
   *
   * 适配层（Table.tsx）解析 emptyText 来源优先级（严格对齐 antd `InternalTable.tsx:706-718`）：
   *   1. `TableProps.locale.emptyText`（Table 级，最高优先级）。
   *   2. `ConfigProvider.renderEmpty('Table')`（全局表体空状态）。
   *   3. 默认 antd `<Empty>`。
   * 解析后的 ReactNode 传给引擎；引擎仅在 pagedDataSource 为空时渲染一个跨所有列的 empty 区
   * （`grid-column: 1 / -1`，居中）。非空时不渲染（零回归）。
   *
   * 表体 empty 不区分"空数据 vs 筛选无结果"（对齐 antd InternalTable.tsx:714-717）——两种场景
   * 共用同一 emptyText（已由适配层按上述优先级解析为单一 'Table' 语义）。
   * 注：antd 的 `'Table.filter'` 是 filter 下拉内 filters 空时的占位（FilterDropdown 消费），
   * 与表体 empty 无关。
   */
  emptyText?: ReactNode
  /**
   * S34 页面级粘性表头配置（由适配层解析后传入；引擎据此切到"页面级 sticky"渲染路径）。
   *
   * **语义（区别 M8 容器内固定）**：表头相对**页面 viewport** 固定（`position: sticky;
   * top: offsetHeader`），而非相对表格滚动容器（M8）。详见对外 `StickyConfig` 注释。
   *
   * 引擎消费：
   *   - `offsetHeader`：表头 grid item 的 sticky top 值（页面纵向滚动时表头钉在视口顶部该偏移处）。
   *   - `offsetScroll`：底部 StickyScrollBar 的 sticky bottom 值。
   *   - `getContainer`：StickyScrollBar 同步监听的滚动容器（默认 window）。
   *
   * **引擎行为切换**：sticky 启用时，`.dg-grid` 外**不包** overflow 容器（避免拦截 sticky 上下文），
   * grid 直接渲染 + `min-width: scrollX` 撑宽；表头 grid item 加 `position: sticky; top: offsetHeader`；
   * grid 之后渲染一个 `StickyScrollBar`（`position: sticky; bottom: offsetScroll`）同步页面横向滚动。
   *
   * 未提供（undefined）时不启用（所有现有渲染路径不变，零回归）。
   */
  sticky?: {
    offsetHeader?: number
    offsetScroll?: number
    getContainer?: () => HTMLElement | Window | undefined
  }
  /**
   * S29 语义化 classNames/styles（已由适配层解析为对象——classNames/styles 可能是对象或函数，
   * 适配层在 Table.tsx 内求值后传给引擎一个**确定的语义化部位 class/style 对象**）。
   *
   * 引擎消费的部位：
   *   - `section`：grid 外的包装容器（`.dg-section`）class/style。
   *   - `content`：grid 根容器（`.dg-content`/`.dg-grid`）class/style——与 `.dg-grid` 合并。
   *   - `header.{wrapper,row,cell}`：表头容器/表头行/表头格 class/style。
   *   - `body.{wrapper,row,cell}`：表体容器/表体行/表体格 class/style。
   *
   * 引擎只消费 grid 内部位（section / content / header.{wrapper,row,cell} / body.{wrapper,row,cell}）；
   * root/title/footer/pagination.*
   * 由适配层在 Table.tsx 直接消费（不传引擎）。
   *
   * 注入策略：class 与现有 dg-* 类合并（`[existing, semantic].filter(Boolean).join(' ')`）；
   * style 与现有 style 浅合并（semantic 覆盖同名字段）。
   *
   * 未提供（undefined）时不注入任何额外 class/style，零回归。
   */
  semantic?: EngineSemantic
  /**
   * ★ 接口全兼容（决策 3 第二步，对齐 antd v6 `TableProps.onHeaderRow`）。表头行 props 注入。
   * grid 渲染下表头无独立 `<tr>`，引擎把返回值透传到该表头行**所有表头格**（事件 + class + style）。
   * 详见对外 types.ts TableProps.onHeaderCell。未提供（undefined）时不注入（零回归）。
   *
   * ★ columns 参数用 `any[]`（对齐 antd `GetComponentProps` 风格）——适配层传入强类型
   *   `(columns: ColumnType[], index) => ...` 可赋值给本字段。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onHeaderRow?: (
    columns: Array<any>,
    index: number,
  ) => import('react').HTMLAttributes<HTMLElement> | undefined
  /**
   * ★ 接口全兼容（决策 3 第二步，对齐 antd v6 `TableProps.onRow`）。表体行 props 注入。
   * grid 渲染下表体无独立 `<tr>`，引擎把返回值透传到该行**所有数据单元格**（事件 + class + style）。
   * 详见对外 types.ts TableProps.onRow。未提供（undefined）时不注入（零回归）。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRow?: (
    record: any,
    index: number,
  ) => import('react').HTMLAttributes<HTMLElement> | undefined
  /**
   * ★ 接口全兼容（决策 3 第二步，对齐 antd v6 `TableProps.rowClassName`）。表体行 className。
   * grid 渲染下表体无独立 `<tr>`，引擎把 class 透传到该行**所有数据单元格**（行级 class 标记）。
   * 详见对外 types.ts TableProps.rowClassName。未提供（undefined）时不注入（零回归）。
   */
  rowClassName?: string | ((record: any, index: number) => string)
  /**
   * ★ 接口全兼容（决策 3 第二步，对齐 antd v6 `TableProps.getPopupContainer`）。筛选下拉等
   * dropdown 的挂载容器。引擎把它作为 FilterDropdown 内 antd Dropdown 的默认 getPopupContainer
   * （列级 filterDropdownProps.getPopupContainer 优先）。未提供（undefined）时 antd Dropdown 走
   * 默认（document.body），零回归。
   */
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement
  /**
   * ★ T6 i18n：Table 级 `locale`（来自 TableProps.locale）。引擎透传给 FilterDropdown，
   * 消费 filterConfirm/filterReset/filterEmptyText/filterSearchPlaceholder/filterCheckAll
   * （+ @deprecated filterCheckall）。未提供（undefined）时 FilterDropdown 回退到内置默认值
   * （antd en_US 同款英文），零回归。
   */
  filterLocale?: {
    filterConfirm?: ReactNode
    filterReset?: ReactNode
    filterEmptyText?: ReactNode
    filterSearchPlaceholder?: string
    filterCheckall?: ReactNode
    filterCheckAll?: ReactNode
  }
   * ★ 接口全兼容（决策 3 第二步，对齐 antd v6 `TableProps.rowHoverable`）。行是否可 hover 高亮，
   * 默认 true。false 时单元格不加 dg-row-hover（关闭内置 hover 视觉）。详见对外 types.ts
   * TableProps.rowHoverable。未提供（undefined）时默认 true（保持现有 hover 行为不变，零回归）。
   */
  rowHoverable?: boolean
  /**
   * ★ §11 C2 tree-data 种子 #3（共享改动）：行选中态判定回调。
   *
   * 适配层（Table.tsx）传 `selection.isSelected`（M5 useRowSelection）→ 引擎在命中选中行的
   * **所有 body cell** 上加 `dg-row-selected` 类，CSS 消费 `--ant-table-row-selected-bg`
   * （normal）+ `--ant-table-row-selected-hover-bg`（hover），对齐 antd `.ant-table-row-selected`。
   *
   * 对齐 antd `components/table/style/selection.ts:97-108`：
   *   `.ant-table-row-selected > .ant-table-cell { background: tableSelectedRowBg }`
   *   `.ant-table-row-selected > .ant-table-cell-row-hover { background: tableSelectedRowHoverBg }`
   *
   * 未提供（undefined）时不加 dg-row-selected 类（无 rowSelection 的 demo 零回归）。
   */
  isRowSelected?: (record: RecordType) => boolean
}

/**
 * 引擎层树形数据状态（S13）。适配层 useTreeData 派生后传入；引擎只读不写。
 *
 * 适配层在树形模式下（dataSource record 含 `childrenColumnName` 子字段）调用 useTreeData：
 *   1. 把嵌套 children 扁平化（DFS）成普通 record 数组（按展开状态过滤未展开父行的子孙行），
 *      **替换原 dataSource 传给引擎**——引擎按普通扁平表格渲染。
 *   2. 同时构建 `rowInfoMap`（key → {level, parentKey, hasChildren}），引擎据此在**第一列数据列**
 *      单元格内按 `level × indentSize` 左缩进 + `hasChildren` 行渲染展开/收起图标。
 *
 * 引擎据此在渲染数据单元格时（仅 treeState 启用且该列为"首数据列"）插入缩进 + 展开图标。
 */
export interface EngineTreeState {
  /** 是否启用树形模式（treeState 启用）。 */
  treeEnabled: boolean
  /** 每层缩进宽度（px）。默认 15（对齐 antd 6.4.4 实测）。 */
  indentSize: number
  /**
   * key → 树形行信息。
   * 包含扁平化后**所有可见行**（已按展开状态过滤）的 level/parentKey/hasChildren。
   * 引擎在渲染某行数据格时按该行 key 查此 Map。
   */
  rowInfoMap: Map<React.Key, { level: number; parentKey: React.Key | null; hasChildren: boolean }>
  /** 某 key 是否展开。 */
  isExpanded: (key: React.Key) => boolean
  /** 切换某行展开态（点击展开图标触发）。参数：(key)。 */
  toggleExpand: (key: React.Key) => void
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

/**
 * S29 引擎层语义化样式（已求值的对象，由适配层 Table.tsx 传入）。
 *
 * 引擎只消费**grid 内**部位（root/title/footer/pagination.* 由适配层直接消费）：
 *   - `section`：grid 外的包装容器（`.dg-section`，含滚动容器）。
 *   - `content`：grid 根容器（`.dg-content`/`.dg-grid`）。
 *   - `header.{wrapper,row,cell}`：表头容器/表头行/表头格。
 *   - `body.{wrapper,row,cell}`：表体容器/表体行/表体格。
 *
 * 与对外 `TableSemanticClassNames/Styles`（types.ts）字段一一对应，仅取引擎消费的子集。
 */
export interface EngineSemanticSection {
  wrapper?: string
  cell?: string
  row?: string
}
export interface EngineSemanticSectionStyles {
  wrapper?: import('react').CSSProperties
  cell?: import('react').CSSProperties
  row?: import('react').CSSProperties
}
export interface EngineSemantic {
  section?: { className?: string; style?: import('react').CSSProperties }
  content?: { className?: string; style?: import('react').CSSProperties }
  header?: {
    className?: EngineSemanticSection
    style?: EngineSemanticSectionStyles
  }
  body?: {
    className?: EngineSemanticSection
    style?: EngineSemanticSectionStyles
  }
}
