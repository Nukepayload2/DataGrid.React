import { toTrack } from './cellRenderUtils'
import type { EngineLeafColumn } from './types'

type GridTemplateColumnLeaf = Pick<EngineLeafColumn, 'fixed' | 'hidden' | 'key' | 'width'>

export interface ComputeGridTemplateColumnsOptions {
  leafColumns: ReadonlyArray<GridTemplateColumnLeaf>
  resizedWidths: ReadonlyMap<string, number>
  tableLayout: 'auto' | 'fixed'
}

function widthFrWeight(
  column: GridTemplateColumnLeaf,
  resizedWidths: ReadonlyMap<string, number>,
): number | undefined {
  if (column.hidden || column.fixed) return undefined
  const resized = resizedWidths.get(column.key)
  if (resized !== undefined) return Number.isFinite(resized) && resized > 0 ? resized : undefined
  if (typeof column.width === 'number') {
    return Number.isFinite(column.width) && column.width > 0 ? column.width : undefined
  }
  if (typeof column.width !== 'string') return undefined
  const match = column.width.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)px$/)
  if (!match) return undefined
  const parsed = Number(match[1])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function shouldUseWidthWeightedTracks(
  leafColumns: ReadonlyArray<GridTemplateColumnLeaf>,
  resizedWidths: ReadonlyMap<string, number>,
  tableLayout: 'auto' | 'fixed',
): boolean {
  if (tableLayout !== 'fixed') return false
  if (resizedWidths.size > 0) return false
  const visibleColumns = leafColumns.filter((column) => !column.hidden)
  if (visibleColumns.length === 0) return false
  if (visibleColumns.some((column) => column.fixed)) return false
  return visibleColumns.every((column) => widthFrWeight(column, resizedWidths) !== undefined)
}

function shouldUseFixedWidthFillTracks(
  leafColumns: ReadonlyArray<GridTemplateColumnLeaf>,
  resizedWidths: ReadonlyMap<string, number>,
  tableLayout: 'auto' | 'fixed',
): boolean {
  if (tableLayout !== 'fixed') return false
  if (resizedWidths.size > 0) return false
  const visibleColumns = leafColumns.filter((column) => !column.hidden)
  if (visibleColumns.length === 0) return false
  return visibleColumns.some((column) => toTrack(column.width) === undefined)
}

export function computeColumnTrack(
  column: GridTemplateColumnLeaf,
  resizedWidths: ReadonlyMap<string, number>,
  tableLayout: 'auto' | 'fixed',
  widthWeightedTrack = false,
  fixedWidthFillTrack = false,
): string {
  if (column.hidden) return '0fr'

  const resized = resizedWidths.get(column.key)
  if (widthWeightedTrack) {
    const weight = widthFrWeight(column, resizedWidths)
    if (weight !== undefined) return `minmax(0, ${weight}fr)`
  }
  if (resized !== undefined) return `${resized}px`

  const widthTrack = toTrack(column.width)
  if (widthTrack !== undefined) {
    if (typeof column.width === 'string' && column.width.includes('%')) return widthTrack
    if (column.fixed) return `${widthTrack}`
    if (fixedWidthFillTrack && tableLayout === 'fixed') return `${widthTrack}`
    return tableLayout === 'fixed' ? `minmax(${widthTrack}, 1fr)` : `minmax(${widthTrack}, max-content)`
  }

  return tableLayout === 'fixed' ? 'minmax(0, 1fr)' : 'minmax(min-content, 1fr)'
}

export function computeGridTemplateColumns({
  leafColumns,
  resizedWidths,
  tableLayout,
}: ComputeGridTemplateColumnsOptions): string {
  const widthWeightedTrack = shouldUseWidthWeightedTracks(
    leafColumns,
    resizedWidths,
    tableLayout,
  )
  const fixedWidthFillTrack = shouldUseFixedWidthFillTracks(
    leafColumns,
    resizedWidths,
    tableLayout,
  )
  const columnTracks = leafColumns.map((column) =>
    computeColumnTrack(column, resizedWidths, tableLayout, widthWeightedTrack, fixedWidthFillTrack),
  )

  return columnTracks.join(' ') || 'none'
}
