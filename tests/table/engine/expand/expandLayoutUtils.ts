import { describe, expect, it } from 'vitest'
import { computeExpandLayout } from '../../../../src/table/engine/expandLayoutUtils'

describe('expandLayoutUtils', () => {
  const dataSource = [
    { id: 'a' },
    { id: 'b' },
    { id: 'c' },
    { id: 'd' },
  ]

  it('returns an empty layout when expansion is disabled', () => {
    const { layout } = computeExpandLayout({
      expandEnabled: false,
      isExpandable: () => true,
      showHeader: true,
      maxDepth: 2,
      virtualEnabled: false,
      virtualState: { start: 0, end: 0 },
      dataSource,
      rowKey: 'id',
    })

    expect(layout.size).toBe(0)
  })

  it('computes non-virtual row lines and expand track lines', () => {
    const { layout } = computeExpandLayout({
      expandEnabled: true,
      isExpandable: (key) => key === 'a' || key === 'c',
      showHeader: true,
      maxDepth: 2,
      virtualEnabled: false,
      virtualState: { start: 0, end: 0 },
      dataSource,
      rowKey: 'id',
    })

    expect(Array.from(layout.entries())).toEqual([
      [0, { rowLine: 3, expandTrackLine: 4 }],
      [1, { rowLine: 5, expandTrackLine: undefined }],
      [2, { rowLine: 6, expandTrackLine: 7 }],
      [3, { rowLine: 8, expandTrackLine: undefined }],
    ])
  })

  it('computes virtual row lines from the visible window', () => {
    const { layout } = computeExpandLayout({
      expandEnabled: true,
      isExpandable: (key) => key === 'c',
      showHeader: true,
      maxDepth: 1,
      virtualEnabled: true,
      virtualState: { start: 1, end: 4 },
      dataSource,
      rowKey: (record) => record.id,
    })

    expect(Array.from(layout.entries())).toEqual([
      [1, { rowLine: 3, expandTrackLine: undefined }],
      [2, { rowLine: 4, expandTrackLine: 5 }],
      [3, { rowLine: 6, expandTrackLine: undefined }],
    ])
  })
})
