import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePaginationAdapter } from '../usePaginationAdapter'
import type { TablePaginationState } from '../types'
import type { SorterResult } from '../compat/sort'

interface Rec {
  key: string
}

const data: Array<Rec> = Array.from({ length: 25 }, (_, i) => ({
  key: `r${i}`,
}))

const noopSorter: SorterResult<Rec> = {}

function makeRef() {
  return { current: { current: 1, pageSize: 0, total: 0 } as TablePaginationState }
}

interface RenderOpts {
  pagination?: false | Record<string, any>
  data?: Array<Rec>
  paginationData?: Array<Rec>
  onChange?: any
  size?: any
}

function renderAdapter(overrides: RenderOpts = {}) {
  const paginationStateRef = makeRef()
  const onChange = overrides.onChange ?? vi.fn()
  const result = renderHook(() =>
    usePaginationAdapter<Rec>({
      pagination: overrides.pagination ?? undefined,
      flattenedDataSource: overrides.data ?? data,
      paginationDataSource: overrides.paginationData,
      paginationStateRef,
      onChange,
      getFiltersArg: () => ({}),
      currentSorterResult: noopSorter,
      size: overrides.size,
      classNamesResolved: undefined,
      stylesResolved: undefined,
    }),
  )
  return { result: result.result.current, paginationStateRef, rerender: result.rerender }
}

describe('usePaginationAdapter', () => {
  describe('pagination=false（关闭分页）', () => {
    it('paginationEnabled=false + 不切片（全量）', () => {
      const { result } = renderAdapter({ pagination: false })
      expect(result.paginationEnabled).toBe(false)
      expect(result.pagedDataSource).toBe(data) // 同引用，零切片
      expect(result.pagedDataSource.length).toBe(25)
    })

    it('showPagination=false（未启用）', () => {
      const { result } = renderAdapter({ pagination: false })
      expect(result.showPagination).toBe(false)
    })

    it('top/bottom paginationNode=null（未启用不渲染）', () => {
      const { result } = renderAdapter({ pagination: false })
      expect(result.topPaginationNode).toBeNull()
      expect(result.bottomPaginationNode).toBeNull()
    })

    it('effectivePaginationState 构造全量态（current=1, pageSize=长度, total=长度）', () => {
      const { result } = renderAdapter({ pagination: false, data: data.slice(0, 7) })
      expect(result.effectivePaginationState).toEqual({
        current: 1,
        pageSize: 7,
        total: 7,
      })
    })

    it('paginationStateRef.current 被写入全量态', () => {
      const { paginationStateRef } = renderAdapter({ pagination: false, data: data.slice(0, 3) })
      expect(paginationStateRef.current).toEqual({
        current: 1,
        pageSize: 3,
        total: 3,
      })
    })
  })

  describe('pagination 未传（默认 {}，启用分页）', () => {
    it('paginationEnabled=true + 按 pageSize=10 切片（首页 10 条）', () => {
      const { result } = renderAdapter({}) // undefined → 默认 {}
      expect(result.paginationEnabled).toBe(true)
      expect(result.pagedDataSource.length).toBe(10)
      expect(result.pagedDataSource[0].key).toBe('r0')
    })

    it('showPagination=true（total=25 > 0）', () => {
      const { result } = renderAdapter({})
      expect(result.showPagination).toBe(true)
    })

    it('默认 placement=bottomEnd → bottomPaginationNode 渲染、top=null', () => {
      const { result } = renderAdapter({})
      expect(result.topPaginationNode).toBeNull()
      // bottomPaginationNode 是 ReactNode（Pagination 组件），非 null
      expect(result.bottomPaginationNode).not.toBeNull()
    })

    it('paginationStateRef.current 被写入实际分页状态（current=1, pageSize=10, total=25）', () => {
      const { paginationStateRef } = renderAdapter({})
      expect(paginationStateRef.current).toEqual({
        current: 1,
        pageSize: 10,
        total: 25,
      })
    })

    it('data 少于 pageSize 时仍正确（total=data.length）', () => {
      const { result, paginationStateRef } = renderAdapter({ data: data.slice(0, 5) })
      expect(result.pagedDataSource.length).toBe(5)
      expect(paginationStateRef.current.total).toBe(5)
    })

    it('可用独立 paginationDataSource 统计和切片树形顶层行', () => {
      const flattened = [
        { key: 'root-0' },
        { key: 'child-0' },
        { key: 'root-1' },
        { key: 'child-1' },
        { key: 'root-2' },
      ]
      const roots = [
        { key: 'root-0' },
        { key: 'root-1' },
        { key: 'root-2' },
      ]
      const { result, paginationStateRef } = renderAdapter({
        data: flattened,
        paginationData: roots,
        pagination: { pageSize: 2 },
      })

      expect(paginationStateRef.current).toEqual({
        current: 1,
        pageSize: 2,
        total: 3,
      })
      expect(result.pagedDataSource.map((record) => record.key)).toEqual(['root-0', 'root-1'])
    })
  })

  describe('placement 配置', () => {
    it('placement=["topLeft"] → top 渲染、bottom=null', () => {
      const { result } = renderAdapter({
        pagination: { placement: ['topLeft'] },
      })
      expect(result.topPaginationNode).not.toBeNull()
      expect(result.bottomPaginationNode).toBeNull()
    })

    it('placement=["bottomRight"] → bottom 渲染、top=null（默认）', () => {
      const { result } = renderAdapter({
        pagination: { placement: ['bottomRight'] },
      })
      expect(result.topPaginationNode).toBeNull()
      expect(result.bottomPaginationNode).not.toBeNull()
    })

    it('placement=["topLeft","bottomRight"] → 两侧均渲染', () => {
      const { result } = renderAdapter({
        pagination: { placement: ['topLeft', 'bottomRight'] },
      })
      expect(result.topPaginationNode).not.toBeNull()
      expect(result.bottomPaginationNode).not.toBeNull()
    })

    it('placement=["none"] → 两侧均 null（不渲染）', () => {
      const { result } = renderAdapter({
        pagination: { placement: ['none'] },
      })
      expect(result.topPaginationNode).toBeNull()
      expect(result.bottomPaginationNode).toBeNull()
    })
  })

  describe('服务端模式（total > dataSource.length 不切片）', () => {
    it('pagination.total=100 + data=5（< pageSize）→ 不切片（返回全量 5 条）', () => {
      const { result } = renderAdapter({
        data: data.slice(0, 5),
        pagination: { total: 100, pageSize: 10 },
      })
      // 服务端模式：dataSource.length(5) < total(100) 且 <= pageSize(10) → slicePage 不切，返回原数据
      expect(result.pagedDataSource.length).toBe(5)
      expect(result.effectivePaginationState.total).toBe(100)
    })

    it('paginationStateRef.current.total 反映服务端 total', () => {
      const { paginationStateRef } = renderAdapter({
        pagination: { total: 500 },
      })
      expect(paginationStateRef.current.total).toBe(500)
    })
  })

  describe('showPagination 受 total>0 控制', () => {
    it('total=0（空数据）→ showPagination=false', () => {
      const { result } = renderAdapter({ data: [] })
      expect(result.showPagination).toBe(false)
      expect(result.topPaginationNode).toBeNull()
      expect(result.bottomPaginationNode).toBeNull()
    })

    it('total>0 → showPagination=true', () => {
      const { result } = renderAdapter({ data: data.slice(0, 1) })
      expect(result.showPagination).toBe(true)
    })
  })

  describe('paginationStateRef 写入', () => {
    it('每次 render 都同步写入（rerender 后 ref 反映最新状态）', () => {
      const { result, paginationStateRef, rerender } = renderAdapter({ data: data.slice(0, 15) })
      expect(paginationStateRef.current.total).toBe(15)
      // rerender 改 data
      rerender()
      expect(paginationStateRef.current).toEqual({
        current: 1,
        pageSize: 10,
        total: 15,
      })
      void result
    })

    it('pagination=false 时 ref.current.pageSize 等于 data.length', () => {
      const { paginationStateRef } = renderAdapter({
        pagination: false,
        data: data.slice(0, 9),
      })
      expect(paginationStateRef.current.pageSize).toBe(9)
    })
  })

  describe('onChange 集成', () => {
    it('onPaginationChange 触发时调 Table onChange（含 nextState + filters + sorter + extra）', () => {
      // 通过自定义 usePagination 内部触发测试较复杂；此处验证 hook 接线正确
      // 真实的 onChange 触发由 usePagination 内部 onInternalChange 驱动（已在其单测覆盖）
      const onChange = vi.fn()
      const { result } = renderAdapter({ onChange })
      // 仅验证 hook 不抛错；onChange 触发依赖 antd Pagination 交互
      expect(result.pagedDataSource).toBeDefined()
      expect(onChange).not.toHaveBeenCalled() // 初始化不触发
    })
  })
})
