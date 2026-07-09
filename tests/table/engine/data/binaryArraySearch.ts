import { describe, expect, it } from 'vitest'
import {
  findClosestSmallerOrEqual,
  findIndexOfClosestSmallerOrEqual,
  findRange,
  type Comparator,
} from '../../../../src/table/engine/binaryArraySearch'

const comparator: Comparator<number> = (item, value) => {
  if (item === value) return 0
  return value < item ? -1 : 1
}

describe('binaryArraySearch', () => {
  const items = [0, 10, 20, 30]

  it('finds exact hits and closest smaller values between breakpoints', () => {
    expect(findIndexOfClosestSmallerOrEqual(items, 20, comparator)).toBe(2)
    expect(findClosestSmallerOrEqual(items, 25, comparator)).toBe(20)
  })

  it('handles first and last breakpoints with the current caller-facing behavior', () => {
    expect(findIndexOfClosestSmallerOrEqual(items, 0, comparator)).toBe(0)
    expect(findIndexOfClosestSmallerOrEqual(items, 99, comparator)).toBe(3)
    expect(findIndexOfClosestSmallerOrEqual(items, -1, comparator)).toBe(-1)
  })

  it('uses the start parameter as a lower bound', () => {
    expect(findIndexOfClosestSmallerOrEqual(items, 25, comparator, 2)).toBe(2)
  })

  it('finds a range by both ends', () => {
    expect(findRange(items, 5, 25, comparator)).toEqual([0, 10, 20])
    expect(findRange(items, 10, 30, comparator)).toEqual([10, 20, 30])
  })

  it('throws for empty arrays', () => {
    expect(() => findIndexOfClosestSmallerOrEqual([], 1, comparator)).toThrow('Failed binary finding record')
  })
})
