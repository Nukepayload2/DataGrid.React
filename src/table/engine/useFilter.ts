/**
 * 筛选状态机 — 详见 docs/features/interaction/filter-sorter.md
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
  isSameFilteredValueList,
  normalizeFilteredValue,
} from './filterUtils'
import type { EngineFilterItem } from './types'

export { isFilterable, flattenFilterValues } from './filterUtils'

/**
 * 「该列无激活筛选」的**共享空数组**（19-B / F-A）。
 *
 * 为什么需要它：`filteredValueMap` 的 memo 每轮重算都 `map.set(key, v ?? <空>)`，
 * 若 `<空>` 处现造 `[]`，该列的 `filteredValue` **引用**就每轮都变 ⇒
 * `sortFilterAdapter.applyFilterToNode` 把新引用透传给 `engine/FilterDropdown.tsx` 的
 * `filteredValue` prop，而该组件把草稿同步成外部已应用值的 effect（`:180-184`）
 * 依赖数组按**身份**比较 ⇒ 用户正开着面板勾选、只换一次 `dataSource` 草稿就被覆写
 * （探针 P-2/P-2n 改前读数：`CHECKED0 true→false` 且 `PANELS` 仍为 1 ⇒ 不是卸载）。
 * 共享常量后：所有「无激活值」的列用同一个引用 ⇒ memo 重算不再改变该 prop 的身份。
 *
 * ⚠ 按**只读**约定使用（类型写成 `Array<FilterValue>` 以匹配
 * `Map<string, Array<FilterValue>>` 的既有签名）：任何要写入的路径必须先复制。
 * 现有消费者（`computeFilteredDataSource` / `buildFiltersArg` / `applyFilterToNode` /
 * `FilterDropdown` 的 `(filteredValue ?? []).slice()`）全部只读。
 */
const EMPTY_FILTERED_VALUE: Array<FilterValue> = []

export interface UseFilterOptions<RecordType> {
  /**
   * 外部 columns（用于查列定义 + 过滤时取 filters/onFilter）。
   * 19-A 之后由适配层传入**含分组列自身**的扁平列集（`Table.tsx` 的 `filterColumns`，
   * 见 `columnAdapter.flattenAllColumns`）——参照 antd@6.4.4 `useFilter/index.js:151-156`
   * 的 `getMergedColumns` 就把分组节点本身留在收集面内，所以写在分组列上的 filters/onFilter
   * 会参与过滤。此前只喂叶子集 ⇒ 分组列的筛选配置被静默丢弃。
   */
  columns: Array<ColumnType<RecordType>>
  /** 排序后的数据源（处理链 raw → sort → filter 的 sort 输出）。 */
  dataSource: Array<RecordType>
  /**
   * 树形数据的子节点字段名（对齐 antd `getFilterData` 的 `childrenColumnName`）。
   * 缺省 `'children'`。筛选**逐层递归**该字段：命中的父行保留，其 children 继续按同一批
   * 激活筛选过滤（不匹配的子行不再渲染）。非树形数据不受影响。
   */
  childrenColumnName?: string
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
   * - **等值守卫**：规范化后的新值与该列当前激活值逐项相等（原始值按值、对象按引用）时
   *   整体跳过——不更新 state、不触发 onFilterChange（对齐 antd internalTriggerFilter 的
   *   isEqual 判定；「打开下拉没改动就点 OK」不产生 onChange）。
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
 * 筛选状态机 hook — 详见 docs/features/interaction/filter-sorter.md
 */
export function useFilter<RecordType>(
  options: UseFilterOptions<RecordType>,
): UseFilterResult<RecordType> {
  const { columns, dataSource, onFilterChange, childrenColumnName = 'children' } = options

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
  // ⚠ 两处「无激活值」的回退**必须**用模块级共享常量 `EMPTY_FILTERED_VALUE`，不能在 memo 里
  //   现造 `[]`：本 memo 每轮重算都会产出新数组 ⇒ 下游 `applyFilterToNode` 把新引用传进
  //   `FilterDropdown` 的 `filteredValue` prop，而该组件的草稿同步 effect
  //   （`engine/FilterDropdown.tsx:180-184`）按**身份**比较 ⇒ 用户正开着面板勾选、数据一刷新草稿就被清空
  //   （BAT-19 19-B 的 V3，探针 P-2/P-2n 改前读数 `CHECKED0 true→false`、`PANELS` 仍为 1 ⇒ 非卸载）。
  //   参照的免疫方式不同但效果一致：antd@6.4.4 `es/table/hooks/useFilter/index.js:187-204` 把非受控
  //   列的 `filteredKeys` **引用**从 `useState` 里的 filterStates 搬运，不随 memo 重算换新数组。
  const filteredValueMap = useMemo(() => {
    const map = new Map<string, Array<FilterValue>>()
    for (const c of filterableColumns) {
      const key = resolveFilterKey(c)
      if (key === undefined) continue
      if (c.filteredValue !== undefined) {
        // 受控：取外部值（已 normalize）。
        const v = controlledMap.get(key)
        map.set(key, v ?? EMPTY_FILTERED_VALUE)
      } else {
        // 非受控：取内部 state（可能未初始化 → 空）。
        const v = uncontrolledMap.get(key)
        map.set(key, v ?? EMPTY_FILTERED_VALUE)
      }
    }
    return map
  }, [filterableColumns, controlledMap, uncontrolledMap])

  // === 前端过滤（对齐 antd：受控/非受控都过滤）===
  // 对每列：filteredValue 非空 → 按 onFilter OR 语义过滤；多列 AND 叠加。
  // 受控列的 filteredValue 也参与过滤（状态来自外部，但数据处理照常）。
  // 树形数据：**逐层递归 childrenColumnName**（对齐 antd getFilterData），
  //   命中的父行保留、其不匹配的子孙行被过滤掉；非树形数据零回归。
  const filteredDataSource = useMemo(
    () =>
      computeFilteredDataSource(dataSource, filterableColumns, filteredValueMap, childrenColumnName),
    [dataSource, filterableColumns, filteredValueMap, childrenColumnName],
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
  // — 详见 docs/features/interaction/filter-sorter.md（onChange 分发）
  const setFilterValue = useCallback(
    (filterKey: string, nextFilteredValue: Array<FilterValue> | null) => {
      const normalized = normalizeFilteredValue(nextFilteredValue)

      // === 等值守卫（缺口 #5）===
      // 值未变 → 既不更新内部 state，也不派发 onFilterChange（对齐 antd
      // `useFilter/FilterDropdown.js:188-199` internalTriggerFilter：`isEqual(mergedKeys, filteredKeys)`
      // 时 return null）。落点选这里而不是 FilterDropdown：OK / 关闭下拉（filterOnClose）/
      // clearFilters 三条路径都汇流到 setFilterValue，单点守卫覆盖全部。
      // 比较口径与 normalizeFilteredValue 同尺（原始值按值、对象按引用）。
      if (isSameFilteredValueList(filteredValueMap.get(filterKey), normalized)) return

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
          childrenColumnName,
        )
        onFilterChange(filtersArg, currentDataSource)
      }
    },
    [filterableColumns, filteredValueMap, dataSource, onFilterChange, childrenColumnName],
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
