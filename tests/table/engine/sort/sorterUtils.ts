import { describe, expect, it } from 'vitest'
import type { ColumnType, SorterResult } from '../../../../src/table/types'
import {
  DEFAULT_SORT_DIRECTIONS,
  applyCompare,
  collectSortStates,
  defaultCompare,
  generateSorterInfo,
  getMultiplePriority,
  getSortData,
  isSortable,
  nextSortDirection,
  resolveCompareFn,
  resolveControlledStatesExclusively,
} from '../../../../src/table/engine/sorterUtils'
import type { SortState } from '../../../../src/table/engine/sorterUtils'

interface Rec {
  name: string
  age: number
}

function col(partial: Partial<ColumnType<Rec>>): ColumnType<Rec> {
  return partial as ColumnType<Rec>
}

describe('sorterUtils / isSortable', () => {
  it('returns false for undefined column', () => {
    expect(isSortable(undefined)).toBe(false)
  })

  it('returns false when sorter is missing/false', () => {
    expect(isSortable(col({ dataIndex: 'name' }))).toBe(false)
    expect(isSortable(col({ dataIndex: 'name', sorter: false }))).toBe(false)
  })

  it('returns true for sorter true/function/object', () => {
    expect(isSortable(col({ dataIndex: 'name', sorter: true }))).toBe(true)
    expect(
      isSortable(col({ dataIndex: 'name', sorter: () => 0 })),
    ).toBe(true)
    expect(
      isSortable(col({ dataIndex: 'name', sorter: { multiple: 2 } })),
    ).toBe(true)
  })
})

describe('sorterUtils / getMultiplePriority', () => {
  it('returns multiple when sorter is object with numeric multiple', () => {
    expect(
      getMultiplePriority(col({ dataIndex: 'name', sorter: { multiple: 3 } })),
    ).toBe(3)
  })

  it('returns false for true/function/missing/object-without-multiple', () => {
    expect(
      getMultiplePriority(col({ dataIndex: 'name', sorter: true })),
    ).toBe(false)
    expect(
      getMultiplePriority(
        col({ dataIndex: 'name', sorter: () => 0 }),
      ),
    ).toBe(false)
    expect(getMultiplePriority(col({ dataIndex: 'name' }))).toBe(false)
    expect(
      getMultiplePriority(
        col({ dataIndex: 'name', sorter: { compare: () => 0 } }),
      ),
    ).toBe(false)
  })
})

describe('sorterUtils / resolveCompareFn', () => {
  it('returns null for sorter=true (default compare marker)', () => {
    expect(resolveCompareFn(true)).toBe(null)
  })

  it('returns function for sorter=function', () => {
    const fn = () => 0
    expect(resolveCompareFn(fn)).toBe(fn)
  })

  it('returns compare from object sorter', () => {
    const compare = () => 0
    expect(resolveCompareFn({ compare })).toBe(compare)
  })

  it('returns undefined when object sorter lacks compare', () => {
    expect(resolveCompareFn({ multiple: 2 })).toBe(undefined)
  })

  it('returns undefined for false/undefined', () => {
    expect(resolveCompareFn(false)).toBe(undefined)
    expect(resolveCompareFn(undefined)).toBe(undefined)
  })
})

describe('sorterUtils / defaultCompare', () => {
  it('returns 0 for equal values', () => {
    expect(defaultCompare(1, 1)).toBe(0)
    expect(defaultCompare('a', 'a')).toBe(0)
  })

  it('handles null/undefined as smallest', () => {
    expect(defaultCompare(null, 1)).toBe(-1)
    expect(defaultCompare(undefined, 1)).toBe(-1)
    expect(defaultCompare(1, null)).toBe(1)
    expect(defaultCompare(1, undefined)).toBe(1)
  })

  it('compares numbers by subtraction', () => {
    expect(defaultCompare(2, 5)).toBe(-3)
    expect(defaultCompare(5, 2)).toBe(3)
  })

  it('compares strings via localeCompare', () => {
    expect(defaultCompare('a', 'b')).toBeLessThan(0)
    expect(defaultCompare('b', 'a')).toBeGreaterThan(0)
  })

  it('falls back to String comparison for other types', () => {
    expect(defaultCompare(true, false)).toBe(1)
    expect(defaultCompare(false, true)).toBe(-1)
  })
})

describe('sorterUtils / nextSortDirection', () => {
  it('returns first direction when current is null', () => {
    expect(nextSortDirection(['ascend', 'descend'], null)).toBe('ascend')
  })

  it('cycles through directions', () => {
    expect(nextSortDirection(['ascend', 'descend'], 'ascend')).toBe('descend')
  })

  it('returns null past the end', () => {
    expect(nextSortDirection(['ascend', 'descend'], 'descend')).toBe(null)
  })

  it('uses DEFAULT_SORT_DIRECTIONS = ascend,descend', () => {
    expect(DEFAULT_SORT_DIRECTIONS).toEqual(['ascend', 'descend'])
  })

  it('returns first direction when current not in array (indexOf=-1 → +1=0)', () => {
    // current='descend' not in ['ascend'] → indexOf=-1 → +1=0 → returns sortDirections[0]
    expect(nextSortDirection(['ascend'], 'descend')).toBe('ascend')
  })
})

describe('sorterUtils / collectSortStates', () => {
  it('collects controlled states (sortOrder defined) when init=false', () => {
    const cols = [
      col({ key: 'a', sorter: true, sortOrder: 'ascend' }),
      col({ key: 'b', sorter: true, defaultSortOrder: 'descend' }),
    ]
    const states = collectSortStates(cols, false)
    expect(states.length).toBe(1)
    expect(states[0]!.key).toBe('a')
    expect(states[0]!.sortOrder).toBe('ascend')
  })

  it('collects both controlled and default when init=true', () => {
    const cols = [
      col({ key: 'a', sorter: true, sortOrder: 'ascend' }),
      col({ key: 'b', sorter: true, defaultSortOrder: 'descend' }),
      col({ key: 'c', sorter: true }),
    ]
    const states = collectSortStates(cols, true)
    expect(states.length).toBe(2)
    expect(states.map((s) => s.key)).toEqual(['a', 'b'])
  })

  it('skips non-sortable columns', () => {
    const cols = [
      col({ key: 'a', sortOrder: 'ascend' }), // no sorter
      col({ key: 'b', sorter: true }),
    ]
    const states = collectSortStates(cols, true)
    expect(states.length).toBe(0)
  })

  it('skips columns where sortOrder === undefined (only collects controlled with explicit sortOrder)', () => {
    // column.sortOrder !== undefined gates collection; undefined sortOrder → not collected
    const cols = [col({ key: 'a', sorter: true, sortOrder: undefined })]
    const states = collectSortStates(cols, false)
    expect(states.length).toBe(0)
  })

  it('normalizes null sortOrder (explicit controlled null)', () => {
    const cols = [col({ key: 'a', sorter: true, sortOrder: null })]
    const states = collectSortStates(cols, false)
    expect(states[0]!.sortOrder).toBe(null)
  })

  it('detects multiple priority', () => {
    const cols = [
      col({ key: 'a', sorter: { multiple: 2 }, sortOrder: 'ascend' }),
    ]
    const states = collectSortStates(cols, false)
    expect(states[0]!.multiplePriority).toBe(2)
  })

  it('uses false multiplePriority for plain sorter', () => {
    const cols = [col({ key: 'a', sorter: true, sortOrder: 'ascend' })]
    const states = collectSortStates(cols, false)
    expect(states[0]!.multiplePriority).toBe(false)
  })
})

// 23-B 第 4 条（工单点名补的白盒层，步骤 58 新增；来源＝分母「数量增加」声明）。
// 逐行对照 antd 6.4.4 `es/table/hooks/useSorter.js:305-345` 的 `validate`/`multipleMode` 环。
describe('sorterUtils / resolveControlledStatesExclusively', () => {
  function st(
    key: string,
    sortOrder: SortState<Rec>['sortOrder'],
    multiplePriority: number | false,
  ): SortState<Rec> {
    return {
      column: col({ key, dataIndex: key, sorter: true }),
      key,
      sortOrder,
      multiplePriority,
    }
  }
  const orders = (states: Array<SortState<Rec>>) =>
    states.map((s) => `${s.key}:${s.sortOrder}`)

  it('keeps every state when all controlled columns are multiple sorters', () => {
    // 参照：multipleMode 定型为 true 后，`multiplePriority !== false` 的列一律原样保留。
    expect(
      orders(
        resolveControlledStatesExclusively([
          st('a', 'ascend', 3),
          st('b', 'descend', 2),
          st('c', 'ascend', 1),
        ]),
      ),
    ).toEqual(['a:ascend', 'b:descend', 'c:ascend'])
  })

  it('nulls later controlled states after an active single-column sorter decides the mode', () => {
    // 参照：首个激活列是单列排序器 ⇒ `validate = false`，其后受控列被 patch 成 sortOrder null。
    expect(
      orders(
        resolveControlledStatesExclusively([
          st('a', 'ascend', false),
          st('b', 'ascend', 3),
          st('c', 'descend', 2),
        ]),
      ),
    ).toEqual(['a:ascend', 'b:null', 'c:null'])
  })

  it('does not let an un-activated first column decide the mode', () => {
    // 参照：`multipleMode === null` 分支里"先 patch 再判"，且 order 为 null 的列**不改判定**
    // ⇒ 首个 sortOrder:null 的单列 + 后续多列仍按多列共存。
    expect(
      orders(
        resolveControlledStatesExclusively([
          st('a', null, false),
          st('b', 'ascend', 3),
          st('c', 'descend', 2),
        ]),
      ),
    ).toEqual(['a:null', 'b:ascend', 'c:descend'])
  })

  it('nulls the single-column sorter that arrives after multiple mode is decided', () => {
    // 参照 `:338-341` 的 else 分支：**先** `validate = false` **再** patch ⇒ 该单列自己也被置 null。
    expect(
      orders(
        resolveControlledStatesExclusively([
          st('a', 'ascend', 3),
          st('b', 'ascend', 2),
          st('c', 'descend', false),
        ]),
      ),
    ).toEqual(['a:ascend', 'b:ascend', 'c:null'])
  })

  it('is pure: neither the input array nor its state objects are rewritten', () => {
    // 纯函数门：被置 null 的条目是**浅拷贝**，原对象不被改写（否则受控列的 props 会被污染）。
    const input = [st('a', 'ascend', false), st('b', 'descend', 3)]
    const snapshot = input.map((s) => ({ key: s.key, sortOrder: s.sortOrder }))
    const out = resolveControlledStatesExclusively(input)
    expect(out).not.toBe(input)
    expect(input.map((s) => ({ key: s.key, sortOrder: s.sortOrder }))).toEqual(snapshot)
    expect(out[1]).not.toBe(input[1]) // 被 patch 的那条是新对象
    expect(out[0]).toBe(input[0]) // 未被 patch 的那条保持引用
  })

  it('returns an empty array for empty states', () => {
    expect(resolveControlledStatesExclusively([])).toEqual([])
  })
})

describe('sorterUtils / generateSorterInfo', () => {
  function state(overrides: Partial<SortState<Rec>> & { colKey?: string }): SortState<Rec> {
    const colKey = overrides.colKey ?? 'name'
    const { colKey: _ignored, ...rest } = overrides
    return {
      column: col({ key: colKey, dataIndex: colKey }),
      key: colKey,
      sortOrder: 'ascend',
      multiplePriority: false,
      ...rest,
    }
  }

  it('returns empty object when no active states', () => {
    expect(generateSorterInfo([state({ sortOrder: null })])).toEqual({})
  })

  it('returns single object when one active', () => {
    const r = generateSorterInfo([state({ sortOrder: 'ascend' })]) as SorterResult<Rec>
    expect(Array.isArray(r)).toBe(false)
    expect((r as SorterResult<Rec>).order).toBe('ascend')
    expect((r as SorterResult<Rec>).columnKey).toBe('name')
  })

  it('returns active states in **states order** when 2+ active (reference parity 23-B)', () => {
    // 参照 antd 6.4.4 `es/table/hooks/useSorter.js:216-239`：`generateSorterInfo` 用
    // `sorterStates.reduce` 按 states **原序**收集激活项，**没有**任何按 multiple 的二次排序。
    // 本仓改前额外 `.sort((a,b)=>pa-pb)`（multiple 升序）⇒ 与参照顺序相反 ⇒ 本条从
    // 「multiple=1 排在前」改写为「states 序排在前」（分叉读数见
    // `tmp/vortex-logs/fix-real-bugs/58-implementer-bat23-23a-23b.md` §5）。
    const r = generateSorterInfo([
      state({ colKey: 'a', sortOrder: 'ascend', multiplePriority: 3 }),
      state({ colKey: 'b', sortOrder: 'descend', multiplePriority: 1 }),
      state({ colKey: 'c', sortOrder: null, multiplePriority: 5 }), // inactive, filtered
    ])
    expect(Array.isArray(r)).toBe(true)
    const arr = r as Array<SorterResult<Rec>>
    expect(arr.length).toBe(2)
    // states 原序：a 在 b 前（**不再**因为 b 的 multiple 小而提前）
    expect(arr.map((x) => x.columnKey)).toEqual(['a', 'b'])
  })

  it('ignores multiplePriority when ordering the sorter array (reference parity 23-B)', () => {
    // 同上一条的对照：`false`（非多列）也不再被当成 0 提到最前 —— 产出序只跟 states。
    // 旧实现把 false 当 0 ⇒ 给出 ['b','a']，与参照的 states 序 ['a','b'] 分叉。
    const r = generateSorterInfo([
      state({ colKey: 'a', sortOrder: 'ascend', multiplePriority: 2 }),
      state({ colKey: 'b', sortOrder: 'descend', multiplePriority: false }),
    ]) as Array<SorterResult<Rec>>
    expect(arrColumnKeys(r)).toEqual(['a', 'b'])
  })

  it('keeps relative order of survivors when a middle state is inactive', () => {
    // 退化形状：中间一条 sortOrder=null ⇒ 只是"少一条"，其余相对序＝states 原序。
    // a 的 multiple(3) 大于 c 的(2) ⇒ 旧实现在这里同样会翻面成 ['c','a']，本条也是活门。
    const r = generateSorterInfo([
      state({ colKey: 'a', sortOrder: 'descend', multiplePriority: 3 }),
      state({ colKey: 'b', sortOrder: null, multiplePriority: 9 }),
      state({ colKey: 'c', sortOrder: 'ascend', multiplePriority: 2 }),
    ]) as Array<SorterResult<Rec>>
    expect(arrColumnKeys(r)).toEqual(['a', 'c'])
    expect(r.map((x) => x.order)).toEqual(['descend', 'ascend'])
  })
})

function arrColumnKeys(arr: Array<SorterResult<Rec>>): Array<string | number> {
  return arr.map((r) => r.columnKey as string)
}

describe('sorterUtils / applyCompare', () => {
  it('uses default compare when compareFn is null', () => {
    const a: Rec = { name: 'bob', age: 1 }
    const b: Rec = { name: 'alice', age: 2 }
    expect(applyCompare(null, 'name', a, b, 'ascend')).toBeGreaterThan(0)
    expect(applyCompare(null, 'name', a, b, 'descend')).toBeLessThan(0)
  })

  it('uses custom compareFn', () => {
    const a: Rec = { name: 'a', age: 5 }
    const b: Rec = { name: 'b', age: 1 }
    const cmp = (x: Rec, y: Rec) => x.age - y.age
    expect(applyCompare(cmp, 'name', a, b, 'ascend')).toBe(4)
    expect(applyCompare(cmp, 'name', a, b, 'descend')).toBe(-4)
  })

  it('returns 0 when compareFn undefined', () => {
    expect(applyCompare(undefined, 'name', {} as Rec, {} as Rec, 'ascend')).toBe(0)
  })
})

describe('sorterUtils / getSortData', () => {
  const data: Array<Rec> = [
    { name: 'charlie', age: 30 },
    { name: 'alice', age: 25 },
    { name: 'bob', age: 28 },
  ]

  it('returns data unchanged when no states', () => {
    expect(getSortData(data, [])).toBe(data)
  })

  it('sorts ascending by default compare', () => {
    const states: Array<SortState<Rec>> = [
      {
        column: col({ key: 'name', dataIndex: 'name', sorter: true }),
        key: 'name',
        sortOrder: 'ascend',
        multiplePriority: false,
      },
    ]
    const r = getSortData(data, states)
    expect(r.map((x) => x.name)).toEqual(['alice', 'bob', 'charlie'])
  })

  it('sorts descending by reversing', () => {
    const states: Array<SortState<Rec>> = [
      {
        column: col({ key: 'name', dataIndex: 'name', sorter: true }),
        key: 'name',
        sortOrder: 'descend',
        multiplePriority: false,
      },
    ]
    const r = getSortData(data, states)
    expect(r.map((x) => x.name)).toEqual(['charlie', 'bob', 'alice'])
  })

  it('does not mutate original data', () => {
    const states: Array<SortState<Rec>> = [
      {
        column: col({ key: 'name', dataIndex: 'name', sorter: true }),
        key: 'name',
        sortOrder: 'ascend',
        multiplePriority: false,
      },
    ]
    const r = getSortData(data, states)
    expect(r).not.toBe(data)
    expect(data[0]!.name).toBe('charlie') // original untouched
  })

  it('multi-column: stable chain applies by multiple desc', () => {
    // tie on first sort key, break by second
    const tied: Array<Rec & { city: string }> = [
      { name: 'a', age: 1, city: 'ny' },
      { name: 'a', age: 2, city: 'la' },
      { name: 'a', age: 3, city: 'sf' },
    ]
    const tiedCols = tied as unknown as Array<Rec>
    const states: Array<SortState<Rec>> = [
      {
        column: col({ key: 'age', dataIndex: 'age', sorter: { multiple: 1 } }),
        key: 'age',
        sortOrder: 'ascend',
        multiplePriority: 1,
      },
      {
        column: col({ key: 'name', dataIndex: 'name', sorter: { multiple: 2 } }),
        key: 'name',
        sortOrder: 'ascend',
        multiplePriority: 2,
      },
    ]
    const r = getSortData(tiedCols, states)
    // multiple=2 (name) 先比较 → 全 'a' tie，再 multiple=1 (age) 升序
    expect((r as Array<Rec & { city: string }>).map((x) => x.city)).toEqual([
      'ny',
      'la',
      'sf',
    ])
  })

  it('skips states with sortOrder=null', () => {
    const states: Array<SortState<Rec>> = [
      {
        column: col({ key: 'name', dataIndex: 'name', sorter: true }),
        key: 'name',
        sortOrder: null,
        multiplePriority: false,
      },
    ]
    expect(getSortData(data, states)).toBe(data)
  })

  it('skips states with undefined compare (object sorter without compare)', () => {
    const states: Array<SortState<Rec>> = [
      {
        column: col({ key: 'name', dataIndex: 'name', sorter: { multiple: 1 } }),
        key: 'name',
        sortOrder: 'ascend',
        multiplePriority: 1,
      },
    ]
    expect(getSortData(data, states)).toBe(data)
  })
})
