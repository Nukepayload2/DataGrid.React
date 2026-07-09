import { toTrack } from './cellRenderUtils'
import type { EngineLeafColumn } from './types'

type GridTemplateColumnLeaf = Pick<EngineLeafColumn, 'fixed' | 'hidden' | 'key' | 'width'>

export interface ComputeGridTemplateColumnsOptions {
  leafColumns: ReadonlyArray<GridTemplateColumnLeaf>
  resizedWidths: ReadonlyMap<string, number>
  tableLayout: 'auto' | 'fixed'
}

export function computeColumnTrack(
  column: GridTemplateColumnLeaf,
  resizedWidths: ReadonlyMap<string, number>,
  tableLayout: 'auto' | 'fixed',
): string {
  if (column.hidden) return '0fr'

  const resized = resizedWidths.get(column.key)
  if (resized !== undefined) return `${resized}px`

  const widthTrack = toTrack(column.width)
  if (widthTrack !== undefined) {
    if (typeof column.width === 'string' && column.width.includes('%')) return widthTrack
    if (column.fixed) return `${widthTrack}`
    return tableLayout === 'fixed' ? `minmax(${widthTrack}, 1fr)` : `minmax(${widthTrack}, max-content)`
  }

  return tableLayout === 'fixed' ? 'minmax(0, 1fr)' : 'minmax(min-content, 1fr)'
}

export function computeGridTemplateColumns({
  leafColumns,
  resizedWidths,
  tableLayout,
}: ComputeGridTemplateColumnsOptions): string {
  const columnTracks = leafColumns.map((column) =>
    computeColumnTrack(column, resizedWidths, tableLayout),
  )

  return columnTracks.join(' ') || 'none'
}
