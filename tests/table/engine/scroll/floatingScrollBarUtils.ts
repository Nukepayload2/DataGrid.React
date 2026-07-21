import { describe, expect, it } from 'vitest'
import {
  EMPTY_FLOATING_SCROLLBAR_GEOMETRY,
  computeFloatingDragScrollOffset,
  computeFloatingScrollbarGeometry,
  computeFloatingThumbOffset,
  computeTrackJump,
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

describe('floatingScrollBarUtils / computeTrackJump', () => {
  // 共用基础参数：thumb 在 [100, 132]（高 32px），currentScroll=200，viewportSize=400，maxScroll=1000。
  const base = {
    currentScroll: 200,
    viewportSize: 400,
    thumbStart: 100,
    thumbEnd: 132,
    maxScroll: 1000,
  }

  it('returns thumb zone with unchanged scroll when clicking on the thumb body', () => {
    expect(
      computeTrackJump({ ...base, clientPos: 110 }),
    ).toEqual({ zone: 'thumb', nextScroll: 200 })
  })

  it('treats the thumb boundary as a hit (closed interval)', () => {
    expect(computeTrackJump({ ...base, clientPos: 100 })).toEqual({
      zone: 'thumb',
      nextScroll: 200,
    })
    expect(computeTrackJump({ ...base, clientPos: 132 })).toEqual({
      zone: 'thumb',
      nextScroll: 200,
    })
  })

  it('jumps one page backward when clicking above the thumb', () => {
    // viewportSize=400 大于 currentScroll=200 → clamp 到 minScroll=0。
    expect(computeTrackJump({ ...base, clientPos: 50 })).toEqual({
      zone: 'before',
      nextScroll: 0,
    })
  })

  it('returns unclamped backward step when within range', () => {
    expect(
      computeTrackJump({ ...base, currentScroll: 800, clientPos: 50 }),
    ).toEqual({ zone: 'before', nextScroll: 400 })
  })

  it('clamps the backward jump to minScroll (default 0)', () => {
    expect(
      computeTrackJump({ ...base, currentScroll: 100, clientPos: 0 }),
    ).toEqual({ zone: 'before', nextScroll: 0 })
  })

  it('respects a custom minScroll', () => {
    expect(
      computeTrackJump({ ...base, currentScroll: 250, clientPos: 0, minScroll: 50 }),
    ).toEqual({ zone: 'before', nextScroll: 50 })
  })

  it('jumps one page forward when clicking below the thumb', () => {
    expect(computeTrackJump({ ...base, clientPos: 400 })).toEqual({
      zone: 'after',
      nextScroll: 600,
    })
  })

  it('clamps the forward jump to maxScroll', () => {
    expect(
      computeTrackJump({ ...base, currentScroll: 800, clientPos: 1000 }),
    ).toEqual({ zone: 'after', nextScroll: 1000 })
  })

  it('handles zero viewport size as a no-op jump (stays at current)', () => {
    // viewportSize=0：before/after 步长为 0 → nextScroll === currentScroll（不前进，但仍按方向归类 zone）。
    expect(
      computeTrackJump({ ...base, viewportSize: 0, clientPos: 0 }),
    ).toEqual({ zone: 'before', nextScroll: 200 })
    expect(
      computeTrackJump({ ...base, viewportSize: 0, clientPos: 1000 }),
    ).toEqual({ zone: 'after', nextScroll: 200 })
  })

  it('clamps when maxScroll is smaller than currentScroll + viewport', () => {
    expect(
      computeTrackJump({
        currentScroll: 950,
        viewportSize: 400,
        clientPos: 1000,
        thumbStart: 100,
        thumbEnd: 132,
        maxScroll: 1000,
      }),
    ).toEqual({ zone: 'after', nextScroll: 1000 })
  })

  it('handles degenerate thumb (start === end) by treating only the exact point as a hit', () => {
    // 退化 thumb（0 高度，理论上 minThumbSize=32 保证不出现，但纯函数须对退化输入稳健）：
    // clientPos === thumbStart === thumbEnd → 'thumb'；否则落入 before/after。
    expect(
      computeTrackJump({
        currentScroll: 100,
        viewportSize: 200,
        clientPos: 100,
        thumbStart: 100,
        thumbEnd: 100,
        maxScroll: 500,
      }),
    ).toEqual({ zone: 'thumb', nextScroll: 100 })
    expect(
      computeTrackJump({
        currentScroll: 100,
        viewportSize: 200,
        clientPos: 99,
        thumbStart: 100,
        thumbEnd: 100,
        maxScroll: 500,
      }),
    ).toEqual({ zone: 'before', nextScroll: 0 })
    expect(
      computeTrackJump({
        currentScroll: 100,
        viewportSize: 200,
        clientPos: 101,
        thumbStart: 100,
        thumbEnd: 100,
        maxScroll: 500,
      }),
    ).toEqual({ zone: 'after', nextScroll: 300 })
  })

  it('works for horizontal semantics (clientX vs thumb left/right)', () => {
    // 水平方向同语义验证：thumb [200, 232]，clientX 在左/右/thumb。
    expect(
      computeTrackJump({
        currentScroll: 150,
        viewportSize: 300,
        clientPos: 100,
        thumbStart: 200,
        thumbEnd: 232,
        maxScroll: 800,
      }),
    ).toEqual({ zone: 'before', nextScroll: 0 })
    expect(
      computeTrackJump({
        currentScroll: 150,
        viewportSize: 300,
        clientPos: 210,
        thumbStart: 200,
        thumbEnd: 232,
        maxScroll: 800,
      }),
    ).toEqual({ zone: 'thumb', nextScroll: 150 })
    expect(
      computeTrackJump({
        currentScroll: 150,
        viewportSize: 300,
        clientPos: 400,
        thumbStart: 200,
        thumbEnd: 232,
        maxScroll: 800,
      }),
    ).toEqual({ zone: 'after', nextScroll: 450 })
  })
})
