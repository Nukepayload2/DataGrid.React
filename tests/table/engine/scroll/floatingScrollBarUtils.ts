import { describe, expect, it } from 'vitest'
import {
  EMPTY_FLOATING_SCROLLBAR_GEOMETRY,
  computeFloatingDragScrollOffset,
  computeFloatingScrollbarGeometry,
  computeFloatingThumbOffset,
} from '../../../../src/table/engine/floatingScrollBarUtils'

describe('floatingScrollBarUtils / computeFloatingScrollbarGeometry', () => {
  it('returns empty geometry when content does not overflow', () => {
    expect(
      computeFloatingScrollbarGeometry({
        clientSize: 100,
        scrollSize: 101,
        trackSize: 100,
      }),
    ).toBe(EMPTY_FLOATING_SCROLLBAR_GEOMETRY)
  })

  it('computes thumb size, max scroll, and max thumb offset', () => {
    expect(
      computeFloatingScrollbarGeometry({
        clientSize: 100,
        scrollSize: 400,
        trackSize: 80,
      }),
    ).toEqual({
      clientSize: 100,
      scrollSize: 400,
      trackSize: 80,
      thumbSize: 32,
      maxScroll: 300,
      thumbMaxOffset: 48,
      visible: true,
    })
  })

  it('uses proportional thumb size when larger than the minimum', () => {
    expect(
      computeFloatingScrollbarGeometry({
        clientSize: 200,
        scrollSize: 400,
        trackSize: 200,
      }).thumbSize,
    ).toBe(100)
  })
})

describe('floatingScrollBarUtils / offset conversions', () => {
  const geometry = computeFloatingScrollbarGeometry({
    clientSize: 100,
    scrollSize: 300,
    trackSize: 100,
  })

  it('maps scroll offset to thumb transform offset', () => {
    expect(computeFloatingThumbOffset(100, geometry)).toBeCloseTo(33.333, 3)
  })

  it('maps pointer delta back to scroll offset while dragging', () => {
    expect(computeFloatingDragScrollOffset(20, 10, geometry)).toBeCloseTo(50, 3)
  })

  it('keeps offsets unchanged when geometry cannot move', () => {
    expect(computeFloatingThumbOffset(100, EMPTY_FLOATING_SCROLLBAR_GEOMETRY)).toBe(0)
    expect(
      computeFloatingDragScrollOffset(20, 10, EMPTY_FLOATING_SCROLLBAR_GEOMETRY),
    ).toBe(20)
  })
})
