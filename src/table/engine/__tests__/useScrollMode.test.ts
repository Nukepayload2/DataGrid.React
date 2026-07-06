import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useScrollMode } from '../useScrollMode'

type ScrollModeOptions = Parameters<typeof useScrollMode>[0]

const defaults: ScrollModeOptions = {}

const render = (overrides: Partial<ScrollModeOptions> = {}) =>
  renderHook(() => useScrollMode({ ...defaults, ...overrides })).result.current

describe('useScrollMode', () => {
  describe('sticky 字段', () => {
    it('sticky undefined → stickyEnabled=false, stickyHeaderOffset=undefined', () => {
      const r = render({ sticky: undefined })
      expect(r.stickyEnabled).toBe(false)
      expect(r.stickyHeaderOffset).toBeUndefined()
      expect(r.stickyOffsetHeader).toBe(0)
      expect(r.stickyOffsetScroll).toBe(0)
      expect(r.stickyGetContainer).toBeUndefined()
    })

    it('sticky null → stickyEnabled=false（null 与 undefined 同等对待）', () => {
      const r = render({ sticky: null })
      expect(r.stickyEnabled).toBe(false)
      expect(r.stickyHeaderOffset).toBeUndefined()
    })

    it('sticky = {} （空对象）→ stickyEnabled=true，offsets 取默认 0', () => {
      const r = render({ sticky: {} })
      expect(r.stickyEnabled).toBe(true)
      expect(r.stickyOffsetHeader).toBe(0)
      expect(r.stickyOffsetScroll).toBe(0)
      expect(r.stickyGetContainer).toBeUndefined()
      // sticky 启用时 stickyHeaderOffset 暴露 offsetHeader（此处为默认 0）
      expect(r.stickyHeaderOffset).toBe(0)
    })

    it('sticky = { offsetHeader: 20, offsetScroll: 10 } → 派生对应数值', () => {
      const r = render({ sticky: { offsetHeader: 20, offsetScroll: 10 } })
      expect(r.stickyEnabled).toBe(true)
      expect(r.stickyOffsetHeader).toBe(20)
      expect(r.stickyOffsetScroll).toBe(10)
      expect(r.stickyHeaderOffset).toBe(20)
    })

    it('sticky.getContainer 提供 → stickyGetContainer 为该函数', () => {
      const getContainer = () => undefined
      const r = render({ sticky: { getContainer } })
      expect(r.stickyGetContainer).toBe(getContainer)
    })

    it('sticky.getContainer 未提供 → stickyGetContainer=undefined', () => {
      const r = render({ sticky: { offsetHeader: 5 } })
      expect(r.stickyGetContainer).toBeUndefined()
    })
  })

  describe('scroll.y 字段', () => {
    it('scroll undefined → scrollYEnabled=false', () => {
      const r = render({})
      expect(r.scrollY).toBeUndefined()
      expect(r.scrollYEnabled).toBe(false)
    })

    it('scroll.y === true → scrollY=true, scrollYEnabled=true', () => {
      const r = render({ scroll: { y: true } })
      expect(r.scrollY).toBe(true)
      expect(r.scrollYEnabled).toBe(true)
    })

    it('scroll.y 未提供（仅 scroll.x）→ scrollY=undefined, scrollYEnabled=false', () => {
      const r = render({ scroll: { x: 500 } })
      expect(r.scrollY).toBeUndefined()
      expect(r.scrollYEnabled).toBe(false)
    })

    it('scroll.x 数字 / 字符串都不影响 scrollY 派生', () => {
      expect(render({ scroll: { x: 500 } }).scrollYEnabled).toBe(false)
      expect(render({ scroll: { x: '500px' } }).scrollYEnabled).toBe(false)
    })
  })

  describe('virtual 字段', () => {
    it('virtual 未提供 → virtualEnabled=false（即便 scroll.y=true）', () => {
      const r = render({ scroll: { y: true } })
      expect(r.virtualEnabled).toBe(false)
    })

    it('virtual=true 且 scroll.y=true → virtualEnabled=true', () => {
      const r = render({ virtual: true, scroll: { y: true } })
      expect(r.virtualEnabled).toBe(true)
    })

    it('virtual=true 但 scroll.y 未提供 → virtualEnabled=false（需 scroll.y===true）', () => {
      const r = render({ virtual: true })
      expect(r.virtualEnabled).toBe(false)
    })
  })

  describe('互斥优先级：sticky > virtual > 容器内固定表头', () => {
    it('sticky 启用 + virtual=true + scroll.y=true → virtual 被 sticky 抑制', () => {
      const r = render({ sticky: { offsetHeader: 8 }, virtual: true, scroll: { y: true } })
      expect(r.stickyEnabled).toBe(true)
      expect(r.virtualEnabled).toBe(false)
      expect(r.scrollYNonVirtual).toBe(false)
      // sticky 启用时 headerStickyTop 恒 false（容器内 sticky 不生效）
      expect(r.headerStickyTop).toBe(false)
      // sticky 启用时 stickyHeaderOffset 取 offsetHeader
      expect(r.stickyHeaderOffset).toBe(8)
    })

    it('virtual 启用 + scroll.y=true + sticky 未启用 → 虚拟优先于容器内固定表头', () => {
      const r = render({ virtual: true, scroll: { y: true } })
      expect(r.virtualEnabled).toBe(true)
      expect(r.scrollYNonVirtual).toBe(false)
      expect(r.headerStickyTop).toBe(true)
      expect(r.stickyHeaderOffset).toBeUndefined()
    })

    it('非虚拟 + scroll.y=true + sticky 未启用 → 容器内固定表头启用', () => {
      const r = render({ scroll: { y: true } })
      expect(r.virtualEnabled).toBe(false)
      expect(r.scrollYNonVirtual).toBe(true)
      expect(r.headerStickyTop).toBe(true)
      expect(r.stickyHeaderOffset).toBeUndefined()
    })

    it('sticky 启用 + scroll.y=true + virtual 未启用 → 仍然全部容器内模式被抑制', () => {
      const r = render({ sticky: {}, scroll: { y: true } })
      expect(r.stickyEnabled).toBe(true)
      expect(r.virtualEnabled).toBe(false)
      expect(r.scrollYNonVirtual).toBe(false)
      expect(r.headerStickyTop).toBe(false)
    })
  })

  describe('headerStickyTop 统一标志', () => {
    it('虚拟与容器内固定表头共用 headerStickyTop=true（任一启用即 true）', () => {
      expect(render({ virtual: true, scroll: { y: true } }).headerStickyTop).toBe(true)
      expect(render({ scroll: { y: true } }).headerStickyTop).toBe(true)
    })

    it('sticky 启用时 headerStickyTop=false（容器内 sticky 不生效）', () => {
      expect(render({ sticky: {} }).headerStickyTop).toBe(false)
      expect(render({ sticky: {}, virtual: true, scroll: { y: true } }).headerStickyTop).toBe(false)
    })

    it('无任何滚动模式启用 → headerStickyTop=false', () => {
      expect(render({}).headerStickyTop).toBe(false)
      expect(render({ virtual: true }).headerStickyTop).toBe(false)
      expect(render({ scroll: { x: 500 } }).headerStickyTop).toBe(false)
    })
  })

  describe('组合矩阵（行为保真，对齐原 GridTable 内联块）', () => {
    const cases: Array<{
      name: string
      opts: ScrollModeOptions
      expected: Partial<{
        stickyEnabled: boolean
        scrollYEnabled: boolean
        virtualEnabled: boolean
        scrollYNonVirtual: boolean
        headerStickyTop: boolean
        stickyHeaderOffset: number | undefined
      }>
    }> = [
      {
        name: 'all empty',
        opts: {},
        expected: {
          stickyEnabled: false,
          scrollYEnabled: false,
          virtualEnabled: false,
          scrollYNonVirtual: false,
          headerStickyTop: false,
          stickyHeaderOffset: undefined,
        },
      },
      {
        name: 'only scroll.x',
        opts: { scroll: { x: 600 } },
        expected: {
          stickyEnabled: false,
          scrollYEnabled: false,
          virtualEnabled: false,
          scrollYNonVirtual: false,
          headerStickyTop: false,
          stickyHeaderOffset: undefined,
        },
      },
      {
        name: 'scroll.y only → container-fixed header',
        opts: { scroll: { y: true } },
        expected: {
          stickyEnabled: false,
          scrollYEnabled: true,
          virtualEnabled: false,
          scrollYNonVirtual: true,
          headerStickyTop: true,
          stickyHeaderOffset: undefined,
        },
      },
      {
        name: 'virtual + scroll.y → virtual',
        opts: { virtual: true, scroll: { y: true } },
        expected: {
          stickyEnabled: false,
          scrollYEnabled: true,
          virtualEnabled: true,
          scrollYNonVirtual: false,
          headerStickyTop: true,
          stickyHeaderOffset: undefined,
        },
      },
      {
        name: 'sticky only',
        opts: { sticky: { offsetHeader: 30 } },
        expected: {
          stickyEnabled: true,
          scrollYEnabled: false,
          virtualEnabled: false,
          scrollYNonVirtual: false,
          headerStickyTop: false,
          stickyHeaderOffset: 30,
        },
      },
      {
        name: 'sticky suppresses virtual',
        opts: { sticky: { offsetHeader: 12 }, virtual: true, scroll: { y: true } },
        expected: {
          stickyEnabled: true,
          scrollYEnabled: true,
          virtualEnabled: false,
          scrollYNonVirtual: false,
          headerStickyTop: false,
          stickyHeaderOffset: 12,
        },
      },
    ]

    for (const c of cases) {
      it(`${c.name}`, () => {
        const r = render(c.opts)
        for (const [k, v] of Object.entries(c.expected)) {
          expect(r[k as keyof typeof r]).toStrictEqual(v)
        }
      })
    }
  })
})
