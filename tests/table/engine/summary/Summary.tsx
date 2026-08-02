import { Fragment } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  isSummaryElement,
  isSummaryRowElement,
  parseSummaryNode,
  Summary,
} from '../../../../src/table/engine/Summary'
import type { LeafStickyInfo } from '../../../../src/table/engine/useStickyColumns'

describe('Summary component family', () => {
  it('Summary is a transparent container with Row and Cell statics', () => {
    render(
      <Summary>
        <Summary.Row>
          <Summary.Cell>Total</Summary.Cell>
        </Summary.Row>
      </Summary>,
    )

    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(Summary.Row).toBeTypeOf('function')
    expect(Summary.Cell).toBeTypeOf('function')
  })

  it('Summary.Row without engine-injected row line is transparent', () => {
    render(
      <Summary.Row>
        <Summary.Cell index={2} colSpan={3} align="end">
          Amount
        </Summary.Cell>
      </Summary.Row>,
    )

    const cell = screen.getByText('Amount').closest('.dg-cell-summary') as HTMLElement
    expect(cell).toHaveStyle({ gridColumn: '3 / span 3' })
    expect(cell).not.toHaveStyle({ gridRow: '1' })
    expect(cell).toHaveAttribute('data-align', 'end')
    expect(cell).toHaveClass('dg-cell-summary-end')
  })

  it('Summary.Row injects grid row and fixed bottom state into cells', () => {
    render(
      <Summary.Row __rowLine={7} __fixed>
        <Summary.Cell index={1}>Fixed</Summary.Cell>
      </Summary.Row>,
    )

    const cell = screen.getByText('Fixed').closest('.dg-cell-summary') as HTMLElement
    expect(cell).toHaveStyle({
      gridColumn: '2 / span 1',
      gridRow: '7',
      position: 'sticky',
      bottom: '0',
    })
  })

  it('applies injected fixed summary bottom offset', () => {
    render(
      <Summary.Row __rowLine={7} __fixed __stickyBottomOffset={24}>
        <Summary.Cell index={1}>Offset fixed</Summary.Cell>
      </Summary.Row>,
    )

    const cell = screen.getByText('Offset fixed').closest('.dg-cell-summary') as HTMLElement
    expect(cell).toHaveStyle({
      position: 'sticky',
      bottom: '24px',
    })
  })

  it('applies horizontal sticky style when every spanned leaf is on the same side', () => {
    const leafSticky: LeafStickyInfo[] = [
      { side: 'start', offset: 0, width: 80, isEdge: true },
      { side: 'start', offset: 80, width: 120, isEdge: false },
      { side: undefined, offset: 0, width: 90, isEdge: false },
    ]

    render(
      <Summary.Row __rowLine={3} __fixed __leafSticky={leafSticky}>
        <Summary.Cell index={0} colSpan={2}>
          Sticky left
        </Summary.Cell>
      </Summary.Row>,
    )

    const cell = screen.getByText('Sticky left').closest('.dg-cell-summary') as HTMLElement
    expect(cell).toHaveStyle({
      position: 'sticky',
      left: '0px',
      bottom: '0',
      zIndex: '2',
    })
  })

  it('does not apply horizontal sticky style when a spanned leaf crosses side boundaries', () => {
    const leafSticky: LeafStickyInfo[] = [
      { side: 'start', offset: 0, width: 80, isEdge: true },
      { side: undefined, offset: 0, width: 120, isEdge: false },
    ]

    render(
      <Summary.Row __rowLine={3} __leafSticky={leafSticky}>
        <Summary.Cell index={0} colSpan={2}>
          Mixed span
        </Summary.Cell>
      </Summary.Row>,
    )

    const cell = screen.getByText('Mixed span').closest('.dg-cell-summary') as HTMLElement
    expect(cell).not.toHaveStyle({ left: '0px' })
    expect(cell).not.toHaveStyle({ zIndex: '2' })
  })
})

describe('Summary node parsing', () => {
  it('identifies Summary and Summary.Row elements', () => {
    const summary = (
      <Summary fixed>
        <Summary.Row />
      </Summary>
    )
    const row = <Summary.Row />

    expect(isSummaryElement(summary)).toBe(true)
    expect(isSummaryRowElement(row)).toBe(true)
    expect(isSummaryElement(row)).toBe(false)
  })

  it('parses fixed summary containers and nested fragments', () => {
    const rowA = (
      <Summary.Row key="a">
        <Summary.Cell>A</Summary.Cell>
      </Summary.Row>
    )
    const rowB = (
      <Summary.Row key="b">
        <Summary.Cell>B</Summary.Cell>
      </Summary.Row>
    )

    const parsed = parseSummaryNode(
      <Summary fixed>
        <Fragment>{rowA}</Fragment>
        {'ignored'}
        {false}
        {rowB}
      </Summary>,
    )

    expect(parsed.fixed).toBe(true)
    expect(parsed.rows).toHaveLength(2)
    expect(parsed.rows[0].key).toBe('a')
    expect(parsed.rows[1].key).toBe('b')
  })

  it('parses bare rows and arrays with fixed=false', () => {
    const rowA = <Summary.Row key="a" />
    const rowB = <Summary.Row key="b" />

    expect(parseSummaryNode(rowA)).toEqual({ fixed: false, rows: [rowA] })
    const parsed = parseSummaryNode([rowA, <div key="x" />, [rowB]])
    expect(parsed.fixed).toBe(false)
    expect(parsed.rows).toEqual([rowA, rowB])
  })
})
