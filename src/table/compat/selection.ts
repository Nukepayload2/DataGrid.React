/**
 * 行选择类型（按业务域从 compatTypes.ts 拆出）。
 *
 * 对齐 antd v6 `TableRowSelection` + `rowSelection.renderCell`。
 */

import type { ReactNode } from 'react'
import type {
  Align,
  FixedInput,
  RowCheckboxProps,
  RowSelectMethod,
  RowSelectionType,
} from '../nativeOptions'
import type { SelectionItem } from '../engine/useRowSelection'

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
   * @param selectedRows 新的选中 record 数组：**顺序 = selectedRowKeys 顺序**，且从
   *   **原始 `dataSource`（未排序/未筛选/未分页的全树）** 查表取 record
   *   （antd `InternalTable.js:177` 的 `useLazyKVMap(rawData,...)` + `useSelection.js:161-178/184`）。
   *   ⇒ 被筛掉 / 被折叠 / 翻页移出可见区的已选行**照样在数组里**（缺口 #12a 修复后口径）。
   *   唯一例外：`preserveSelectedRowKeys: true` 且 key 已彻底不在 dataSource 时，antd 会用其
   *   preserveRecords 缓存补上 record，我们无该缓存 → 该 key 在 keys 里保留、在 rows 里缺席。
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
  /** 连续多选时触发（对齐 antd `rowSelection.onSelectMultiple`，antd v6 中已标记 deprecated）。 */
  onSelectMultiple?: (
    selected: boolean,
    selectedRows: Array<RecordType>,
    changeRows: Array<RecordType>,
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
   * 返回某 record 的勾选相关 props（antd 签名：`Partial<Omit<CheckboxProps,'checked'|'defaultChecked'>>`）。
   *
   * 返回的字段会透传到勾选控件（缺口 #9：此前只有 `disabled` / `name` 被消费）：
   * `disabled` / `name` / `id` / `title` / `indeterminate` / `aria-label` / `className` /
   * `style` / `onClick` / `onChange`。`disabled: true` 的行不可勾选、不参与全选/半选/树形联动。
   * `indeterminate` 在树形父子联动下被计算值覆盖（antd nest 分支）。
   */
  getCheckboxProps?: (record: RecordType) => RowCheckboxProps | undefined
  /** 选择列宽度（number→px，string→原样）。缺省走 antd 选择列宽度 token。 */
  columnWidth?: number | string
  /** 自定义选择列表头内容（ReactNode 或 `(checkboxNode) => ReactNode`）。 */
  columnTitle?: ReactNode | ((checkboxNode: ReactNode) => ReactNode)
  /** 选择列单元格 props 注入（含 colSpan/rowSpan/className/style/事件等）。 */
  onCell?: (record: RecordType, index: number) => Record<string, any> | undefined
  /**
   * 表头全选 checkbox 的注入 props（antd `getTitleCheckboxProps`：
   * `Partial<Omit<CheckboxProps,'checked'|'defaultChecked'>> & React.AriaAttributes`）。
   *
   * 优先级与 antd 一致（`es/table/hooks/useSelection.js:343-364`）：
   *   - `disabled`：本字段显式值优先，否则「无可选行」兜底为 disabled。
   *   - `checked` / `indeterminate`：**始终取计算值**，本字段无法覆盖（antd 的 spread 顺序如此；
   *     要表达半选请用 selectedRowKeys / 树形联动）。
   *   - 其余槽位（name/id/title/className/style/aria-label/onClick/onChange）透传到控件。
   * `ariaLabel` 是 data-grid 早期接受的驼峰别名（与 `'aria-label'` 等价，保留不破存量调用）。
   */
  getTitleCheckboxProps?: () => RowCheckboxProps & { ariaLabel?: string } | undefined
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
