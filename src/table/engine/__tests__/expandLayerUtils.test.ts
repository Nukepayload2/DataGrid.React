import { isValidElement } from 'react'
import { describe, expect, it } from 'vitest'
import { renderExpandedContents } from '../expandLayerUtils'
import type { EngineExpandState, EngineLeafColumn } from '../types'

describe('expandLayerUtils', () => {
  interface Row {
    id: string
    label: string
  }

  const dataSource: Array<Row> = [
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Beta' },
    { id: 'c', label: 'Gamma' },
  ]

  const leafColumns = [
    { key: 'name' },
    { key: 'age' },
    { key: 'city' },
  ] as Array<EngineLeafColumn<Row>>

  function createExpandState(
    overrides: Partial<EngineExpandState> = {},
  ): EngineExpandState {
    return {
      expandEnabled: true,
      isExpanded: (key) => key === 'a' || key === 'c',
      expandableKeySet: new Set(['a', 'c']),
      expandedRowRender: (record: Row, index, expanded) => `${record.label}-${index}-${expanded}`,
      toggleExpand: () => {},
      isExpandable: (key) => key === 'a' || key === 'c',
      showExpandColumn: true,
      ...overrides,
    }
  }

  it('renders expanded rows with the original grid placement', () => {
    const nodes = renderExpandedContents({
      dataSource,
      virtualEnabled: false,
      virtualState: { start: 0, end: 0 },
      expandState: createExpandState({ expandedRowOffset: 1 }),
      expandLayout: new Map([
        [0, { rowLine: 2, expandTrackLine: 3 }],
        [1, { rowLine: 4 }],
        [2, { rowLine: 5, expandTrackLine: 6 }],
      ]),
      rowKey: 'id',
      leafColumns,
    })

    expect(nodes).toHaveLength(2)
    expect(nodes.every(isValidElement)).toBe(true)
    expect(nodes.map((node) => isValidElement(node) ? node.key : undefined)).toEqual([
      'expand-0-a',
      'expand-2-c',
    ])
    expect(isValidElement(nodes[0]) ? nodes[0].props : undefined).toMatchObject({
      className: 'dg-row-expanded',
      style: {
        gridColumn: '2 / -1',
        gridRow: 3,
        overflow: 'hidden',
        minHeight: 0,
      },
      children: 'Alpha-0-true',
    })
  })

  it('uses the virtual window and skips missing content', () => {
    const nodes = renderExpandedContents({
      dataSource,
      virtualEnabled: true,
      virtualState: { start: 1, end: 3 },
      expandState: createExpandState({
        expandedRowOffset: Number.POSITIVE_INFINITY,
        isExpanded: (key) => key === 'c',
        expandedRowRender: (record: Row) => record.id === 'c' ? null : record.label,
      }),
      expandLayout: new Map([
        [0, { rowLine: 2, expandTrackLine: 3 }],
        [2, { rowLine: 4, expandTrackLine: 5 }],
      ]),
      rowKey: (record) => record.id,
      leafColumns,
    })

    expect(nodes).toEqual([])
  })
})
