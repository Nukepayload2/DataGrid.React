/**
 * 筛选状态机（S3 基础列筛选）。
 *
 * **自研**——属表格核心逻辑（决策 6：data-grid 保留表格核心状态机自研；下拉 UI 用 antd）。
 *
 * === 状态模型 ===
 *
 * 内部维护 `Record<filterKey, filteredValue[]>`：每个**可筛选**叶子列一组激活值。
 * `filterKey` = column.key ?? dataIndex（与 sortKey 一致）。`filteredValue` 为 `Array<string|number>`，
 * 空数组表示"无激活筛选"（与 antd 一致：空数组 = 该列未筛选；null 同义）。
 *
 * 受控/非受控（与 useSorter 同款语义，对齐 antd）：
 *   - 受控：列上传 `filteredValue`（含 null/空数组显式受控）。该列的筛选状态由外部真理源驱动。
 *     **受控仍参与前端过滤**——与 antd `getFilterData` 一致（受控仅表示"状态来源 + onChange 通知"，
 *     不跳过数据处理）。引擎用 merged filteredValueMap（受控列取外部值、非受控列取内部 state）
 *     对 dataSource 过滤。
 *   - 非受控：列上传 `defaultFilteredValue`（仅初始化时生效）或都不传（初始为空）。
 *     引擎内部 state 持有，应用筛选时更新 state + 触发 onChange。
 *
 * 混合模式：antd 允许部分列受控、部分非受控。本 hook 同样支持：每列独立判定受控与否，
 * merged 状态取受控列用外部值、非受控列用内部 state。
 *
 * === 前端筛选（非受控列）===
 *
 * 对非受控列，引擎按 `filters` + `onFilter` + `filteredValue` 对 dataSource 过滤：
 *   - filterMultiple=true（默认）：保留命中**任一**激活值的 record（OR 语义，对齐 antd）。
 *   - filterMultiple=false：仅保留命中**唯一**激活值的 record（单选语义；多选时仍按 OR）。
 *   - filteredValue 为空 → 该列不过滤（保留全部）。
 *
 * 多列叠加：AND 语义——每列各自过滤后取交集（record 必须通过所有可筛选列的过滤）。
 *
 * === 与排序叠加（顺序：raw → sort → filter）===
 *
 * 对齐 antd：前端处理链为"先排序、后过滤"——
 *   1. useSorter 对 raw dataSource 排序 → sortedDataSource。
 *   2. useFilter 对 sortedDataSource 过滤 → filteredDataSource（最终渲染数据源）。
 *
 * 这样排序图标/排序态基于全量数据，筛选只是"在已排序的结果上裁剪"。与 antd `getFilterData`
 * 在排序后的数据上再过滤的语义一致。
 *
 * === onChange 分发 ===
 *
 * 本 hook 不直接调用 antd 全量 onChange（因为不持有排序态）。
 * 应用筛选（Dropdown 关闭/确定按钮）时，hook 调用 `onFilterChange(filters, currentDataSource)`，
 * 适配层 Table.tsx 在此回调里注入最新 sorter（从 useSorter 取），组装完整的
 * `onChange(pagination, filters, sorter, extra)`：
 *   - pagination：占位 `{}`（S11）。
 *   - filters：`{ [filterKey]: filteredValue[] | null }`——所有可筛选列均出现为 key；
 *     无激活筛选的列值为 `null`（对齐 antd）。
 *   - sorter：适配层从 useSorter 派生的最新排序结果。
 *   - extra：`{ currentDataSource, action: 'filter' }`。currentDataSource 为排序+筛选后的数据源
 *     （受控为传入 dataSource）。
 *
 * === 实现要点 ===
 *
 * 1. **filterKey 稳定性**：用 resolveFilterKey（column.key ?? dataIndex，与 sortKey 同算法）。
 *    无 key/dataIndex 的列不可筛选（filterable 判定时已排除）。
 * 2. **filters 扁平化**：children（S7 树形）本阶段扁平化为顶层项参与勾选（不做二级菜单 UI）。
 * 3. **不持有 filters/onFilter 配置**：本 hook 只管"哪些 value 被选中"；配置（filters 列表、onFilter 函数）
 *    由列树携带，渲染层（FilterDropdown）直接读。过滤计算时也读列树的 filters/onFilter。
 */

import { useCallback, useMemo, useState } from 'react'
import type { ColumnType, ColumnFilterItem } from '../types'
import { resolveColumnSortKey } from './useSorter'
import type { EngineFilterItem } from './types'

export interface UseFilterOptions<RecordType> {
  /** 外部 columns（用于查列定义 + 过滤时取 filters/onFilter）。 */
  columns: Array<ColumnType<RecordType>>
  /** 排序后的数据源（S3 输入：raw → sort → filter）。 */
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
 * 判断某列是否可筛选（S3）：filters 非空 + onFilter 存在。
 */
export function isFilterable<RecordType>(
  column: ColumnType<RecordType> | undefined,
): boolean {
  if (!column) return false
  return !!column.filters && column.filters.length > 0 && typeof column.onFilter === 'function'
}

/**
 * 把 ColumnFilterItem[]（含 children）扁平化为 value 列表（S7 树形筛选保留字段，本阶段扁平化）。
 * 注意：返回扁平 value 列表仅用于"判定某 value 是否在 filters 配置中"等辅助；
 * 实际渲染下拉 UI 用原始 ColumnFilterItem[]（保留 text）。引擎层 EngineFilterItem 同理。
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
    activeFilters.push({ onFilter: c.onFilter!, values })
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
 * 筛选状态机 hook（S3）。
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

// EngineFilterItem 类型从 ./types 重新导出（渲染层 FilterDropdown 直接从 ./types 导入即可，
// 此处保留是为了向后兼容早期实现；不影响 tree-shaking）。
export type { EngineFilterItem }
