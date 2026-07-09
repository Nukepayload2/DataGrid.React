import { describe, expect, it } from 'vitest'
import {
  collectLeaves,
  flattenHeaderCells,
  getDepth,
  getLeavesCount,
  getMaxDepth,
  isLeafColumn,
  resolveColumnTree,
} from '../../../../src/table/engine/columnTree'
import type { EngineColumnNode } from '../../../../src/table/engine/types'

interface Row {
  name: string
  age: number
  addr: { city: string }
}

function sampleTree(): Array<EngineColumnNode<Row>> {
  return [
    {
      key: 'name',
      title: 'Name',
      dataIndex: 'name',
      width: 120,
      raw: { dataIndex: 'name', sorter: true },
    },
    {
      key: 'group',
      title: 'Group',
      children: [
        {
          key: 'ageNode',
          title: 'Age',
          dataIndex: 'age',
          sorter: true,
          filters: [],
          raw: { dataIndex: 'age', sorter: true, filters: [] },
        },
        {
          key: 'cityNode',
          title: 'City',
          dataIndex: ['addr', 'city'],
          filters: [],
          raw: { key: 'cityKey', dataIndex: ['addr', 'city'], filters: [] },
        },
      ],
    },
  ]
}

describe('columnTree', () => {
  it('computes leaf status, depth, leaves, and max depth', () => {
    const tree = sampleTree()

    expect(isLeafColumn(tree[0])).toBe(true)
    expect(isLeafColumn(tree[1])).toBe(false)
    expect(getDepth(tree[0])).toBe(1)
    expect(getDepth(tree[1])).toBe(2)
    expect(getLeavesCount(tree[1])).toBe(2)
    expect(getMaxDepth(tree)).toBe(2)
    expect(getMaxDepth([])).toBe(0)
  })

  it('collects leaves in order and passes through leaf fields', () => {
    const leaves = collectLeaves(sampleTree())

    expect(leaves.map((leaf) => leaf.key)).toEqual(['name', 'ageNode', 'cityNode'])
    expect(leaves[0]).toMatchObject({ dataIndex: 'name', width: 120, title: 'Name' })
    expect(leaves[1]).toMatchObject({ sorter: true, filters: [] })
  })

  it('flattens multi-level headers into stable grid lines and leaf indexes', () => {
    const cells = flattenHeaderCells(sampleTree(), 2)
    const byKey = new Map(cells.map((cell) => [cell.key, cell]))

    expect(byKey.get('name')).toMatchObject({
      gridColumnStart: 1,
      gridColumnEnd: 2,
      gridRowStart: 1,
      gridRowEnd: 3,
      isLeaf: true,
      leafIndex: 0,
    })
    expect(byKey.get('ageNode')).toMatchObject({
      gridColumnStart: 2,
      gridColumnEnd: 3,
      gridRowStart: 2,
      gridRowEnd: 3,
      isLeaf: true,
      leafIndex: 1,
    })
    expect(byKey.get('group')).toMatchObject({
      gridColumnStart: 2,
      gridColumnEnd: 4,
      gridRowStart: 1,
      gridRowEnd: 2,
      isLeaf: false,
    })
  })

  it('marks last leaf and group-last leaf boundaries', () => {
    const cells = flattenHeaderCells(sampleTree(), 2)
    const leaves = cells.filter((cell) => cell.isLeaf)

    expect(leaves.map((leaf) => [leaf.key, leaf.isLastLeaf, leaf.isGroupLastLeaf])).toEqual([
      ['name', false, false],
      ['ageNode', false, false],
      ['cityNode', true, true],
    ])
  })

  it('applies header colSpan coverage and ignores out-of-bounds spans', () => {
    const tree: Array<EngineColumnNode<Row>> = [
      { key: 'a', title: 'A', colSpan: 2 },
      { key: 'b', title: 'B', colSpan: 0 },
      { key: 'c', title: 'C', colSpan: 9 },
    ]
    const cells = flattenHeaderCells(tree, 1)
    const byKey = new Map(cells.map((cell) => [cell.key, cell]))

    expect(byKey.get('a')).toMatchObject({ gridColumnStart: 1, gridColumnEnd: 3 })
    expect(byKey.get('a')).not.toHaveProperty('covered')
    expect(byKey.get('b')).toMatchObject({ covered: true })
    expect(byKey.get('c')).toMatchObject({ gridColumnStart: 3, gridColumnEnd: 4 })
    expect(byKey.get('c')).not.toHaveProperty('covered')
  })

  it('adds sort and filter keys for nested leaves', () => {
    const { maxDepth, leafColumns, headerCells } = resolveColumnTree(sampleTree())
    const byKey = new Map(headerCells.map((cell) => [cell.key, cell]))

    expect(maxDepth).toBe(2)
    expect(leafColumns.map((leaf) => leaf.key)).toEqual(['name', 'ageNode', 'cityNode'])
    expect(byKey.get('ageNode')).toMatchObject({ sortKey: 'age', filterKey: 'age' })
    expect(byKey.get('cityNode')).toMatchObject({ filterKey: 'cityKey' })
  })
})
