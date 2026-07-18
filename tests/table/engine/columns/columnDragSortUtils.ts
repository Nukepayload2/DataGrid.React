import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  arrayMoveColumns,
  arrayMoveColumnsRespectLocks,
  createColumnDragOverlay,
  findColumnCells,
  getColumnKey,
  getTranslateXFromComputedTransform,
  getUntransformedRect,
  isColumnDragLocked,
  isColumnLocked,
  removeColumnDragOverlay,
  updateColumnDragOverlay,
} from '../../../../src/table/engine/columnDragSortUtils'

// 列定义工厂（gridColumnOptions.dragColumnLock 模拟）。
function col(key: string, lock?: 'lockPosition' | 'lockDrag') {
  return { key, gridColumnOptions: lock ? { dragColumnLock: lock } : undefined }
}

describe('columnDragSortUtils / arrayMoveColumnsRespectLocks (P0)', () => {
  it('no-op when from === to', () => {
    const arr = [col('a'), col('b'), col('c')]
    expect(arrayMoveColumnsRespectLocks(arr, 1, 1)).toBe(arr)
  })

  it('no-op when fromIndex out of range', () => {
    const arr = [col('a'), col('b')]
    expect(arrayMoveColumnsRespectLocks(arr, -1, 0)).toBe(arr)
    expect(arrayMoveColumnsRespectLocks(arr, 5, 0)).toBe(arr)
  })

  it('degrades to plain arrayMove when no locked columns', () => {
    const arr = [col('a'), col('b'), col('c'), col('d')]
    const next = arrayMoveColumnsRespectLocks(arr, 1, 2)
    expect(next.map((c) => c.key)).toEqual(['a', 'c', 'b', 'd'])
  })

  it('returns original when fromIndex itself is locked (defensive)', () => {
    const arr = [col('a'), col('b', 'lockPosition'), col('c')]
    expect(arrayMoveColumnsRespectLocks(arr, 1, 0)).toBe(arr)
  })

  it('dragging right past a lockPosition column places column after the lock', () => {
    // [a, LOCK(b), c, d] — drag a (index 0) to index 2 (落在锁定列 b 上，向右拖)
    // 算法：movableIdxs=[0,2,3]；fromMovable=0；toIndex=2 落在锁定列 b(index1) 上，
    //   fromIndex(0)<toIndex(2) 向右拖 → 找 movableIdxs 中 >2 的第一个 = index 2 (value 2→c)。
    //   toMovable=1（可动列序号，对应原 index 2=c）。
    //   nextMovableIdxs = arrayMoveColumns([0,2,3], 0, 1) = [2,0,3]（即 c,a,d 的原 index）。
    //   填回：index0=c, index1=b(lock原位), index2=a, index3=d → [c,b,a,d]。
    const arr = [col('a'), col('b', 'lockPosition'), col('c'), col('d')]
    const next = arrayMoveColumnsRespectLocks(arr, 0, 2)
    expect(next.map((c) => c.key)).toEqual(['c', 'b', 'a', 'd'])
    // 锁定列 b 仍在原 index 1。
    expect(next[1].key).toBe('b')
    expect((next[1] as { gridColumnOptions?: { dragColumnLock?: string } }).gridColumnOptions?.dragColumnLock).toBe('lockPosition')
  })

  it('dragging left past a lockPosition column places column before the lock', () => {
    // [a, LOCK(b), c, d] — drag d (index 3) to index 1 (落在锁定列 b 上，向左拖)
    const arr = [col('a'), col('b', 'lockPosition'), col('c'), col('d')]
    const next = arrayMoveColumnsRespectLocks(arr, 3, 1)
    // movableIdxs=[0,2,3]；fromMovable=2；toIndex=1 落在锁定列 b 上，
    //   fromIndex(3)>toIndex(1) 向左拖 → 找 movableIdxs 中 <1 的最后一个 = index 0 (value 0→a)。
    //   toMovable=0。
    //   nextMovableIdxs = arrayMoveColumns([0,2,3], 2, 0) = [3,0,2]（即 d,a,c 的原 index）。
    //   填回：index0=d, index1=b(lock), index2=a, index3=c → [d,b,a,c]。
    expect(next.map((c) => c.key)).toEqual(['d', 'b', 'a', 'c'])
    expect(next[1].key).toBe('b')
  })

  it('toIndex on lockPosition but direct movable target reachable respects movable subseq', () => {
    // [a, b, LOCK(c), d] — drag a (0) to index 2 (落在锁定列 c 上，向右拖)
    // movableIdxs=[0,1,3]；fromMovable=0；toIndex=2 落在 c 上；
    //   fromIndex(0)<toIndex(2) 向右拖 → 找 >2 的第一个 = index 2 (value 3→d)。
    //   toMovable=2。
    //   nextMovableIdxs = arrayMoveColumns([0,1,3], 0, 2) = [1,3,0]（即 b,d,a 原index）。
    //   填回：index0=b, index1=d, index2=c(lock), index3=a → [b,d,c,a]。
    const arr = [col('a'), col('b'), col('c', 'lockPosition'), col('d')]
    const next = arrayMoveColumnsRespectLocks(arr, 0, 2)
    expect(next.map((c) => c.key)).toEqual(['b', 'd', 'c', 'a'])
    expect(next[2].key).toBe('c')
  })

  it('mixed locks: multiple lockPosition columns preserved at their indices', () => {
    // [LOCK(a), b, LOCK(c), d, e] — drag e (4) to index 1 (落在 b 上，可动列；向左拖)
    // 无锁时退化为 arrayMove？不——有锁。movableIdxs=[1,3,4]；fromMovable=2；
    //   toIndex=1 是可动列（movableIdxs.indexOf(1)=0）→ toMovable=0。
    //   nextMovableIdxs = arrayMoveColumns([1,3,4], 2, 0) = [4,1,3]（即 e,b,d 原index）。
    //   填回：index0=a(lock), index1=e, index2=c(lock), index3=b, index4=d → [a,e,c,b,d]。
    const arr = [col('a', 'lockPosition'), col('b'), col('c', 'lockPosition'), col('d'), col('e')]
    const next = arrayMoveColumnsRespectLocks(arr, 4, 1)
    expect(next.map((c) => c.key)).toEqual(['a', 'e', 'c', 'b', 'd'])
    expect(next[0].key).toBe('a')
    expect(next[2].key).toBe('c')
  })

  it('toIndex at end (arr.length) maps to last movable index', () => {
    // [a, LOCK(b), c] — drag a (0) to index 3 (arr.length, 末尾之后)
    // movableIdxs=[0,2]；fromMovable=0；toIndex===arr.length(3) → toMovable=1。
    // nextMovableIdxs = arrayMoveColumns([0,2], 0, 1) = [2,0] → c,a。
    // 填回：index0=c, index1=b(lock), index2=a → [c,b,a]。
    const arr = [col('a'), col('b', 'lockPosition'), col('c')]
    const next = arrayMoveColumnsRespectLocks(arr, 0, 3)
    expect(next.map((c) => c.key)).toEqual(['c', 'b', 'a'])
  })

  it('returns original when dragging left past lock but no movable column before it', () => {
    // [LOCK(a), b, c] — drag b (1) to index 0 (落在锁定列 a 上，向左拖)
    // movableIdxs=[1,2]；fromMovable=0；toIndex=0 落在 a 上；
    //   fromIndex(1)>toIndex(0) 向左拖 → 找 movableIdxs 中 <0 的最后一个 → 无 → toMovable=-1 → 返回原。
    const arr = [col('a', 'lockPosition'), col('b'), col('c')]
    expect(arrayMoveColumnsRespectLocks(arr, 1, 0)).toBe(arr)
  })
})

describe('columnDragSortUtils / arrayMoveColumns (P1)', () => {
  it('moves element from->to', () => {
    expect(arrayMoveColumns(['a', 'b', 'c', 'd'], 1, 2)).toEqual(['a', 'c', 'b', 'd'])
    expect(arrayMoveColumns(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c'])
  })

  it('returns original on no-op / out of range', () => {
    const arr = ['a', 'b']
    expect(arrayMoveColumns(arr, 0, 0)).toBe(arr)
    expect(arrayMoveColumns(arr, -1, 0)).toBe(arr)
    expect(arrayMoveColumns(arr, 0, 5)).toBe(arr)
    expect(arrayMoveColumns(arr, 5, 0)).toBe(arr)
  })

  it('does not mutate input', () => {
    const arr = ['a', 'b', 'c']
    const next = arrayMoveColumns(arr, 0, 2)
    expect(arr).toEqual(['a', 'b', 'c'])
    expect(next).toEqual(['b', 'c', 'a'])
  })
})

describe('columnDragSortUtils / lock predicates & getColumnKey (P1)', () => {
  it('isColumnLocked detects lockPosition only', () => {
    expect(isColumnLocked(col('a', 'lockPosition'))).toBe(true)
    expect(isColumnLocked(col('a', 'lockDrag'))).toBe(false)
    expect(isColumnLocked(col('a'))).toBe(false)
    expect(isColumnLocked({ key: 'a' })).toBe(false) // 无 gridColumnOptions 字段
  })

  it('isColumnDragLocked detects lockDrag or lockPosition', () => {
    expect(isColumnDragLocked(col('a', 'lockPosition'))).toBe(true)
    expect(isColumnDragLocked(col('a', 'lockDrag'))).toBe(true)
    expect(isColumnDragLocked(col('a'))).toBe(false)
  })

  it('getColumnKey returns stringified key, null when absent', () => {
    expect(getColumnKey([{ key: 'x' }, { key: 7 }], 1)).toBe('7')
    expect(getColumnKey([{ key: 'x' }], 0)).toBe('x')
    expect(getColumnKey([{ foo: 'bar' } as unknown as { key?: React.Key }], 0)).toBeNull()
    expect(getColumnKey([{ key: null } as unknown as { key?: React.Key }], 0)).toBeNull()
    expect(getColumnKey([], 0)).toBeNull()
  })
})

describe('columnDragSortUtils / transform matrix parsing (P1)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('getTranslateXFromComputedTransform handles none / matrix / matrix3d', () => {
    const el = document.createElement('div')
    const spy = vi.spyOn(window, 'getComputedStyle')
    spy.mockReturnValue({ transform: 'none' } as CSSStyleDeclaration)
    expect(getTranslateXFromComputedTransform(el)).toBe(0)

    spy.mockReturnValue({ transform: 'matrix(1, 0, 0, 1, 42, 0)' } as CSSStyleDeclaration)
    expect(getTranslateXFromComputedTransform(el)).toBe(42)

    spy.mockReturnValue({ transform: 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,99,0,0,1)' } as CSSStyleDeclaration)
    expect(getTranslateXFromComputedTransform(el)).toBe(99)

    spy.mockReturnValue({ transform: 'unknown(...)' } as CSSStyleDeclaration)
    expect(getTranslateXFromComputedTransform(el)).toBe(0)
  })

  it('getUntransformedRect subtracts translateX from rect.left', () => {
    const el = document.createElement('div')
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      width: 50,
      right: 150,
      top: 0,
      bottom: 0,
      height: 0,
      x: 100,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect)
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      transform: 'matrix(1, 0, 0, 1, 30, 0)',
    } as CSSStyleDeclaration)
    expect(getUntransformedRect(el)).toEqual({ left: 70, width: 50 })
  })
})

describe('columnDragSortUtils / overlay DOM (P1, jsdom)', () => {
  // jsdom 不渲染 layout（getBoundingClientRect 全 0），故 overlay 创建会因 width/height<=0 返回 null；
  // 这里仅测 DOM 查询辅助（findColumnCells）+ update/remove overlay 的命令式语义。
  it('findColumnCells collects by data-leaf-index and data-column-key', () => {
    const container = document.createElement('div')
    const cell1 = document.createElement('div')
    cell1.setAttribute('data-leaf-index', '2')
    const cell2 = document.createElement('div')
    cell2.setAttribute('data-column-key', 'k2')
    const other = document.createElement('div')
    other.setAttribute('data-leaf-index', '3')
    container.append(cell1, cell2, other)
    const cells = findColumnCells(container, 2, 'k2')
    expect(cells).toContain(cell1)
    expect(cells).toContain(cell2)
    expect(cells).not.toContain(other)
  })

  it('findColumnCells dedupes', () => {
    const container = document.createElement('div')
    const cell = document.createElement('div')
    cell.setAttribute('data-leaf-index', '0')
    cell.setAttribute('data-column-key', 'k0')
    container.append(cell)
    const cells = findColumnCells(container, 0, 'k0')
    expect(cells).toHaveLength(1)
  })

  it('createColumnDragOverlay returns null when no matching cells', () => {
    const container = document.createElement('div')
    expect(createColumnDragOverlay(container, 5, null)).toBeNull()
  })

  it('appends column overlay to the container when it is the dg wrapper', () => {
    const container = document.createElement('div')
    container.className = 'dg-wrapper'
    const cell = document.createElement('div')
    cell.className = 'dg-cell'
    cell.setAttribute('data-leaf-index', '0')
    vi.spyOn(cell, 'getBoundingClientRect').mockReturnValue({
      left: 10,
      right: 110,
      top: 20,
      bottom: 80,
      width: 100,
      height: 60,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    } as DOMRect)
    container.append(cell)

    const overlay = createColumnDragOverlay(container, 0, null)

    expect(overlay?.parentElement).toBe(container)
    removeColumnDragOverlay(overlay)
  })

  it('updateColumnDragOverlay sets transform; removeColumnDragOverlay removes', () => {
    const overlay = document.createElement('div')
    updateColumnDragOverlay(overlay, 42)
    expect(overlay.style.transform).toContain('42')
    updateColumnDragOverlay(null, 0) // no throw
    removeColumnDragOverlay(overlay)
    expect(overlay.parentNode).toBeNull()
    removeColumnDragOverlay(null) // no throw
  })
})
