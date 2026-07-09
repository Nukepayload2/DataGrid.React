import { describe, expect, it } from 'vitest'
import {
  arrayToRanges,
  find,
  findMaxKeyValue,
  insert,
  keys,
  newTree,
  ranges,
  rangesWithin,
  remove,
  walk,
  type AANode,
} from '../../../../src/table/engine/AATree'

function treeFrom<T>(entries: Array<[number, T]>): AANode<T> {
  return entries.reduce<AANode<T>>((tree, [key, value]) => insert(tree, key, value), newTree<T>())
}

describe('AATree', () => {
  it('handles an empty tree', () => {
    const tree = newTree<string>()

    expect(keys(tree)).toEqual([])
    expect(walk(tree)).toEqual([])
    expect(ranges(tree)).toEqual([])
    expect(rangesWithin(tree, 0, 10)).toEqual([])
    expect(find(tree, 1)).toBeUndefined()
    expect(findMaxKeyValue(tree, 1)).toEqual([-Infinity, undefined])
  })

  it('keeps keys and walk output sorted, and overwrites duplicate keys', () => {
    let tree = treeFrom([
      [3, 'c'],
      [1, 'a'],
      [2, 'b'],
    ])

    tree = insert(tree, 2, 'bb')

    expect(keys(tree)).toEqual([1, 2, 3])
    expect(walk(tree)).toEqual([
      { k: 1, v: 'a' },
      { k: 2, v: 'bb' },
      { k: 3, v: 'c' },
    ])
    expect(find(tree, 2)).toBe('bb')
  })

  it('removes leaf, single-child, two-child, and missing keys', () => {
    expect(keys(remove(treeFrom([[10, 'a'], [5, 'b'], [15, 'c']]), 5))).toEqual([10, 15])
    expect(keys(remove(treeFrom([[10, 'a'], [5, 'b'], [15, 'c'], [12, 'd']]), 15))).toEqual([5, 10, 12])
    expect(keys(remove(treeFrom([[10, 'a'], [5, 'b'], [15, 'c'], [12, 'd'], [18, 'e']]), 15))).toEqual([
      5,
      10,
      12,
      18,
    ])
    expect(keys(remove(treeFrom([[10, 'a'], [5, 'b']]), 999))).toEqual([5, 10])
  })

  it('finds max key/value by key and by value field', () => {
    const tree = treeFrom([
      [10, 100],
      [20, 200],
    ])

    expect(findMaxKeyValue(tree, 10)).toEqual([10, 100])
    expect(findMaxKeyValue(tree, 15)).toEqual([10, 100])
    expect(findMaxKeyValue(tree, 5)).toEqual([-Infinity, undefined])
    expect(findMaxKeyValue(tree, 150, 'v')).toEqual([10, 100])
    expect(findMaxKeyValue(tree, 200, 'v')).toEqual([20, 200])
  })

  it('creates full and partial ranges with Infinity as the final end', () => {
    const tree = treeFrom([
      [0, 20],
      [3, 30],
      [6, 40],
    ])

    expect(ranges(tree)).toEqual([
      { start: 0, end: 2, value: 20 },
      { start: 3, end: 5, value: 30 },
      { start: 6, end: Infinity, value: 40 },
    ])
    expect(rangesWithin(tree, 1, 4)).toEqual([
      { start: 0, end: 2, value: 20 },
      { start: 3, end: Infinity, value: 30 },
    ])
  })

  it('converts arrays to adjacent ranges', () => {
    expect(arrayToRanges([], (item: { index: number; value: string }) => item)).toEqual([])
    expect(arrayToRanges([{ index: 2, value: 'a' }], (item) => item)).toEqual([
      { start: 2, end: Infinity, value: 'a' },
    ])
    expect(arrayToRanges([{ index: 2, value: 'a' }, { index: 5, value: 'b' }], (item) => item)).toEqual([
      { start: 2, end: 4, value: 'a' },
      { start: 5, end: Infinity, value: 'b' },
    ])
  })
})
