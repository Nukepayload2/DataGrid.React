import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Key } from 'react'
import {
  SELECTION_ALL,
  SELECTION_INVERT,
  SELECTION_NONE,
  useRowSelection,
} from '../../../../src/table/engine/useRowSelection'

interface Rec {
  key: string
  disabled?: boolean
}

const data: Array<Rec> = [
  { key: 'a' },
  { key: 'b', disabled: true },
  { key: 'c' },
]

function renderSelection(selectedRowKeys: Array<Key>) {
  return renderHook(() =>
    useRowSelection<Rec>({
      selectedRowKeys,
      dataSource: data,
      rowKey: 'key',
      getCheckboxProps: (record) => ({ disabled: record.disabled }),
      selections: true,
    }),
  )
}

describe('useRowSelection', () => {
  it('excludes disabled records from changeable keys while preserving controlled checked keys', () => {
    const { result } = renderSelection(['b'])

    expect(result.current.selectableKeys).toEqual(['a', 'c'])
    expect(result.current.changeableRowKeys).toEqual(['a', 'c'])
    expect(result.current.selectedKeySet.has('b')).toBe(true)
    expect(result.current.allSelected).toBe(false)
    expect(result.current.intermediate).toBe(false)
  })

  it('toggleAll only changes selectable keys and preserves disabled checked keys', () => {
    const { result } = renderSelection(['b'])

    expect(result.current.toggleAll()).toEqual(['b', 'a', 'c'])
  })

  it('builtin selections preserve disabled checked keys and report antd-compatible methods', () => {
    const { result } = renderSelection(['b', 'c'])

    expect(result.current.applySelection(SELECTION_ALL)).toEqual({
      nextKeys: ['b', 'c', 'a'],
      method: 'all',
    })
    expect(result.current.applySelection(SELECTION_NONE)).toEqual({
      nextKeys: ['b'],
      method: 'none',
    })
    expect(result.current.applySelection(SELECTION_INVERT)).toEqual({
      nextKeys: ['b', 'a'],
      method: 'invert',
    })
  })

  it('custom selection receives changeable row keys and does not mutate engine keys', () => {
    const onSelect = vi.fn()
    const { result } = renderSelection(['b'])

    const output = result.current.applySelection({
      key: 'odd',
      text: 'Odd rows',
      onSelect,
    })

    expect(output).toBeNull()
    expect(onSelect).toHaveBeenCalledWith(['a', 'c'])
    expect(result.current.selectedKeySet.has('b')).toBe(true)
  })

  it('radio toggle keeps an already checked row selected and replaces with a new key', () => {
    const { result } = renderHook(() =>
      useRowSelection<Rec>({
        type: 'radio',
        selectedRowKeys: ['a'],
        dataSource: data,
        rowKey: 'key',
      }),
    )

    expect(result.current.toggleRow('a')).toEqual(['a'])
    expect(result.current.toggleRow('c')).toEqual(['c'])
    expect(result.current.toggleAll()).toEqual(['a'])
    expect(result.current.allSelected).toBe(false)
  })
})
