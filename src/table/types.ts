/**
 * data-grid 对外 antd Table 兼容接口（F2 第一步：demo 子集）。
 *
 * 覆盖 demo 实际用到的 props 子集：
 *   dataSource、columns（含 dataIndex/title/render/width/align/fixed/ellipsis）、
 *   rowKey、bordered、size、showHeader、title/footer、tableLayout。
 *
 * 全 API 补齐（components/onHeaderRow/onRow/rowClassName/getPopupContainer 等）留到
 * 决策 3 第二步。
 *
 * 类型尽量与 antd `TableProps` 子集保持同名同语义，便于直接替换。
 */

import type { ReactNode } from 'react'

export type Align = 'start' | 'center' | 'end'

/** antd 接受 'left'/'right'，内部归一化为 'start'/'end'。 */
export type FixedInput = 'left' | 'right' | 'start' | 'end'

/**
 * 行选择类型（M5）：'checkbox'（多选）/ 'radio'（单选）。
 * 对齐 antd `RowSelectionType`。
 */
export type RowSelectionType = 'checkbox' | 'radio'

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
 * - 'invert'：反选（本阶段未在 UI 暴露，状态机已支持）。
 * - 'single'：单选（radio 或单次点击 checkbox）。
 * - 'multiple'：多选连续操作（本阶段单一勾选也归类为 single）。
 */
export type RowSelectMethod = 'all' | 'none' | 'invert' | 'single' | 'multiple'

/**
 * 单个筛选项（对齐 antd `ColumnFilterItem`）。
 *
 * S3 仅消费顶层项（不实现 `children` 子菜单——属 S7 树形筛选）：
 *   - `text`：筛选项展示文案（任意 ReactNode）。
 *   - `value`：筛选项取值（string/number；用于 `onFilter` 第一个参数 + onChange 的 filters 形态）。
 *
 * antd 还支持 `children: ColumnFilterItem[]`（子菜单筛选，对应 S7 `filterMode='tree'`）；
 * 本阶段保留字段但**不消费**（出现时会被 `flattenKeys` 扁平化为单个筛选项列表参与勾选；
 * 行为与 antd 默认 menu 模式下的二级菜单相近，但本阶段不做二级菜单 UI——属 S7 任务）。
 */
export interface ColumnFilterItem {
  /** 筛选项展示文案。 */
  text: ReactNode
  /** 筛选项取值（string / number；将作为 onFilter 第一参、onChange filters 数组元素）。 */
  value: string | number
  /**
   * 子筛选项（S7 树形筛选，本阶段保留字段但不消费 UI——出现时内部扁平化为普通项参与勾选）。
   */
  children?: Array<ColumnFilterItem>
}

/**
 * antd `rowSelection` 接口子集（M5 第一步覆盖 demo 用到的字段）。
 *
 * **覆盖**：`type`、`selectedRowKeys`（受控）、`defaultSelectedRowKeys`、
 *   `onChange(keys, rows, info)`、`getCheckboxProps`、`columnWidth`、`fixed`、`hideSelectAll`。
 *
 * **未覆盖**（后续任务 S8/S9 落地）：`selections`（自定义选择项菜单）、`onSelect*` 系列、
 *   `checkStrictly`（树形父子联动）、`columnTitle`、`renderCell`、`onCell`、
 *   `preserveSelectedRowKeys`（跨页保留，S12）。
 *
 * 与 antd 同名字段保持同语义，便于直接替换。
 */
export interface TableRowSelection<RecordType = any> {
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
  /**
   * 返回某 record 的勾选相关 props（antd 签名）。
   * `disabled: true` 的行不可勾选、不参与全选/半选。
   */
  getCheckboxProps?: (record: RecordType) => RowCheckboxProps | undefined
  /** 选择列宽度（number→px，string→原样）。缺省走 token `--ant-selection-column-width`。 */
  columnWidth?: number | string
  /**
   * 选择列固定方向。antd 接受 'left'/'right'/'start'/'end'，内部归一化。
   * 与 M2 固定列组合（选择列作为首列固定 start）。
   */
  fixed?: FixedInput
  /**
   * 隐藏表头全选框（仅 checkbox 有意义；antd 行为：true 时表头格不渲染全选 checkbox）。
   * radio 模式下表头本就空，此字段无效。
   */
  hideSelectAll?: boolean
  /** 选择列对齐（默认 'center'，与 antd 一致）。 */
  align?: Align
}

/**
 * 排序方向（S1）。
 * 对齐 antd `SortOrder`：'ascend'（升序）/ 'descend'（降序）/ null（未排序）。
 */
export type SortOrder = 'ascend' | 'descend' | null

/**
 * 排序比较函数（S1）。
 * 对齐 antd `CompareFn<RecordType>`：`(a, b, sortOrder?) => number`。
 * 返回值语义与 `Array.prototype.sort` 一致（<0 a 在前，>0 a 在后，=0 不变）。
 */
export type CompareFn<RecordType = any> = (
  a: RecordType,
  b: RecordType,
  sortOrder?: SortOrder,
) => number

/**
 * 排序器配置（S1）。
 * - `boolean`：true 表示用默认比较（按 `dataIndex` 字段值升序），false/undefined 不排序。
 * - 函数：自定义比较（`(a, b, sortOrder?) => number`）。
 * - 对象 `{ compare, multiple }`：S2 多列排序用（multiple 为优先级数字）；S1 只消费 `compare`。
 */
export type ColumnSorter<RecordType = any> =
  | boolean
  | CompareFn<RecordType>
  | { compare?: CompareFn<RecordType>; multiple?: number }

/**
 * 点击表头切换排序的循环顺序（S1）。
 * 默认 `['ascend', 'descend']`；末尾隐式 `null`（取消排序）回退。
 * 对齐 antd `sortDirections`：值为 `'ascend'`/`'descend'`（不含 null，null 是循环到末尾的隐式回退）。
 */
export type SortDirections = Array<'ascend' | 'descend'>

/**
 * 单列排序结果（S1，对应 antd `SorterResult`）。
 * - `column`：触发排序的列定义（原 antd column 对象）。
 * - `order`：当前排序方向（'ascend'/'descend'/null）。
 * - `field`：排序字段（取自 `column.dataIndex`）。
 * - `columnKey`：排序标识（取自 `column.key`，无 key 时退化为 `column.dataIndex`）。
 */
export interface SorterResult<RecordType = any> {
  column?: ColumnType<RecordType>
  order?: SortOrder
  field?: string | number | Array<string | number>
  columnKey?: string | number
}

/**
 * antd column 子集（demo 用到的）。
 * `dataIndex` 支持字符串/数字/路径数组（与 antd 一致）。
 */
export interface ColumnType<RecordType = any> {
  key?: string | number
  title?: ReactNode
  dataIndex?: string | number | Array<string | number>
  width?: number | string
  align?: Align
  fixed?: FixedInput
  ellipsis?: boolean
  /**
   * 隐藏该列（M6）。
   *
   * **语义（对齐 antd `column.hidden`）**：
   *   - `true`：该叶子列不渲染其单元格/表头格的可视内容——实现采用 **grid track `0fr`**
   *     方案（参考 lun 思路），即把该叶子列对应的 `grid-template-columns` 一条 track 置为
   *     `0fr`（track 仍存在，列线号不变），单元格内容用 `visibility:hidden` +
   *     `overflow:hidden` 隐藏；`.dg-grid` 上 `transition: grid-template-columns`
   *     实现 `0fr↔1fr` 平滑过渡（lun 同款思路）。
   *   - `false` / undefined：正常渲染。
   *
   * **关键设计：track 数保持不变**。隐藏列**不删除**其 grid track，只把 track 大小置为 `0fr`，
   * 这样：
   *   - M1 多级表头：父分组表头格的 `grid-column` 范围（由叶子线号决定）不变，隐藏子叶子时
   *     父分组格因其中一条子 track 为 `0fr` 而自动横向收缩，视觉上"跨列范围相应收缩"，
   *     且表头线号不跳变。
   *   - M2 固定列：sticky 偏移按叶子列宽累加；隐藏列宽度为 0（ResizeObserver 实测），
   *     自动从累加中"消失"，固定列偏移仍然正确。
   *   - M3 合并：合并格 `grid-column: span N` 仍跨原叶子区间，区间内隐藏列 track 为 0，
   *     合并格视觉宽度相应收缩。
   *   - M4 虚拟：列 track 与行 track 正交，虚拟不受影响。
   *   - M5 选择列：作为普通叶子列参与，可同样被 hidden（虽然业务上罕见）。
   *
   * 分组列（有 `children`）的 `hidden` 字段**无效**——只有叶子列的 `hidden` 生效（与 antd 一致：
   * 多级表头隐藏通过隐藏子叶子实现，父分组格随之收缩）。
   */
  hidden?: boolean
  /** antd render 子集：(text, record, index) => ReactNode。 */
  render?: (text: any, record: RecordType, index: number) => ReactNode
  /**
   * 子列（M1 多级表头，任意深度）。
   * 有 children 时该列视为分组列（仅取 key/title/align/fixed）；
   * 叶子列属性（dataIndex/width/render）仅取自无 children 的节点。
   */
  children?: Array<ColumnType<RecordType>>
  /**
   * 表头格横向跨列数（M3）。
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
   */
  colSpan?: number
  /**
   * 行语义（M3，仅影响 a11y/视觉占位，不影响布局）。
   * antd `rowScope: 'row'` 表示该列是"行标题列"（first column 常用，视觉上加粗）。
   * data-grid 将其渲染为 `<th scope="row">` 语义；非 rowScope 列保持普通单元格。
   * 本字段不影响合并算法。
   */
  rowScope?: 'row'
  /**
   * 单元格合并入口（M3）。
   *
   * antd column.onCell 签名：`(record, index) => { colSpan?, rowSpan?, ... }`。
   * data-grid 消费其中的 `colSpan` / `rowSpan`：
   *   - `colSpan: N`（N>=2）：当前数据行该格向右合并 N 个叶子列（含自身）。
   *     紧随其后的 `N-1` 个叶子列在该行的单元格必须由它们各自的 onCell 返回 `colSpan: 0`（被覆盖，不渲染）。
   *   - `rowSpan: N`（N>=2）：当前格向下合并 N 行（含自身）。被覆盖行的同列格由其 onCell 返回 `rowSpan: 0`。
   *   - `colSpan: 0` 或 `rowSpan: 0`：该格被覆盖，**不渲染**（避免占位错乱）。
   *   - 不设/1：普通单格。
   *
   * `onCell` 返回值中的其它字段（如 className/onClick/style）由后续任务（S15 编辑单元格 /
   * components.body.cell）消费，本阶段只取 colSpan/rowSpan。
   */
  onCell?: (record: RecordType, index: number) => { colSpan?: number; rowSpan?: number } | undefined
  /**
   * 排序器（S1）。
   *
   * **语义（对齐 antd `column.sorter`）**：
   *   - `true`：该列可排序，用默认比较（按 `dataIndex` 字段值升序，数值/字符串通用）。
   *   - 函数 `(a, b, sortOrder?) => number`：自定义比较；返回值同 `Array.prototype.sort`。
   *   - `false` / undefined：该列不可排序（表头无排序图标、不响应排序点击）。
   *   - 对象 `{ compare, multiple }`：S2 多列排序；S1 仅消费 `compare`（忽略 `multiple`）。
   *
   * **前端排序**（非受控）：引擎按当前 `sortOrder` + `sorter` 对 dataSource 排序后渲染；
   * **受控排序**（外部传 `sortOrder`）：引擎不主动排序，调用方在 onChange 后自行更新 dataSource；
   *   引擎仍按 `sortOrder` 显示排序图标、触发 onChange。
   *
   * 与各能力组合：排序只改变数据行顺序，不改变列结构（M1 多级表头/M2 固定列/M3 合并/
   * M4 虚拟/M5 选择/M9 展开均不受影响）。
   */
  sorter?: ColumnSorter<RecordType>
  /**
   * 受控排序方向（S1）。传入即受控（引擎不主动排序，调用方负责 dataSource）。
   * 与 `defaultSortOrder` 互斥：`sortOrder` 优先。
   */
  sortOrder?: SortOrder
  /** 非受控初始排序方向（S1）。仅当 `sortOrder` 未传时生效（初始态）。 */
  defaultSortOrder?: SortOrder
  /**
   * 点击表头切换排序的循环顺序（S1）。
   * 默认 `['ascend', 'descend']`；循环到末尾后隐式回退到 `null`（取消排序）。
   * 对齐 antd：值数组不含 `null`，`null` 是循环到末尾的隐式回退。
   * 例：`['descend']` → 初次点击 descend → 再点 null（取消）。
   */
  sortDirections?: SortDirections
  /**
   * 是否显示排序提示 tooltip（S1，非阻塞）。
   * hover 排序列表头时显示"点击排序"提示。
   * - `true`（默认）：显示。
   * - `false`：不显示。
   * - 对象 `{ target: 'full-header' | 'sorter-icon' }`：控制 tooltip 绑定目标
   *   （`full-header` 整表头格，`sorter-icon` 仅图标）。S1 简化为始终绑定到图标区域。
   */
  showSorterTooltip?: boolean | { target?: 'full-header' | 'sorter-icon' }
  /**
   * 筛选项列表（S3，对齐 antd `column.filters`）。
   *
   * **语义**：数组非空 + 配 `onFilter` 时该列表头渲染筛选漏斗图标，点击弹出筛选下拉。
   *   - 顶层项作为勾选项参与筛选（`text` 显示，`value` 作为 onFilter 第一参 + onChange filters 数组元素）。
   *   - `children`（S7 树形筛选）本阶段保留字段但**不做二级菜单 UI**——出现时内部扁平化为顶层项参与勾选
   *     （行为与 antd 默认 menu 模式下的扁平化相近，但本阶段不渲染二级菜单 UI；属 S7 任务）。
   *
   * 与 `onFilter` 配合：onFilter(value, record) 决定该 value 是否"命中" record；
   * 多选时命中任一即保留该 record（OR 语义）；单选时只保留命中该 value 的 record。
   */
  filters?: Array<ColumnFilterItem>
  /**
   * 筛选判定函数（S3，对齐 antd `column.onFilter`）。
   *
   * 签名 `(value, record) => boolean`：返回 true 表示该 value 命中该 record。
   * 与 `filters` 配合：当前选中值集合中**任一**命中即保留该 record（OR 语义，对齐 antd）。
   *
   * **前端筛选**（非受控）：引擎按 `filters` + `onFilter` 对 dataSource 过滤后渲染
   * （与排序叠加：antd 顺序 raw → sort → filter，即先排序后过滤）。
   * **受控筛选**（外部传 `filteredValue`）：引擎不主动过滤，调用方在 onChange 后自行更新 dataSource；
   *   引擎仍按 `filteredValue` 显示漏斗激活态、触发 onChange。
   */
  onFilter?: (value: string | number, record: RecordType) => boolean
  /**
   * 是否多选（S3，对齐 antd `column.filterMultiple`，默认 true）。
   * - `true`（默认）：Checkbox.Group 多选，命中任一保留（OR）。
   * - `false`：Radio 单选，仅保留命中该 value 的 record。
   */
  filterMultiple?: boolean
  /**
   * 非受控初始筛选值（S3）。仅当 `filteredValue` 未传时生效（初始态）。
   */
  defaultFilteredValue?: Array<string | number>
  /**
   * 受控筛选值（S3）。传入即受控（引擎不主动过滤，调用方负责 dataSource）。
   * 与 `defaultFilteredValue` 互斥：`filteredValue` 优先。
   *
   * 传 `[]`（空数组）表示"无激活筛选"（受控显式空）；传非空数组表示激活筛选。
   * （注意与 undefined 区分：undefined 表示该列非受控，由内部 state / defaultFilteredValue 驱动。）
   */
  filteredValue?: Array<string | number> | null
  /**
   * 关闭下拉即应用筛选（S3，对齐 antd `column.filterOnClose`，默认 true）。
   *
   * - `true`（默认）：用户关闭下拉（点击外部/ESC/确定按钮）即把当前勾选应用为 filteredValue。
   * - `false`：必须点"确定"按钮才应用；关闭下拉（点外部/ESC）丢弃未确认的勾选（恢复到上次应用值）。
   *
   * 对齐 antd v6 默认行为（filterOnClose=true）。
   */
  filterOnClose?: boolean
}

export type SizeType = 'large' | 'middle' | 'small'

export type RowKeyType = string | ((record: any) => string | number)

/**
 * antd `expandable` 接口（M9 第一步覆盖 demo 子集 + 核心 API）。
 *
 * **覆盖**：`expandedRowRender`、`rowExpandable`、`defaultExpandedRowKeys`、
 *   `expandedRowKeys`（受控）、`onExpand`、`onExpandedRowsChange`、`columnWidth`、
 *   `expandIcon`、`defaultExpandAllRows`、`showExpandColumn`。
 *
 * **未覆盖**（后续任务 S24/S25 落地）：`expandedRowClassName`、`indentSize`（树形）、
 *   `expandRowByClick`、`onExpandedRowsChange` 细节（已提供但与 onExpand 同步触发）、
 *   `childrenColumnName`（树形 S13）。
 *
 * 与 antd 同名字段同语义，便于直接替换。
 *
 * === ★ grid `0fr↔1fr` 过渡（移植自 lun Table.RowExpand 思路，纯 React 重写）===
 *
 * 每个可展开数据行（rowExpandable !== false）在其数据行 track **之后**插入一条"展开内容 track"：
 *   - 收起：track size = `0fr`（track 仍存在，行线号稳定）。
 *   - 展开：track size = `1fr`（grid 自动按展开内容自然高撑开）。
 * `.dg-grid` 上 `transition: grid-template-rows 0.3s ease` 实现 0fr↔1fr 的平滑展开/收起动画
 * （grid-template-rows 是可动画属性，fr 单位可逐项插值——lun 同款思路）。
 *
 * 展开内容作为 grid item 放在该展开 track（grid-row 指向展开 track，grid-column: 1 / -1 跨整行）；
 * 展开内容容器设 `overflow: hidden; min-height: 0`，使其在 0fr track 下被裁剪、在 1fr 下自然展开。
 *
 * === ★ 决策 2（虚拟 × 展开）约定 ===
 *
 * 虚拟模式下（M4），`useVirtualList` 仍只按"收起态"约定行高算可视窗口（start/end + paddingTop/paddingBottom）。
 * 展开内容 track 不参与虚拟窗口计算——展开某行会让该行实际 DOM 更高（多了展开 track），
 * 但虚拟窗口范围不变；展开内容溢出渲染（牺牲性能换稳定）。详见 `useVirtualList` 决策 2 注释。
 */
export interface Expandable<RecordType = any> {
  /**
   * 展开行内容渲染器。
   * 返回 null/undefined 的行视为不可展开（不渲染展开图标、不插入展开 track）。
   * 签名对齐 antd：`(record, index, indent, expanded) => ReactNode`。
   * （indent/expanded 本阶段固定 0/当前态；树形 S13 落地后 indent 才有意义。）
   */
  expandedRowRender?: (
    record: RecordType,
    index: number,
    indent: number,
    expanded: boolean,
  ) => ReactNode
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
 * 未插入时，若 `rowSelection` 传入，选择列默认插在最前（M5 行为，零回归）。
 * 与 `EXPAND_COLUMN` 类似机制。
 */
export const SELECTION_COLUMN = {} as const

/**
 * 列定义或哨兵（M9：columns 数组可混入 EXPAND_COLUMN / SELECTION_COLUMN 占位对象，
 * 用于控制展开列 / 选择列的位置；对齐 antd `Table.EXPAND_COLUMN` 用法）。
 */
export type ColumnOrSentinel<RecordType = any> = ColumnType<RecordType> | typeof EXPAND_COLUMN | typeof SELECTION_COLUMN

export interface TableProps<RecordType = any> {
  /**
   * 列定义数组。可混入 `Table.EXPAND_COLUMN` / `Table.SELECTION_COLUMN` 哨兵
   * （M9 起支持，对齐 antd）——哨兵位置即展开列 / 选择列的渲染位置。
   * 不含哨兵时，`rowSelection` 选择列默认插最前，`expandable` 展开列默认插最前（在选择列之后）。
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
   * - `x`：横向滚动内容最小宽度（M2 消费；number→px，string→原样作 min-width）。
   * - `y`：纵向可视高度。
   *     - 配合 `virtual` 开启虚拟滚动（M4）：number→px 表体可视区高度，只渲染可视区 + overscan 行。
   *     - 不配合 `virtual`：表头纵向固定（M8 消费）——表体容器 max-height=y 纵向滚动，
   *       表头 `position: sticky; top: 0` 钉顶。
   */
  scroll?: { x?: number | string; y?: number | string }
  /**
   * 虚拟滚动开关（M4）。
   * 与 `scroll={{ y: <number> }}` 组合启用纵向虚拟滚动：只渲染可视区 + overscan 的行，
   * 其余用占位撑总高（保证滚动条正确）。横向滚动（scroll.x）仍走 M2 的 scroll 容器，
   * 与纵向虚拟正交。
   *
   * 行高走约定值（`rowHeight` 数字/函数）；**不实现 measureRowRender / 动态测量**（决策 1）。
   * 虚拟窗口按"收起状态"行高计算（决策 2）；展开内容（M9）将来直接渲染但不参与窗口大小。
   */
  virtual?: boolean
  /** 预留：透传到底层布局，本阶段仅接收不强制。 */
  tableLayout?: 'auto' | 'fixed'
  /** 行高约定（data-grid 扩展，非 antd 公共 API；便于虚拟/固定场景）。 */
  rowHeight?: number | ((record: RecordType, index: number) => number | string)
  /** 表头行高约定。 */
  headerHeight?: number | string
  /**
   * 行选择配置（M5）。
   *
   * 传入即自动在叶子列最前插入一个选择列（checkbox 或 radio），参与 grid 布局。
   * - 与多级表头（M1）/ 固定列（M2）/ 虚拟滚动（M4）组合：选择列作为首列叶子节点，
   *   由引擎统一处理（无需调用方感知）。
   * - `selectedRowKeys` 受控；勾选/全选/单选触发 `onChange(keys, rows, info)`。
   * - `getCheckboxProps(record)` 返回 `{ disabled: true }` 的行不可勾选、不参与全选/半选。
   * - **M9 起**：若 `columns` 中含 `Table.SELECTION_COLUMN` 哨兵，选择列插在该哨兵位置
   *   而非默认最前（对齐 antd order-column demo）。
   *
   * 不传则不渲染选择列（零回归：basic/grouping/fixed/colspan/virtual 行为不变）。
   */
  rowSelection?: TableRowSelection
  /**
   * 行展开配置（M9）。
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
   * 与 M2 固定列 / M5 选择列 / M4 虚拟滚动组合：展开列作为普通叶子列参与布局，
   * 展开内容 track 不影响虚拟窗口（决策 2）。
   *
   * 不传则不渲染展开列、不插入展开 track（零回归）。
   */
  expandable?: Expandable<RecordType>
  /**
   * 列宽拖拽调整开关（M7）。
   *
   * - `true`：在**叶子表头格右侧**渲染 resizer 手柄，pointer 拖拽实时改列宽。
   *   引擎内部维护 `resizedWidths`（用户拖拽后的列宽映射），覆盖 column.width；
   *   首次拖拽 max-content/无 width 列时自动转为受控 px。
   *   最小/最大宽度约束见 `resizableMinWidth`/`resizableMaxWidth`（默认 min 30px）。
   * - `false`（默认）：不渲染手柄，列宽完全由 column.width / max-content 决定（M0–M6 行为，零回归）。
   *
   * **默认 false**（增强能力，需显式开启；保证 basic/grouping/fixed/colspan/virtual/
   * row-selection/hidden-columns 等已通过 demo 无回归）。
   *
   * 组合：
   *   - 多级表头（children）：只有叶子表头格有手柄；分组表头格无手柄。拖拽子叶子时父分组格
   *     自动跟随收缩/展开（线号稳定）。
   *   - 固定列：拖拽改宽后 ResizeObserver 自动重算 sticky 偏移，固定列随之正确。
   *   - 虚拟滚动：拖拽不影响虚拟行渲染窗口（列/行 track 正交）。
   *   - 隐藏列：0fr track 的列不渲染手柄（无可调宽度）。
   *
   * 本阶段为**非受控**（拖拽状态由引擎内部管理）；受控 `column.width`/`onColumnResize`
   * 回调留作后续增强。
   */
  resizable?: boolean
  /**
   * M7 列宽拖拽最小宽度（px）。number → 对所有列统一；函数 → 按列 key 逐列定制。
   * 默认 30（防止拖到 0）。仅在 `resizable` 生效时有意义。
   */
  resizableMinWidth?: number | ((key: string) => number)
  /**
   * M7 列宽拖拽最大宽度（px）。number → 对所有列统一；函数 → 按列 key 逐列定制。
   * 默认 Infinity（不限制过宽）。
   */
  resizableMaxWidth?: number | ((key: string) => number)
  /** 自定义根 className。 */
  className?: string
  /** 自定义根 style。 */
  style?: import('react').CSSProperties
  /**
   * 排序/筛选/分页变化的统一回调（S1 起接入排序部分；S3 起接入筛选部分；分页占位）。
   *
   * 对齐 antd `TableProps.onChange(pagination, filters, sorter, extra)`：
   *   - `pagination`：分页配置（S11 落地，本阶段传占位 `{}`）。
   *   - `filters`：筛选状态（S3 起接入）。形态 `{ [columnKey/dataIndex]: filteredValue[] | null }`：
   *     * **可筛选列**（有 `filters` + `onFilter`）出现为 key；值为当前激活的筛选值数组（命中任一保留）。
   *     * 无激活筛选的列值为 `null`（对齐 antd：未筛选列在 filters 对象里值为 null）。
   *     * 不可筛选列不出现为 key。
   *   - `sorter`：排序结果。对齐 antd 的"对象/数组"二分语义：
   *     - **0 个激活排序列**：单个对象 `{ column, order: null, field, columnKey }`
   *       （data-grid 保留 S1 行为；调用方可判 `order == null` 视为"无排序"）。
   *     - **1 个激活排序列**：单个 `SorterResult` 对象 `{ column, order, field, columnKey }`。
   *     - **>=2 个激活排序列（多列排序 S2）**：`SorterResult[]` 数组，按 `sorter.multiple` 升序
   *       （multiple 最小 = 最高优先级在前）。仅含 `order != null` 的列。
   *   - `extra`：`{ currentDataSource, action }`。`action` 取值 `'sort'`（排序）/`'filter'`(S3)/
   *     `'paginate'`(S11)；本阶段排序触发时 `action: 'sort'`，`currentDataSource` 为排序后（受控为传入）
   *     的数据源。S3 筛选触发时 `action: 'filter'`，`currentDataSource` 为**排序+筛选后**的数据源
   *     （与 antd 一致：raw → sort → filter；受控为传入 dataSource）。
   *
   * 点击排序列表头（或排序图标）/ 应用筛选时触发。
   */
  onChange?: (
    pagination: Record<string, unknown>,
    filters: Record<string, Array<string | number> | null>,
    sorter: SorterResult<RecordType> | Array<SorterResult<RecordType>>,
    extra: TableCurrentDataSource<RecordType>,
  ) => void
  /**
   * 是否全局显示排序提示 tooltip（S1，对齐 antd `TableProps.showSorterTooltip`）。
   * 单列可由 `column.showSorterTooltip` 覆盖。默认 `true`。
   */
  showSorterTooltip?: boolean | { target?: 'full-header' | 'sorter-icon' }
  /**
   * ref 句柄（M4 scrollTo API）。与 antd `Table ref.scrollTo` 接口对齐：
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
 * onChange extra 参数（S1，对应 antd `TableCurrentDataSource`）。
 * - `currentDataSource`：当前（排序/筛选后）数据源。受控排序下为外部传入的 dataSource。
 * - `action`：触发动作（'sort' / 'filter' / 'paginate'）。
 */
export interface TableCurrentDataSource<RecordType = any> {
  currentDataSource: Array<RecordType>
  action: 'sort' | 'filter' | 'paginate'
}

/**
 * Table ref 句柄（M4）。
 *
 * 仅虚拟滚动相关 API；其余（nativeElement 等）后续任务补齐。
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
   *   退化为 'start'（与 antd 行为一致）。
   */
  scrollTo: (config: {
    index?: number
    key?: import('react').Key
    scrollTop?: number
    /** antd 同名字段（与 `scrollTop` 等价别名）。 */
    top?: number
    offset?: number
    align?: 'start' | 'center' | 'end' | 'nearest'
  }) => void
  /** 最外层根 DOM 节点（占位，M4 起接入）。 */
  nativeElement?: HTMLDivElement | null
}
