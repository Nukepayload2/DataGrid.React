import type { RowSizeState } from './rowSizeSystem'

/** 单行的纵向测量信息（offsetStart/offsetEnd 相对数据区顶部，不含表头）。 */
export interface VirtualRowMeasurement {
  /** 0-based 行索引。 */
  index: number
  /** 行顶部到数据区顶的距离（px）。 */
  offsetStart: number
  /** 行底部到数据区顶的距离（px）= offsetStart + size。 */
  offsetEnd: number
  /** 行高（px，来自 getRowHeight）。 */
  size: number
}

export interface ComputeVirtualRangeOptions {
  enabled: boolean
  itemCount: number
  overscan: number
  scrollTop: number
  viewportSize: number
  contentOffset: number
  gap: number
  measurements: Array<VirtualRowMeasurement>
  rowSizes?: RowSizeState
}

export interface ComputeScrollTargetOptions {
  itemCount: number
  index?: number
  scrollTop?: number
  offset: number
  align: 'start' | 'center' | 'end' | 'nearest'
  clientHeight: number
  scrollHeight: number
  contentOffset: number
  currentScrollTop: number
  viewportSize: number
  offsetOf: (index: number) => number
  sizeOf: (index: number) => number
}

/** 在 fallback measurements 上二分定位起始行。 */
export function findNearestIndex(
  measurements: Array<VirtualRowMeasurement>,
  target: number,
): number {
  const n = measurements.length
  if (n === 0) return 0
  let lo = 0
  let hi = n - 1
  if (target <= measurements[0].offsetStart) return 0
  if (target >= measurements[n - 1].offsetEnd) return n
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const m = measurements[mid]
    if (target < m.offsetStart) {
      hi = mid - 1
    } else if (target >= m.offsetEnd) {
      lo = mid + 1
    } else {
      return mid
    }
  }
  return Math.max(0, Math.min(lo, n))
}

/** 在 offsetTree 上定位 scrollTop 对应的起始行。 */
export function findStartIndexByOffset(
  target: number,
  rowSizes: RowSizeState,
  gap: number,
): number {
  const tree = rowSizes.offsetTree
  if (tree.length === 0) return 0
  if (target <= 0) return 0

  let lo = 0
  let hi = tree.length - 1
  let pointIndex = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const p = tree[mid]!
    if (p.offset === target) {
      pointIndex = mid
      break
    }
    if (p.offset < target) {
      pointIndex = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  const point = tree[pointIndex]!
  if (target <= point.offset) {
    return point.index
  }
  const advance = Math.floor((target - point.offset + gap) / (point.size + gap))
  return point.index + advance
}

export function computeVirtualRange(options: ComputeVirtualRangeOptions): {
  start: number
  end: number
} {
  const {
    enabled,
    itemCount,
    overscan,
    scrollTop,
    viewportSize,
    contentOffset,
    gap,
    measurements,
    rowSizes,
  } = options

  if (!enabled || itemCount === 0) {
    return { start: 0, end: itemCount }
  }
  if (viewportSize <= 0) {
    const initialCount = Math.min(itemCount, overscan * 2 + 1)
    return { start: 0, end: initialCount }
  }

  const effectiveScrollTop = scrollTop - contentOffset
  const effectiveViewport = Math.max(0, viewportSize - contentOffset)
  const hasOffsetTree = !!rowSizes && rowSizes.offsetTree.length > 0

  let rawStart: number
  let rawEnd: number
  if (hasOffsetTree) {
    rawStart = findStartIndexByOffset(effectiveScrollTop, rowSizes, gap)
    rawEnd = findStartIndexByOffset(effectiveScrollTop + effectiveViewport, rowSizes, gap)
  } else {
    rawStart = findNearestIndex(measurements, effectiveScrollTop)
    rawEnd = findNearestIndex(measurements, effectiveScrollTop + effectiveViewport)
  }

  const start = Math.max(0, rawStart - overscan)
  const end = Math.min(itemCount, Math.max(rawStart + 1, rawEnd) + overscan)
  return { start, end }
}

export function computeScrollTarget(options: ComputeScrollTargetOptions): number | null {
  const {
    itemCount,
    index,
    scrollTop,
    offset,
    align,
    clientHeight,
    scrollHeight,
    contentOffset,
    currentScrollTop,
    viewportSize,
    offsetOf: getOffsetOf,
    sizeOf,
  } = options
  const maxScrollTop = Math.max(0, scrollHeight - clientHeight)

  let targetTop: number
  if (typeof scrollTop === 'number') {
    targetTop = Math.max(0, scrollTop)
  } else if (typeof index === 'number') {
    if (itemCount === 0) return null
    const clampedIndex = index < 0
      ? 0
      : index >= itemCount
        ? itemCount - 1
        : index
    const rowTop = getOffsetOf(clampedIndex)
    const rowSize = sizeOf(clampedIndex)
    const effectiveViewportSize = viewportSize - contentOffset
    if (align === 'nearest') {
      const viewportTop = currentScrollTop - contentOffset
      const viewportBottom = viewportTop + effectiveViewportSize
      if (rowTop >= viewportTop && rowTop + rowSize <= viewportBottom) {
        return null
      }
      const effectiveAlign: 'start' | 'end' =
        rowTop < viewportTop ? 'start' : 'end'
      targetTop =
        effectiveAlign === 'end'
          ? rowTop + rowSize - effectiveViewportSize
          : rowTop
    } else {
      switch (align) {
        case 'center':
          targetTop = rowTop + rowSize / 2 - effectiveViewportSize / 2
          break
        case 'end':
          targetTop = rowTop + rowSize - effectiveViewportSize
          break
        case 'start':
        default:
          targetTop = rowTop
          break
      }
    }
    targetTop = Math.max(0, targetTop)
  } else {
    return null
  }

  return Math.ceil(Math.max(0, Math.min(maxScrollTop, targetTop + offset)))
}
