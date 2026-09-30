import { isValidElement, type ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { Summary } from '../../../../src/table/engine/Summary'
import { renderSummaryRows, SummaryLayer, summaryRowsTrack } from '../../../../src/table/engine/SummaryLayer'

describe('SummaryLayer', () => {
  const rows = [
    <Summary.Row key="a">
      <Summary.Cell index={0}>Total</Summary.Cell>
    </Summary.Row>,
    <Summary.Row key="b">
      <Summary.Cell index={1}>42</Summary.Cell>
    </Summary.Row>,
  ]
  const summary = { fixed: true, rows, count: rows.length }

  it('builds summary row tracks', () => {
    expect(summaryRowsTrack(0)).toBe('')
    expect(summaryRowsTrack(2)).toBe('auto auto')
    expect(summaryRowsTrack(-1)).toBe('')
  })

  it('injects summary row placement props', () => {
    const rendered = renderSummaryRows({ summary, startLine: 5, leafSticky: [] })

    expect(rendered).toHaveLength(2)
    expect((rendered[0] as ReactElement).props).toMatchObject({
      __rowLine: 5,
      __fixed: true,
      __stickyBottomOffset: 0,
      __leafSticky: [],
    })
    expect((rendered[1] as ReactElement).props).toMatchObject({
      __rowLine: 6,
      __fixed: true,
      __stickyBottomOffset: 0,
      __leafSticky: [],
    })
  })

  it('injects summary bottom offset when requested', () => {
    const rendered = renderSummaryRows({
      summary,
      startLine: 5,
      leafSticky: [],
      stickyBottomOffset: 18,
    })

    // React 19 的 `ReactElement` 默认类型实参是 `unknown`，裸 `as ReactElement` 的 `.props`
    // 即 `unknown`，读属性报 TS2571。此处把被读的那个注入 prop 写进类型实参；纯类型面，运行期不变。
    expect(
      (rendered[0] as ReactElement<{ __stickyBottomOffset: number }>).props
        .__stickyBottomOffset,
    ).toBe(18)
  })

  it('renders nothing when summary is missing or inline placement has no row line', () => {
    expect(
      SummaryLayer({
        summary: null,
        startLine: 1,
        leafSticky: [],
      }),
    ).toBeNull()

    expect(
      SummaryLayer({
        summary,
        startLine: 0,
        leafSticky: [],
      }),
    ).toBeNull()
  })

  it('renders inline summary rows at the requested grid line', () => {
    const layer = SummaryLayer({
      summary,
      startLine: 4,
      leafSticky: [],
    }) as Array<ReactElement<Record<string, unknown>>>

    expect(layer).toHaveLength(2)
    expect(layer[0].props.__rowLine).toBe(4)
    expect(layer[1].props.__rowLine).toBe(5)
    expect(layer[0].props.__fixed).toBe(true)
  })

  it('renders extracted summary as an independent grid', () => {
    const layer = SummaryLayer({
      summary,
      startLine: 99,
      leafSticky: [],
      extracted: true,
      gridClassName: 'dg-grid',
      gridTemplateColumns: '10px 20px',
      scrollMinWidth: 120,
      stickyBottomOffset: 18,
    })

    expect(isValidElement(layer)).toBe(true)
    const element = layer as ReactElement<{
      className?: string
      style: Record<string, unknown>
      children: Array<ReactElement<Record<string, unknown>>>
    }>
    expect(element.props.className).toBe('dg-grid')
    expect(element.props.style).toMatchObject({
      display: 'grid',
      gridTemplateRows: 'auto auto',
      gridTemplateColumns: '10px 20px',
      minWidth: 120,
    })
    expect(element.props.children[0].props.__rowLine).toBe(1)
    expect(element.props.children[1].props.__rowLine).toBe(2)
    expect(element.props.children[0].props.__stickyBottomOffset).toBe(18)
  })
})
