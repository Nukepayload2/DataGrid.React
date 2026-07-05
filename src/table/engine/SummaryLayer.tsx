import { cloneElement, type CSSProperties, type ReactElement, type ReactNode } from 'react'
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
}

export function summaryRowsTrack(count: number): string {
  return Array.from({ length: Math.max(0, count) }, () => 'auto').join(' ')
}

export function renderSummaryRows({
  summary,
  startLine,
  leafSticky,
}: RenderSummaryRowsOptions): Array<ReactNode> {
  return summary.rows.map((row, rowIndex) => {
    const rowLine = startLine + rowIndex
    return cloneElement(row, {
      key: `dg-summary-row-${rowIndex}`,
      __rowLine: rowLine,
      __fixed: summary.fixed,
      __leafSticky: leafSticky,
    } as Partial<typeof row.props>)
  })
}

export interface SummaryLayerProps {
  summary: SummaryParsedRows | null
  startLine: number
  leafSticky: Array<LeafStickyInfo | undefined>
  extracted?: boolean
  gridClassName?: string
  gridTemplateColumns?: string
  scrollMinWidth?: number | string
  stickyTranslateStyle?: CSSProperties | null
}

export function SummaryLayer({
  summary,
  startLine,
  leafSticky,
  extracted = false,
  gridClassName,
  gridTemplateColumns,
  scrollMinWidth,
  stickyTranslateStyle,
}: SummaryLayerProps): ReactNode {
  if (!summary) return null

  if (!extracted) {
    if (startLine <= 0) return null
    return renderSummaryRows({ summary, startLine, leafSticky })
  }

  return (
    <div
      className={gridClassName}
      style={{
        display: 'grid',
        gridTemplateRows: summaryRowsTrack(summary.count) || 'none',
        gridTemplateColumns,
        ...(scrollMinWidth ? { minWidth: scrollMinWidth } : null),
        ...(stickyTranslateStyle ?? null),
      }}
    >
      {renderSummaryRows({ summary, startLine: 1, leafSticky })}
    </div>
  )
}
