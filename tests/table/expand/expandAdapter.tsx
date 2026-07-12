import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  buildExpandColumnNode,
  EXPAND_COLUMN_KEY,
} from '../../../src/table/expandAdapter'
import type { Expandable, TableLocale } from '../../../src/table/types'

interface Rec {
  key: string
  label: string
}

const locale: TableLocale = {
  expand: 'Expand',
  collapse: 'Collapse',
}

function renderCell(
  options: {
    expandable?: Partial<Expandable<Rec>>
    expandedKeys?: React.Key[]
    expandableKeys?: React.Key[]
    record?: Rec
    toggleExpand?: (key: React.Key, record: Rec) => void
  } = {},
) {
  const record = options.record ?? { key: 'a', label: 'A' }
  const expandedSet = new Set(options.expandedKeys ?? [])
  const expandableKeySet = new Set(options.expandableKeys ?? ['a'])
  const toggleExpand = vi.fn(options.toggleExpand)
  const node = buildExpandColumnNode<Rec>(
    {
      expandedRowRender: (row) => row.label,
      ...options.expandable,
    },
    {
      isExpanded: (key) => expandedSet.has(key),
      expandableKeySet,
      toggleExpand,
    },
    'key',
    locale,
  )

  const view = render(<>{node.render?.(undefined, record, 0)}</>)

  return { node, toggleExpand, record, view }
}

describe('expandAdapter / buildExpandColumnNode', () => {
  it('builds a stable expand column with antd-compatible defaults', () => {
    const { node } = renderCell()

    expect(node.key).toBe(EXPAND_COLUMN_KEY)
    expect(node.title).toBeNull()
    expect(node.align).toBe('center')
    expect(node.width).toBe(48)
  })

  it('renders the default collapsed icon and toggles expandable rows', () => {
    const { toggleExpand, record } = renderCell()
    const button = screen.getByRole('button', { name: 'Expand' })

    expect(button).toHaveClass('dg-expand-icon-collapsed')
    expect(button).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(button)

    expect(toggleExpand).toHaveBeenCalledWith('a', record)
  })

  it('renders expanded and disabled default icon states', () => {
    renderCell({ expandedKeys: ['a'] })

    expect(screen.getByRole('button', { name: 'Collapse' })).toHaveClass(
      'dg-expand-icon-expanded',
    )

    const { toggleExpand } = renderCell({
      record: { key: 'b', label: 'B' },
      expandableKeys: ['a'],
    })
    const disabled = screen.getByRole('button', { name: 'Expand' })

    expect(disabled).toBeDisabled()
    expect(disabled).toHaveClass('dg-expand-icon-spaced')

    fireEvent.click(disabled)

    expect(toggleExpand).not.toHaveBeenCalled()
  })

  it('honors custom column width and custom expandIcon gating', () => {
    const customIcon = vi.fn(
      (props: {
        expanded: boolean
        record: Rec
        onExpand: (record: Rec, event: React.MouseEvent<HTMLElement>) => void
      }) => (
        <button
          data-expanded={String(props.expanded)}
          onClick={(event) => props.onExpand(props.record, event)}
          type="button"
        >
          custom
        </button>
      ),
    )

    const { node, toggleExpand, record } = renderCell({
      expandable: {
        columnWidth: 64,
        expandIcon: customIcon,
      },
      expandedKeys: ['a'],
    })

    expect(node.width).toBe(64)
    expect(customIcon).toHaveBeenCalledWith(
      expect.objectContaining({ expanded: true, record }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'custom' }))
    expect(toggleExpand).toHaveBeenCalledWith('a', record)

    const blocked = renderCell({
      expandable: { expandIcon: customIcon },
      record: { key: 'blocked', label: 'Blocked' },
      expandableKeys: ['a'],
    })

    fireEvent.click(within(blocked.view.container).getByRole('button', { name: 'custom' }))

    expect(blocked.toggleExpand).not.toHaveBeenCalled()
  })
})
