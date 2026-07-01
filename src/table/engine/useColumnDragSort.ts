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

/** arrayMove：把数组 from 位置的元素移到 to 位置（对齐 @dnd-kit/sortable）。 */
export function arrayMoveColumns<T>(arr: Array<T>, from: number, to: number): Array<T> {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) {
    return arr
  }
  const next = arr.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/**
 * 判断某列是否锁定位置（`gridColumnOptions.lockPosition === true`）。
 *
 * 锁定列自身不可被重排——其它列可在其周围重排，但锁定列自身 index（相对原 columns 数组）
 * 不变。实现采用"可动列子序列重排"算法：从 columns 中抽出所有可动列（按原顺序），在可动列子序列
 * 上做 arrayMove，再把结果按原位填回（锁定列保持原 index 不动）。
 */
function isColumnLocked<ColumnType>(col: ColumnType): boolean {
  // 兼容：列定义上 gridColumnOptions 可能不存在（与 antd 顶层 ColumnType 同名字段保留兼容）。
  const opts = (col as { gridColumnOptions?: { lockPosition?: boolean } }).gridColumnOptions
  return opts?.lockPosition === true
}

function getColumnKey<ColumnType>(columns: Array<ColumnType>, index: number): string | null {
  const key = (columns[index] as { key?: React.Key } | undefined)?.key
  if (key === undefined || key === null) return null
  return String(key)
}

function findColumnCells(
  container: HTMLElement,
  columnIndex: number,
  columnKey: string | null,
): HTMLElement[] {
  const cells = new Set<HTMLElement>()
  container
    .querySelectorAll<HTMLElement>(`[data-leaf-index="${columnIndex}"]`)
    .forEach((cell) => cells.add(cell))
  if (columnKey !== null) {
    container.querySelectorAll<HTMLElement>('[data-column-key]').forEach((cell) => {
      if (cell.getAttribute('data-column-key') === columnKey) cells.add(cell)
    })
  }
  return Array.from(cells)
}

function createColumnDragOverlay(
  container: HTMLElement,
  columnIndex: number,
  columnKey: string | null,
): HTMLElement | null {
  const cells = findColumnCells(container, columnIndex, columnKey)
  if (cells.length === 0) return null

  const rects = cells.map((cell) => ({ cell, rect: cell.getBoundingClientRect() }))
  const left = Math.min(...rects.map(({ rect }) => rect.left))
  const right = Math.max(...rects.map(({ rect }) => rect.right))
  const top = Math.min(...rects.map(({ rect }) => rect.top))
  const bottom = Math.max(...rects.map(({ rect }) => rect.bottom))
  const width = right - left
  const height = bottom - top
  if (width <= 0 || height <= 0) return null

  const overlay = document.createElement('div')
  overlay.className = 'dg-drag-column-overlay'
  overlay.setAttribute('aria-hidden', 'true')
  Object.assign(overlay.style, {
    position: 'fixed',
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
    pointerEvents: 'none',
    zIndex: '10000',
    transform: 'translate3d(0, 0, 0)',
    transition: 'none',
  })

  rects.forEach(({ cell, rect }) => {
    const clone = cell.cloneNode(true) as HTMLElement
    clone.removeAttribute('data-leaf-index')
    clone.removeAttribute('data-column-key')
    clone.removeAttribute('data-row-index')
    clone.removeAttribute('data-known-size')
    clone.classList.remove('dg-drag-column-active', 'dg-drag-column-yield', 'dg-drag-column-source')
    Object.assign(clone.style, {
      position: 'absolute',
      left: `${rect.left - left}px`,
      top: `${rect.top - top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      transform: 'none',
      transition: 'none',
      boxSizing: 'border-box',
    })
    overlay.appendChild(clone)
  })

  const host = container.querySelector<HTMLElement>('.dg-wrapper') ?? document.body
  host.appendChild(overlay)
  return overlay
}

function updateColumnDragOverlay(overlay: HTMLElement | null, delta: number): void {
  if (!overlay) return
  overlay.style.transform = `translate3d(${delta}px, 0, 0)`
}

function removeColumnDragOverlay(overlay: HTMLElement | null): void {
  overlay?.remove()
}

function getTranslateXFromComputedTransform(el: HTMLElement): number {
  const transform = getComputedStyle(el).transform
  if (!transform || transform === 'none') return 0
  const matrix3d = transform.match(/^matrix3d\((.+)\)$/)
  if (matrix3d) {
    const values = matrix3d[1].split(',').map((v) => Number.parseFloat(v.trim()))
    return Number.isFinite(values[12]) ? values[12] : 0
  }
  const matrix = transform.match(/^matrix\((.+)\)$/)
  if (matrix) {
    const values = matrix[1].split(',').map((v) => Number.parseFloat(v.trim()))
    return Number.isFinite(values[4]) ? values[4] : 0
  }
  return 0
}

function getUntransformedRect(el: HTMLElement): { left: number; width: number } {
  const rect = el.getBoundingClientRect()
  return {
    left: rect.left - getTranslateXFromComputedTransform(el),
    width: rect.width,
  }
}

/**
 * 锁定列友好的列重排算法 — 详见 docs/design-notes/drag-sort.md（「列拖：锁定列」节）。
 *
 * 给定原 columns、被拖列 fromIndex、目标插入位置 toIndex（@dnd-kit 语义：to = 目标列 index，
 * 即 arrayMove 把 from 移到 to），返回重排后的新数组。锁定列（`lockPosition:true`）保持原 index
 * 不动——只在非锁定列子序列上做 arrayMove，再把结果按原位填回锁定列之间的空隙。
 *
 * 算法：
 *   1. 把原 columns 分成两组索引：`movableIdxs`（非锁定列的原 index 列表，按原顺序）+
 *      `lockedIdxs`（锁定列的原 index 集合）。
 *   2. 在 movableIdxs 上找到 from 对应的可动列序号（`fromMovable`）+ to 对应的可动列序号
 *      （`toMovable`）。toIndex 落在锁定列上时，toMovable 取锁定列另一侧最近的可动列序号，
 *      让拖拽目标越过锁定列，同时锁定列仍保持原 index 不动。
 *   3. 对 `movableIdxs` 做 arrayMove（fromMovable → toMovable）得到新的可动列 index 序列。
 *   4. 重建数组：锁定列保持原位（按 lockedIdxs 的原 index），可动列按重排后的顺序依次填入剩余槽位。
 *
 * 若 fromIndex 本身是锁定列（不应发生——pointerdown 已拦截）→ 原样返回（防御性）。
 */
export function arrayMoveColumnsRespectLocks<ColumnType>(
  arr: Array<ColumnType>,
  fromIndex: number,
  toIndex: number,
): Array<ColumnType> {
  if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= arr.length) return arr
  // 无任何锁定列 → 退化为普通 arrayMove（零回归路径，性能更优）。
  if (!arr.some((c) => isColumnLocked(c))) {
    return arrayMoveColumns(arr, fromIndex, toIndex)
  }
  // 被拖列本身是锁定列（理论上 pointerdown 已拦截，这里防御性返回原数组）。
  if (isColumnLocked(arr[fromIndex])) return arr

  // 可动列的原 index 序列（按原顺序）。
  const movableIdxs: number[] = []
  for (let i = 0; i < arr.length; i += 1) {
    if (!isColumnLocked(arr[i])) movableIdxs.push(i)
  }
  // from 在可动列序列中的序号。
  const fromMovable = movableIdxs.indexOf(fromIndex)
  if (fromMovable < 0) return arr

  // 把 toIndex（原数组 index，可能落在锁定列上）映射到"可动列序号"语义：
  // toIndex 落在锁定列上时，根据拖拽方向跨过锁定列，取锁定列另一侧最近的可动列序号。
  // 这样拖到锁定列右侧/左侧时，视觉与最终顺序都会越过锁定列，而锁定列自身仍保持原位。
  let toMovable: number
  if (toIndex === arr.length) {
    // 拖到末尾之后 → 目标可动列序号 = 末尾可动列序号（arrayMove 的 to 上界）。
    toMovable = movableIdxs.length - 1
  } else {
    const directIdx = movableIdxs.indexOf(toIndex)
    if (directIdx >= 0) {
      toMovable = directIdx
    } else {
      // toIndex 落在锁定列上：找原数组中 toIndex 之后最近的可动列序号（向右拖）
      // 或之前最近的可动列序号（向左拖），让目标越过锁定列。
      if (fromIndex < toIndex) {
        // 向右拖：取 toIndex 之后第一个可动列序号。
        toMovable = -1
        for (let m = 0; m < movableIdxs.length; m += 1) {
          if (movableIdxs[m] > toIndex) {
            toMovable = m
            break
          }
        }
        if (toMovable < 0) return arr
      } else {
        // 向左拖：取 toIndex 之前最后一个可动列序号。
        toMovable = -1
        for (let m = 0; m < movableIdxs.length; m += 1) {
          if (movableIdxs[m] < toIndex) toMovable = m
          else break
        }
        if (toMovable < 0) return arr
      }
    }
  }

  // 在可动列 index 序列上做 arrayMove。
  const nextMovableIdxs = arrayMoveColumns(movableIdxs, fromMovable, toMovable)
  // 重建数组：锁定列原位 + 可动列按重排后的 index 序列填空。
  const next: ColumnType[] = Array.from({ length: arr.length }) as ColumnType[]
  // 先放锁定列（原 index 不变）。
  for (let i = 0; i < arr.length; i += 1) {
    if (isColumnLocked(arr[i])) next[i] = arr[i]
  }
  // 再按重排后的可动列 index 序列依次填入剩余空槽（保持可动列间相对顺序）。
  let fillCursor = 0
  for (let k = 0; k < nextMovableIdxs.length; k += 1) {
    while (next[fillCursor] !== undefined) fillCursor += 1
    next[fillCursor] = arr[nextMovableIdxs[k]]
    fillCursor += 1
  }
  return next
}

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
   * - `false`：全局禁用——任何列头 pointerdown 都不启动拖（总闸，优先于单列 movable/lockPosition）。
   *
   * 单列粒度：`gridColumnOptions.movable === false` 的列不可发起拖（其它列仍可拖）；
   * `gridColumnOptions.lockPosition === true` 的列自身不可发起拖 + 重排算法跳过其 index。
   * 三者组合：某列可发起拖 ⟺ `reorder !== false && movable !== false && !lockPosition`
   * （对齐 ag-grid `workOutDraggable`）。
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
          cell.classList.remove('dg-drag-column-active', 'dg-drag-column-source', 'dg-drag-column-yield')
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
      // 排序后的列 index 列表（升序）。
      const sortedIndices = Array.from(colBounds.keys()).sort((a, b) => a - b)
      for (let i = 0; i < sortedIndices.length; i += 1) {
        const colIdx = sortedIndices[i]
        const bound = colBounds.get(colIdx)!
        const mid = (bound.left + bound.right) / 2
        if (clientX < mid) {
          // 落在该列左半 → 插入到该列之前（over = colIdx）。
          // 指示线 left = 该列 left（相对容器）。
          return {
            overIndex: colIdx,
            indicatorLeft: bound.left - containerRect.left,
            containerTop: 0,
            containerHeight: containerRect.height,
          }
        }
      }
      // 落在所有列之右 → 插入到末列之后。
      const lastIdx = sortedIndices[sortedIndices.length - 1]
      const lastBound = colBounds.get(lastIdx)!
      return {
        overIndex: lastIdx + 1,
        indicatorLeft: lastBound.right - containerRect.left,
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
      let overIndex = result.overIndex
      if (overIndex > drag.fromIndex) overIndex = overIndex - 1
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
      // 单列粒度判定（对齐 ag-grid workOutDraggable：
      //   !suppressMovableColumns && !colDef.suppressMovable && !colDef.lockPosition）。
      //   movable=false（suppressMovable）→ 此列不可发起拖；
      //   lockPosition=true → 此列自身不可发起拖（且重排算法跳过其 index，见 arrayMoveColumnsRespectLocks）。
      //   两者任一禁用 → 该列头 no-op（不捕获、不变光标）。
      const colDef = columns[index] as
        | { gridColumnOptions?: { movable?: boolean; lockPosition?: boolean } }
        | undefined
      const colOpts = colDef?.gridColumnOptions
      if (colOpts?.movable === false) return
      if (colOpts?.lockPosition === true) return

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
