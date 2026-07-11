import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useFilter } from '../../../../src/table/engine/useFilter'
import type { ColumnType, FilterValue } from '../../../../src/table/types'

interface Rec {
  name: string
  age: number
  city: string
}

const data: Array<Rec> = [
  { name: 'alice', age: 25, city: 'ny' },
  { name: 'bob', age: 30, city: 'la' },
  { name: 'carol', age: 25, city: 'ny' },
  { name: 'dave', age: 35, city: 'sf' },
]

function col(partial: Partial<ColumnType<Rec>>): ColumnType<Rec> {
  return partial as ColumnType<Rec>
}

function cityColumn(partial: Partial<ColumnType<Rec>> = {}): ColumnType<Rec> {
  return col({
    key: 'city',
    dataIndex: 'city',
    filters: [
      { text: 'NY', value: 'ny' },
      { text: 'LA', value: 'la' },
    ],
    onFilter: (value: FilterValue, record: Rec) => record.city === value,
    ...partial,
  })
}

function ageColumn(partial: Partial<ColumnType<Rec>> = {}): ColumnType<Rec> {
  return col({
    key: 'age',
    dataIndex: 'age',
    filters: [
      { text: '25', value: 25 },
      { text: '30', value: 30 },
    ],
    onFilter: (value: FilterValue, record: Rec) => record.age === value,
    ...partial,
  })
}

function names(rows: Array<Rec>): Array<string> {
  return rows.map((row) => row.name)
}

describe('useFilter', () => {
  it('applies uncontrolled defaultFilteredValue on initial mount', () => {
    const { result } = renderHook(() =>
      useFilter<Rec>({
        columns: [cityColumn({ defaultFilteredValue: ['ny'] })],
        dataSource: data,
      }),
    )

    expect(result.current.filteredValueMap.get('city')).toEqual(['ny'])
    expect(names(result.current.filteredDataSource)).toEqual(['alice', 'carol'])
    expect(result.current.getFiltersArg()).toEqual({ city: ['ny'] })
  })

  it('updates uncontrolled state and emits filters/currentDataSource', () => {
    const onFilterChange = vi.fn()
    const { result } = renderHook(() =>
      useFilter<Rec>({
        columns: [cityColumn(), ageColumn()],
        dataSource: data,
        onFilterChange,
      }),
    )

    act(() => result.current.setFilterValue('city', ['la']))

    expect(result.current.filteredValueMap.get('city')).toEqual(['la'])
    expect(result.current.filteredValueMap.get('age')).toEqual([])
    expect(names(result.current.filteredDataSource)).toEqual(['bob'])
    expect(onFilterChange).toHaveBeenLastCalledWith(
      { city: ['la'], age: null },
      [{ name: 'bob', age: 30, city: 'la' }],
    )
  })

  it('uses controlled filteredValue as the source of truth but still emits next args', () => {
    const onFilterChange = vi.fn()
    const { result } = renderHook(() =>
      useFilter<Rec>({
        columns: [cityColumn({ filteredValue: ['ny'] })],
        dataSource: data,
        onFilterChange,
      }),
    )

    expect(result.current.filteredValueMap.get('city')).toEqual(['ny'])
    expect(names(result.current.filteredDataSource)).toEqual(['alice', 'carol'])

    act(() => result.current.setFilterValue('city', ['la']))

    expect(result.current.filteredValueMap.get('city')).toEqual(['ny'])
    expect(names(result.current.filteredDataSource)).toEqual(['alice', 'carol'])
    expect(onFilterChange).toHaveBeenLastCalledWith(
      { city: ['la'] },
      [{ name: 'bob', age: 30, city: 'la' }],
    )
  })

  it('combines controlled and uncontrolled columns', () => {
    const { result } = renderHook(() =>
      useFilter<Rec>({
        columns: [
          cityColumn({ filteredValue: ['ny'] }),
          ageColumn({ defaultFilteredValue: [25] }),
        ],
        dataSource: data,
      }),
    )

    expect(result.current.filteredValueMap.get('city')).toEqual(['ny'])
    expect(result.current.filteredValueMap.get('age')).toEqual([25])
    expect(names(result.current.filteredDataSource)).toEqual(['alice', 'carol'])
    expect(result.current.getFiltersArg()).toEqual({ city: ['ny'], age: [25] })
  })

  it('does not introduce defaultFilteredValue from newly added columns after mount', () => {
    let columns = [cityColumn({ defaultFilteredValue: ['ny'] })]
    const { result, rerender } = renderHook(() =>
      useFilter<Rec>({
        columns,
        dataSource: data,
      }),
    )

    expect(result.current.filteredValueMap.get('city')).toEqual(['ny'])

    columns = [ageColumn({ defaultFilteredValue: [25] })]
    rerender()

    expect(result.current.filteredValueMap.has('city')).toBe(false)
    expect(result.current.filteredValueMap.get('age')).toEqual([])
    expect(names(result.current.filteredDataSource)).toEqual([
      'alice',
      'bob',
      'carol',
      'dave',
    ])
    expect(result.current.getFiltersArg()).toEqual({ age: null })
  })

  it('normalizes empty values to clear an uncontrolled filter', () => {
    const onFilterChange = vi.fn()
    const { result } = renderHook(() =>
      useFilter<Rec>({
        columns: [cityColumn({ defaultFilteredValue: ['ny'] })],
        dataSource: data,
        onFilterChange,
      }),
    )

    act(() => result.current.setFilterValue('city', null))

    expect(result.current.filteredValueMap.get('city')).toEqual([])
    expect(names(result.current.filteredDataSource)).toEqual([
      'alice',
      'bob',
      'carol',
      'dave',
    ])
    expect(onFilterChange).toHaveBeenLastCalledWith({ city: null }, data)
  })
})
