/**
 * 列宽拖拽调整 hook（resizable）— 详见 docs/design-notes/column-width.md（「拖拽调整列宽」节）。
 *
 * 维护"用户拖拽后的列宽映射"（`resizedWidths: Map<key, px>`），GridTable 在算
 * `grid-template-columns` 时优先取此映射（覆盖 column.width）。不操作 DOM 样式。
 *
 * 核心机制：调用方在叶子表头格右侧渲染 `dg-resizer` div 绑定 `onPointerDown(key)`；
 * pointerdown 读列实际宽（getBoundingClientRect，因列可能是 max-content 无 px props）+
 * setPointerCapture 锁定事件；pointermove 先把当前可见列实际宽冻结为 px 基线，
 * 再按 columnResizeMode 写入映射：
 * - ResizeLeft：只改左侧列宽，表格宽度总和随之变化。
 * - ResizeSibling：左侧列增减、右侧相邻列反向增减，表格总宽保持不变。
 * pointerup 释放 capture。默认 min=30（防拖到 0），max=Infinity。
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ColumnResizeMode } from './resizeColumnUtils'
import { computeColumnResize } from './resizeColumnUtils'

/** 默认最小列宽（px）。防止拖到 0 导致列消失。 */
const DEFAULT_MIN_WIDTH = 30

export type { ColumnResizeMode } from './resizeColumnUtils'

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
  /** 拖拽过程中列宽变化回调。 */
  onResize?: (params: ColumnResizeCallbackParams) => void
  /** 拖拽结束时列宽变化回调。 */
  onResizeEnd?: (params: ColumnResizeCallbackParams) => void
}

export interface ColumnResizeCallbackParams {
  key: string
  width: number
  siblingKey?: string
  siblingWidth?: number
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
    onResize,
    onResizeEnd,
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
    baselineWidths: Map<string, number>
    siblingStartWidth?: number
    currentWidth: number
    siblingCurrentWidth?: number
    pointerId: number
  } | null>(null)
  const dragListenerRef = useRef<{
    element: HTMLElement
    nativeMove: (e: PointerEvent) => void
    nativeUp: (e: PointerEvent) => void
  } | null>(null)

  useEffect(() => {
    return () => {
      const dragListeners = dragListenerRef.current
      if (dragListeners) {
        const drag = dragRef.current
        if (drag) {
          try {
            dragListeners.element.releasePointerCapture(drag.pointerId)
          } catch {
            // ignore
          }
        }
        dragListeners.element.removeEventListener('pointermove', dragListeners.nativeMove)
        dragListeners.element.removeEventListener('pointerup', dragListeners.nativeUp)
        dragListeners.element.removeEventListener('pointercancel', dragListeners.nativeUp)
      }
      dragListenerRef.current = null
      dragRef.current = null
    }
  }, [])

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
      const grid = el.closest('.dg-grid') as HTMLElement | null
      const baselineWidths = new Map<string, number>()
      if (grid) {
        grid.querySelectorAll<HTMLElement>('.dg-cell-header[data-column-key]').forEach((node) => {
          const columnKey = node.dataset.columnKey
          const width = node.getBoundingClientRect().width
          if (columnKey && Number.isFinite(width) && width > 0) {
            baselineWidths.set(columnKey, width)
          }
        })
      }
      let siblingStartWidth: number | undefined
      if (mode === 'ResizeSibling' && siblingKey) {
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
        baselineWidths,
        siblingStartWidth,
        currentWidth: startWidth,
        siblingCurrentWidth: siblingStartWidth,
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
        const resize = computeColumnResize({
          mode,
          delta,
          startWidth: drag.startWidth,
          minWidth: min,
          maxWidth: max,
          siblingStartWidth: drag.siblingStartWidth,
          siblingMinWidth: drag.siblingKey ? resolveMin(drag.siblingKey) : undefined,
          siblingMaxWidth: drag.siblingKey ? resolveMax(drag.siblingKey) : undefined,
        })
        const next = resize.width
        const siblingNext = resize.siblingWidth
        drag.currentWidth = next
        drag.siblingCurrentWidth = siblingNext
        setResizedWidths((prev) => {
          const m = new Map(prev)
          drag.baselineWidths.forEach((width, baselineKey) => {
            m.set(baselineKey, width)
          })
          m.set(drag.key, next)
          if (drag.siblingKey && siblingNext !== undefined) {
            m.set(drag.siblingKey, siblingNext)
          }
          return m
        })
        onResize?.({
          key: drag.key,
          width: next,
          siblingKey: drag.siblingKey,
          siblingWidth: siblingNext,
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
        onResizeEnd?.({
          key: drag.key,
          width: drag.currentWidth,
          siblingKey: drag.siblingKey,
          siblingWidth: drag.siblingCurrentWidth,
        })
        dragRef.current = null
        dragListenerRef.current = null
        setResizingKey(null)
      }
      el.addEventListener('pointermove', nativeMove)
      el.addEventListener('pointerup', nativeUp)
      el.addEventListener('pointercancel', nativeUp)
      dragListenerRef.current = {
        element: el,
        nativeMove,
        nativeUp,
      }
    },
    [enabled, mode, resolveMin, resolveMax, onResize, onResizeEnd],
  )

  return { resizedWidths, resizingKey, onPointerDown }
}
