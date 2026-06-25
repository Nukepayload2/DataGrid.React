/**
 * 虚拟滚动算法（Phase 3 重写：对齐 react-virtuoso）。
 *
 * === 重写要点（Phase 3）===
 *
 *   1. 动态行高：`measurements[]` O(N) 数组 → `RowSizeState`（sizeTree + offsetTree
 *      前缀和缓存），查询 offsetOf/sizeOf/totalHeight O(log n)/O(1)。
 *   2. 未测量行回退：sizeTree 空 / 未覆盖到的行 → 退回约定 `getRowHeight(i)` 撑 offset，
 *      保证固定高 demo 在 Phase 4 加 data-* 属性前也能正常滚（「约定值兜底」简化策略）。
 *   3. flushSync 发布：scroll 事件用 `flushSync(setScrollState)` 替代原 RAF 合并块——
 *      同步把 {scrollTop, viewportHeight} 推出，无一帧延迟；首测 `suppressFlushSync`
 *      直接 set（避免挂载期间 flushSync 警告/重入）。
 *      **Phase 5 修正**：smooth 滚动进行中（scrollTopTargetRef!==null）改异步 publish——
 *      flushSync × 虚拟化耦合会干扰原生 smooth 每帧目标导致最终落点漂移（详见 publish 注释）。
 *   4. isScrolling / scrollDirection：react-virtuoso stateFlagsSystem 同款——
 *      isScrolling = duc(scrollTop) skip(1) → true，debounceTime(100) → false；
 *      scrollDirection = 与 prev scrollTop 比 up/down，停止 throttleTime(50) → none。
 *   5. scrollTo：index 路径用 `offsetOf(index, rowSizes, gap)`（fallback measurements），
 *      保留 align start/center/end/nearest + contentOffset。
 *      **Phase 5**：新增 `behavior:'auto'|'smooth'`（默认 auto 瞬时）+ align nearest「已可见不跳」
 *      + smooth JS RAF 缓动（easeOutExpo × 50 帧，末帧 instant 落定——对齐 react-virtuoso smooth-scroll.ts；
 *        弃用原生 `behavior:'smooth'`：与虚拟化重渲染耦合致落点漂移）+ 到达检测 + 暴露 `scrollingInProgress`。
 *      **Phase 5 修正**：smooth 期间 publish 改异步（不 flushSync），消除重渲染对动画的干扰。
 *
 * === 与 Phase 1/2 集成 ===
 *
 *   - 状态：`rowSizes: RowSizeState`（initialRowSizeState）。
 *   - 接 useRowMeasurements：变化段回调里 `setRowSizes(prev => applySizeRanges(prev, ranges, gap))`。
 *   - gap：UseVirtualListOptions 加 `gap?: number`（默认 0）；传给 applySizeRanges/offsetOf。
 *     GridTable 暂不传（用默认 0，Phase 4 再传真实 row-gap）。
 *
 * === 兼容性 ===
 *
 *   返回值继续暴露 start/end/totalSize/paddingTop/paddingBottom/scrollTo/scrollTop/viewportSize，
 *   新增 isScrolling/scrollDirection/sizeOf；measurements 仍保留（fallback 路径 + 旧调用方）。
 */

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
  /**
   * 行高约定取值器：`(index) => number(px)`。
   *
   * **决策 2**：此处始终按"收起状态"行高算（不感知展开）。调用方传入的函数应只依赖
   * `(record, index)` 的"收起态"行高（即 `TableProps.rowHeight`）。
   *
   * Phase 3 起还兼任「未测量行回退」——sizeTree 未覆盖到的行（含空树）用此值撑 offset，
   * 保证固定高 demo 在 Phase 4 加 data-* 属性前也能正常滚（约定值兜底）。
   */
  getRowHeight: (index: number) => number
  /**
   * 纵向滚动容器 ref（clientHeight / scrollTop 来源）；同时作为 useRowMeasurements
   * 的 body 容器 ref（行级子元素的直接父）。
   */
  containerRef: React.RefObject<HTMLElement | null>
  /**
   * 上下两侧额外渲染的行数（overscan）。默认 8。
   * 与 tanstack/virtual / lun 一致：可视区上下各多渲染 `overscan` 行，避免快速滚动出现空白。
   */
  overscan?: number
  /** 是否启用（false 时禁用虚拟，返回全集范围）。默认 true。 */
  enabled?: boolean
  /**
   * 数据区在滚动容器内容中的"起始偏移"（px），用于精确算可视范围。
   *
   * 典型场景：表头格在容器顶部（高 H = maxDepth × headerHeight）+ sticky top:0。
   * 此时：
   *   - 表头视觉上始终占用容器顶部 H 高度（sticky）；
   *   - 真正显示数据的高度 = clientHeight - H；
   *   - 真正的"数据 scrollTop" = el.scrollTop - H（数据区相对内容顶的偏移）。
   * 把 H 传入这里，本 hook 会把 scrollTop/viewportSize 调整后再算 [start, end)。
   *
   * 缺省 0（数据区紧贴容器顶部，无表头）。
   */
  contentOffset?: number
  /**
   * 行间距（px）。传给 applySizeRanges（offsetTree 增量重建）与 offsetOf（offset 查询）。
   * 默认 0；Phase 4 GridTable 接入真实 row-gap 时传入。
   */
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
  /**
   * 行测量信息数组（长度 === itemCount）；O(N) 计算，memoize。
   * Phase 3 起：仅在 offsetTree 空时（fallback 路径）使用；保留以兼容旧调用方。
   */
  measurements: Array<VirtualRowMeasurement>
  /** 当前 scrollTop（受控同步用）。 */
  scrollTop: number
  /** 容器可视高度（clientHeight）。 */
  viewportSize: number
  /** 当前是否正在滚动（duc + skip 1 + debounce 100ms）。 */
  isScrolling: boolean
  /** 当前滚动方向（'up' | 'down' | 'none'）。 */
  scrollDirection: ScrollDirection
  /**
   * 查询第 index 行的（实测）高度（px）。
   * - sizeTree 覆盖到该行 → 返回实测值；
   * - 否则（空树 / 未测） → 返回约定 `getRowHeight(index)` 兜底。
   * Phase 4 GridTable 用此值写 `data-known-size` 闭环。
   */
  sizeOf: (index: number) => number
  /**
   * 滚动到指定位置/行/记录 key（scrollTo API 入口）。
   *
   * 与 antd `Table ref.scrollTo` 接口对齐（见 antd `index.zh-CN.md` Table ref）：
   *   - `{ index }`：滚到第 index 行顶部对齐。
   *   - `{ key }`：滚到 rowKey === key 的行顶部对齐（调用方需先把 key → index 再传 index）。
   *     本 hook 只处理 index/scrollTop；key→index 解析由 Table 层完成（调用 scrollTo 时传 index）。
   *   - `{ scrollTop }`：直接滚到指定 scrollTop（兼容任务要求；antd 同名为 `top`）。
   *   - `{ offset }`：在目标行顶部对齐后额外偏移（正向下、负向上）。
   *   - `{ align }`：'start' | 'center' | 'end' | 'nearest'（默认 'start'）。
   *     nearest：目标行已完全在可视区时**不滚动**（不跳），仅当上方不可见→按 start、
   *     下方不可见→按 end（对齐 react-virtuoso scrollIntoViewSystem.defaultCalculateViewLocation）。
   *   - `{ behavior }`：'auto'（默认，瞬时）| 'smooth'（原生平滑动画）。
   *     data-grid 专属（antd 无此字段）；Phase 5 新增。
   */
  scrollTo: (config: {
    index?: number
    scrollTop?: number
    offset?: number
    align?: 'start' | 'center' | 'end' | 'nearest'
    behavior?: 'auto' | 'smooth'
  }) => void
  /**
   * 是否有平滑滚动正在进行中（behavior:'smooth' 时为 true，到达目标/边界/超时后翻 false）。
   * Phase 5 新增：供后续 deviation 抑制；等高场景暂不消费，先暴露。
   */
  scrollingInProgress: boolean
}

/**
 * 二分查找：返回 `offset >= target` 的首个行 index（即"包含 target 偏移的行的下一个"）。
 * 用于在 offsetStart 升序数组中定位 scrollTop 对应的起始行（fallback 路径专用）。
 *
 * 约定：返回值在 `[0, itemCount]` 区间；`itemCount` 表示 target 超出末尾。
 */
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

/**
 * 在 offsetTree 上二分 + 段内除法，定位 scrollTop 对应的起始行 index。
 * 同构移植自 react-virtuoso listStateSystem L293-329 的「offset → index」换算思路。
 *
 *   1. 二分找 offsetTree 中 offset<=target 的最大断点 (point)；
 *   2. 若 point.offset < target：段内推进
 *      `advance = floor((target - point.offset + gap) / (point.size + gap))`，
 *      返回 point.index + advance（含同段后续行）；
 *   3. 否则（target<=point.offset，即 target 落在断点行顶部之前/正好）返回 point.index。
 *
 * @param target 数据区坐标系的 scrollTop（已减 contentOffset）。
 * @param rowSizes 行尺寸状态。
 * @param gap 行间距。
 */
function findStartIndexByOffset(
  target: number,
  rowSizes: RowSizeState,
  gap: number,
): number {
  const tree = rowSizes.offsetTree
  if (tree.length === 0) return 0
  if (target <= 0) return 0

  // 二分找 offset <= target 的最大断点。
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

/**
 * easeOutExpo 缓动（对齐 react-virtuoso utils.ts L15-17 + dom.ts DEFAULT_SMOOTH_SCROLL_BEZIER_FUNCTION）。
 *   `x === 1 → 1` 保证末帧精确到 1（避免浮点尾差），其余 `1 - 2^(-10x)`。
 */
function easeOutExpo(x: number): number {
  return x === 1 ? 1 : 1 - 2 ** (-10 * x)
}

/**
 * smooth 动画总帧数（对齐 react-virtuoso dom.ts DEFAULT_SMOOTH_SCROLL_FRAME_COUNT = 50）。
 *   60fps 下 ≈ 833ms；与原 1000ms fallback timer 协同（fallback 仅在 RAF 异常时兜底）。
 */
const SMOOTH_SCROLL_FRAME_COUNT = 50

/**
 * 虚拟滚动主 hook（Phase 3 重写）。
 *
 * 不依赖 lun / @rc-component/virtual-list 任何代码；纯 React + flushSync 实现，
 * 算法对齐 react-virtuoso（useScrollTop / stateFlagsSystem / listStateSystem）。
 */
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

  // === 行尺寸状态（Phase 1 产出）===
  const [rowSizes, setRowSizes] = useState<RowSizeState>(initialRowSizeState)

  // === 行测量（Phase 2 产出）：变化段回填到 rowSizes ===
  const handleRanges = useCallback(
    (ranges: SizeRange[]) => {
      setRowSizes((prev) => applySizeRanges(prev, ranges, gap))
    },
    [gap],
  )
  useRowMeasurements(containerRef, enabled, handleRanges, gap)

  // === 约定行高 fallback 数组（O(N)）—— 仅 offsetTree 空 / 部分未覆盖时使用 ===
  // 保留以：① fallback 路径算 start/end/padding；② scrollTo index 的兜底 offset；
  // ③ 兼容旧调用方读取 measurements。getRowHeight 引用变化时重算。
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

  // === effectiveSizeOf：实测优先，未测回退约定 ===
  const effectiveSizeOf = useCallback(
    (i: number): number => {
      const measured = sizeOfInState(i, rowSizes)
      return measured > 0 ? measured : getRowHeight(i)
    },
    [rowSizes, getRowHeight],
  )

  // === effectiveOffsetOf：实测优先，未测回退 measurements ===
  const effectiveOffsetOf = useCallback(
    (i: number): number => {
      if (hasOffsetTree) {
        const v = offsetOf(i, rowSizes, gap)
        // offsetOf 对 i 落在已测段内返回正确值；对 i 超出 lastIndex 的未测尾部
        // 也按 lastSize 推算（rowSizeSystem 已处理）。仅当返回 0 且 i>0 且确实未覆盖
        // 时回退——但实测 offsetTree 非空时 offsetOf 已能给出合理值（含尾部外推），
        // 此处信任之，不再二次回退（避免与实测路径不一致）。
        return v
      }
      return measurements[i]?.offsetStart ?? 0
    },
    [hasOffsetTree, rowSizes, gap, measurements],
  )

  // === totalSize ===
  const measuredTotal = useMemo(
    () => totalHeightInState(itemCount, rowSizes, gap),
    [itemCount, rowSizes, gap],
  )
  const fallbackTotal =
    measurements.length > 0 ? measurements[measurements.length - 1].offsetEnd : 0
  const totalSize = hasOffsetTree && measuredTotal > 0 ? measuredTotal : fallbackTotal

  // === scroll / viewport 状态（合并为 scrollState）===
  const [scrollState, setScrollState] = useState<{ scrollTop: number; viewportHeight: number }>({
    scrollTop: 0,
    viewportHeight: 0,
  })
  const [isScrolling, setIsScrolling] = useState<boolean>(false)
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>('none')
  // Phase 5：平滑滚动进行中标志（behavior:'smooth' 期间 true；到达目标/触边界/1000ms 超时→false）。
  const [scrollingInProgress, setScrollingInProgress] = useState<boolean>(false)

  // refs 持有最新 scrollTop/viewportHeight 供 scrollTo / 范围计算读取（避免闭包陈旧）。
  const scrollTopRef = useRef(0)
  const viewportSizeRef = useRef(0)

  // isScrolling / scrollDirection 状态机辅助 refs（对齐 stateFlagsSystem）。
  const isScrollingMountedRef = useRef<boolean>(false) // skip 1：挂载首次不触发 true→false 闪烁
  const isScrollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevScrollTopForScrollingRef = useRef<number | null>(null) // duc 比较
  const scrollDirectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevScrollTopForDirectionRef = useRef<number | null>(null)
  // Phase 5：smooth 到达检测状态（对齐 react-virtuoso useScrollTop L70-79, L99-176）。
  // scrollTopTarget：smooth 目标值（null 表示无 smooth 在途）；到达检测在 onScroll 里比对。
  const scrollTopTargetRef = useRef<number | null>(null)
  // 1000ms fallback：原生 smooth 不保证派发到达事件，超时强制清 target。
  const smoothFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Phase 5 修正：JS RAF 驱动 smooth 动画句柄（替代原生 behavior:'smooth'，保证落点确定性）。
  //   对齐 react-virtuoso smooth-scroll.ts：每帧 scrollTo({behavior:'instant'}) 走 easeOutExpo，
  //   末帧把精确 target 以 instant 落定——原生 smooth 与虚拟化重渲染耦合会漂移，JS 驱动可控制每帧。
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

  // === isScrolling / scrollDirection 派生（在 scrollState 更新时调用）===
  //   - isScrolling：duc(scrollTop) skip(1) → true；debounceTime(100) → false。
  //   - scrollDirection：scrollTop 减小 → 'up'；增大 → 'down'；停止 throttleTime(50) → 'none'。
  const deriveScrollFlags = useCallback((nextScrollTop: number) => {
    // ---- isScrolling ----
    const prevTop = prevScrollTopForScrollingRef.current
    prevScrollTopForScrollingRef.current = nextScrollTop
    if (prevTop !== null && prevTop !== nextScrollTop) {
      // duc 命中变化 + skip(1) 已满足（prevTop !== null 表示非首次）。
      if (!isScrollingMountedRef.current) {
        isScrollingMountedRef.current = true
      }
      setIsScrolling(true)
      // debounceTime(100) → false：重置定时器，100ms 无新变化则翻 false。
      if (isScrollingTimerRef.current !== null) {
        clearTimeout(isScrollingTimerRef.current)
      }
      isScrollingTimerRef.current = setTimeout(() => {
        isScrollingTimerRef.current = null
        setIsScrolling(false)
      }, 100)
    }

    // ---- scrollDirection ----
    const prevDirTop = prevScrollTopForDirectionRef.current
    prevScrollTopForDirectionRef.current = nextScrollTop
    if (prevDirTop !== null && prevDirTop !== nextScrollTop) {
      const dir: ScrollDirection = nextScrollTop < prevDirTop ? 'up' : 'down'
      setScrollDirection(dir)
      // throttleTime(50) → 'none'：滚动停止 50ms 后翻 none（react-virtuoso 用 throttle
      // 把持续滚动后的尾事件 mapTo none；此处简化为停 50ms 翻 none）。
      if (scrollDirectionTimerRef.current !== null) {
        clearTimeout(scrollDirectionTimerRef.current)
      }
      scrollDirectionTimerRef.current = setTimeout(() => {
        scrollDirectionTimerRef.current = null
        setScrollDirection('none')
      }, 50)
    }
  }, [])

  // === 监听滚动 & 容器尺寸（flushSync 发布）===
  useEffect(() => {
    const el = containerRef.current
    if (!el || !enabled) return

    const publish = (suppressFlushSync: boolean) => {
      const st = Math.max(0, el.scrollTop)
      const ch = el.clientHeight
      // 立即刷新 ref（供 scrollTo 读最新值，无陈旧风险）。
      scrollTopRef.current = st
      viewportSizeRef.current = ch
      const apply = () => {
        setScrollState({ scrollTop: st, viewportHeight: ch })
        deriveScrollFlags(st)
      }
      // ★ smooth 进行中改异步 publish（不 flushSync）——Phase5 验证发现的 critical bug 修复。
      //   原因：smooth 动画期间 scroll 事件高频触发，每事件 flushSync 同步重渲染 → 行 DOM
      //   mount/unmount → 布局抖动干扰浏览器原生 smooth 每帧目标 → 最终 scrollTop 落点漂移
      //   （index 999 三次实测偏差 [0,-407,-657]px）。react-virtuoso useScrollTop 在 smooth
      //   期间同样用异步（RAF）发布以避免打断原生动画。
      //   判定：scrollTopTargetRef!==null（smooth 在途）→ 走异步（suppressFlushSync 语义）。
      //   smooth 结束（到达检测清 target）后，下次 scroll 自动回到 flushSync 路径（保留 Phase3
      //   消除内容滞后目的）。正常手动滚动 scrollingInProgress=false 且 target=null → flushSync。
      const smoothInFlight = scrollTopTargetRef.current !== null
      if (suppressFlushSync || smoothInFlight) {
        apply()
      } else {
        flushSync(apply)
      }
      // Phase 5：smooth 到达检测（react-virtuoso useScrollTop L70-79 同款）。
      // 当 scrollTop≈target（容差 1px）或触边界（0 / maxScroll）→ 清 target + 翻 false。
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

    // 首测：直接 set（suppressFlushSync），避免挂载期间 flushSync 重入/警告
    // （react-virtuoso useScrollTop L89 同款 suppressFlushSync:true 首次）。
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

  // === 渲染范围计算 ===
  // contentOffset 调整：把 scrollTop/viewportSize 换算到"数据区坐标系"。
  //   effectiveScrollTop = el.scrollTop - contentOffset（数据区相对内容顶的滚动偏移）
  //   effectiveViewport  = clientHeight - contentOffset（表头 sticky 占去顶部 contentOffset 高）
  const { start, end } = useMemo(() => {
    if (!enabled || itemCount === 0) {
      return { start: 0, end: itemCount }
    }
    const vs = viewportSizeRef.current
    const st = scrollTopRef.current
    // 未测出容器高度（首次/隐藏元素）→ 退化为渲染较小窗口（前 overscan*2 行），避免一次渲染全集。
    if (vs <= 0) {
      const initialCount = Math.min(itemCount, overscan * 2 + 1)
      return { start: 0, end: initialCount }
    }
    const effectiveScrollTop = st - contentOffset
    const effectiveViewport = Math.max(0, vs - contentOffset)

    let rawStart: number
    let rawEnd: number
    if (hasOffsetTree) {
      // offsetTree 路径：二分 + 段内除法（O(log n)）。
      rawStart = findStartIndexByOffset(effectiveScrollTop, rowSizes, gap)
      rawEnd = findStartIndexByOffset(effectiveScrollTop + effectiveViewport, rowSizes, gap)
      // rawEnd 可能落在末行之后；findStartIndexByOffset 不 clamp，下面统一处理。
    } else {
      // fallback：measurements 二分（保留 findNearestIndex）。
      rawStart = findNearestIndex(measurements, effectiveScrollTop)
      rawEnd = findNearestIndex(measurements, effectiveScrollTop + effectiveViewport)
    }

    const startIdx = Math.max(0, rawStart - overscan)
    // rawEnd 可能等于 itemCount（target 超出末尾）；取 max 至少含 rawStart + 1。
    const endIdx = Math.min(itemCount, Math.max(rawStart + 1, rawEnd) + overscan)
    return { start: startIdx, end: endIdx }
  }, [enabled, itemCount, hasOffsetTree, rowSizes, gap, measurements, overscan, scrollTop, viewportHeight, contentOffset])

  // === 占位高度（撑总高）===
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
      // end<=0 兜底 0；end>itemCount 理论不应出现（上面 clamp 过），保守返回 0。
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

  // === sizeOf（对外暴露）===
  const sizeOf = useCallback(
    (i: number): number => effectiveSizeOf(i),
    [effectiveSizeOf],
  )

  // === scrollTo API（Phase 5：behavior/nearest/smooth+到达检测）===
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

      // 容器最大可滚动 scrollTop（含表头 contentOffset 占高）。
      const clientHeight = el.clientHeight
      const scrollHeight = el.scrollHeight
      const maxScrollTop = Math.max(0, scrollHeight - clientHeight)

      let targetTop: number
      if (typeof top === 'number') {
        // scrollTop/top 分支：直接作为容器 scrollTop；负值 clamp 到 0（到顶）。
        targetTop = Math.max(0, top)
      } else if (typeof index === 'number') {
        if (itemCount === 0) return
        // 边界加固：负值 index → 当作 0；超大 index → 当作最后一行。
        const clampedIndex = index < 0
          ? 0
          : index >= itemCount
            ? itemCount - 1
            : index
        // rowTop 优先用 offsetOf（实测），fallback measurements[index].offsetStart（约定）。
        const rowTop = effectiveOffsetOf(clampedIndex)
        const rowSize = effectiveSizeOf(clampedIndex)
        // ★ targetTop 直接用"数据区坐标系"的 rowTop，不加 contentOffset。
        //   表头是 position:sticky; top:0，不占数据区滚动空间——它脱离了数据内容流，
        //   数据区用独立的 paddingTop track 撑偏移。故目标行的容器绝对滚动偏移 = rowTop 本身。
        const vs = (viewportSizeRef.current || clientHeight) - contentOffset
        // ★ nearest「已可见不跳」短路（对齐 react-virtuoso scrollIntoViewSystem L11-25
        //   defaultCalculateViewLocation：itemTop>=viewportTop && itemBottom<=viewportBottom → null）。
        //   数据区坐标系：viewportTop = el.scrollTop - contentOffset；viewportBottom = viewportTop + vs。
        if (align === 'nearest') {
          const viewportTop = scrollTopRef.current - contentOffset
          const viewportBottom = viewportTop + vs
          if (rowTop >= viewportTop && rowTop + rowSize <= viewportBottom) {
            // 已完全可见 → 不滚动、不跳。清理可能残留的 smooth target（防止悬挂 in-progress）。
            return
          }
          // 不可见：上方→按 start（对齐顶部）；下方→按 end（对齐底部）。
          // （react-virtuoso defaultCalculateViewLocation 把 align 改写成 'start'/'end' 后回环；
          //  此处直接落到对应分支计算，等价。）
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
      // 叠加用户 offset，先 clamp ≥0（到顶），再 clamp ≤ maxScrollTop（到底）。
      const finalTop = Math.ceil(Math.max(0, Math.min(maxScrollTop, targetTop + offset)))

      const currentScrollTop = scrollTopRef.current
      // ★ 短路：目标 == 当前 scrollTop（react-virtuoso useScrollTop L145 `top === scrollTop`）。
      //   不滚动、直接同步一次状态；若是 smooth 则立即视为到达。
      if (finalTop === currentScrollTop) {
        scrollTopTargetRef.current = null
        if (smoothFallbackTimerRef.current !== null) {
          clearTimeout(smoothFallbackTimerRef.current)
          smoothFallbackTimerRef.current = null
        }
        if (scrollingInProgress) setScrollingInProgress(false)
        return
      }

      // 应用滚动：auto→瞬时 set scrollTop；smooth→JS RAF 缓动（对齐 react-virtuoso smooth-scroll.ts）。
      if (behavior === 'smooth') {
        // 设 target + 启 1000ms fallback；onScroll 到达检测里清。
        scrollTopTargetRef.current = finalTop
        if (smoothFallbackTimerRef.current !== null) {
          clearTimeout(smoothFallbackTimerRef.current)
        }
        // fallback 时长取 SMOOTH_SCROLL_FRAME_COUNT 帧的预估耗时 + 200ms 余量（≈1033ms），
        // 仅当 RAF 因页签隐藏/异常未跑完时强制收尾。
        smoothFallbackTimerRef.current = setTimeout(() => {
          smoothFallbackTimerRef.current = null
          if (smoothRafRef.current !== null) {
            cancelAnimationFrame(smoothRafRef.current)
            smoothRafRef.current = null
          }
          // 兜底：把精确 target 落定（与正常末帧一致）。
          el.scrollTo({ top: finalTop, behavior: 'instant' as ScrollBehavior })
          scrollTopRef.current = el.scrollTop
          scrollTopTargetRef.current = null
          setScrollingInProgress(false)
        }, Math.ceil((SMOOTH_SCROLL_FRAME_COUNT / 60) * 1000) + 200)
        setScrollingInProgress(true)

        // ★ Phase 5 修正：放弃原生 behavior:'smooth'，改 JS RAF 驱动 easeOutExpo 缓动。
        //   原因（验证者实测）：原生 smooth × 虚拟化重渲染耦合 → 最终落点漂移
        //   （index 999 偏差 [0,-407,-657]px；async-publish 仅缓解仍漂移 [0,151]px）。
        //   JS 逐帧 scrollTo({behavior:'instant'}) 把缓动完全交给我们控制，末帧以 instant
        //   落定精确 target——与虚拟化重渲染解耦，落点严格确定性。
        //   实现同构 react-virtuoso smooth-scroll.ts L49-75。
        if (smoothRafRef.current !== null) {
          cancelAnimationFrame(smoothRafRef.current)
          smoothRafRef.current = null
        }
        const start = el.scrollTop
        let frame = 0
        const step = () => {
          // 若 target 已被清（外部 cancel / 新 scrollTo 接管）→ 停止动画。
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
            // 末帧：精确落定 target（instant），收尾 in-progress/target/fallback timer。
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
        // auto：瞬时 set scrollTop；原生 scroll 事件会触发 onScroll → 更新 start/end。
        el.scrollTop = finalTop
        // 部分浏览器在 set scrollTop 后不立刻派发 scroll 事件（或被合并），手动同步一次兜底。
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
