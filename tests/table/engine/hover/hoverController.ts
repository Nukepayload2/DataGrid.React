import { describe, expect, it, vi } from 'vitest'
import {
  isRowSpanHovered,
  mergeHoverEventHandler,
  resolveHoverClass,
} from '../../../../src/table/engine/hoverController'

describe('hoverController', () => {
  it('detects hover within the logical rowSpan range', () => {
    expect(isRowSpanHovered(3, 1, 3)).toBe(true)
    expect(isRowSpanHovered(3, 2, 4)).toBe(true)
    expect(isRowSpanHovered(3, 2, 2)).toBe(false)
    expect(isRowSpanHovered(3, 2, 5)).toBe(false)
    expect(isRowSpanHovered(3, 2, null)).toBe(false)
  })

  it('resolves the built-in row hover class', () => {
    expect(resolveHoverClass(true, true)).toBe('dg-row-hover')
    expect(resolveHoverClass(undefined, true)).toBe('dg-row-hover')
    expect(resolveHoverClass(true, false)).toBeUndefined()
    expect(resolveHoverClass(false, true)).toBeUndefined()
  })

  it('merges built-in hover updates before user handlers', () => {
    const calls: Array<string> = []
    const handler = mergeHoverEventHandler(
      true,
      () => calls.push('internal'),
      event => calls.push(`user:${event}`),
    )

    handler?.('enter')

    expect(calls).toEqual(['internal', 'user:enter'])
  })

  it('returns the user handler unchanged when row hover is disabled', () => {
    const applyHover = vi.fn()
    const userHandler = vi.fn()
    const handler = mergeHoverEventHandler(false, applyHover, userHandler)

    expect(handler).toBe(userHandler)
    handler?.('enter')

    expect(applyHover).not.toHaveBeenCalled()
    expect(userHandler).toHaveBeenCalledWith('enter')
  })
})
