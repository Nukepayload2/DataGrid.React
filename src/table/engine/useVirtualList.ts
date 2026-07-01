/** 虚拟滚动主算法。更完整的设计说明见文档。 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import {
  applySizeRanges,
  initialRowSizeState,
  offsetOf,
  type RowSizeState,
  sizeOf as sizeOfInState,
  totalHeight as totalHeightInState,
} from './rowSizeSystem'
import { useRowMeasurements } from './useRowMeasurements'
import type { SizeRange } from './rowSizeSystem'

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

/** 滚动方向：'up' | 'down' | 'none'。 */
export type ScrollDirection = 'up' | 'down' | 'none'

export interface UseVirtualListOptions {
  /** 数据行总数。 */
  itemCount: number
  /** 未测量行的回退行高。 */
  getRowHeight: (index: number) => number
  /** 纵向滚动容器。 */
  containerRef: React.RefObject<HTMLElement | null>
  /**
   * 上下两侧额外渲染的行数（overscan）。默认 8。
   * 可视区上下各多渲染 `overscan` 行，避免快速滚动出现空白。
   */
  overscan?: number
  /** 是否启用（false 时禁用虚拟，返回全集范围）。默认 true。 */
  enabled?: boolean
  /** 数据区相对滚动容器内容顶部的偏移。 */
  contentOffset?: number
  /** 行间距（px）。 */
  gap?: number
}

export interface UseVirtualListResult {
  /** 渲染范围（半开区间，0-based 数据行 index）。 */
  start: number
  end: number
  /** 当前可视数据行数（end - start）。 */
  visibleCount: number
  /** 数据区总高（px）。 */
  totalSize: number
  /** 可视区上方占位高度（px）= offsetOf(start)。 */
  paddingTop: number
  /** 可视区下方占位高度（px）= totalSize - offsetOf(end-1) - sizeOf(end-1)。 */
  paddingBottom: number
  /** 回退路径使用的行测量信息。 */
  measurements: Array<VirtualRowMeasurement>
  /** 当前 scrollTop（受控同步用）。 */
  scrollTop: number
  /** 容器可视高度（clientHeight）。 */
  viewportSize: number
  /** 当前是否正在滚动。 */
  isScrolling: boolean
  /** 当前滚动方向（'up' | 'down' | 'none'）。 */
  scrollDirection: ScrollDirection
  /** 查询第 index 行的高度；优先使用实测值。 */
  sizeOf: (index: number) => number
  /** 滚动到指定位置或行。 */
  scrollTo: (config: {
    index?: number
    scrollTop?: number
    offset?: number
    align?: 'start' | 'center' | 'end' | 'nearest'
    behavior?: 'auto' | 'smooth'
  }) => void
  /** 是否有平滑滚动正在进行中。 */
  scrollingInProgress: boolean
}

/** 在 fallback measurements 上二分定位起始行。 */
function findNearestIndex(
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
function findStartIndexByOffset(
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

/** smooth scroll 使用的缓动函数。 */
function easeOutExpo(x: number): number {
  return x === 1 ? 1 : 1 - 2 ** (-10 * x)
}

const SMOOTH_SCROLL_FRAME_COUNT = 50

/** 虚拟滚动主 hook。 */
export function useVirtualList(options: UseVirtualListOptions): UseVirtualListResult {
  const {
    itemCount,
    getRowHeight,
    containerRef,
    overscan = 8,
    enabled = true,
    contentOffset = 0,
    gap = 0,
  } = options

  const [rowSizes, setRowSizes] = useState<RowSizeState>(initialRowSizeState)

  const handleRanges = useCallback(
    (ranges: SizeRange[]) => {
      setRowSizes((prev) => applySizeRanges(prev, ranges, gap))
    },
    [gap],
  )
  useRowMeasurements(containerRef, enabled, handleRanges)

  // offsetTree 未覆盖时，回退到约定行高数组。
  const measurements = useMemo<Array<VirtualRowMeasurement>>(() => {
    const out: Array<VirtualRowMeasurement> = Array.from({ length: itemCount })
    let acc = 0
    for (let i = 0; i < itemCount; i += 1) {
      const size = getRowHeight(i)
      const safeSize = size > 0 ? size : 0
      out[i] = { index: i, offsetStart: acc, offsetEnd: acc + safeSize, size: safeSize }
      acc += safeSize
    }
    return out
  }, [itemCount, getRowHeight])

  const hasOffsetTree = rowSizes.offsetTree.length > 0

  const effectiveSizeOf = useCallback(
    (i: number): number => {
      const measured = sizeOfInState(i, rowSizes)
      return measured > 0 ? measured : getRowHeight(i)
    },
    [rowSizes, getRowHeight],
  )

  const effectiveOffsetOf = useCallback(
    (i: number): number => {
      if (hasOffsetTree) {
        const v = offsetOf(i, rowSizes, gap)
        return v
      }
      return measurements[i]?.offsetStart ?? 0
    },
    [hasOffsetTree, rowSizes, gap, measurements],
  )

  const measuredTotal = useMemo(
    () => totalHeightInState(itemCount, rowSizes, gap),
    [itemCount, rowSizes, gap],
  )
  const fallbackTotal =
    measurements.length > 0 ? measurements[measurements.length - 1].offsetEnd : 0
  const totalSize = hasOffsetTree && measuredTotal > 0 ? measuredTotal : fallbackTotal

  const [scrollState, setScrollState] = useState<{ scrollTop: number; viewportHeight: number }>({
    scrollTop: 0,
    viewportHeight: 0,
  })
  const [isScrolling, setIsScrolling] = useState<boolean>(false)
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>('none')
  const [scrollingInProgress, setScrollingInProgress] = useState<boolean>(false)

  const scrollTopRef = useRef(0)
  const viewportSizeRef = useRef(0)

  const isScrollingMountedRef = useRef<boolean>(false) // skip 1：挂载首次不触发 true→false 闪烁
  const isScrollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevScrollTopForScrollingRef = useRef<number | null>(null) // duc 比较
  const scrollDirectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevScrollTopForDirectionRef = useRef<number | null>(null)
  const scrollTopTargetRef = useRef<number | null>(null)
  const smoothFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const smoothRafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)

  useEffect(() => {
    return () => {
      if (isScrollingTimerRef.current !== null) {
        clearTimeout(isScrollingTimerRef.current)
        isScrollingTimerRef.current = null
      }
      if (scrollDirectionTimerRef.current !== null) {
        clearTimeout(scrollDirectionTimerRef.current)
        scrollDirectionTimerRef.current = null
      }
      if (smoothFallbackTimerRef.current !== null) {
        clearTimeout(smoothFallbackTimerRef.current)
        smoothFallbackTimerRef.current = null
      }
      if (smoothRafRef.current !== null) {
        cancelAnimationFrame(smoothRafRef.current)
        smoothRafRef.current = null
      }
    }
  }, [])

  const deriveScrollFlags = useCallback((nextScrollTop: number) => {
    const prevTop = prevScrollTopForScrollingRef.current
    prevScrollTopForScrollingRef.current = nextScrollTop
    if (prevTop !== null && prevTop !== nextScrollTop) {
      if (!isScrollingMountedRef.current) {
        isScrollingMountedRef.current = true
      }
      setIsScrolling(true)
      if (isScrollingTimerRef.current !== null) {
        clearTimeout(isScrollingTimerRef.current)
      }
      isScrollingTimerRef.current = setTimeout(() => {
        isScrollingTimerRef.current = null
        setIsScrolling(false)
      }, 100)
    }

    const prevDirTop = prevScrollTopForDirectionRef.current
    prevScrollTopForDirectionRef.current = nextScrollTop
    if (prevDirTop !== null && prevDirTop !== nextScrollTop) {
      const dir: ScrollDirection = nextScrollTop < prevDirTop ? 'up' : 'down'
      setScrollDirection(dir)
      if (scrollDirectionTimerRef.current !== null) {
        clearTimeout(scrollDirectionTimerRef.current)
      }
      scrollDirectionTimerRef.current = setTimeout(() => {
        scrollDirectionTimerRef.current = null
        setScrollDirection('none')
      }, 50)
    }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el || !enabled) return

    const publish = (suppressFlushSync: boolean) => {
      const st = Math.max(0, el.scrollTop)
      const ch = el.clientHeight
      scrollTopRef.current = st
      viewportSizeRef.current = ch
      const apply = () => {
        setScrollState({ scrollTop: st, viewportHeight: ch })
        deriveScrollFlags(st)
      }
      const smoothInFlight = scrollTopTargetRef.current !== null
      if (suppressFlushSync || smoothInFlight) {
        apply()
      } else {
        flushSync(apply)
      }
      const target = scrollTopTargetRef.current
      if (target !== null) {
        const maxSt = Math.max(0, el.scrollHeight - ch)
        const reached =
          Math.abs(st - target) <= 1 || st <= 0 || st >= maxSt
        if (reached) {
          scrollTopTargetRef.current = null
          if (smoothFallbackTimerRef.current !== null) {
            clearTimeout(smoothFallbackTimerRef.current)
            smoothFallbackTimerRef.current = null
          }
          setScrollingInProgress(false)
        }
      }
    }

    const onScroll = () => publish(false)

    publish(true)

    el.addEventListener('scroll', onScroll, { passive: true })

    const ro = new ResizeObserver(() => publish(false))
    ro.observe(el)

    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [containerRef, enabled, deriveScrollFlags])

  const { scrollTop, viewportHeight } = scrollState

  const { start, end } = useMemo(() => {
    if (!enabled || itemCount === 0) {
      return { start: 0, end: itemCount }
    }
    const vs = viewportSizeRef.current
    const st = scrollTopRef.current
    if (vs <= 0) {
      const initialCount = Math.min(itemCount, overscan * 2 + 1)
      return { start: 0, end: initialCount }
    }
    const effectiveScrollTop = st - contentOffset
    const effectiveViewport = Math.max(0, vs - contentOffset)

    let rawStart: number
    let rawEnd: number
    if (hasOffsetTree) {
      rawStart = findStartIndexByOffset(effectiveScrollTop, rowSizes, gap)
      rawEnd = findStartIndexByOffset(effectiveScrollTop + effectiveViewport, rowSizes, gap)
    } else {
      rawStart = findNearestIndex(measurements, effectiveScrollTop)
      rawEnd = findNearestIndex(measurements, effectiveScrollTop + effectiveViewport)
    }

    const startIdx = Math.max(0, rawStart - overscan)
    const endIdx = Math.min(itemCount, Math.max(rawStart + 1, rawEnd) + overscan)
    return { start: startIdx, end: endIdx }
  }, [enabled, itemCount, hasOffsetTree, rowSizes, gap, measurements, overscan, scrollTop, viewportHeight, contentOffset])

  const paddingTop = useMemo(() => {
    if (start >= itemCount) return 0
    if (hasOffsetTree) {
      return Math.max(0, offsetOf(start, rowSizes, gap))
    }
    return measurements.length > 0 && start < measurements.length
      ? measurements[start].offsetStart
      : 0
  }, [hasOffsetTree, rowSizes, gap, start, itemCount, measurements])

  const paddingBottom = useMemo(() => {
    if (end <= 0 || end > itemCount) {
      if (end <= 0) return 0
    }
    const lastRendered = Math.min(end, itemCount) - 1
    if (lastRendered < 0) return 0
    let lastBottom: number
    if (hasOffsetTree) {
      const top = offsetOf(lastRendered, rowSizes, gap)
      const size = effectiveSizeOf(lastRendered)
      lastBottom = top + size
    } else if (measurements.length > 0 && lastRendered < measurements.length) {
      lastBottom = measurements[lastRendered].offsetEnd
    } else {
      lastBottom = 0
    }
    return Math.max(0, totalSize - lastBottom)
  }, [hasOffsetTree, rowSizes, gap, end, itemCount, measurements, effectiveSizeOf, totalSize])

  const sizeOf = useCallback(
    (i: number): number => effectiveSizeOf(i),
    [effectiveSizeOf],
  )

  const scrollTo = useCallback(
    (config: {
      index?: number
      scrollTop?: number
      offset?: number
      align?: 'start' | 'center' | 'end' | 'nearest'
      behavior?: 'auto' | 'smooth'
    }) => {
      const el = containerRef.current
      if (!el) return
      const {
        index,
        scrollTop: top,
        offset = 0,
        align = 'start',
        behavior = 'auto',
      } = config

      const clientHeight = el.clientHeight
      const scrollHeight = el.scrollHeight
      const maxScrollTop = Math.max(0, scrollHeight - clientHeight)

      let targetTop: number
      if (typeof top === 'number') {
        targetTop = Math.max(0, top)
      } else if (typeof index === 'number') {
        if (itemCount === 0) return
        const clampedIndex = index < 0
          ? 0
          : index >= itemCount
            ? itemCount - 1
            : index
        const rowTop = effectiveOffsetOf(clampedIndex)
        const rowSize = effectiveSizeOf(clampedIndex)
        const vs = (viewportSizeRef.current || clientHeight) - contentOffset
        if (align === 'nearest') {
          const viewportTop = scrollTopRef.current - contentOffset
          const viewportBottom = viewportTop + vs
          if (rowTop >= viewportTop && rowTop + rowSize <= viewportBottom) {
            return
          }
          const effectiveAlign: 'start' | 'end' =
            rowTop < viewportTop ? 'start' : 'end'
          targetTop =
            effectiveAlign === 'end' ? rowTop + rowSize - vs : rowTop
        } else {
          switch (align) {
            case 'center':
              targetTop = rowTop + rowSize / 2 - vs / 2
              break
            case 'end':
              targetTop = rowTop + rowSize - vs
              break
            case 'start':
            default:
              targetTop = rowTop
              break
          }
        }
        targetTop = Math.max(0, targetTop)
      } else {
        return
      }
      const finalTop = Math.ceil(Math.max(0, Math.min(maxScrollTop, targetTop + offset)))

      const currentScrollTop = scrollTopRef.current
      if (finalTop === currentScrollTop) {
        scrollTopTargetRef.current = null
        if (smoothFallbackTimerRef.current !== null) {
          clearTimeout(smoothFallbackTimerRef.current)
          smoothFallbackTimerRef.current = null
        }
        if (scrollingInProgress) setScrollingInProgress(false)
        return
      }

      if (behavior === 'smooth') {
        scrollTopTargetRef.current = finalTop
        if (smoothFallbackTimerRef.current !== null) {
          clearTimeout(smoothFallbackTimerRef.current)
        }
        smoothFallbackTimerRef.current = setTimeout(() => {
          smoothFallbackTimerRef.current = null
          if (smoothRafRef.current !== null) {
            cancelAnimationFrame(smoothRafRef.current)
            smoothRafRef.current = null
          }
          el.scrollTo({ top: finalTop, behavior: 'instant' as ScrollBehavior })
          scrollTopRef.current = el.scrollTop
          scrollTopTargetRef.current = null
          setScrollingInProgress(false)
        }, Math.ceil((SMOOTH_SCROLL_FRAME_COUNT / 60) * 1000) + 200)
        setScrollingInProgress(true)

        if (smoothRafRef.current !== null) {
          cancelAnimationFrame(smoothRafRef.current)
          smoothRafRef.current = null
        }
        const start = el.scrollTop
        let frame = 0
        const step = () => {
          if (scrollTopTargetRef.current === null) {
            smoothRafRef.current = null
            return
          }
          if (frame < SMOOTH_SCROLL_FRAME_COUNT) {
            const t = easeOutExpo(frame / SMOOTH_SCROLL_FRAME_COUNT)
            const top = start + (finalTop - start) * t
            el.scrollTo({ top, behavior: 'instant' as ScrollBehavior })
            frame += 1
            smoothRafRef.current = requestAnimationFrame(step)
          } else {
            el.scrollTo({ top: finalTop, behavior: 'instant' as ScrollBehavior })
            scrollTopRef.current = el.scrollTop
            scrollTopTargetRef.current = null
            smoothRafRef.current = null
            if (smoothFallbackTimerRef.current !== null) {
              clearTimeout(smoothFallbackTimerRef.current)
              smoothFallbackTimerRef.current = null
            }
            setScrollingInProgress(false)
          }
        }
        smoothRafRef.current = requestAnimationFrame(step)
      } else {
        el.scrollTop = finalTop
        scrollTopRef.current = el.scrollTop
        setScrollState((prev) => ({ scrollTop: el.scrollTop, viewportHeight: prev.viewportHeight }))
      }
    },
    [containerRef, itemCount, contentOffset, effectiveOffsetOf, effectiveSizeOf, scrollingInProgress],
  )

  return {
    start,
    end,
    visibleCount: Math.max(0, end - start),
    totalSize,
    paddingTop,
    paddingBottom,
    measurements,
    scrollTop,
    viewportSize: viewportHeight,
    isScrolling,
    scrollDirection,
    scrollingInProgress,
    sizeOf,
    scrollTo,
  }
}
