import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderTreeIndent } from '../treeIndentRenderer'
import type { EngineTreeState } from '../types'

type Row = { id: string }

function createTreeState(
  rowInfoMap: EngineTreeState['rowInfoMap'],
  expandedKeys: Array<string> = [],
  toggleExpand = vi.fn(),
): EngineTreeState {
  return {
    treeEnabled: true,
    indentSize: 15,
    rowInfoMap,
    isExpanded: key => expandedKeys.includes(String(key)),
    toggleExpand,
  }
}

describe('renderTreeIndent', () => {
  it('renders level indent and expandable icon, then toggles by row key', async () => {
    const toggleExpand = vi.fn()
    const treeState = createTreeState(
      new Map([['child', { level: 2, parentKey: 'root', hasChildren: true }]]),
      ['child'],
      toggleExpand,
    )

    render(<>{renderTreeIndent({ record: { id: 'child' }, rowKey: 'id', treeState })}</>)

    const button = screen.getByRole('button', { name: 'Collapse row' })
    const indent = button.parentElement
    expect(indent).toHaveClass('dg-tree-indent')
    expect(indent).toHaveStyle({ paddingLeft: '30px' })
    expect(button).toHaveClass('dg-expand-icon-expanded')

    await userEvent.click(button)

    expect(toggleExpand).toHaveBeenCalledWith('child')
  })

  it('renders a disabled spaced icon for leaf rows', () => {
    const treeState = createTreeState(
      new Map([['leaf', { level: 1, parentKey: 'root', hasChildren: false }]]),
    )

    render(<>{renderTreeIndent({ record: { id: 'leaf' }, rowKey: row => row.id, treeState })}</>)

    const button = screen.getByRole('button', { name: 'Expand row' })
    expect(button).toBeDisabled()
    expect(button).toHaveClass('dg-expand-icon-spaced')
    expect(button.parentElement).toHaveStyle({ paddingLeft: '15px' })
  })

  it('returns null when row info is missing', () => {
    const treeState = createTreeState(new Map())

    expect(renderTreeIndent<Row>({ record: { id: 'missing' }, rowKey: 'id', treeState })).toBeNull()
  })
})
