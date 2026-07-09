import { describe, expect, it } from 'vitest'
import type { EngineLeafColumn } from '../../../../src/table/engine/types'
import { computeTreeFirstDataColumnIdx } from '../../../../src/table/engine/treeColumnUtils'

const leaf = (dataIndex?: unknown) => ({ dataIndex }) as unknown as EngineLeafColumn

describe('computeTreeFirstDataColumnIdx', () => {
  it('returns -1 when treeEnabled is false regardless of leafColumns', () => {
    expect(computeTreeFirstDataColumnIdx(false, [])).toBe(-1)
    expect(computeTreeFirstDataColumnIdx(false, [leaf('name')])).toBe(-1)
    expect(computeTreeFirstDataColumnIdx(false, [leaf(undefined), leaf('age')])).toBe(-1)
  })

  it('returns 0 when treeEnabled and the first column already has a dataIndex', () => {
    expect(computeTreeFirstDataColumnIdx(true, [leaf('name')])).toBe(0)
    expect(computeTreeFirstDataColumnIdx(true, [leaf('name'), leaf('age')])).toBe(0)
  })

  it('returns the index N of the first data column when preceded by N sentinel columns', () => {
    expect(computeTreeFirstDataColumnIdx(true, [leaf(undefined), leaf('name')])).toBe(1)
    expect(
      computeTreeFirstDataColumnIdx(true, [leaf(undefined), leaf(undefined), leaf('name')]),
    ).toBe(2)
    expect(
      computeTreeFirstDataColumnIdx(
        true,
        [leaf(undefined), leaf(undefined), leaf(undefined), leaf(undefined), leaf('name')],
      ),
    ).toBe(4)
  })

  it('falls back to 0 when treeEnabled and no column has a dataIndex', () => {
    expect(computeTreeFirstDataColumnIdx(true, [leaf(undefined)])).toBe(0)
    expect(computeTreeFirstDataColumnIdx(true, [leaf(undefined), leaf(undefined)])).toBe(0)
  })

  it('falls back to 0 when treeEnabled and leafColumns is empty', () => {
    expect(computeTreeFirstDataColumnIdx(true, [])).toBe(0)
  })

  it('treats dataIndex: 0 (a legal falsy numeric value) as a valid data column', () => {
    // Regression guard: the predicate is `!== undefined`, NOT truthy.
    expect(computeTreeFirstDataColumnIdx(true, [leaf(0)])).toBe(0)
    expect(computeTreeFirstDataColumnIdx(true, [leaf(undefined), leaf(0)])).toBe(1)
    expect(
      computeTreeFirstDataColumnIdx(true, [leaf(undefined), leaf(undefined), leaf(0)]),
    ).toBe(2)
  })
})
