import { describe, expect, it } from 'vitest'
import { resolveHeaderContentOffset } from '../headerHeightUtils'

describe('resolveHeaderContentOffset', () => {
  it('returns 0 when showHeader is false regardless of maxDepth / headerHeight', () => {
    expect(resolveHeaderContentOffset(false, 3, 40)).toBe(0)
    expect(resolveHeaderContentOffset(false, 0, undefined)).toBe(0)
    expect(resolveHeaderContentOffset(false, 5, '40px')).toBe(0)
  })

  it('falls back to 40 when headerHeight is undefined', () => {
    expect(resolveHeaderContentOffset(true, 1, undefined)).toBe(40)
  })

  it('uses numeric headerHeight directly multiplied by maxDepth', () => {
    expect(resolveHeaderContentOffset(true, 3, 40)).toBe(120)
    expect(resolveHeaderContentOffset(true, 0, 40)).toBe(0)
  })

  it('parses "NNpx" string with parseFloat', () => {
    expect(resolveHeaderContentOffset(true, 2, '40px')).toBe(80)
    expect(resolveHeaderContentOffset(true, 2, '4.5px')).toBe(9)
  })

  it('trims whitespace before matching the px regex', () => {
    expect(resolveHeaderContentOffset(true, 2, ' 40px ')).toBe(80)
  })

  it('falls back to 40 for non-px strings (regex does not match)', () => {
    expect(resolveHeaderContentOffset(true, 1, '40')).toBe(40)
    expect(resolveHeaderContentOffset(true, 2, 'auto')).toBe(80)
  })
})
