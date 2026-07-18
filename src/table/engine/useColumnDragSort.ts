/**
 * 列拖拽排序 hook — 详见 docs/design-notes/drag-sort.md。
 *
 * 采用事件委托（命中 `[data-leaf-index]` 叶子表头格）+ setPointerCapture + 水平 hit-test +
 * overlay 跟手 + 离散让位 + 垂直指示线 + arrayMove。不引入 @dnd-kit/*（CSS Grid 渲染下 dnd-kit
 * 的 DOM 元素 transform 模型会破坏 grid 布局，详见 drag-sort.md「为什么不用 dnd-kit」）。
 *
 * 与行拖（useRowDragSort，命中 `[data-row-index]`）命中不同属性，两者正交互不干扰。
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { findScrollContainer, useAutoScrollOnDrag } from './useAutoScrollOnDrag'
import { computeDragInsertionTarget, insertionIndexToMoveIndex } from './dragSortUtils'
// 纯函数簇抽到 columnDragSortUtils：arrayMoveColumns / isColumnLocked / isColumnDragLocked /
// getColumnKey / findColumnCells / overlay DOM 命令式 / transform 矩阵解析 /
// arrayMoveColumnsRespectLocks（核心：锁定列友好的列重排算法）。
import {
  arrayMoveColumnsRespectLocks,
  createColumnDragOverlay,
  findColumnCells,
  getColumnKey,
  getUntransformedRect,
  isColumnDragLocked,
  removeColumnDragOverlay,
  updateColumnDragOverlay,
} from './columnDragSortUtils'

// 内部 demo/引擎工具导出：包主入口不导出拖拽 hooks，用户通过 gridOptions/gridColumnOptions 开关使用拖拽能力。
export { arrayMoveColumns } from './columnDragSortUtils'

/** 垂直指示线样式（调用方在外层相对定位容器内渲染一条绝对定位竖线）。 */
export interface ColumnDragIndicatorStyle {
  /** 是否显示指示线（拖拽中为 true）。 */
  visible: boolean
  /** 指示线 left（px，相对外层容器；即目标列间隙的 X 坐标）。 */
  left: number
  /** 指示线 top（px，相对外层容器；默认 0 跨表头+表体）。 */
  top: number
  /** 指示线 height（px；默认容器高，跨表头+表体）。 */
  height: number
}

/** useColumnDragSort 配置。 */
export interface UseColumnDragSortOptions<ColumnType> {
  /** 是否启用拖拽。false 时 hook 仍可挂载但不会响应 pointerdown。 */
  enabled?: boolean
  /** 列数组（用于 arrayMove 重排 + 列数判定）。 */
  columns: Array<ColumnType>
  /**
   * 列重排回调（松手且 over≠dragging 时触发）。
   * 参数：重排后的新 columns 数组（调用方据此 setState）。
   */
  onSort: (nextColumns: Array<ColumnType>) => void
  /**
   * 外层容器 ref（相对定位，包 Table；指示线作为其子元素绝对定位）。
   * hit-test 时遍历容器内 `[data-leaf-index]` 表头格算列边界。
   * 调用方需把此 ref 挂到 Table 外层的相对定位 div。
   */
  containerRef: React.RefObject<HTMLElement | null>
  /**
   * 拖拽到容器边缘时是否自动滚动容器（横向，列拖专用）。
   *
   * - `true`（默认）：拖拽近左右边缘触发横向自动滚动。
   * - `false`：禁用。
   *
   * 通常由 demo 从 `gridOptions.autoScrollOnDrag`（默认 true）透传。
   * 实现见 `useAutoScrollOnDrag`（vertical=false，横向边缘检测 + scrollBy）。
   */
  autoScroll?: boolean
  /**
   * 列重排全局开关（对齐 `gridOptions.columnReorder`，默认 true）。
   *
   * - `true` / undefined：允许列拖拽。
   * - `false`：全局禁用——任何列头 pointerdown 都不启动拖（总闸，优先于单列 dragColumnLock）。
   *
   * 单列粒度：`gridColumnOptions.dragColumnLock === 'lockDrag'` 的列不可发起拖（其它列仍可拖）；
   * `'lockPosition'` 的列自身不可发起拖 + 重排算法跳过其 index。
   * 组合：某列可发起拖 ⟺ `reorder !== false && dragColumnLock === undefined`。
   */
  reorder?: boolean
}

export interface UseColumnDragSortResult {
  /** 当前拖拽中状态（null = 未拖拽）。overIndex 为"目标列 index"（松手后 arrayMove 的 to）。 */
  dragState: { fromIndex: number; overIndex: number } | null
  /** 垂直指示线样式（调用方渲染绝对定位竖线）。 */
  indicator: ColumnDragIndicatorStyle
  /**
   * 外层容器事件 props（事件委托）。调用方挂到包 Table 的外层 div：
   * `<div ref={containerRef} {...containerProps}>`。
   * 内部 onPointerDown 判定 target 是否命中叶子表头格 `[data-leaf-index]`，命中则启动列拖拽。
   */
  containerProps: {
    onPointerDown: (e: React.PointerEvent) => void
  }
}

/**
 * 列拖拽排序 hook（方案 B 自研 pointer 列方向，事件委托）。
 *
 * 用法（demo）：
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null)
 * const { dragState, indicator, containerProps } = useColumnDragSort({
 *   columns, onSort: setColumns, containerRef,
 * })
 * <div ref={containerRef} style={{ position: 'relative' }} {...containerProps}>
 *   <Table ... />
 *   {indicator.visible && <div style={{ position:'absolute', left:indicator.left, top:indicator.top, height:indicator.height, width:2, background:'#1677ff' }} />}
 * </div>
 * ```
 */
export function useColumnDragSort<ColumnType>(
  options: UseColumnDragSortOptions<ColumnType>,
): UseColumnDragSortResult {
  const { columns, onSort, containerRef } = options
  const enabled = options.enabled ?? true
  // autoScrollOnDrag 默认 true（对齐 gridOptions.autoScrollOnDrag 默认 + ag-grid 默认行为）。
  const autoScrollEnabled = options.autoScroll ?? true
  // columnReorder 默认 true（对齐 gridOptions.columnReorder 默认）。
  const reorderEnabled = options.reorder ?? true

  // 拖拽中自动滚动容器（横向边缘检测 RAF + scrollBy）。
  const { pointerRef: autoScrollPointerRef, start: startAutoScroll, stop: stopAutoScroll } =
    useAutoScrollOnDrag({ containerRef, vertical: false, autoScroll: autoScrollEnabled })

  const [dragState, setDragState] = useState<{
    fromIndex: number
    overIndex: number
  } | null>(null)
  const [indicator, setIndicator] = useState<ColumnDragIndicatorStyle>({
    visible: false,
    left: 0,
    top: 0,
    height: 0,
  })

  // 拖拽过程中跨事件保留的临时状态（不直接驱动渲染，放 ref；驱动渲染用 dragState/indicator state）。
  const dragRef = useRef<{
    fromIndex: number
    overIndex: number
    startClientX: number
    pointerId: number
    el: HTMLElement
    overlayEl: HTMLElement | null
    startScrollLeft: number
    lastClientX: number
    columnKey: string | null
    scrollEl: HTMLElement | null
    scrollRafId: number | null
    ac: AbortController | null
    previousBodyCursor: string
    previousBodyUserSelect: string
  } | null>(null)
  const scrollHandlerRef = useRef<(() => void) | null>(null)

  const applyYieldTransforms = useCallback(
    (fromIndex: number, overIndex: number, delta: number) => {
      const container = containerRef.current
      if (!container) return
      const nextColumns = arrayMoveColumnsRespectLocks(columns, fromIndex, overIndex)
      const currentRects = new Map<number, { left: number; width: number }>()
      container.querySelectorAll<HTMLElement>('[data-leaf-index]').forEach((cell) => {
        const idxAttr = cell.getAttribute('data-leaf-index')
        if (idxAttr === null) return
        const idx = Number.parseInt(idxAttr, 10)
        if (!Number.isFinite(idx)) return
        if (currentRects.has(idx)) return
        currentRects.set(idx, getUntransformedRect(cell))
      })
      if (currentRects.size === 0) return

      const baseLeft = Math.min(...Array.from(currentRects.values()).map((rect) => rect.left))
      const finalLefts = new Map<number, number>()
      let cursorLeft = baseLeft
      nextColumns.forEach((column) => {
        const originalIndex = columns.indexOf(column)
        if (originalIndex < 0) return
        finalLefts.set(originalIndex, cursorLeft)
        cursorLeft += currentRects.get(originalIndex)?.width ?? 0
      })

      for (let i = 0; i < columns.length; i += 1) {
        const key = getColumnKey(columns, i)
        const cells = findColumnCells(container, i, key)
        cells.forEach((cell) => {
          if (i === fromIndex) {
            cell.classList.add('dg-drag-column-active', 'dg-drag-column-source')
            cell.classList.remove('dg-drag-column-yield')
            cell.style.transform = `translate3d(${delta}px, 0, 0)`
            return
          }
          const currentLeft = currentRects.get(i)?.left
          const targetLeft = finalLefts.get(i)
          const rawYieldDelta =
            currentLeft !== undefined && targetLeft !== undefined ? targetLeft - currentLeft : 0
          const yieldDelta = Math.abs(rawYieldDelta) < 0.5 ? 0 : rawYieldDelta
          if (yieldDelta !== 0) {
            cell.classList.add('dg-drag-column-yield')
            cell.classList.remove('dg-drag-column-active', 'dg-drag-column-source')
            cell.style.transform = `translate3d(${yieldDelta}px, 0, 0)`
            return
          }
          cell.classList.remove('dg-drag-column-active', 'dg-drag-column-source')
          if (cell.classList.contains('dg-drag-column-yield')) {
            cell.style.transform = 'translate3d(0, 0, 0)'
            return
          }
          cell.style.transform = ''
        })
      }
    },
    [columns, containerRef],
  )

  const clearYieldTransforms = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const cells = container.querySelectorAll<HTMLElement>('[data-leaf-index], [data-column-key]')
    cells.forEach((cell) => {
      cell.classList.remove('dg-drag-column-active', 'dg-drag-column-source', 'dg-drag-column-yield')
      cell.style.transform = ''
    })
  }, [containerRef])

  const cleanupDragSession = useCallback(() => {
    const drag = dragRef.current
    if (!drag) return
    drag.ac?.abort()
    drag.ac = null
    if (drag.scrollRafId !== null) {
      cancelAnimationFrame(drag.scrollRafId)
      drag.scrollRafId = null
    }
    if (drag.scrollEl && scrollHandlerRef.current) {
      drag.scrollEl.removeEventListener('scroll', scrollHandlerRef.current as EventListener)
      drag.scrollEl = null
    }
    removeColumnDragOverlay(drag.overlayEl)
    drag.overlayEl = null
    document.body.style.cursor = drag.previousBodyCursor
    document.body.style.userSelect = drag.previousBodyUserSelect
    scrollHandlerRef.current = null
    dragRef.current = null
    clearYieldTransforms()
    stopAutoScroll()
  }, [clearYieldTransforms, stopAutoScroll])

  /**
   * 水平 hit-test：根据 pointer X 算出"插入位置"（over index）。
   *
   * 遍历容器内所有 `[data-leaf-index]` 叶子表头格，按 leaf-index 取每个的 left/right
   * （getBoundingClientRect）。pointer X 落在某列的"左半部分" → over = 该列 index
   * （插入到该列之前）；"右半部分" → over = 该列 index + 1（插入到该列之后）。
   *
   * 返回 { overIndex, indicatorLeft, containerTop, containerHeight }：
   *   - overIndex 为插入位置（0..columns.length）；
   *   - indicatorLeft 为指示线 left（相对容器，px，即目标列间隙的 X）；
   *   - containerTop/Height 用于指示线跨表头+表体高度（取容器整体高）。
   */
  const hitTest = useCallback(
    (clientX: number): {
      overIndex: number
      indicatorLeft: number
      containerTop: number
      containerHeight: number
    } | null => {
      const container = containerRef.current
      if (!container) return null
      const containerRect = container.getBoundingClientRect()
      // 收集所有叶子表头格，按 leaf-index 取 left/right。
      const headerCells = container.querySelectorAll<HTMLElement>(
        '[data-leaf-index]',
      )
      if (headerCells.length === 0) return null
      const colBounds = new Map<number, { left: number; right: number }>()
      headerCells.forEach((cell) => {
        const idxAttr = cell.getAttribute('data-leaf-index')
        if (idxAttr === null) return
        const idx = Number.parseInt(idxAttr, 10)
        if (!Number.isFinite(idx)) return
        if (idx === dragRef.current?.fromIndex) return
        if (colBounds.has(idx)) return
        const r = getUntransformedRect(cell)
        colBounds.set(idx, { left: r.left, right: r.left + r.width })
      })
      if (colBounds.size === 0) return null
      const target = computeDragInsertionTarget(
        clientX,
        Array.from(colBounds.entries()).map(([index, bound]) => ({
          index,
          start: bound.left,
          end: bound.right,
        })),
        containerRect.left,
      )
      if (!target) return null
      return {
        overIndex: target.overIndex,
        indicatorLeft: target.indicatorOffset,
        containerTop: 0,
        containerHeight: containerRect.height,
      }
    },
    [containerRef],
  )

  const recomputeFromPointer = useCallback(
    (clientX: number) => {
      const drag = dragRef.current
      if (!drag) return
      const result = hitTest(clientX)
      if (!result) return
      const overIndex = insertionIndexToMoveIndex(result.overIndex, drag.fromIndex)
      drag.overIndex = overIndex
      setDragState({ fromIndex: drag.fromIndex, overIndex })
      setIndicator({
        visible: true,
        left: result.indicatorLeft,
        top: result.containerTop,
        height: result.containerHeight,
      })
      const currentScrollLeft = drag.scrollEl?.scrollLeft ?? drag.startScrollLeft
      const delta = clientX - drag.startClientX + (currentScrollLeft - drag.startScrollLeft)
      applyYieldTransforms(drag.fromIndex, overIndex, delta)
      updateColumnDragOverlay(drag.overlayEl, clientX - drag.startClientX)
    },
    [hitTest, applyYieldTransforms],
  )

  /** 外层容器 pointerdown（事件委托）：命中叶子表头格则启动列拖拽。 */
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return
      // 仅主键（左键）启动拖拽。
      if (e.button !== 0) return
      // 全局总闸——columnReorder=false 时所有列头不可拖（对齐 ag-grid suppressMovableColumns）。
      if (!reorderEnabled) return
      const target = e.target as HTMLElement | null
      // 命中判定：target 最近祖先含 [data-leaf-index] 的叶子表头格。
      // （分组表头格无 data-leaf-index，data-leaf='0'，不命中 → 不触发列拖拽，正确。）
      const cell = target?.closest<HTMLElement>('[data-leaf-index]') ?? null
      if (!cell) return
      const idxAttr = cell.getAttribute('data-leaf-index')
      if (idxAttr === null) return
      const index = Number.parseInt(idxAttr, 10)
      if (!Number.isFinite(index)) return
      // 单列粒度判定：
      //   dragColumnLock='lockDrag' → 此列不可发起拖，但仍可被其它列拖拽影响；
      //   dragColumnLock='lockPosition' → 此列不可发起拖，且重排算法保持其 index。
      if (isColumnDragLocked(columns[index])) return

      if (dragRef.current) {
        cleanupDragSession()
      }

      const el = cell
      const pointerId = e.pointerId
      e.preventDefault()
      e.stopPropagation()
      try {
        el.setPointerCapture(pointerId)
      } catch {
        // 极少数 setPointerCapture 失败（pointer 已 cancel）；忽略。
      }
      const scrollEl = findScrollContainer(containerRef.current)
      const startScrollLeft = scrollEl?.scrollLeft ?? 0
      const columnKey = getColumnKey(columns, index)
      const overlayEl = containerRef.current
        ? createColumnDragOverlay(containerRef.current, index, columnKey)
        : null
      const ac = new AbortController()
      dragRef.current = {
        fromIndex: index,
        overIndex: index,
        startClientX: e.clientX,
        pointerId,
        el,
        overlayEl,
        startScrollLeft,
        lastClientX: e.clientX,
        columnKey,
        scrollEl: null,
        scrollRafId: null,
        ac,
        previousBodyCursor: document.body.style.cursor,
        previousBodyUserSelect: document.body.style.userSelect,
      }
      document.body.style.cursor = 'move'
      document.body.style.userSelect = 'none'
      // 初始 overIndex = fromIndex（未移动时松手不重排）。
      const initial = hitTest(e.clientX)
      setDragState({
        fromIndex: index,
        overIndex: initial ? initial.overIndex : index,
      })
      if (initial) {
        setIndicator({
          visible: true,
          left: initial.indicatorLeft,
          top: initial.containerTop,
          height: initial.containerHeight,
        })
      }
      recomputeFromPointer(e.clientX)

      // 初始化 auto-scroll 指针坐标 + 启动 RAF 边缘检测循环（横向）。
      autoScrollPointerRef.current = { clientX: e.clientX, clientY: e.clientY }
      startAutoScroll()

      if (scrollEl) {
        const onScrollDuringDrag = () => {
          const drag = dragRef.current
          if (!drag) return
          if (drag.scrollRafId !== null) return
          drag.scrollRafId = requestAnimationFrame(() => {
            if (dragRef.current) dragRef.current.scrollRafId = null
            const d = dragRef.current
            if (!d) return
            recomputeFromPointer(d.lastClientX)
          })
        }
        scrollEl.addEventListener('scroll', onScrollDuringDrag, { passive: true })
        dragRef.current.scrollEl = scrollEl
        scrollHandlerRef.current = onScrollDuringDrag
      }

      // 原生监听 move/up 挂 window，避免横向 auto-scroll/虚拟卸载拖拽源表头后丢失 pointerup。
      const nativeMove = (ev: PointerEvent) => {
        const drag = dragRef.current
        if (!drag || ev.pointerId !== drag.pointerId) return
        // 实时更新指针坐标供 auto-scroll RAF 循环读取。
        autoScrollPointerRef.current = { clientX: ev.clientX, clientY: ev.clientY }
        drag.lastClientX = ev.clientX
        recomputeFromPointer(ev.clientX)
      }
      const nativeUp = (ev: PointerEvent) => {
        const drag = dragRef.current
        if (!drag || ev.pointerId !== drag.pointerId) return
        drag.lastClientX = ev.clientX
        recomputeFromPointer(ev.clientX)
        const finalFromIndex = drag.fromIndex
        const finalOverIndex = drag.overIndex
        try {
          drag.el.releasePointerCapture(drag.pointerId)
        } catch {
          // ignore
        }
        cleanupDragSession()
        if (finalFromIndex !== finalOverIndex) {
          // 用尊重锁定列的重排算法（锁定列 index 不变，可动列在剩余槽位间重排）。
          // 无锁定列时内部退化为普通 arrayMoveColumns（零回归 + 性能更优）。
          const next = arrayMoveColumnsRespectLocks(columns, finalFromIndex, finalOverIndex)
          onSort(next)
        }
        setDragState(null)
        setIndicator({ visible: false, left: 0, top: 0, height: 0 })
      }
      window.addEventListener('pointermove', nativeMove, { signal: ac.signal })
      window.addEventListener('pointerup', nativeUp, { signal: ac.signal })
      window.addEventListener('pointercancel', nativeUp, { signal: ac.signal })
    },
    [
      hitTest,
      enabled,
      columns,
      onSort,
      reorderEnabled,
      autoScrollPointerRef,
      startAutoScroll,
      cleanupDragSession,
      recomputeFromPointer,
      containerRef,
    ],
  )

  // 卸载时清理（防御性：避免组件卸载后残留监听 + 残留 auto-scroll RAF）。
  useEffect(() => {
    return () => {
      const drag = dragRef.current
      if (drag) {
        try {
          drag.el.releasePointerCapture(drag.pointerId)
        } catch {
          // ignore
        }
        cleanupDragSession()
      }
      // 卸载时确保 auto-scroll RAF 已停（防止组件卸载后 RAF 继续跑）。
      stopAutoScroll()
    }
  }, [stopAutoScroll, cleanupDragSession])

  return { dragState, indicator, containerProps: { onPointerDown } }
}
