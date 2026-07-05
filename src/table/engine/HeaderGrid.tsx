import type { ReactNode } from 'react'
import type { EngineHeaderCell, FixedSide } from './types'

export interface HeaderGridRenderProps<RecordType> {
  cell: EngineHeaderCell<RecordType>
  sticky?: { side: FixedSide; offset: number; isEdge: boolean }
  headerStickyTopOffset: number
}

export interface HeaderGridProps<RecordType> {
  showHeader: boolean
  headerCells: Array<EngineHeaderCell<RecordType>>
  headerSticky: Map<string, { side: FixedSide; offset: number; isEdge: boolean }>
  headerRowOffsets: Array<number>
  renderHeaderCell: (props: HeaderGridRenderProps<RecordType>) => ReactNode
}

export function HeaderGrid<RecordType>({
  showHeader,
  headerCells,
  headerSticky,
  headerRowOffsets,
  renderHeaderCell,
}: HeaderGridProps<RecordType>) {
  if (!showHeader) return null

  return headerCells.map((cell) =>
    cell.covered
      ? null
      : renderHeaderCell({
          cell,
          sticky: headerSticky.get(cell.key),
          headerStickyTopOffset: cell.gridRowStart >= 1
            ? headerRowOffsets[cell.gridRowStart - 1] ?? 0
            : 0,
        }),
  )
}
