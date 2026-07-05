import { describe, expect, it } from 'vitest'
import {
  clampScrollLeft,
  computeStickyMaxScroll,
  scrollLeftValue,
} from '../gridScrollUtils'

describe('gridScrollUtils', () => {
  it('normalizes scrollLeft values', () => {
    expect(scrollLeftValue(24)).toBe(24)
    expect(scrollLeftValue(undefined)).toBe(0)
    expect(scrollLeftValue(Number.NaN)).toBe(0)
  })

  it('clamps scrollLeft to the available range', () => {
    expect(clampScrollLeft(40, 100)).toBe(40)
    expect(clampScrollLeft(-10, 100)).toBe(0)
    expect(clampScrollLeft(140, 100)).toBe(100)
    expect(clampScrollLeft(40, -1)).toBe(0)
    expect(clampScrollLeft(Number.POSITIVE_INFINITY, 100)).toBe(0)
  })

  it('computes sticky max scroll from viewport and grid dimensions', () => {
    expect(computeStickyMaxScroll(120, 300, 0)).toBe(180)
    expect(computeStickyMaxScroll(120, 0, 260)).toBe(140)
    expect(computeStickyMaxScroll(300, 120, 0)).toBe(0)
    expect(computeStickyMaxScroll(0, 120, 80)).toBe(120)
  })
})
