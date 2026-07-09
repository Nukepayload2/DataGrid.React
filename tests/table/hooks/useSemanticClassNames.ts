import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSemanticClassNames } from '../../../src/table/useSemanticClassNames'
import type {
  TableSemanticClassNames,
  TableSemanticStyles,
} from '../../../src/table/types'

// 测试用 props 子集（hook 不对 record 敏感）。
const fixedProps = {
  size: 'middle' as const,
  bordered: false,
  virtual: false,
  scroll: undefined as { x?: number | string; y?: true } | undefined,
  pagination: undefined as false | undefined,
}

describe('useSemanticClassNames', () => {
  describe('二态归一 - classNames', () => {
    it('对象态：直接透传（同一引用）', () => {
      const obj: TableSemanticClassNames = { root: 'r', section: 's' }
      const { result } = renderHook(() =>
        useSemanticClassNames(obj, undefined, fixedProps.size, fixedProps.bordered, fixedProps.virtual, fixedProps.scroll, fixedProps.pagination),
      )
      expect(result.current.classNamesResolved).toBe(obj)
    })

    it('函数态：调用并以 info.props 求值', () => {
      const fn = (info: { props: { size?: string; bordered?: boolean } }) => ({
        root: info.props.bordered ? 'bordered-root' : 'plain-root',
      })
      const { result: r1 } = renderHook(() =>
        useSemanticClassNames(fn, undefined, 'small', true, false, undefined, undefined),
      )
      expect(r1.current.classNamesResolved).toEqual({ root: 'bordered-root' })

      const { result: r2 } = renderHook(() =>
        useSemanticClassNames(fn, undefined, 'small', false, false, undefined, undefined),
      )
      expect(r2.current.classNamesResolved).toEqual({ root: 'plain-root' })
    })

    it('undefined → classNamesResolved 为 undefined', () => {
      const { result } = renderHook(() =>
        useSemanticClassNames(undefined, undefined, fixedProps.size, fixedProps.bordered, fixedProps.virtual, fixedProps.scroll, fixedProps.pagination),
      )
      expect(result.current.classNamesResolved).toBeUndefined()
    })
  })

  describe('二态归一 - styles', () => {
    it('对象态：直接透传（同一引用）', () => {
      const obj: TableSemanticStyles = { root: { color: 'red' } }
      const { result } = renderHook(() =>
        useSemanticClassNames(undefined, obj, fixedProps.size, fixedProps.bordered, fixedProps.virtual, fixedProps.scroll, fixedProps.pagination),
      )
      expect(result.current.stylesResolved).toBe(obj)
    })

    it('函数态：调用并以 info.props 求值', () => {
      const fn = (info: { props: { size?: string } }) => ({
        root: { fontSize: info.props.size === 'small' ? 12 : 14 },
      })
      const { result } = renderHook(() =>
        useSemanticClassNames(undefined, fn, 'small', false, false, undefined, undefined),
      )
      expect(result.current.stylesResolved).toEqual({ root: { fontSize: 12 } })
    })

    it('undefined → stylesResolved 为 undefined', () => {
      const { result } = renderHook(() =>
        useSemanticClassNames(undefined, undefined, fixedProps.size, fixedProps.bordered, fixedProps.virtual, fixedProps.scroll, fixedProps.pagination),
      )
      expect(result.current.stylesResolved).toBeUndefined()
    })
  })

  describe('engineSemantic 子集构造', () => {
    it('classNames/styles 均未提供 → engineSemantic 为 undefined', () => {
      const { result } = renderHook(() =>
        useSemanticClassNames(undefined, undefined, fixedProps.size, fixedProps.bordered, fixedProps.virtual, fixedProps.scroll, fixedProps.pagination),
      )
      expect(result.current.engineSemantic).toBeUndefined()
    })

    it('classNames 有 section → engineSemantic.section 合并 className（style 未提供则 undefined）', () => {
      const cn: TableSemanticClassNames = { section: 'my-section' }
      const { result } = renderHook(() =>
        useSemanticClassNames(cn, undefined, fixedProps.size, fixedProps.bordered, fixedProps.virtual, fixedProps.scroll, fixedProps.pagination),
      )
      expect(result.current.engineSemantic?.section).toEqual({
        className: 'my-section',
        style: undefined,
      })
    })

    it('styles 有 content → engineSemantic.content 合并 style（className 未提供则 undefined）', () => {
      const st: TableSemanticStyles = { content: { color: 'blue' } }
      const { result } = renderHook(() =>
        useSemanticClassNames(undefined, st, fixedProps.size, fixedProps.bordered, fixedProps.virtual, fixedProps.scroll, fixedProps.pagination),
      )
      expect(result.current.engineSemantic?.content).toEqual({
        className: undefined,
        style: { color: 'blue' },
      })
    })

    it('header：classNames.header 与 styles.header 合并', () => {
      const cn: TableSemanticClassNames = { header: { wrapper: 'h-wrap', row: 'h-row' } }
      const st: TableSemanticStyles = { header: { wrapper: { color: 'green' } } }
      const { result } = renderHook(() =>
        useSemanticClassNames(cn, st, fixedProps.size, fixedProps.bordered, fixedProps.virtual, fixedProps.scroll, fixedProps.pagination),
      )
      expect(result.current.engineSemantic?.header).toEqual({
        className: { wrapper: 'h-wrap', row: 'h-row' },
        style: { wrapper: { color: 'green' } },
      })
    })

    it('body：classNames.body 与 styles.body 合并', () => {
      const cn: TableSemanticClassNames = { body: { cell: 'b-cell' } }
      const st: TableSemanticStyles = { body: { row: { background: 'yellow' } } }
      const { result } = renderHook(() =>
        useSemanticClassNames(cn, st, fixedProps.size, fixedProps.bordered, fixedProps.virtual, fixedProps.scroll, fixedProps.pagination),
      )
      expect(result.current.engineSemantic?.body).toEqual({
        className: { cell: 'b-cell' },
        style: { row: { background: 'yellow' } },
      })
    })

    it('部位缺失：section/content/header/body 均未提供时，sem 仅含已提供部位（不写入空对象）', () => {
      const cn: TableSemanticClassNames = { root: 'r', title: 't' }
      const { result } = renderHook(() =>
        useSemanticClassNames(cn, undefined, fixedProps.size, fixedProps.bordered, fixedProps.virtual, fixedProps.scroll, fixedProps.pagination),
      )
      // root/title/footer/pagination.* 由适配层消费，不进 engineSemantic
      expect(result.current.engineSemantic).toEqual({})
    })

    it('混合：classNames 提供 section，styles 提供 header → 两部位分别写入', () => {
      const cn: TableSemanticClassNames = { section: 'sec' }
      const st: TableSemanticStyles = { header: { wrapper: { color: 'pink' } } }
      const { result } = renderHook(() =>
        useSemanticClassNames(cn, st, fixedProps.size, fixedProps.bordered, fixedProps.virtual, fixedProps.scroll, fixedProps.pagination),
      )
      expect(result.current.engineSemantic?.section).toEqual({
        className: 'sec',
        style: undefined,
      })
      expect(result.current.engineSemantic?.header).toEqual({
        className: undefined,
        style: { wrapper: { color: 'pink' } },
      })
    })
  })

  describe('函数式 info.props 透传', () => {
    it('size/bordered/virtual/scroll/pagination 透传到 info.props', () => {
      const seen: Array<unknown> = []
      const fn = (info: {
        props: {
          size?: string
          bordered?: boolean
          virtual?: boolean
          scroll?: unknown
          pagination?: unknown
        }
      }) => {
        seen.push(info.props)
        return {}
      }
      renderHook(() =>
        useSemanticClassNames(fn, fn, 'large', true, true, { x: 100, y: true }, false),
      )
      // classNames 与 styles 各调用一次（useMemo 各一份）
      expect(seen).toHaveLength(2)
      expect(seen[0]).toEqual({
        size: 'large',
        bordered: true,
        virtual: true,
        scroll: { x: 100, y: true },
        pagination: false,
      })
    })
  })
})
