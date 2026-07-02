/** data-grid 对外暴露的 antd Table 兼容类型。 */

import type { ReactElement, ReactNode } from 'react'
import type { DropdownProps, SpinProps } from 'antd'
import type { Breakpoint } from 'antd/es/_util/responsiveObserver'
// type-only import，避免运行时循环依赖。
import type { SelectionItem } from './engine/useRowSelection'
export type { SelectionItem }

export type Align = 'start' | 'center' | 'end'

/** 固定列方向输入；布尔值在适配层归一化。 */
export type FixedInput = 'left' | 'right' | 'start' | 'end' | boolean

/** 行选择类型。 */
export type RowSelectionType = 'checkbox' | 'radio'

/** `gridOptions.selection` 的业务选中值类型。建议使用 string/number。 */
export type GridSelectionValue = string | number | boolean | symbol

/** data-grid 原生行选择模式（高于 antd `rowSelection.type` 的语义层）。 */
export type GridSelectionMode = 'disabled' | 'single' | 'multiple' | 'extended'

/**
 * getCheckboxProps 返回的勾选相关 props 子集（antd `CheckboxProps` 子集，
 * 去掉 `checked`/`defaultChecked`——这两个由状态机驱动）。
 */
export interface RowCheckboxProps {
  disabled?: boolean
  /** antd 透传到底层 input 的 name 属性。 */
  name?: string
}

/**
 * 行选择回调用"操作类型"（对齐 antd `RowSelectMethod`，便于调用方区分批量/单次）。
 * - 'all'：多选全选。
 * - 'none'：多选全不选。
 * - 'invert'：反选（状态机已支持，UI 暴露视 selections 配置）。
 * - 'single'：单选（radio 或单次点击 checkbox）。
 * - 'multiple'：多选连续操作（单一勾选也归类为 single）。
 */
export type RowSelectMethod = 'all' | 'none' | 'invert' | 'single' | 'multiple'

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

export interface GridSelectionOptions<RecordType = any> {
  /**
   * data-grid 原生行选择模式。
   *
   * - `disabled`：禁用选择。
   * - `single`：点击替换单选。
   * - `multiple`：点击 toggle 多选。
   * - `extended`：普通点击单选，Ctrl/Meta toggle，Shift 从上一次行点击锚点到当前行连续选择，
   *   Ctrl+Shift 把范围并入现有集合。
   *
   * 未传时：若声明了 `gridOptions.selection`，默认按 `rowSelection.type` 推导（radio→single，
   * 其余→multiple）；未声明 `gridOptions.selection` 时保持现有 antd 兼容层行为。
   */
  selectionMode?: GridSelectionMode
  /**
   * 是否显示选择列 UI。
   *
   * `false` 时不插入选择列，但仍保留行点击选中、受控值驱动和 `dg-row-selected` 视觉。
   */
  showSelectionColumn?: boolean
  /**
   * 业务选中值提取器。
   *
   * 未传时回退到 `rowKey`（推荐仍传稳定业务值，避免依赖可变 index）。
   */
  getSelectionValue?: (record: RecordType, index: number) => GridSelectionValue
  /** 受控业务选中值数组（优先级高于 rowSelection.selectedRowKeys）。 */
  selectedValues?: ReadonlyArray<GridSelectionValue>
  /** 非受控初始业务选中值数组（优先级高于 rowSelection.defaultSelectedRowKeys）。 */
  defaultSelectedValues?: ReadonlyArray<GridSelectionValue>
  /**
   * 业务选中值变化回调。
   * @param selectedValues 新的业务选中值数组。
   * @param selectedRows 新的选中 record 数组（按当前渲染顺序）。
   * @param info 操作类型（'all'/'none'/'invert'/'single'/'multiple'）。
   */
  onSelectedValuesChange?: (
    selectedValues: Array<GridSelectionValue>,
    selectedRows: Array<RecordType>,
    info: { type: RowSelectMethod },
  ) => void
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
 * 自定义组件类型（对齐 antd v6 `TableComponents` 子集）。
 *
 * `components` prop 让调用方替换表格内部默认渲染的元素。data-grid 用 div 渲染（非 table/tr/td），
 * 故 `body.cell` / `body.row` 的语义与 antd 略有适配（见各字段注释）。
 */
export interface TableComponents {
  /**
   * 表头自定义组件（列拖拽会用；当前不消费，仅占位）。
   * - `header.cell`：替换默认表头格（div.dg-cell-header）。
   */
  header?: {
    cell?: React.ComponentType<any>
  }
  /**
   * 表体自定义组件。
   *
   * - `body.row`：替换默认**行容器**。data-grid 用 div 渲染，行容器语义=包裹该行所有单元格的元素。
   *   ★ 与 antd 差异：antd 的 body.row 替换 `<tr>`；data-grid 因 grid 布局行不由单一容器元素包裹
   *   （单元格直接是 grid item），故 body.row 在 data-grid 中实现为：每行渲染一个**包裹层**组件，
   *   其内部再渲染该行的单元格（仍按 grid 定位）。本字段提供时启用包裹层；未提供时维持现有布局
   *   （单元格直接作为 grid item，零回归）。典型用法：EditableRow（包 antd Form + Context.Provider）。
   *
   * - `body.cell`：替换默认**单元格内容**。
   *   ★ 与 antd 差异：antd 的 body.cell 替换整个 `<td>`；data-grid 因无 td（用 div.dg-cell 作 grid item），
   *   故 body.cell 替换的是 dg-cell div **内部的内容**（即 `.dg-cell-inner` 处），返回 ReactNode
   *   （单元格内容），而非整个 td。其余 dg-cell div（grid 定位 / sticky / hover / align）由引擎维持。
   *   签名建议对齐 antd：`(props) => ReactNode`，props 含 `{ children, record, index, dataIndex,
   *   ...onCell返回值 }`（children=默认渲染内容）。典型用法：EditableCell（editing 态 Form.Item+Input /
   *   展示态 div）。
   *
   * onCell 返回值（除 colSpan/rowSpan）整体透传给 body.cell 的 props（与 antd v6 一致）。
   */
  body?: {
    row?: React.ComponentType<any>
    cell?: React.ComponentType<any>
  }
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
 * 非核心控件用 antd `<Pagination>`，不自研。详见 `docs/design-notes/pagination.md`。
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
 *   - data-grid 方案：`sticky` 启用时，`.dg-grid` 外**不包** overflow 容器（避免 overflow 祖先
 *     拦截 sticky 上下文——CSS 规范：`overflow` 非 `visible` 的祖先会成为 sticky 的滚动祖先，
 *     把表头 sticky 限制在容器内，退化为容器内固定）。grid 的 `min-width: scrollX` 让其撑宽，
 *     **页面（document）作为纵向 + 横向滚动源**。表头 grid item `position: sticky; top: offsetHeader`
 *     相对 viewport 固定（页面纵向滚动时钉在视口顶部）。
 *   - 横向滚动：依赖页面原生滚动条（页面横向滚动时表头 sticky 仍保持视口顶部，固定列 sticky left/right
 *     仍保持）。额外渲染一个 `StickyScrollBar`（`position: sticky; bottom: offsetScroll`）作为
 *     "底部固定横向滚动条"——同步页面横向滚动 + 拖动 thumb 驱动页面 scrollTo（视觉对齐 antd fake scrollbar）。
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
 * **getContainer 说明**：对齐 antd，允许自定义"判定 sticky 生效的滚动容器"。data-grid 的简化实现：
 *   `getContainer` 主要用于 StickyScrollBar 的滚动同步监听（监听该容器的 scroll 事件更新 thumb 位置）；
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

export type RowKeyType = string | ((record: any) => string | number)

/**
 * Table 国际化文案（对齐 antd `components/table/interface.ts:41-63` 的 `TableLocale`，共 18 字段）。
 *
 * 全部 optional；未传的字段回退到内置默认值（与 antd `locale/en_US.ts` 的 Table 段一致——
 * 保持英文默认、与 antd 行为对齐）。FilterDropdown 消费 filterConfirm/filterReset/filterEmptyText/
 * filterSearchPlaceholder/filterCheckAll/filterCheckall；emptyText 由 Table 表体空态消费；
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

export interface TableProps<RecordType = any> {
  /**
   * 列默认值（对齐 antd v6 `TableProps.column`，见 `InternalTable.tsx:159`）。
   *
   * **语义**：Table 级列默认属性，作为**所有列**（含 `columns` 与 JSX children 声明的列）
   * 的公共默认值。单列可通过自身同名字段覆盖。
   *
   * **合并方向（列自身优先）**：对每列做浅合并——`column` prop 提供默认值，列自身同名字段覆盖之；
   * 列自身未设置（`undefined`）的字段回退到 `column` 默认。对齐 antd `useFilledColumns`
   * （`components/table/hooks/useFilledColumns.ts`）+ `@rc-component/util` 的 `mergeProps` 语义
   * （后者覆盖前者，但 `undefined` 不覆盖已定义值）。
   *
   * **递归**：多级表头（`column.children`）的每个层级都应用 `column` 默认；`column` 自身的
   * `children` 字段不参与合并（被剔除，避免错误注入分组结构——与 antd 一致）。
   *
   * **哨兵豁免**：`Table.EXPAND_COLUMN` / `Table.SELECTION_COLUMN` 哨兵对象不参与合并（保持引用不变，
   * 适配层后续识别用 `===`，合并会破坏引用相等——对齐 antd `useFilledColumns` 的哨兵豁免分支）。
   *
   * **典型用例**（antd `column-defaults` demo）：`column={{ align: 'center', ellipsis: true }}`
   * 让所有列默认居中 + 省略；单列 `align: 'left'` 覆盖为左对齐。
   *
   * 未提供（undefined）时不做任何合并，所有列保持原样（零回归：现有 demo 无 column prop）。
   */
  column?: Partial<ColumnType<RecordType>>
  /**
   * 列定义数组。可混入 `Table.EXPAND_COLUMN` / `Table.SELECTION_COLUMN` 哨兵
   * （对齐 antd）——哨兵位置即展开列 / 选择列的渲染位置。
   * 不含哨兵时，`rowSelection` 选择列默认插最前，`expandable` 展开列默认插最前（在选择列之后）。
   *
   * **JSX 风格 API 关系**：`columns` 与 JSX children（`<Table.Column>` / `<Table.ColumnGroup>`）
   * 二选一——传 `columns` 走 columns 路径，传 JSX children 走解析路径；两者都传时 `columns` 优先
   * （与 antd `columns || convertChildrenToColumns(children)` 一致）。详见 `ColumnProps`/`ColumnGroupProps`。
   *
   * **列默认值关系**：`column` prop（Table 级默认）会浅合并到本数组的每个列（含哨兵豁免、
   * 多级表头递归合并）；详见 `TableProps.column`。
   */
  columns?: Array<ColumnOrSentinel<RecordType>>
  dataSource?: Array<RecordType>
  rowKey?: RowKeyType
  bordered?: boolean
  size?: SizeType
  showHeader?: boolean
  title?: (currentPageData: Array<RecordType>) => ReactNode
  footer?: (currentPageData: Array<RecordType>) => ReactNode
  /**
   * 滚动配置。
   *
   * - `x`：横向滚动内容最小宽度（number→px，string→原样作 min-width）。
   *   启用横向滚动时额外渲染**横向悬浮滚动条**
   *   （`HorizontalFloatingScrollBar`：细线 2px + hit 上下各 8px + hover 变粗 8px + 拖动/同步），
   *   定位在数据区域底部（summary 上方）。隐藏原生横向滚动条。
   *   详见 `docs/design-notes/scrollbar.md`。
   * - `y`：纵向滚动语义（**仅 `true | undefined`，不支持数字**）。
   *     - `true`：**数据区域模式**——表头固定 + 表体滚动 + 纵向悬浮滚动条（FloatingScrollBar），
   *       **高度 CSS 自动适应**（flex/grid 让表体填满表格可用高度，**不用 JS 算数字**）：
   *         * `.dg-wrapper` 加 `dg-data-area` 类 → `display:flex; flex-direction:column; height:100%`
   *           （父容器需有明确 height，文档说明）。
   *         * 内部 `.dg-scroll-wrap`（FloatingScrollBar 包装）`flex:1; min-height:0` 填满剩余空间，
   *           `.dg-scroll` `flex:1; min-height:0; overflow-y:auto` 表体限高滚动；表头 sticky top 钉顶。
   *     - `undefined`（缺省）：表格整体（无固定表头，内容全展开，无表体滚动区，零回归）。
   *     - **不支持数字**：旧 demo 用 `scroll={{ y: <number> }}` 的语义（max-height=number）已废弃，
   *       迁移到 `true`（CSS 自动适应高度）。
   *
   * ★ 核心点：纯 CSS（flex/grid）让表体填满父容器可用高度，**不用 JS 算数字高度**。
   *   调用方需确保 `.dg-wrapper` 的父容器有明确高度（固定 height / flex / 100vh 等），
   *   否则表体高度退化为内容自然高（视觉等价 undefined，但表头仍按 sticky 定位）。
   *   详见 `docs/design-notes/layout.md`（数据区域模式节）。
   */
  scroll?: { x?: number | string; y?: true }
  /**
   * 虚拟滚动开关。
   * 与 `scroll={{ y: true }}` 组合启用纵向虚拟滚动：只渲染可视区 + overscan 的行，
   * 其余用占位撑总高（保证滚动条正确）。横向滚动（scroll.x）仍走横向 scroll 容器，
   * 与纵向虚拟正交。
   *
   * 行高两条路径：**非虚拟**走约定 `rowHeight` → CSS grid track，不测量（缺省 `'auto'`）；
   * **虚拟**采用 virtuoso 式 ResizeObserver 动态测量（measured-first + 约定 `rowHeight` 兜底，
   * `gridOptions.rowHeight` 默认 56）。data-grid **不实现 antd `measureRowRender` 糟粕兼容 API**
   * （隐藏测量行重渲染），与虚拟路径采用的 RO 测量是两回事。
   * 虚拟窗口按"收起状态"行高算 offset/padding；展开内容直接渲染但不参与窗口大小。
   *
   * 详见 `docs/design-notes/virtualization.md`。
   */
  virtual?: boolean
  /** 预留：透传到底层布局，本引擎仅接收不强制。 */
  tableLayout?: 'auto' | 'fixed'
  /**
   * data-grid 专属 grid 布局选项（有界行高模型 + 列宽拖拽 + 表头行高 + 列/行拖拽配置）。
   *
   * **与 antd 不兼容**：antd `Table` 没有 `rowHeight` / `minRowHeight` / `maxRowHeight` /
   * `headerHeight` / `resizable` 等概念（antd 行高随内容、无原生列宽拖拽），此命名空间仅
   * data-grid 消费。原顶层 `rowHeight`/`headerHeight`/`resizable`/`resizableMinWidth`/
   * `resizableMaxWidth` 全部迁入 `gridOptions`（删顶层、无 alias、无向后兼容）。
   *
   * - `rowHeight`：行高约定（数字 → 固定 px；函数 → 按行返回 px）。默认 56（虚拟）。
   * - `minRowHeight` / `maxRowHeight`：**同时设置**时启用「有界行高模型」——行高随内容
   *   在 [min, max] 区间自适应（body track 用 auto + 行容器 min/max-height 约束），RO 实测
   *   真实高度驱动虚拟窗口 offset/padding。**关键**：固定列/合并单元格/多级表头因仍由统一
   *   grid track 定位，跨可变高行保持像素级对齐（与 auto-track 脱节无关，grid 显式定位）。
   *   仅设其一（缺 min 或 max）→ 退化为固定行高（等同不设）。
   *   详见 `docs/design-notes/row-height.md`。
   * - `headerHeight`：表头行高约定（数字 px 或字符串 CSS track）。多级表头下所有表头行统一高度。
   * - `resizable`：列宽拖拽调整兼容开关。`true` 且未配置 `columnResizeMode` 时等同
   *   `columnResizeMode: 'ResizeLeft'`。默认 `false`（零回归）。
   * - `columnResizeMode`：列宽拖拽模式。`Disabled` 禁用；`ResizeLeft` 只改变分隔线左侧列宽，
   *   表格宽度总和随之变化；`ResizeSibling` 同时改变左右相邻列宽，保持总宽不变。
   *   最后一个可见叶子列右侧不渲染 resizer。
   *   详见 `docs/design-notes/column-width.md`。
   * - `resizableMinWidth` / `resizableMaxWidth`：列宽拖拽 min/max 约束（px）。number → 统一；
   *   函数 → 按列 key 逐列定制。默认 min 30 / max Infinity。
   */
  gridOptions?: {
    rowHeight?: number | ((record: RecordType, index: number) => number)
    minRowHeight?: number
    maxRowHeight?: number
    headerHeight?: number | string
    resizable?: boolean
    columnResizeMode?: 'Disabled' | 'ResizeLeft' | 'ResizeSibling'
    resizableMinWidth?: number | ((key: string) => number)
    resizableMaxWidth?: number | ((key: string) => number)
    /**
     * data-grid 原生行选择配置。
     *
     * 与 antd `rowSelection` 的关系：
     * - `gridOptions.selection` 是 data-grid 原生能力命名空间，优先级高于兼容层。
     * - `rowSelection` 仍保留 antd 兼容 API（renderCell/getCheckboxProps/selections/onChange...）。
     * - 选中真理源优先级：`selectedValues` > `defaultSelectedValues` >
     *   `rowSelection.selectedRowKeys` > `rowSelection.defaultSelectedRowKeys`。
     * - 同时传 `selectedValues` 与 `selectedRowKeys`：UI 以 `selectedValues` 为准；触发时仍尽量同时
     *   调 `onSelectedValuesChange` 与 `rowSelection.onChange`。
     */
    selection?: GridSelectionOptions<RecordType>
    /**
     * 拖拽行/列到容器边缘时自动滚动容器（虚拟列表下尤其关键）。
     *
     * **语义**：拖拽中（行拖 / 列拖）指针接近**滚动容器**（`.dg-scroll`）的边缘时，按距边缘
     * 距离**渐进加速**滚动容器——让用户能持续把行/列拖出可视区到达远处位置（虚拟行拖尤其关键：
     * 现有 hit-test 仅遍历已渲染 cell，拖出可视区不滚动会"卡住"，无法 drop 到远处行）。
     *
     * - `true`（默认，对齐 ag-grid community 默认行为）：拖拽近边缘触发自动滚动。
     * - `false`：禁用，拖拽出可视区不滚动。
     *
     * **实现**（见 `useAutoScrollOnDrag` hook）：
     *   - 边缘阈值 ~100px（参考 ag-grid `SCROLL_MOVE_WIDTH=100`）；阈值内按
     *     `(1 - dist/threshold) * maxSpeed` 渐进加速（`maxSpeed ≈ 15 px/帧`，对齐 ag-grid
     *     `SCROLL_ACCELERATION_RATE=5` × interval 的量级）。
     *   - 行拖 → 纵向滚动；列拖 → 横向滚动（同向滚动，与拖拽方向一致）。
     *   - 用 `requestAnimationFrame` 循环驱动 `scrollContainer.scrollBy(dx, dy)`：
     *     `scroll` 事件会被虚拟引擎（useVirtualList）+ FloatingScrollBar 监听 → 自动重算
     *     已渲染行 + drop 目标 / 指示线位置（拖拽 hook 的 hit-test 每帧重新读 DOM 边界，
     *     滚动后行/列 DOM 位置变化 → hit-test 自动跟随）。
     *
     * **滚动容器定位**：拖拽 hook 的 `containerRef`（外层相对定位 div）不是真正的滚动容器，
     *   实际滚动容器是它内部的 `.dg-scroll`（GridTable 在 scroll.x / scroll.y / virtual / hasFixed
     *   时自包一层）。auto-scroll hook 运行时用 `containerRef.current.querySelector('.dg-scroll')`
     *   定位；找不到（无 scroll 配置的纯表格）则回退到最近的可滚动祖先（offsetParent 链找 overflow:auto/scroll）。
     *
     * **零回归**：仅近边缘（阈值内）触发，中间拖拽不受影响；`false` 完全关闭；默认 true 不破坏
     *   现有拖拽 demo 的常规重排（demo 用例均在可视区内重排，不触及边缘 → 不触发滚动）。
     */
    autoScrollOnDrag?: boolean
    /**
     * 列拖拽换位（列重排）全局开关。
     *
     * **语义（对齐 ag-grid `suppressMovableColumns`，取反；默认 true）**：
     *   - `true` / undefined：允许列拖拽换位（默认行为——所有列头可拖）。
     *   - `false`：**全局禁用列拖拽**（任何列头 pointerdown 都不启动拖；与
     *     `gridColumnOptions.dragColumnLock` 无关——全局关等于总闸）。
     *
     * 单列粒度由 `gridColumnOptions.dragColumnLock` 控制：
     * 某列可发起拖 ⟺ `columnReorder !== false && dragColumnLock === undefined`。
     *
     * **透传**：drag-column-sorting demo 从此 option 透传到 `useColumnDragSort({ reorder: ... })`。
     * 默认 true 保证非该 demo 的其它列拖场景零回归。
     */
    columnReorder?: boolean
    /**
     * 多行成块重排（multi-row reorder）开关。
     *
     * **语义（对齐 ag-grid `rowDragMultiRow`；默认 true）**：
     *   - `true` / undefined：当被拖行属于多选 selection（selection 含 ≥2 行且包含被拖行）时，
     *     把所有选中行作为**一块**移到目标位置（保持选中行之间的相对顺序），而非只移被拖行。
     *   - `false`：始终只移被拖行（即使 selection 含多行，行为与单行重排一致）。
     *
     * **边界**：被拖行未选中 → 只移它（现状）；selection 含被拖行+其它 → 成块移；
     * 目标落在选中块内部 → no-op。单选 / 无 selection 时**零回归**（selection 数 ≤1 时退化为单行重排）。
     *
     * **透传**：drag-multi-row-reorder demo 从此 option 透传到 `useRowDragSort({ multiRowReorder,
     * selectedRowKeys, rowKey })`。
     */
    multiRowReorder?: boolean
  }
  /**
   * 行选择配置。
   *
   * 传入即自动在叶子列最前插入一个选择列（checkbox 或 radio），参与 grid 布局。
   * - 与多级表头 / 固定列 / 虚拟滚动组合：选择列作为首列叶子节点，由引擎统一处理（无需调用方感知）。
   * - `selectedRowKeys` 受控；勾选/全选/单选触发 `onChange(keys, rows, info)`。
   * - `getCheckboxProps(record)` 返回 `{ disabled: true }` 的行不可勾选、不参与全选/半选。
   * - 若 `columns` 中含 `Table.SELECTION_COLUMN` 哨兵，选择列插在该哨兵位置而非默认最前
   *   （对齐 antd order-column demo）。
   *
   * 不传则不渲染选择列（零回归：basic/grouping/fixed/colspan/virtual 行为不变）。
   *
   * 详见 `docs/design-notes/selection.md`。
   */
  rowSelection?: TableRowSelection
  /**
   * 行展开配置。
   *
   * 传入即自动插入一个展开图标列（默认最前；若 `columns` 含 `Table.EXPAND_COLUMN`
   * 哨兵则插在该位置），并在可展开数据行下方插入一条展开内容 track（0fr↔1fr 过渡，
   * 详见 Expandable 注释）。
   *
   * - `expandedRowRender(record, index, indent, expanded)`：展开内容；返回 null/undefined 的行
   *   视为不可展开（不渲染展开图标）。
   * - `rowExpandable(record)` 返回 false 的行图标禁用、不展开。
   * - `expandedRowKeys` 受控 / `defaultExpandedRowKeys` 非受控。
   * - `onExpand` / `onExpandedRowsChange` 回调。
   *
   * 与固定列 / 选择列 / 虚拟滚动组合：展开列作为普通叶子列参与布局，
   * 展开内容 track 不影响虚拟窗口。
   *
   * 不传则不渲染展开列、不插入展开 track（零回归）。
   *
   * 详见 `docs/design-notes/expand.md`。
   */
  expandable?: Expandable<RecordType>
  /**
   * 分页配置。
   *
   * **默认分页对齐 antd**：
   *   - `undefined`：等价 `{}`，默认 `defaultCurrent=1`、`defaultPageSize=10`、
   *     `placement=['bottomEnd']`。
   *   - `false`：关闭分页器，数据全显。
   *   - `TablePaginationConfig` 对象：启用分页（受控/非受控 current/pageSize，total 派生）。
   *
   * 启用后：
   *   - 排序+筛选后的数据源按 `current`/`pageSize` 切片传给引擎渲染（`slice((current-1)*pageSize, current*pageSize)`）。
   *   - 按 `placement`（v6 数组，默认 `['bottomEnd']`）在表格上下渲染 antd `<Pagination>`。
   *   - 翻页/改 pageSize 触发 `onChange(pagination, filters, sorter, { action: 'paginate', currentDataSource })`。
   *
   * 分页器用 antd `<Pagination>`。
   *
   * 详见 `docs/design-notes/pagination.md`。
   */
  pagination?: false | TablePaginationConfig
  /**
   * 加载态（对齐 antd `TableProps.loading`）。
   *
   * **语义**：传入即用 antd `<Spin>` 包裹整个表格内容（含 topPagination / title / 表体 / footer /
   * bottomPagination），显示加载转圈遮罩。典型用于 ajax 远程数据请求中。
   *   - `boolean`：`true` 转圈、`false`（默认）不转。等价 `SpinProps={{ spinning: <bool> }}`。
   *   - `SpinProps` 对象：透传给 antd `<Spin>`（如 `{ spinning: true, delay: 200, tip: 'Loading...' }`）。
   *     此时 `spinning` 字段优先（与 antd 一致：`<Spin spinning={false} {...spinProps}>`）。
   *
   * Spin 用 antd（loading/spin 非表格核心，用 antd）。
   *
   * 不传（默认）→ 不包 Spin，保持现有 demo 行为不变（零回归）。
   *
   * 详见 `docs/design-notes/layout.md`（loading × data-area flex 链修复节）。
   */
  loading?: boolean | SpinProps
  /** 自定义根 className。 */
  className?: string
  /** 自定义根 style。 */
  style?: import('react').CSSProperties
  /**
   * 语义化 classNames（对齐 antd v6 `TableProps.classNames`）。
   *
   * **支持对象（静态）与函数 `(info) => 对象`（动态）两种**：
   *   - 对象：直接作为各部位 className 注入。
   *   - 函数：按 `info.props`（含 size/bordered/virtual/scroll/pagination）求值返回对象，
   *     便于按当前 props 子集动态返回不同样式（如 size='medium' 时返回特定 root/title/header.cell）。
   *
   * 嵌套部位（对齐 antd v6 `_semantic`）：`root` / `section` / `content` / `title` / `footer` /
   * `header.{wrapper,row,cell}` / `body.{wrapper,row,cell}` / `pagination.{root,item}`。
   *
   * 注入点（data-grid DOM）：
   *   - `root` → `.dg-wrapper`（与 `className` 合并）。
   *   - `title` → `.dg-title`。
   *   - `footer` → `.dg-footer`。
   *   - `section` → `.dg-section`（content 外的包装容器，承载滚动/分页等）。
   *   - `content` → `.dg-content`（标题/脚注之间的表格内容区）。
   *   - `header.cell` → `.dg-cell-header`；`header.row` → 表头行；`header.wrapper` → 表头容器。
   *   - `body.cell` → `.dg-cell-body`；`body.row` → 表体行；`body.wrapper` → 表体容器。
   *   - `pagination.root` → `.dg-pagination`；`pagination.item` → 分页单项（透传到 antd Pagination）。
   *
   * 未提供（undefined）时所有部位走默认 className，零回归。
   */
  classNames?: TableClassNames<RecordType>
  /**
   * 语义化 styles（对齐 antd v6 `TableProps.styles`）。结构与 `classNames` 同构，
   * 值为 `CSSProperties`；同样支持对象（静态）与函数 `(info) => 对象`（动态）。
   *
   * 注入点同 `classNames`（合并到对应部位的 inline style）。
   *
   * 未提供（undefined）时所有部位走默认 style，零回归。
   */
  styles?: TableStyles<RecordType>
  /**
   * 排序/筛选/分页变化的统一回调。
   *
   * 对齐 antd `TableProps.onChange(pagination, filters, sorter, extra)`：
   *   - `pagination`：当前实际分页状态 `{ current, pageSize, total }`（注入实际值；
   *     对齐 antd：onChange 的 pagination 始终反映当前分页，无论触发源是 sort/filter/paginate）。
   *     未启用分页（`pagination` 为 undefined/false）时传 `{ current: 1, pageSize: <全量>, total: <长度> }`。
   *   - `filters`：筛选状态。形态 `{ [columnKey/dataIndex]: filteredValue[] | null }`：
   *     * **可筛选列**（有 `filters` + `onFilter`）出现为 key；值为当前激活的筛选值数组（命中任一保留）。
   *     * 无激活筛选的列值为 `null`（对齐 antd：未筛选列在 filters 对象里值为 null）。
   *     * 不可筛选列不出现为 key。
   *   - `sorter`：排序结果。对齐 antd 的"对象/数组"二分语义：
   *     - **0 个激活排序列**：单个对象 `{ column, order: null, field, columnKey }`
   *       （调用方可判 `order == null` 视为"无排序"）。
   *     - **1 个激活排序列**：单个 `SorterResult` 对象 `{ column, order, field, columnKey }`。
   *     - **>=2 个激活排序列（多列排序）**：`SorterResult[]` 数组，按 `sorter.multiple` 升序
   *       （multiple 最小 = 最高优先级在前）。仅含 `order != null` 的列。
   *   - `extra`：`{ currentDataSource, action }`。`action` 取值 `'sort'`（排序）/`'filter'`/
   *     `'paginate'`。`currentDataSource`：
   *     * sort：排序后（受控为传入）数据源。
   *     * filter：**排序+筛选后**数据源（raw → sort → filter；受控为传入）。
   *     * paginate：分页**前**的当前页数据源（即排序+筛选后的全量，不含分页切片——与 antd 一致：
   *       antd onChange 的 currentDataSource 是分页前的全量渲染数据）。
   *
   * 点击排序列表头 / 应用筛选 / 翻页/改 pageSize 时触发。
   */
  onChange?: (
    pagination: TablePaginationState,
    filters: Record<string, Array<FilterValue> | null>,
    sorter: SorterResult<RecordType> | Array<SorterResult<RecordType>>,
    extra: TableCurrentDataSource<RecordType>,
  ) => void
  /**
   * 是否全局显示排序提示 tooltip（对齐 antd `TableProps.showSorterTooltip`）。
   * 单列可由 `column.showSorterTooltip` 覆盖。默认 `true`。
   */
  showSorterTooltip?: boolean | { target?: 'full-header' | 'sorter-icon' }
  /**
   * 树形数据子字段名（对齐 antd `TableProps.childrenColumnName`，默认 `'children'`）。
   *
   * **语义**：dataSource 中每个 record 的 `record[childrenColumnName]` 若为非空数组，
   * 视为该 record 的子行（递归支持任意深度）。
   *   - 检测到任一 record 含此字段（且 `expandable.expandedRowRender` 未提供——树形与展开渲染
   *     自定义内容互斥，antd 中树形优先）→ 进入**树形模式**：
   *       * 数据源被**扁平化**（DFS 遍历 children，按展开状态过滤未展开父行的子孙行）。
   *       * 第一列数据单元格内按 `level × indentSize` 左缩进 + `hasChildren` 行渲染展开/收起图标。
   *       * `rowSelection.checkStrictly=false` 时父子勾选联动。
   *   - 无任何 record 含此字段 → 退化为普通扁平表格（零回归）。
   *
   * 与 `expandable.childrenColumnName` / `expandable.indentSize` 同名字段优先级：
   * `expandable.*` 字段优先（与 antd `getExpandableProps` 一致）；未设时用 Table 级本字段。
   *
   * 默认 `'children'`。
   */
  childrenColumnName?: string
  /**
   * 自定义组件（对齐 antd `TableProps.components`，v6 `TableComponents` 子集）。
   *
   * 替换表格内部默认渲染的元素。详见 `TableComponents` 类型注释。
   *
   * **data-grid div 渲染适配**（关键，与 antd `<table>` 实现不同）：
   *   - `body.cell`：替换 dg-cell div **内部内容**（非整个 td）；返回 ReactNode。
   *   - `body.row`：每行渲染一个包裹层组件（用于 Form/Context 等）；未提供时维持现有 grid 布局。
   *   - `header.cell`：表头格（列拖拽会用；当前占位）。
   *
   * 典型用例：单元格编辑（edit-cell）——传入 `{ body: { row: EditableRow, cell: EditableCell } }，
   * 配合 column.onCell 返回编辑 props（record/editable/dataIndex/handleSave）。
   *
   * 未提供（undefined）时所有渲染走默认路径，保证现有 demo 零回归。
   */
  components?: TableComponents
  /**
   * 本地化文案（对齐 antd `TableProps.locale` 子集）。
   *
   * data-grid 自研文案统一接入 antd `useLocale('Table')`：
   * - `TableProps.locale` 覆盖 `ConfigProvider locale`。
   * - `ConfigProvider locale` 覆盖默认英文。
   * - 已消费：表体 empty、FilterDropdown、自研选择菜单、自研排序 hover title、自研展开按钮 aria。
   *
   * === emptyText 语义（对齐 antd v6 `locale.emptyText`）===
   *
   * - 当 `pagedDataSource` 为空（dataSource 空 或 筛选/分页后无数据）时，表格在表体区域
   *   渲染一个跨所有列（`grid-column: 1 / -1`）的 empty 占位区，内容取 `emptyText`。
   * - `emptyText` 优先级（严格对齐 antd `InternalTable.tsx:706-718` 的 mergedEmptyNode）：
   *     1. `locale.emptyText`（Table 级，最高优先级——antd 同款）。
   *     2. `ConfigProvider.renderEmpty('Table')`（全局表体空状态）。
   *     3. 默认 antd `<Empty>`（无描述）。
   * - **表体 empty 不区分"空数据 vs 筛选无结果"**（对齐 antd InternalTable.tsx:714-717）：
   *   antd 表体 empty 固定用 `locale.emptyText > renderEmpty('Table') > 默认`，两种场景共用。
   *
   *   ★ `'Table.filter'` 是**另一个**独立语义（对齐 antd FilterDropdown.tsx:395,410）：仅用于
   *   **filter 下拉面板内部**当 `column.filters` 为空数组时的占位（默认 Empty SIMPLE +
   *   locale.filterEmptyText），**不是**表体筛选无结果。data-grid 由 FilterDropdown 消费此语义。
   *
   * === antd custom-empty demo 要素 ===
   *
   * - `locale={{ emptyText: <Empty description="No Data">{toggleButton}</Empty> }}`：Table 级
   *   空状态文案（含 toggle 按钮子节点；空数据与筛选无结果共用）。
   * - `<ConfigProvider renderEmpty={renderEmpty}>`：renderEmpty 仅处理 'Table.filter' →
   *   `<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No Filter(Custom)" />`
   *   （filter 下拉内 filters 空时占位）。
   *
   * 不传（默认）→ 用 ConfigProvider.renderEmpty 或默认 antd Empty（零回归：现有 demo 无 locale）。
   */
  locale?: TableLocale
  /**
   * 汇总栏 summary（对齐 antd `TableProps.summary`）。
   *
   * **语义**：渲染在表体底部的总结栏（一行或多行）。典型用法：计算列总计、显示汇总信息。
   *
   * 取值：
   *   - **函数** `(currentPageData) => ReactNode`：接收当前页数据（pagedDataSource——排序+筛选+
   *     分页切片后的数据），返回 summary 内容（通常用 `Table.Summary` / `Table.Summary.Row` /
   *     `Table.Summary.Cell` 组合声明）。
   *   - **ReactNode**：直接作为 summary 内容（不依赖 pageData 计算）。
   *
   * === `Table.Summary` 组件族（对齐 antd v6）===
   *
   * - `Table.Summary`（容器）：`fixed?: boolean`。`fixed: true` 时 summary 区 sticky bottom
   *   （配合 `scroll.y`，表体滚动时 summary 固定在底部）。
   * - `Table.Summary.Row`（行）：分组语法糖，可含多个 Cell。
   * - `Table.Summary.Cell`（单元格）：
   *     * `index?: number`：列索引（0-based，对应叶子列序号）。决定该 cell 在 grid 中的横向位置。
   *     * `colSpan?: number`：跨列数（默认 1）。
   *     * `align?: 'start' | 'center' | 'end'`：对齐方式。
   *     * `children`：单元格内容（任意 ReactNode，如 `<Text type="danger">{total}</Text>`）。
   *
   * === data-grid 实现（与 antd 差异）===
   *
   * - antd summary 是 `<tfoot><tr><td colspan>`；data-grid 是 div + CSS Grid（无 tfoot）。
   * - summary Cell 作为 grid item 渲染在 grid 末尾的 summary 区，按 `index` + `colSpan` 定位
   *   （`gridColumn: <index+1> / span <colSpan>`，`gridRow` 由引擎按行序号注入）。
   * - `fixed` sticky bottom：summary cell 加 `position: sticky; bottom: 0`，与表体共享滚动容器。
   * - 功能等价：summary 在表体底部，Cell 按 index+colSpan 定位，fixed sticky bottom。
   *
   * **pageData 入参差异**（与 antd）：
   *   - data-grid：函数收到 **pagedDataSource**（当前页数据——排序+筛选+分页切片后），
   *     与 title/footer 收到 filteredDataSource（全量）不同。对齐 antd `summary` 实际行为
   *     （antd summary 的 pageData 也是当前页数据）。
   *   - 若未启用分页，pagedDataSource = filteredDataSource（全量），与 antd 不分页时一致。
   *
   * 未提供（undefined）时不渲染 summary 区（零回归：现有 demo 无 summary 行）。
   */
  summary?: ((currentPageData: Array<RecordType>) => ReactNode) | ReactNode
  /**
   * JSX 风格 API：`<Table>` 的 JSX 子元素声明列（对齐 antd `<Table><Column/></Table>`）。
   *
   * **语义**：当**未传 `columns` prop** 时，Table 适配层用 React.Children 遍历 JSX 子元素，
   * 识别 `<Table.Column>`（→ ColumnType）与 `<Table.ColumnGroup>`（→ `{ title, children: [...] }`
   * 嵌套，复用多级表头），生成 columns 数组（等价于传 `columns` prop）。
   *
   * **columns 或 children 二选一**（与 antd `columns || convertChildrenToColumns(children)` 一致）：
   *   - 传 `columns` prop：走 columns 路径（所有现有 demo，零回归），JSX children 被忽略。
   *   - 不传 `columns` prop 但传 JSX children：走解析路径。
   *   - 两者都未传：空表（无列）。
   *
   * 详见 `ColumnProps` / `ColumnGroupProps`。
   */
  children?: ReactNode
  /**
   * 粘性表头 + 页面级滚动条（对齐 antd v6 `TableProps.sticky`）。
   *
   * **语义（区别容器内固定）**：表头跟随**页面**滚动固定（`position: sticky; top: offsetHeader`
   * 相对 `getContainer` 默认 `window`），而非容器内固定（`scroll.y` 表体限高滚动）。
   * 详见 `StickyConfig` 注释。
   *
   * **取值**：
   *   - `undefined` / `false`：不启用（所有现有 demo 行为不变，零回归）。
   *   - `true`：启用（默认偏移 0）。
   *   - 对象 `{ offsetHeader?, offsetScroll?, getContainer? }`：自定义。
   *
   * **与容器内固定互斥语义**：同时传 `sticky` 与 `scroll.y` 时，`sticky` 优先（页面级固定），
   * `scroll.y` 的容器内固定表头不生效（data-grid 简化：不为同表同时支持两种固定模式）。
   *
   * 未提供（undefined）时不启用，零回归。
   *
   * 详见 `docs/design-notes/sticky.md`。
   */
  sticky?: boolean | StickyConfig
  /**
   * 表头**行** props 注入（对齐 antd v6 `TableProps.onHeaderRow`）。
   *
   * 表头**行** props 注入。签名 `(columns, index) => React.HTMLAttributes`：
   *   - `columns`：该表头行涉及的列（单层表头 = 全部 columns；多级表头 = 该层的分组列集合）。
   *   - `index`：表头行号（单层表头恒 0；多级表头 0=顶层分组, maxDepth-1=叶子层）。
   *   - 返回值整体作为该表头**行**的 HTML 属性（onClick/onDoubleClick/.../className/style）。
   *
   * ★ data-grid grid 布局适配：grid 渲染下表头**无独立 `<tr>`**——表头格直接是 grid item。
   *   故 onHeaderRow 返回值透传到该表头行**所有表头格**（与 header.row 语义化 class 同款行级透传）：
   *     * 事件类（onClick/onMouseEnter/...）：挂到每个表头格 div（点击任一表头格即触发，行为等价"点击表头行"）。
   *     * className：合并到每个表头格的 className（行级 class 标记）。
   *     * style：合并到每个表头格的 inline style（行级 style 标记）。
   *
   * 典型用法（对齐 antd 文档 onRow 用法）：
   * ```tsx
   * <Table onHeaderRow={(columns, index) => ({ onClick: () => {...} })} />
   * ```
   *
   * 未提供（undefined）时不注入（零回归）。
   */
  onHeaderRow?: (
    columns: Array<ColumnType<RecordType>>,
    index: number,
  ) => import('react').HTMLAttributes<HTMLElement> | undefined
  /**
   * 表体**行** props 注入（对齐 antd v6 `TableProps.onRow`）。
   *
   * 表体**行** props 注入。签名 `(record, index) => React.HTMLAttributes`：
   *   - `record`：该行数据。
   *   - `index`：该行在 dataSource 中的索引。
   *   - 返回值整体作为该表体**行**的 HTML 属性（onClick/onDoubleClick/onContextMenu/onMouseEnter/onMouseLeave/...）。
   *
   * ★ data-grid grid 布局适配：grid 渲染下表体**无独立 `<tr>`**——单元格直接是 grid item。
   *   故 onRow 返回值透传到该行**所有数据单元格**（与 body.row 语义化 class 同款行级透传）：
   *     * 事件类（onClick/onMouseEnter/...）：挂到该行每个单元格 div（点击该行任一单元格即触发，行为等价"点击该行"）。
   *       * ★ 与内置 hover 区分：onRow.onMouseEnter/onMouseLeave 会**覆盖**引擎内置 hover
   *         （引擎用 onMouseEnter/onMouseLeave 驱动 dg-row-hover 行高亮）；用户在 onRow 里
   *         返回 onMouseEnter/onMouseLeave 时内置 hover 失效。若需同时保留 hover，请在自定义
   *         handler 内自行加 dg-row-hover 视觉（或用 rowHoverable=false 关闭内置 hover 避免冲突）。
   *     * className：合并到该行每个单元格的 className（行级 class 标记）。
   *     * style：合并到该行每个单元格的 inline style（行级 style 标记）。
   *
   * 典型用法（对齐 antd 文档 onRow 用法）：
   * ```tsx
   * <Table onRow={(record, rowIndex) => ({
   *   onClick: (event) => {},
   *   onDoubleClick: (event) => {},
   *   onContextMenu: (event) => {},
   *   onMouseEnter: (event) => {},
   *   onMouseLeave: (event) => {},
   * })} />
   * ```
   *
   * **与 components.body.row 关系**：两者正交——components.body.row 提供包裹层组件
   * （Form/Context），onRow 提供事件 props。可同时使用（onRow props 在无 body.row 时透传到单元格；
   * 有 body.row 时 onRow 不自动透传到 body.row 组件——body.row 是用户自定义组件，应由用户自行
   * 处理事件；data-grid 保持简单：onRow 仅透传到单元格 props）。
   *
   * 未提供（undefined）时不注入（零回归）。
   */
  onRow?: (
    record: RecordType,
    index: number,
  ) => import('react').HTMLAttributes<HTMLElement> | undefined
  /**
   * 表体行的 className（对齐 antd v6 `TableProps.rowClassName`）。
   *
   * 表体行的 className。取值：
   *   - 字符串：所有行加该 class（统一行样式）。
   *   - 函数 `(record, index) => string`：按行返回 class（典型用法：编辑态行 `editable-row`、
   *     奇偶行条纹、特殊行高亮等）。
   *
   * ★ data-grid grid 布局适配：grid 渲染下表体**无独立 `<tr>`**——单元格直接是 grid item。
   *   故 rowClassName 透传到该行**所有数据单元格**的 className（与 body.row 语义化 class 同款
   *   行级透传——同一行的每个单元格都带这个 class）。
   *
   * **典型用法**（antd edit-cell demo）：`rowClassName={() => 'editable-row'}`——编辑态行视觉。
   *
   * **与 antd 选中态 class 关系**：antd 在 `selectedRowKeys` 命中的行自动加 `ant-table-row-selected`
   *   class（InternalTable.tsx:584-591）。data-grid 的选中态视觉由 `dg-row-selected` 类驱动
   *   （详见 `docs/design-notes/selection.md`），rowClassName 是用户自定义层，与之正交。
   *
   * 未提供（undefined）时不注入（零回归）。
   */
  rowClassName?: string | ((record: RecordType, index: number) => string)
  /**
   * dropdown 挂载容器（对齐 antd v6 `TableProps.getPopupContainer`）。
   *
   * 表格内 dropdown（筛选下拉等）的挂载容器。签名 `(triggerNode) => HTMLElement`：
   *   - `triggerNode`：触发 dropdown 的 DOM 节点（如筛选漏斗 trigger span）。
   *   - 返回值：dropdown 弹出层的挂载父节点（默认 antd Dropdown 默认行为 = document.body）。
   *
   * **生效范围**：本字段作为**筛选下拉**（FilterDropdown 内 antd Dropdown）的默认 getPopupContainer。
   *   - 列级 `column.filterDropdownProps.getPopupContainer` 优先（覆盖 Table 级）。
   *   - Table 级 `getPopupContainer` 作为列级未指定时的默认值。
   *
   * 典型用法：在滚动容器 / modal / drawer 内嵌入表格时，让 dropdown 跟随滚动而非固定到 body：
   * ```tsx
   * <Table getPopupContainer={(trigger) => trigger.parentElement as HTMLElement} />
   * ```
   *
   * 未提供（undefined）时 antd Dropdown 走默认（document.body 挂载），与现有 demo 一致（零回归）。
   */
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement
  /**
   * 行是否可 hover 高亮（对齐 antd v6 `TableProps.rowHoverable`，since 5.16.0）。
   *
   * 行是否可 hover 高亮。默认 `true`。
   *   - `true`（默认）：鼠标 hover 某行时该行单元格加 `dg-row-hover` 类（行高亮视觉）。
   *   - `false`：关闭 hover 高亮（单元格不加 dg-row-hover；hover 视觉消失）。
   *
   * **与 onRow.onMouseEnter/Leave 关系**：rowHoverable=false 仅关闭内置 hover 视觉；
   *   若 onRow 返回了 onMouseEnter/Leave，用户自定义 handler 仍生效（事件本身不因 rowHoverable 关闭）。
   *
   * 未提供（undefined）时默认 true（保持现有所有 demo 的 hover 行为不变，零回归）。
   */
  rowHoverable?: boolean
  /**
   * ref 句柄（scrollTo API）。与 antd `Table ref.scrollTo` 接口对齐：
   *   - `scrollTo({ index })`：滚到第 index 行顶部对齐。
   *   - `scrollTo({ key })`：滚到 rowKey === key 的行（调用方传 React.Key）。
   *   - `scrollTo({ scrollTop })`：直接滚到指定 scrollTop（与 antd `top` 等价的扩展别名）。
   *   - `scrollTo({ offset, align })`：在目标行顶部对齐后额外偏移；align 控制对齐方式。
   *
   * 仅在 `virtual` 模式下生效；非虚拟模式调用为 no-op（不影响普通表格）。
   */
  ref?: React.Ref<TableRef>
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

/**
 * Table ref 句柄。
 *
 * 虚拟滚动相关 API + nativeElement。
 */
export interface TableRef {
  /**
   * 滚动到目标位置。与 antd `Table ref.scrollTo` 兼容，额外支持 `scrollTop` 别名。
   *
   * - `index` / `key` / `scrollTop`（或 antd 同名 `top`）三选一：
   *     - `index: number`：滚到第 index 行。
   *     - `key: React.Key`：滚到 rowKey === key 的行（自动解析为 index）。
   *     - `scrollTop: number` / `top: number`：直接滚到指定 scrollTop。
   * - `offset`：目标行顶部对齐后再额外偏移（向下为正）。
   * - `align`：'start'（默认）| 'center' | 'end' | 'nearest'。虚拟模式下不支持 'center' 时
   *   退化为 'start'（与 antd 行为一致）。'nearest'：目标行已完全在可视区时**不滚动**（不跳），
   *   仅当上方不可见→按 start、下方不可见→按 end（对齐 react-virtuoso scrollIntoViewSystem）。
   * - `behavior`：'auto'（默认，瞬时）| 'smooth'（原生平滑动画到位）。**data-grid 专属**
   *   （antd 无此字段）；smooth 下内部启用到达检测（scrollTop≈target/触边界/1000ms fallback）。
   *
   * 详见 `docs/design-notes/virtualization.md`。
   */
  scrollTo: (config: {
    index?: number
    key?: import('react').Key
    scrollTop?: number
    /** antd 同名字段（与 `scrollTop` 等价别名）。 */
    top?: number
    offset?: number
    align?: 'start' | 'center' | 'end' | 'nearest'
    /** data-grid 专属：平滑滚动行为。 */
    behavior?: 'auto' | 'smooth'
  }) => void
  /** 最外层根 DOM 节点。 */
  nativeElement?: HTMLDivElement | null
}
