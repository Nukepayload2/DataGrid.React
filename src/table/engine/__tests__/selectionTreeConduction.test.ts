import { describe, expect, it } from 'vitest'
import type { Key } from 'react'
import {
  SELECTION_ALL,
  SELECTION_INVERT,
  SELECTION_NONE,
  collectAncestors,
  collectDescendants,
  conductTreeCheck,
  resolveKey,
} from '../selectionTreeConduction'

describe('selectionTreeConduction / sentinels', () => {
  it('SELECTION_ALL has key "all"', () => {
    expect(SELECTION_ALL.key).toBe('all')
  })

  it('SELECTION_NONE has key "none"', () => {
    expect(SELECTION_NONE.key).toBe('none')
  })

  it('SELECTION_INVERT has key "invert"', () => {
    expect(SELECTION_INVERT.key).toBe('invert')
  })

  it('sentinels implement onSelect as a no-op function', () => {
    expect(typeof SELECTION_ALL.onSelect).toBe('function')
    expect(typeof SELECTION_NONE.onSelect).toBe('function')
    expect(typeof SELECTION_INVERT.onSelect).toBe('function')
    expect(() => SELECTION_ALL.onSelect?.([])).not.toThrow()
  })

  it('sentinels have text content', () => {
    expect(SELECTION_ALL.text).toBeTruthy()
    expect(SELECTION_NONE.text).toBeTruthy()
    expect(SELECTION_INVERT.text).toBeTruthy()
  })

  it('sentinels are distinct objects (reference equality for re-export chain)', () => {
    expect(SELECTION_ALL).not.toBe(SELECTION_NONE)
    expect(SELECTION_ALL).not.toBe(SELECTION_INVERT)
    expect(SELECTION_NONE).not.toBe(SELECTION_INVERT)
  })
})

describe('selectionTreeConduction / resolveKey', () => {
  it('resolves by function rowKey', () => {
    expect(resolveKey({ a: 1 }, (r: any) => r.a)).toBe(1)
  })

  it('resolves by string rowKey', () => {
    expect(resolveKey({ id: 'x' }, 'id')).toBe('x')
  })

  it('returns empty string for missing property', () => {
    expect(resolveKey({}, 'missing')).toBe('')
  })

  it('handles function returning number', () => {
    expect(resolveKey({}, () => 42)).toBe(42)
  })
})

describe('selectionTreeConduction / collectDescendants', () => {
  it('returns empty for a leaf key', () => {
    const m = new Map<Key, Array<Key>>([['root', ['a', 'b']]])
    expect(collectDescendants('a', m)).toEqual([])
  })

  it('collects direct children only', () => {
    const m = new Map<Key, Array<Key>>([['root', ['a', 'b']]])
    expect(collectDescendants('root', m).sort()).toEqual(['a', 'b'])
  })

  it('recursively collects all descendants across depths', () => {
    const m = new Map<Key, Array<Key>>([
      ['root', ['c1', 'c2']],
      ['c1', ['gc1', 'gc2']],
      ['gc1', ['ggc1']],
    ])
    const out = collectDescendants('root', m).sort()
    expect(out).toEqual(['c1', 'c2', 'gc1', 'gc2', 'ggc1'])
  })

  it('returns empty for key not in map', () => {
    const m = new Map<Key, Array<Key>>([['root', ['a']]])
    expect(collectDescendants('missing', m)).toEqual([])
  })
})

describe('selectionTreeConduction / collectAncestors', () => {
  it('returns empty for root', () => {
    const m = new Map<Key, Array<Key>>([['root', ['a']]])
    expect(collectAncestors('root', m)).toEqual([])
  })

  it('collects parent chain from leaf to root (bottom-up order)', () => {
    const m = new Map<Key, Array<Key>>([
      ['root', ['mid']],
      ['mid', ['leaf']],
    ])
    // leaf → mid → root
    expect(collectAncestors('leaf', m)).toEqual(['mid', 'root'])
  })

  it('handles forest (multiple roots)', () => {
    const m = new Map<Key, Array<Key>>([
      ['r1', ['a']],
      ['r2', ['b']],
    ])
    expect(collectAncestors('a', m)).toEqual(['r1'])
    expect(collectAncestors('b', m)).toEqual(['r2'])
  })

  it('returns empty for unknown key', () => {
    const m = new Map<Key, Array<Key>>([['root', ['a']]])
    expect(collectAncestors('ghost', m)).toEqual([])
  })
})

describe('selectionTreeConduction / conductTreeCheck', () => {
  /**
   * Sample tree:
   *        root
   *       /    \
   *     c1     c2
   *    /  \   /
   *   l1  l2 l3
   */
  function sampleTree(): Map<Key, Array<Key>> {
    return new Map<Key, Array<Key>>([
      ['root', ['c1', 'c2']],
      ['c1', ['l1', 'l2']],
      ['c2', ['l3']],
    ])
  }

  it('parent selected → all descendants filled in checkedKeys', () => {
    const r = conductTreeCheck(['root'], sampleTree())
    expect(r.checkedKeys.has('root')).toBe(true)
    expect(r.checkedKeys.has('c1')).toBe(true)
    expect(r.checkedKeys.has('c2')).toBe(true)
    expect(r.checkedKeys.has('l1')).toBe(true)
    expect(r.checkedKeys.has('l2')).toBe(true)
    expect(r.checkedKeys.has('l3')).toBe(true)
    // All fully selected → no half-checked.
    expect(r.halfCheckedKeys.size).toBe(0)
  })

  it('all children selected → parent auto-filled in checkedKeys', () => {
    // Select all leaves of c1 (l1, l2) → c1 auto-completed.
    const r = conductTreeCheck(['l1', 'l2'], sampleTree())
    expect(r.checkedKeys.has('c1')).toBe(true)
    expect(r.checkedKeys.has('root')).toBe(false) // c2 not all selected
    expect(r.halfCheckedKeys.has('root')).toBe(true) // root is half-checked (c1 done, c2 not)
  })

  it('partial children selected → parent half-checked, not checked', () => {
    const r = conductTreeCheck(['l1'], sampleTree()) // only l1 of c1's children
    expect(r.checkedKeys.has('c1')).toBe(false)
    expect(r.halfCheckedKeys.has('c1')).toBe(true)
    // Documented behavior: half-checked does NOT propagate upward as half-checked.
    // root's children (c1, c2) — neither is in `checked` (c1 is only half-checked),
    // so root has selectedCount=0 → neither checked nor half-checked.
    expect(r.checkedKeys.has('root')).toBe(false)
    expect(r.halfCheckedKeys.has('root')).toBe(false)
  })

  it('convergence loop terminates (multi-level fill-up)', () => {
    // Select all leaves under root → c1+c2 complete → root complete.
    const r = conductTreeCheck(['l1', 'l2', 'l3'], sampleTree())
    expect(r.checkedKeys.has('c1')).toBe(true)
    expect(r.checkedKeys.has('c2')).toBe(true)
    expect(r.checkedKeys.has('root')).toBe(true)
    expect(r.halfCheckedKeys.size).toBe(0)
  })

  it('removes halfChecked entries that became fully checked', () => {
    // After fill-up, parent should not be in halfCheckedKeys.
    const r = conductTreeCheck(['l1', 'l2', 'l3'], sampleTree())
    expect(r.halfCheckedKeys.has('root')).toBe(false)
    expect(r.halfCheckedKeys.has('c1')).toBe(false)
    expect(r.halfCheckedKeys.has('c2')).toBe(false)
  })

  it('empty inputKeys → empty result', () => {
    const r = conductTreeCheck([], sampleTree())
    expect(r.checkedKeys.size).toBe(0)
    expect(r.halfCheckedKeys.size).toBe(0)
  })

  it('empty tree (empty map) → returns input as checked', () => {
    const r = conductTreeCheck(['a', 'b'], new Map())
    expect(r.checkedKeys.has('a')).toBe(true)
    expect(r.checkedKeys.has('b')).toBe(true)
    expect(r.halfCheckedKeys.size).toBe(0)
  })

  it('single-node tree (parent with no children in map)', () => {
    const m = new Map<Key, Array<Key>>([['root', []]])
    const r = conductTreeCheck([], m)
    // No children to count → 0===0 (children.length===0) → root gets "all selected" → checked.
    // Edge case; document current behavior.
    expect(r.checkedKeys.has('root')).toBe(true)
  })

  it('sibling subtree partial selection: only the partial parent is half-checked', () => {
    // Select l1 (c1 partial), l3 (c2 complete).
    const r = conductTreeCheck(['l1', 'l3'], sampleTree())
    expect(r.checkedKeys.has('c2')).toBe(true) // c2 fully selected via l3
    expect(r.halfCheckedKeys.has('c1')).toBe(true) // c1 partial (l1 only)
    // root: c1 partial + c2 complete → still partial.
    expect(r.halfCheckedKeys.has('root')).toBe(true)
    expect(r.checkedKeys.has('root')).toBe(false)
  })

  it('checkStrictly mode (no tree) — calling without map is no-op fill', () => {
    // With empty map, conductTreeCheck just returns input as checked (no conduction).
    const r = conductTreeCheck(['x', 'y'], new Map())
    expect(Array.from(r.checkedKeys).sort()).toEqual(['x', 'y'])
  })
})
