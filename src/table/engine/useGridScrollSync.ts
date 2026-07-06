/**
 * sticky 横向滚动同步 hook（从 GridTable 抽出，行为字节级保持）。
 *
 * 职责：维护 sticky 模式下"虚拟横向 scrollLeft"的状态与事件处理——
 *   wheel 事件 → 更新 `stickyScrollLeft` → 派生 `stickyTranslateStyle`（translateX 驱动 grid 位移），
 *   并与 `StickyScrollBar.getStickyMaxScroll` 协同（用 maxScroll clamp 防止越界）。
 *
 * 背景：sticky 模式下 grid 只包一层 `overflow: clip` 视口，无横向滚动容器；
 *   横向位移由虚拟 `stickyScrollLeft` + `transform: translateX(...)` 模拟。
 *   用户的横向 wheel（shift+wheel 或触控板 deltaX）在本 hook 处理为虚拟 scrollLeft 增量；
 *   `StickyScrollBar` 拖动则通过 `setStickyScrollLeft` 回写同一份 state（路径在 ScrollContainer）。
 *
 * 抽取边界：
 *   - state（`stickyScrollLeft`）+ setter（`setStickyScrollLeft`）+ wheel handler
 *     （`onStickyViewportWheel`）+ 派生 transform style（`stickyTranslateStyle`）四件套全部返回。
 *   - `getStickyMaxScroll` 仍由 `StickyScrollBar.tsx` 提供，本 hook 只调用不改。
 *
 * 详见 docs/design-notes/sticky.md（页面级 sticky 的虚拟横向滚动）。
 */
import {
  useCallback,
  useState,
  type CSSProperties,
} from 'react'
import { clampScrollLeft } from './gridScrollUtils'
import { getStickyMaxScroll } from './StickyScrollBar'

export interface UseGridScrollSyncOptions {
  /** sticky 模式启用（决定 wheel 处理是否短路 + transform 是否启用）。 */
  stickyEnabled: boolean
  /** sticky 视口 ref（getStickyMaxScroll 读 clientWidth）。 */
  stickyViewportRef: React.RefObject<HTMLDivElement | null>
  /** 主 grid ref（getStickyMaxScroll 读 scrollWidth/clientWidth）。 */
  gridRef: React.RefObject<HTMLDivElement | null>
}

export interface UseGridScrollSyncResult {
  /** sticky 当前虚拟横向 scrollLeft（驱动 StickyScrollBar thumb + grid transform）。 */
  stickyScrollLeft: number
  /** sticky scrollLeft setter（StickyScrollBar 拖动/同步回写）。 */
  setStickyScrollLeft: (next: number) => void
  /** sticky 视口 wheel 处理（更新虚拟 stickyScrollLeft）。 */
  onStickyViewportWheel: (event: React.WheelEvent<HTMLDivElement>) => void
  /** sticky transform style（translateX 驱动 grid + summary 同步位移）。 */
  stickyTranslateStyle: CSSProperties | null
}

/**
 * sticky 模式横向滚动同步（先移动不重写，字节级对齐原 GridTable 内联实现）。
 *
 * 行为保持：
 * - `stickyScrollLeft` 初始值 0；wheel / StickyScrollBar 拖动均通过 `setStickyScrollLeft` 更新。
 * - `onStickyViewportWheel`：sticky 未启用短路；maxScroll≤1 短路；delta≤0.5 短路；
 *   clamp 边界（不超 maxScroll）；next===current 短路；preventDefault + setState。
 * - `stickyTranslateStyle`：sticky 启用且 stickyScrollLeft>0 时构造 `translateX(-x)px` + willChange:transform；
 *   否则 null（无 transform）。
 */
export function useGridScrollSync({
  stickyEnabled,
  stickyViewportRef,
  gridRef,
}: UseGridScrollSyncOptions): UseGridScrollSyncResult {
  const [stickyScrollLeft, setStickyScrollLeft] = useState(0)

  const onStickyViewportWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!stickyEnabled) return
      const maxScroll = getStickyMaxScroll(stickyViewportRef.current, gridRef.current)
      if (maxScroll <= 1) return
      const rawDelta = Math.abs(event.deltaX) > 0
        ? event.deltaX
        : event.shiftKey
          ? event.deltaY
          : 0
      if (Math.abs(rawDelta) <= 0.5) return
      const current = clampScrollLeft(stickyScrollLeft, maxScroll)
      const next = clampScrollLeft(current + rawDelta, maxScroll)
      if (next === current) return
      event.preventDefault()
      setStickyScrollLeft(next)
    },
    // refs 不进 deps（与原 GridTable 内联块一致；ref 对象稳定恒等）。
    [stickyEnabled, stickyScrollLeft],
  )

  const stickyTranslateStyle: CSSProperties | null =
    stickyEnabled && stickyScrollLeft > 0
      ? {
          transform: `translateX(${-stickyScrollLeft}px)`,
          willChange: 'transform',
        }
      : null

  return {
    stickyScrollLeft,
    setStickyScrollLeft,
    onStickyViewportWheel,
    stickyTranslateStyle,
  }
}
