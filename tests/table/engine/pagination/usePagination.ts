import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  normalizePlacement,
  resolvePlacement,
  shouldResetPagination,
  slicePage,
  usePagination,
} from '../../../../src/table/engine/usePagination'

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

// === BAT-24（步骤 68）：复位判据 ＋ resetPagination（参照 refreshPagination 无参调用同形）===

describe('shouldResetPagination', () => {
  // 判据真值表（antd 6.4.4 实测）：只有筛选 `reset=true`（InternalTable.js:232-237），
  // 排序显式 false（:213-218），翻页/改 pageSize 走默认 false（:265-273 + :180 形参缺省）。
  it('resets only for the filter action', () => {
    expect(shouldResetPagination('filter')).toBe(true)
    expect(shouldResetPagination('sort')).toBe(false)
    expect(shouldResetPagination('paginate')).toBe(false)
  })
})

describe('usePagination().resetPagination', () => {
  it('puts the uncontrolled current back to 1 and keeps the effective pageSize', () => {
    const onPaginationChange = vi.fn()
    const { result } = renderHook(() =>
      usePagination({
        pagination: { pageSize: 10 },
        dataSourceLength: 50,
        onPaginationChange,
      }),
    )
    act(() => result.current.onInternalChange(3, 10))
    expect(result.current.current).toBe(3)

    act(() => result.current.resetPagination())
    expect(result.current.current).toBe(1)
    expect(result.current.pageSize).toBe(10)
  })

  // 参照 `hooks/usePagination.js:29-31` 是 mergeProps(inner, prop) ⇒ prop 覆盖 inner：
  // 复位只写 inner，受控值不动（受控态的"通知"由适配层 fireTableChange 负责）。
  it('does not change a controlled current', () => {
    const onPaginationChange = vi.fn()
    const { result } = renderHook(() =>
      usePagination({
        pagination: { current: 3, pageSize: 10 },
        dataSourceLength: 50,
        onPaginationChange,
      }),
    )
    act(() => result.current.resetPagination())
    expect(result.current.current).toBe(3)
  })

  // 复位**不是**翻页事件：不许驱动 onPaginationChange（否则多吐一次 action:'paginate'，工单坑 1）。
  it('does not drive the paginate callback', () => {
    const onPaginationChange = vi.fn()
    const { result } = renderHook(() =>
      usePagination({
        pagination: { pageSize: 10 },
        dataSourceLength: 50,
        onPaginationChange,
      }),
    )
    act(() => result.current.resetPagination())
    expect(onPaginationChange).not.toHaveBeenCalled()
  })

  // 参照 `refreshPagination(undefined, undefined)` 同时写 pageSize = mergedPagination.pageSize
  // ⇒ 复位后保持**已生效**的页长，不回落到默认 10。
  // 注意起点用 `defaultPageSize`：`pagination.pageSize` 是**受控**字段（antd 同形，
  // `mergeProps(inner, prop)` 里 prop 覆盖 inner ⇒ 受控页长下 inner 写了也不生效）。
  it('keeps the changed uncontrolled pageSize after reset', () => {
    const onPaginationChange = vi.fn()
    const { result } = renderHook(() =>
      usePagination({
        pagination: { defaultPageSize: 10 },
        dataSourceLength: 100,
        onPaginationChange,
      }),
    )
    act(() => result.current.onInternalChange(5, 20))
    expect(result.current.pageSize).toBe(20)

    act(() => result.current.resetPagination())
    expect(result.current.current).toBe(1)
    expect(result.current.pageSize).toBe(20)
  })
})
