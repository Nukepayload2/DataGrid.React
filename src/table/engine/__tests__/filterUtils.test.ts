import { describe, expect, it } from 'vitest'
import type { ColumnFilterItem, ColumnType, FilterValue } from '../../types'
import {
  buildFiltersArg,
  computeFilteredDataSource,
  flattenFilterValues,
  isFilterable,
  normalizeFilteredValue,
} from '../filterUtils'

interface Rec {
  name: string
  age: number
  city: string
}

function col(partial: Partial<ColumnType<Rec>>): ColumnType<Rec> {
  return partial as ColumnType<Rec>
}

describe('filterUtils / isFilterable', () => {
  it('returns false for undefined column', () => {
    expect(isFilterable(undefined)).toBe(false)
  })

  it('returns true when filterDropdown is defined (non-null)', () => {
    expect(
      isFilterable(
        col({ dataIndex: 'name', filterDropdown: (() => null) as any }),
      ),
    ).toBe(true)
  })

  it('returns false when filterDropdown is null or undefined', () => {
    expect(isFilterable(col({ dataIndex: 'name', filterDropdown: null }))).toBe(false)
    expect(isFilterable(col({ dataIndex: 'name', filterDropdown: undefined }))).toBe(false)
  })

  it('returns true when filters is defined (including empty array)', () => {
    expect(isFilterable(col({ dataIndex: 'name', filters: [] }))).toBe(true)
    expect(
      isFilterable(
        col({ dataIndex: 'name', filters: [{ text: 'A', value: 'a' }] }),
      ),
    ).toBe(true)
  })

  it('returns true when only onFilter is a function (server mode fallback)', () => {
    expect(
      isFilterable(col({ dataIndex: 'name', onFilter: () => true })),
    ).toBe(true)
  })

  it('returns false when filters/onFilter/filterDropdown all absent', () => {
    expect(isFilterable(col({ dataIndex: 'name' }))).toBe(false)
  })
})

describe('filterUtils / flattenFilterValues', () => {
  it('flattens flat list of items', () => {
    const items: Array<ColumnFilterItem> = [
      { text: 'A', value: 'a' },
      { text: 'B', value: 'b' },
    ]
    expect(flattenFilterValues(items)).toEqual(['a', 'b'])
  })

  it('recursively flattens children', () => {
    const items: Array<ColumnFilterItem> = [
      {
        text: 'Parent',
        value: 'parent',
        children: [
          { text: 'C1', value: 'c1' },
          {
            text: 'C2',
            value: 'c2',
            children: [{ text: 'GC', value: 'gc' }],
          },
        ],
      },
      { text: 'Lonely', value: 'lonely' },
    ]
    expect(flattenFilterValues(items)).toEqual([
      'parent',
      'c1',
      'c2',
      'gc',
      'lonely',
    ])
  })

  it('returns empty array for empty input', () => {
    expect(flattenFilterValues([])).toEqual([])
  })

  it('handles items with empty children array', () => {
    const items: Array<ColumnFilterItem> = [
      { text: 'A', value: 'a', children: [] },
    ]
    expect(flattenFilterValues(items)).toEqual(['a'])
  })
})

describe('filterUtils / normalizeFilteredValue', () => {
  it('returns empty for null/undefined/empty', () => {
    expect(normalizeFilteredValue(null)).toEqual([])
    expect(normalizeFilteredValue(undefined)).toEqual([])
    expect(normalizeFilteredValue([])).toEqual([])
  })

  it('returns same array when no duplicates', () => {
    expect(normalizeFilteredValue(['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
  })

  it('removes duplicates while preserving order', () => {
    expect(normalizeFilteredValue(['a', 'b', 'a', 'c', 'b'])).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('handles numeric values', () => {
    expect(normalizeFilteredValue([1, 2, 1, 3])).toEqual([1, 2, 3])
  })
})

describe('filterUtils / computeFilteredDataSource', () => {
  const data: Array<Rec> = [
    { name: 'alice', age: 25, city: 'ny' },
    { name: 'bob', age: 30, city: 'la' },
    { name: 'carol', age: 25, city: 'ny' },
    { name: 'dave', age: 35, city: 'sf' },
  ]

  it('returns data unchanged when no filterable columns', () => {
    const filteredValueMap = new Map<string, Array<FilterValue>>()
    expect(computeFilteredDataSource(data, [], filteredValueMap)).toBe(data)
  })

  it('returns data unchanged when filteredValueMap is empty', () => {
    const cols = [
      col({
        key: 'city',
        dataIndex: 'city',
        onFilter: (v: FilterValue, r: Rec) => r.city === v,
      }),
    ]
    const filteredValueMap = new Map<string, Array<FilterValue>>()
    expect(computeFilteredDataSource(data, cols, filteredValueMap)).toBe(data)
  })

  it('filters with OR within a column (any value matches)', () => {
    const cols = [
      col({
        key: 'city',
        dataIndex: 'city',
        onFilter: (v: FilterValue, r: Rec) => r.city === v,
      }),
    ]
    const filteredValueMap = new Map([['city', ['ny', 'la']]])
    const r = computeFilteredDataSource(data, cols, filteredValueMap)
    expect(r.map((x) => x.name)).toEqual(['alice', 'bob', 'carol'])
  })

  it('filters with AND across columns (every column matches)', () => {
    const cols = [
      col({
        key: 'city',
        dataIndex: 'city',
        onFilter: (v: FilterValue, r: Rec) => r.city === v,
      }),
      col({
        key: 'age',
        dataIndex: 'age',
        onFilter: (v: FilterValue, r: Rec) => String(r.age) === String(v),
      }),
    ]
    const filteredValueMap = new Map<string, Array<FilterValue>>([
      ['city', ['ny']],
      ['age', [25]],
    ])
    const r = computeFilteredDataSource(data, cols, filteredValueMap)
    expect(r.map((x) => x.name)).toEqual(['alice', 'carol'])
  })

  it('skips column with empty filteredValue', () => {
    const cols = [
      col({
        key: 'city',
        dataIndex: 'city',
        onFilter: (v: FilterValue, r: Rec) => r.city === v,
      }),
      col({
        key: 'age',
        dataIndex: 'age',
        onFilter: (v: FilterValue, r: Rec) => String(r.age) === String(v),
      }),
    ]
    const filteredValueMap = new Map<string, Array<FilterValue>>([
      ['city', []], // skipped
      ['age', [30]],
    ])
    const r = computeFilteredDataSource(data, cols, filteredValueMap)
    expect(r.map((x) => x.name)).toEqual(['bob'])
  })

  it('skips column without onFilter (server mode)', () => {
    const cols = [
      col({
        key: 'city',
        dataIndex: 'city',
        filters: [{ text: 'NY', value: 'ny' }],
        // no onFilter — server mode
      }),
      col({
        key: 'age',
        dataIndex: 'age',
        onFilter: (v: FilterValue, r: Rec) => String(r.age) === String(v),
      }),
    ]
    const filteredValueMap = new Map<string, Array<FilterValue>>([
      ['city', ['ny']], // no onFilter → skipped
      ['age', [25]],
    ])
    const r = computeFilteredDataSource(data, cols, filteredValueMap)
    expect(r.map((x) => x.name)).toEqual(['alice', 'carol'])
  })

  it('returns data unchanged when all columns have empty values', () => {
    const cols = [
      col({
        key: 'city',
        dataIndex: 'city',
        onFilter: (v: FilterValue, r: Rec) => r.city === v,
      }),
    ]
    const filteredValueMap = new Map<string, Array<FilterValue>>([['city', []]])
    expect(computeFilteredDataSource(data, cols, filteredValueMap)).toBe(data)
  })

  it('handles boolean FilterValue (passes value through to onFilter)', () => {
    // FilterValue = boolean | React.Key; boolean path
    const cols = [
      col({
        key: 'city',
        dataIndex: 'city',
        onFilter: (v: FilterValue, r: Rec) =>
          v === true ? r.city === 'ny' : false,
      }),
    ]
    const filteredValueMap = new Map<string, Array<FilterValue>>([
      ['city', [true]],
    ])
    const r = computeFilteredDataSource(data, cols, filteredValueMap)
    expect(r.map((x) => x.name)).toEqual(['alice', 'carol'])
  })

  it('skips column without filterKey (no key/dataIndex)', () => {
    const cols = [
      col({
        // no key/dataIndex
        onFilter: (v: FilterValue, r: Rec) => r.city === v,
      }),
      col({
        key: 'age',
        dataIndex: 'age',
        onFilter: (v: FilterValue, r: Rec) => String(r.age) === String(v),
      }),
    ]
    const filteredValueMap = new Map<string, Array<FilterValue>>([
      ['age', [25]],
    ])
    const r = computeFilteredDataSource(data, cols, filteredValueMap)
    expect(r.map((x) => x.name)).toEqual(['alice', 'carol'])
  })
})

describe('filterUtils / buildFiltersArg', () => {
  it('produces null for columns with no active value', () => {
    const cols = [
      col({ key: 'city', dataIndex: 'city', onFilter: () => true }),
      col({ key: 'age', dataIndex: 'age', onFilter: () => true }),
    ]
    const map = new Map<string, Array<FilterValue>>([
      ['city', []],
      ['age', []],
    ])
    expect(buildFiltersArg(cols, map)).toEqual({
      city: null,
      age: null,
    })
  })

  it('produces the value array for active columns', () => {
    const cols = [
      col({ key: 'city', dataIndex: 'city', onFilter: () => true }),
      col({ key: 'age', dataIndex: 'age', onFilter: () => true }),
    ]
    const map = new Map<string, Array<FilterValue>>([
      ['city', ['ny']],
      ['age', []],
    ])
    expect(buildFiltersArg(cols, map)).toEqual({
      city: ['ny'],
      age: null,
    })
  })

  it('skips columns without filterKey', () => {
    const cols = [
      col({ onFilter: () => true }), // no key
      col({ key: 'age', dataIndex: 'age', onFilter: () => true }),
    ]
    const map = new Map<string, Array<FilterValue>>([['age', [25]]])
    expect(buildFiltersArg(cols, map)).toEqual({ age: [25] })
  })

  it('returns empty object for empty filterableColumns', () => {
    expect(buildFiltersArg([], new Map())).toEqual({})
  })
})
