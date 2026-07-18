/**
 * data-grid 内部渲染引擎类型定义（部分拆分后的主文件）。
 *
 * 这是 CSS Grid 渲染层的内部约定，**不**对外暴露。
 * 对外 antd 兼容接口见 `src/table/Table.tsx`（适配层）。
 *
 * 设计目标：
 * - 不使用 `<table>` 元素，纯 div + CSS Grid。
 * - 行高两条路径：非虚拟走约定 `rowHeight`（数字/函数）→ CSS grid track，不测量（缺省 `'auto'`）；
 *   虚拟路径采用 virtuoso 式 ResizeObserver 动态测量（measured-first + 约定兜底）。
 *   不实现 antd `measureRowRender` 兼容 API（隐藏测量行重渲染），与 RO 测量是两回事
 *   （详见 docs/design-notes/virtualization.md）。
 * - 预留 fixed / virtual / children(多级表头) / colSpan / rowSpan / rowExpand 钩子。
 *
 * === 拆分说明（档二·纯类型） ===
 *
 * 低耦合部分已拆到 `./engineTypes/` 子目录：
 *   - atomic.ts：Align / FixedSide。
 *   - filter.ts：EngineFilterItem。
 *   - sort.ts：EngineSortOrder / EngineCompareFn / EngineColumnSorter。
 *   - state.ts：EngineTreeState / EngineExpandState。
 *   - semantic.ts：EngineSemanticSection / EngineSemanticSectionStyles / EngineSemantic。
 *
 * 本文件保留**强耦合主体**（字段镜像密集，不宜拆分）：
 *   - 列三接口 EngineLeafColumn / EngineColumnNode / EngineHeaderCell。
 *   - 聚合枢纽 EngineTableProps。
 *   - RowHeight 约定。
 *
 * 本文件 barrel re-export 拆出的子文件类型，保证 `from './engineTypes'` 路径不变；
 * `engine/types.ts` 的 barrel 也透明转发。子文件之间用相对 import；
 * 引擎层自引用 `import('./types').XXX` 仍解析到 `engine/types.ts` barrel（不变）。
 */

import type { ReactNode } from 'react'
import type { ScrollBarFoldMode } from '../types'
import type {
  GridColumnOptions,
  VirtualizationMode,
} from './recyclingCellTypes'
// 拆出的子文件类型（用于本文件强耦合主体引用 + 透传 re-export）
import type { Align, FixedSide } from './engineTypes/atomic'
import type { EngineFilterItem } from './engineTypes/filter'
import type {
  EngineColumnSorter,
  EngineSortOrder,
} from './engineTypes/sort'
import type { EngineExpandState, EngineTreeState } from './engineTypes/state'
import type { EngineSemantic } from './engineTypes/semantic'

// === barrel re-export：保持 `from './engineTypes'` 全部公开表面不变 ===
export type { Align, FixedSide } from './engineTypes/atomic'
export type { EngineFilterItem } from './engineTypes/filter'
export type {
  EngineSortOrder,
  EngineCompareFn,
  EngineColumnSorter,
} from './engineTypes/sort'
export type { EngineTreeState, EngineExpandState } from './engineTypes/state'
export type {
  EngineSemanticSection,
  EngineSemanticSectionStyles,
  EngineSemantic,
} from './engineTypes/semantic'

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
   * 该列单元格额外 className（透传到数据单元格 + 表头格，对齐 antd `column.className`）。
   * 详见对外 types.ts ColumnType.className。
   */
  className?: string
  /**
   * 该列单元格额外 inline style（对齐 antd `column.style`）。
   * 详见对外 types.ts ColumnType.style。
   */
  style?: import('react').CSSProperties
  /**
   * 是否单行省略号。由适配层 normalize：外部 `boolean | {showTitle}` 统一解析为
   * `boolean`（控制是否加 `dg-cell-ellipsis` CSS 类）；`showTitle` 单独透传（见下）。
   */
  ellipsis?: boolean
  /**
   * 是否显示默认 native title（对齐 antd `ellipsis.showTitle`）。
   * 由适配层 normalize 自 `{ showTitle: false }` 解析：`undefined`/`true` → 显示默认 title；
   * `false` → cell-inner **不加** native title（让 render 内 antd Tooltip 接管 hover）。
   * 仅 `ellipsis: true` 列消费（非 ellipsis 列无 title，本字段无意义）。
   */
  showTitle?: boolean
  /**
   * 是否隐藏该列。`true`：该叶子列 track 置 `0fr` + 单元格加 `dg-cell-hidden` 类
   * （track 不删保线号稳定）。详见 `docs/design-notes/hidden-column.md`。
   */
  hidden?: boolean
  /**
   * 自定义单元格渲染。
   * 签名对齐 antd column.render 的常用子集：
   *   (text, record, index) => ReactNode | EngineRenderedCell
   */
  render?: (text: any, record: RecordType, index: number) => ReactNode | EngineRenderedCell
  /**
   * 单元格事件 + 合并入口。
   * 返回 { colSpan?, rowSpan?, ...任意字段 }；含 colSpan/rowSpan=0 表示该格被覆盖（不渲染）。
   * 返回值的**其余字段**（除 colSpan/rowSpan）由渲染层透传给 components.body.cell。
   * 详见对外 types.ts ColumnType.onCell 注释。
   *
   * 引擎消费：cellMerge 只读 colSpan/rowSpan；GridTable 渲染单元格时若提供了
   * components.body.cell，会调用 onCell 取完整返回值透传给 cell 组件。
   */
  onCell?: (record: RecordType, index: number) => Record<string, any> | undefined
  /**
   * 表头格 props 注入（对齐 antd `column.onHeaderCell`）。
   * flat 路径（ColumnCells）用 leafColumn 消费本字段；multi 路径由 EngineColumnNode.onHeaderCell
   * 经 flattenHeaderCells 透传到 EngineHeaderCell.onHeaderCell。详见 EngineColumnNode.onHeaderCell。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onHeaderCell?: (
    column: any,
    index: number,
  ) => import('react').HTMLAttributes<HTMLElement> | undefined
  /**
   * 表头格横向跨列数。
   * `colSpan: N` (N>=2)：表头格跨 N 个叶子列；后续 N-1 叶子列需 `colSpan: 0`（被覆盖，不渲染表头格）。
   * `colSpan: 0`：表头格被覆盖，不渲染。详见对外 types.ts ColumnType.colSpan。
   */
  colSpan?: number
  /** 行标题语义（a11y/视觉占位，不影响布局）。 */
  rowScope?: 'row'
  /**
   * 排序器。true=默认比较；函数=自定义；false/undefined=不可排序。
   * 引擎不消费此字段做排序逻辑（排序由适配层 useSorter 完成），仅用于渲染排序图标 + 判定该列是否可排序。
   */
  sorter?: EngineColumnSorter<RecordType>
  /**
   * 当前排序方向（由适配层 useSorter 解析后传入）。
   * 引擎据此渲染排序图标三态（升序 caret-up 高亮 / 降序 caret-down 高亮 / null 两 caret 灰）。
   */
  sortOrder?: EngineSortOrder
  /**
   * 多列排序优先级序号（1-based，由适配层 useSorter 解析后传入）。
   * 仅当该列激活（sortOrder 非 null）且处于多列模式时有值；引擎据此在表头 caret 旁渲染优先级数字。
   * undefined/0 表示不显示序号（单列模式或未激活列）。
   */
  sortPriority?: number
  /**
   * 点击表头切换排序的循环顺序。
   * 引擎不消费，仅透传到 headerCells 供表头格渲染参考（当前未直接用；循环逻辑在适配层）。
   */
  sortDirections?: Array<'ascend' | 'descend'>
  /**
   * 是否显示排序提示 tooltip。引擎不消费，仅透传到 headerCells 供表头格渲染 tooltip。
   */
  showSorterTooltip?: boolean | { target?: 'full-header' | 'sorter-icon' }
  /**
   * 筛选项列表（仅叶子列消费）。非空 + onFilter 时该列表头渲染筛选漏斗图标。
   * 引擎只消费顶层项（`children` 不渲染二级菜单 UI，树形）；适配层 useFilter 已把 children 扁平化。
   */
  filters?: Array<EngineFilterItem>
  /**
   * 筛选判定函数（仅叶子列消费）。引擎不调用（适配层 useFilter 调），仅作为"该列可筛选"的标志
   * （与 filters 同时存在才渲染漏斗）。
   */
  onFilter?: (value: import('../types').FilterValue, record: RecordType) => boolean
  /**
   * 是否多选筛选（默认 true）。引擎据此决定下拉用 Checkbox.Group 还是 Radio。
   */
  filterMultiple?: boolean
  /**
   * 当前激活的筛选值数组（由适配层 useFilter 解析后传入，受控/非受控统一在此）。
   * 引擎据此渲染漏斗激活态（FilterFilled 高亮）+ 下拉默认勾选。
   * 空数组/undefined/null 均视为"无激活筛选"（漏斗为 FilterOutlined 灰态）。
   */
  filteredValue?: Array<import('../types').FilterValue> | null
  /**
   * 关闭下拉即应用（默认 true）。引擎据此控制 Dropdown 的 onOpenChange 行为。
   */
  filterOnClose?: boolean
  /**
   * 自定义筛选下拉面板（透传对外 `column.filterDropdown`）。
   * 引擎渲染层（FilterDropdown）据此切换：有 filterDropdown → 渲染自定义面板（注入 antd 兼容 props）；
   * 无 → 渲染内置 Checkbox/Radio 面板。函数签名见对外 types.ts `FilterDropdownProps`。
   */
  filterDropdown?:
    | React.ReactNode
    | ((props: import('../types').FilterDropdownProps) => React.ReactNode)
  /**
   * 自定义漏斗图标（透传对外 `column.filterIcon`）。
   * 函数 `(filtered: boolean) => ReactNode`；或直接 ReactNode。缺省用自绘 FilterOutlined/Filled。
   */
  filterIcon?:
    | React.ReactNode
    | ((filtered: boolean) => React.ReactNode)
  /**
   * 透传给筛选下拉 antd Dropdown 的 props（透传对外 `column.filterDropdownProps`）。
   * 含 open（受控）/onOpenChange/triggerClassName/overlayClassName 等。
   */
  filterDropdownProps?: import('../types').ColumnFilterDropdownProps
  /**
   * 筛选项搜索（透传对外 `column.filterSearch`；仅叶子列消费）。
   * true → 默认 contains 匹配；函数 → 自定义；undefined/false → 不渲染搜索框。
   * 仅 menu 模式内置面板生效；自定义面板（filterDropdown）不消费。详见对外 types.ts。
   */
  filterSearch?:
    | true
    | ((input: string, record: import('./types').EngineFilterItem) => boolean)
  /**
   * 筛选下拉展示模式（透传对外 `column.filterMode`，默认 'menu'）。
   * 'tree' → 内置下拉用 antd `<Tree checkable>` 渲染树形结构（filters.children）；'menu' → Checkbox/Radio。
   * 自定义面板（filterDropdown）存在时 filterMode 无效（被取代）。详见对外 types.ts。
   */
  filterMode?: 'menu' | 'tree'
  /** 原始 antd column，按需透传（colSpan/rowSpan/onCell 等使用）。 */
  raw?: unknown
  /**
   * 单元格重渲染优化（对齐 antd `column.shouldCellUpdate`）。
   * 返回 false 时该单元格（components.body.cell）在 record 变化时不重渲染。
   * 仅当 components.body.cell 提供时消费。详见对外 types.ts ColumnType.shouldCellUpdate。
   */
  shouldCellUpdate?: (prevRecord: RecordType, nextRecord: RecordType) => boolean
  /** data-grid 列级专属选项。 */
  gridColumnOptions?: GridColumnOptions<RecordType>
}

/**
 * 引擎列树节点（多级表头）。详见 docs/design-notes/header.md。
 *
 * 由 antd `columns[].children` 嵌套映射而来，**任意深度**。
 * - 叶子节点（`children` 为空/undefined）：参与 `grid-template-columns` 列宽拼接与数据行渲染，
 *   与 `EngineLeafColumn` 一一对应（前序遍历即叶子列顺序）。
 * - 非叶子节点：仅作为表头分组，渲染一个跨多列的表头格。
 *
 * 树的遍历顺序（前序）即 antd 列的渲染顺序；固定列 `fixed` 由父节点向子节点继承。
 */
export interface EngineColumnNode<RecordType = any> {
  /** 稳定 key（叶子列：antd column.key/dataIndex；分组列：由路径派生）。 */
  key: string
  /** 表头文本或节点（分组列的 group title）。 */
  title?: ReactNode
  /** 对齐方式（仅叶子列消费）。 */
  align?: Align
  /** 是否固定列（已归一化）。 */
  fixed?: FixedSide
  /**
   * 该列单元格/表头格额外 className（对齐 antd `column.className`）。
   * 详见 EngineLeafColumn.className / 对外 types.ts ColumnType.className。
   */
  className?: string
  /**
   * 该列单元格/表头格额外 inline style（对齐 antd `column.style`）。
   * 详见 EngineLeafColumn.style / 对外 types.ts ColumnType.style。
   */
  style?: import('react').CSSProperties
  /** 是否单行省略号（仅叶子列消费，已 normalize 为 boolean）。详见 EngineLeafColumn.ellipsis。 */
  ellipsis?: boolean
  /**
   * 是否显示默认 native title（仅叶子列消费，已 normalize）。详见 EngineLeafColumn.showTitle。
   */
  showTitle?: boolean
  /**
   * 是否隐藏该列（仅叶子节点消费；分组节点的 hidden 无意义——多级表头隐藏通过隐藏
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
  render?: (text: any, record: RecordType, index: number) => ReactNode | EngineRenderedCell
  /**
   * 单元格事件 + 合并入口（仅叶子节点消费）。详见 EngineLeafColumn.onCell。
   */
  onCell?: (record: RecordType, index: number) => Record<string, any> | undefined
  /**
   * 表头格 props 注入（对齐 antd `column.onHeaderCell`，仅叶子节点消费；分组表头格无 onHeaderCell）。
   * 签名 `(column, index) => HTMLAttributes`，返回值整体合并到表头格 div 的 props
   * （className/style/onClick/...）。详见对外 types.ts ColumnType.onHeaderCell。
   *
   * column 参数用 `any`（对齐 antd `GetComponentProps` 的 data 参数风格）——适配层传入强类型
   * `(column: ColumnType, index) => ...` 可赋值给本字段（参数逆变 any 兼容）。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onHeaderCell?: (
    column: any,
    index: number,
  ) => import('react').HTMLAttributes<HTMLElement> | undefined
  /**
   * 表头格横向跨列数（仅叶子节点消费）。详见 EngineLeafColumn.colSpan。
   */
  colSpan?: number
  /** 行标题语义（仅叶子节点消费）。详见 EngineLeafColumn.rowScope。 */
  rowScope?: 'row'
  /**
   * 排序器（仅叶子节点消费）。详见 EngineLeafColumn.sorter。
   */
  sorter?: EngineColumnSorter<RecordType>
  /**
   * 当前排序方向（仅叶子节点消费）。详见 EngineLeafColumn.sortOrder。
   */
  sortOrder?: EngineSortOrder
  /**
   * 多列排序优先级序号（仅叶子节点消费）。详见 EngineLeafColumn.sortPriority。
   */
  sortPriority?: number
  /**
   * 点击表头切换排序的循环顺序（仅叶子节点消费）。
   */
  sortDirections?: Array<'ascend' | 'descend'>
  /**
   * 是否显示排序提示 tooltip（仅叶子节点消费）。
   */
  showSorterTooltip?: boolean | { target?: 'full-header' | 'sorter-icon' }
  /**
   * 筛选项列表（仅叶子节点消费）。详见 EngineLeafColumn.filters。
   */
  filters?: Array<EngineFilterItem>
  /**
   * 筛选判定函数（仅叶子节点消费）。详见 EngineLeafColumn.onFilter。
   */
  onFilter?: (value: import('../types').FilterValue, record: RecordType) => boolean
  /**
   * 是否多选筛选（仅叶子节点消费，默认 true）。
   */
  filterMultiple?: boolean
  /**
   * 当前激活筛选值（仅叶子节点消费，由适配层 useFilter 解析后回填）。
   */
  filteredValue?: Array<import('../types').FilterValue> | null
  /**
   * 关闭下拉即应用（仅叶子节点消费，默认 true）。
   */
  filterOnClose?: boolean
  /**
   * 自定义筛选下拉面板（仅叶子节点消费，透传 `column.filterDropdown`）。
   * 详见 EngineLeafColumn.filterDropdown。
   */
  filterDropdown?:
    | React.ReactNode
    | ((props: import('../types').FilterDropdownProps) => React.ReactNode)
  /**
   * 自定义漏斗图标（仅叶子节点消费，透传 `column.filterIcon`）。
   */
  filterIcon?:
    | React.ReactNode
    | ((filtered: boolean) => React.ReactNode)
  /**
   * 透传给筛选下拉 antd Dropdown 的 props（仅叶子节点消费，透传 `column.filterDropdownProps`）。
   */
  filterDropdownProps?: import('../types').ColumnFilterDropdownProps
  /**
   * 筛选项搜索（仅叶子节点消费，透传 `column.filterSearch`）。
   * 详见 EngineLeafColumn.filterSearch。
   */
  filterSearch?:
    | true
    | ((input: string, record: import('./types').EngineFilterItem) => boolean)
  /**
   * 筛选下拉展示模式（仅叶子节点消费，透传 `column.filterMode`，默认 'menu'）。
   * 详见 EngineLeafColumn.filterMode。
   */
  filterMode?: 'menu' | 'tree'
  /** 原始 antd column（透传）。 */
  raw?: unknown
  /**
   * 单元格重渲染优化（仅叶子节点消费）。详见 EngineLeafColumn.shouldCellUpdate。
   */
  shouldCellUpdate?: (prevRecord: RecordType, nextRecord: RecordType) => boolean
  /** data-grid 列级专属选项。 */
  gridColumnOptions?: GridColumnOptions<RecordType>
}

/**
 * 表头格布局描述（多级表头）。详见 docs/design-notes/header.md。
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
   * 该列表头格额外 className（对齐 antd `column.className`，来自 column.className，
   * 仅叶子表头格消费；分组表头格恒 undefined）。合并到表头格 div 的 className 列表。
   * 详见对外 types.ts ColumnType.className。
   */
  className?: string
  /**
   * 该列表头格额外 inline style（对齐 antd `column.style`，来自 column.style，仅叶子表头格消费）。
   * 合并到表头格 div 的 inline style。详见对外 types.ts ColumnType.style。
   */
  style?: import('react').CSSProperties
  /**
   * 表头格 props 注入（对齐 antd `column.onHeaderCell`，仅叶子表头格消费；分组表头格恒 undefined）。
   * 详见 EngineColumnNode.onHeaderCell / 对外 types.ts ColumnType.onHeaderCell。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onHeaderCell?: (
    column: any,
    index: number,
  ) => import('react').HTMLAttributes<HTMLElement> | undefined
  /**
   * 是否单行省略号（仅叶子表头格有值；已 normalize 为 boolean）。
   * `true`：表头格加 `dg-cell-ellipsis` 类（`.dg-cell-inner` 应用 overflow:hidden +
   * white-space:nowrap + text-overflow:ellipsis）；title 为 string 时额外设 native title
   * 悬浮提示（对齐 antd：长 title 省略 + hover 显示完整标题）——是否加 title 受 `showTitle` 门控。
   */
  ellipsis?: boolean
  /**
   * 是否显示默认 native title（仅叶子表头格有值，已 normalize）。
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
   * 表头格是否被覆盖。
   * `true`：该表头格被前面的 colSpan>1 表头覆盖，**不渲染 DOM**。
   * 默认 undefined/false。
   */
  covered?: boolean
  /**
   * 表头格横跨列数（来自 column.colSpan）。
   * 仅当 `covered !== true` 时有意义；默认 1。
   */
  headerColSpan?: number
  /** 行标题语义（仅 a11y/视觉，不影响布局）。 */
  rowScope?: 'row'
  /**
   * 该叶子表头格对应列是否隐藏。仅叶子表头格有值（分组表头格恒 false）；`true` 时加
   * `dg-cell-hidden` 类。详见 `docs/design-notes/hidden-column.md`。
   */
  hidden?: boolean
  /**
   * 该列是否可排序（仅叶子表头格有值）。
   * `true`：表头格渲染排序图标（caret-up / caret-down 三态）+ 绑定点击排序。
   * 由 `column.sorter` 是否为 truthy 派生（true/函数/对象均为可排序）。
   */
  sortable?: boolean
  /**
   * 该列当前排序方向（仅叶子表头格有值）。
   * 引擎据此渲染排序图标三态：'ascend' caret-up 高亮 / 'descend' caret-down 高亮 / null 两 caret 灰。
   */
  sortOrder?: EngineSortOrder
  /**
   * 多列排序优先级序号（仅叶子表头格有值）。
   * 引擎据此在 caret 旁渲染优先级数字（1/2/3…）；undefined/0 不渲染。
   */
  sortPriority?: number
  /**
   * 是否显示排序提示 tooltip（仅叶子表头格有值）。
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
  sortKey?: React.Key
  /**
   * 该列的**筛选标识**（仅叶子表头格有值，由 flattenHeaderCells 从 node.raw 经
   * `resolveFilterKey` 解析填入）。与 sortKey 同算法（column.key ?? dataIndex），
   * 与 useFilter.onFilterApply 的入参契约一致。筛选应用时传 `filterKey` 而非 `key`，
   * 避免嵌套叶子列的筛选失效（与 sortKey 同款根因）。
   */
  filterKey?: string
  /**
   * 该列是否可筛选（仅叶子表头格有值）。
   * `true`：表头格渲染筛选漏斗图标（FilterFilled）+ 绑定点击打开筛选下拉。
   * 由 `filters` 非空 + `onFilter` 存在派生。
   */
  filterable?: boolean
  /**
   * 该列筛选项列表（仅叶子表头格有值）。供 FilterDropdown 渲染 Checkbox/Radio 项。
   */
  filters?: Array<EngineFilterItem>
  /**
   * 是否多选筛选（仅叶子表头格有值，默认 true）。决定下拉用 Checkbox.Group 或 Radio.Group。
   */
  filterMultiple?: boolean
  /**
   * 当前激活筛选值（仅叶子表头格有值）。决定漏斗激活态（Filled 高亮）+ 下拉默认勾选。
   * 空数组/null 均视为无激活（漏斗为 Outlined 灰态）。
   */
  filteredValue?: Array<import('../types').FilterValue> | null
  /**
   * 关闭下拉即应用（仅叶子表头格有值，默认 true）。
   */
  filterOnClose?: boolean
  /**
   * 自定义筛选下拉面板（仅叶子表头格有值，透传 `column.filterDropdown`）。
   * 有值时引擎渲染层（FilterDropdown）渲染自定义面板（注入 antd 兼容 props），
   * 否则渲染内置 Checkbox/Radio 面板。
   */
  filterDropdown?:
    | React.ReactNode
    | ((props: import('../types').FilterDropdownProps) => React.ReactNode)
  /**
   * 自定义漏斗图标（仅叶子表头格有值，透传 `column.filterIcon`）。
   */
  filterIcon?:
    | React.ReactNode
    | ((filtered: boolean) => React.ReactNode)
  /**
   * 透传给筛选下拉 antd Dropdown 的 props（仅叶子表头格有值，透传 `column.filterDropdownProps`）。
   */
  filterDropdownProps?: import('../types').ColumnFilterDropdownProps
  /**
   * 筛选项搜索（仅叶子表头格有值，透传 `column.filterSearch`）。
   * 引擎渲染层（FilterDropdown）据此在内置 menu 面板顶部渲染 antd Input 搜索框 + 过滤 flatItems。
   * true → 默认 contains；函数 → 自定义；undefined/false → 不渲染搜索框。详见对外 types.ts。
   */
  filterSearch?:
    | true
    | ((input: string, record: import('./types').EngineFilterItem) => boolean)
  /**
   * 筛选下拉展示模式（仅叶子表头格有值，透传 `column.filterMode`，默认 'menu'）。
   * 引擎渲染层（FilterDropdown）据此切换内置面板：'tree' → antd `<Tree checkable>` 树形；
   * 'menu'/undefined → Checkbox.Group/Radio.Group。详见对外 types.ts。
   */
  filterMode?: 'menu' | 'tree'
}

/**
 * 行高约定（非虚拟路径直接作为 grid track）。
 * - number：所有行固定高度（px）。
 * - (record, index) => number | string：按行计算；返回数字按 px，字符串原样作为 grid track size。
 *
 * 行高口径：非虚拟路径走本约定（track），不测量（缺省 `'auto'`）；虚拟路径采用 virtuoso 式
 * ResizeObserver 动态测量（measured-first），本约定仅作未测兜底/初值。
 * 不实现 antd `measureRowRender` 兼容 API（隐藏测量行重渲染），与 RO 测量是两回事
 * （详见 docs/design-notes/virtualization.md）。
 */
export type RowHeight<RecordType = any> =
  | number
  | ((record: RecordType, index: number) => number | string)

/** 引擎 props。 */
export interface EngineTableProps<RecordType = any> {
  /**
   * 叶子列（已扁平化，不含 children）。
   *
   * 两种取法之一：
   *   - 单层表头（无 children）：直接传叶子列数组，引擎走 `grid-auto-flow:column` 快速路径。
   *   - 多级表头：优先传 `columnTree`，引擎从中推导出叶子列、表头格布局、表头行数；
   *     此时 `columns` 字段被忽略（由引擎从树中前序遍历得到叶子列）。
   */
  columns?: Array<EngineLeafColumn<RecordType>>
  /**
   * 列树（多级表头）。任意深度；前序遍历即列顺序。
   * 当传入时优先于 `columns`。无 children 的节点等价于单层叶子列。
   */
  columnTree?: Array<EngineColumnNode<RecordType>>
  /** 数据源。 */
  dataSource: Array<RecordType>
  /** 行 key 取值函数或属性名。 */
  rowKey: string | ((record: RecordType) => string | number)
  /**
   * data-grid 专属 grid 布局选项（有界行高模型 + 列宽拖拽 + 表头行高）。
   *
   * 引擎从此命名空间读取 `rowHeight`/`headerHeight`/`resizable`/`columnResizeMode`/
   * `resizableMinWidth`/`resizableMaxWidth`（无顶层 alias）。详见对外 types.ts `TableProps.gridOptions` 注释
   * （data-grid 专属，与 antd 不兼容）。
   */
  gridOptions?: {
    /** 行高约定（数字 px 或函数；默认 'auto'，虚拟下默认 56）。 */
    rowHeight?: RowHeight<RecordType>
    /** 虚拟化实现模式。undefined / standard 保持现有 React 渲染。 */
    virtualizationMode?: VirtualizationMode
    minRowHeight?: number
    maxRowHeight?: number
    /** 表头行高约定（默认 'auto'）。多级表头下所有表头行统一使用此高度。 */
    headerHeight?: number | string
    /** 列宽拖拽开关；引擎层 undefined/false 不启用。 */
    resizable?: boolean
    /** 列宽拖拽模式。Disabled 禁用；ResizeLeft 只改左列；ResizeSibling 改左右相邻列并保持总宽。 */
    columnResizeMode?: 'Disabled' | 'ResizeLeft' | 'ResizeSibling'
    /** 列宽拖拽最小宽度（px）。默认 30。 */
    resizableMinWidth?: number | ((key: string) => number)
    /** 列宽拖拽最大宽度（px）。默认 Infinity。 */
    resizableMaxWidth?: number | ((key: string) => number)
    /** 悬浮滚动条折叠/显示策略。 */
    scrollBarFoldMode?: ScrollBarFoldMode
  }
  /** 是否显示表头。 */
  showHeader?: boolean
  /**
   * 滚动配置。
   * - `x`：横向滚动。number → 内容最小宽度（px）；string → 原样作 min-width。
   *   不传时表格自适应容器宽度，无横向滚动。
   *   启用时额外渲染横向悬浮滚动条（定位数据区域底部）。
   * - `y`：纵向滚动（仅 `true`）。
   *     - `true`：数据区域模式——表头固定 + 表体滚动 + 纵向悬浮滚动条，
   *       **CSS 自动适应高度**（flex 1fr 表体填满 `.dg-wrapper` 可用高度，不用 JS 算数字）。
   *     - 配合 `virtual=true`：开启纵向虚拟滚动（虚拟窗口高度=CSS 自适应可视高）。
   *     - `undefined`：无表体滚动区（零回归）。
   */
  scroll?: { x?: true | number | string; y?: true; scrollToFirstRowOnChange?: boolean }
  /**
   * 虚拟滚动开关。`virtual=true` 且 `scroll.y === true` 时启用纵向虚拟滚动。
   * 详见对外 types.ts TableProps.virtual 注释 / docs/design-notes/virtualization.md。
   */
  virtual?: boolean
  /**
   * 单元格自定义渲染总入口（预留，供 components.body.cell 等使用）。
   * 当前未消费。
   */
  cell?: (
    column: EngineLeafColumn<RecordType>,
    record: RecordType,
    index: number,
  ) => ReactNode
  /**
   * 自定义组件（对齐 antd v6 `TableComponents` 子集；data-grid div 渲染适配）。
   * - `body.cell`：提供时替换 dg-cell div **内部内容**渲染（返回 ReactNode）；props 含
   *   `{ children, record, index, dataIndex, ...onCell返回值 }`。
   * - `body.row`：提供时每行渲染一个包裹层组件（用于 Form/Context 等）。
   * - `header.cell`：表头格（占位，当前不消费）。
   * 详见对外 types.ts TableComponents 注释。
   */
  components?: {
    header?: { cell?: React.ComponentType<any> }
    body?: { row?: React.ComponentType<any>; cell?: React.ComponentType<any> }
  }
  /**
   * 行展开状态（由适配层 useRowExpand 派生，引擎只消费、不持有状态）。
   *
   * 引擎据此：
   *   1. 在 grid-template-rows 中为每个可展开数据行紧跟一条"展开内容 track"：
   *        展开时 `1fr`、收起时 `0fr`；`.dg-grid` 上 `transition: grid-template-rows 0.3s ease`
   *        实现 0fr↔1fr 平滑过渡。
   *   2. 展开内容作为 grid item 渲染在该 track（grid-column: 1 / -1 跨整行），overflow:hidden+min-height:0。
   *   3. 虚拟模式下，虚拟窗口（useVirtualList）仍按收起态算；展开 track 不参与窗口大小
   *      （详见 docs/design-notes/virtualization.md）。
   */
  expandState?: EngineExpandState
  /**
   * 树形数据状态（由适配层 useTreeData 派生，引擎只消费、不持有状态）。
   *
   * 引擎据此在**第一列数据列**单元格内按 `level × indentSize` 左缩进 + `hasChildren` 行渲染展开/收起图标。
   * 数据源已由适配层扁平化（按展开状态过滤未展开父行的子孙行），引擎按普通扁平表格渲染。
   *
   * 与 expandState（expandedRowRender 自定义展开内容）互斥：树形模式下不启用 expandState
   * （antd 行为：tree-data 优先于 expandedRowRender）。
   */
  treeState?: EngineTreeState
  /**
   * 列宽策略 tableLayout（对齐 antd `TableProps.tableLayout` + rc-table mergedTableLayout）。
   * 详见 docs/design-notes/column-width.md（完整策略表 + mergedTableLayout 派生公式）。
   *
   * **语义**：
   *   - `'auto'`：grid 列 track 走 `min-content`（无 width 列）/ `minmax(width, max-content)`
   *     （绝对 width 列）；`.dg-grid` 加 `width:100%` + `.dg-wrapper{overflow-x:auto}`：
   *     内容>容器时出横向滚动条；内容<容器时撑满不留白。
   *   - `'fixed'`：约束模式——`.dg-grid` 加 `width:100%`；无 width 列 track 改为 `minmax(0, 1fr)`
   *     （`min:0` 允许收缩触发 ellipsis）；普通 width 列通常保持绝对 track。若所有可见非 fixed
   *     列都有 numeric/px width，则改为 `minmax(0, width-fr)`，按声明宽度比例填满容器。
   *     hidden 列仍 `0fr`。
   *
   * **派生位置**：由适配层 Table.tsx 派生（对齐 antd mergedTableLayout），引擎层只消费、不派生。
   *
   * **与固定列/虚拟/sticky 的关系**：详见 docs/design-notes/column-width.md「grid-track 策略表」
   * 与「`.dg-grid { width: 100% }` 配合」节（sticky 模式不加 width:100% 例外）。
   */
  tableLayout?: 'auto' | 'fixed'
  /**
   * 排序点击回调。
   * 用户点击可排序叶子表头格（含排序图标区域）时触发。参数为该列的稳定 key（来自 columnTree，
   * 即 `column.key` / dataIndex / 匿名 col-N）。
   * 排序状态机（受控/非受控、sortDirections 循环、defaultSortOrder）由适配层 useSorter 维护；
   * 引擎只负责触发此回调，不持有排序状态。
   */
  onSorterClick?: (columnKey: string) => void
  /**
   * 筛选应用回调。
   * 用户在筛选下拉（FilterDropdown）应用筛选（关闭下拉/点确定）时触发。参数：
   *   - filterKey：该列的稳定筛选 key（与 column.key/dataIndex 一致；与 onSorterClick 同源）。
   *   - nextFilteredValue：新的筛选值数组（空数组表示清除该列筛选）。
   * 筛选状态机（受控/非受控、filteredValue、defaultFilteredValue）由适配层 useFilter 维护；
   * 引擎只负责触发此回调，不持有筛选状态。
   */
  onFilterApply?: (
    filterKey: string,
    nextFilteredValue: Array<import('../types').FilterValue>,
  ) => void
  /**
   * 汇总栏 summary（透传对外 `TableProps.summary` 解析后的 ReactNode）。
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
   * 空状态占位内容。
   *
   * 适配层（Table.tsx）解析 emptyText 来源优先级（data-grid 当前兼容语义）：
   *   1. `TableProps.locale.emptyText`（Table 级，最高优先级）。
   *   2. `ConfigProvider locale.Table.emptyText`（全局 Table locale，由 merged Table locale 提供）。
   *   3. `ConfigProvider.renderEmpty('Table')`（全局表体空状态）。
   *   4. 默认 antd `<Empty>`。
   * 解析后的 ReactNode 传给引擎；引擎仅在 pagedDataSource 为空时渲染一个跨所有列的 empty 区
   * （`grid-column: 1 / -1`，居中）。非空时不渲染（零回归）。
   *
   * 表体 empty 不区分"空数据 vs 筛选无结果"——两种场景共用同一 emptyText
   * （已由适配层按上述优先级解析为单一 'Table' 语义）。
   * 注：antd 的 `'Table.filter'` 是 filter 下拉内 filters 空时的占位（FilterDropdown 消费），
   * 与表体 empty 无关。
   */
  emptyText?: ReactNode
  /**
   * 页面级粘性表头配置（由适配层解析后传入；引擎据此切到"页面级 sticky"渲染路径）。
   *
   * **语义（区别容器内固定）**：表头相对**页面 viewport** 固定（`position: sticky;
   * top: offsetHeader`），而非相对表格滚动容器。详见对外 `StickyConfig` 注释 / docs/design-notes/sticky.md。
   *
   * 引擎消费：
   *   - `offsetHeader`：表头 grid item 的 sticky top 值（页面纵向滚动时表头钉在视口顶部该偏移处）。
   *   - `offsetScroll`：底部 StickyScrollBar 的 sticky bottom 值。
   *   - `getContainer`：StickyScrollBar 同步监听的滚动容器（默认 window）。
   *
   * **引擎行为切换**：sticky 启用时，`.dg-grid` 外包 `overflow: clip` 视口（裁剪宽表但不创建滚动容器），
   * 表头 grid item 加 `position: sticky; top: offsetHeader`；grid 之后渲染一个 `StickyScrollBar`
   * （`position: sticky; bottom: offsetScroll`）维护虚拟横向 scrollLeft 并驱动 transform。
   *
   * 未提供（undefined）时不启用（所有现有渲染路径不变，零回归）。
   */
  sticky?: {
    offsetHeader?: number
    offsetScroll?: number
    getContainer?: () => HTMLElement | Window | undefined
  }
  /**
   * 语义化 classNames/styles（已由适配层解析为对象——classNames/styles 可能是对象或函数，
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
   * 表头行 props 注入（对齐 antd v6 `TableProps.onHeaderRow`）。
   * grid 渲染下表头无独立 `<tr>`，引擎把返回值透传到该表头行**所有表头格**（事件 + class + style）。
   * 详见对外 types.ts TableProps.onHeaderRow。未提供（undefined）时不注入（零回归）。
   *
   * columns 参数用 `any[]`（对齐 antd `GetComponentProps` 风格）——适配层传入强类型
   * `(columns: ColumnType[], index) => ...` 可赋值给本字段。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onHeaderRow?: (
    columns: Array<any>,
    index: number,
  ) => import('react').HTMLAttributes<HTMLElement> | undefined
  /**
   * 表体行 props 注入（对齐 antd v6 `TableProps.onRow`）。
   * grid 渲染下表体无独立 `<tr>`，引擎把返回值透传到该行**所有数据单元格**（事件 + class + style）。
   * 详见对外 types.ts TableProps.onRow。未提供（undefined）时不注入（零回归）。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRow?: (
    record: any,
    index: number,
  ) => import('react').HTMLAttributes<HTMLElement> | undefined
  /**
   * 表体行 className（对齐 antd v6 `TableProps.rowClassName`）。
   * grid 渲染下表体无独立 `<tr>`，引擎把 class 透传到该行**所有数据单元格**（行级 class 标记）。
   * 详见对外 types.ts TableProps.rowClassName。未提供（undefined）时不注入（零回归）。
   */
  rowClassName?: string | ((record: any, index: number) => string)
  /**
   * 筛选下拉等 dropdown 的挂载容器（对齐 antd v6 `TableProps.getPopupContainer`）。
   * 引擎把它作为 FilterDropdown 内 antd Dropdown 的默认 getPopupContainer
   * （列级 filterDropdownProps.getPopupContainer 优先）。未提供（undefined）时 antd Dropdown 走
   * 默认（document.body），零回归。
   */
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement
  /**
   * Table 级 `locale` i18n（来自 TableProps.locale / ConfigProvider locale 合并结果）。
   * 引擎当前消费：
   * - FilterDropdown：filterConfirm/filterReset/filterEmptyText/filterSearchPlaceholder/
   *   filterCheckAll（+ @deprecated filterCheckall）
   * - 排序 hover title：triggerDesc/triggerAsc/cancelSort
   * 未提供（undefined）时各消费处回退到 antd en_US 同款英文，零回归。
   */
  filterLocale?: {
    filterConfirm?: ReactNode
    filterReset?: ReactNode
    filterEmptyText?: ReactNode
    filterSearchPlaceholder?: string
    filterCheckall?: ReactNode
    filterCheckAll?: ReactNode
    triggerDesc?: string
    triggerAsc?: string
    cancelSort?: string
  }
  /**
   * 行是否可 hover 高亮（对齐 antd v6 `TableProps.rowHoverable`），默认 true。
   * false 时单元格不加 dg-row-hover（关闭内置 hover 视觉）。详见对外 types.ts
   * TableProps.rowHoverable。未提供（undefined）时默认 true（保持现有 hover 行为不变，零回归）。
   */
  rowHoverable?: boolean
  /**
   * 行选中态判定回调。
   *
   * 适配层（Table.tsx）传 `selection.isSelected`（useRowSelection）→ 引擎在命中选中行的
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
export interface EngineRenderedCell {
  props?: Record<string, any>
  children?: ReactNode
}
