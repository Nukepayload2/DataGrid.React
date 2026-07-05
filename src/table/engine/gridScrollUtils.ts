export function scrollLeftValue(value: number | undefined): number {
  return Number.isFinite(value) ? (value as number) : 0
}

export function clampScrollLeft(value: number, maxScroll: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(value, Math.max(0, maxScroll)))
}

export function computeStickyMaxScroll(
  viewportClientWidth: number,
  gridScrollWidth: number,
  gridClientWidth: number,
): number {
  return Math.max(0, (gridScrollWidth || gridClientWidth || 0) - (viewportClientWidth || 0))
}
