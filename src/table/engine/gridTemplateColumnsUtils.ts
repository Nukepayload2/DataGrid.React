import { toTrack } from './cellRenderUtils'
import type { EngineLeafColumn } from './types'

type GridTemplateColumnLeaf = Pick<
  EngineLeafColumn,
  'fixed' | 'gridColumnOptions' | 'hidden' | 'key' | 'width'
>

function getColumnMinTrack(column: GridTemplateColumnLeaf): string | undefined {
  return toTrack(column.gridColumnOptions?.minWidth)
}

function getColumnMaxTrack(column: GridTemplateColumnLeaf): string | undefined {
  return toTrack(column.gridColumnOptions?.maxWidth)
}

function boundedTrack(
  minTrack: string | undefined,
  maxTrack: string | undefined,
  fallbackMin: string,
  fallbackMax: string,
): string {
  const min = minTrack ?? fallbackMin
  const max = maxTrack ?? fallbackMax
  return `minmax(${min}, ${max})`
}

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
  if (visibleColumns.some((column) => getColumnMinTrack(column) || getColumnMaxTrack(column))) {
    return false
  }
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
  const minTrack = getColumnMinTrack(column)
  const maxTrack = getColumnMaxTrack(column)
  if (widthWeightedTrack) {
    const weight = widthFrWeight(column, resizedWidths)
    if (weight !== undefined) return `minmax(0, ${weight}fr)`
  }
  if (resized !== undefined) return `${resized}px`

  const widthTrack = toTrack(column.width)
  if (widthTrack !== undefined) {
    if (typeof column.width === 'string' && column.width.includes('%')) return widthTrack
    if (column.fixed) {
      if (minTrack || maxTrack) return boundedTrack(minTrack, maxTrack, widthTrack, widthTrack)
      return `${widthTrack}`
    }
    if (fixedWidthFillTrack && tableLayout === 'fixed') {
      return minTrack || maxTrack
        ? boundedTrack(minTrack, maxTrack, widthTrack, '1fr')
        : `${widthTrack}`
    }
    return tableLayout === 'fixed'
      ? boundedTrack(minTrack, maxTrack, widthTrack, '1fr')
      : boundedTrack(minTrack, maxTrack, widthTrack, 'max-content')
  }

  if (tableLayout === 'fixed') {
    return minTrack || maxTrack ? boundedTrack(minTrack, maxTrack, '0', '1fr') : 'minmax(0, 1fr)'
  }

  return minTrack || maxTrack
    ? boundedTrack(minTrack, maxTrack, 'min-content', '1fr')
    : 'minmax(min-content, 1fr)'
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
