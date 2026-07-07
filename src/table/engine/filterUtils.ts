/**
 * 筛选算法纯函数簇 — 详见 docs/design-notes/filter-sorter.md
 *
 * 从 useFilter.ts 抽出的模块级纯函数：判定可筛选、filters 扁平化、filteredValue 规范化、
 * 数据源过滤（列间 AND、列内 OR）、onChange filters 参数构造。
 *
 * 全部为纯函数（不依赖 hook state/setter），可独立单测。useFilter 仅做 import 替换。
 */

import type { ColumnType, ColumnFilterItem, FilterValue } from '../types'
import { resolveFilterKey } from './columnKeys'

/**
 * 判断某列是否可筛选 — 详见 docs/design-notes/filter-sorter.md
 *
 * 对齐 antd `useFilter/index.tsx:38`：`filters || filterDropdownIsDefined || 'onFilter' in column`
 * ——filters/filterDropdown/onFilter 任一存在即 filterable（渲染漏斗）。**onFilter 非必需**：
 * 服务端模式列声明 filters 但不传 onFilter，漏斗仍渲染，onChange 仍回传 filters，前端不过滤。
 */
export function isFilterable<RecordType>(
  column: ColumnType<RecordType> | undefined,
): boolean {
  if (!column) return false
  // 自定义面板优先——有 filterDropdown 即可筛选（即使无 filters/onFilter）。
  if (column.filterDropdown !== undefined && column.filterDropdown !== null) return true
  // filters 已定义即 filterable（含空数组，对齐 antd truthy 判定：`filters: []`
  //   也渲染漏斗，点开空面板走 renderEmpty）。onFilter 非必需——服务端筛选时前端不过滤。
  if (column.filters) return true
  // 仅 onFilter（filters 空、filterDropdown 空）也视为可筛选（兜底）。
  return typeof column.onFilter === 'function'
}

/**
 * 把 ColumnFilterItem[]（含 children）扁平化为 value 列表 — 详见 docs/design-notes/filter-sorter.md（filters 扁平化）
 *
 * 树形筛选本阶段扁平化为顶层项参与勾选（不做二级菜单 UI）。返回扁平 value 列表仅用于
 * "判定某 value 是否在 filters 配置中"等辅助；实际渲染下拉 UI 用原始 ColumnFilterItem[]（保留 text）。
 */
export function flattenFilterValues(items: Array<ColumnFilterItem>): Array<FilterValue> {
  const out: Array<FilterValue> = []
  const walk = (list: Array<ColumnFilterItem>) => {
    for (const it of list) {
      out.push(it.value)
      if (it.children && it.children.length > 0) walk(it.children)
    }
  }
  walk(items)
  return out
}

/**
 * 规范化单列的"当前 filteredValue"：null/undefined → 空（无激活）；数组去重保序。
 */
export function normalizeFilteredValue(
  v: Array<FilterValue> | null | undefined,
): Array<FilterValue> {
  if (!v || v.length === 0) return []
  // 去重保序（避免重复勾选导致 onChange 数组重复）。
  const seen = new Set<FilterValue>()
  const out: Array<FilterValue> = []
  for (const item of v) {
    const key = typeof item === 'object' ? String(item) : item
    if (!seen.has(key)) {
      seen.add(key)
      out.push(item)
    }
  }
  return out
}

/**
 * 给定 dataSource + filterableColumns + filteredValueMap，计算过滤后的数据源。
 * activeFilters 非空时按 AND（每列 OR）过滤；否则返回原 dataSource。
 * 抽出供 filteredDataSource useMemo 与 setFilterValue 即时计算共用。
 *
 * 对齐 antd：受控与否都过滤（受控仅表示状态来源，不跳过 getFilterData）。
 */
export function computeFilteredDataSource<RecordType>(
  dataSource: Array<RecordType>,
  filterableColumns: Array<ColumnType<RecordType>>,
  filteredValueMap: Map<string, Array<FilterValue>>,
): Array<RecordType> {
  if (filterableColumns.length === 0) return dataSource
  const activeFilters: Array<{
    onFilter: (value: FilterValue, record: RecordType) => boolean
    values: Array<FilterValue>
  }> = []
  for (const c of filterableColumns) {
    const key = resolveFilterKey(c)
    if (key === undefined) continue
    const values = filteredValueMap.get(key)
    if (!values || values.length === 0) continue
    // 守卫：filterable 放宽后，server 模式列可能无 onFilter（filters 非空但 onFilter 缺省）。
    // 对齐 antd：无 onFilter 的列渲染漏斗但前端不过滤（数据由服务端处理），跳过该列。
    if (typeof c.onFilter !== 'function') continue
    activeFilters.push({ onFilter: c.onFilter, values })
  }
  if (activeFilters.length === 0) return dataSource
  return dataSource.filter((record) =>
    // AND：每列都必须通过（该列 values 中任一命中即可）。
    activeFilters.every((af) => af.values.some((v) => af.onFilter(v, record))),
  )
}

/**
 * 构造 onChange 的 filters 参数：所有可筛选列均出现为 key；无激活的列值为 null。
 */
export function buildFiltersArg<RecordType>(
  filterableColumns: Array<ColumnType<RecordType>>,
  filteredValueMap: Map<string, Array<FilterValue>>,
): Record<string, Array<FilterValue> | null> {
  const arg: Record<string, Array<FilterValue> | null> = {}
  for (const c of filterableColumns) {
    const key = resolveFilterKey(c)
    if (key === undefined) continue
    const v = filteredValueMap.get(key)
    arg[key] = v && v.length > 0 ? v : null
  }
  return arg
}
