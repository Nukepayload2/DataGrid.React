/**
 * 筛选状态机 — 详见 docs/design-notes/filter-sorter.md
 *
 * 维护 `Record<filterKey, filteredValue[]>`（每可筛选叶子列一组激活值）。
 * 受控/非受控混合（每列独立判定）；处理链 raw → sort → filter；onChange 经适配层
 * 注入 sorter 组装完整 onChange。配置（filters/onFilter）由列树携带，本 hook 只管"哪些 value 被选中"。
 *
 * 纯函数簇（isFilterable/flattenFilterValues/normalizeFilteredValue/computeFilteredDataSource/
 * buildFiltersArg）已抽出到 filterUtils.ts。本文件 re-export 公共符号以维持 API 表面不变。
 */

import { useCallback, useMemo, useState } from 'react'
import type { ColumnType, FilterValue } from '../types'
import { resolveFilterKey } from './columnKeys'
import {
  buildFiltersArg,
  computeFilteredDataSource,
  isFilterable,
  normalizeFilteredValue,
} from './filterUtils'
import type { EngineFilterItem } from './types'

export { isFilterable, flattenFilterValues } from './filterUtils'

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
    filters: Record<string, Array<FilterValue> | null>,
    currentDataSource: Array<RecordType>,
  ) => void
}

export interface UseFilterResult<RecordType> {
  /**
   * 每列的激活筛选值映射（filterKey → filteredValue[]）。
   * 受控：取自外部 column.filteredValue；非受控：取自内部 state。
   * 空数组表示无激活筛选。
   */
  filteredValueMap: Map<string, Array<FilterValue>>
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
    nextFilteredValue: Array<FilterValue> | null,
  ) => void
  /**
   * 当前 onChange 用的 filters 对象（{ filterKey: filteredValue[] | null }）。
   * 所有可筛选列均出现为 key；无激活的列值为 null。
   */
  getFiltersArg: () => Record<string, Array<FilterValue> | null>
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
    const map = new Map<string, Array<FilterValue>>()
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
    Map<string, Array<FilterValue>>
  >(() => {
    const map = new Map<string, Array<FilterValue>>()
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
    const map = new Map<string, Array<FilterValue>>()
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
    (filterKey: string, nextFilteredValue: Array<FilterValue> | null) => {
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
export { resolveFilterKey } from './columnKeys'
