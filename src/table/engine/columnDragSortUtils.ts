/**
 * 列拖拽排序纯函数簇 — 详见 docs/features/interaction/drag-sort.md。
 *
 * 从 useColumnDragSort.ts 抽出的模块级纯函数：
 *   - 数组搬运：arrayMoveColumns
 *   - 列锁定判定：isColumnLocked / isColumnDragLocked / getColumnKey
 *   - overlay DOM 命令式（不依赖 hook state，纯 DOM 操作）：findColumnCells /
 *     createColumnDragOverlay / updateColumnDragOverlay / removeColumnDragOverlay
 *   - transform 矩阵解析：getTranslateXFromComputedTransform / getUntransformedRect
 *   - 核心：arrayMoveColumnsRespectLocks（锁定列友好的列重排算法）
 *
 * 全部为纯函数（不依赖 hook state/setter），可独立单测。useColumnDragSort 仅做 import 替换。
 */

/**
 * arrayMove：把数组 from 位置的元素移到 to 位置（对齐 @dnd-kit/sortable）。
 *
 * arrayMoveColumns 仅供内部拖拽 hook 与单测使用；包主入口不导出这些工具。
 */
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
 * 判断某列是否锁定位置（`gridColumnOptions.dragColumnLock === 'lockPosition'`）。
 *
 * 锁定列自身不可被重排——其它列可在其周围重排，但锁定列自身 index（相对原 columns 数组）
 * 不变。实现采用"可动列子序列重排"算法：从 columns 中抽出所有可动列（按原顺序），在可动列子序列
 * 上做 arrayMove，再把结果按原位填回（锁定列保持原 index 不动）。
 */
export function isColumnLocked<ColumnType>(col: ColumnType): boolean {
  const opts = (col as { gridColumnOptions?: { dragColumnLock?: string } }).gridColumnOptions
  return opts?.dragColumnLock === 'lockPosition'
}

export function isColumnDragLocked<ColumnType>(col: ColumnType): boolean {
  const opts = (col as { gridColumnOptions?: { dragColumnLock?: string } }).gridColumnOptions
  return opts?.dragColumnLock === 'lockDrag' || opts?.dragColumnLock === 'lockPosition'
}

export function getColumnKey<ColumnType>(
  columns: Array<ColumnType>,
  index: number,
): string | null {
  const key = (columns[index] as { key?: React.Key } | undefined)?.key
  if (key === undefined || key === null) return null
  return String(key)
}

export function findColumnCells(
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

export function createColumnDragOverlay(
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

  const host = container.matches('.dg-wrapper')
    ? container
    : (container.querySelector<HTMLElement>('.dg-wrapper') ?? document.body)
  host.appendChild(overlay)
  return overlay
}

export function updateColumnDragOverlay(overlay: HTMLElement | null, delta: number): void {
  if (!overlay) return
  overlay.style.transform = `translate3d(${delta}px, 0, 0)`
}

export function removeColumnDragOverlay(overlay: HTMLElement | null): void {
  overlay?.remove()
}

export function getTranslateXFromComputedTransform(el: HTMLElement): number {
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

export function getUntransformedRect(el: HTMLElement): { left: number; width: number } {
  const rect = el.getBoundingClientRect()
  return {
    left: rect.left - getTranslateXFromComputedTransform(el),
    width: rect.width,
  }
}

/**
 * 锁定列友好的列重排算法 — 详见 docs/features/interaction/drag-sort.md（「列拖：锁定列」节）。
 *
 * 给定原 columns、被拖列 fromIndex、目标插入位置 toIndex（@dnd-kit 语义：to = 目标列 index，
 * 即 arrayMove 把 from 移到 to），返回重排后的新数组。`dragColumnLock:'lockPosition'` 列保持
 * 原 index 不动——只在非锁定列子序列上做 arrayMove，再把结果按原位填回锁定列之间的空隙。
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
