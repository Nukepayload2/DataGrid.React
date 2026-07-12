import { fireEvent, render, screen } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Key } from 'react'
import { useRowSelection } from '../../../src/table/engine/useRowSelection'
import { buildSelectionColumnNode } from '../../../src/table/selectionAdapter'
import type {
  RowSelectMethod,
  TableLocale,
  TableRowSelection,
} from '../../../src/table/types'

interface Rec {
  key: string
  name: string
  disabled?: boolean
}

const data: Array<Rec> = [
  { key: 'a', name: 'Alice' },
  { key: 'b', name: 'Bob', disabled: true },
  { key: 'c', name: 'Carol' },
  { key: 'd', name: 'Dan' },
]

const locale = {
  selectionAll: 'Select all',
  selectInvert: 'Invert selection',
  selectNone: 'Clear selection',
} as TableLocale

function renderSelection(
  rowSelection: TableRowSelection<Rec>,
  selectedRowKeys: Array<Key> = [],
) {
  return renderHook(() =>
    useRowSelection<Rec>({
      type: rowSelection.type,
      selectedRowKeys,
      dataSource: data,
      rowKey: 'key',
      getCheckboxProps: rowSelection.getCheckboxProps,
      selections: rowSelection.selections,
    }),
  ).result.current
}

function buildColumn(
  rowSelection: TableRowSelection<Rec>,
  selectedRowKeys: Array<Key> = [],
  fireSelectionChange = vi.fn(),
  selectionAnchorKey: Key | null = null,
  setSelectionAnchorKey = vi.fn(),
) {
  return {
    column: buildSelectionColumnNode<Rec>(
      rowSelection,
      renderSelection(rowSelection, selectedRowKeys),
      fireSelectionChange as (
        nextKeys: Array<Key>,
        method: RowSelectMethod,
        trigger?: { record?: Rec; nativeEvent?: Event },
      ) => void,
      'key',
      locale,
      selectionAnchorKey,
      setSelectionAnchorKey,
    ),
    fireSelectionChange,
    setSelectionAnchorKey,
  }
}

describe('selectionAdapter buildSelectionColumnNode', () => {
  it('renders columnTitle around the title checkbox and applies getTitleCheckboxProps', () => {
    const { column, fireSelectionChange } = buildColumn({
      columnTitle: (checkboxNode) => (
        <span>
          Pick
          {checkboxNode}
        </span>
      ),
      getTitleCheckboxProps: () => ({
        disabled: true,
        name: 'bulk',
        'aria-label': 'bulk disabled',
      }),
    })

    render(<>{column.title}</>)

    expect(screen.getByText('Pick')).toBeInTheDocument()
    const checkbox = screen.getByRole('checkbox', { name: 'bulk disabled' })
    expect(checkbox).toBeDisabled()
    expect(checkbox).toHaveAttribute('name', 'bulk')

    fireEvent.click(checkbox)
    expect(fireSelectionChange).not.toHaveBeenCalled()
  })

  it('merges rowSelection.onCell with renderCell props and fires row selection changes from the default node', () => {
    const renderCell = vi.fn<TableRowSelection<Rec>['renderCell']>((_checked, record, index, node) => ({
      props: {
        colSpan: 1,
        rowSpan: index + 1,
        title: `render-${record.key}`,
      },
      children: <span data-testid={`wrapped-${record.key}`}>{node}</span>,
    }))
    const { column, fireSelectionChange } = buildColumn({
      getCheckboxProps: (record) => ({ name: `select-${record.key}` }),
      onCell: (record, index) => ({
        className: `base-${record.key}`,
        rowSpan: 5,
        marker: index,
      }),
      renderCell,
    })

    expect(column.onCell?.(data[0], 0)).toEqual({
      className: 'base-a',
      marker: 0,
      colSpan: 1,
      rowSpan: 1,
      title: 'render-a',
    })

    render(<>{column.render?.(undefined, data[0], 0)}</>)

    expect(screen.getByTestId('wrapped-a')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'select-a' }))

    expect(fireSelectionChange).toHaveBeenCalledTimes(1)
    expect(fireSelectionChange.mock.calls[0][0]).toEqual(['a'])
    expect(fireSelectionChange.mock.calls[0][1]).toBe('single')
    expect(fireSelectionChange.mock.calls[0][2]).toMatchObject({ record: data[0] })
    expect(fireSelectionChange.mock.calls[0][2]?.nativeEvent).toBeInstanceOf(Event)
  })

  it('renders disabled row checkbox from getCheckboxProps and ignores row changes', () => {
    const { column, fireSelectionChange } = buildColumn({
      getCheckboxProps: (record) => ({
        disabled: record.disabled,
        name: `select-${record.key}`,
      }),
    })

    render(<>{column.render?.(undefined, data[1], 1)}</>)

    const checkbox = screen.getByRole('checkbox', { name: 'select-b' })
    expect(checkbox).toBeDisabled()
    fireEvent.click(checkbox)
    expect(fireSelectionChange).not.toHaveBeenCalled()
  })

  it('uses selectionAnchorKey for shift range and reports method=multiple', () => {
    const setSelectionAnchorKey = vi.fn()
    const { column, fireSelectionChange } = buildColumn(
      {
        getCheckboxProps: (record) => ({
          disabled: record.disabled,
          name: `select-${record.key}`,
        }),
      },
      ['a'],
      vi.fn(),
      'a',
      setSelectionAnchorKey,
    )

    render(<>{column.render?.(undefined, data[2], 2)}</>)
    fireEvent.click(screen.getByRole('checkbox', { name: 'select-c' }), {
      shiftKey: true,
    })

    expect(fireSelectionChange).toHaveBeenCalledTimes(1)
    expect(fireSelectionChange.mock.calls[0][0]).toEqual(['a', 'c'])
    expect(fireSelectionChange.mock.calls[0][1]).toBe('multiple')
    expect(fireSelectionChange.mock.calls[0][2]).toMatchObject({ record: data[2] })
    expect(setSelectionAnchorKey).toHaveBeenCalledWith('c')
  })
})
