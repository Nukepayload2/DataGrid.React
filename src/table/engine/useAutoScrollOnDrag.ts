/**
 * 拖拽中自动滚动容器（autoScrollOnDrag）— 详见 docs/design-notes/drag-sort.md（「auto-scroll」节）。
 *
 * 行拖 / 列拖的 hit-test 实时遍历已渲染的 `[data-row-index]` / `[data-leaf-index]` 单元格算 over index。
 * 虚拟列表下只渲染可视区行；当用户把行拖到容器底部边缘下方时，可视区外的行没有 DOM，hit-test 会
 * "卡住"在可视区最后一行——drop 目标永远在末行，无法到达远处位置。
 *
 * 解决：拖拽中指针接近容器边缘 → 渐进加速滚动容器 → scroll 事件触发虚拟引擎重算已渲染行 →
 * DOM 行边界变化 → 下一帧 hit-test 自动跟随到新位置。
 *
 * 自研 RAF 循环（边缘检测 + scrollBy + cleanup），不依赖 @dnd-kit autoscroll（与其 DndContext 强耦合）。
 * 本 hook 仅负责滚动；hit-test 跟随由调用方在 scroll 事件中重跑（见行/列拖拽 hook 的 onScrollDuringDrag）。
 */

import { useCallback, useEffect, useRef } from 'react'

/** 边缘阈值（指针距容器边缘 < 此值时触发自动滚动）。 */
const EDGE_THRESHOLD = 100

/**
 * 最大滚动速度（px/帧，@60fps ≈ 900 px/s）。确保跟上用户拖拽速度。
 */
const MAX_SPEED = 15

/** 拖拽中指针最新坐标（pointermove 时实时写入，auto-scroll RAF 循环每帧读）。 */
export interface PointerPositionRef {
  /** 最新指针 clientX（pointermove 时更新）。 */
  clientX: number
  /** 最新指针 clientY（pointermove 时更新）。 */
  clientY: number
}

/**
 * 定位滚动容器。详见 docs/design-notes/drag-sort.md（「auto-scroll」节）。
 *
 * 优先级：
 *   1. `root.querySelector('.dg-scroll')`：data-grid 的标准滚动容器（GridTable 在 scroll.x /
 *      scroll.y / virtual / hasFixed 时自包一层）。
 *   2. 向上遍历 `root.offsetParent` 链找最近的可滚动祖先（overflow-x/y 非 visible）——
 *      兜底（如纯表格无 scroll 配置但有外层用户自己包的可滚动容器）。
 *   3. 都失败返回 null（auto-scroll 为 no-op）。
 */
export function findScrollContainer(root: HTMLElement | null): HTMLElement | null {
  if (!root) return null
  // 1. 内部 .dg-scroll。
  const dgScroll = root.querySelector<HTMLElement>('.dg-scroll')
  if (dgScroll) return dgScroll
  // 2. 向上找可滚动祖先。
  let node: HTMLElement | null = root
  while (node) {
    const style = getComputedStyle(node)
    const ox = style.overflowX
    const oy = style.overflowY
    if (
      (ox === 'auto' || ox === 'scroll') ||
      (oy === 'auto' || oy === 'scroll')
    ) {
      return node
    }
    node = node.offsetParent as HTMLElement | null
  }
  return null
}

/**
 * 计算单轴的滚动 delta（px）。
 *
 * @param pointer 指针在该轴的 client 坐标。
 * @param start 容器在该轴的起点（rect.left / rect.top）。
 * @param size 容器在该轴的尺寸（rect.width / rect.height）。
 * @returns 滚动 delta：负值 = 向起点方向滚（向上/向左），正值 = 向终点方向滚（向下/向右），0 = 不滚。
 */
export function computeAxisDelta(pointer: number, start: number, size: number): number {
  const end = start + size
  // 指针距起点边缘的距离（顶部/左部）。
  const distFromStart = pointer - start
  if (distFromStart < EDGE_THRESHOLD) {
    // 近起点边缘 → 向起点方向滚（负 delta）。distFromStart=0 → -MAX_SPEED；=threshold → 0。
    const ratio = 1 - Math.max(distFromStart, 0) / EDGE_THRESHOLD
    return -ratio * MAX_SPEED
  }
  // 指针距终点边缘的距离（底部/右部）。
  const distFromEnd = end - pointer
  if (distFromEnd < EDGE_THRESHOLD) {
    // 近终点边缘 → 向终点方向滚（正 delta）。distFromEnd=0 → +MAX_SPEED；=threshold → 0。
    const ratio = 1 - Math.max(distFromEnd, 0) / EDGE_THRESHOLD
    return ratio * MAX_SPEED
  }
  return 0
}

export interface UseAutoScrollOnDragOptions {
  /**
   * 外层容器 ref（拖拽 hook 的 containerRef）。auto-scroll 从此 ref 内部 `.dg-scroll`
   * 或其可滚动祖先定位滚动容器。
   */
  containerRef: React.RefObject<HTMLElement | null>
  /**
   * 拖拽方向：true = 行拖（纵向滚动），false = 列拖（横向滚动）。
   */
  vertical: boolean
  /**
   * 是否启用 auto-scroll。false 时整个 hook 完全 no-op（零回归）。
   * 通常由调用方根据 `gridOptions.autoScrollOnDrag` 传入。
   */
  autoScroll: boolean
}

/**
 * 拖拽中自动滚动容器 hook。
 *
 * 返回：
 *   - `pointerRef`：指针位置 ref。调用方在 pointermove handler 内实时写入
 *     `pointerRef.current.clientX/clientY`（用最新 ev.clientX/Y）。
 *   - `start()`：拖拽开始时调用（启动 RAF 循环）。
 *   - `stop()`：拖拽结束 / 卸载时调用（取消 RAF + 重置指针坐标）。
 *
 * 用法（拖拽 hook 内）：
 * ```ts
 * const { pointerRef, start, stop } = useAutoScrollOnDrag({
 *   containerRef, vertical: true, autoScroll: opts.autoScroll ?? true,
 * })
 * // pointerdown：start() + 初始化 pointerRef
 * // nativeMove：pointerRef.current = { clientX: ev.clientX, clientY: ev.clientY }
 * // nativeUp：stop()
 * ```
 */
export function useAutoScrollOnDrag(options: UseAutoScrollOnDragOptions): {
  pointerRef: React.MutableRefObject<PointerPositionRef>
  start: () => void
  stop: () => void
} {
  const { containerRef, vertical, autoScroll } = options

  // 指针最新坐标（pointermove 时实时写入；RAF 循环每帧读）。
  const pointerRef = useRef<PointerPositionRef>({ clientX: 0, clientY: 0 })

  // RAF handle（stop 时 cancel）。
  const rafRef = useRef<number | null>(null)

  // 当前是否在 RAF 循环中（避免重复 start）。
  const runningRef = useRef(false)

  const tick = useCallback(() => {
    if (!runningRef.current) {
      rafRef.current = null
      return
    }
    const container = findScrollContainer(containerRef.current)
    if (container) {
      const rect = container.getBoundingClientRect()
      if (vertical) {
        // 行拖：纵向滚动。按指针 clientY 与容器 top/bottom 算 delta。
        const canScrollY = container.scrollHeight > container.clientHeight + 1
        const dy = canScrollY ? computeAxisDelta(pointerRef.current.clientY, rect.top, rect.height) : 0
        if (dy !== 0) {
          // 仅当 delta≠0 才 scrollBy（避免无谓 scroll 事件）。
          container.scrollBy(0, dy)
        }
      } else {
        // 列拖：横向滚动。按指针 clientX 与容器 left/right 算 delta。
        const canScrollX = container.scrollWidth > container.clientWidth + 1
        const dx = canScrollX ? computeAxisDelta(pointerRef.current.clientX, rect.left, rect.width) : 0
        if (dx !== 0) {
          container.scrollBy(dx, 0)
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [containerRef, vertical])

  const start = useCallback(() => {
    if (!autoScroll) return
    if (runningRef.current) return
    runningRef.current = true
    rafRef.current = requestAnimationFrame(tick)
  }, [autoScroll, tick])

  const stop = useCallback(() => {
    runningRef.current = false
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    // 重置指针坐标（防止 stale 数据在下次 start 前被读到）。
    pointerRef.current = { clientX: 0, clientY: 0 }
  }, [])

  // 卸载时清理（防御性：避免组件卸载后 RAF 继续跑）。
  useEffect(() => {
    return () => {
      runningRef.current = false
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [])

  return { pointerRef, start, stop }
}
