import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useCellElementPool } from '../../../../src/table/engine/useCellElementPool'
import type {
  EngineLeafColumn,
} from '../../../../src/table/engine/types'
import type {
  GridCellElementRenderParams,
} from '../../../../src/table/engine/recyclingCellTypes'

type Row = { id: number; name: string }

const params: GridCellElementRenderParams<Row> = {
  value: 'Ada',
  record: { id: 1, name: 'Ada' },
  rowIndex: 0,
  columnIndex: 0,
  columnKey: 'name',
  dataIndex: 'name',
  rowKey: 1,
}

describe('useCellElementPool', () => {
  it('reuses elements only within the same column', () => {
    const dispose = vi.fn()
    const nameColumn: EngineLeafColumn<Row> = {
      key: 'name',
      dataIndex: 'name',
      gridColumnOptions: { disposeCellElement: dispose },
    }
    const ageColumn: EngineLeafColumn<Row> = {
      key: 'age',
      dataIndex: 'id',
      gridColumnOptions: { disposeCellElement: dispose },
    }
    const { result } = renderHook(() =>
      useCellElementPool({ columns: [nameColumn, ageColumn], maxPoolSize: 2 }),
    )
    const element = document.createElement('span')

    act(() => result.current.release(nameColumn, element, params))

    expect(dispose).toHaveBeenCalledWith(element, 'recycle', params)
    expect(result.current.acquire(ageColumn)).toBeUndefined()
    expect(result.current.acquire(nameColumn)).toBe(element)
  })

  it('discards elements when the column pool is full', () => {
    const dispose = vi.fn()
    const column: EngineLeafColumn<Row> = {
      key: 'name',
      dataIndex: 'name',
      gridColumnOptions: { disposeCellElement: dispose },
    }
    const { result } = renderHook(() =>
      useCellElementPool({ columns: [column], maxPoolSize: 0 }),
    )
    const element = document.createElement('span')

    act(() => result.current.release(column, element, params))

    expect(dispose).toHaveBeenCalledWith(element, 'recycle', params)
    expect(dispose).toHaveBeenCalledWith(element, 'discard', params)
    expect(result.current.acquire(column)).toBeUndefined()
  })

  it('unmounts pooled elements when renderer identity changes', () => {
    const dispose = vi.fn()
    const renderA = vi.fn()
    const renderB = vi.fn()
    const columnA: EngineLeafColumn<Row> = {
      key: 'name',
      dataIndex: 'name',
      gridColumnOptions: {
        renderCellElement: renderA,
        disposeCellElement: dispose,
      },
    }
    const columnB: EngineLeafColumn<Row> = {
      key: 'name',
      dataIndex: 'name',
      gridColumnOptions: {
        renderCellElement: renderB,
        disposeCellElement: dispose,
      },
    }
    const { result, rerender } = renderHook(
      ({ columns }) => useCellElementPool({ columns, maxPoolSize: 2 }),
      { initialProps: { columns: [columnA] } },
    )
    const element = document.createElement('span')

    act(() => result.current.release(columnA, element, params))
    rerender({ columns: [columnB] })

    expect(dispose).toHaveBeenCalledWith(element, 'unmount', undefined)
    expect(result.current.acquire(columnB)).toBeUndefined()
  })
})
