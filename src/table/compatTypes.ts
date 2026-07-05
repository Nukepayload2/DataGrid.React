/**
 * data-grid antd 兼容类型层 + 公开枚举常量。
 *
 * 这里集中定义 antd Table 兼容接口（filter/sorter/pagination/semantic/locale 等），
 * 以及与哨兵列相关的常量值。引用原子类型从 './nativeOptions' 取。
 */

import type { ReactElement, ReactNode } from 'react'
import type { DropdownProps } from 'antd'
import type { Breakpoint } from 'antd/es/_util/responsiveObserver'
import type {
  Align,
  FixedInput,
  RowCheckboxProps,
  RowSelectMethod,
  RowSelectionType,
} from './nativeOptions'
import type { SelectionItem } from './engine/useRowSelection'

/** Filter item value type, aligned with antd v6 `ColumnFilterItem['value']`. */
export type FilterValue = boolean | React.Key

/**
 * `confirm` 参数（自定义筛选面板，对齐 antd `FilterConfirmProps`）。
 */
export interface FilterConfirmProps {
  /** 应用筛选后是否同时关闭筛选下拉。 */
  closeDropdown: boolean
}

/**
 * `clearFilters` 参数（自定义筛选面板，对齐 antd `FilterResetProps`）。
 */
export interface FilterResetProps {
  /** 清空后是否同时关闭筛选下拉（默认 false）。 */
  closeDropdown?: boolean
  /** 清空后是否立即应用（触发 confirm 语义，默认 false 仅清草稿不应用）。
   *  true：清空并立即应用（与 antd v6 reset + confirm 行为一致）。 */
  confirm?: boolean
}

/** `filterDropdown` 渲染回调收到的 props。 */
export interface FilterDropdownProps {
  /** 样式前缀（兼容字段；恒定 `'dg-filter'`）。 */
  prefixCls: string
  /** 当前选中 key 数组（草稿；调用方通过 setSelectedKeys 更新）。 */
  selectedKeys: Array<React.Key>
  /** 更新选中 key 数组（草稿）。 */
  setSelectedKeys: (selectedKeys: Array<React.Key>) => void
  /**
   * 应用当前草稿为该列 filteredValue。
   * @param param `{ closeDropdown?: boolean }`：true 时同时关闭下拉（默认 false）。
   */
  confirm: (param?: FilterConfirmProps) => void
  /** 清空该列 filteredValue。 */
  clearFilters?: (param?: FilterResetProps) => void
  /** 内置筛选项；自定义面板场景下通常为空。 */
  filters?: Array<ColumnFilterItem>
  /** 关闭下拉，不改变已应用的 filteredValue。 */
  close: () => void
  /** 下拉是否打开。 */
  visible: boolean
}

/** 透传给筛选下拉 antd `Dropdown` 的 props。 */
export interface ColumnFilterDropdownProps {
  /** 受控打开状态（与 antd `Dropdown.open` 一致）。 */
  open?: boolean
  /** 打开/关闭回调。引擎在 filterOnClose=true 时据此应用草稿。 */
  onOpenChange?: (open: boolean) => void
  /** 触发器额外 className（作用于漏斗 trigger span）。 */
  triggerClassName?: string
  /** 触发器额外 style。 */
  triggerStyle?: import('react').CSSProperties
  /** 弹出层额外 className（v6：作用于 overlay root）。 */
  overlayClassName?: string
  /** 弹出层对齐配置（透传 antd Dropdown）。 */
  align?: DropdownProps['align']
  /** 弹出层挂载容器（透传 antd Dropdown getPopupContainer）。 */
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement
}

/** 单个筛选项。 */
export interface ColumnFilterItem {
  /** 筛选项展示文案。 */
  text: ReactNode
  /** 筛选项取值（boolean / React.Key；将作为 onFilter 第一参、onChange filters 数组元素）。 */
  value: FilterValue
  /**
   * 子筛选项（树形筛选；menu 模式保留字段但不消费 UI——出现时内部扁平化为普通项参与勾选）。
   */
  children?: Array<ColumnFilterItem>
}

/**
 * `rowSelection.renderCell` 的返回值（对齐 antd `RenderCellInfo`）。
 */
export type SelectionRenderCellResult =
  | { props?: Record<string, any>; children?: ReactNode }
  | ReactNode

export interface TableRowSelection<RecordType = any> {
  /** 树形数据下是否启用父子联动；默认 `true` 表示严格独立。 */
  checkStrictly?: boolean
  /** 'checkbox'（默认）/ 'radio'。 */
  type?: RowSelectionType
  /** 受控选中 key 数组（真理源；调用方在 onChange 后更新它）。 */
  selectedRowKeys?: Array<React.Key>
  /** 非受控初始值（仅当 selectedRowKeys 未传时生效）。 */
  defaultSelectedRowKeys?: Array<React.Key>
  /**
   * 选中态变化回调（对齐 antd）。
   * @param selectedRowKeys 新的选中 key 数组。
   * @param selectedRows 新的选中 record 数组（按 dataSource 顺序、且 key ∈ selectableKeys）。
   * @param info 操作类型（'all'/'none'/'single' 等）。
   */
  onChange?: (
    selectedRowKeys: Array<React.Key>,
    selectedRows: Array<RecordType>,
    info: { type: RowSelectMethod },
  ) => void
  /** 选中/取消某一行时触发（对齐 antd `rowSelection.onSelect`）。 */
  onSelect?: (
    record: RecordType,
    selected: boolean,
    selectedRows: Array<RecordType>,
    nativeEvent: Event,
  ) => void
  /** 全选/全不选时触发（对齐 antd `rowSelection.onSelectAll`）。 */
  onSelectAll?: (
    selected: boolean,
    selectedRows: Array<RecordType>,
    changeRows: Array<RecordType>,
  ) => void
  /** 反选时触发（对齐 antd `rowSelection.onSelectInvert`）。 */
  onSelectInvert?: (selectedRowKeys: Array<React.Key>) => void
  /** 清空时触发（对齐 antd `rowSelection.onSelectNone`）。 */
  onSelectNone?: () => void
  /**
   * 返回某 record 的勾选相关 props（antd 签名）。
   * `disabled: true` 的行不可勾选、不参与全选/半选。
   */
  getCheckboxProps?: (record: RecordType) => RowCheckboxProps | undefined
  /** 选择列宽度（number→px，string→原样）。缺省走 token `--ant-table-selection-column-width`。 */
  columnWidth?: number | string
  /**
   * 选择列固定方向。antd 接受 'left'/'right'/'start'/'end'，内部归一化。
   * 与固定列组合（选择列作为首列固定 start）。
   */
  fixed?: FixedInput
  /**
   * 隐藏表头全选框（仅 checkbox 有意义；antd 行为：true 时表头格不渲染全选 checkbox）。
   * radio 模式下表头本就空，此字段无效。
   */
  hideSelectAll?: boolean
  /** 选择列对齐（默认 'center'，与 antd 一致）。 */
  align?: Align
  /** 选择列表头下拉菜单配置；仅 checkbox 模式有效。 */
  selections?: true | Array<SelectionItem>
  /** 数据源变化后是否保留当前页外的已选 key。 */
  preserveSelectedRowKeys?: boolean
  /** 自定义勾选格渲染；返回 ReactNode 或带 cell props 的对象。 */
  renderCell?: (
    checked: boolean,
    record: RecordType,
    index: number,
    node: ReactNode,
  ) => SelectionRenderCellResult
}

/**
 * 排序方向。
 * 对齐 antd `SortOrder`：'ascend'（升序）/ 'descend'（降序）/ null（未排序）。
 */
export type SortOrder = 'ascend' | 'descend' | null

/**
 * 排序比较函数。
 * 对齐 antd `CompareFn<RecordType>`：`(a, b, sortOrder?) => number`。
 * 返回值语义与 `Array.prototype.sort` 一致（<0 a 在前，>0 a 在后，=0 不变）。
 */
export type CompareFn<RecordType = any> = (
  a: RecordType,
  b: RecordType,
  sortOrder?: SortOrder,
) => number

/**
 * 排序器配置。
 * - `boolean`：true 表示用默认比较（按 `dataIndex` 字段值升序），false/undefined 不排序。
 * - 函数：自定义比较（`(a, b, sortOrder?) => number`）。
 * - 对象 `{ compare, multiple }`：多列排序用（multiple 为优先级数字）。
 */
export type ColumnSorter<RecordType = any> =
  | boolean
  | CompareFn<RecordType>
  | { compare?: CompareFn<RecordType>; multiple?: number }

/**
 * 点击表头切换排序的循环顺序。
 * 默认 `['ascend', 'descend']`；末尾隐式 `null`（取消排序）回退。
 * 对齐 antd `sortDirections`：值为 `'ascend'`/`'descend'`（不含 null，null 是循环到末尾的隐式回退）。
 */
export type SortDirections = Array<'ascend' | 'descend'>

/**
 * 单列排序结果（对应 antd `SorterResult`）。
 * - `column`：触发排序的列定义（原 antd column 对象）。
 * - `order`：当前排序方向（'ascend'/'descend'/null）。
 * - `field`：排序字段（取自 `column.dataIndex`）。
 * - `columnKey`：排序标识（取自 `column.key`，无 key 时退化为 `column.dataIndex`）。
 */
export interface SorterResult<RecordType = any> {
  column?: ColumnType<RecordType>
  order?: SortOrder
  field?: string | number | Array<string | number>
  columnKey?: React.Key
}

/**
 * antd column 子集（demo 用到的）。
 * `dataIndex` 支持字符串/数字/路径数组（与 antd 一致）。
 */
export interface ColumnType<RecordType = any> {
  key?: React.Key
  title?: ReactNode
  dataIndex?: string | number | Array<string | number>
  /**
   * data-grid 列级专属选项命名空间。
   *
   * **与 antd 不兼容**：antd `ColumnType` 没有 dragColumnLock 等概念，
   * 故 dg 列级专属字段一律归入此命名空间（顶层 `ColumnType` 只保留与 antd 同名同义字段）。
   *
   *   - `dragColumnLock`：列拖拽锁定模式（列拖拽排序）。
   */
  gridColumnOptions?: {
    /**
     * 列拖拽锁定模式。
     *
     * **语义**：
     *   - `undefined`：不锁定（默认），该列可发起拖拽，也可被其它列重排影响。
     *   - `'lockDrag'`：锁定拖拽发起。该列**不可发起拖拽**，但其它列拖拽时它仍可被动让位 /
     *     换位。
     *   - `'lockPosition'`：锁定拖拽发起 + 锁定 index。该列不可发起拖拽，且重排算法保持其
     *     columns index 恒定；拖拽动画中可临时位移以预览 drop 后真实位置。
     *
     * 全局还要受 `gridOptions.columnReorder`（默认 true）约束。
     * 发起拖拽条件见 `useColumnDragSort`：
     * `columnReorder !== false && dragColumnLock === undefined`。
     */
    dragColumnLock?: 'lockDrag' | 'lockPosition'
  }
  width?: number | string
  align?: Align
  fixed?: FixedInput
  /**
   * 该列单元格的额外 className（对齐 antd v6 `column.className`）。
   * 透传到本列所有数据单元格 `.dg-cell-body` + 表头格 `.dg-cell-header`。
   *
   * ★ 与 antd 差异：antd 把 className 作用于 `<td>`/`<th>`；data-grid grid 渲染下
   *   直接合并到 dg-cell div 的 className 列表（与语义化 body.cell/header.cell 同款注入）。
   *
   * 未提供（undefined）时不注入（零回归）。
   */
  className?: string
  /**
   * 该列单元格的额外 inline style（对齐 antd v6 `column.style`，rc-table `ColumnSharedType.style`）。
   * 透传到本列所有数据单元格 + 表头格。
   * 与 `className` 同款注入（合并到 dg-cell div 的 style，覆盖同名字段）。
   *
   * 未提供（undefined）时不注入（零回归）。
   */
  style?: import('react').CSSProperties
  /**
   * 表头格 props 注入（对齐 antd v6 `column.onHeaderCell`）。
   *
   * 签名 `(column, index) => React.HTMLAttributes`：
   *   - `column`：该列表头格对应的原始 antd 列定义（调用方一般不读，直接返回固定 props）。
   *   - `index`：表头行号（单层表头恒 0；多级表头按行号）。
   *   - 返回值整体合并到表头格 div 的 props（className/style/onClick/... 与 onCell 同款透传）。
   *
   * **与 antd 一致**：返回值合并到 `<th>`（data-grid 是表头格 div）；典型用法为列拖拽（drag-column-sorting demo
   *   `onHeaderCell: () => ({ id: ... })` 注入 dnd 标识）、表头点击交互等。
   *
   * **与 onCell 对称**：onCell 注入数据格，onHeaderCell 注入表头格。
   *
   * 未提供（undefined）时不注入（零回归）。
   */
  onHeaderCell?: (
    column: ColumnType<RecordType>,
    index: number,
  ) => import('react').HTMLAttributes<HTMLElement> | undefined
  /**
   * 省略号（对齐 antd v6 `column.ellipsis`）。
   *
   * 取值：
   *   - `true`（默认）：单元格/表头加 ellipsis CSS 类（`text-overflow:ellipsis` +
   *     `white-space:nowrap` + `overflow:hidden`）+ **默认 native `title`** 悬浮提示
   *     （cell-inner 上加 title 属性，hover 显示完整文本；对齐 antd 默认 `showTitle: true`）。
   *   - `false` / undefined：不省略、无 title（零回归）。
   *   - 对象 `{ showTitle?: boolean }`（对齐 antd v6）：
   *       * `showTitle: false` → 加 ellipsis CSS 类（仍省略），但**关闭默认 native title**
   *         （cell-inner 不加 title 属性），让用户在 `render` 内自行包 antd `<Tooltip>` 接管
   *         hover 提示（antd ellipsis-custom-tooltip demo 用法）。
   *       * `showTitle: true` / 缺省 → 等价 `ellipsis: true`（加类 + 加默认 title）。
   *
   * 适配层 normalize：`true` / `{showTitle:true}` / `{}` → ellipsis=true & showTitle=true；
   * `{showTitle:false}` → ellipsis=true & showTitle=false；`false`/undefined → ellipsis=false。
   *
   * **视觉 gap**：grid 列宽默认 `max-content` 使 ellipsis 列 track=content 宽，
   * cell-inner 不溢出 → 视觉无 `...`（CSS 契约正确，缺列宽约束）。核心验证 showTitle 开关 + Tooltip hover，
   * 不依赖省略号视觉生效。详见 `docs/design-notes/column-width.md`。
   */
  ellipsis?: boolean | { showTitle?: boolean }
  /**
   * 隐藏该列。
   *
   * **语义（对齐 antd `column.hidden`）**：
   *   - `true`：该叶子列不渲染其单元格/表头格的可视内容——实现采用 **grid track `0fr`**
   *     方案（grid track `0fr` 占位），即把该叶子列对应的 `grid-template-columns` 一条 track 置为
   *     `0fr`（track 仍存在，列线号不变），单元格内容用 `visibility:hidden` +
   *     `overflow:hidden` 隐藏；`.dg-grid` 上 `transition: grid-template-columns`
   *     实现 `0fr↔1fr` 平滑过渡。
   *   - `false` / undefined：正常渲染。
   *
   * **关键设计：track 数保持不变**。隐藏列**不删除**其 grid track，只把 track 大小置为 `0fr`，
   * 这样多级表头父分组格 `grid-column` 范围不变（隐藏子叶子时父格因其中一条子 track 为 `0fr`
   * 而自动横向收缩）；固定列 sticky 偏移按叶子列宽累加（隐藏列宽度为 0，自动从累加中"消失"）；
   * 合并格 `grid-column: span N` 仍跨原叶子区间；列 track 与行 track 正交，虚拟不受影响；
   * 选择列作为普通叶子列参与，可同样被 hidden。
   *
   * 分组列（有 `children`）的 `hidden` 字段**无效**——只有叶子列的 `hidden` 生效（与 antd 一致：
   * 多级表头隐藏通过隐藏子叶子实现，父分组格随之收缩）。
   *
   * 详见 `docs/design-notes/hidden-column.md`。
   */
  hidden?: boolean
  /** antd render 子集：(text, record, index) => ReactNode。 */
  render?: (text: any, record: RecordType, index: number) => ReactNode
  /**
   * 子列（多级表头，任意深度）。
   * 有 children 时该列视为分组列（仅取 key/title/align/fixed）；
   * 叶子列属性（dataIndex/width/render）仅取自无 children 的节点。
   *
   * 详见 `docs/design-notes/header.md`。
   */
  children?: Array<ColumnType<RecordType>>
  /**
   * 表头格横向跨列数。
   *
   * **语义（与 antd 一致，与 children 多级表头是不同机制）**：
   *   - `colSpan: N`（N>=2）：该表头格横向跨 N 个叶子列。
   *     后续 `N-1` 个**叶子列**的表头格必须显式声明 `colSpan: 0`（被覆盖，不渲染表头）。
   *     这是**单层表头里某列横向跨多列**，与 `children` 多级表头（多层结构）互斥/不同。
   *   - `colSpan: 0`：该表头格被前面的 colSpan>1 表头覆盖，**不渲染表头格**（叶子列的数据单元格正常渲染）。
   *   - 不设/`colSpan: 1`：普通单列表头格。
   *
   * 注意：data-grid 内部仅支持 `colSpan`（表头跨列）；多级表头请用 `children`。
   * 两者**不要在同一列上混用**（与 antd 行为一致）。
   *
   * 详见 `docs/design-notes/header.md`。
   */
  colSpan?: number
  /**
   * 行语义（仅影响 a11y/视觉占位，不影响布局）。
   * antd `rowScope: 'row'` 表示该列是"行标题列"（first column 常用，视觉上加粗）。
   * data-grid 将其渲染为 `<th scope="row">` 语义；非 rowScope 列保持普通单元格。
   * 本字段不影响合并算法。
   */
  rowScope?: 'row'
  /**
   * 单元格事件 + 合并入口。
   *
   * antd column.onCell 签名：`(record, index) => { colSpan?, rowSpan?, className?, onClick?, ... }`。
   * 返回值**整体**透传给 `components.body.cell` 作为 props（antd v6 同语义：BodyRow 把 onCell
   * 返回值合并到 td/cell 组件的 props）。data-grid 消费其中的 `colSpan` / `rowSpan`：
   *   - `colSpan: N`（N>=2）：当前数据行该格向右合并 N 个叶子列（含自身）。
   *     紧随其后的 `N-1` 个叶子列在该行的单元格必须由它们各自的 onCell 返回 `colSpan: 0`（被覆盖，不渲染）。
   *   - `rowSpan: N`（N>=2）：当前格向下合并 N 行（含自身）。被覆盖行的同列格由其 onCell 返回 `rowSpan: 0`。
   *   - `colSpan: 0` 或 `rowSpan: 0`：该格被覆盖，**不渲染**（避免占位错乱）。
   *   - 不设/1：普通单格。
   *
   * 单元格编辑 edit-cell：onCell 返回值的**其余字段**（除 colSpan/rowSpan）会透传给
   * `components.body.cell` 组件作为 props（典型用法：返回 `{ record, editable, dataIndex,
   * title, handleSave }` 给自定义 EditableCell）。与 antd demo edit-cell 的 onCell 写法一致。
   *
   * 注意：colSpan/rowSpan 由合并算法消费（cellMerge），其余字段由渲染层透传（GridTable）；
   * 两者正交——合并格仍可携带编辑 props，编辑 props 不影响合并。
   */
  onCell?: (record: RecordType, index: number) => Record<string, any> | undefined
  /**
   * 排序器。
   *
   * **语义（对齐 antd `column.sorter`）**：
   *   - `true`：该列可排序，用默认比较（按 `dataIndex` 字段值升序，数值/字符串通用）。
   *   - 函数 `(a, b, sortOrder?) => number`：自定义比较；返回值同 `Array.prototype.sort`。
   *   - `false` / undefined：该列不可排序（表头无排序图标、不响应排序点击）。
   *   - 对象 `{ compare, multiple }`：多列排序（multiple 为优先级数字）。
   *
   * **前端排序**（非受控）：引擎按当前 `sortOrder` + `sorter` 对 dataSource 排序后渲染；
   * **受控排序**（外部传 `sortOrder`）：引擎不主动排序，调用方在 onChange 后自行更新 dataSource；
   *   引擎仍按 `sortOrder` 显示排序图标、触发 onChange。
   *
   * 与各能力组合：排序只改变数据行顺序，不改变列结构（多级表头/固定列/合并/虚拟/选择/展开均不受影响）。
   *
   * 详见 `docs/design-notes/filter-sorter.md`。
   */
  sorter?: ColumnSorter<RecordType>
  /**
   * 受控排序方向。传入即受控（引擎不主动排序，调用方负责 dataSource）。
   * 与 `defaultSortOrder` 互斥：`sortOrder` 优先。
   */
  sortOrder?: SortOrder
  /** 非受控初始排序方向。仅当 `sortOrder` 未传时生效（初始态）。 */
  defaultSortOrder?: SortOrder
  /**
   * 点击表头切换排序的循环顺序。
   * 默认 `['ascend', 'descend']`；循环到末尾后隐式回退到 `null`（取消排序）。
   * 对齐 antd：值数组不含 `null`，`null` 是循环到末尾的隐式回退。
   * 例：`['descend']` → 初次点击 descend → 再点 null（取消）。
   */
  sortDirections?: SortDirections
  /**
   * 是否显示排序提示 tooltip（非阻塞）。
   * hover 排序列表头时显示"点击排序"提示。
   * - `true`（默认）：显示。
   * - `false`：不显示。
   * - 对象 `{ target: 'full-header' | 'sorter-icon' }`：控制 tooltip 绑定目标
   *   （`full-header` 整表头格，`sorter-icon` 仅图标）。简化为始终绑定到图标区域。
   */
  showSorterTooltip?: boolean | { target?: 'full-header' | 'sorter-icon' }
  /**
   * 筛选项列表（对齐 antd `column.filters`）。
   *
   * **语义**：数组非空 + 配 `onFilter` 时该列表头渲染筛选漏斗图标，点击弹出筛选下拉。
   *   - 顶层项作为勾选项参与筛选（`text` 显示，`value` 作为 onFilter 第一参 + onChange filters 数组元素）。
   *   - `children`（树形筛选）保留字段但**不做二级菜单 UI**——出现时内部扁平化为顶层项参与勾选
   *     （行为与 antd 默认 menu 模式下的扁平化相近，但不渲染二级菜单 UI；属 tree 模式消费）。
   *
   * 与 `onFilter` 配合：onFilter(value, record) 决定该 value 是否"命中" record；
   * 多选时命中任一即保留该 record（OR 语义）；单选时只保留命中该 value 的 record。
   *
   * 详见 `docs/design-notes/filter-sorter.md`。
   */
  filters?: Array<ColumnFilterItem>
  /**
   * 筛选判定函数（对齐 antd `column.onFilter`）。
   *
   * 签名 `(value, record) => boolean`：返回 true 表示该 value 命中该 record。
   * 与 `filters` 配合：当前选中值集合中**任一**命中即保留该 record（OR 语义，对齐 antd）。
   *
   * **前端筛选**（非受控）：引擎按 `filters` + `onFilter` 对 dataSource 过滤后渲染
   * （与排序叠加：antd 顺序 raw → sort → filter，即先排序后过滤）。
   * **受控筛选**（外部传 `filteredValue`）：引擎不主动过滤，调用方在 onChange 后自行更新 dataSource；
   *   引擎仍按 `filteredValue` 显示漏斗激活态、触发 onChange。
   *
   * 详见 `docs/design-notes/filter-sorter.md`。
   */
  onFilter?: (value: FilterValue, record: RecordType) => boolean
  /**
   * 是否多选（对齐 antd `column.filterMultiple`，默认 true）。
   * - `true`（默认）：Checkbox.Group 多选，命中任一保留（OR）。
   * - `false`：Radio 单选，仅保留命中该 value 的 record。
   */
  filterMultiple?: boolean
  /**
   * 非受控初始筛选值。仅当 `filteredValue` 未传时生效（初始态）。
   */
  defaultFilteredValue?: Array<FilterValue>
  /**
   * 受控筛选值。传入即受控（引擎不主动过滤，调用方负责 dataSource）。
   * 与 `defaultFilteredValue` 互斥：`filteredValue` 优先。
   *
   * 传 `[]`（空数组）表示"无激活筛选"（受控显式空）；传非空数组表示激活筛选。
   * （注意与 undefined 区分：undefined 表示该列非受控，由内部 state / defaultFilteredValue 驱动。）
   */
  filteredValue?: Array<FilterValue> | null
  /**
   * 关闭下拉即应用筛选（对齐 antd `column.filterOnClose`，默认 true）。
   *
   * - `true`（默认）：用户关闭下拉（点击外部/ESC/确定按钮）即把当前勾选应用为 filteredValue。
   * - `false`：必须点"确定"按钮才应用；关闭下拉（点外部/ESC）丢弃未确认的勾选（恢复到上次应用值）。
   *
   * 对齐 antd v6 默认行为（filterOnClose=true）。
   */
  filterOnClose?: boolean
  /**
   * 自定义筛选下拉面板（对齐 antd `column.filterDropdown`）。
   *
   * **语义**：传入即**取代**内置 Checkbox/Radio 下拉。引擎把它渲染进 antd Dropdown 的
   * popupRender，并按 antd 兼容签名注入 props（`selectedKeys`/`setSelectedKeys`/`confirm`/
   * `clearFilters`/`visible`/`close`/`prefixCls`/`filters`）。调用方在面板内自绘搜索框、
   * 自定义勾选 UI 等，通过 `confirm`/`clearFilters` 与引擎交互（onFilter 仍按选中 keys 过滤）。
   *
   * 也可传 ReactNode（非函数）——此时直接渲染为下拉内容，无法获得 confirm 等 props（与 antd 一致）。
   * 一般用法是函数。
   *
   * 与 `onFilter` 关系：自定义面板只是替换**下拉 UI**；实际过滤仍由 `onFilter` + 引擎 useFilter
   * 完成（filterDropdown 的 selectedKeys 经 confirm 应用为 filteredValue，再由 useFilter 过滤）。
   * 故即使使用 filterDropdown，仍须提供 `onFilter`。
   *
   * 与内置 `filters` 关系：filterDropdown 存在时不渲染内置 Checkbox/Radio（即使同时配置了
   * `filters` 也忽略其 UI——但 filters 仍可用于 onChange 的 filters 形态来源等）。
   *
   * 详见 `docs/design-notes/filter-sorter.md`。
   */
  filterDropdown?:
    | React.ReactNode
    | ((props: FilterDropdownProps) => React.ReactNode)
  /**
   * 自定义漏斗图标（对齐 antd `column.filterIcon`）。
   *
   * 函数签名 `(filtered: boolean) => ReactNode`：filtered=true 表示该列有激活筛选（图标激活态）。
   * 也可直接传 ReactNode（恒定图标，不随激活态变化）。
   *
   * 缺省：引擎自绘 FilterOutlined（灰）/FilterFilled（高亮）。
   */
  filterIcon?: React.ReactNode | ((filtered: boolean) => React.ReactNode)
  /**
   * 透传给筛选下拉 antd Dropdown 的 props（对齐 antd `column.filterDropdownProps`，since 5.22）。
   *
   * 用于受控打开（`open`）、`onOpenChange` 订阅、`triggerClassName`/`overlayClassName` 等。
   * 与内置 Dropdown 集成：引擎把这些 props 合并到 antd Dropdown（open 受控优先于内部 state）。
   */
  filterDropdownProps?: ColumnFilterDropdownProps
  /**
   * 筛选下拉展示模式（对齐 antd `column.filterMode`，默认 `'menu'`）。
   *
   * 取值：
   *   - `'menu'`（默认）：内置扁平下拉（Checkbox.Group 多选 / Radio.Group 单选）。
   *     顶层 `filters` 项作为勾选项参与筛选；`children` 扁平化展示（不渲染二级菜单 UI）。
   *   - `'tree'`：内置**树形**下拉（antd `<Tree checkable>`）。`filters` 含 `children` 时渲染为树形结构
   *     （父子缩进 + 展开图标），勾选父子联动（`checkStrictly=false`，即勾父自动勾全部子、勾全部子自动勾父）。
   *     选中值（含各级 value，含半选父级若用户主动勾选）作为 filteredValue，`onFilter` 对每个勾选 value
   *     逐一判定（OR 语义，与 menu 一致）。
   *
   * 与 `filterSearch` 组合：tree 模式下 filterSearch 过滤**树节点**（命中节点 + 保留祖先链维持结构，
   * 对齐 antd `Tree.filterTreeNode`）；输入为空显全树。
   *
   * 与 `filterDropdown`（自定义面板）关系：filterDropdown 存在时**取代**内置下拉（含 tree）——
   * filterMode 仅对内置 Checkbox/Radio vs Tree 切换生效。
   *
   * 默认 `'menu'`：现有 head/filter-search/custom-filter-panel 等不设 filterMode 的列仍走 menu 分支（零回归）。
   *
   * 详见 `docs/design-notes/filter-sorter.md`。
   */
  filterMode?: 'menu' | 'tree'
  /**
   * 筛选项搜索（对齐 antd `column.filterSearch`）。
   *
   * 对**内置下拉面板**生效（menu 模式：Checkbox.Group/Radio.Group 顶部渲染搜索框过滤扁平项；
   * tree 模式：antd `<Tree filterTreeNode>` 过滤树节点）；自定义面板（`filterDropdown`）不消费此字段。
   *
   * 取值：
   *   - `true`：默认匹配。item.text 转字符串后 **trim + toLowerCase**，**包含**输入（trim+toLowerCase）即命中
   *     （对齐 antd FilterSearch 默认 `searchValueMatched`）。
   *   - `(input, record) => boolean`：自定义匹配。`input` 为已 normalize 的输入（trim+toLowerCase，
   *     与 antd 一致——antd 在 menu 模式传 `normalizedSearchValue`），`record` 为筛选项
   *     `{ text, value, children? }`（与 `ColumnFilterItem` 同构；data-grid 引擎层为 `EngineFilterItem`）。
   *     返回 true 表示该项保留显示。
   *   - `false` / undefined：不渲染搜索框（默认）。
   *
   * 输入为空时显示全部筛选项（不过滤）。
   * 关闭下拉时清空搜索值（对齐 antd `useEffect[visible]` 清空；下次打开为空）。
   *
   * menu 模式（默认）与 tree 模式（`filterMode='tree'`）均消费 filterSearch：
   *   - menu：过滤扁平筛选项列表（命中保留）。
   *   - tree：过滤树节点（命中保留 + 保留祖先链维持结构，对齐 antd `Tree.filterTreeNode`）。
   *
   * 详见 `docs/design-notes/filter-sorter.md`。
   */
  filterSearch?:
    | true
    | ((input: string, record: ColumnFilterItem) => boolean)
  /**
   * 单元格重渲染优化（对齐 antd `column.shouldCellUpdate`）。
   *
   * 签名 `(prevRecord, nextRecord) => boolean`：返回 `false` 时该单元格在 record 变化时**不重渲染**
   * （沿用上一次渲染结果）；返回 `true` 或不提供时正常重渲染。用于编辑/复杂单元格场景的性能优化
   * （避免无关 record 字段变化触发昂贵重渲染）。
   *
   * 注意：仅当 `components.body.cell` 提供时本字段才被消费（默认渲染路径不消费，零回归）。
   */
  shouldCellUpdate?: (prevRecord: RecordType, nextRecord: RecordType) => boolean
  /**
   * 响应式列显隐（对齐 antd `column.responsive`，since 4.x）。
   *
   * **语义（严格对齐 antd `InternalTable.tsx:235-246`）**：
   *   - `undefined` / 空数组：该列**始终显示**（所有现有 demo 的默认行为，零回归）。
   *   - 非空 `Breakpoint[]`：仅当**任一**列出的断点在当前视口下激活时，该列才显示；否则该列
   *     从列树中**整体移除**（表头格 + 表体单元格均不渲染，列号不占位）。
   *
   * 断点激活判定用 antd `Grid.useBreakpoint`——返回
   * `{ xs, sm, md, lg, xl, xxl, xxxl }` 各断点布尔。antd 的 `screens[bp] === true` 表示
   * 当前视口 **>= bp**（即该断点及其以上都激活）。故 `responsive: ['md']` 实际语义是
   * **md 及以上视口显示**（与 antd responsive demo 注释 "medium screen or bigger" 一致）。
   *
   * 匹配算法（逐字对齐 antd InternalTable.tsx:242-246）：
   *   ```
   *   matched = Object.keys(screens).filter(bp => screens[bp])   // 当前激活的断点集合
   *   显示该列 <=> !responsive || responsive.some(r => matched.has(r))
   *   ```
   *
   * 取值（antd `Breakpoint`，7 个）：`'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl'`
   * （来自 antd `_util/responsiveObserver` responsiveArray）。
   *
   * **实现位置**：Table 适配层（`Table.tsx`）在构建列树前用 `Grid.useBreakpoint` 过滤 columns——
   * responsive 不匹配的列直接从 columns 数组移除（不进入 `toEngineColumns` / 引擎列树），
   * 引擎层无需感知 responsive（与 antd 一致：antd 也在 InternalTable 派生 mergedColumns 时过滤）。
   *
   * 与各能力组合：被移除的列不参与排序/筛选/选择/固定/合并/虚拟——所有现有机制透明（列号自然收缩）。
   * 树形/编辑等以列位置为基础的机制也正确（过滤发生在列树构建前）。
   */
  responsive?: Array<Breakpoint>
}

/**
 * 分页位置（对齐 antd v6 `TablePaginationPlacement`，**以 antd 6.4.4 实测为准**）。
 *
 * antd v6 的 `pagination.placement` 是**数组**（非 v5 的 `position`）：
 *   - `'topStart' | 'topCenter' | 'topEnd'`：顶部 + 对齐（Start 左 / Center 中 / End 右）。
 *   - `'bottomStart' | 'bottomCenter' | 'bottomEnd'`：底部 + 对齐。
 *   - `'none'`：该侧不显示分页器。
 *
 * 数组取"含 'top' 的首个元素"决定顶部位置 + 对齐；"含 'bottom' 的首个元素"决定底部位置 + 对齐；
 * 全部为 'none' → 不渲染分页器。默认 `['bottomEnd']`（底部右对齐）。
 */
export type TablePaginationPlacement =
  | 'topStart'
  | 'topCenter'
  | 'topEnd'
  | 'bottomStart'
  | 'bottomCenter'
  | 'bottomEnd'
  | 'none'

/**
 * 分页配置（对齐 antd v6 `TablePaginationConfig extends PaginationProps`）。
 *
 * **默认分页对齐 antd**：`pagination` 为 `undefined` 时等价 `{}`，默认 pageSize=10 并渲染
 * bottomEnd 分页器；`pagination={false}` 才关闭分页、数据全显。
 *
 * 覆盖 antd demo 实际用到的子集 + 常用字段：
 *   - 受控：`current` / `pageSize`（传入即受控）。
 *   - 非受控初始：`defaultCurrent`（默认 1）/ `defaultPageSize`（默认 10）。
 *   - `total`：默认 = 当前页数据源长度（排序+筛选后）；外部可覆盖（ajax 场景）。
 *   - `showSizeChanger` / `pageSizeOptions`：透传 antd Pagination。
 *   - `showTotal` / `hideOnSinglePage` / `size`：透传 antd Pagination。
 *   - `placement`：v6 数组语义（见 TablePaginationPlacement）。
 *   - `onChange(page, pageSize)` / `onShowSizeChange(current, size)`：透传 antd Pagination（在 Table onChange 之外独立）。
 *
 * 非核心控件用 antd `<Pagination>`，不自研。详见 `docs/features/interaction/pagination-and-data.md`。
 */
export interface TablePaginationConfig {
  /** 受控当前页（1-based）。传入即受控。 */
  current?: number
  /** 受控每页条数。传入即受控。 */
  pageSize?: number
  /** 非受控初始当前页（默认 1）。仅当 `current` 未传时生效。 */
  defaultCurrent?: number
  /** 非受控初始每页条数（默认 10）。仅当 `pageSize` 未传时生效。 */
  defaultPageSize?: number
  /**
   * 总条数。默认 = 当前页数据源长度（排序+筛选后）。
   * 外部覆盖（如 ajax 场景：服务端 total，前端 dataSource 仅当前页数据）。
   */
  total?: number
  /** 是否显示 pageSize 切换器（透传 antd Pagination）。 */
  showSizeChanger?: boolean
  /** 可选 pageSize 列表（透传 antd Pagination，默认 ['10','20','50','100']）。 */
  pageSizeOptions?: Array<number | string>
  /** 显示总条数回调（透传 antd Pagination）。 */
  showTotal?: (total: number, range: [number, number]) => ReactNode
  /** 只有一页时是否隐藏分页器（透传 antd Pagination）。 */
  hideOnSinglePage?: boolean
  /**
   * 分页器尺寸（透传 antd Pagination）。缺省随 Table size（small/middle→'small'，其余 default）。
   * 取值 `'small'`（紧凑）/ `'default'`（标准）。
   */
  size?: 'small' | 'default'
  /** 分页位置（v6 数组语义，见 TablePaginationPlacement；默认 `['bottomEnd']`）。 */
  placement?: Array<TablePaginationPlacement>
  /**
   * 分页变化回调（透传 antd Pagination，独立于 Table onChange）。
   * 翻页/改 pageSize 时触发：先于此处的 onChange。
   */
  onChange?: (page: number, pageSize: number) => void
  /** pageSize 变化回调（透传 antd Pagination）。 */
  onShowSizeChange?: (current: number, size: number) => void
  /** 透传给 antd Pagination 的 className。 */
  className?: string
  /** 透传给 antd Pagination 的 style。 */
  style?: import('react').CSSProperties
}

/**
 * onChange 第一个参数 `pagination` 的实际值类型。
 *
 * 无论受控与否，onChange 的 pagination 参数始终反映**当前实际分页状态**（与 antd 一致）：
 *   - `current`：当前页（1-based）。
 *   - `pageSize`：每页条数。
 *   - `total`：总条数（外部 total 或当前数据源长度）。
 */
export interface TablePaginationState {
  current: number
  pageSize: number
  total: number
}

/**
 * 表格尺寸（对齐 antd v6 `TableProps.size`）。
 *
 * antd **v6** 尺寸语义：
 *   - `'large'`（默认）：标准行高 padding（cell padding block 16 / inline 16）。
 *   - `'medium'`：中等行高 padding（block 12 / inline 8；v5 对应 `'middle'`，data-grid 保留 `'middle'` 作别名）。
 *   - `'small'`：紧凑行高 padding（block 8 / inline 8；antd 文档标注用于 Modal 内）。
 *
 * ★ 关于 `'compact'`（实测结论）：
 *   antd v6 **Table 组件本身不存在 compact size**——`SizeType = 'small' | 'medium' | 'middle' | 'large'`
 *   （`components/config-provider/SizeContext.tsx:6`），Table style 只输出 large/MD/SM 三档 token
 *   （`components/table/style/index.ts:516-528`）。`compact` 是 Button/Space/Input 等其它组件的尺寸概念，
 *   不属于 Table。data-grid 的 SizeType 保留 `'compact'`（用于 `<ConfigProvider componentSize>` 全局消费的
 *   兜底，传入时 sizeToClass 把它视觉等价为 `'small'`——即 antd 6.4.4 实测最紧凑 Table 尺寸）。
 *
 * data-grid 兼容性：
 *   - 同时接受 v5 的 `'middle'`（旧 demo / 调用方零回归）与 v6 的 `'medium'`。
 *   - `'middle'` / `'medium'` 视觉等价（共用 `dg-size-middle` 类，见 tokens.css）。
 *   - `'compact'` 视觉等价 `'small'`（共用 `dg-size-small` 类；不造 antd 不存在的 token）。
 */
export type SizeType = 'large' | 'middle' | 'medium' | 'small' | 'compact'

/**
 * 语义化样式：内层 wrapper / cell / row 三部位（header 与 body 共用同结构）。
 * 对齐 antd v6 `ComponentsSemanticClassNames` / `ComponentsSemanticStyles`
 * （`components/table/InternalTable.tsx:90-100`）。
 *
 * - `wrapper`：header / body 的容器层（data-grid 中对应滚动容器/分组的根容器）。
 * - `row`：行（表头行 / 表体行）。
 * - `cell`：单元格（表头格 / 表体格）。
 *
 * 对应 data-grid DOM 注入点：
 *   - `header.wrapper`：表头区根容器（渲染层无独立 DOM 时注入到 grid）。
 *   - `header.row`：表头行。
 *   - `header.cell`：`.dg-cell-header`。
 *   - `body.wrapper`：表体区根容器。
 *   - `body.row`：表体行（`.dg-row`，data-grid 因 grid 布局无单一 `<tr>`，row class 透传到该行单元格）。
 *   - `body.cell`：`.dg-cell-body`。
 */
export interface ComponentsSemanticClassNames {
  wrapper?: string
  cell?: string
  row?: string
}
export interface ComponentsSemanticStyles {
  wrapper?: import('react').CSSProperties
  cell?: import('react').CSSProperties
  row?: import('react').CSSProperties
}

/**
 * 分页器语义化样式（对齐 antd v6 `PaginationSemanticType`）。
 * - `root`：分页根容器（`.dg-pagination`）。
 * - `item`：分页单项（透传到 antd Pagination 的 item 项——本引擎透传到外层 `.dg-pagination` 子层）。
 */
export interface PaginationSemanticClassNames {
  root?: string
  item?: string
}
export interface PaginationSemanticStyles {
  root?: import('react').CSSProperties
  item?: import('react').CSSProperties
}

/**
 * 语义化 classNames 结构（对齐 antd v6 `TableSemanticType['classNames']`，
 * 见 `components/table/InternalTable.tsx:102-112`）。
 *
 * 嵌套部位：
 *   - `root`：根元素 `.dg-wrapper`。
 *   - `section`：包装容器元素（`.dg-section`，data-grid 在 grid 外包一层 section 容器承载）。
 *   - `content`：内容元素（`.dg-content`，title/footer 之间的表格内容区）。
 *   - `title`：标题 `.dg-title`。
 *   - `footer`：脚注 `.dg-footer`。
 *   - `header`：表头 `{ wrapper, row, cell }`。
 *   - `body`：表体 `{ wrapper, row, cell }`。
 *   - `pagination`：分页 `{ root, item }`。
 *
 * 字段语义对照 antd `_semantic.tsx`（root / title / content / section / header.{wrapper,row,cell} /
 * body.{wrapper,row,cell} / footer / pagination.{root,item}）。
 */
export interface TableSemanticClassNames {
  root?: string
  section?: string
  title?: string
  footer?: string
  content?: string
  header?: ComponentsSemanticClassNames
  body?: ComponentsSemanticClassNames
  pagination?: PaginationSemanticClassNames
}

/**
 * 语义化 styles 结构（对齐 antd v6 `TableSemanticType['styles']`）。结构与 `TableSemanticClassNames`
 * 同构，值为 `CSSProperties`。
 */
export interface TableSemanticStyles {
  root?: import('react').CSSProperties
  section?: import('react').CSSProperties
  title?: import('react').CSSProperties
  footer?: import('react').CSSProperties
  content?: import('react').CSSProperties
  header?: ComponentsSemanticStyles
  body?: ComponentsSemanticStyles
  pagination?: PaginationSemanticStyles
}

/**
 * 函数式 classNames/styles 求值时收到的 info（对齐 antd v6 `(info: { props }) => ...`）。
 *
 * `props` 为 Table 当前生效的关键 props 子集（用于按 size/bordered/virtual 等条件返回不同样式）。
 * 与 antd 一致：`info.props` 是 Table props 本身（data-grid 提供**部分字段**子集，避免暴露内部细节）。
 *
 * 泛型 `RecordType` 仅为类型签名对齐 antd `TableProps<RecordType>`（demo 可用
 * `TableSemanticInfo<DataType>` 拷贝），运行时不携带 record 数据。
 */
export interface TableSemanticInfo<RecordType = any> {
  props: {
    size?: SizeType
    bordered?: boolean
    virtual?: boolean
    scroll?: { x?: number | string; y?: true }
    pagination?: false | TablePaginationConfig
  }
  /**
   * 类型签名占位（对齐 antd `GenerateSemantic<..., Props>` 的 Props 泛型参数）。
   * 运行时不传值；仅供 TypeScript 把 `RecordType` 纳入类型签名，避免泛型未用告警。
   */
  readonly _recordType?: RecordType
}

/**
 * classNames：支持对象（静态）或函数 `(info) => 对象`（动态，按 info.props 求值）。
 * 对齐 antd v6 `TableProps.classNames`（`GenerateSemantic<...>['classNamesAndFn']`）。
 */
export type TableClassNames<RecordType = any> =
  | TableSemanticClassNames
  | ((info: TableSemanticInfo<RecordType>) => TableSemanticClassNames)

/**
 * styles：支持对象（静态）或函数 `(info) => 对象`（动态）。
 * 对齐 antd v6 `TableProps.styles`（`GenerateSemantic<...>['stylesAndFn']`）。
 */
export type TableStyles<RecordType = any> =
  | TableSemanticStyles
  | ((info: TableSemanticInfo<RecordType>) => TableSemanticStyles)

/**
 * 粘性表头 + 页面级滚动条（对齐 antd v6 `TableProps.sticky`，
 * 见 `react-component/table/src/hooks/useSticky.ts` + `components/table/style/sticky.ts`）。
 *
 * **语义（区别容器内固定）**：
 *   - **容器内固定**：`scroll.y` → 表头 `position: sticky; top: 0` 相对**表格滚动容器**
 *     （`.dg-fixed-header-scroll`）固定。表格在容器内纵向滚动，表头钉在容器顶部。
 *   - **页面级固定**（sticky prop）：表头 `position: sticky; top: offsetHeader` 相对
 *     **页面 viewport**（`getContainer` 默认 `window`）固定。表格**不在容器内滚动**，而是
 *     页面（document）滚动时表头钉在视口顶部 `offsetHeader` 处（典型：站点 header 高度偏移）。
 *
 * **实现要点（data-grid CSS Grid 一体化渲染下的折中）**：
 *   - antd 把表头拆为独立元素（FixedHolder）放在页面流中 `position: sticky; top: offsetHeader`；
 *     data-grid 用 CSS Grid 一体渲染（表头行 + 数据行同属 `.dg-grid`），无法拆分表头为独立元素。
 *   - data-grid 方案：`sticky` 启用时，`.dg-grid` 外只包一层 `overflow: clip` 视口。clip 会裁剪宽表，
 *     但不创建滚动容器，避免普通 `overflow-x:auto` 拦截 sticky 上下文。表头 grid item
 *     `position: sticky; top: offsetHeader` 相对 viewport 固定（页面纵向滚动时钉在视口顶部）。
 *   - 横向滚动：不让宽表撑宽页面；`StickyScrollBar`（`position: sticky; bottom: offsetScroll`）
 *     维护虚拟 scrollLeft，并用 transform 驱动 grid 横向位移（视觉对齐 antd fake scrollbar）。
 *
 * **取值**：
 *   - `undefined` / `false`：不启用页面级 sticky（所有现有 demo 行为不变，零回归）。
 *   - `true`：启用，`offsetHeader=0`、`offsetScroll=0`、`getContainer=window`。
 *   - 对象 `{ offsetHeader?, offsetScroll?, getContainer? }`：自定义偏移与滚动容器。
 *
 * **与各能力组合**：
 *   - 固定列：表头固定列格同时有横向 sticky（left/right）与纵向 sticky（top: offsetHeader）——
 *     单元素双 sticky 浏览器原生支持（与 corner cell 同款机制）。
 *   - summary fixed：summary cell 已有 `position: sticky; bottom: 0`（相对滚动容器）；
 *     sticky 下页面滚动时 summary 随 grid 滚动（summary fixed 在 grid 内的语义保持，不强行改为页面级）。
 *   - 虚拟 / 容器内固定：与 sticky 互斥（sticky 是页面级，容器内是页面级优先；同时传时 sticky 优先，
 *     因为 sticky 不包 overflow 容器，容器内滚动不生效）。
 *
 * **getContainer 说明**：对齐 antd，允许自定义"判定 sticky 生效的滚动容器"。data-grid 中
 *   `getContainer` 主要用于 StickyScrollBar 的纵向滚动/resize 同步监听；
 *   表头 sticky 本身靠 CSS（无 overflow 祖先 → 相对 viewport），不直接消费 getContainer。
 *   默认 `() => window`。
 *
 * 详见 `docs/design-notes/sticky.md`。
 */
export interface StickyConfig {
  /**
   * 表头相对视口顶部的偏移（px）。典型用于站点 header 遮挡场景（如 antd site header 高 64）。
   * 默认 0。
   */
  offsetHeader?: number
  /**
   * 底部 StickyScrollBar 相对视口底部的偏移（px）。
   * 默认 0。
   */
  offsetScroll?: number
  /**
   * 自定义滚动容器（用于 StickyScrollBar 同步监听）。默认 `() => window`。
   * 返回 `undefined`/`null` 时回退到 `window`。
   */
  getContainer?: () => HTMLElement | Window | undefined
}

/**
 * Table 国际化文案（对齐 antd `components/table/interface.ts:41-63` 的 `TableLocale`，共 18 字段）。
 *
 * 全部 optional；未传的字段回退到内置默认值（与 antd `locale/en_US.ts` 的 Table 段一致——
 * 保持英文默认、与 antd 行为对齐）。FilterDropdown 消费 filterConfirm/filterReset/filterEmptyText/
 * filterSearchPlaceholder/filterCheckAll/filterCheckall；emptyText 由 Table 表体空态消费，使用
 * Table.tsx 合并后的 Table locale（包含 `TableProps.locale` 与 `ConfigProvider locale.Table`）；
 * 其余字段（filterTitle/selectAll/selectNone/selectInvert/selectionAll/sortTitle/expand/collapse/
 * triggerDesc/triggerAsc/cancelSort）为接口完整性保留，供后续任务（如排序 tooltip i18n、选择菜单 i18n）消费。
 *
 * `filterCheckall`（小写 l）是 antd @deprecated 别名，消费处用 `filterCheckall ?? filterCheckAll`
 * （对齐 antd FilterDropdown.tsx:434）。
 */
export interface TableLocale {
  filterTitle?: string
  filterConfirm?: ReactNode
  filterReset?: ReactNode
  filterEmptyText?: ReactNode
  /** @deprecated 请用 `filterCheckAll`（对齐 antd）。 */
  filterCheckall?: ReactNode
  filterCheckAll?: ReactNode
  filterSearchPlaceholder?: string
  emptyText?: ReactNode | (() => ReactNode)
  selectAll?: ReactNode
  selectNone?: ReactNode
  selectInvert?: ReactNode
  selectionAll?: ReactNode
  sortTitle?: string
  expand?: ReactNode
  collapse?: ReactNode
  triggerDesc?: string
  triggerAsc?: string
  cancelSort?: string
}

/**
 * TableLocale 字段默认值（对齐 antd `components/locale/en_US.ts` 的 Table 段）。
 *
 * 未传 locale / 未传某字段时，FilterDropdown 等消费处回退到这里（保持英文默认、与 antd 一致）。
 * 仅暴露 FilterDropdown 实际消费的 5 个字段默认值（filterConfirm/filterReset/filterEmptyText/
 * filterSearchPlaceholder/filterCheckAll）——其余字段消费处落地时按需补。
 */
export const TABLE_LOCALE_DEFAULT = {
  filterConfirm: 'OK',
  filterReset: 'Reset',
  filterEmptyText: 'No filters',
  filterSearchPlaceholder: 'Search in filters',
  filterCheckAll: 'Select all items',
} as const

/**
 * antd `expandable` 接口。
 *
 * **覆盖**：`expandedRowRender`、`expandedRowOffset`、`rowExpandable`、`defaultExpandedRowKeys`、
 *   `expandedRowKeys`（受控）、`onExpand`、`onExpandedRowsChange`、`columnWidth`、
 *   `expandIcon`、`defaultExpandAllRows`、`showExpandColumn`。
 *
 * 与 antd 同名字段同语义，便于直接替换。
 *
 * === grid `0fr↔1fr` 过渡 ===
 *
 * 每个可展开数据行（rowExpandable !== false）在其数据行 track **之后**插入一条"展开内容 track"：
 *   - 收起：track size = `0fr`（track 仍存在，行线号稳定）。
 *   - 展开：track size = `1fr`（grid 自动按展开内容自然高撑开）。
 * `.dg-grid` 上 `transition: grid-template-rows 0.3s ease` 实现 0fr↔1fr 的平滑展开/收起动画
 * （grid-template-rows 是可动画属性，fr 单位可逐项插值）。
 *
 * 展开内容作为 grid item 放在该展开 track（grid-row 指向展开 track，默认 grid-column: 1 / -1 跨整行；
 * 传 expandedRowOffset 时从第 N+1 个叶子列开始）；
 * 展开内容容器设 `overflow: hidden; min-height: 0`，使其在 0fr track 下被裁剪、在 1fr 下自然展开。
 *
 * === 虚拟 × 展开约定 ===
 *
 * 虚拟模式下，`useVirtualList` 仍只按"收起态"约定行高算可视窗口（start/end + paddingTop/paddingBottom）。
 * 展开内容 track 不参与虚拟窗口计算——展开某行会让该行实际 DOM 更高（多了展开 track），
 * 但虚拟窗口范围不变；展开内容溢出渲染（牺牲性能换稳定）。详见 `docs/design-notes/virtualization.md`
 * 的「虚拟 × 展开」节。
 *
 * 详见 `docs/design-notes/expand.md`。
 */
export interface Expandable<RecordType = any> {
  /**
   * 展开行内容渲染器。
   * 返回 null/undefined 的行视为不可展开（不渲染展开图标、不插入展开 track）。
   * 签名对齐 antd：`(record, index, indent, expanded) => ReactNode`。
   * （indent/expanded 固定 0/当前态；树形模式下 indent 才有意义。）
   */
  expandedRowRender?: (
    record: RecordType,
    index: number,
    indent: number,
    expanded: boolean,
  ) => ReactNode
  /**
   * 展开内容起始列偏移（对齐 antd deprecated `expandedRowOffset`）。
   *
   * 传入 N 时，展开内容跳过前 N 个叶子列，从第 N+1 列开始并跨到表尾。
   * antd 已建议改用 `Table.EXPAND_COLUMN` 控制展开列位置；保留该字段用于兼容旧 demo/API。
   */
  expandedRowOffset?: number
  /**
   * 某行是否可展开。返回 false 的行不渲染展开图标（也不插入展开 track）。
   * 缺省视所有行可展开（前提是有 expandedRowRender）。
   */
  rowExpandable?: (record: RecordType) => boolean
  /** 非受控初始展开 keys（仅当 expandedRowKeys 未传时生效）。 */
  defaultExpandedRowKeys?: Array<React.Key>
  /** 受控展开 keys（真理源；调用方在 onExpandedRowsChange 后更新它）。 */
  expandedRowKeys?: Array<React.Key>
  /** 单行展开/收起回调（对齐 antd onExpand）。 */
  onExpand?: (expanded: boolean, record: RecordType) => void
  /** 展开 keys 变化回调（对齐 antd onExpandedRowsChange）。 */
  onExpandedRowsChange?: (expandedKeys: Array<React.Key>) => void
  /** 展开列宽度（缺省 48，对齐 antd tableExpandColumnWidth 默认）。 */
  columnWidth?: number | string
  /** 自定义展开图标（antd ExpandIcon props 子集：expanded + onExpand）。 */
  expandIcon?: (props: { expanded: boolean; onExpand: (record: RecordType, e: React.MouseEvent) => void; record: RecordType }) => ReactNode
  /** 非受控：是否默认展开所有可展开行。与 defaultExpandedRowKeys 互斥（前者优先）。 */
  defaultExpandAllRows?: boolean
  /**
   * 是否显示展开列（默认 true）。
   * false 时不渲染展开图标列——但仍允许通过其它方式（如外部按钮）控制 expandedRowKeys 展开/收起。
   * （对齐 antd showExpandColumn。）
   */
  showExpandColumn?: boolean
  /**
   * 树形数据子字段名（对齐 antd `expandable.childrenColumnName`，默认 `'children'`）。
   * 优先级高于 Table 级 `childrenColumnName`（与 antd `getExpandableProps` 一致）。
   * 详见 `TableProps.childrenColumnName`。
   */
  childrenColumnName?: string
  /**
   * 树形缩进宽度（对齐 antd `expandable.indentSize`，默认 `15`——以 antd 6.4.4 实测为准，
   * 见 `InternalTable.tsx:611`）。
   *
   * 树形模式下，第一列数据单元格按 `level × indentSize` 左缩进（px）。
   */
  indentSize?: number
  /**
   * 行展开：点击行体切换（对齐 antd `expandable.expandRowByClick`，rc-table interface.d.ts:179）。
   *
   * true 时点击**行体**（任意非展开图标的单元格）切换该行展开/收起。
   *
   * 与 `onRow.onClick` **共存**（不互斥）：antd 行为是 expandRowByClick 触发切换的**同时**
   * onRow.onClick 也照常触发——本实现遵循同款语义（在 onRow.onClick 之外叠加切换，不阻止 onRow.onClick）。
   *
   * 仅对该行 `rowExpandable !== false` 的可展开行生效（不可展开行点击无反应，与 antd 一致）。
   *
   * 默认 false（仅展开图标点击切换，行体点击不触发展开——零回归）。
   */
  expandRowByClick?: boolean
  /**
   * 行展开：展开后追加行 className（对齐 antd `expandable.expandedRowClassName`，rc-table interface.d.ts:188）。
   *
   * 行**展开后**额外附加到该行所有单元格的 class（与 `rowClassName` 同款行级 class 注入路径）。
   * 仅在该行 `expanded=true` 时生效（收起时不加）。
   *
   * 签名 `(record, index) => string`，返回值合并到该行 body 单元格 className。
   * 与 `TableProps.rowClassName` 叠加（两者都生效，互不覆盖）。
   */
  expandedRowClassName?: (record: RecordType, index: number) => string
}

/**
 * 展开列占位哨兵（对齐 antd `Table.EXPAND_COLUMN`）。
 *
 * 在 `columns` 数组中插入此哨兵可**控制展开列位置**（不一定首列）。
 * 与 `SELECTION_COLUMN` 类似：哨兵被识别后，适配层把展开列插在该位置而非默认首列。
 *
 * 详见 demo `order-column`。
 */
export const EXPAND_COLUMN = {} as const

/**
 * 选择列占位哨兵（对齐 antd `Table.SELECTION_COLUMN`）。
 *
 * 在 `columns` 数组中插入此哨兵可**控制选择列位置**。
 * 未插入时，若 `rowSelection` 传入，选择列默认插在最前（零回归）。
 * 与 `EXPAND_COLUMN` 类似机制。
 */
export const SELECTION_COLUMN = {} as const

/**
 * 列定义或哨兵（columns 数组可混入 EXPAND_COLUMN / SELECTION_COLUMN 占位对象，
 * 用于控制展开列 / 选择列的位置；对齐 antd `Table.EXPAND_COLUMN` 用法）。
 */
export type ColumnOrSentinel<RecordType = any> = ColumnType<RecordType> | typeof EXPAND_COLUMN | typeof SELECTION_COLUMN

/**
 * JSX 风格 API：`<Table.Column>` 单列声明组件的 props（对齐 antd v6 `ColumnProps`）。
 *
 * **语义**：`<Table.Column>` 是 `columns` prop 的语法糖——它本身**不渲染 DOM**（渲染 null），
 * 仅作为 `<Table>` JSX 子元素声明一列。Table 适配层用 React.Children 遍历 JSX 子元素，
 * 把每个 `<Table.Column>` 的 props（除 children）转换为 ColumnType 对象，等价于传 `columns` prop。
 *
 * props = `ColumnType<RecordType>` 全部字段（title/dataIndex/key/render/width/align/fixed/...）。
 * `children` 字段**禁止**（Column 是叶子列；多级表头用 `<Table.ColumnGroup>`）——与 antd v6
 * `ColumnProps` 一致（`children?: null`）。
 *
 * 用法（与 antd jsx demo 一致）：
 * ```tsx
 * <Table dataSource={data}>
 *   <Table.Column title="Name" dataIndex="name" key="name" />
 *   <Table.Column title="Age" dataIndex="age" key="age" />
 * </Table>
 * ```
 *
 * **与 columns prop 关系**（决策：columns 或 children 二选一）：
 *   - 传 `columns` prop：走 columns 路径（所有现有 demo，零回归）。
 *   - 不传 `columns` prop 但传 JSX children：走 children 解析路径。
 *   - 两者都传：`columns` 优先（JSX children 被忽略；与 antd `columns || convertChildrenToColumns` 一致）。
 */
export interface ColumnProps<RecordType = any> extends Omit<ColumnType<RecordType>, 'children'> {
  /** Column 是叶子列，禁止 children（用 ColumnGroup 表达多级表头）。 */
  children?: null
}

/**
 * JSX 风格 API：`<Table.ColumnGroup>` 分组列声明组件的 props（对齐 antd v6 `ColumnGroupProps`）。
 *
 * **语义**：`<Table.ColumnGroup>` 声明一个**多级表头分组列**（`columns[].children` 的 JSX 等价物）。
 * 其 `children` 是一个或多个 `<Table.Column>`（或嵌套 `<Table.ColumnGroup>`，支持任意深度）。
 * Table 适配层把 ColumnGroup 转换为 `{ title, ...rest, children: [...] }`（复用多级表头渲染）。
 *
 * props：
 *   - `title`：分组列表头文案（与 ColumnType.title 同义）。
 *   - `children`：分组内的列声明（Column / ColumnGroup 的 ReactElement 数组）。
 *   - 其余 ColumnType 字段（key/align/fixed/...）按需透传（与 antd 一致：ColumnGroupProps extends
 *     Omit<ColumnType,'children'>，data-grid 同构）。
 *
 * 用法（与 antd jsx demo 一致）：
 * ```tsx
 * <Table dataSource={data}>
 *   <Table.ColumnGroup title="Name">
 *     <Table.Column title="First Name" dataIndex="firstName" key="firstName" />
 *     <Table.Column title="Last Name" dataIndex="lastName" key="lastName" />
 *   </Table.ColumnGroup>
 * </Table>
 * ```
 *
 * **与多级表头复用**：ColumnGroup 转换出的 `{ title, children: [...] }` 结构与
 * `columns[].children` 嵌套完全一致，直接复用多级表头渲染（引擎无需感知 JSX 来源）。
 */
export interface ColumnGroupProps<RecordType = any> extends Omit<ColumnType<RecordType>, 'children'> {
  /** 分组内的列声明（Column / ColumnGroup 的 ReactElement；可单个或数组，支持任意深度嵌套）。 */
  children:
    | ReactElement<ColumnProps<RecordType>>
    | Array<ReactElement<ColumnProps<RecordType>>>
}

/**
 * onChange extra 参数（对应 antd `TableCurrentDataSource`）。
 * - `currentDataSource`：当前（排序/筛选后）数据源。受控排序下为外部传入的 dataSource。
 * - `action`：触发动作（'sort' / 'filter' / 'paginate'）。
 */
export interface TableCurrentDataSource<RecordType = any> {
  currentDataSource: Array<RecordType>
  action: 'sort' | 'filter' | 'paginate'
}
