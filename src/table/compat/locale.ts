/**
 * Table 国际化文案（按业务域从 compatTypes.ts 拆出）。
 *
 * 对齐 antd v6 `TableLocale`，以及 antd 英文 locale 包 Table 段默认值常量。
 */

import type { ReactNode } from 'react'

/**
 * Table 国际化文案（对齐 antd v6 `TableLocale`，共 18 字段）。
 *
 * 全部 optional；未传的字段回退到内置默认值（与 antd 英文 locale 默认 Table 段一致——
 * 保持英文默认、与 antd 行为对齐）。FilterDropdown 消费 filterConfirm/filterReset/filterEmptyText/
 * filterSearchPlaceholder/filterCheckAll/filterCheckall；emptyText 由 Table 表体空态消费，使用
 * Table 合并后的 Table locale（包含 `TableProps.locale` 与 `ConfigProvider locale.Table`）；
 * 其余字段（filterTitle/selectAll/selectNone/selectInvert/selectionAll/sortTitle/expand/collapse/
 * triggerDesc/triggerAsc/cancelSort）为接口完整性保留，供后续任务（如排序 tooltip i18n、选择菜单 i18n）消费。
 *
 * `filterCheckall`（小写 l）是 antd @deprecated 别名，消费处用 `filterCheckall ?? filterCheckAll`
 * （对齐 antd FilterDropdown 的 fallback 语义）。
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
 * TableLocale 字段默认值（对齐 antd 英文 locale 的 Table 段）。
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
