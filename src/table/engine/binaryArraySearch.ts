/**
 * binaryArraySearch — 有序数组二分查找工具。
 *
 * 用于：在 offsetTree（按 index/offset 升序排列的 OffsetPoint 数组）上做 O(log n) 查找。
 * 详细机制（比较器约定、与 offsetTree 查询的配合）见 docs/design-notes/virtualization.md。
 */

export type Comparator<T> = (item: T, value: number) => -1 | 0 | 1

/**
 * 返回数组中「小于等于 value」的最大元素的**值**。
 *
 * 比较器约定（与 offsetTree 查询配合）：
 *  - 返回 -1：item < value（应往右找）
 *  - 返回  0：item === value
 *  - 返回  1：item > value（应往左找）
 *
 * 即 comparator(item, value) 描述的是「item 相对于 value 的位置」。
 */
export function findClosestSmallerOrEqual<T>(items: T[], value: number, comparator: Comparator<T>): T {
  return items[findIndexOfClosestSmallerOrEqual(items, value, comparator)]!
}

/**
 * 返回数组中「小于等于 value」的最大元素的**索引**。
 *
 * 关键边界：
 *  - 当 items[end] 仍 < value（match=-1 且 end-start<2）：返回 index-1（回退到上一个更小的）
 *  - 当 items[start] 已 ≥ value（match=1 且 end===start）：返回 start（首个大于等于的当作候选下界）
 *
 * start 参数用于复用已找到的下界，加速 [startValue, endValue] 区间双查（findRange）。
 */
export function findIndexOfClosestSmallerOrEqual<T>(items: T[], value: number, comparator: Comparator<T>, start = 0): number {
  let end = items.length - 1

  while (start <= end) {
    const index = Math.floor((start + end) / 2)
    const item = items[index]!
    const match = comparator(item, value)
    if (match === 0) {
      return index
    }

    if (match === -1) {
      if (end - start < 2) {
        return index - 1
      }
      end = index - 1
    } else {
      if (end === start) {
        return index
      }
      start = index + 1
    }
  }

  throw new Error(`Failed binary finding record in array - ${items.join(',')}, searched for ${value}`)
}

/**
 * 返回 [startValue, endValue] 区间内的所有元素切片。
 * 复用第一次查找结果作为第二次的 start 下界，避免重复扫描前段。
 */
export function findRange<T>(items: T[], startValue: number, endValue: number, comparator: Comparator<T>): T[] {
  const startIndex = findIndexOfClosestSmallerOrEqual(items, startValue, comparator)
  const endIndex = findIndexOfClosestSmallerOrEqual(items, endValue, comparator, startIndex)
  return items.slice(startIndex, endIndex + 1)
}
