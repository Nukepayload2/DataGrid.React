import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useSorter } from '../../../../src/table/engine/useSorter'
import type { ColumnType, SorterResult } from '../../../../src/table/types'

interface Rec {
  name: string
  age: number
}

const data: Array<Rec> = [
  { name: 'charlie', age: 30 },
  { name: 'alice', age: 25 },
  { name: 'bob', age: 28 },
]

function col(partial: Partial<ColumnType<Rec>>): ColumnType<Rec> {
  return partial as ColumnType<Rec>
}

function names(rows: Array<Rec>): Array<string> {
  return rows.map((row) => row.name)
}

describe('useSorter', () => {
  it('applies uncontrolled defaultSortOrder on initial mount', () => {
    const { result } = renderHook(() =>
      useSorter<Rec>({
        columns: [
          col({ key: 'name', dataIndex: 'name', sorter: true, defaultSortOrder: 'ascend' }),
        ],
        dataSource: data,
      }),
    )

    expect(result.current.sortOrderMap.get('name')).toBe('ascend')
    expect(result.current.activeColumnKey).toBe('name')
    expect(names(result.current.sortedDataSource)).toEqual(['alice', 'bob', 'charlie'])
  })

  it('cycles uncontrolled sort state and passes antd-style onChange args', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() =>
      useSorter<Rec>({
        columns: [col({ key: 'name', dataIndex: 'name', sorter: true })],
        dataSource: data,
        onChange,
      }),
    )

    act(() => result.current.onSorterClick('name'))

    expect(result.current.sortOrderMap.get('name')).toBe('ascend')
    expect(names(result.current.sortedDataSource)).toEqual(['alice', 'bob', 'charlie'])
    expect(onChange).toHaveBeenLastCalledWith(
      {},
      {},
      expect.objectContaining({ columnKey: 'name', order: 'ascend' }),
      {
        action: 'sort',
        currentDataSource: [
          { name: 'alice', age: 25 },
          { name: 'bob', age: 28 },
          { name: 'charlie', age: 30 },
        ],
      },
    )

    act(() => result.current.onSorterClick('name'))
    expect(result.current.sortOrderMap.get('name')).toBe('descend')
    expect(names(result.current.sortedDataSource)).toEqual(['charlie', 'bob', 'alice'])

    act(() => result.current.onSorterClick('name'))
    expect(result.current.sortOrderMap.get('name')).toBeNull()
    expect(result.current.activeColumnKey).toBeNull()
    expect(names(result.current.sortedDataSource)).toEqual(['charlie', 'alice', 'bob'])
    expect(onChange).toHaveBeenLastCalledWith(
      {},
      {},
      {},
      { action: 'sort', currentDataSource: data },
    )
  })

  it('uses controlled sortOrder as the source of truth', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() =>
      useSorter<Rec>({
        columns: [
          col({ key: 'name', dataIndex: 'name', sorter: true, sortOrder: 'descend' }),
        ],
        dataSource: data,
        onChange,
      }),
    )

    expect(result.current.sortOrderMap.get('name')).toBe('descend')
    expect(names(result.current.sortedDataSource)).toEqual(['charlie', 'bob', 'alice'])

    act(() => result.current.onSorterClick('name'))

    expect(result.current.sortOrderMap.get('name')).toBe('descend')
    expect(onChange).toHaveBeenLastCalledWith(
      {},
      {},
      {},
      { action: 'sort', currentDataSource: data },
    )
  })

  it('prunes uncontrolled state when sorted columns are removed', () => {
    let columns = [
      col({ key: 'name', dataIndex: 'name', sorter: true, defaultSortOrder: 'ascend' }),
    ]
    const { result, rerender } = renderHook(() =>
      useSorter<Rec>({
        columns,
        dataSource: data,
      }),
    )

    expect(result.current.sortOrderMap.has('name')).toBe(true)

    columns = [col({ key: 'age', dataIndex: 'age', sorter: true, defaultSortOrder: 'descend' })]
    rerender()

    expect(result.current.sortOrderMap.has('name')).toBe(false)
    expect(result.current.sortOrderMap.has('age')).toBe(false)
    expect(result.current.activeColumnKey).toBeNull()
    expect(names(result.current.sortedDataSource)).toEqual(['charlie', 'alice', 'bob'])
  })

  it('keeps multiple sort states and reports priority/order metadata', () => {
    const onChange = vi.fn()
    const columns = [
      col({
        key: 'age',
        dataIndex: 'age',
        sorter: { compare: (a: Rec, b: Rec) => a.age - b.age, multiple: 2 },
      }),
      col({
        key: 'name',
        dataIndex: 'name',
        sorter: { compare: (a: Rec, b: Rec) => a.name.localeCompare(b.name), multiple: 1 },
      }),
    ]
    const { result } = renderHook(() =>
      useSorter<Rec>({
        columns,
        dataSource: data,
        onChange,
      }),
    )

    act(() => result.current.onSorterClick('name'))
    act(() => result.current.onSorterClick('age'))

    expect(result.current.sortOrderMap.get('name')).toBe('ascend')
    expect(result.current.sortOrderMap.get('age')).toBe('ascend')
    expect(result.current.sortPriorityMap.get('age')).toBe(1)
    expect(result.current.sortPriorityMap.get('name')).toBe(2)
    expect(result.current.activeColumnKey).toBe('age')

    const sorter = onChange.mock.calls.at(-1)![2] as Array<SorterResult<Rec>>
    expect(sorter.map((item) => item.columnKey)).toEqual(['name', 'age'])
  })
})
