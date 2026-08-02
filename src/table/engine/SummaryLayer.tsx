import { cloneElement, type ReactElement, type ReactNode, type Ref } from 'react'
import type { SummaryRowProps } from './Summary'
import type { LeafStickyInfo } from './useStickyColumns'

export interface SummaryParsedRows {
  fixed: boolean
  rows: Array<ReactElement<SummaryRowProps>>
  count: number
}

export interface RenderSummaryRowsOptions {
  summary: SummaryParsedRows
  startLine: number
  leafSticky: Array<LeafStickyInfo | undefined>
  stickyBottomOffset?: number
}

export function summaryRowsTrack(count: number): string {
  return Array.from({ length: Math.max(0, count) }, () => 'auto').join(' ')
}

export function renderSummaryRows({
  summary,
  startLine,
  leafSticky,
  stickyBottomOffset = 0,
}: RenderSummaryRowsOptions): Array<ReactNode> {
  return summary.rows.map((row, rowIndex) => {
    const rowLine = startLine + rowIndex
    return cloneElement(row, {
      key: `dg-summary-row-${rowIndex}`,
      __rowLine: rowLine,
      __fixed: summary.fixed,
      __stickyBottomOffset: stickyBottomOffset,
      __leafSticky: leafSticky,
    } as Partial<typeof row.props>)
  })
}

export interface SummaryLayerProps {
  summary: SummaryParsedRows | null
  startLine: number
  leafSticky: Array<LeafStickyInfo | undefined>
  extracted?: boolean
  extractedGridRef?: Ref<HTMLDivElement>
  gridClassName?: string
  gridTemplateColumns?: string
  scrollMinWidth?: number | string
  stickyBottomOffset?: number
}

export function SummaryLayer({
  summary,
  startLine,
  leafSticky,
  extracted = false,
  extractedGridRef,
  gridClassName,
  gridTemplateColumns,
  scrollMinWidth,
  stickyBottomOffset = 0,
}: SummaryLayerProps): ReactNode {
  if (!summary) return null

  if (!extracted) {
    if (startLine <= 0) return null
    return renderSummaryRows({ summary, startLine, leafSticky })
  }

  return (
    <div
      ref={extractedGridRef}
      className={gridClassName}
      style={{
        display: 'grid',
        gridTemplateRows: summaryRowsTrack(summary.count) || 'none',
        gridTemplateColumns,
        ...(scrollMinWidth ? { minWidth: scrollMinWidth } : null),
      }}
    >
      {renderSummaryRows({ summary, startLine: 1, leafSticky, stickyBottomOffset })}
    </div>
  )
}
