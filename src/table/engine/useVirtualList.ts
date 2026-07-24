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
import type { VirtualRowMeasurement } from './virtualListUtils'
import { computeScrollTarget, computeVirtualRange } from './virtualListUtils'

export type { VirtualRowMeasurement } from './virtualListUtils'

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
  /**
   * 是否启用行高测量（动态行高场景）。默认 true 保持兼容。
   *
   * 实际生效条件 = `enabled && measurementEnabled`（虚拟关闭时整体不工作）。
   *
   * **何时传 false**：固定行高 + 无界（无 min/max）场景。此时每行实际高度恒等于
   * `getRowHeight(i)`（body track 是 `${h}px` 定值），测量毫无意义反而是污染源——
   * 回收/瞬态布局下 offsetHeight 可能短暂读到 ≠ 约定值，写入 sizeTree 后粘死不自愈，
   * 导致 totalSize 缩水 / 滚动重叠。关闭后 useRowMeasurements 不 observe 不 flush，
   * rowSizes 保持 initialRowSizeState（空 offsetTree）→ 走 fallback measurements 数组路径，
   * 该路径每行用 getRowHeight 累积 offset，totalSize 与 padding 计算对固定行高天然正确。
   *
   * **何时保持 true**：有界行高模型（min/max 行高）或 rowHeight 为函数（每行可能不同）。
   */
  measurementEnabled?: boolean
  /**
   * 固定数值行高快路径。传入正数时，在没有实测 offsetTree 的场景下直接用 O(1)
   * 算 offset/range/totalSize，不为每一行创建 fallback measurement 对象。
   */
  fixedRowHeight?: number
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
    measurementEnabled = true,
    fixedRowHeight,
    contentOffset = 0,
    gap = 0,
  } = options
  const fixedRowHeightEnabled =
    typeof fixedRowHeight === 'number' && fixedRowHeight > 0

  const [rowSizes, setRowSizes] = useState<RowSizeState>(initialRowSizeState)

  const handleRanges = useCallback(
    (ranges: SizeRange[]) => {
      setRowSizes((prev) => applySizeRanges(prev, ranges, gap))
    },
    [gap],
  )
  // 测量仅在「虚拟启用 + 行高可能变化」时才有意义（详见 measurementEnabled 选项文档）。
  // 固定行高 + 无界时关闭：避免瞬态 offsetHeight 污染 sizeTree 导致 totalSize 缩水/重叠。
  useRowMeasurements(containerRef, enabled && measurementEnabled, handleRanges)

  // offsetTree 未覆盖时，回退到约定行高数组。
  const measurements = useMemo<Array<VirtualRowMeasurement>>(() => {
    if (fixedRowHeightEnabled) return []
    const out: Array<VirtualRowMeasurement> = Array.from({ length: itemCount })
    let acc = 0
    for (let i = 0; i < itemCount; i += 1) {
      const size = getRowHeight(i)
      const safeSize = size > 0 ? size : 0
      out[i] = { index: i, offsetStart: acc, offsetEnd: acc + safeSize, size: safeSize }
      acc += safeSize
    }
    return out
  }, [fixedRowHeightEnabled, itemCount, getRowHeight])

  const hasOffsetTree = rowSizes.offsetTree.length > 0

  const effectiveSizeOf = useCallback(
    (i: number): number => {
      const measured = sizeOfInState(i, rowSizes)
      if (measured <= 0 && fixedRowHeightEnabled) return fixedRowHeight
      return measured > 0 ? measured : getRowHeight(i)
    },
    [fixedRowHeightEnabled, fixedRowHeight, rowSizes, getRowHeight],
  )

  const effectiveOffsetOf = useCallback(
    (i: number): number => {
      if (hasOffsetTree) {
        const v = offsetOf(i, rowSizes, gap)
        return v
      }
      if (fixedRowHeightEnabled) return i * fixedRowHeight
      return measurements[i]?.offsetStart ?? 0
    },
    [fixedRowHeightEnabled, fixedRowHeight, hasOffsetTree, rowSizes, gap, measurements],
  )

  const measuredTotal = useMemo(
    () => totalHeightInState(itemCount, rowSizes, gap),
    [itemCount, rowSizes, gap],
  )
  const fallbackTotal = fixedRowHeightEnabled
    ? itemCount * fixedRowHeight
    : measurements.length > 0
      ? measurements[measurements.length - 1].offsetEnd
      : 0
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
    return computeVirtualRange({
      enabled,
      itemCount,
      overscan,
      scrollTop: scrollTopRef.current,
      viewportSize: viewportSizeRef.current,
      contentOffset,
      gap,
      measurements,
      rowSizes: hasOffsetTree ? rowSizes : undefined,
      fixedRowHeight: fixedRowHeightEnabled ? fixedRowHeight : undefined,
    })
  }, [enabled, itemCount, hasOffsetTree, rowSizes, gap, fixedRowHeightEnabled, fixedRowHeight, measurements, overscan, scrollTop, viewportHeight, contentOffset])

  const paddingTop = useMemo(() => {
    if (start >= itemCount) return 0
    if (hasOffsetTree) {
      return Math.max(0, offsetOf(start, rowSizes, gap))
    }
    if (fixedRowHeightEnabled) return start * fixedRowHeight
    return measurements.length > 0 && start < measurements.length
      ? measurements[start].offsetStart
      : 0
  }, [fixedRowHeightEnabled, fixedRowHeight, hasOffsetTree, rowSizes, gap, start, itemCount, measurements])

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
    } else if (fixedRowHeightEnabled) {
      lastBottom = (lastRendered + 1) * fixedRowHeight
    } else if (measurements.length > 0 && lastRendered < measurements.length) {
      lastBottom = measurements[lastRendered].offsetEnd
    } else {
      lastBottom = 0
    }
    return Math.max(0, totalSize - lastBottom)
  }, [fixedRowHeightEnabled, fixedRowHeight, hasOffsetTree, rowSizes, gap, end, itemCount, measurements, effectiveSizeOf, totalSize])

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
      const finalTop = computeScrollTarget({
        itemCount,
        index,
        scrollTop: top,
        offset,
        align,
        clientHeight,
        scrollHeight,
        contentOffset,
        currentScrollTop: scrollTopRef.current,
        viewportSize: viewportSizeRef.current || clientHeight,
        offsetOf: effectiveOffsetOf,
        sizeOf: effectiveSizeOf,
      })
      if (finalTop === null) return

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
