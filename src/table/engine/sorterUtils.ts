/**
 * 排序算法纯函数簇 — 详见 docs/features/interaction/filter-sorter.md
 *
 * 从 useSorter.ts 抽出的模块级纯函数：判定可排序/优先级、比较函数解析、默认比较、
 * sortDirections 循环、状态收集、onChange sorter 结果生成、按 SortState[] 排序数据。
 *
 * 全部为纯函数（不依赖 hook state/setter），可独立单测。useSorter 仅做 import 替换。
 */

import type {
  ColumnSorter,
  ColumnType,
  SorterResult,
  SortOrder,
} from '../types'
import { resolveColumnSortKey } from './columnKeys'
import { getValueByDataIndex } from './recordAccess'

/** antd sortDirections 默认值。 */
export const DEFAULT_SORT_DIRECTIONS: Array<'ascend' | 'descend'> = ['ascend', 'descend']

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
   * — 详见 docs/features/interaction/filter-sorter.md（排序状态模型/多列优先级叠加）
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
export function resolveCompareFn<RecordType>(
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
export function defaultCompare<T>(a: T, b: T): number {
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
export function nextSortDirection(
  sortDirections: Array<'ascend' | 'descend'>,
  current: SortOrder,
): SortOrder {
  if (!current) {
    return sortDirections[0] ?? null
  }
  return sortDirections[sortDirections.indexOf(current) + 1] ?? null
}

/**
 * 收集所有可排序叶子列的初始状态（对齐 antd `collectSortStates`）。
 * - `init=true`（初始化）：受控列（带 sortOrder）+ 非受控 defaultSortOrder 均纳入。
 * - `init=false`（merged 计算）：仅纳入受控列；非受控由内部 state 维护。
 *
 * 适配层在构建列树时已过滤分组列，`columns` 入参均为叶子列（无 children）；故这里不递归 children。
 */
export function collectSortStates<RecordType>(
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
 * 受控排序状态的**互斥折叠**（逐字移植 antd `useSorter.js:305-345` 的 `validate`/`multipleMode` 环）。
 *
 * 背景：antd 的 `mergedSorterStates` 在「受控列 collectedStates 非空」时不是照收外部
 * `column.sortOrder`，而是按列顺序走一遍状态机——**首个激活的受控列定型排序模式**，
 * 与该模式不符的后续受控列一律被置 `sortOrder: null`：
 *   1. `validate` 初值 true；`patchStates(s)` 在 `validate` 已为 false 时 push
 *      `{ ...s, sortOrder: null }`（不改入参对象）。
 *   2. 尚未定型（`multipleMode === null`）的列：**先 patch 再判** ⇒ 该条永远原样保留。
 *      若它带激活 order：单列排序器（`multiplePriority === false`）⇒ `validate = false`
 *      （其后所有受控列被置 null）；多列排序器 ⇒ `multipleMode = true`。
 *      未激活（order 为 null）的列不改判定（所以「首个 `sortOrder: null` 的单列 + 后续多列」
 *      仍按多列共存，实测与参照同读数）。
 *   3. 已定型为多列后：`multiplePriority !== false` 的列继续原样保留；遇到单列排序器
 *      ⇒ 先 `validate = false` 再 patch ⇒ **该单列自己也被置 null**。
 *
 * 口径说明：
 *   - `multipleMode` 只会被赋 `true`（永不赋 `false`），参照那句
 *     `else if (multipleMode && state.multiplePriority !== false)` 等价于只判后半；此处保留
 *     同样的两段写法，便于与参照逐行对照。
 *   - 纯多列受控（每列都带 `sorter.multiple`）折叠后**全部保留**（验收要求：不许打回单列）。
 *   - 纯函数：只读 `states`，返回新数组（被置 null 的条目是浅拷贝，原对象不被改写）。
 *
 * **只在受控分支调用**（非受控的互斥由 `useSorter` 的点击逻辑 `resetToSingle` 保证，
 * 与参照 `triggerSorter`（`useSorter.js:360-370`）同构）。
 */
export function resolveControlledStatesExclusively<RecordType>(
  states: Array<SortState<RecordType>>,
): Array<SortState<RecordType>> {
  const out: Array<SortState<RecordType>> = []
  let validate = true
  let multipleMode: boolean | null = null

  const patchStates = (state: SortState<RecordType>) => {
    out.push(validate ? state : { ...state, sortOrder: null })
  }

  for (const state of states) {
    if (multipleMode === null) {
      patchStates(state)
      if (state.sortOrder) {
        if (state.multiplePriority === false) {
          validate = false
        } else {
          multipleMode = true
        }
      }
    } else if (multipleMode && state.multiplePriority !== false) {
      patchStates(state)
    } else {
      validate = false
      patchStates(state)
    }
  }

  return out
}

/**
 * 把一组 SortStates 转为 onChange 的 sorter 结果（对齐 antd `generateSorterInfo`）。
 * - 0 激活：返回单对象（data-grid 简化：返回空对象 `{}`，与 antd `activeSorters[0] || {}` 一致）。
 * - 1 激活：返回单对象。
 * - >=2 激活：返回数组（**states 原序**）。
 *
 * ⚠️ 顺序语义（BAT-23 23-B 修正）：产出数组的元素顺序**等于入参 `states` 的顺序**，
 * 这里**不做任何二次排序**。参照 antd 6.4.4 `es/table/hooks/useSorter.js:216-239` 就是
 * `sorterStates.reduce` 原序收集激活项；而 states 自身的顺序由上游决定：
 *   - 非受控：`useSorter.onSorterClick`（对齐参照 `triggerSorter` `:360-372`）把被点列**搬到末尾**
 *     ⇒ 产出序 = 点击序。
 *   - 受控：`collectSortStates` + `resolveControlledStatesExclusively` 按列定义序产出 ⇒ 产出序 = 列定义序。
 * 改前此处多了一步「按 `sorter.multiple` 升序排」，与参照**集合相同、顺序可能不同**
 * （实测分叉见 tmp/vortex-logs/fix-real-bugs/58-implementer-bat23-23a-23b.md §5）。
 *
 * 与 antd 的细微差异：antd 在"0 激活但有 sorterStates"时会回退一个 `{ column: undefined,
 * order: undefined, ... }` 的 legacy 对象；data-grid 简化为 `{}`（调用方判 `!sorter.order` 即可）。
 * — 详见 docs/features/interaction/filter-sorter.md（onChange 分发）
 */
export function generateSorterInfo<RecordType>(
  states: Array<SortState<RecordType>>,
): SorterResult<RecordType> | Array<SorterResult<RecordType>> {
  const active = states
    .filter((s) => s.sortOrder !== null)
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
export function applyCompare<RecordType>(
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
export function getSortData<RecordType>(
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
