/**
 * data-grid 原生类型层：选择/对齐/固定列方向/滚动条折叠等枚举与 props 类型。
 */

export type Align = 'start' | 'center' | 'end'

/** 固定列方向输入；布尔值在内部归一化。 */
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
 * 行选择回调用"操作类型"（便于调用方区分批量/单次操作）。
 * - 'all'：多选全选。
 * - 'none'：多选全不选。
 * - 'invert'：反选（状态机已支持，UI 暴露视 selections 配置）。
 * - 'single'：单选（radio 或单次点击 checkbox）。
 * - 'multiple'：多选连续操作（单一勾选也归类为 single）。
 *
 * 同名同义于 antd `RowSelectMethod`。
 */
export type RowSelectMethod = 'all' | 'none' | 'invert' | 'single' | 'multiple'

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
   * 其余→multiple）；未声明 `gridOptions.selection` 时保持现有 antd 兼容 API 行为。
   */
  selectionMode?: GridSelectionMode
  /**
   * 是否显示选择列 UI。
   *
   * `false` 时不插入选择列，但仍保留行点击选中、受控值驱动和选中视觉。
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
 * 自定义组件类型：`components` prop 的形状，让调用方替换表格内部默认渲染的元素。
 *
 * data-grid 用 div 渲染（非 table/tr/td），故 `body.cell` / `body.row` 的语义与 antd 略有适配（见各字段注释）。
 *
 * 类型同名同义于 antd v6 `TableComponents` 子集。
 */
export interface TableComponents {
  /**
   * 表头自定义组件（列拖拽会用；当前不消费，仅占位）。
   * - `header.cell`：替换默认表头格。
   */
  header?: {
    cell?: React.ComponentType<any>
  }
  /**
   * 表体自定义组件。
   *
   * - `body.row`：替换默认**行容器**。data-grid 用 div 渲染，行容器语义=包裹该行所有单元格的元素。
   *   ★ 与 antd 差异：antd 的 body.row 替换 `<tr>`；data-grid 中 body.row 实现为每行渲染一个
   *   **包裹层**组件，其内部再渲染该行的单元格。本字段提供时启用包裹层；未提供时维持现有布局（零回归）。
   *   典型用法：EditableRow（包 antd Form + Context.Provider）。
   *
   * - `body.cell`：替换默认**单元格内容**。
   *   ★ 与 antd 差异：antd 的 body.cell 替换整个 `<td>`；data-grid 中 body.cell 替换的是单元格
   *   **内部的内容**，返回 ReactNode（单元格内容），而非整个 td。其余结构（定位 / sticky / hover /
   *   align）由 data-grid 维持。签名建议对齐 antd：`(props) => ReactNode`，props 含
   *   `{ children, record, index, dataIndex, ...onCell返回值 }`（children=默认渲染内容）。
   *   典型用法：EditableCell（editing 态 Form.Item+Input / 展示态 div）。
   *
   * onCell 返回值（除 colSpan/rowSpan）整体透传给 body.cell 的 props（与 antd v6 一致）。
   *
   * @internal data-grid 单元格实现为 `div.dg-cell`（grid item），内部 `.dg-cell-inner` 处放内容；
   *   body.cell 替换 `.dg-cell-inner` 内容，body.row 提供包裹层组件后单元格仍在内部按 grid 定位。
   *   表头格对应 `div.dg-cell-header`。
   */
  body?: {
    row?: React.ComponentType<any>
    cell?: React.ComponentType<any>
  }
}

export interface ScrollBarFoldMode {
  /**
   * 是否仅在表格 hover / 触摸激活后显示滚动条或滚动条指示器。
   *
   * - `false` / undefined（默认）：滚动条指示器按现有行为常驻可见。
   * - `true`：未 hover 表格时隐藏；hover 表格、hover 滚动条 hit 区或触摸表格后显示。
   */
  showOnTableHover?: boolean
  /**
   * 是否 hover 滚动条 hit 区时从 2px 指示器展开为 8px 滚动条。
   *
   * - `true` / undefined（默认）：常态 2px，hover hit 区展开。
   * - `false`：始终以展开尺寸显示。
   */
  expandOnHover?: boolean
}
