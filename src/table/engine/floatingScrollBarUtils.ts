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

/**
 * 轨道点击命中区域。
 *
 * - `thumb`：点在 thumb 本体上 → 维持现有「增量拖动」语义，由 caller 进入拖动循环。
 * - `before`：点在 thumb 之前的轨道空白（垂直=上方 / 水平=左方）→ 向前/上滚一页。
 * - `after`：点在 thumb 之后的轨道空白（垂直=下方 / 水平=右方）→ 向后/下滚一页。
 */
export type TrackHitZone = 'thumb' | 'before' | 'after'

export interface ComputeTrackJumpOptions {
  /** 当前 scrollTop / scrollLeft。 */
  currentScroll: number
  /**
   * 一页的尺寸（用于按页跳转的步长）。
   *
   * 垂直方向 = 可见数据区高度（clientHeight − headerH − summaryH）；水平方向 = 可见数据区宽度
   * （clientWidth − left inset − right inset，通常即 clientWidth）。caller 按方向预算后传入。
   */
  viewportSize: number
  /** pointerdown 的客户端坐标（垂直=clientY / 水平=clientX）。 */
  clientPos: number
  /** thumb 当前在屏幕上的起点（垂直=top / 水平=left）。 */
  thumbStart: number
  /** thumb 当前在屏幕上的终点（垂直=bottom / 水平=right）。 */
  thumbEnd: number
  /** 最小可滚动位置；默认 0。 */
  minScroll?: number
  /** 最大可滚动位置（geometry.maxScroll）。 */
  maxScroll: number
}

export interface ComputeTrackJumpResult {
  /** 命中区域（thumb / before / after）。 */
  zone: TrackHitZone
  /**
   * 跳转后的 scrollTop / scrollLeft。
   *
   * - `zone === 'thumb'`：等于 `currentScroll`（caller 应沿用增量拖动逻辑，本函数不改动位置）。
   * - `zone === 'before'` / `'after'`：按一页步长向该方向跳，并 clamp 到 `[minScroll, maxScroll]`。
   */
  nextScroll: number
}

/**
 * 轨道点击按页跳转的纯函数（命中检测 + jump-delta 计算）。
 *
 * 行为对齐浏览器原生滚动条轨道点击：
 *
 * - 点在 thumb 本体上 → `zone: 'thumb'`，nextScroll === currentScroll（不跳页，由 caller 沿用
 *   增量拖动循环）。
 * - 点在 thumb 上方/左方轨道空白 → `zone: 'before'`，nextScroll = clamp(currentScroll − viewportSize)。
 * - 点在 thumb 下方/右方轨道空白 → `zone: 'after'`，nextScroll = clamp(currentScroll + viewportSize)。
 *
 * 设计为纯函数（无 DOM/React 依赖），便于独立单测覆盖各分支与边界（极值/越界/退化尺寸）。
 *
 * 注意：本函数不实现"按住连续按页跳"——只处理单次 pointerdown 的跳转。若未来需要长按持续翻页，
 * 由 caller 用 timer 周期调用本函数即可（nextScroll 会因 currentScroll 更新而逐步逼近 maxScroll）。
 */
export function computeTrackJump(options: ComputeTrackJumpOptions): ComputeTrackJumpResult {
  const {
    currentScroll,
    viewportSize,
    clientPos,
    thumbStart,
    thumbEnd,
    minScroll = 0,
    maxScroll,
  } = options

  // 命中 thumb 本体（含边界，与 hit-test 闭区间一致）：不跳页，沿用增量拖动。
  if (clientPos >= thumbStart && clientPos <= thumbEnd) {
    return { zone: 'thumb', nextScroll: currentScroll }
  }

  // 点在 thumb 之前（垂直=上方 / 水平=左方）：向前/上按页跳，clamp 到 [minScroll, maxScroll]。
  if (clientPos < thumbStart) {
    const stepped = currentScroll - viewportSize
    const clamped = Math.max(minScroll, Math.min(maxScroll, stepped))
    return { zone: 'before', nextScroll: clamped }
  }

  // 点在 thumb 之后（垂直=下方 / 水平=右方）：向后/下按页跳，clamp 到 [minScroll, maxScroll]。
  const stepped = currentScroll + viewportSize
  const clamped = Math.max(minScroll, Math.min(maxScroll, stepped))
  return { zone: 'after', nextScroll: clamped }
}
