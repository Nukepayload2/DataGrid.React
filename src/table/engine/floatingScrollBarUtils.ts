export interface FloatingScrollbarGeometry {
  scrollSize: number
  clientSize: number
  trackSize: number
  thumbSize: number
  maxScroll: number
  thumbMaxOffset: number
  visible: boolean
}

export interface ComputeFloatingScrollbarGeometryOptions {
  scrollSize: number
  clientSize: number
  trackSize: number
  minThumbSize?: number
  overflowTolerance?: number
}

export const EMPTY_FLOATING_SCROLLBAR_GEOMETRY: FloatingScrollbarGeometry = {
  scrollSize: 0,
  clientSize: 0,
  trackSize: 0,
  thumbSize: 0,
  maxScroll: 0,
  thumbMaxOffset: 0,
  visible: false,
}

export function computeFloatingScrollbarGeometry(
  options: ComputeFloatingScrollbarGeometryOptions,
): FloatingScrollbarGeometry {
  const {
    scrollSize,
    clientSize,
    trackSize,
    minThumbSize = 32,
    overflowTolerance = 1,
  } = options

  if (scrollSize <= clientSize + overflowTolerance) {
    return EMPTY_FLOATING_SCROLLBAR_GEOMETRY
  }

  const safeTrackSize = Math.max(0, trackSize)
  const thumbSize = Math.max(minThumbSize, safeTrackSize * (clientSize / scrollSize))
  const maxScroll = Math.max(0, scrollSize - clientSize)
  const thumbMaxOffset = Math.max(0, safeTrackSize - thumbSize)

  return {
    scrollSize,
    clientSize,
    trackSize: safeTrackSize,
    thumbSize,
    maxScroll,
    thumbMaxOffset,
    visible: true,
  }
}

export function computeFloatingThumbOffset(
  scrollOffset: number,
  geometry: FloatingScrollbarGeometry,
): number {
  if (geometry.maxScroll <= 0 || geometry.thumbMaxOffset <= 0) return 0
  return (scrollOffset / geometry.maxScroll) * geometry.thumbMaxOffset
}

export function computeFloatingDragScrollOffset(
  startScrollOffset: number,
  pointerDelta: number,
  geometry: FloatingScrollbarGeometry,
): number {
  if (geometry.maxScroll <= 0 || geometry.thumbMaxOffset <= 0) {
    return startScrollOffset
  }
  return startScrollOffset + (pointerDelta / geometry.thumbMaxOffset) * geometry.maxScroll
}
