/**
 * 筛选相关类型（按业务域从 compatTypes.ts 拆出）。
 *
 * 包含 filter value / filterDropdown props / filter item / 透传 Dropdown props。
 * 对齐 antd v6 `column.filter*` 字段。
 */

import type { ReactNode } from 'react'
import type { DropdownProps } from 'antd'

/** 筛选项取值类型（boolean 或 React.Key）。同名同义于 antd v6 `ColumnFilterItem['value']`。 */
export type FilterValue = boolean | React.Key

/**
 * `confirm` 参数（自定义筛选面板调用 confirm 时收到的入参形状）。
 *
 * 同名同义于 antd `FilterConfirmProps`。
 */
export interface FilterConfirmProps {
  /** 应用筛选后是否同时关闭筛选下拉。 */
  closeDropdown: boolean
}

/**
 * `clearFilters` 参数（自定义筛选面板调用 clearFilters 时收到的入参形状）。
 *
 * 同名同义于 antd `FilterResetProps`。
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
  /** 样式前缀（兼容字段；使用 data-grid 内部固定前缀）。
 *
 *  @internal 内部恒定为 `'dg-filter'`。 */
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
  /** 受控打开状态。语义与 antd `Dropdown.open` 一致。 */
  open?: boolean
  /** 打开/关闭回调。filterOnClose=true 时据此应用草稿。 */
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
