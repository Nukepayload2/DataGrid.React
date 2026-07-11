/**
 * 行拖拽排序纯函数簇 — 详见 docs/design-notes/drag-sort.md（「行拖」节）。
 *
 * 从 useRowDragSort.ts 抽出的模块级纯函数：
 *   - 数组搬运：arrayMove（单行）/ arrayMoveBlock（多行成块重排）
 *   - rowKey 解析：resolveRowKey / sameRowKey
 *   - overlay DOM 命令式（不依赖 hook state，纯 DOM 操作）：createRowDragOverlay /
 *     updateRowDragOverlay / removeRowDragOverlay
 *
 * 全部为纯函数（不依赖 hook state/setter），可独立单测。useRowDragSort 仅做 import 替换。
 *
 * arrayMove / arrayMoveBlock 被 src/table/index.ts 从 useRowDragSort 再导出；为保持
 * index.ts 零改动，useRowDragSort.ts 用 re-export 暴露这两个函数。
 */

/**
 * arrayMove：把数组 from 位置的元素移到 to 位置（对齐 @dnd-kit/sortable）。
 *
 * 被 src/table/index.ts 从 useRowDragSort 再导出；为保持 index.ts 零改动，
 * useRowDragSort.ts 用 `export { arrayMove, arrayMoveBlock } from './dragSortUtils'` re-export。
 */
export function arrayMove<T>(arr: Array<T>, from: number, to: number): Array<T> {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) {
    return arr
  }
  const next = arr.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/**
 * 把一组（连续的）选中行作为一块移到目标位置（multi-row block move）。
 * 详见 docs/design-notes/drag-sort.md（「行拖：多行成块重排」节）。
 *
 * 参数：
 *   - `arr`：原数组。
 *   - `blockIdxs`：成块移动的行在原数组中的 index 列表（**已按升序排序**，且这些 index 在原数组中
 *     对应的行就是选中行；保持它们之间的相对顺序——切片后整块平移）。
 *   - `toIndex`：目标插入位置（**在原数组坐标系中**，0..arr.length）。
 *
 * 算法：先把 block 行按原顺序抽出来（剩余行自动收拢），再把整块插到目标位置（位置以"剔除 block 后
 * 的剩余数组"坐标修正：to 减去其左侧已被抽走的 block 行数）。
 *
 * 边界：
 *   - 目标落在 block 内部（toIndex 介于 block 首末 index 之间）→ 返回原数组（no-op）。
 *   - blockIdxs 为空 / 单元素 → 调用方应已退化为单行 arrayMove，这里防御性返回原数组。
 */
export function arrayMoveBlock<T>(
  arr: Array<T>,
  blockIdxs: number[],
  toIndex: number,
): Array<T> {
  if (blockIdxs.length === 0) return arr
  if (blockIdxs.length === 1) {
    // 单行退化为 arrayMove（保持 from→to 语义一致）。
    return arrayMove(arr, blockIdxs[0], toIndex)
  }
  // block 首末 index（已升序）。
  const blockFirst = blockIdxs[0]
  const blockLast = blockIdxs[blockIdxs.length - 1]
  // 目标落在 block 内部 → no-op（含 toIndex 恰好等于 blockFirst / blockLast+1 的边界，
  // 这些等价于"原地不动"或"贴着 block 边缘"——保守判 no-op 避免无意义重排）。
  if (toIndex >= blockFirst && toIndex <= blockLast + 1) return arr

  // 抽出 block 行（保持相对顺序）。
  const blockRows = blockIdxs.map((i) => arr[i])
  // 剩余行（剔除 block）。
  const restRows = arr.filter((_, i) => !blockIdxs.includes(i))
  // 把 toIndex 修正到 restRows 坐标系：减去其左侧的 block 行数。
  let toInRest = toIndex
  for (let i = 0; i < blockIdxs.length; i += 1) {
    if (blockIdxs[i] < toIndex) toInRest -= 1
  }
  // 钳制到 [0, restRows.length]（防御性）。
  if (toInRest < 0) toInRest = 0
  if (toInRest > restRows.length) toInRest = restRows.length
  // 把整块插入 restRows 的 toInRest 位置。
  const next = restRows.slice()
  next.splice(toInRest, 0, ...blockRows)
  return next
}

/**
 * 解析单条 record 的 rowKey（支持 string 属性名 / 函数两种形式）。
 *
 * 返回 undefined 表示无法解析（防御性，调用方按"未选中"处理）。
 * 对齐 Table.tsx 内部 getRowKey 的语义（rowKey 为字符串时按属性路径取值，函数时直接调用）。
 */
export function resolveRowKey<RecordType>(
  rowKey: string | ((record: RecordType) => string | number),
  record: RecordType,
  index: number,
): React.Key | undefined {
  try {
    if (typeof rowKey === 'function') {
      const k = rowKey(record)
      return k as React.Key
    }
    // 字符串属性名：直接取该字段（与 antd rowKey='key' 同款）。
    const v = (record as unknown as Record<string, unknown>)[rowKey]
    if (v === undefined || v === null) return index as React.Key // 兜底用 index（防 record 无 key 字段）
    return v as React.Key
  } catch {
    return undefined
  }
}

/**
 * 判断两个 rowKey 是否相等（兼容 string / number 混用，按 String() 归一比较）。
 *
 * antd selectedRowKeys 可能是 (string|number)[]，record.key 也可能 string/number，
 * 用 String() 归一避免 `'1' === 1` 误判为不等。
 */
export function sameRowKey(a: React.Key, b: React.Key): boolean {
  return String(a) === String(b)
}

export interface DragAxisBound {
  index: number
  start: number
  end: number
}

export interface DragInsertionTarget {
  overIndex: number
  indicatorOffset: number
}

export interface RowYieldRange {
  lo: number
  hi: number
  sign: 1 | -1
}

export function computeDragInsertionTarget(
  pointer: number,
  bounds: ReadonlyArray<DragAxisBound>,
  containerStart: number,
): DragInsertionTarget | null {
  if (bounds.length === 0) return null
  const sorted = bounds.slice().sort((a, b) => a.index - b.index)
  for (const bound of sorted) {
    const mid = (bound.start + bound.end) / 2
    if (pointer < mid) {
      return {
        overIndex: bound.index,
        indicatorOffset: bound.start - containerStart,
      }
    }
  }
  const last = sorted[sorted.length - 1]!
  return {
    overIndex: last.index + 1,
    indicatorOffset: last.end - containerStart,
  }
}

export function insertionIndexToMoveIndex(insertIndex: number, fromIndex: number): number {
  return insertIndex > fromIndex ? insertIndex - 1 : insertIndex
}

export function computeRowYieldRange(fromIndex: number, overIndex: number): RowYieldRange {
  if (fromIndex < overIndex) {
    return { lo: fromIndex + 1, hi: overIndex, sign: -1 }
  }
  if (fromIndex > overIndex) {
    return { lo: overIndex, hi: fromIndex - 1, sign: 1 }
  }
  return { lo: 1, hi: 0, sign: 1 }
}

export function createRowDragOverlay(container: HTMLElement, rowIndex: number): HTMLElement | null {
  const cells = Array.from(
    container.querySelectorAll<HTMLElement>(`[data-row-index="${rowIndex}"]`),
  )
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
  overlay.className = 'dg-drag-row-overlay'
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
    clone.removeAttribute('data-row-index')
    clone.removeAttribute('data-known-size')
    clone.classList.remove('dg-drag-row-active', 'dg-drag-row-yield', 'dg-drag-row-source')
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

export function updateRowDragOverlay(overlay: HTMLElement | null, delta: number): void {
  if (!overlay) return
  overlay.style.transform = `translate3d(0, ${delta}px, 0)`
}

export function removeRowDragOverlay(overlay: HTMLElement | null): void {
  overlay?.remove()
}
