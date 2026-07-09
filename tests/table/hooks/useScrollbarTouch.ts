import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useScrollbarTouch } from '../../../src/table/useScrollbarTouch'
import type { ScrollBarFoldMode } from '../../../src/table/types'

interface Opts {
  scrollBarFoldMode: ScrollBarFoldMode | undefined
}

const render = (overrides: Partial<Opts> = {}) =>
  renderHook(() =>
    useScrollbarTouch({ scrollBarFoldMode: undefined, ...overrides }),
  ).result.current

function makePointerEvent(pointerType: string) {
  return {
    pointerType,
  } as React.PointerEvent<HTMLDivElement>
}

describe('useScrollbarTouch', () => {
  describe('scrollBarShowOnTableHover 解析', () => {
    it('showOnTableHover=true → scrollBarShowOnTableHover=true', () => {
      const r = render({ scrollBarFoldMode: { showOnTableHover: true } })
      expect(r.scrollBarShowOnTableHover).toBe(true)
    })

    it('showOnTableHover=false → scrollBarShowOnTableHover=false', () => {
      const r = render({ scrollBarFoldMode: { showOnTableHover: false } })
      expect(r.scrollBarShowOnTableHover).toBe(false)
    })

    it('showOnTableHover=undefined → scrollBarShowOnTableHover=false', () => {
      const r = render({ scrollBarFoldMode: {} })
      expect(r.scrollBarShowOnTableHover).toBe(false)
    })

    it('scrollBarFoldMode=undefined → scrollBarShowOnTableHover=false', () => {
      const r = render({ scrollBarFoldMode: undefined })
      expect(r.scrollBarShowOnTableHover).toBe(false)
    })
  })

  describe('scrollBarExpandOnHover 解析', () => {
    it('expandOnHover=undefined → 默认 true（!== false）', () => {
      const r = render({ scrollBarFoldMode: {} })
      expect(r.scrollBarExpandOnHover).toBe(true)
    })

    it('expandOnHover=true → true', () => {
      const r = render({ scrollBarFoldMode: { expandOnHover: true } })
      expect(r.scrollBarExpandOnHover).toBe(true)
    })

    it('expandOnHover=false → false', () => {
      const r = render({ scrollBarFoldMode: { expandOnHover: false } })
      expect(r.scrollBarExpandOnHover).toBe(false)
    })

    it('scrollBarFoldMode=undefined → 默认 true', () => {
      const r = render({ scrollBarFoldMode: undefined })
      expect(r.scrollBarExpandOnHover).toBe(true)
    })
  })

  describe('初始 scrollBarTouchedActive', () => {
    it('初始为 false', () => {
      const r = render({ scrollBarFoldMode: { showOnTableHover: true } })
      expect(r.scrollBarTouchedActive).toBe(false)
    })
  })

  describe('activateScrollBarByTouch 触摸激活', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
      cleanup()
    })

    it('showOnTableHover=true + pointerType=touch → 激活 active', () => {
      const { result } = renderHook(() =>
        useScrollbarTouch({ scrollBarFoldMode: { showOnTableHover: true } }),
      )
      act(() => {
        result.current.activateScrollBarByTouch(makePointerEvent('touch'))
      })
      expect(result.current.scrollBarTouchedActive).toBe(true)
    })

    it('showOnTableHover=true + pointerType=mouse → 忽略（保持 false）', () => {
      const { result } = renderHook(() =>
        useScrollbarTouch({ scrollBarFoldMode: { showOnTableHover: true } }),
      )
      act(() => {
        result.current.activateScrollBarByTouch(makePointerEvent('mouse'))
      })
      expect(result.current.scrollBarTouchedActive).toBe(false)
    })

    it('showOnTableHover=false + pointerType=touch → 忽略（保持 false）', () => {
      const { result } = renderHook(() =>
        useScrollbarTouch({ scrollBarFoldMode: { showOnTableHover: false } }),
      )
      act(() => {
        result.current.activateScrollBarByTouch(makePointerEvent('touch'))
      })
      expect(result.current.scrollBarTouchedActive).toBe(false)
    })

    it('激活后 1600ms 自动清除 active', () => {
      const { result } = renderHook(() =>
        useScrollbarTouch({ scrollBarFoldMode: { showOnTableHover: true } }),
      )
      act(() => {
        result.current.activateScrollBarByTouch(makePointerEvent('touch'))
      })
      expect(result.current.scrollBarTouchedActive).toBe(true)

      act(() => {
        vi.advanceTimersByTime(1599)
      })
      expect(result.current.scrollBarTouchedActive).toBe(true)

      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(result.current.scrollBarTouchedActive).toBe(false)
    })

    it('连续触摸重置计时器（1600ms 内再次触摸不提前清除）', () => {
      const { result } = renderHook(() =>
        useScrollbarTouch({ scrollBarFoldMode: { showOnTableHover: true } }),
      )
      act(() => {
        result.current.activateScrollBarByTouch(makePointerEvent('touch'))
      })
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      // 再次触摸，应清除旧 timer 设新 timer
      act(() => {
        result.current.activateScrollBarByTouch(makePointerEvent('touch'))
      })
      // 距首次触摸 1600ms 后（距二次仅 600ms）应仍 active
      act(() => {
        vi.advanceTimersByTime(600)
      })
      expect(result.current.scrollBarTouchedActive).toBe(true)
      // 再过 1000ms（距二次触摸共 1600ms）应清除
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(result.current.scrollBarTouchedActive).toBe(false)
    })

    it('卸载时清除 timer（不抛错、不残留 setTimeout 回调）', () => {
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')
      const { result, unmount } = renderHook(() =>
        useScrollbarTouch({ scrollBarFoldMode: { showOnTableHover: true } }),
      )
      act(() => {
        result.current.activateScrollBarByTouch(makePointerEvent('touch'))
      })
      // 此时 timer 已挂载，卸载应触发 clearTimeout
      unmount()
      expect(clearTimeoutSpy).toHaveBeenCalled()
      clearTimeoutSpy.mockRestore()
    })

    it('未激活时卸载（timer 为 undefined）→ cleanup 守卫不调 clearTimeout（也安全）', () => {
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')
      const { unmount } = renderHook(() =>
        useScrollbarTouch({ scrollBarFoldMode: { showOnTableHover: true } }),
      )
      unmount()
      // 守卫 `timerRef.current !== undefined` 阻止无意义调用；卸载安全（不抛错）即可
      expect(clearTimeoutSpy).not.toHaveBeenCalled()
      clearTimeoutSpy.mockRestore()
    })
  })
})
