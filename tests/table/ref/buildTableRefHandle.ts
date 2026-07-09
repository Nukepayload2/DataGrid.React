import { describe, expect, it, vi } from 'vitest'
import { buildTableRefHandle, type TableEngineLike } from '../../../src/table/buildTableRefHandle'

interface Rec {
  key: string
  v?: number
}

const data: Array<Rec> = [
  { key: 'a', v: 1 },
  { key: 'b', v: 2 },
  { key: 'c', v: 3 },
]

function makeEngine() {
  const scrollTo = vi.fn<(config: Parameters<TableEngineLike['scrollTo']>[0]) => void>()
  return { scrollTo } as unknown as TableEngineLike & { scrollTo: typeof scrollTo }
}

describe('buildTableRefHandle', () => {
  describe('scrollTo · key → index 解析', () => {
    it('key 命中 → 转为 index 调用 engine.scrollTo', () => {
      const engine = makeEngine()
      const native = document.createElement('div')
      const handle = buildTableRefHandle<Rec>(engine, native, data, 'key')

      handle.scrollTo({ key: 'b', align: 'center', behavior: 'smooth' })

      expect(engine.scrollTo).toHaveBeenCalledTimes(1)
      expect(engine.scrollTo).toHaveBeenCalledWith({
        index: 1,
        offset: undefined,
        align: 'center',
        behavior: 'smooth',
      })
    })

    it('key 未命中（findIndex 返回 -1）→ no-op（不调 engine.scrollTo）', () => {
      const engine = makeEngine()
      const handle = buildTableRefHandle<Rec>(engine, null, data, 'key')

      handle.scrollTo({ key: 'zzz' })

      expect(engine.scrollTo).not.toHaveBeenCalled()
    })
  })

  describe('scrollTo · top 别名合并到 scrollTop', () => {
    it('仅传 top（scrollTop 未提供）→ 合并为 scrollTop 调用', () => {
      const engine = makeEngine()
      const handle = buildTableRefHandle<Rec>(engine, null, data, 'key')

      handle.scrollTo({ top: 250 })

      expect(engine.scrollTo).toHaveBeenCalledTimes(1)
      expect(engine.scrollTo).toHaveBeenCalledWith({
        scrollTop: 250,
        offset: undefined,
        align: undefined,
        behavior: undefined,
      })
    })

    it('同时传 scrollTop 与 top → scrollTop 优先（top 被忽略，走通用分支）', () => {
      const engine = makeEngine()
      const handle = buildTableRefHandle<Rec>(engine, null, data, 'key')

      handle.scrollTo({ scrollTop: 100, top: 250 })

      expect(engine.scrollTo).toHaveBeenCalledWith({
        index: undefined,
        scrollTop: 100,
        offset: undefined,
        align: undefined,
        behavior: undefined,
      })
    })
  })

  describe('scrollTo · 直接 index/scrollTop', () => {
    it('传 index → 透传给 engine', () => {
      const engine = makeEngine()
      const handle = buildTableRefHandle<Rec>(engine, null, data, 'key')

      handle.scrollTo({ index: 5, offset: 10, align: 'start', behavior: 'auto' })

      expect(engine.scrollTo).toHaveBeenCalledWith({
        index: 5,
        offset: 10,
        align: 'start',
        behavior: 'auto',
      })
    })

    it('传 scrollTop → 透传给 engine', () => {
      const engine = makeEngine()
      const handle = buildTableRefHandle<Rec>(engine, null, data, 'key')

      handle.scrollTo({ scrollTop: 80 })

      expect(engine.scrollTo).toHaveBeenCalledWith({
        index: undefined,
        scrollTop: 80,
        offset: undefined,
        align: undefined,
        behavior: undefined,
      })
    })
  })

  describe('engine 为 null（非虚拟/未挂载）', () => {
    it('所有 scrollTo 调用均为 no-op（不抛错）', () => {
      const handle = buildTableRefHandle<Rec>(null, null, data, 'key')
      expect(() => {
        handle.scrollTo({ key: 'a' })
        handle.scrollTo({ index: 0 })
        handle.scrollTo({ scrollTop: 100 })
        handle.scrollTo({ top: 100 })
      }).not.toThrow()
    })
  })

  describe('nativeElement 透传', () => {
    it('返回的句柄 nativeElement 等于传入的 DOM 节点', () => {
      const native = document.createElement('div')
      const handle = buildTableRefHandle<Rec>(null, native, data, 'key')
      expect(handle.nativeElement).toBe(native)
    })

    it('传入 null → nativeElement 为 null', () => {
      const handle = buildTableRefHandle<Rec>(null, null, data, 'key')
      expect(handle.nativeElement).toBeNull()
    })
  })

  describe('rowKey 函数形式', () => {
    it('rowKey 为函数时，按函数返回值匹配 key', () => {
      const engine = makeEngine()
      const handle = buildTableRefHandle<Rec>(engine, null, data, (r) => r.key)

      handle.scrollTo({ key: 'c' })

      expect(engine.scrollTo).toHaveBeenCalledWith({
        index: 2,
        offset: undefined,
        align: undefined,
        behavior: undefined,
      })
    })
  })
})
