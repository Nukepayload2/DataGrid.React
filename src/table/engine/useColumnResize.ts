/**
 * 列宽拖拽调整 hook（M7 resizable）。
 *
 * 算法**借鉴** lun `Table.ColumnResizer.tsx` 的 pointer 拖拽思路，**用纯 React + TS 重写**：
 *   - lun 用全局浮动 resizer div + Vue ref 操作 DOM 样式；
 *   - 本 hook 不操作 DOM 样式，只维护"用户拖拽后的列宽映射"（`resizedWidths: Map<key, px>`），
 *     实际列宽由 GridTable 在算 `grid-template-columns` 时**优先取此映射**（覆盖 column.width）。
 *
 * === 核心机制 ===
 *
 * 1. **resizer 手柄**：调用方在**叶子表头格右侧**渲染一个 `dg-resizer` div（pointer-events 默认 none，
 *    hover 表头时显示）。该 div 绑定本 hook 返回的 `onPointerDown(key)` 回调。
 *
 * 2. **pointerdown**：
 *    - 读取该列**当前实际宽度**（通过表头格 DOM 的 `getBoundingClientRect().width`，而非
 *      column.width——因为列可能是 `max-content`，其 px 值不可从 props 直接得到）。
 *    - 记录起始 clientX、起始宽度。
 *    - 调 `target.setPointerCapture(pointerId)`：把后续 pointermove/up 事件锁定到该手柄元素，
 *      即使指针移出手柄、甚至移出窗口也能继续收到事件（**无抖动/不丢失**的关键）。
 *
 * 3. **pointermove**：`delta = clientX - startX`；`newWidth = clamp(startWidth + delta, min, max)`；
 *    更新 `resizedWidths[key] = newWidth`。state 变化 → GridTable 重算 `grid-template-columns` →
 *    列宽实时变化（流畅）。
 *
 * 4. **pointerup**：释放 pointer capture，清拖拽态。最终宽度已在 move 中持续写入，无需额外提交。
 *
 * 5. **min/max 约束**：默认 min=30（防止拖到 0；参数可配），max=Infinity（不限制过宽）。
 *
 * === 首次拖拽 max-content 列 ===
 *
 * 若列原宽为 `max-content`/未给 width，GridTable 算 track 时本来用 `max-content`。
 * 拖拽开始时本 hook 读到的起始宽度是该 track 的实际渲染 px（getBoundingClientRect），
 * 然后立即在第一次 move 时写入具体 px → 列从 `max-content` 转为**受控 px**，后续按 px 调整。
 * （由 GridTable 在算 colTracks 时：`resizedWidths[key] ?? toTrack(col.width) ?? 'max-content'` 实现。）
 *
 * === 与各能力的组合 ===
 *
 * - **M1 多级表头**：只有叶子表头格有 resizer；分组表头格无手柄（调用方按 `cell.isLeaf` 渲染）。
 *   父分组格的 `grid-column` 范围不变（线号稳定），子叶子宽变 → 父格自动跟随收缩/展开。
 * - **M2 固定列**：列宽变化 → useStickyColumns 的 ResizeObserver 实测到新宽 → 重算 sticky 偏移，
 *   固定列随之正确。**无需本 hook 额外处理**。
 * - **M3 合并**：合并格仍跨原叶子区间；区间内某叶子宽变 → 合并格视觉宽随之变（线号不变）。
 * - **M4 虚拟**：列 track 与行 track 正交；拖列宽不影响虚拟行渲染窗口。
 * - **M6 隐藏列**：`0fr` track 的列**不渲染 resizer**（调用方按 `!cell.hidden` 决定）。
 *
 * === 性能 ===
 *
 * 拖拽期间每次 pointermove 触发一次 setState（ resizedWidths 新对象）→ GridTable 重算
 * `grid-template-columns`（O(cols)）+ 重渲染。对典型表格（<50 列）每帧开销可忽略，流畅无抖动。
 * （与 antd rc-table/resizable 表格同款实现量级。）
 */

import { useCallback, useRef, useState } from 'react'

/** 默认最小列宽（px）。防止拖到 0 导致列消失。 */
const DEFAULT_MIN_WIDTH = 30

/** useColumnResize 配置。 */
export interface UseColumnResizeOptions {
  /**
   * 最小列宽（px）。number → 对所有列统一；函数 → 按列 key 返回（可逐列定制）。
   * 默认 30。
   */
  minWidth?: number | ((key: string) => number)
  /**
   * 最大列宽（px）。number → 对所有列统一；函数 → 按列 key 返回。
   * 默认 Infinity（不限制）。
   */
  maxWidth?: number | ((key: string) => number)
}

export interface UseColumnResizeResult {
  /**
   * 用户拖拽后的列宽映射（key → px 数值）。
   * GridTable 在算 `grid-template-columns` 时优先取此映射，覆盖 column.width。
   * 调用方不应直接 mutate；通过拖拽交互更新。
   */
  resizedWidths: Map<string, number>
  /**
   * 当前正在拖拽的列 key（null 表示未拖拽）。用于：
   *   - 拖拽中禁用 `.dg-grid` 的 grid-template-columns 过渡（避免拖拽动画与实时更新叠加抖动）。
   *   - 拖拽手柄加 `dg-resizer-active` 类（视觉反馈）。
   */
  resizingKey: string | null
  /**
   * 绑定到 resizer 手柄 div 的 pointerdown 回调。
   * 调用方在叶子表头格内渲染 `<div className="dg-resizer" onPointerDown={onPointerDown(colKey)} />`。
   *
   * 内部完成：setPointerCapture + 记录起始态 + 注册 move/up 监听（挂在捕获元素上，由 React 事件代理）。
   */
  onPointerDown: (key: string) => (event: React.PointerEvent<HTMLDivElement>) => void
}

/**
 * 列宽拖拽调整 hook。
 *
 * 用法（GridTable 内）：
 * ```ts
 * const { resizedWidths, resizingKey, onPointerDown } = useColumnResize({ enabled: resizable })
 * // 算 colTracks 时：resizedWidths.get(key) ?? toTrack(col.width) ?? 'max-content'
 * // 渲染叶子表头格时（resizable && !hidden）：渲染 resizer div 绑定 onPointerDown(key)
 * ```
 */
export function useColumnResize(
  options: UseColumnResizeOptions & { enabled: boolean },
): UseColumnResizeResult {
  const { enabled, minWidth = DEFAULT_MIN_WIDTH, maxWidth = Infinity } = options

  // 用户拖拽后的列宽映射（key → px）。每次拖拽 move 都会 setState（新 Map），驱动重渲染。
  // 用 Map 而非 object：保持插入顺序，且 key 任意字符串安全。
  const [resizedWidths, setResizedWidths] = useState<Map<string, number>>(
    () => new Map(),
  )
  // 当前拖拽的列 key（null = 未拖拽）。单独一个 state，便于 GridTable 据此切换过渡禁用。
  const [resizingKey, setResizingKey] = useState<string | null>(null)

  // 拖拽过程中需要跨事件保留的临时状态（不驱动渲染，放 ref）。
  const dragRef = useRef<{
    key: string
    startClientX: number
    startWidth: number
    pointerId: number
    // 当前 move 计算出的最新宽度（pointerup 时无需再读，已在 state 中）
  } | null>(null)

  const resolveMin = useCallback(
    (key: string): number =>
      typeof minWidth === 'function' ? minWidth(key) : minWidth,
    [minWidth],
  )
  const resolveMax = useCallback(
    (key: string): number => {
      const v = typeof maxWidth === 'function' ? maxWidth(key) : maxWidth
      return v
    },
    [maxWidth],
  )

  /** 生成绑定到某列 resizer 的 pointerdown handler。 */
  const onPointerDown = useCallback(
    (key: string) => (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled) return
      // 仅主键（左键，button===0）启动拖拽；右键/中键忽略。
      if (event.button !== 0) return
      // 阻止默认：防止浏览器开始文本选区/拖拽图像等。
      event.preventDefault()
      // 阻止冒泡：避免触发表头格自身的点击/排序等交互（后续任务 S1 排序会用 header click）。
      event.stopPropagation()

      const el = event.currentTarget
      // 读当前列实际宽度：优先用 resizer 的父表头格（.dg-cell-header）宽度。
      // resizer 是表头格的子元素；表头格宽度 = 列宽（叶子表头格恒 1 个/列）。
      const headerCell = el.closest('.dg-cell-header') as HTMLElement | null
      const startWidth = headerCell
        ? headerCell.getBoundingClientRect().width
        : 0

      const pointerId = event.pointerId
      try {
        el.setPointerCapture(pointerId)
      } catch {
        // 极少数情况 setPointerCapture 失败（如 pointer 已 cancel）；忽略，仍尝试继续。
      }

      dragRef.current = {
        key,
        startClientX: event.clientX,
        startWidth,
        pointerId,
      }
      setResizingKey(key)

      // 原生监听 move/up（挂到捕获元素，pointer capture 保证事件路由到它）。
      // 用原生而非 React onPointerMove：React 合成事件在 capture 状态下某些场景可能丢事件，
      // 原生 addEventListener 最稳。
      const nativeMove = (e: PointerEvent) => {
        const drag = dragRef.current
        if (!drag || e.pointerId !== drag.pointerId) return
        const delta = e.clientX - drag.startClientX
        const min = resolveMin(drag.key)
        const max = resolveMax(drag.key)
        let next = drag.startWidth + delta
        if (next < min) next = min
        if (next > max) next = max
        setResizedWidths((prev) => {
          const m = new Map(prev)
          m.set(drag.key, next)
          return m
        })
      }
      const nativeUp = (e: PointerEvent) => {
        const drag = dragRef.current
        if (!drag || e.pointerId !== drag.pointerId) return
        try {
          el.releasePointerCapture(drag.pointerId)
        } catch {
          // ignore
        }
        el.removeEventListener('pointermove', nativeMove)
        el.removeEventListener('pointerup', nativeUp)
        el.removeEventListener('pointercancel', nativeUp)
        dragRef.current = null
        setResizingKey(null)
      }
      el.addEventListener('pointermove', nativeMove)
      el.addEventListener('pointerup', nativeUp)
      el.addEventListener('pointercancel', nativeUp)
    },
    [enabled, resolveMin, resolveMax],
  )

  return { resizedWidths, resizingKey, onPointerDown }
}
