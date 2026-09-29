/**
 * Table 国际化文案（按业务域从 compatTypes.ts 拆出）。
 *
 * 对齐 antd v6 `TableLocale`（locale 的 Table 段）与 `A11yLocale`（locale 的 **global** 段播报文案），另含英文 locale 的 Table 段默认值常量。
 */

import type { ReactNode } from 'react'

/**
 * Table 国际化文案（共 18 字段）。
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
 *
 * 字段集合同名同义于 antd v6 `TableLocale`。
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
 * 表头无障碍播报文案（对齐 antd locale 的 **global** 段；与 `TableLocale` 互为兄弟，不是它的成员）。
 *
 * 参照链路（antd 6.4.4，实读）：`es/locale/en_US.js:15` `global.sortable = 'sortable'`
 * → `es/table/InternalTable.js:121` `useLocale('global', defaultLocale.global)`
 * （合并算法 `es/locale/useLocale.js:7-14`：默认 global 段打底、ConfigProvider 的 global 段浅覆盖）
 * → `es/table/hooks/useSorter.js:374` 作位置实参下传、`:70` 处改名 `a11yLocale`
 * → `:74` 的 `if (newColumn.sorter)` 门内 `:183` `cell['aria-description'] = a11yLocale?.sortable`。
 *
 * 不折进 `TableLocale`：`sortable` 在 antd 属 global 段（`es/locale/index.d.ts:28-34`），
 * 塞进去会让上面「字段集合同名同义于 antd v6 TableLocale」变成假话，并让本项目公共类型
 * 声称 antd 的 `TableLocale` 有该字段。
 *
 * 消费处（两条表头路径）只在 `sortable` 有值时写 `aria-description`：缺值**不写该属性**
 * （与参照 `a11yLocale?.sortable` 同形——不写空串、不回退默认英文；**禁止硬编码文案**）。
 */
export interface A11yLocale {
  sortable?: string
}

/**
 * TableLocale 字段默认值（英文 locale 的 Table 段）。
 *
 * 未传 locale / 未传某字段时，FilterDropdown 等消费处回退到这里（保持英文默认、与 antd 一致）。
 * 仅暴露 FilterDropdown 实际消费的 5 个字段默认值（filterConfirm/filterReset/filterEmptyText/
 * filterSearchPlaceholder/filterCheckAll）——其余字段消费处落地时按需补。
 *
 * 默认值与 antd 英文 locale 的 Table 段一致。
 */
export const TABLE_LOCALE_DEFAULT = {
  filterConfirm: 'OK',
  filterReset: 'Reset',
  filterEmptyText: 'No filters',
  filterSearchPlaceholder: 'Search in filters',
  filterCheckAll: 'Select all items',
} as const
