import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ThemeProvider,
  useTheme,
} from '../../src/theme/ThemeContext'

function installMatchMedia(initialMatches: boolean) {
  let matches = initialMatches
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const media = {
    get matches() {
      return matches
    },
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: vi.fn((type: string, listener: (event: MediaQueryListEvent) => void) => {
      if (type === 'change') listeners.add(listener)
    }),
    removeEventListener: vi.fn((type: string, listener: (event: MediaQueryListEvent) => void) => {
      if (type === 'change') listeners.delete(listener)
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList

  const matchMedia = vi.fn(() => media)
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: matchMedia,
  })

  return {
    media,
    setMatches(next: boolean) {
      matches = next
      const event = { matches: next, media: media.media } as MediaQueryListEvent
      listeners.forEach((listener) => listener(event))
    },
  }
}

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}

describe('ThemeProvider system color scheme default', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.documentElement.style.colorScheme = ''
  })

  it('defaults to dark when prefers-color-scheme is dark', () => {
    installMatchMedia(true)
    const { result } = renderHook(() => useTheme(), { wrapper })

    expect(result.current.themeMode).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('follows system changes until the user explicitly switches theme', () => {
    const system = installMatchMedia(false)
    const { result } = renderHook(() => useTheme(), { wrapper })

    expect(result.current.themeMode).toBe('light')

    act(() => system.setMatches(true))
    expect(result.current.themeMode).toBe('dark')

    act(() => result.current.setThemeMode('light'))
    expect(result.current.themeMode).toBe('light')

    act(() => system.setMatches(false))
    expect(result.current.themeMode).toBe('light')
    act(() => system.setMatches(true))
    expect(result.current.themeMode).toBe('light')
  })
})
