import { describe, expect, it, vi } from 'vitest'
import {
  arrayMove,
  arrayMoveBlock,
  computeDragInsertionTarget,
  computeRowYieldRange,
  createRowDragOverlay,
  insertionIndexToMoveIndex,
  removeRowDragOverlay,
  resolveRowKey,
  sameRowKey,
  updateRowDragOverlay,
} from '../../../../src/table/engine/dragSortUtils'

describe('dragSortUtils / arrayMoveBlock (P0)', () => {
  it('returns original when blockIdxs is empty', () => {
    const arr = ['a', 'b', 'c']
    expect(arrayMoveBlock(arr, [], 0)).toBe(arr)
  })

  it('single-element block degrades to arrayMove', () => {
    // block=[1] (b) → to=0；结果 [b,a,c]
    expect(arrayMoveBlock(['a', 'b', 'c'], [1], 0)).toEqual(['b', 'a', 'c'])
  })

  it('moves a contiguous 2-row block forward (lower index)', () => {
    // arr=[0,1,2,3,4,5]；block=[3,4]（值 3,4）→ to=1（在原数组坐标）。
    // rest=[0,1,2,5]；toInRest=1（blockIdxs 中 <1 的个数为 0）→ 插入 → [0,3,4,1,2,5]
    const arr = [0, 1, 2, 3, 4, 5]
    const next = arrayMoveBlock(arr, [3, 4], 1)
    expect(next).toEqual([0, 3, 4, 1, 2, 5])
  })

  it('moves a contiguous 2-row block backward (higher index)', () => {
    // arr=[0,1,2,3,4,5]；block=[1,2]（值 1,2）→ to=5（在原数组坐标）。
    // rest=[0,3,4,5]；blockIdxs 中 <5 的有 2 个 → toInRest=3；
    // splice(3,0,1,2) → [0,3,4] + [1,2] + [5] = [0,3,4,1,2,5]。
    const arr = [0, 1, 2, 3, 4, 5]
    const next = arrayMoveBlock(arr, [1, 2], 5)
    expect(next).toEqual([0, 3, 4, 1, 2, 5])
  })

  it('no-op when toIndex lands inside block range', () => {
    const arr = ['a', 'b', 'c', 'd']
    // toIndex===blockFirst(1) → 落 block 内部
    expect(arrayMoveBlock(arr, [1, 2], 1)).toBe(arr)
    // toIndex===blockLast(2) → 落 block 内部
    expect(arrayMoveBlock(arr, [1, 2], 2)).toBe(arr)
    // toIndex===blockLast+1(3) → 贴边缘（保守判 no-op）
    expect(arrayMoveBlock(arr, [1, 2], 3)).toBe(arr)
  })

  it('moves block to very end (toIndex === arr.length)', () => {
    // arr=[0,1,2,3]；block=[0,1] → to=4(arr.length)
    // rest=[2,3]；blockIdxs 中 <4 的有 2 个 → toInRest=2；插入 → [2,3,0,1]
    const arr = [0, 1, 2, 3]
    expect(arrayMoveBlock(arr, [0, 1], 4)).toEqual([2, 3, 0, 1])
  })

  it('moves block to very start (toIndex === 0) when block is at end', () => {
    // arr=[0,1,2,3,4]；block=[3,4] → to=0
    // rest=[0,1,2]；blockIdxs 中 <0 的个数为 0 → toInRest=0；插入 → [3,4,0,1,2]
    const arr = [0, 1, 2, 3, 4]
    expect(arrayMoveBlock(arr, [3, 4], 0)).toEqual([3, 4, 0, 1, 2])
  })

  it('preserves relative order within block', () => {
    const arr = [
      { id: 'a' },
      { id: 'b' },
      { id: 'c' },
      { id: 'd' },
      { id: 'e' },
    ]
    const next = arrayMoveBlock(arr, [1, 2, 3], 5)
    // arr id=[a,b,c,d,e]；blockIdxs=[1,2,3] → block rows=[b,c,d]；rest=[a,e]；
    // toIndex=5；blockIdxs 中 <5 的有 3 个 → toInRest=2（钳到 restRows.length=2）；
    // splice(2, 0, b,c,d) → [a,e] + at idx2 → [a,e,b,c,d]。
    expect(next.map((r) => r.id)).toEqual(['a', 'e', 'b', 'c', 'd'])
  })

  it('cross-block move with intervening rows', () => {
    // arr=[0,1,2,3,4,5,6,7]；block=[2,3] → to=6
    // rest=[0,1,4,5,6,7]；blockIdxs 中 <6 的有 2 个 → toInRest=4
    // splice(4,0,2,3) → [0,1,4,5] + [2,3] + [6,7] = [0,1,4,5,2,3,6,7]
    const arr = [0, 1, 2, 3, 4, 5, 6, 7]
    expect(arrayMoveBlock(arr, [2, 3], 6)).toEqual([0, 1, 4, 5, 2, 3, 6, 7])
  })

  it('does not mutate input array', () => {
    const arr = [1, 2, 3, 4]
    const next = arrayMoveBlock(arr, [0, 1], 4)
    expect(arr).toEqual([1, 2, 3, 4])
    expect(next).toEqual([3, 4, 1, 2])
  })
})

describe('dragSortUtils / arrayMove (P1)', () => {
  it('moves forward (from < to)', () => {
    expect(arrayMove(['a', 'b', 'c', 'd'], 1, 3)).toEqual(['a', 'c', 'd', 'b'])
  })

  it('moves backward (from > to)', () => {
    expect(arrayMove(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c'])
  })

  it('no-op when from === to', () => {
    const arr = ['a', 'b']
    expect(arrayMove(arr, 0, 0)).toBe(arr)
  })

  it('no-op on out of range', () => {
    const arr = ['a', 'b']
    expect(arrayMove(arr, -1, 0)).toBe(arr)
    expect(arrayMove(arr, 0, -1)).toBe(arr)
    expect(arrayMove(arr, 0, 5)).toBe(arr)
    expect(arrayMove(arr, 5, 0)).toBe(arr)
  })

  it('does not mutate input', () => {
    const arr = ['a', 'b', 'c']
    const next = arrayMove(arr, 0, 2)
    expect(arr).toEqual(['a', 'b', 'c'])
    expect(next).toEqual(['b', 'c', 'a'])
  })
})

describe('dragSortUtils / resolveRowKey (P1)', () => {
  it('string rowKey resolves the property', () => {
    expect(resolveRowKey('id', { id: 'x' }, 0)).toBe('x')
  })

  it('string rowKey falls back to index when property missing/null', () => {
    expect(resolveRowKey('id', {}, 2)).toBe(2)
    expect(resolveRowKey('id', { id: null } as unknown as { id: string }, 2)).toBe(2)
  })

  it('function rowKey calls the function', () => {
    const fn = (record: { id: number }) => record.id
    expect(resolveRowKey(fn, { id: 7 }, 0)).toBe(7)
  })

  it('function rowKey returning string yields string key', () => {
    const fn = (record: { name: string }) => record.name
    expect(resolveRowKey(fn, { name: 'alice' }, 0)).toBe('alice')
  })

  it('returns undefined on thrown error (defensive)', () => {
    const fn = (): string => {
      throw new Error('boom')
    }
    expect(resolveRowKey(fn as () => string, {}, 0)).toBeUndefined()
  })
})

describe('dragSortUtils / sameRowKey (P1)', () => {
  it('string equality', () => {
    expect(sameRowKey('a', 'a')).toBe(true)
    expect(sameRowKey('a', 'b')).toBe(false)
  })

  it('number equality', () => {
    expect(sameRowKey(1, 1)).toBe(true)
    expect(sameRowKey(1, 2)).toBe(false)
  })

  it('cross type normalized via String()', () => {
    // '1' 与 1 应判等（防 string/number 混用误判）。
    expect(sameRowKey('1', 1)).toBe(true)
    expect(sameRowKey(1, '1')).toBe(true)
  })
})

describe('dragSortUtils / hit-test helpers', () => {
  it('computes insertion target from sorted or unsorted axis bounds', () => {
    const bounds = [
      { index: 2, start: 40, end: 60 },
      { index: 0, start: 0, end: 20 },
      { index: 1, start: 20, end: 40 },
    ]

    expect(computeDragInsertionTarget(5, bounds, 10)).toEqual({
      overIndex: 0,
      indicatorOffset: -10,
    })
    expect(computeDragInsertionTarget(35, bounds, 10)).toEqual({
      overIndex: 2,
      indicatorOffset: 30,
    })
    expect(computeDragInsertionTarget(80, bounds, 10)).toEqual({
      overIndex: 3,
      indicatorOffset: 50,
    })
  })

  it('returns null when no bounds are available', () => {
    expect(computeDragInsertionTarget(0, [], 0)).toBeNull()
  })

  it('converts insertion position to arrayMove target index', () => {
    expect(insertionIndexToMoveIndex(5, 2)).toBe(4)
    expect(insertionIndexToMoveIndex(1, 2)).toBe(1)
    expect(insertionIndexToMoveIndex(2, 2)).toBe(2)
  })

  it('computes row yield ranges and movement direction', () => {
    expect(computeRowYieldRange(1, 4)).toEqual({ lo: 2, hi: 4, sign: -1 })
    expect(computeRowYieldRange(4, 1)).toEqual({ lo: 1, hi: 3, sign: 1 })
    expect(computeRowYieldRange(2, 2)).toEqual({ lo: 1, hi: 0, sign: 1 })
  })
})

describe('dragSortUtils / overlay DOM (P1, jsdom)', () => {
  // jsdom getBoundingClientRect 全 0，故 createRowDragOverlay 因 width/height<=0 返回 null；
  // 仅测 update/remove 的命令式语义。
  it('createRowDragOverlay returns null when no matching rows', () => {
    const container = document.createElement('div')
    expect(createRowDragOverlay(container, 5)).toBeNull()
  })

  it('appends row overlay to the container when it is the dg wrapper', () => {
    const container = document.createElement('div')
    container.className = 'dg-wrapper'
    const cell = document.createElement('div')
    cell.className = 'dg-cell'
    cell.setAttribute('data-row-index', '0')
    vi.spyOn(cell, 'getBoundingClientRect').mockReturnValue({
      left: 10,
      right: 110,
      top: 20,
      bottom: 50,
      width: 100,
      height: 30,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    } as DOMRect)
    container.append(cell)

    const overlay = createRowDragOverlay(container, 0)

    expect(overlay?.parentElement).toBe(container)
    removeRowDragOverlay(overlay)
  })

  it('updateRowDragOverlay sets transform; removeRowDragOverlay removes', () => {
    const overlay = document.createElement('div')
    updateRowDragOverlay(overlay, 42)
    expect(overlay.style.transform).toContain('42')
    updateRowDragOverlay(null, 0) // no throw
    removeRowDragOverlay(overlay)
    expect(overlay.parentNode).toBeNull()
    removeRowDragOverlay(null) // no throw
  })
})
