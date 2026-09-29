/**
 * 排序状态机（单列 + 多列） — 详见 docs/features/interaction/filter-sorter.md
 *
 * 维护 `SortState[]`（每可排序叶子列一条）；sortDirections 循环点击切换；多列按 multiple
 * 优先级叠加（稳定排序链）；受控/非受控都调 getSortData 排序；onChange 经 generateSorterInfo 分发。
 *
 * 纯函数簇（isSortable/getMultiplePriority/resolveCompareFn/defaultCompare/nextSortDirection/
 * collectSortStates/generateSorterInfo/applyCompare/getSortData）已抽出到 sorterUtils.ts。
 * 本文件 re-export 公共符号以维持 API 表面不变。
 */

import { useCallback, useMemo, useState } from 'react'
import type {
  ColumnType,
  FilterValue,
  SorterResult,
  SortOrder,
  TableCurrentDataSource,
  TablePaginationState,
} from '../types'
import { resolveColumnSortKey } from './columnKeys'
import type { SortState } from './sorterUtils'
import {
  DEFAULT_SORT_DIRECTIONS,
  collectSortStates,
  generateSorterInfo,
  getMultiplePriority,
  getSortData,
  isSortable,
  nextSortDirection,
  resolveControlledStatesExclusively,
} from './sorterUtils'

export {
  DEFAULT_SORT_DIRECTIONS,
  isSortable,
  getMultiplePriority,
  resolveCompareFn,
  defaultCompare,
  nextSortDirection,
  collectSortStates,
  generateSorterInfo,
  applyCompare,
  getSortData,
} from './sorterUtils'
export type { SortState } from './sorterUtils'

export interface UseSorterOptions<RecordType> {
  /** 外部 columns（用于查列定义 + 排序时取 sorter/dataIndex）。 */
  columns: Array<ColumnType<RecordType>>
  /** 数据源（非受控时被排序；受控时不排序）。 */
  dataSource: Array<RecordType>
  /**
   * 排序变化回调（对齐 antd TableProps.onChange 的排序部分）。
   * sorter：单列排序为单对象；多列排序为 `SorterResult[]`。
   */
  onChange?: (
    pagination: TablePaginationState,
    filters: Record<string, Array<FilterValue> | null>,
    sorter: SorterResult<RecordType> | Array<SorterResult<RecordType>>,
    extra: TableCurrentDataSource<RecordType>,
  ) => void
  /**
   * 取**当前**筛选状态（onChange 第二参）。由适配层（`Table.tsx`）注入 `useFilter` 的
   * `getFiltersArg`。
   *
   * 对齐 antd：`InternalTable.js` 把 `changeEventInfo.filters`（由 useFilter 维护）与
   * `changeEventInfo.sorter` 合并进**每一次** onChange（`triggerOnChange` 的
   * `{...changeEventInfo, ...info}`），所以排序动作也带着当前 filters。
   * 本 hook 不持有筛选态，故由调用方以取值器传入；未提供时回退 `{}`（无筛选列的场景）。
   */
  getFilters?: () => Record<string, Array<FilterValue> | null>
  /**
   * Table 级默认排序方向（`TableProps.sortDirections`）。
   * 仅对**未**自带 `column.sortDirections` 的列生效（列级优先）。
   *
   * 对齐 antd：`InternalTable.js:223` 把 `sortDirections || ['ascend','descend']` 当
   * `defaultSortDirections` 传给排序 hook，`useSorter.js:75` 取
   * `column.sortDirections || defaultSortDirections`。未提供时回退引擎默认
   * `DEFAULT_SORT_DIRECTIONS`（＝antd 的那个字面量默认值）。
   */
  defaultSortDirections?: Array<'ascend' | 'descend'>
}

export interface UseSorterResult<RecordType> {
  /**
   * 解析后的每列 sortOrder 映射（sort key → sortOrder）。
   * 受控：取自外部 column.sortOrder；非受控：取自内部 state。
   * 多列模式下可有多列为非 null。
   */
  sortOrderMap: Map<string, SortOrder>
  /**
   * 多列模式下，激活列（order != null）的"优先级序号"映射（sort key → 1-based 序号）。
   * 序号按 multiple 降序分配（multiple 最大=最高优先级=序号 1）。供表头显示优先级数字。
   * 单列模式下空 Map（不显示序号）。— 详见 docs/features/interaction/filter-sorter.md（多列优先级叠加）
   */
  sortPriorityMap: Map<string, number>
  /**
   * 当前激活的排序列 key（单列语义的"主排序列"）：取激活列表中 multiple 最大（最高优先级）
   * 的那个；无激活列时为 null。dg-column-sort 高亮在多列下基于 sortOrderMap，此字段仅作辅助。
   */
  activeColumnKey: string | null
  /**
   * 排序后的数据源（非受控时为排序副本；受控时为原 dataSource）。
   * 引擎用此渲染数据行。
   */
  sortedDataSource: Array<RecordType>
  /**
   * 点击某列表头时触发排序循环。参数为该列的稳定 key（column.key/dataIndex/匿名 col-N）。
   */
  onSorterClick: (columnKey: string) => void
  /**
   * 当前 mergedStates 派生的 sorter 结果（useFilter 的 onFilterChange 注入 onChange.sorter 用，
   * 而不依赖点击排序触发）。
   *
   * 返回值与 onSorterClick 触发 onChange 时的 sorter 同款（generateSorterInfo 逻辑）：
   *   - 0 激活 → `{}`。
   *   - 1 激活 → 单对象。
   *   - >=2 激活 → 数组（按 multiple 升序）。
   */
  currentSorterResult: SorterResult<RecordType> | Array<SorterResult<RecordType>>
}

/**
 * 排序状态机 hook（单列 + 多列）— 详见 docs/features/interaction/filter-sorter.md
 */
export function useSorter<RecordType>(
  options: UseSorterOptions<RecordType>,
): UseSorterResult<RecordType> {
  const { columns, dataSource, onChange, getFilters, defaultSortDirections } = options

  // === 受控 / 非受控判定 ===
  // 受控列：带 `sortOrder`（含 null 显式受控）。
  const controlledStates = useMemo(
    () => collectSortStates(columns, false),
    [columns],
  )
  const isControlled = controlledStates.length > 0

  // === 非受控初始 state（仅非受控模式参与）===
  // 初始 state 来自 defaultSortOrder（仅首次挂载）；后续列定义变化不重置内部 state
  // （与 antd 一致：内部 sortStates 只在用户交互 triggerSorter 时更新；列变化时
  // mergedSorterStates 仅过滤掉已不存在的 key）。
  const [uncontrolledStates, setUncontrolledStates] = useState<
    Array<SortState<RecordType>>
  >(() => (isControlled ? [] : collectSortStates(columns, true)))

  // 当 columns 变化时，剔除已不存在的 sort key（保留仍存在列的非受控 state），
  // 但不引入新列的 defaultSortOrder（与 antd 一致：defaultSortOrder 只在初始化时生效）。
  const validKeys = useMemo(() => {
    const set = new Set<string>()
    for (const c of columns) {
      const k = resolveColumnSortKey(c)
      if (k !== undefined) set.add(String(k))
    }
    return set
  }, [columns])
  const prunedUncontrolled = useMemo(
    () =>
      isControlled
        ? []
        : uncontrolledStates.filter((s) => validKeys.has(s.key)),
    [uncontrolledStates, validKeys, isControlled],
  )

  // === 合并后的当前生效状态 ===
  // 受控分支要过一遍**互斥折叠**（#14e）：外部同时给了「单列排序器 + 多列排序器」的受控
  // sortOrder 时，首个激活的列定型模式，其余不符的列被置 null —— 对齐 antd
  // `useSorter.js:305-345`（`mergedSorterStates` 的 `validate`/`multipleMode` 环）。
  // 非受控分支不动（其互斥由点击逻辑 resetToSingle 保证，与参照 triggerSorter 同构）。
  // useMemo：折叠是纯函数，保持引用稳定（改前受控分支直接用 memo 过的 controlledStates）。
  const mergedStates: Array<SortState<RecordType>> = useMemo(
    () => (isControlled ? resolveControlledStatesExclusively(controlledStates) : prunedUncontrolled),
    [isControlled, controlledStates, prunedUncontrolled],
  )

  // === sortOrderMap（sort key → order）===
  const sortOrderMap = useMemo(() => {
    const map = new Map<string, SortOrder>()
    for (const s of mergedStates) {
      map.set(s.key, s.sortOrder)
    }
    return map
  }, [mergedStates])

  // === 是否处于多列模式（至少一列 multiplePriority 非 false）===
  const isMultipleMode = useMemo(
    () => mergedStates.some((s) => s.multiplePriority !== false),
    [mergedStates],
  )

  // === sortPriorityMap（多列模式下激活列的优先级序号；单列模式空）===
  // 编号方向对齐 antd `getSortData` 的实际优先级：multiple 大者优先
  // （`b.multiplePriority - a.multiplePriority` 降序应用 compare，multiple 大的先比 =
  // 主排序键 = 最高优先级）。故徽标编号 1 对应 multiple 最大（最高优先）的激活列，
  // 编号随 multiple 递减递增（如 multiple=3→1，multiple=2→2，multiple=1→3）。
  // 非多列（false）在多列模式下不会共存（triggerSorter 保证），这里把 false 当
  // +Infinity（最高优先级=编号 1）以保持语义一致。
  // — 详见 docs/features/interaction/filter-sorter.md（多列优先级叠加）
  const sortPriorityMap = useMemo(() => {
    const map = new Map<string, number>()
    if (!isMultipleMode) return map
    const active = mergedStates
      .filter((s) => s.sortOrder !== null)
      .slice()
      .sort((a, b) => {
        const pa = a.multiplePriority === false ? Infinity : a.multiplePriority
        const pb = b.multiplePriority === false ? Infinity : b.multiplePriority
        return pb - pa // multiple 降序：大的在前（编号 1）
      })
    active.forEach((s, i) => {
      map.set(s.key, i + 1)
    })
    return map
  }, [mergedStates, isMultipleMode])

  // === 前端排序（对齐 antd：受控/非受控都排序）===
  // antd `InternalTable.tsx`：`getSortData(rawData, mergedSorterStates, ...)` —— 受控与否都调，
  // mergedSorterStates 受控时取自外部 sortOrder、非受控时取自内部 state。受控仅表示"状态来源 +
  // onChange 通知"，不跳过数据处理。
  const sortedDataSource = useMemo(
    () => getSortData(dataSource, mergedStates),
    [dataSource, mergedStates],
  )

  // === activeColumnKey（取激活列中 multiple 最大的一个，即最高优先级）===
  const activeColumnKey = useMemo(() => {
    const active = mergedStates
      .filter((s) => s.sortOrder !== null)
      .slice()
      .sort((a, b) => {
        const pa = a.multiplePriority === false ? Infinity : a.multiplePriority
        const pb = b.multiplePriority === false ? Infinity : b.multiplePriority
        return pb - pa // multiple 降序：大的在前（最高优先级）
      })
    return active.length > 0 ? active[0]!.key : null
  }, [mergedStates])

  // === 点击循环 ===
  const onSorterClick = useCallback(
    (columnKey: string) => {
      // 找到目标列定义。
      const column = columns.find((c) => {
        const k = resolveColumnSortKey(c)
        return k !== undefined && String(k) === columnKey
      })
      if (!column || !isSortable(column)) return

      // 当前 mergedStates 中该列的状态（可能不存在——首次点击）。
      const existing = mergedStates.find((s) => s.key === columnKey)
      const currentOrder: SortOrder = existing ? existing.sortOrder : null
      // 排序方向循环：列级 → Table 级（`props.sortDirections`）→ 引擎默认。
      // 对齐 antd `useSorter.js:75`（`column.sortDirections || defaultSortDirections`，
      // 后者的默认值在 `InternalTable.js:223` 就是 ['ascend','descend']）。
      const directions = column.sortDirections ?? defaultSortDirections ?? DEFAULT_SORT_DIRECTIONS
      const nextOrder = nextSortDirection(directions, currentOrder)
      const priority = getMultiplePriority(column)

      // 计算新状态数组（对齐 antd triggerSorter）：
      //   - 单列排序器（priority === false），或当前 mergedStates 为空，或首个状态为单列
      //     → 重置为 [当前列]（清空所有其它）。
      //   - 多列 → 过滤掉当前列后追加新状态。
      const firstState = mergedStates[0]
      const resetToSingle =
        priority === false ||
        mergedStates.length === 0 ||
        (firstState !== undefined && firstState.multiplePriority === false)

      const newState: SortState<RecordType> = {
        column,
        key: columnKey,
        sortOrder: nextOrder,
        multiplePriority: priority,
      }

      let nextStates: Array<SortState<RecordType>>
      if (resetToSingle) {
        nextStates = [newState]
      } else {
        nextStates = [
          ...mergedStates.filter((s) => s.key !== columnKey),
          newState,
        ]
      }

      // 非受控：更新内部 state。
      if (!isControlled) {
        setUncontrolledStates(nextStates)
      }

      // 触发 onChange。
      if (onChange) {
        const sorter = generateSorterInfo(nextStates)
        // currentDataSource：按 nextStates 排序后的数据源（受控/非受控一致——对齐 antd
        // `triggerOnChange` 中 changeEventInfo.sorterStates → getSortData 的处理：onChange 里
        // currentDataSource 始终是按"本次交互后的 states"排序后的结果）。
        const currentDataSource = getSortData(dataSource, nextStates)
        // pagination 占位 `{}`：适配层包装 onChange 时会替换为实际分页状态，
        // useSorter 内部不持有分页态，故传占位（类型断言绕过——适配层忽略此参数）。
        // filters：取调用方注入的**当前**筛选状态（对齐 antd：排序动作的 onChange 同样带
        // changeEventInfo.filters）；未注入 getFilters（无筛选列/独立使用引擎）时回退 `{}`。
        onChange({} as TablePaginationState, getFilters?.() ?? {}, sorter, {
          currentDataSource,
          action: 'sort',
        })
      }
    },
    [columns, mergedStates, dataSource, onChange, getFilters, defaultSortDirections],
  )

  // === 当前 sorter 结果（useFilter 的 onFilterChange 注入 onChange.sorter 用）===
  // 与 onSorterClick 触发 onChange 时的 sorter 同款（generateSorterInfo 逻辑），但基于当前
  // mergedStates（而非"点击后的 nextStates"）。每次 mergedStates 变化时重算。
  const currentSorterResult = useMemo(
    () => generateSorterInfo(mergedStates),
    [mergedStates],
  )

  return {
    sortOrderMap,
    sortPriorityMap,
    activeColumnKey,
    sortedDataSource,
    onSorterClick,
    currentSorterResult,
  }
}

export { resolveColumnSortKey } from './columnKeys'
