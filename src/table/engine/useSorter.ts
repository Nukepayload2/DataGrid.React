/**
 * 排序状态机（单列 + 多列） — 详见 docs/design-notes/filter-sorter.md
 *
 * 维护 `SortState[]`（每可排序叶子列一条）；sortDirections 循环点击切换；多列按 multiple
 * 优先级叠加（稳定排序链）；受控/非受控都调 getSortData 排序；onChange 经 generateSorterInfo 分发。
 */

import { useCallback, useMemo, useState } from 'react'
import type {
  ColumnSorter,
  ColumnType,
  SorterResult,
  SortOrder,
  TableCurrentDataSource,
  TablePaginationState,
} from '../types'
import { resolveColumnSortKey } from './columnKeys'
import { getValueByDataIndex } from './recordAccess'

/** antd sortDirections 默认值。 */
const DEFAULT_SORT_DIRECTIONS: Array<'ascend' | 'descend'> = ['ascend', 'descend']

/** 内部排序状态（对齐 antd `SortState`）。 */
export interface SortState<RecordType> {
  /** 原始 antd 列定义。 */
  column: ColumnType<RecordType>
  /** 该列的稳定 sort key（column.key ?? dataIndex）。 */
  key: string
  /** 当前排序方向（'ascend'/'descend'/null）。 */
  sortOrder: SortOrder
  /**
   * 多列优先级。来自 `sorter.multiple`（number）——越大越优先。`false` 表示单列排序器。
   * — 详见 docs/design-notes/filter-sorter.md（排序状态模型/多列优先级叠加）
   */
  multiplePriority: number | false
}

/**
 * 判断某列是否可排序（sorter 为 truthy：true / 函数 / 对象）。
 */
export function isSortable<RecordType>(
  column: ColumnType<RecordType> | undefined,
): boolean {
  if (!column) return false
  const s = column.sorter
  return s === true || typeof s === 'function' || (typeof s === 'object' && s !== null)
}

/**
 * 取列的多列优先级（对齐 antd `getMultiplePriority`）。
 * `sorter` 为对象且 `multiple` 为 number → 返回 multiple；否则返回 `false`（非多列）。
 */
export function getMultiplePriority<RecordType>(
  column: ColumnType<RecordType>,
): number | false {
  const s = column.sorter
  if (s && typeof s === 'object' && typeof s.multiple === 'number') {
    return s.multiple
  }
  return false
}

/**
 * 从 column.sorter 提取比较函数。
 * - true：返回 null（标记为"用默认比较"，调用方按 dataIndex 字段值比较）。
 * - 函数：直接返回。
 * - 对象 `{ compare }`：返回 compare（可能为 undefined，等同于不可比较）。
 * - false/undefined：返回 undefined（不可排序）。
 */
function resolveCompareFn<RecordType>(
  sorter: ColumnSorter<RecordType> | undefined,
): ((a: RecordType, b: RecordType, sortOrder?: SortOrder) => number) | null | undefined {
  if (sorter === true) return null // 默认比较标志
  if (typeof sorter === 'function') return sorter
  if (sorter && typeof sorter === 'object') {
    return typeof sorter.compare === 'function' ? sorter.compare : undefined
  }
  return undefined
}

/**
 * 默认比较（sorter: true 时使用）。
 * 按字段值类型选择比较器：数值 `-`；字符串 `localeCompare`；其它 `<`/`>`。
 * 升序 ascend 直接用；降序 descend 反转（调用方处理，这里只给升序比较）。
 */
function defaultCompare<T>(a: T, b: T): number {
  if (a === b) return 0
  if (a === null || a === undefined) return -1
  if (b === null || b === undefined) return 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b)
  // 退化为字符串比较（布尔/对象等），保证总有序。
  const sa = String(a)
  const sb = String(b)
  return sa < sb ? -1 : sa > sb ? 1 : 0
}

/**
 * antd 同款 nextSortDirection：在 sortDirections 中循环当前 order。
 * - current 为 null → 取 sortDirections[0]。
 * - current 非 null → 取 indexOf(current)+1；越界（末尾）→ null（隐式回退）。
 */
function nextSortDirection(
  sortDirections: Array<'ascend' | 'descend'>,
  current: SortOrder,
): SortOrder {
  if (!current) {
    return sortDirections[0] ?? null
  }
  return sortDirections[sortDirections.indexOf(current) + 1] ?? null
}

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
    filters: Record<string, Array<string | number> | null>,
    sorter: SorterResult<RecordType> | Array<SorterResult<RecordType>>,
    extra: TableCurrentDataSource<RecordType>,
  ) => void
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
   * 单列模式下空 Map（不显示序号）。— 详见 docs/design-notes/filter-sorter.md（多列优先级叠加）
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
 * 收集所有可排序叶子列的初始状态（对齐 antd `collectSortStates`）。
 * - `init=true`（初始化）：受控列（带 sortOrder）+ 非受控 defaultSortOrder 均纳入。
 * - `init=false`（merged 计算）：仅纳入受控列；非受控由内部 state 维护。
 *
 * 适配层在构建列树时已过滤分组列，`columns` 入参均为叶子列（无 children）；故这里不递归 children。
 */
function collectSortStates<RecordType>(
  columns: Array<ColumnType<RecordType>>,
  init: boolean,
): Array<SortState<RecordType>> {
  const out: Array<SortState<RecordType>> = []
  columns.forEach((column) => {
    if (!isSortable(column)) return
    const key = resolveColumnSortKey(column)
    if (key === undefined) return
    const keyStr = String(key)
    const multiplePriority = getMultiplePriority(column)
    if (column.sortOrder !== undefined) {
      // 受控
      out.push({
        column,
        key: keyStr,
        sortOrder: column.sortOrder ?? null,
        multiplePriority,
      })
    } else if (init && column.defaultSortOrder !== undefined) {
      // 非受控初始
      out.push({
        column,
        key: keyStr,
        sortOrder: column.defaultSortOrder ?? null,
        multiplePriority,
      })
    }
  })
  return out
}

/**
 * 把一组 SortState 转为 onChange 的 sorter 结果（对齐 antd `generateSorterInfo`）。
 * - 0 激活：返回单对象（data-grid 简化：返回空对象 `{}`，与 antd `activeSorters[0] || {}` 一致）。
 * - 1 激活：返回单对象。
 * - >=2 激活：返回数组（按 multiple 升序）。
 *
 * 与 antd 的细微差异：antd 在"0 激活但有 sorterStates"时会回退一个 `{ column: undefined,
 * order: undefined, ... }` 的 legacy 对象；data-grid 简化为 `{}`（调用方判 `!sorter.order` 即可）。
 * — 详见 docs/design-notes/filter-sorter.md（onChange 分发）
 */
function generateSorterInfo<RecordType>(
  states: Array<SortState<RecordType>>,
): SorterResult<RecordType> | Array<SorterResult<RecordType>> {
  const active = states
    .filter((s) => s.sortOrder !== null)
    .slice()
    // 按 multiple 升序（multiple 越小优先级越高，排在前）；非多列（false）按 0 处理（最高）。
    .sort((a, b) => {
      const pa = a.multiplePriority === false ? 0 : a.multiplePriority
      const pb = b.multiplePriority === false ? 0 : b.multiplePriority
      return pa - pb
    })
    .map<SorterResult<RecordType>>((s) => ({
      column: s.column,
      order: s.sortOrder,
      field: s.column.dataIndex,
      columnKey: resolveColumnSortKey(s.column),
    }))
  if (active.length <= 1) {
    return active[0] ?? {}
  }
  return active
}

/**
 * 单值应用比较（升序/降序，descend 反转）。
 */
function applyCompare<RecordType>(
  compareFn:
    | ((a: RecordType, b: RecordType, sortOrder?: SortOrder) => number)
    | null
    | undefined,
  dataIndex: ColumnType<RecordType>['dataIndex'],
  a: RecordType,
  b: RecordType,
  sortOrder: SortOrder,
): number {
  let result: number
  if (compareFn === null) {
    // 默认比较（sorter: true）：按 dataIndex 字段值。
    result = defaultCompare(getValueByDataIndex(a, dataIndex), getValueByDataIndex(b, dataIndex))
  } else if (compareFn) {
    result = compareFn(a, b, sortOrder)
  } else {
    result = 0
  }
  return sortOrder === 'descend' ? -result : result
}

/**
 * 按 SortState[] 对 dataSource 排序（对齐 antd `getSortData`）。
 * 受控与否由调用方决定（本函数只管"给定 states + data → 排序后 data"）。
 */
function getSortData<RecordType>(
  data: Array<RecordType>,
  states: Array<SortState<RecordType>>,
): Array<RecordType> {
  // 按 multiplePriority 从大到小（即 multiple 大的先比较）；非多列（false）按 -Infinity 处理
  // → 排在最后比较（最高优先级）。与 antd `b.multiplePriority - a.multiplePriority` 对齐：
  //   antd 中非多列在多列场景下不会共存（triggerSorter 保证），所以 false 与 number 不混排；
  //   这里把 false 当 -Infinity（最末比较 = 最高优先级），单列场景下也只有一条 state，无影响。
  const ordered = states
    .slice()
    .sort((a, b) => {
      const pa = a.multiplePriority === false ? -Infinity : a.multiplePriority
      const pb = b.multiplePriority === false ? -Infinity : b.multiplePriority
      return pb - pa // 降序：大的在前
    })
    .filter(
      (s) =>
        s.sortOrder !== null &&
        resolveCompareFn(s.column.sorter) !== undefined,
    )
  if (ordered.length === 0) return data
  return [...data].sort((a, b) => {
    for (const s of ordered) {
      const r = applyCompare(
        resolveCompareFn(s.column.sorter),
        s.column.dataIndex,
        a,
        b,
        s.sortOrder,
      )
      if (r !== 0) return r
    }
    return 0
  })
}

/**
 * 排序状态机 hook（单列 + 多列）— 详见 docs/design-notes/filter-sorter.md
 */
export function useSorter<RecordType>(
  options: UseSorterOptions<RecordType>,
): UseSorterResult<RecordType> {
  const { columns, dataSource, onChange } = options

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
  const mergedStates: Array<SortState<RecordType>> = isControlled
    ? controlledStates
    : prunedUncontrolled

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
  // — 详见 docs/design-notes/filter-sorter.md（多列优先级叠加）
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
      const directions = column.sortDirections ?? DEFAULT_SORT_DIRECTIONS
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
        onChange({} as TablePaginationState, {}, sorter, {
          currentDataSource,
          action: 'sort',
        })
      }
    },
    [columns, mergedStates, dataSource, onChange],
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
