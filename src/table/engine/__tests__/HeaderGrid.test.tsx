import { isValidElement, type ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { HeaderGrid } from '../HeaderGrid'
import type { EngineHeaderCell } from '../types'

describe('HeaderGrid', () => {
  const makeCell = (
    key: string,
    gridRowStart: number,
    covered = false,
  ): EngineHeaderCell => ({
    key,
    title: key,
    gridColumnStart: 1,
    gridColumnEnd: 2,
    gridRowStart,
    gridRowEnd: gridRowStart + 1,
    isLeaf: true,
    covered,
  })

  it('renders nothing when header is hidden', () => {
    const renderHeaderCell = vi.fn()

    expect(HeaderGrid({
      showHeader: false,
      headerCells: [makeCell('name', 1)],
      headerSticky: new Map(),
      headerRowOffsets: [0],
      renderHeaderCell,
    })).toBeNull()
    expect(renderHeaderCell).not.toHaveBeenCalled()
  })

  it('skips covered cells and passes sticky row offsets', () => {
    const sticky = { side: 'start' as const, offset: 12, isEdge: true }
    const renderHeaderCell = vi.fn(({ cell }) => <div data-key={cell.key} />)

    const rendered = HeaderGrid({
      showHeader: true,
      headerCells: [
        makeCell('group', 1),
        makeCell('covered', 2, true),
        makeCell('name', 2),
      ],
      headerSticky: new Map([['name', sticky]]),
      headerRowOffsets: [0, 32],
      renderHeaderCell,
    }) as Array<ReactElement | null>

    expect(rendered).toHaveLength(3)
    expect(isValidElement(rendered[0])).toBe(true)
    expect(rendered[1]).toBeNull()
    expect(isValidElement(rendered[2])).toBe(true)
    expect(renderHeaderCell).toHaveBeenCalledTimes(2)
    expect(renderHeaderCell.mock.calls[0][0]).toMatchObject({
      cell: expect.objectContaining({ key: 'group' }),
      sticky: undefined,
      headerStickyTopOffset: 0,
    })
    expect(renderHeaderCell.mock.calls[1][0]).toMatchObject({
      cell: expect.objectContaining({ key: 'name' }),
      sticky,
      headerStickyTopOffset: 32,
    })
  })
})
