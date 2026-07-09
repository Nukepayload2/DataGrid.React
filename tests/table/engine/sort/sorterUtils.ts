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

  it('returns array sorted by multiple ascending when 2+ active', () => {
    const r = generateSorterInfo([
      state({ colKey: 'a', sortOrder: 'ascend', multiplePriority: 3 }),
      state({ colKey: 'b', sortOrder: 'descend', multiplePriority: 1 }),
      state({ colKey: 'c', sortOrder: null, multiplePriority: 5 }), // inactive, filtered
    ])
    expect(Array.isArray(r)).toBe(true)
    const arr = r as Array<SorterResult<Rec>>
    expect(arr.length).toBe(2)
    // multiple=1 排在前（升序）
    expect(arr[0]!.columnKey).toBe('b')
    expect(arr[1]!.columnKey).toBe('a')
  })

  it('treats false multiplePriority as 0 in sort', () => {
    const r = generateSorterInfo([
      state({ colKey: 'a', sortOrder: 'ascend', multiplePriority: 2 }),
      state({ colKey: 'b', sortOrder: 'descend', multiplePriority: false }),
    ]) as Array<SorterResult<Rec>>
    // false → 0，应排在 multiple=2 之前（升序）
    expect(arrColumnKeys(r)).toEqual(['b', 'a'])
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
