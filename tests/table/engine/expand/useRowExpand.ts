import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useRowExpand } from '../../../../src/table/engine/useRowExpand'
import type { Expandable } from '../../../../src/table/types'

interface Rec {
  key: string
  canExpand?: boolean
}

const data: Rec[] = [
  { key: 'a', canExpand: true },
  { key: 'b', canExpand: false },
  { key: 'c', canExpand: true },
]

function expandable(overrides: Partial<Expandable<Rec>> = {}): Expandable<Rec> {
  return {
    expandedRowRender: (record) => record.key,
    ...overrides,
  }
}

describe('useRowExpand', () => {
  it('disables expansion when expandable or expandedRowRender is absent', () => {
    const { result, rerender } = renderHook(
      ({ config }: { config?: Expandable<Rec> }) =>
        useRowExpand({ expandable: config, dataSource: data, rowKey: 'key' }),
      { initialProps: { config: undefined } },
    )

    expect(result.current.expandEnabled).toBe(false)
    expect(result.current.expandedRowKeys).toEqual([])
    expect(result.current.expandableKeySet.size).toBe(0)

    rerender({ config: {} as Expandable<Rec> })

    expect(result.current.expandEnabled).toBe(false)
    expect(result.current.expandableKeySet.size).toBe(0)
  })

  it('derives default expanded keys from all expandable rows', () => {
    const { result } = renderHook(() =>
      useRowExpand({
        expandable: expandable({
          defaultExpandAllRows: true,
          rowExpandable: (record) => record.canExpand !== false,
        }),
        dataSource: data,
        rowKey: 'key',
      }),
    )

    expect(result.current.expandEnabled).toBe(true)
    expect(Array.from(result.current.expandableKeySet)).toEqual(['a', 'c'])
    expect(result.current.expandedRowKeys).toEqual(['a', 'c'])
    expect(result.current.isExpanded('a')).toBe(true)
    expect(result.current.isExpanded('b')).toBe(false)
  })

  it('filters defaultExpandedRowKeys to rows that are actually expandable', () => {
    const { result } = renderHook(() =>
      useRowExpand({
        expandable: expandable({
          defaultExpandedRowKeys: ['a', 'b', 'missing'],
          rowExpandable: (record) => record.canExpand !== false,
        }),
        dataSource: data,
        rowKey: 'key',
      }),
    )

    expect(result.current.expandedRowKeys).toEqual(['a'])
  })

  it('toggles uncontrolled keys and calls callbacks with antd-compatible ordering', () => {
    const calls: string[] = []
    const onExpandedRowsChange = vi.fn((keys: readonly React.Key[]) => {
      calls.push(`change:${keys.join(',')}`)
    })
    const onExpand = vi.fn((expanded: boolean, record: Rec) => {
      calls.push(`expand:${expanded}:${record.key}`)
    })
    const { result } = renderHook(() =>
      useRowExpand({
        expandable: expandable({ onExpandedRowsChange, onExpand }),
        dataSource: data,
        rowKey: 'key',
      }),
    )

    act(() => {
      result.current.toggleExpand('a', data[0]!)
    })

    expect(result.current.expandedRowKeys).toEqual(['a'])
    expect(onExpandedRowsChange).toHaveBeenCalledWith(['a'])
    expect(onExpand).toHaveBeenCalledWith(true, data[0])
    expect(calls).toEqual(['change:a', 'expand:true:a'])

    act(() => {
      result.current.toggleExpand('a', data[0]!)
    })

    expect(result.current.expandedRowKeys).toEqual([])
    expect(onExpandedRowsChange).toHaveBeenLastCalledWith([])
    expect(onExpand).toHaveBeenLastCalledWith(false, data[0])
  })

  it('uses controlled expandedRowKeys without mutating internal state', () => {
    const onExpandedRowsChange = vi.fn()
    const onExpand = vi.fn()
    const { result, rerender } = renderHook(
      ({ keys }: { keys: React.Key[] }) =>
        useRowExpand({
          expandable: expandable({
            expandedRowKeys: keys,
            onExpandedRowsChange,
            onExpand,
          }),
          dataSource: data,
          rowKey: 'key',
        }),
      { initialProps: { keys: ['c'] } },
    )

    expect(result.current.expandedRowKeys).toEqual(['c'])
    expect(result.current.isExpanded('c')).toBe(true)

    act(() => {
      result.current.toggleExpand('a', data[0]!)
    })

    expect(result.current.expandedRowKeys).toEqual(['c'])
    expect(onExpandedRowsChange).toHaveBeenCalledWith(['c', 'a'])
    expect(onExpand).toHaveBeenCalledWith(true, data[0])

    rerender({ keys: ['a'] })

    expect(result.current.expandedRowKeys).toEqual(['a'])
    expect(result.current.isExpanded('a')).toBe(true)
    expect(result.current.isExpanded('c')).toBe(false)
  })

  it('supports function rowKey', () => {
    const rows = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const { result } = renderHook(() =>
      useRowExpand({
        expandable: expandable({
          defaultExpandAllRows: true,
        }) as unknown as Expandable<{ id: number | null }>,
        dataSource: rows,
        rowKey: (record) => record.id as number,
      }),
    )

    expect(result.current.expandedRowKeys).toEqual([1, 2, 3])
    expect(result.current.expandableKeySet.has(1)).toBe(true)
    expect(result.current.expandableKeySet.has(3)).toBe(true)
  })
})
