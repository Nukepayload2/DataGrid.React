/**
 * 滚动条触摸激活 hook（从 Table.tsx 抽出，机械搬运）。
 *
 * 把 `Table.tsx` L844–862（scrollBarFoldMode 解析 + scrollBarTouchedActive state +
 * activateScrollBarByTouch callback + scrollBarTouchTimerRef）+ L864–870（卸载清理
 * clearTimeout effect）整体搬进 hook。
 *
 * 行为：触摸事件（pointerType !== 'mouse'）激活滚动条"触摸态"（dg-scrollbar-touched class），
 * 1600ms 后自动清除。仅 scrollBarFoldMode.showOnTableHover=true 时启用（鼠标 hover 不触发）。
 *
 * 详见 `docs/engineering-refactor-table-hooks.md` §3.2①。
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { ScrollBarFoldMode } from './types'

export interface UseScrollbarTouchOptions {
  scrollBarFoldMode: ScrollBarFoldMode | undefined
}

export interface UseScrollbarTouchResult {
  scrollBarShowOnTableHover: boolean
  scrollBarExpandOnHover: boolean
  scrollBarTouchedActive: boolean
  activateScrollBarByTouch: (event: ReactPointerEvent<HTMLDivElement>) => void
}

export function useScrollbarTouch(
  options: UseScrollbarTouchOptions,
): UseScrollbarTouchResult {
  const { scrollBarFoldMode } = options
  const scrollBarShowOnTableHover = scrollBarFoldMode?.showOnTableHover === true
  const scrollBarExpandOnHover = scrollBarFoldMode?.expandOnHover !== false
  const [scrollBarTouchedActive, setScrollBarTouchedActive] = useState(false)
  const scrollBarTouchTimerRef = useRef<number | undefined>(undefined)
  const activateScrollBarByTouch = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!scrollBarShowOnTableHover || event.pointerType === 'mouse') return
      setScrollBarTouchedActive(true)
      if (scrollBarTouchTimerRef.current !== undefined) {
        window.clearTimeout(scrollBarTouchTimerRef.current)
      }
      scrollBarTouchTimerRef.current = window.setTimeout(() => {
        setScrollBarTouchedActive(false)
        scrollBarTouchTimerRef.current = undefined
      }, 1600)
    },
    [scrollBarShowOnTableHover],
  )

  useEffect(() => {
    return () => {
      if (scrollBarTouchTimerRef.current !== undefined) {
        window.clearTimeout(scrollBarTouchTimerRef.current)
      }
    }
  }, [])

  return {
    scrollBarShowOnTableHover,
    scrollBarExpandOnHover,
    scrollBarTouchedActive,
    activateScrollBarByTouch,
  }
}
