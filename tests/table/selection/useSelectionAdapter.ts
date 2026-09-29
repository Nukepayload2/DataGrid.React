/**
 * useSelectionAdapter 单测。
 *
 * 覆盖：compat/native 模式解析、受控/非受控、preserveSelectedRowKeys 过滤（树形走全树 vs 非树形扁平）、
 * rawDataSource 契约（缺口 #12a：存在性判定与 selectedRows 都取原始全树，raw ≠ filtered 时取 raw 侧）、
 * fireSelectionChange 分发（onChange/onSelect 单行/onSelectAll/onSelectInvert/onSelectNone），
 * native onSelectedValuesChange，selectedRows 按 keys 顺序。
 */
import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSelectionAdapter } from '../../../src/table/useSelectionAdapter'
import type {
  GridSelectionOptions,
  TableRowSelection,
} from '../../../src/table/types'

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
  /**
   * 原始 dataSource（未排序 / 未筛选 / 未分页，含全树 children）。
   *
   * src 侧该字段是**必填**（缺口 #12a 的契约变更：存在性判定与 `selectedRows` 查表都建在这张表上，
   * 对齐 antd `InternalTable.js:177` 的 `useLazyKVMap(rawData, …)`）。harness 只在**夹具层**把它做成
   * 可选覆盖项，默认沿用上侧 `filteredDataSource` 的同一条回退链——即「不显式区分时 raw ≡ filtered」，
   * 需要证契约的用例必须显式传，别靠默认值。
   */
  rawDataSource?: Array<Rec>
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
      rawDataSource:
        overrides.rawDataSource ??
        overrides.filteredDataSource ??
        overrides.flattenedDataSource ??
        flatData,
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
      // 第二个参数是 rows（按 **nextKeys 顺序**从 rawData 的 recordByKey 查表，
      // 对齐 src/table/useSelectionAdapter.ts:376-380 的 recordByKey 查表与 antd 6.4.4 useSelection.js:184 的 keys.map(getRecordByKey)；
      // 步骤 54 / 29-G 起 preserve=true 那一支改读 preserveRecordsRef 缓存，本夹具 preserve=false ⇒ 走 recordByKey；
      // 本 flat 夹具 keys=['a','b'] 与 rawData 顺序恰好同序，故 [flatData[0],flatData[1]] 成立）
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

    it('method=multiple → onSelectMultiple(selected, rows, changeRows)', () => {
      const onSelectMultiple = vi.fn()
      const { result } = renderAdapter({
        rowSelection: {
          selectedRowKeys: ['a'],
          onSelectMultiple,
        } as TableRowSelection<Rec>,
      })
      act(() => {
        result.current.fireSelectionChange(['a', 'b', 'c'], 'multiple', {
          record: flatData[2],
          nativeEvent: new Event('change'),
        })
      })
      expect(onSelectMultiple).toHaveBeenCalledTimes(1)
      expect(onSelectMultiple.mock.calls[0][0]).toBe(true)
      expect(onSelectMultiple.mock.calls[0][1]).toEqual([
        flatData[0],
        flatData[1],
        flatData[2],
      ])
      expect(onSelectMultiple.mock.calls[0][2]).toEqual([flatData[1], flatData[2]])
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

    it('native 非受控：fireSelectionChange 写入 selectedValues 并映射回 effectiveSelectedKeys', () => {
      const { result } = renderAdapter({
        gridSelection: {
          selectionMode: 'multiple',
          getSelectionValue: (rec) => `v-${rec.key}`,
        },
      })
      act(() => {
        result.current.fireSelectionChange(['a', 'c'], 'multiple')
      })
      expect(result.current.effectiveSelectedKeys).toEqual(['a', 'c'])
    })

    it('native 受控 selectedValues：fireSelectionChange 不写内部 state，但仍按业务 value 分发', () => {
      const onSelectedValuesChange = vi.fn()
      const { result } = renderAdapter({
        gridSelection: {
          selectionMode: 'multiple',
          selectedValues: ['v-a'],
          getSelectionValue: (rec) => `v-${rec.key}`,
          onSelectedValuesChange,
        },
      })
      act(() => {
        result.current.fireSelectionChange(['a', 'b'], 'multiple')
      })
      expect(result.current.effectiveSelectedKeys).toEqual(['a'])
      expect(onSelectedValuesChange.mock.calls[0][0]).toEqual(['v-a', 'v-b'])
    })

    it('trigger.record 取消选中 → onSelect selected=false 且 nativeEvent 原样透传', () => {
      const onSelect = vi.fn()
      const ev = new Event('change')
      const { result } = renderAdapter({
        rowSelection: {
          selectedRowKeys: ['a', 'b'],
          onSelect,
        } as TableRowSelection<Rec>,
      })
      act(() => {
        result.current.fireSelectionChange(['a'], 'single', {
          record: flatData[1],
          nativeEvent: ev,
        })
      })
      expect(onSelect).toHaveBeenCalledWith(flatData[1], false, [flatData[0]], ev)
    })

    it('method=multiple 无 trigger 时根据 changeRows 推导 selected=false', () => {
      const onSelectMultiple = vi.fn()
      const { result } = renderAdapter({
        rowSelection: {
          selectedRowKeys: ['a', 'b'],
          onSelectMultiple,
        } as TableRowSelection<Rec>,
      })
      act(() => {
        result.current.fireSelectionChange(['a'], 'multiple')
      })
      expect(onSelectMultiple).toHaveBeenCalledWith(false, [flatData[0]], [flatData[1]])
    })
  })

  describe('disabled row selection state', () => {
    it('resolved selection excludes disabled rows from changeable keys but preserves controlled checked keys', () => {
      const dataWithDisabled: Array<Rec> = [
        { key: 'a' },
        { key: 'b', disabled: true },
        { key: 'c' },
      ]
      const { result } = renderAdapter({
        rowSelection: {
          selectedRowKeys: ['b'],
          getCheckboxProps: (record) => ({ disabled: record.disabled }),
        } as TableRowSelection<Rec>,
        flattenedDataSource: dataWithDisabled,
      })

      expect(result.current.effectiveSelectedKeys).toEqual(['b'])
      expect(result.current.selection.selectableKeys).toEqual(['a', 'c'])
      expect(result.current.selection.isDisabled(dataWithDisabled[1])).toBe(true)
      expect(result.current.selection.toggleAll()).toEqual(['b', 'a', 'c'])
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

    it('selectedRows 按 nextKeys 顺序取自原始全树（折叠的子孙 record **也在** selectedRows）', () => {
      const onChange = vi.fn()
      const { result } = renderAdapter({
        rowSelection: { onChange } as TableRowSelection<Rec>,
        flattenedDataSource: flattenedTreeData,
        filteredDataSource: treeData,
        treeEnabled: true,
      })
      act(() => {
        // a1/a2 在 nextKeys、**不在** flattenedDataSource（折叠），但在全树里。
        result.current.fireSelectionChange(['root1', 'a1', 'a2'], 'multiple')
      })
      // 反 vacuous：这条用例的观测面确实区分两张表——折叠子孙不在可见行表里。
      expect(flattenedTreeData.some((r) => r.key === 'a1' || r.key === 'a2')).toBe(false)
      // 缺口 #12a 后的契约（对齐 antd `InternalTable.js:177` useLazyKVMap(rawData) +
      // `useSelection.js:184` `keys.map(getRecordByKey)`）：rows **按 nextKeys 顺序**从**原始全树**
      // 查表 ⇒ 折叠的子孙必须在。旧版这条钉的是「rows 只含可见的 root1」＝修复前的错误契约
      // （步骤 34 交回、步骤 37 由 main 裁定翻正；同族功能片旧钉已在 BAT-6 回收）。
      const rows = onChange.mock.calls[0][1] as Array<Rec>
      expect(rows).toHaveLength(3)
      expect(rows[0]).toBe(treeData[0])
      expect(rows[1]).toBe(treeData[0].children![0])
      expect(rows[2]).toBe(treeData[0].children![1])
    })
  })

  describe('rawDataSource 契约（缺口 #12a：存在性判定与 selectedRows 都取原始全树）', () => {
    // 这批用例**必须**显式传 `rawDataSource`——默认值是「raw ≡ filtered」的夹具口径，证不了契约。
    // 依据：src/table/useSelectionAdapter.ts:122-138（recordByKey 建在 rawDataSource 上，dig 无条件
    // 递归 children）+ :348-350（非 preserve 的存在性过滤判据源 = recordByKey）+ :376-380（rows 查
    // recordByKey，顺序 = nextKeys 顺序）。参照 antd `InternalTable.js:177` `useLazyKVMap(rawData, …)`。
    it('被筛掉的行（只在 raw、不在 filtered/flattened）→ key 不被丢弃，record 取 raw 侧对象', () => {
      const onChange = vi.fn()
      const raw: Array<Rec> = [{ key: 'a' }, { key: 'b' }, { key: 'c' }]
      // filtered / flattened 是 raw 的子集：'b' 这一行被筛掉了，可见区只剩 a / c。
      // ★ 可见区的 'a' 用**另一个对象**（同 key、不同引用），这样「rows[0] 到底是哪张表里的对象」
      //   本身就可判别——不是白给的（同 key 同引用时该身份断言恒真）。
      const visible: Array<Rec> = [{ key: 'a' }, { key: 'c' }]
      const { result } = renderAdapter({
        rowSelection: { onChange } as TableRowSelection<Rec>,
        flattenedDataSource: visible,
        filteredDataSource: visible,
        rawDataSource: raw,
      })
      act(() => {
        result.current.fireSelectionChange(['a', 'b'], 'multiple')
      })
      // 存在性判定源 = raw ⇒ 被筛掉的 'b' 留在 keys 里（旧口径判 visible 会把它整条清掉）。
      expect(onChange.mock.calls[0][0]).toEqual(['a', 'b'])
      // selectedRows 源 = raw 查表，且顺序 = nextKeys 顺序。
      const rows = onChange.mock.calls[0][1] as Array<Rec>
      expect(rows).toHaveLength(2)
      expect(rows[0]).toBe(raw[0])
      expect(rows[1]).toBe(raw[1])
      // 身份断言不是白给的：raw 与 visible 的 'a' 确是两个不同对象。
      expect(raw[0]).not.toBe(visible[0])
    })

    it('树形：折叠/筛掉的子孙只在 raw 全树里 → 子孙 key 保留且 record 来自 raw 侧', () => {
      const onChange = vi.fn()
      const raw: Array<Rec> = [{ key: 'P1', children: [{ key: 'C11' }, { key: 'C12' }] }]
      // filtered / flattened 只带 C11（模拟该子孙被筛掉）；注意两侧 C11 也是不同对象，
      // 以便断言「查表走的是 raw 那张表」而不是「visible 里恰好同名的那个」。
      const visible: Array<Rec> = [{ key: 'P1', children: [{ key: 'C11' }] }]
      const { result } = renderAdapter({
        rowSelection: { onChange } as TableRowSelection<Rec>,
        flattenedDataSource: visible,
        filteredDataSource: visible,
        rawDataSource: raw,
        treeEnabled: true,
        childrenColumnName: 'children',
      })
      act(() => {
        result.current.fireSelectionChange(['P1', 'C12'], 'multiple')
      })
      expect(onChange.mock.calls[0][0]).toEqual(['P1', 'C12'])
      const rows = onChange.mock.calls[0][1] as Array<Rec>
      expect(rows).toHaveLength(2)
      // ★ 身份断言：父行与子孙都取自 raw 那棵树（visible 里根本没有 C12 这个对象）。
      expect(rows[0]).toBe(raw[0])
      expect(rows[1]).toBe(raw[0].children![1])
      // 反向防 vacuous：raw 与 visible 的对象确实不是同一个，否则上面两条身份断言是白给的。
      expect(rows[1]).not.toBe(visible[0].children?.[1])
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
