export type HoverEventHandler<Event> = (event: Event) => void

export function isRowSpanHovered(
  startRow: number,
  logicalRowSpan: number,
  hoveredRowIndex: number | null,
): boolean {
  return (
    hoveredRowIndex !== null &&
    hoveredRowIndex >= startRow &&
    hoveredRowIndex <= startRow + logicalRowSpan - 1
  )
}

export function resolveHoverClass(
  rowHoverable: boolean | undefined,
  isHovered: boolean,
): string | undefined {
  return rowHoverable === false ? undefined : isHovered ? 'dg-row-hover' : undefined
}

export function mergeHoverEventHandler<Event>(
  rowHoverable: boolean | undefined,
  applyHover: () => void,
  userHandler: HoverEventHandler<Event> | undefined,
): HoverEventHandler<Event> | undefined {
  if (rowHoverable === false) return userHandler

  return (event: Event) => {
    applyHover()
    userHandler?.(event)
  }
}
