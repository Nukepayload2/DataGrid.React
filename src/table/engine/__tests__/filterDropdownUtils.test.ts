import { describe, expect, it } from 'vitest'
import {
  collectLeafValues,
  flattenFilterItems,
  resolveCheckedKeys,
  toReactKey,
  toTreeData,
} from '../filterDropdownUtils'
import type { EngineFilterItem } from '../types'

// EngineFilterItem 工厂：text + value + 可选 children。
function item(
  text: string,
  value: string | number | boolean,
  children?: Array<EngineFilterItem>,
): EngineFilterItem {
  return { text, value, children } as EngineFilterItem
}

describe('filterDropdownUtils / resolveCheckedKeys (P0)', () => {
  it('normalizes plain Key[] array form (checkStrictly=true)', () => {
    expect(resolveCheckedKeys(['a', 'b'])).toEqual(['a', 'b'])
    expect(resolveCheckedKeys([1, 2, 3])).toEqual([1, 2, 3])
  })

  it('normalizes mixed-type array (numbers preserved, others → String)', () => {
    expect(resolveCheckedKeys([1, 'x', 2])).toEqual([1, 'x', 2])
    // bigint/Symbol 等非 number 归一为 String（防 React.Key 异类）。
    expect(resolveCheckedKeys([1n, 'y'])).toEqual(['1', 'y'])
  })

  it('normalizes { checked, halfChecked } object form (checkStrictly=false)', () => {
    expect(resolveCheckedKeys({ checked: ['a', 'b'], halfChecked: ['c'] })).toEqual(['a', 'b'])
    expect(resolveCheckedKeys({ checked: [1, 2], halfChecked: [3] })).toEqual([1, 2])
  })

  it('filters out halfChecked keys (only checked survive)', () => {
    // resolveCheckedKeys 只取 checked；halfChecked 在调用方判定时已隔离。
    const result = resolveCheckedKeys({ checked: ['x'], halfChecked: ['y', 'z'] })
    expect(result).toEqual(['x'])
    expect(result).not.toContain('y')
    expect(result).not.toContain('z')
  })

  it('handles empty checked array in object form', () => {
    expect(resolveCheckedKeys({ checked: [], halfChecked: ['a'] })).toEqual([])
  })

  it('returns [] for null / undefined / non-array', () => {
    expect(resolveCheckedKeys(null)).toEqual([])
    expect(resolveCheckedKeys(undefined)).toEqual([])
    expect(resolveCheckedKeys({})).toEqual([])
    expect(resolveCheckedKeys({ halfChecked: ['a'] })).toEqual([])
    expect(resolveCheckedKeys('not-an-array')).toEqual([])
    expect(resolveCheckedKeys(42)).toEqual([])
  })

  it('handles object form with non-array checked (defensive)', () => {
    expect(resolveCheckedKeys({ checked: 'oops' })).toEqual([])
    expect(resolveCheckedKeys({ checked: null })).toEqual([])
  })
})

describe('filterDropdownUtils / toTreeData (P1)', () => {
  it('converts flat filter list to treeData', () => {
    const filters = [item('A', 'a'), item('B', 'b')]
    const tree = toTreeData(filters)
    expect(tree).toEqual([
      { title: 'A', key: 'a' },
      { title: 'B', key: 'b' },
    ])
  })

  it('recursively converts children', () => {
    const filters = [
      item('Parent', 'p', [item('Child1', 'c1'), item('Child2', 'c2')]),
    ]
    const tree = toTreeData(filters)
    expect(tree).toEqual([
      {
        title: 'Parent',
        key: 'p',
        children: [
          { title: 'Child1', key: 'c1' },
          { title: 'Child2', key: 'c2' },
        ],
      },
    ])
  })

  it('omits children property when children is empty/absent', () => {
    const filters = [item('A', 'a')]
    expect(toTreeData(filters)[0]).not.toHaveProperty('children')
  })

  it('uses toReactKey for key (boolean → string)', () => {
    const filters = [item('Yes', true), item('No', false)]
    const tree = toTreeData(filters)
    expect(tree[0].key).toBe('true')
    expect(tree[1].key).toBe('false')
  })

  it('preserves numeric keys via toReactKey', () => {
    const filters = [item('Count', 7)]
    expect(toTreeData(filters)[0].key).toBe(7)
  })
})

describe('filterDropdownUtils / collectLeafValues (P1)', () => {
  it('collects values from flat list', () => {
    expect(collectLeafValues([item('A', 'a'), item('B', 'b')])).toEqual(['a', 'b'])
  })

  it('collects only leaf values (skips parents)', () => {
    const filters = [
      item('Parent1', 'p1', [item('Child1', 'c1'), item('Child2', 'c2')]),
      item('Parent2', 'p2', [item('Child3', 'c3')]),
    ]
    expect(collectLeafValues(filters)).toEqual(['c1', 'c2', 'c3'])
  })

  it('returns [] for empty filters', () => {
    expect(collectLeafValues([])).toEqual([])
  })

  it('handles deep nesting', () => {
    const filters = [
      item('L1', 'l1', [
        item('L2', 'l2', [item('L3', 'l3')]),
      ]),
    ]
    expect(collectLeafValues(filters)).toEqual(['l3'])
  })

  it('preserves boolean leaf values', () => {
    const filters = [item('Yes', true), item('No', false)]
    expect(collectLeafValues(filters)).toEqual([true, false])
  })
})

describe('filterDropdownUtils / flattenFilterValues (P1)', () => {
  it('flattens flat list (no children)', () => {
    const filters = [item('A', 'a'), item('B', 'b')]
    expect(flattenFilterItems(filters)).toEqual([
      { text: 'A', value: 'a' },
      { text: 'B', value: 'b' },
    ])
  })

  it('flattens nested children into single list', () => {
    const filters = [
      item('A', 'a', [item('A1', 'a1'), item('A2', 'a2')]),
      item('B', 'b'),
    ]
    expect(flattenFilterItems(filters)).toEqual([
      { text: 'A', value: 'a' },
      { text: 'A1', value: 'a1' },
      { text: 'A2', value: 'a2' },
      { text: 'B', value: 'b' },
    ])
  })

  it('strips children from output items', () => {
    const filters = [item('A', 'a', [item('A1', 'a1')])]
    const flat = flattenFilterItems(filters)
    flat.forEach((f) => {
      expect(f.children).toBeUndefined()
    })
  })

  it('returns [] for empty filters', () => {
    expect(flattenFilterItems([])).toEqual([])
  })
})

describe('filterDropdownUtils / toReactKey (P1)', () => {
  it('boolean → String', () => {
    expect(toReactKey(true)).toBe('true')
    expect(toReactKey(false)).toBe('false')
  })

  it('string → string', () => {
    expect(toReactKey('abc')).toBe('abc')
  })

  it('number → number', () => {
    expect(toReactKey(42)).toBe(42)
  })
})
