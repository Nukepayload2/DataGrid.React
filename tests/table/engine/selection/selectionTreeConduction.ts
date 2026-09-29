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
} from '../../../../src/table/engine/selectionTreeConduction'

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

  it('partial children selected → parent half-checked, and half-checked cascades upward', () => {
    const r = conductTreeCheck(['l1'], sampleTree()) // only l1 of c1's children
    expect(r.checkedKeys.has('c1')).toBe(false)
    expect(r.halfCheckedKeys.has('c1')).toBe(true)
    // 半选**必须**向上级联：c1 是 half（非 checked），root 的两个判据都要看得到它。
    // 对齐 rc-tree `fillConductCheck`（`checked || halfCheckedKeys.has(key)`），实测
    // （@rc-component/tree@1.3.2 conductCheck 同输入）half = [c1, root]。
    // 旧版这里只数子行的 checked ⇒ root 既不进 checked 也不进 half（缺陷 F-1，已修）。
    expect(r.checkedKeys.has('root')).toBe(false)
    expect(r.halfCheckedKeys.has('root')).toBe(true)
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

  it('single-node tree (parent with empty children in map) → parent takes part in no judgement', () => {
    const m = new Map<Key, Array<Key>>([['root', []]])
    const r = conductTreeCheck([], m)
    // `children: []` 与「子行全 disabled」在参照里是同一件事：没有任何子实体去判这个父行
    // ⇒ 既不判选中也不判半选。旧版走 `0 === 0` → 把父行错标成 checked（缺陷 F-2，已修）。
    // 生产可达：useTreeData.ts:183-188 在父行的 children 非空但每个子行 rowKey 都不可解析时
    // 就登记 `[]`（探针 R5 实测：改前该父行显示为已勾选）。
    expect(r.checkedKeys.has('root')).toBe(false)
    expect(r.halfCheckedKeys.has('root')).toBe(false)
    // 显式传进来的 key 不受影响（参照的 checkedKeys 直接以输入初始化）。
    const explicit = conductTreeCheck(['root'], m)
    expect(explicit.checkedKeys.has('root')).toBe(true)
    expect(explicit.halfCheckedKeys.size).toBe(0)
  })

  it('empty-children entry mixed with a real sibling does not pollute the parent', () => {
    // root 的子 = { mid（其子 x 被勾选）, empty（children: []）}
    const m = new Map<Key, Array<Key>>([
      ['root', ['mid', 'empty']],
      ['mid', ['x']],
      ['empty', []],
    ])
    const r = conductTreeCheck(['x'], m)
    // 参照实测（rc-tree conductCheck 同形状）：checked=[mid,x]、half=[root]。
    // 改前：`empty` 被 0===0 判成全选 ⇒ root 的两个子行"都选中" → root 反被错判成 checked。
    expect(Array.from(r.checkedKeys).sort()).toEqual(['mid', 'x'])
    expect(Array.from(r.halfCheckedKeys)).toEqual(['root'])
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

  // ==== BAT-16：halfChecked 向上级联（F-1）与「无可判定子行」（F-2）的补充面 ====

  it('four-level chain: half-checked cascades to the top level', () => {
    // a > b > c > [d1, d2]
    const m = new Map<Key, Array<Key>>([
      ['a', ['b']],
      ['b', ['c']],
      ['c', ['d1', 'd2']],
    ])
    const r = conductTreeCheck(['d1'], m)
    // 参照实测：checked=[d1]、half=[a,b,c]（每一层都靠"子行 half"这条判据拿到半选）。
    expect(Array.from(r.checkedKeys)).toEqual(['d1'])
    expect(Array.from(r.halfCheckedKeys).sort()).toEqual(['a', 'b', 'c'])
    // 补齐 d2 后：c→b→a 逐层升为 checked，且不留 half（清理步与参照 removeFromCheckedKeys 同义）。
    const full = conductTreeCheck(['d1', 'd2'], m)
    expect(Array.from(full.checkedKeys).sort()).toEqual(['a', 'b', 'c', 'd1', 'd2'])
    expect(full.halfCheckedKeys.size).toBe(0)
  })

  it('a half-only sibling must not promote the parent to checked', () => {
    // root 的子 = { mid（只勾了 leaf1 ⇒ half）, x（checked）}——「子行 = 半选 + 全选」混排。
    const m = new Map<Key, Array<Key>>([
      ['root', ['mid', 'x']],
      ['mid', ['leaf1', 'leaf2']],
    ])
    const r = conductTreeCheck(['leaf1', 'x'], m)
    // 参照实测：checked=[leaf1,x]、half=[mid,root]。half-only 的子行必须同时打掉 allChecked，
    // 否则 root 会被判成"全选"（这是把 `else allChecked = false` 原样留下的写法会犯的错）。
    expect(Array.from(r.checkedKeys).sort()).toEqual(['leaf1', 'x'])
    expect(r.checkedKeys.has('root')).toBe(false)
    expect(Array.from(r.halfCheckedKeys).sort()).toEqual(['mid', 'root'])
  })

  it('all children disabled: parent not judged, but its own half-checked ancestor still cascades', () => {
    // root 的子 = { mid（子行 d1/d2 全 disabled）, sib（可选且被勾）}
    const m = new Map<Key, Array<Key>>([
      ['root', ['mid', 'sib']],
      ['mid', ['d1', 'd2']],
    ])
    const dis = (k: Key) => k === 'd1' || k === 'd2'
    const r = conductTreeCheck(['sib'], m, dis)
    // 参照实测：checked=[sib]、half=[root]。mid 因"无可判定子行"不参与判定（不进 checked 也不进 half）。
    expect(Array.from(r.checkedKeys)).toEqual(['sib'])
    expect(r.halfCheckedKeys.has('mid')).toBe(false)
    expect(r.checkedKeys.has('mid')).toBe(false)
    expect(Array.from(r.halfCheckedKeys)).toEqual(['root'])
    // 勾 mid 本身（mid 可选、其子全 disabled）：mid 保留在 checked（输入即选中），子行不被填充。
    const mid = conductTreeCheck(['mid'], m, dis)
    expect(Array.from(mid.checkedKeys).sort()).toEqual(['mid'])
    expect(Array.from(mid.halfCheckedKeys)).toEqual(['root'])
  })

  it('disabled leaf supplied directly does not create any half-checked ancestor', () => {
    const m = new Map<Key, Array<Key>>([
      ['root', ['mid', 'sib']],
      ['mid', ['d1', 'd2']],
    ])
    const dis = (k: Key) => k === 'd1' || k === 'd2'
    const r = conductTreeCheck(['d1'], m, dis)
    // 参照实测：checked=[d1]、half=[]（d1 自身被 disabled ⇒ 不向上级联；mid 不参与判定）。
    expect(Array.from(r.checkedKeys)).toEqual(['d1'])
    expect(r.halfCheckedKeys.size).toBe(0)
  })
})
