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
