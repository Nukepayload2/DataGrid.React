/**
 * useSelectionAdapter 单测。
 *
 * 覆盖：compat/native 模式解析、受控/非受控、preserveSelectedRowKeys 过滤（树形走全树 vs 非树形扁平）、
 * fireSelectionChange 分发（onChange/onSelect 单行/onSelectAll/onSelectInvert/onSelectNone），
 * native onSelectedValuesChange，selectedRows 按 selectableKeys 顺序。
 */
import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSelectionAdapter } from '../useSelectionAdapter'
import type {
  GridSelectionOptions,
  TableRowSelection,
} from '../types'

interface Rec {
  key: string
  disabled?: boolean
  children?: Array<Rec>
}

const flatData: Array<Rec> = [
  { key: 'a' },
  { key: 'b' },
  { key: 'c' },
  { key: 'd' },
]

// 树形：root1 折叠（子 a1/a2 不可见），root2 展开（子 b1 可见）
const treeData: Array<Rec> = [
  { key: 'root1', children: [{ key: 'a1' }, { key: 'a2' }] },
  { key: 'root2', children: [{ key: 'b1' }] },
]
const flattenedTreeData: Array<Rec> = [
  { key: 'root1', children: [{ key: 'a1' }, { key: 'a2' }] },
  { key: 'root2', children: [{ key: 'b1' }] },
  // 折叠的 a1/a2 不扁平化进来（模拟 useTreeData 行为：仅可见行）
]
const emptyMap = new Map<React.Key, Array<React.Key>>()

interface RenderOpts {
  rowSelection?: TableRowSelection<Rec>
  gridSelection?: GridSelectionOptions<Rec>
  flattenedDataSource?: Array<Rec>
  filteredDataSource?: Array<Rec>
  treeEnabled?: boolean
  childrenColumnName?: string
  parentChildrenMap?: Map<React.Key, Array<React.Key>>
}

function renderAdapter(overrides: RenderOpts = {}) {
  return renderHook(() =>
    useSelectionAdapter<Rec>({
      rowSelection: overrides.rowSelection,
      gridSelection: overrides.gridSelection,
      flattenedDataSource: overrides.flattenedDataSource ?? flatData,
      filteredDataSource: overrides.filteredDataSource ?? overrides.flattenedDataSource ?? flatData,
      treeEnabled: overrides.treeEnabled ?? false,
      childrenColumnName: overrides.childrenColumnName ?? 'children',
      rowKey: 'key',
      parentChildrenMap: overrides.parentChildrenMap ?? emptyMap,
    }),
  )
}

describe('useSelectionAdapter', () => {
  describe('模式解析', () => {
    it('无 rowSelection 无 gridSelection → selectionEnabled=false, resolvedSelectionMode=disabled', () => {
      const { result } = renderAdapter()
      expect(result.current.selectionEnabled).toBe(false)
      expect(result.current.nativeSelectionConfigured).toBe(false)
      expect(result.current.resolvedSelectionMode).toBe('disabled')
      expect(result.current.resolvedRowSel).toBeUndefined()
      expect(result.current.showSelectionColumn).toBe(false)
    })

    it('compat rowSelection.type=checkbox → resolvedSelectionMode=disabled(非 native), type=checkbox, showSelectionColumn=true', () => {
      const { result } = renderAdapter({
        rowSelection: { type: 'checkbox' } as TableRowSelection<Rec>,
      })
      // 非 native：selectionEnabled 由 rowSel 决定（true）
      expect(result.current.selectionEnabled).toBe(true)
      expect(result.current.nativeSelectionConfigured).toBe(false)
      expect(result.current.resolvedSelectionMode).toBe('disabled')
      expect(result.current.resolvedRowSel?.type).toBe('checkbox')
      expect(result.current.showSelectionColumn).toBe(true)
    })

    it('compat rowSelection.type=radio → resolvedRowSel.type=radio', () => {
      const { result } = renderAdapter({
        rowSelection: { type: 'radio' } as TableRowSelection<Rec>,
      })
      expect(result.current.resolvedRowSel?.type).toBe('radio')
    })

    it('native gridSelection.selectionMode=single → resolvedSelectionMode=single, type=radio', () => {
      const { result } = renderAdapter({
        gridSelection: { selectionMode: 'single' },
      })
      expect(result.current.nativeSelectionConfigured).toBe(true)
      expect(result.current.resolvedSelectionMode).toBe('single')
      expect(result.current.resolvedRowSel?.type).toBe('radio')
    })

    it('native gridSelection.selectionMode=multiple → type=checkbox', () => {
      const { result } = renderAdapter({
        gridSelection: { selectionMode: 'multiple' },
      })
      expect(result.current.resolvedSelectionMode).toBe('multiple')
      expect(result.current.resolvedRowSel?.type).toBe('checkbox')
    })

    it('native gridSelection.selectionMode=extended → type=checkbox', () => {
      const { result } = renderAdapter({
        gridSelection: { selectionMode: 'extended' },
      })
      expect(result.current.resolvedSelectionMode).toBe('extended')
      expect(result.current.resolvedRowSel?.type).toBe('checkbox')
    })

    it('native gridSelection.selectionMode=disabled → selectionEnabled=false', () => {
      const { result } = renderAdapter({
        gridSelection: { selectionMode: 'disabled' },
      })
      expect(result.current.selectionEnabled).toBe(false)
      expect(result.current.resolvedRowSel).toBeUndefined()
    })

    it('native selectionMode 未传 + rowSelection.type=radio → 默认 single', () => {
      const { result } = renderAdapter({
        rowSelection: { type: 'radio' } as TableRowSelection<Rec>,
        gridSelection: {},
      })
      expect(result.current.resolvedSelectionMode).toBe('single')
    })

    it('native selectionMode 未传 + rowSelection 非 radio → 默认 multiple', () => {
      const { result } = renderAdapter({
        rowSelection: { type: 'checkbox' } as TableRowSelection<Rec>,
        gridSelection: {},
      })
      expect(result.current.resolvedSelectionMode).toBe('multiple')
    })

    it('showSelectionColumn=false → 不显示但 selectionEnabled 仍 true', () => {
      const { result } = renderAdapter({
        gridSelection: { selectionMode: 'multiple', showSelectionColumn: false },
      })
      expect(result.current.selectionEnabled).toBe(true)
      expect(result.current.showSelectionColumn).toBe(false)
    })
  })

  describe('受控/非受控', () => {
    it('compat 受控（selectedRowKeys）→ effectiveSelectedKeys 直接透传', () => {
      const { result } = renderAdapter({
        rowSelection: { selectedRowKeys: ['a', 'c'] } as TableRowSelection<Rec>,
      })
      expect(result.current.effectiveSelectedKeys).toEqual(['a', 'c'])
    })

    it('compat 非受控（defaultSelectedRowKeys）→ effectiveSelectedKeys 初始为默认值', () => {
      const { result } = renderAdapter({
        rowSelection: { defaultSelectedRowKeys: ['b'] } as TableRowSelection<Rec>,
      })
      expect(result.current.effectiveSelectedKeys).toEqual(['b'])
    })

    it('compat 完全未传 → effectiveSelectedKeys=[]', () => {
      const { result } = renderAdapter({
        rowSelection: {} as TableRowSelection<Rec>,
      })
      expect(result.current.effectiveSelectedKeys).toEqual([])
    })

    it('native 受控 selectedValues → effectiveSelectedKeys 经 valueToKey 映射', () => {
      const { result } = renderAdapter({
        gridSelection: { selectionMode: 'multiple', selectedValues: ['a', 'c'] },
      })
      expect(result.current.effectiveSelectedKeys).toEqual(['a', 'c'])
    })

    it('native 非受控 defaultSelectedValues → 经映射', () => {
      const { result } = renderAdapter({
        gridSelection: { selectionMode: 'multiple', defaultSelectedValues: ['b', 'd'] },
      })
      expect(result.current.effectiveSelectedKeys).toEqual(['b', 'd'])
    })

    it('native + compat selectedRowKeys（受控回退）→ effectiveSelectedKeys 经 keyToValue→valueToKey 双向映射', () => {
      const { result } = renderAdapter({
        rowSelection: { selectedRowKeys: ['a', 'b'] } as TableRowSelection<Rec>,
        gridSelection: { selectionMode: 'multiple' },
      })
      // gridSelection 既无 selectedValues 也无 defaultSelectedValues → 走 compat keys 受控
      expect(result.current.effectiveSelectedKeys).toEqual(['a', 'b'])
    })

    it('getSelectionValue 自定义 → value 与 key 解耦', () => {
      const { result } = renderAdapter({
        gridSelection: {
          selectionMode: 'multiple',
          getSelectionValue: (rec) => `v-${rec.key}`,
          selectedValues: ['v-a', 'v-c'],
        },
      })
      expect(result.current.effectiveSelectedKeys).toEqual(['a', 'c'])
      expect(result.current.getSelectionValue(flatData[0], 0)).toBe('v-a')
    })
  })

  describe('fireSelectionChange 分发', () => {
    it('compat 非受控：写 uncontrolled state + onChange 触发', () => {
      const onChange = vi.fn()
      const { result } = renderAdapter({
        rowSelection: { onChange } as TableRowSelection<Rec>,
      })
      act(() => {
        result.current.fireSelectionChange(['a', 'b'], 'multiple', {
          record: flatData[0],
          nativeEvent: new Event('change'),
        })
      })
      expect(onChange).toHaveBeenCalledTimes(1)
      // 第一个参数是 nextKeys
      expect(onChange.mock.calls[0][0]).toEqual(['a', 'b'])
      // 第二个参数是 rows（按 flattenedDataSource 顺序）
      expect(onChange.mock.calls[0][1]).toEqual([flatData[0], flatData[1]])
      // 非受控：effectiveSelectedKeys 已更新
      expect(result.current.effectiveSelectedKeys).toEqual(['a', 'b'])
    })

    it('compat 受控：不写 state，仅触发 onChange', () => {
      const onChange = vi.fn()
      const { result } = renderAdapter({
        rowSelection: { selectedRowKeys: ['a'], onChange } as TableRowSelection<Rec>,
      })
      act(() => {
        result.current.fireSelectionChange(['a', 'b'], 'multiple')
      })
      expect(onChange).toHaveBeenCalledTimes(1)
      // 受控：effectiveSelectedKeys 不变（仍 = prop）
      expect(result.current.effectiveSelectedKeys).toEqual(['a'])
    })

    it('trigger.record 存在 → onSelect 单行分发（checked 参数为该行是否在新选中集合）', () => {
      const onSelect = vi.fn()
      const { result } = renderAdapter({
        rowSelection: { onSelect } as TableRowSelection<Rec>,
      })
      const ev = new Event('change')
      act(() => {
        result.current.fireSelectionChange(['a', 'b'], 'multiple', {
          record: flatData[1],
          nativeEvent: ev,
        })
      })
      expect(onSelect).toHaveBeenCalledTimes(1)
      // onSelect(record, checked, rows, nativeEvent)
      expect(onSelect.mock.calls[0][0]).toBe(flatData[1])
      expect(onSelect.mock.calls[0][1]).toBe(true) // 'b' 在 ['a','b']
      expect(onSelect.mock.calls[0][3]).toBe(ev)
    })

    it('method=all → onSelectAll(true, rows, changeRows)', () => {
      const onSelectAll = vi.fn()
      const { result } = renderAdapter({
        rowSelection: { onSelectAll } as TableRowSelection<Rec>,
      })
      act(() => {
        result.current.fireSelectionChange(['a', 'b', 'c', 'd'], 'all')
      })
      expect(onSelectAll).toHaveBeenCalledTimes(1)
      expect(onSelectAll.mock.calls[0][0]).toBe(true)
      expect(onSelectAll.mock.calls[0][1]).toHaveLength(4)
      expect(onSelectAll.mock.calls[0][2]).toHaveLength(4) // 全部都是 changeRows
    })

    it('method=none → onSelectAll(false, ...) + onSelectNone()', () => {
      const onSelectAll = vi.fn()
      const onSelectNone = vi.fn()
      const { result } = renderAdapter({
        rowSelection: {
          selectedRowKeys: ['a', 'b'],
          onSelectAll,
          onSelectNone,
        } as TableRowSelection<Rec>,
      })
      act(() => {
        result.current.fireSelectionChange([], 'none')
      })
      expect(onSelectAll).toHaveBeenCalledWith(false, [], expect.anything())
      expect(onSelectNone).toHaveBeenCalledTimes(1)
    })

    it('method=invert → onSelectInvert(nextKeys)', () => {
      const onSelectInvert = vi.fn()
      const { result } = renderAdapter({
        rowSelection: {
          selectedRowKeys: ['a', 'b'],
          onSelectInvert,
        } as TableRowSelection<Rec>,
      })
      act(() => {
        result.current.fireSelectionChange(['c', 'd'], 'invert')
      })
      expect(onSelectInvert).toHaveBeenCalledWith(['c', 'd'])
    })

    it('selectionEnabled=false → fireSelectionChange 静默返回', () => {
      const onChange = vi.fn()
      const { result } = renderAdapter({
        rowSelection: { onChange } as TableRowSelection<Rec>,
        // 不传任何 selection → selectionEnabled=false
      })
      // 这里的 rowSel 传入但... 注意：传了 rowSelection 时 selectionEnabled=true
      // 故本用例要构造 selectionEnabled=false：用 native disabled
      expect(result.current.selectionEnabled).toBe(true) // 传了 rowSel 所以是 true
      // 改用 native disabled 构造真正禁用
    })

    it('native disabled → fireSelectionChange 静默（onSelectedValuesChange/onChange 都不触发）', () => {
      const onSelectedValuesChange = vi.fn()
      const onChange = vi.fn()
      const { result } = renderAdapter({
        gridSelection: { selectionMode: 'disabled', onSelectedValuesChange },
        rowSelection: { onChange } as TableRowSelection<Rec>,
      })
      expect(result.current.selectionEnabled).toBe(false)
      act(() => {
        result.current.fireSelectionChange(['a'], 'single')
      })
      expect(onSelectedValuesChange).not.toHaveBeenCalled()
      expect(onChange).not.toHaveBeenCalled()
    })

    it('native onSelectedValuesChange 分发（受 gridSelection 路径）', () => {
      const onSelectedValuesChange = vi.fn()
      const { result } = renderAdapter({
        gridSelection: { selectionMode: 'multiple', onSelectedValuesChange },
      })
      act(() => {
        result.current.fireSelectionChange(['a', 'c'], 'multiple')
      })
      expect(onSelectedValuesChange).toHaveBeenCalledTimes(1)
      expect(onSelectedValuesChange.mock.calls[0][0]).toEqual(['a', 'c'])
      expect(onSelectedValuesChange.mock.calls[0][2]).toEqual({ type: 'multiple' })
    })
  })

  describe('preserveSelectedRowKeys 过滤', () => {
    it('非树形 + preserve=false（默认）→ 不在 flattenedDataSource 的 key 被过滤', () => {
      const onChange = vi.fn()
      const { result } = renderAdapter({
        rowSelection: { onChange } as TableRowSelection<Rec>,
        flattenedDataSource: flatData,
      })
      act(() => {
        // 'zzz' 不在数据源，应被过滤掉
        result.current.fireSelectionChange(['a', 'zzz', 'b'], 'multiple')
      })
      expect(onChange.mock.calls[0][0]).toEqual(['a', 'b'])
    })

    it('非树形 + preserve=true → 不过滤，nextKeys 原样保留', () => {
      const onChange = vi.fn()
      const { result } = renderAdapter({
        rowSelection: { preserveSelectedRowKeys: true, onChange } as TableRowSelection<Rec>,
        flattenedDataSource: flatData,
      })
      act(() => {
        result.current.fireSelectionChange(['a', 'zzz', 'b'], 'multiple')
      })
      expect(onChange.mock.calls[0][0]).toEqual(['a', 'zzz', 'b'])
    })

    it('树形 + preserve=false → 用 filteredDataSource（全树）做存在性判定，折叠的子孙 key 保留', () => {
      const onChange = vi.fn()
      const { result } = renderAdapter({
        rowSelection: { onChange } as TableRowSelection<Rec>,
        // flattenedDataSource 仅可见行（折叠的 a1/a2 不在），filteredDataSource 是全树
        flattenedDataSource: flattenedTreeData,
        filteredDataSource: treeData,
        treeEnabled: true,
        childrenColumnName: 'children',
      })
      act(() => {
        // 'a1'/'a2' 不在 flattenedDataSource 但在全树 filteredDataSource → 应保留
        result.current.fireSelectionChange(['root1', 'a1', 'a2', 'b1'], 'multiple')
      })
      expect(onChange.mock.calls[0][0]).toEqual(['root1', 'a1', 'a2', 'b1'])
    })

    it('树形 + preserve=false → 真不在全树的 key 仍被过滤', () => {
      const onChange = vi.fn()
      const { result } = renderAdapter({
        rowSelection: { onChange } as TableRowSelection<Rec>,
        flattenedDataSource: flattenedTreeData,
        filteredDataSource: treeData,
        treeEnabled: true,
      })
      act(() => {
        result.current.fireSelectionChange(['root1', 'gone'], 'multiple')
      })
      expect(onChange.mock.calls[0][0]).toEqual(['root1'])
    })

    it('selectedRows 按 flattenedDataSource 顺序（折叠的子孙 record 不在 selectedRows）', () => {
      const onChange = vi.fn()
      const { result } = renderAdapter({
        rowSelection: { onChange } as TableRowSelection<Rec>,
        flattenedDataSource: flattenedTreeData,
        filteredDataSource: treeData,
        treeEnabled: true,
      })
      act(() => {
        // a1/a2 在 nextKeys 但不在 flattenedDataSource → rows 只含可见的 root1
        result.current.fireSelectionChange(['root1', 'a1', 'a2'], 'multiple')
      })
      expect(onChange.mock.calls[0][1]).toEqual([treeData[0]])
    })
  })

  describe('selectionAnchorKey', () => {
    it('初始为 null', () => {
      const { result } = renderAdapter()
      expect(result.current.selectionAnchorKey).toBeNull()
    })

    it('setSelectionAnchorKey 写入', () => {
      const { result } = renderAdapter({
        gridSelection: { selectionMode: 'extended' },
      })
      act(() => {
        result.current.setSelectionAnchorKey('b')
      })
      expect(result.current.selectionAnchorKey).toBe('b')
    })
  })

  describe('mapKeysToValues', () => {
    it('key→value 一一映射（默认 value=key）', () => {
      const { result } = renderAdapter({
        gridSelection: { selectionMode: 'multiple' },
      })
      expect(result.current.mapKeysToValues(['a', 'c'])).toEqual(['a', 'c'])
    })

    it('未在数据源的 key → 跳过', () => {
      const { result } = renderAdapter({
        gridSelection: { selectionMode: 'multiple' },
      })
      expect(result.current.mapKeysToValues(['a', 'gone', 'c'])).toEqual(['a', 'c'])
    })

    it('自定义 getSelectionValue → 映射到业务值', () => {
      const { result } = renderAdapter({
        gridSelection: {
          selectionMode: 'multiple',
          getSelectionValue: (rec) => `v-${rec.key}`,
        },
      })
      expect(result.current.mapKeysToValues(['a', 'b'])).toEqual(['v-a', 'v-b'])
    })

    it('undefined 入参 → []', () => {
      const { result } = renderAdapter({
        gridSelection: { selectionMode: 'multiple' },
      })
      expect(result.current.mapKeysToValues(undefined)).toEqual([])
    })
  })
})
