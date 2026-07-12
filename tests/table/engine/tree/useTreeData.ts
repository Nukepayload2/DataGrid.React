import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  detectTreeData,
  flattenTreeData,
  useTreeData,
} from '../../../../src/table/engine/useTreeData'

interface Row {
  key: string
  name: string
  children?: Row[]
  nodes?: Row[]
}

const treeData: Row[] = [
  {
    key: 'root-a',
    name: 'Root A',
    children: [
      { key: 'a-1', name: 'A 1' },
      {
        key: 'a-2',
        name: 'A 2',
        children: [{ key: 'a-2-1', name: 'A 2 1' }],
      },
    ],
  },
  { key: 'root-b', name: 'Root B' },
]

describe('useTreeData pure helpers', () => {
  it('detects tree data from top-level non-empty children only', () => {
    expect(detectTreeData(treeData, 'children')).toBe(true)
    expect(detectTreeData([{ key: 'x', name: 'X', children: [] }], 'children')).toBe(false)
    expect(
      detectTreeData(
        [{ key: 'x', name: 'X', nodes: [{ key: 'x-1', name: 'X 1' }] }],
        'children',
      ),
    ).toBe(false)
  })

  it('flattens only expanded branches and records row metadata', () => {
    const flattened = flattenTreeData(treeData, 'children', new Set(['root-a']), 'key')

    expect(flattened.flattenedData.map((row) => row.key)).toEqual([
      'root-a',
      'a-1',
      'a-2',
      'root-b',
    ])
    expect(flattened.rowInfoMap.get('root-a')).toEqual({
      level: 0,
      parentKey: null,
      hasChildren: true,
    })
    expect(flattened.rowInfoMap.get('a-2')).toEqual({
      level: 1,
      parentKey: 'root-a',
      hasChildren: true,
    })
  })
})

describe('useTreeData hook', () => {
  it('returns original data and empty tree maps for non-tree data', () => {
    const flatData = [
      { key: 'a', name: 'A' },
      { key: 'b', name: 'B' },
    ]
    const { result } = renderHook(() =>
      useTreeData({
        dataSource: flatData,
        childrenColumnName: 'children',
        rowKey: 'key',
      }),
    )

    expect(result.current.treeEnabled).toBe(false)
    expect(result.current.flattenedData).toBe(flatData)
    expect(result.current.rowInfoMap.size).toBe(0)
    expect(result.current.parentChildrenMap.size).toBe(0)
    expect(result.current.expandableKeySet.size).toBe(0)
  })

  it('builds full-tree parent maps independent of visible expansion state', () => {
    const { result } = renderHook(() =>
      useTreeData({
        dataSource: treeData,
        childrenColumnName: 'children',
        rowKey: 'key',
      }),
    )

    expect(result.current.treeEnabled).toBe(true)
    expect(result.current.flattenedData.map((row) => row.key)).toEqual(['root-a', 'root-b'])
    expect(result.current.parentChildrenMap.get('root-a')).toEqual(['a-1', 'a-2'])
    expect(result.current.parentChildrenMap.get('a-2')).toEqual(['a-2-1'])
    expect(Array.from(result.current.expandableKeySet).sort()).toEqual(['a-2', 'root-a'])
  })

  it('initializes uncontrolled expansion from defaultExpandedRowKeys and filters leaf keys', () => {
    const { result } = renderHook(() =>
      useTreeData({
        dataSource: treeData,
        childrenColumnName: 'children',
        rowKey: 'key',
        expandable: {
          defaultExpandedRowKeys: ['root-a', 'a-1'],
        },
      }),
    )

    expect(Array.from(result.current.expandedKeySet)).toEqual(['root-a'])
    expect(result.current.flattenedData.map((row) => row.key)).toEqual([
      'root-a',
      'a-1',
      'a-2',
      'root-b',
    ])
  })

  it('defaultExpandAllRows expands nested expandable rows', () => {
    const { result } = renderHook(() =>
      useTreeData({
        dataSource: treeData,
        childrenColumnName: 'children',
        rowKey: 'key',
        expandable: {
          defaultExpandAllRows: true,
        },
      }),
    )

    expect(Array.from(result.current.expandedKeySet).sort()).toEqual(['a-2', 'root-a'])
    expect(result.current.flattenedData.map((row) => row.key)).toEqual([
      'root-a',
      'a-1',
      'a-2',
      'a-2-1',
      'root-b',
    ])
  })

  it('toggles uncontrolled expansion and calls antd-compatible callbacks', () => {
    const onExpandedRowsChange = vi.fn()
    const onExpand = vi.fn()
    const { result } = renderHook(() =>
      useTreeData({
        dataSource: treeData,
        childrenColumnName: 'children',
        rowKey: 'key',
        expandable: {
          onExpandedRowsChange,
          onExpand,
        },
      }),
    )

    act(() => {
      result.current.toggleExpand('root-a')
    })

    expect(result.current.isExpanded('root-a')).toBe(true)
    expect(result.current.flattenedData.map((row) => row.key)).toEqual([
      'root-a',
      'a-1',
      'a-2',
      'root-b',
    ])
    expect(onExpandedRowsChange).toHaveBeenLastCalledWith(['root-a'])
    expect(onExpand).toHaveBeenLastCalledWith(true, treeData[0])

    act(() => {
      result.current.toggleExpand('root-a')
    })

    expect(result.current.isExpanded('root-a')).toBe(false)
    expect(onExpandedRowsChange).toHaveBeenLastCalledWith([])
    expect(onExpand).toHaveBeenLastCalledWith(false, treeData[0])
  })

  it('does not toggle leaf keys', () => {
    const onExpandedRowsChange = vi.fn()
    const { result } = renderHook(() =>
      useTreeData({
        dataSource: treeData,
        childrenColumnName: 'children',
        rowKey: 'key',
        expandable: { onExpandedRowsChange },
      }),
    )

    act(() => {
      result.current.toggleExpand('root-b')
    })

    expect(result.current.expandedKeySet.size).toBe(0)
    expect(onExpandedRowsChange).not.toHaveBeenCalled()
  })

  it('honors controlled expandedRowKeys without mutating internal state', () => {
    const onExpandedRowsChange = vi.fn()
    const { result, rerender } = renderHook(
      ({ expandedRowKeys }: { expandedRowKeys: React.Key[] }) =>
        useTreeData({
          dataSource: treeData,
          childrenColumnName: 'children',
          rowKey: 'key',
          expandable: {
            expandedRowKeys,
            onExpandedRowsChange,
          },
        }),
      { initialProps: { expandedRowKeys: ['root-a'] } },
    )

    expect(result.current.flattenedData.map((row) => row.key)).toEqual([
      'root-a',
      'a-1',
      'a-2',
      'root-b',
    ])

    act(() => {
      result.current.toggleExpand('a-2')
    })

    expect(onExpandedRowsChange).toHaveBeenLastCalledWith(['root-a', 'a-2'])
    expect(result.current.isExpanded('a-2')).toBe(false)

    rerender({ expandedRowKeys: ['root-a', 'a-2'] })

    expect(result.current.isExpanded('a-2')).toBe(true)
    expect(result.current.flattenedData.map((row) => row.key)).toEqual([
      'root-a',
      'a-1',
      'a-2',
      'a-2-1',
      'root-b',
    ])
  })

  it('supports custom childrenColumnName and function rowKey', () => {
    const data: Row[] = [
      {
        key: 'root',
        name: 'Root',
        nodes: [{ key: 'child', name: 'Child' }],
      },
    ]

    const { result } = renderHook(() =>
      useTreeData({
        dataSource: data,
        childrenColumnName: 'nodes',
        rowKey: (row) => row.key,
        expandable: { defaultExpandAllRows: true },
      }),
    )

    expect(result.current.treeEnabled).toBe(true)
    expect(result.current.flattenedData.map((row) => row.key)).toEqual(['root', 'child'])
    expect(result.current.parentChildrenMap.get('root')).toEqual(['child'])
  })
})
