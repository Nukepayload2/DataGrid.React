import { describe, expect, it, vi } from 'vitest'
import { normalizePlacement, resolvePlacement, slicePage } from '../usePagination'

describe('usePagination pure helpers', () => {
  it('normalizes placement alignment words', () => {
    expect(normalizePlacement('topCenter')).toBe('center')
    expect(normalizePlacement('bottomLeft')).toBe('start')
    expect(normalizePlacement('topStart')).toBe('start')
    expect(normalizePlacement('bottomRight')).toBe('end')
  })

  it('resolves default, top, bottom, and none placements', () => {
    expect(resolvePlacement(undefined)).toEqual({ top: null, bottom: 'end' })
    expect(resolvePlacement(['topStart'])).toEqual({ top: 'start', bottom: null })
    expect(resolvePlacement(['bottomCenter'])).toEqual({ top: null, bottom: 'center' })
    expect(resolvePlacement(['none'])).toEqual({ top: null, bottom: null })
    expect(resolvePlacement(['topEnd', 'bottomStart'])).toEqual({ top: 'end', bottom: 'start' })
  })

  it('slices client-side pages', () => {
    expect(slicePage([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4])
  })

  it('does not slice server-side current-page data when length is less than total', () => {
    const page = [1, 2]

    expect(slicePage(page, 3, 2, 10)).toBe(page)
  })

  it('warns and slices suspicious server-side data that exceeds pageSize', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(slicePage([1, 2, 3, 4, 5], 2, 2, 10)).toEqual([3, 4])
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })

  it('handles invalid page size and negative current values', () => {
    expect(slicePage([1, 2, 3], 1, 0)).toEqual([])
    expect(slicePage([1, 2, 3], -1, 2)).toEqual([])
  })
})
