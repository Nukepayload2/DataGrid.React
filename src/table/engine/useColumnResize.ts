/**
 * 列宽拖拽调整 hook（resizable）— 详见 docs/design-notes/column-width.md（「拖拽调整列宽」节）。
 *
 * 维护"用户拖拽后的列宽映射"（`resizedWidths: Map<key, px>`），GridTable 在算
 * `grid-template-columns` 时优先取此映射（覆盖 column.width）。不操作 DOM 样式。
 *
 * 核心机制：调用方在叶子表头格右侧渲染 `dg-resizer` div 绑定 `onPointerDown(key)`；
 * pointerdown 读列实际宽（getBoundingClientRect，因列可能是 max-content 无 px props）+
 * setPointerCapture 锁定事件；pointermove 按 columnResizeMode 写入映射：
 * - ResizeLeft：只改左侧列宽，表格宽度总和随之变化。
 * - ResizeSibling：左侧列增减、右侧相邻列反向增减，表格总宽保持不变。
 * pointerup 释放 capture。默认 min=30（防拖到 0），max=Infinity。
 */

import { useCallback, useRef, useState } from 'react'

/** 默认最小列宽（px）。防止拖到 0 导致列消失。 */
const DEFAULT_MIN_WIDTH = 30

export type ColumnResizeMode = 'Disabled' | 'ResizeLeft' | 'ResizeSibling'

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
  /**
   * 列宽拖拽模式。
   * - ResizeLeft：拖拽分隔线只改变左侧列宽。
   * - ResizeSibling：拖拽分隔线同时改变左右相邻列宽，总宽不变。
   */
  mode?: ColumnResizeMode
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
   *   - 拖拽手柄加 `dg-resizer-active` 类（保持拖拽期间可接收 pointer 事件）。
   */
  resizingKey: string | null
  /**
   * 绑定到 resizer 手柄 div 的 pointerdown 回调。
   * 调用方在叶子表头格内渲染 `<div className="dg-resizer" onPointerDown={onPointerDown(colKey)} />`。
   *
   * 内部完成：setPointerCapture + 记录起始态 + 注册 move/up 监听（挂在捕获元素上，由 React 事件代理）。
   */
  onPointerDown: (key: string, siblingKey?: string) => (event: React.PointerEvent<HTMLDivElement>) => void
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
  const {
    enabled,
    minWidth = DEFAULT_MIN_WIDTH,
    maxWidth = Infinity,
    mode = 'ResizeLeft',
  } = options

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
    siblingKey?: string
    startClientX: number
    startWidth: number
    siblingStartWidth?: number
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
    (key: string, siblingKey?: string) => (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || mode === 'Disabled') return
      if (mode === 'ResizeSibling' && !siblingKey) return
      // 仅主键（左键，button===0）启动拖拽；右键/中键忽略。
      if (event.button !== 0) return
      // 阻止默认：防止浏览器开始文本选区/拖拽图像等。
      event.preventDefault()
      // 阻止冒泡：避免触发表头格自身的点击/排序等交互。
      event.stopPropagation()

      const el = event.currentTarget
      // 读当前列实际宽度：优先用 resizer 的父表头格（.dg-cell-header）宽度。
      // resizer 是表头格的子元素；表头格宽度 = 列宽（叶子表头格恒 1 个/列）。
      const headerCell = el.closest('.dg-cell-header') as HTMLElement | null
      const startWidth = headerCell
        ? headerCell.getBoundingClientRect().width
        : 0
      let siblingStartWidth: number | undefined
      if (mode === 'ResizeSibling' && siblingKey) {
        const grid = el.closest('.dg-grid') as HTMLElement | null
        const siblingHeaderCell = grid
          ? Array.from(
            grid.querySelectorAll<HTMLElement>('.dg-cell-header[data-column-key]'),
          ).find((node) => node.dataset.columnKey === siblingKey)
          : undefined
        siblingStartWidth = siblingHeaderCell?.getBoundingClientRect().width
        if (siblingStartWidth === undefined) return
      }

      const pointerId = event.pointerId
      try {
        el.setPointerCapture(pointerId)
      } catch {
        // 极少数情况 setPointerCapture 失败（如 pointer 已 cancel）；忽略，仍尝试继续。
      }

      dragRef.current = {
        key,
        siblingKey,
        startClientX: event.clientX,
        startWidth,
        siblingStartWidth,
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
        let siblingNext: number | undefined
        if (mode === 'ResizeSibling' && drag.siblingKey && drag.siblingStartWidth !== undefined) {
          const siblingMin = resolveMin(drag.siblingKey)
          const siblingMax = resolveMax(drag.siblingKey)
          const minDelta = Math.max(
            min - drag.startWidth,
            drag.siblingStartWidth - siblingMax,
          )
          const maxDelta = Math.min(
            max - drag.startWidth,
            drag.siblingStartWidth - siblingMin,
          )
          const boundedDelta = Math.min(Math.max(delta, minDelta), maxDelta)
          next = drag.startWidth + boundedDelta
          siblingNext = drag.siblingStartWidth - boundedDelta
        } else {
          if (next < min) next = min
          if (next > max) next = max
        }
        setResizedWidths((prev) => {
          const m = new Map(prev)
          m.set(drag.key, next)
          if (drag.siblingKey && siblingNext !== undefined) {
            m.set(drag.siblingKey, siblingNext)
          }
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
    [enabled, mode, resolveMin, resolveMax],
  )

  return { resizedWidths, resizingKey, onPointerDown }
}
