import React from 'react'
import { describe, expect, it } from 'vitest'
import {
  applyColumnDefaults,
  convertChildrenToColumns,
  flattenLeafColumns,
  toEngineColumns,
} from '../../src/table/columnAdapter'
import {
  EXPAND_COLUMN,
  SELECTION_COLUMN,
  type ColumnOrSentinel,
  type ColumnType,
} from '../../src/table/types'

interface Rec {
  name: string
  age: number
  city: string
}

function col(partial: Partial<ColumnType<Rec>>): ColumnType<Rec> {
  return partial as ColumnType<Rec>
}

describe('columnAdapter / applyColumnDefaults', () => {
  it('returns the original columns reference when no defaults are provided', () => {
    const columns = [col({ key: 'name', dataIndex: 'name' })]
    expect(applyColumnDefaults(columns, undefined)).toBe(columns)
  })

  it('merges defaults recursively without letting undefined override column values', () => {
    const columns: Array<ColumnOrSentinel<Rec>> = [
      col({
        key: 'group',
        align: undefined,
        children: [
          col({ key: 'name', dataIndex: 'name', width: 120 }),
          col({ key: 'age', dataIndex: 'age', align: 'right' }),
        ],
      }),
    ]

    const result = applyColumnDefaults(columns, {
      align: 'center',
      width: 80,
      ellipsis: true,
      children: [col({ key: 'ignored' })],
    })

    const group = result[0] as ColumnType<Rec>
    expect(group.align).toBe('center')
    expect(group.width).toBe(80)
    expect(group.children).toHaveLength(2)
    expect(group.children![0]!.width).toBe(120)
    expect(group.children![0]!.align).toBe('center')
    expect(group.children![0]!.ellipsis).toBe(true)
    expect(group.children![1]!.width).toBe(80)
    expect(group.children![1]!.align).toBe('right')
  })

  it('keeps selection and expand sentinels by reference', () => {
    const result = applyColumnDefaults<Rec>(
      [SELECTION_COLUMN, EXPAND_COLUMN, col({ key: 'name' })],
      { width: 64 },
    )

    expect(result[0]).toBe(SELECTION_COLUMN)
    expect(result[1]).toBe(EXPAND_COLUMN)
    expect((result[2] as ColumnType<Rec>).width).toBe(64)
  })
})

describe('columnAdapter / convertChildrenToColumns', () => {
  it('converts JSX children and merges React keys into column keys', () => {
    const children = (
      <>
        {React.createElement('Column', {
          key: 'name-react-key',
          dataIndex: 'name',
          title: 'Name',
        })}
        {React.createElement(
          'ColumnGroup',
          { key: 'profile', title: 'Profile' },
          React.createElement('Column', {
            key: 'age-react-key',
            dataIndex: 'age',
            title: 'Age',
          }),
        )}
        text
        {false}
      </>
    )

    const result = convertChildrenToColumns<Rec>(children)

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      key: 'name-react-key',
      dataIndex: 'name',
      title: 'Name',
    })
    expect(result[1]!.key).toBe('profile')
    expect(result[1]!.children).toHaveLength(1)
    expect(result[1]!.children![0]).toMatchObject({
      key: 'age-react-key',
      dataIndex: 'age',
      title: 'Age',
    })
  })

  it('keeps the React element key and passes through ordinary props', () => {
    const result = convertChildrenToColumns<Rec>(
      React.createElement('Column', {
        key: 'react-key',
        columnKey: 'ordinary-prop',
        dataIndex: 'name',
      }),
    )

    expect(result[0]!.key).toBe('react-key')
    expect((result[0] as any).columnKey).toBe('ordinary-prop')
  })
})

describe('columnAdapter / toEngineColumns', () => {
  it('allocates unique fallback keys for anonymous columns across nested groups', () => {
    const result = toEngineColumns<Rec>([
      col({ title: 'A' }),
      col({
        title: 'Group',
        children: [col({ title: 'B' }), col({ title: 'C' })],
      }),
    ])

    expect(result[0]!.key).toBe('col-0')
    expect(result[1]!.key).toBe('col-1')
    expect(result[1]!.children!.map((child) => child.key)).toEqual([
      'col-1.col-2',
      'col-1.col-3',
    ])
  })

  it('normalizes ellipsis and showTitle for boolean and object forms', () => {
    const result = toEngineColumns<Rec>([
      col({ key: 'default-title', ellipsis: true }),
      col({ key: 'custom-tooltip', ellipsis: { showTitle: false } }),
      col({ key: 'off', ellipsis: false }),
    ])

    expect(result[0]).toMatchObject({
      key: 'default-title',
      ellipsis: true,
      showTitle: undefined,
    })
    expect(result[1]).toMatchObject({
      key: 'custom-tooltip',
      ellipsis: true,
      showTitle: false,
    })
    expect(result[2]!.ellipsis).toBeUndefined()
    expect(result[2]!.showTitle).toBeUndefined()
  })
})

describe('columnAdapter / flattenLeafColumns', () => {
  it('returns only leaf columns in depth-first order', () => {
    const columns = [
      col({
        key: 'group',
        children: [
          col({ key: 'name', dataIndex: 'name' }),
          col({
            key: 'nested',
            children: [
              col({ key: 'age', dataIndex: 'age' }),
              col({ key: 'city', dataIndex: 'city' }),
            ],
          }),
        ],
      }),
      col({ key: 'actions' }),
    ]

    expect(flattenLeafColumns(columns).map((column) => column.key)).toEqual([
      'name',
      'age',
      'city',
      'actions',
    ])
  })
})
