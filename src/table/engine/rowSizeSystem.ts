/**
 * rowSizeSystem — 行尺寸纯函数系统（动态行高前缀和）。
 *
 * 同构移植自 react-virtuoso 的 `sizeSystem.ts` 纯函数部分
 * （`G:\Projects\react-virtuoso\packages\react-virtuoso\src\sizeSystem.ts`），
 * 去除 urx/分组/recalc/log，改写为 data-grid 风格。
 *
 * 核心数据结构：
 *  - sizeTree (AATree<number>)：key=段起始行 index，value=该段行高。
 *  - offsetTree (OffsetPoint[])：按 index 升序排列的「断点」，每点记录
 *      {index, offset=该行顶边到列表顶的距离, size=该行高度}。
 *    offsetTree 是 sizeTree 的前缀和缓存，支持 O(log n) offsetOf 查询。
 *
 * 增量重建：applySizeRanges 只在变化的最早 index (syncStart) 之后重算 offsetTree，
 * 之前的 OffsetPoint 直接复用（slice 保留），复杂度 O(变化段数)。
 *
 * gap：行间距。createOffsetTree 与 offsetOf 都必须加 gap，漏一处则偏移错位。
 */

import {
  AANode,
  arrayToRanges,
  empty,
  findMaxKeyValue,
  insert,
  newTree,
  Range,
  rangesWithin,
  remove,
  walk,
} from './AATree'
import { findClosestSmallerOrEqual, findIndexOfClosestSmallerOrEqual } from './binaryArraySearch'

/** offsetTree 的一个断点。offset 为该行顶边距列表顶部的像素距离。 */
export interface OffsetPoint {
  index: number
  offset: number
  size: number
}

/** 行尺寸状态机：sizeTree + 前缀和缓存 offsetTree + 尾部缓存。 */
export interface RowSizeState {
  sizeTree: AANode<number>
  offsetTree: OffsetPoint[]
  /** 当前已知的最大行 index（offsetTree 最后一个点的 index）。 */
  lastIndex: number
  /** 当前已知的最大行顶边 offset（offsetTree 最后一个点的 offset）。 */
  lastOffset: number
  /** 当前已知的最后一行的高度（offsetTree 最后一个点的 size）。 */
  lastSize: number
}

/** 一段连续同高行的范围 [startIndex, endIndex]。 */
export interface SizeRange {
  startIndex: number
  endIndex: number
  size: number
}

/** index 比较器：value 是行 index，item 是 OffsetPoint。返回 item 相对 value 的位置。 */
function indexComparator({ index: itemIndex }: OffsetPoint, index: number) {
  return index === itemIndex ? 0 : index < itemIndex ? -1 : 1
}

/** offset 比较器：value 是 offset 像素，item 是 OffsetPoint。 */
function offsetComparator({ offset: itemOffset }: OffsetPoint, offset: number) {
  return offset === itemOffset ? 0 : offset < itemOffset ? -1 : 1
}

/** 初始空状态：空 sizeTree / 空 offsetTree，尾部缓存全 0。 */
export function initialRowSizeState(): RowSizeState {
  return {
    lastIndex: 0,
    lastOffset: 0,
    lastSize: 0,
    offsetTree: [],
    sizeTree: newTree<number>(),
  }
}

/**
 * 将一批 SizeRange 合并进 sizeTree，返回新的 [sizeTree, syncStart]。
 * 同构移植自 react-virtuoso insertRanges()。
 *
 * 合并逻辑：
 *  1) 空 sizeTree：在 key=0 插入第一段高度。
 *  2) 否则取 [startIndex-1, endIndex+1] 的相邻段（overlappingRanges），
 *     - 若新 range 已被某相邻段完全覆盖（同 start/end/size）→ 跳过（去重）。
 *     - 第一段（前邻）若 size 不同 → 标记 shouldInsert。
 *     - 中间/后邻段：起于新范围内的 或 同高 → 删除（实现合并）。
 *     - 后邻段若 end 越过 endIndex 且 size 不同 → 在 endIndex+1 插回原值（保留后续段）。
 *  3) shouldInsert 为真 → 在 startIndex 插入新 size。
 *
 * syncStart = 所有 range 中最早的 startIndex（首插时为 0），用于 createOffsetTree 增量重建起点。
 */
function insertRanges(sizeTree: AANode<number>, ranges: SizeRange[]): readonly [AANode<number>, number] {
  let syncStart = empty(sizeTree) ? 0 : Infinity

  for (const range of ranges) {
    const { endIndex, size, startIndex } = range
    syncStart = Math.min(syncStart, startIndex)

    if (empty(sizeTree)) {
      sizeTree = insert(sizeTree, 0, size)
      continue
    }

    // extend the range in both directions, so that we can get adjacent neighbours.
    // if the previous / next ones have the same value as the one we are about to insert,
    // we 'merge' them.
    const overlappingRanges = rangesWithin(sizeTree, startIndex - 1, endIndex + 1)

    if (overlappingRanges.some(rangeIncludes(range))) {
      continue
    }

    let firstPassDone = false
    let shouldInsert = false
    for (const { end: rangeEnd, start: rangeStart, value: rangeValue } of overlappingRanges) {
      // previous range
      if (firstPassDone) {
        // remove the range if it starts within the new range OR if
        // it has the same value as it, in order to perform a merge
        if (endIndex >= rangeStart || size === rangeValue) {
          sizeTree = remove(sizeTree, rangeStart)
        }
      } else {
        shouldInsert = rangeValue !== size
        firstPassDone = true
      }

      // next range
      if (rangeEnd > endIndex && endIndex >= rangeStart) {
        if (rangeValue !== size) {
          sizeTree = insert(sizeTree, endIndex + 1, rangeValue)
        }
      }
    }

    if (shouldInsert) {
      sizeTree = insert(sizeTree, startIndex, size)
    }
  }
  return [sizeTree, syncStart] as const
}

/**
 * 主入口：把新一批 SizeRange 应用到 state，返回新 state（或原 state 去重）。
 * 等价于 react-virtuoso sizeStateReducer 的核心：
 *  insertRanges → 若 sizeTree 未变则返回原 state → createOffsetTree 增量重建。
 */
export function applySizeRanges(state: RowSizeState, ranges: SizeRange[], gap: number): RowSizeState {
  const sizeTree = state.sizeTree
  let newSizeTree: AANode<number> = sizeTree
  let syncStart = 0

  ;[newSizeTree, syncStart] = insertRanges(newSizeTree, ranges)

  // 去重：sizeTree 引用未变 → 无任何变化，返回原 state（避免下游重渲染）。
  if (newSizeTree === sizeTree) {
    return state
  }

  const { lastIndex, lastOffset, lastSize, offsetTree: newOffsetTree } = createOffsetTree(
    state.offsetTree,
    syncStart,
    newSizeTree,
    gap
  )

  return {
    lastIndex,
    lastOffset,
    lastSize,
    offsetTree: newOffsetTree,
    sizeTree: newSizeTree,
  }
}

/**
 * 增量重建 offsetTree：从 syncStart 起之后的断点重算，之前的原样保留。
 * 同构移植自 react-virtuoso createOffsetTree()。
 *
 * 步骤：
 *  1) syncStart === 0：offsetTree 清空，从零开始。
 *  2) 否则：用二分找 offsetTree 中 index<=syncStart-1 的断点，
 *     prevOffset/prevIndex/prevSize 取自该断点 + sizeTree；
 *     若该断点的 size 与 syncStart 处的 size 相同（说明 syncStart 本不是段界），
 *     退一格 startIndex-1 以包含真正的前段起点，然后 slice 保留 [0..startIndex]。
 *  3) 遍历 sizeTree 中从 syncStart 起的所有段，
 *     aOffset = (startIndex - prevIndex) * prevSize + prevOffset + (startIndex - prevIndex) * gap。
 *     注意 gap：每段间都有 gap，故 indexOffset 个 gap。
 *
 * 返回 {offsetTree, lastIndex, lastOffset, lastSize}（尾部缓存即最后一个 OffsetPoint）。
 */
function createOffsetTree(
  prevOffsetTree: OffsetPoint[],
  syncStart: number,
  sizeTree: AANode<number>,
  gap: number
): { lastIndex: number; lastOffset: number; lastSize: number; offsetTree: OffsetPoint[] } {
  let offsetTree = prevOffsetTree
  let prevIndex = 0
  let prevSize = 0

  let prevOffset = 0
  let startIndex = 0

  if (syncStart === 0) {
    offsetTree = []
  } else {
    startIndex = findIndexOfClosestSmallerOrEqual(offsetTree, syncStart - 1, indexComparator)
    const offsetInfo = offsetTree[startIndex]!
    prevOffset = offsetInfo.offset
    const kv = findMaxKeyValue(sizeTree, syncStart - 1)
    prevIndex = kv[0]
    prevSize = kv[1]!

    if (offsetTree.length && offsetTree[startIndex]!.size === findMaxKeyValue(sizeTree, syncStart)[1]) {
      startIndex -= 1
    }

    offsetTree = offsetTree.slice(0, startIndex + 1)
  }

  for (const { start: rangeStart, value } of rangesWithin(sizeTree, syncStart, Infinity)) {
    const indexOffset = rangeStart - prevIndex
    const aOffset = indexOffset * prevSize + prevOffset + indexOffset * gap
    offsetTree.push({
      index: rangeStart,
      offset: aOffset,
      size: value,
    })
    prevIndex = rangeStart
    prevOffset = aOffset
    prevSize = value
  }

  return {
    lastIndex: prevIndex,
    lastOffset: prevOffset,
    lastSize: prevSize,
    offsetTree,
  }
}

/**
 * 查询第 index 行的顶边 offset（距列表顶的像素距离）。O(log n)。
 * 同构移植自 react-virtuoso offsetOf()。
 *
 *  - offsetTree 空 → 返回 0。
 *  - 二分找 index<=给定 index 的最大断点 (startIndex, offset, size)。
 *  - top = size * (index - startIndex) + ((index - startIndex) - 1) * gap + offset。
 *    即：段内偏移 + 段内项间 gap + 段起始 offset。
 *  - top > 0 时再加一个 gap（行与前一断点行之间的 gap），否则不加（首行）。
 *
 * gap 处理是关键：行间共 itemCount 个间距但第一项无前导 gap，故 (itemCount-1)；
 * top>0 表示非首段，还需补一个段间 gap。
 */
export function offsetOf(index: number, state: RowSizeState, gap: number): number {
  const tree = state.offsetTree
  if (tree.length === 0) {
    return 0
  }

  const { index: startIndex, offset, size } = findClosestSmallerOrEqual(tree, index, indexComparator)
  const itemCount = index - startIndex
  const top = size * itemCount + (itemCount - 1) * gap + offset
  return top > 0 ? top + gap : top
}

/**
 * 查询第 index 行的高度。O(log n)。
 * 用 findMaxKeyValue 在 sizeTree 找 index 所在段的 size。
 * 空树返回 0（调用方应回退到约定行高 getRowHeight）。
 */
export function sizeOf(index: number, state: RowSizeState): number {
  if (empty(state.sizeTree)) {
    return 0
  }
  return findMaxKeyValue(state.sizeTree, index)[1] ?? 0
}

/**
 * 计算 totalCount 行的总高度。O(1)。
 *
 * 公式：lastOffset + (totalCount - lastIndex) * lastSize + (totalCount - 1) * gap。
 *
 * 推导：lastOffset 是最后一断点行（index=lastIndex）的顶边 offset。
 * 从 lastIndex 到 totalCount-1 共 (totalCount - lastIndex) 行，每行高 lastSize，
 * 故第 (totalCount-1) 行底边 = lastOffset + (totalCount - lastIndex) * lastSize。
 *
 * 与 offsetOf 自洽：offsetOf(totalCount-1) + lastSize + gap ≈ 总高（gap 计 (totalCount-1) 个，
 * 行间，首行前无 gap）。
 *
 * 边界：count<=0 或空树 → 0（调用方用约定行高 * count 兜底）。
 */
export function totalHeight(totalCount: number, state: RowSizeState, gap: number): number {
  if (totalCount <= 0) {
    return 0
  }
  if (state.offsetTree.length === 0) {
    return 0
  }
  const { lastOffset, lastSize, lastIndex } = state
  // 第 (totalCount-1) 行底边 = lastOffset + (totalCount - lastIndex) * lastSize。
  const lastRowBottom = lastOffset + (totalCount - lastIndex) * lastSize
  // 行间 gap 共 (totalCount - 1) 个。
  return lastRowBottom + (totalCount - 1) * gap
}

/* ============================================================
 * 以下辅助导出供 useRowMeasurements / useVirtualList 使用。
 * ============================================================ */

/** 空树判断（sizeTree 无任何节点）。 */
export function isEmptySizeTree(state: RowSizeState): boolean {
  return empty(state.sizeTree)
}

/** 把 sizeTree 展开成 SizeRange 列表（用于调试/序列化）。同构移植自 sizeTreeToRanges。 */
export function sizeTreeToRanges(state: RowSizeState): SizeRange[] {
  return walk(state.sizeTree).map(({ k: startIndex, v: size }, index, sizeArray) => {
    const nextSize = sizeArray[index + 1]
    const endIndex = nextSize === undefined ? Infinity : nextSize.k - 1
    return { endIndex, size, startIndex }
  })
}

/**
 * 给定 [startOffset, endOffset] 像素区间，返回与之相交的 offsetTree 段 Range 列表。
 * 用于渲染窗口计算。同构移植自 rangesWithinOffsets。
 */
export function rangesWithinOffsets(
  state: RowSizeState,
  startOffset: number,
  endOffset: number,
  minStartIndex = 0
): { end: number; start: number; value: OffsetPoint }[] {
  const tree = state.offsetTree
  if (tree.length === 0) {
    return []
  }
  if (minStartIndex > 0) {
    startOffset = Math.max(startOffset, findClosestSmallerOrEqual(tree, minStartIndex, indexComparator).offset)
  }
  return arrayToRanges(findOffsetRange(tree, startOffset, endOffset), offsetPointParser)
}

function findOffsetRange(tree: OffsetPoint[], startOffset: number, endOffset: number): OffsetPoint[] {
  // 复用 binaryArraySearch.findRange 的语义（用 offsetComparator）。
  // 这里直接内联以避免引入额外的导出。
  const startIndex = findIndexOfClosestSmallerOrEqual(tree, startOffset, offsetComparator)
  const endIndex = findIndexOfClosestSmallerOrEqual(tree, endOffset, offsetComparator, startIndex)
  return tree.slice(startIndex, endIndex + 1)
}

function offsetPointParser(point: OffsetPoint) {
  return { index: point.index, value: point }
}

function rangeIncludes(refRange: SizeRange) {
  const { endIndex, size, startIndex } = refRange
  return (range: Range<number>) => {
    return range.start === startIndex && (range.end === endIndex || range.end === Infinity) && range.value === size
  }
}

// 重新导出 AATree 常用 API（供上层直接构造 sizeTree 场景；find 用于已知 index 取行高缓存）。
export { find as findInSizeTree } from './AATree'
