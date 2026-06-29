/**
 * 筛选状态机 — 详见 docs/design-notes/filter-sorter.md
 *
 * 维护 `Record<filterKey, filteredValue[]>`（每可筛选叶子列一组激活值）。
 * 受控/非受控混合（每列独立判定）；处理链 raw → sort → filter；onChange 经适配层
 * 注入 sorter 组装完整 onChange。配置（filters/onFilter）由列树携带，本 hook 只管"哪些 value 被选中"。
 */

import { useCallback, useMemo, useState } from 'react'
import type { ColumnType, ColumnFilterItem } from '../types'
import { resolveColumnSortKey } from './useSorter'
import type { EngineFilterItem } from './types'

export interface UseFilterOptions<RecordType> {
  /** 外部 columns（用于查列定义 + 过滤时取 filters/onFilter）。 */
  columns: Array<ColumnType<RecordType>>
  /** 排序后的数据源（处理链 raw → sort → filter 的 sort 输出）。 */
  dataSource: Array<RecordType>
  /**
   * 筛选变化回调（**仅筛选部分**，不含 sorter）。
   * 适配层 Table.tsx 在此回调里注入最新 sorter，组装完整的 onChange(pagination, filters, sorter, extra)。
   *
   * @param filters `{ [filterKey]: filteredValue[] | null }`——所有可筛选列均出现为 key；无激活的为 null。
   * @param currentDataSource 排序+筛选后的数据源（受控/非受控都计算）。
   */
  onFilterChange?: (
    filters: Record<string, Array<string | number> | null>,
    currentDataSource: Array<RecordType>,
  ) => void
}

export interface UseFilterResult<RecordType> {
  /**
   * 每列的激活筛选值映射（filterKey → filteredValue[]）。
   * 受控：取自外部 column.filteredValue；非受控：取自内部 state。
   * 空数组表示无激活筛选。
   */
  filteredValueMap: Map<string, Array<string | number>>
  /**
   * 筛选后的数据源（raw → sort → filter；受控/非受控都过滤，对齐 antd）。
   * 引擎用此渲染数据行。
   */
  filteredDataSource: Array<RecordType>
  /**
   * 设置某列的筛选值（Dropdown 应用/重置时调用）。
   * - 非受控列：更新内部 state + 触发 onFilterChange。
   * - 受控列：仅触发 onFilterChange（外部负责更新 filteredValue；与 antd 受控语义一致）。
   * @param filterKey 列的稳定筛选 key（column.key ?? dataIndex）。
   * @param nextFilteredValue 新的筛选值数组；空数组/null 表示清除该列筛选。
   */
  setFilterValue: (
    filterKey: string,
    nextFilteredValue: Array<string | number> | null,
  ) => void
  /**
   * 当前 onChange 用的 filters 对象（{ filterKey: filteredValue[] | null }）。
   * 所有可筛选列均出现为 key；无激活的列值为 null。
   */
  getFiltersArg: () => Record<string, Array<string | number> | null>
}

/**
 * 解析 column 的"筛选标识"（filterKey）：与 sortKey 同算法（column.key ?? dataIndex）。
 */
export function resolveFilterKey<RecordType>(
  column: ColumnType<RecordType>,
): string | undefined {
  const k = resolveColumnSortKey(column)
  return k !== undefined ? String(k) : undefined
}

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
export function flattenFilterValues(items: Array<ColumnFilterItem>): Array<string | number> {
  const out: Array<string | number> = []
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
function normalizeFilteredValue(
  v: Array<string | number> | null | undefined,
): Array<string | number> {
  if (!v || v.length === 0) return []
  // 去重保序（避免重复勾选导致 onChange 数组重复）。
  const seen = new Set<string | number>()
  const out: Array<string | number> = []
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
function computeFilteredDataSource<RecordType>(
  dataSource: Array<RecordType>,
  filterableColumns: Array<ColumnType<RecordType>>,
  filteredValueMap: Map<string, Array<string | number>>,
): Array<RecordType> {
  if (filterableColumns.length === 0) return dataSource
  const activeFilters: Array<{
    onFilter: (value: string | number, record: RecordType) => boolean
    values: Array<string | number>
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
function buildFiltersArg<RecordType>(
  filterableColumns: Array<ColumnType<RecordType>>,
  filteredValueMap: Map<string, Array<string | number>>,
): Record<string, Array<string | number> | null> {
  const arg: Record<string, Array<string | number> | null> = {}
  for (const c of filterableColumns) {
    const key = resolveFilterKey(c)
    if (key === undefined) continue
    const v = filteredValueMap.get(key)
    arg[key] = v && v.length > 0 ? v : null
  }
  return arg
}

/**
 * 筛选状态机 hook — 详见 docs/design-notes/filter-sorter.md
 */
export function useFilter<RecordType>(
  options: UseFilterOptions<RecordType>,
): UseFilterResult<RecordType> {
  const { columns, dataSource, onFilterChange } = options

  // === 可筛选列收集 ===
  // 只对"有 filterKey（key/dataIndex）+ filters 非空 + onFilter"的列启用筛选。
  const filterableColumns = useMemo(
    () => columns.filter((c) => isFilterable(c)),
    [columns],
  )

  // === 受控 / 非受控 判定（每列独立）===
  // 受控列：filteredValue !== undefined（含 null/[] 显式受控）。
  // 收集受控列及其当前值（用于 merged 状态）。
  const controlledMap = useMemo(() => {
    const map = new Map<string, Array<string | number>>()
    for (const c of filterableColumns) {
      const key = resolveFilterKey(c)
      if (key === undefined) continue
      if (c.filteredValue !== undefined) {
        map.set(key, normalizeFilteredValue(c.filteredValue))
      }
    }
    return map
  }, [filterableColumns])

  // === 非受控内部 state ===
  // 初始值：取自 defaultFilteredValue（仅初始化时生效；列变化不重置）。
  const [uncontrolledMap, setUncontrolledMap] = useState<
    Map<string, Array<string | number>>
  >(() => {
    const map = new Map<string, Array<string | number>>()
    for (const c of filterableColumns) {
      const key = resolveFilterKey(c)
      if (key === undefined) continue
      if (c.filteredValue === undefined && c.defaultFilteredValue !== undefined) {
        map.set(key, normalizeFilteredValue(c.defaultFilteredValue))
      }
    }
    return map
  })

  // === merged 状态（受控列用外部值，非受控列用内部 state）===
  const filteredValueMap = useMemo(() => {
    const map = new Map<string, Array<string | number>>()
    for (const c of filterableColumns) {
      const key = resolveFilterKey(c)
      if (key === undefined) continue
      if (c.filteredValue !== undefined) {
        // 受控：取外部值（已 normalize）。
        const v = controlledMap.get(key)
        map.set(key, v ?? [])
      } else {
        // 非受控：取内部 state（可能未初始化 → 空）。
        const v = uncontrolledMap.get(key)
        map.set(key, v ?? [])
      }
    }
    return map
  }, [filterableColumns, controlledMap, uncontrolledMap])

  // === 前端过滤（对齐 antd：受控/非受控都过滤）===
  // 对每列：filteredValue 非空 → 按 onFilter OR 语义过滤；多列 AND 叠加。
  // 受控列的 filteredValue 也参与过滤（状态来自外部，但数据处理照常）。
  const filteredDataSource = useMemo(
    () => computeFilteredDataSource(dataSource, filterableColumns, filteredValueMap),
    [dataSource, filterableColumns, filteredValueMap],
  )

  // === getFiltersArg（onChange 的 filters 参数）===
  // 所有可筛选列均出现为 key；无激活的列值为 null（对齐 antd）。
  const getFiltersArg = useCallback(() => buildFiltersArg(filterableColumns, filteredValueMap), [
    filterableColumns,
    filteredValueMap,
  ])

  // === setFilterValue（Dropdown 应用/重置时调用）===
  // 仅更新内部非受控 state；onChange 分发通过 onFilterChange 回调（适配层注入 sorter）。
  // 受控列不更新内部 state（外部 filteredValue 是真理源），但仍构造新的 merged map 用于 onFilterChange。
  // — 详见 docs/design-notes/filter-sorter.md（onChange 分发）
  const setFilterValue = useCallback(
    (filterKey: string, nextFilteredValue: Array<string | number> | null) => {
      const normalized = normalizeFilteredValue(nextFilteredValue)
      // 找到列定义（判定受控与否）。
      const col = filterableColumns.find((c) => resolveFilterKey(c) === filterKey)
      const isControlled = !!col && col.filteredValue !== undefined

      // 计算新的 merged map（反映本次 setFilterValue 的结果，用于 onFilterChange 即时参数）。
      const nextMerged = new Map(filteredValueMap)
      nextMerged.set(filterKey, normalized)

      // 非受控：更新内部 state。
      if (!isControlled) {
        setUncontrolledMap((prev) => {
          const next = new Map(prev)
          if (normalized.length === 0) {
            next.delete(filterKey)
          } else {
            next.set(filterKey, normalized)
          }
          return next
        })
      }

      // 触发 onFilterChange（适配层 Table.tsx 注入 sorter 组装完整 onChange）。
      if (onFilterChange) {
        const filtersArg = buildFiltersArg(filterableColumns, nextMerged)
        const currentDataSource = computeFilteredDataSource(
          dataSource,
          filterableColumns,
          nextMerged,
        )
        onFilterChange(filtersArg, currentDataSource)
      }
    },
    [filterableColumns, filteredValueMap, dataSource, onFilterChange],
  )

  return {
    filteredValueMap,
    filteredDataSource,
    setFilterValue,
    getFiltersArg,
  }
}

// EngineFilterItem 类型从 ./types 重新导出（渲染层 FilterDropdown 也可直接从 ./types 导入）。
export type { EngineFilterItem }
