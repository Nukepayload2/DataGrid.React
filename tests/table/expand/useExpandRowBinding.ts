/**
 * useExpandRowBinding 单测。
 *
 * 覆盖：
 * - onRowWithExpand
 *   - 未启用 expand 也未启用行点击选择 → 透传原 onRow（不包装）
 *   - expandRowByClick：可展开行点击 → toggleExpand + 用户 onClick 共存
 *   - expandRowByClick：非可展开行点击 → 不 toggle，仅 onClick
 *   - 行点击选择 single / multiple / extended（无修饰 / ctrl-meta / shift+anchor / shift 无 anchor）
 *   - shouldSkipRowSelectionClick → 跳过选择（但仍 expand + onClick）
 *   - selection.isDisabled → 跳过选择
 *   - 用户 onClick 永远保留
 * - rowClassNameWithExpand
 *   - 无 expandedRowClassName → 原样返回 rowClassName
 *   - rowClassName=string → 归一为常量函数
 *   - rowClassName=函数 → 保留求值
 *   - 展开 → 追加 expandedRowClassName
 *   - 收起 → 仅 base
 *   - 二者拼合 filter(Boolean).join(' ')
 */
import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useExpandRowBinding } from '../../../src/table/useExpandRowBinding'
import type {
  UseExpandRowBindingOptions,
} from '../../../src/table/useExpandRowBinding'
import type {
  Expandable,
  GridSelectionMode,
  RowSelectMethod,
  TableProps,
} from '../../../src/table/types'
import type {
  UseRowExpandResult,
} from '../../../src/table/engine/useRowExpand'
import type {
  UseRowSelectionResult,
} from '../../../src/table/engine/useRowSelection'
import type {
  UseSelectionAdapterResult,
} from '../../../src/table/useSelectionAdapter'

interface Rec {
  key: string
}

const data: Array<Rec> = [
  { key: 'a' },
  { key: 'b' },
  { key: 'c' },
  { key: 'd' },
]

// ===== mock 工厂 =====

function makeExpand(
  overrides: Partial<UseRowExpandResult<Rec>> = {},
): UseRowExpandResult<Rec> {
  const expandableKeySet = overrides.expandableKeySet ?? new Set<React.Key>(['a', 'b'])
  const expandedRowKeys = overrides.expandedRowKeys ?? []
  const expandedSet = new Set<React.Key>(expandedRowKeys)
  return {
    expandEnabled: overrides.expandEnabled ?? true,
    expandableKeySet,
    expandedRowKeys,
    isExpanded: overrides.isExpanded ?? ((key: React.Key) => expandedSet.has(key)),
    toggleExpand:
      overrides.toggleExpand ?? vi.fn((key: React.Key, _record: Rec) => {
        if (expandedSet.has(key)) expandedSet.delete(key)
        else expandedSet.add(key)
      }),
  }
}

function makeSelection(
  overrides: Partial<UseRowSelectionResult<Rec>> = {},
): UseRowSelectionResult<Rec> {
  return {
    isRadio: overrides.isRadio ?? false,
    selectableKeys: overrides.selectableKeys ?? ['a', 'b', 'c', 'd'],
    selectableRecords: overrides.selectableRecords ?? data,
    selectedKeySet: overrides.selectedKeySet ?? new Set<React.Key>(),
    allSelected: overrides.allSelected ?? false,
    intermediate: overrides.intermediate ?? false,
    isSelected:
      overrides.isSelected ?? ((_key: React.Key) => false),
    isIndeterminate:
      overrides.isIndeterminate ?? ((_key: React.Key) => false),
    isDisabled: overrides.isDisabled ?? (() => false),
    toggleRow:
      overrides.toggleRow ??
      vi.fn((key: React.Key) => {
        // 简化：返回 [key] 作为 nextKeys
        return [key]
      }),
    toggleAll: overrides.toggleAll ?? vi.fn(() => []),
    selectRow:
      overrides.selectRow ??
      vi.fn((key: React.Key) => {
        return [key]
      }),
    changeableRowKeys: overrides.changeableRowKeys ?? ['a', 'b', 'c', 'd'],
    resolvedSelections: overrides.resolvedSelections ?? null,
    applySelection: overrides.applySelection ?? vi.fn(),
  } as unknown as UseRowSelectionResult<Rec>
}

// fireSelectionChange 用 Mock 实现：vi.fn 返回 Mock，断言为接口签名 + 保留 .mock 访问。
type FireSelectionChangeMock = UseSelectionAdapterResult<Rec>['fireSelectionChange'] &
  { mock: ReturnType<typeof vi.fn>['mock'] }

function makeFireSelectionChange(): FireSelectionChangeMock {
  return vi.fn(
    (
      _nextKeys: Array<React.Key>,
      _method: RowSelectMethod,
      _trigger?: { record?: Rec; nativeEvent?: Event },
    ) => {},
  ) as unknown as FireSelectionChangeMock
}

// 取 onRowWithExpand 返回的 props（断言为非 undefined——测试里我们总是注入了 onClick）。
interface RowClickProps {
  onClick: (e: React.MouseEvent<HTMLElement>) => void
}
function getRowProps(
  onRowWithExpand: TableProps<Rec>['onRow'],
  record: Rec,
  index: number,
): RowClickProps {
  const props = onRowWithExpand!(record, index)
  // 测试场景：要么是用户 onRow 注入的 onClick，要么是包装后注入的 onClick——非 undefined。
  return props as unknown as RowClickProps
}

interface RenderOpts {
  expandEnabled?: boolean
  expandable?: Expandable<Rec> | undefined
  expand?: UseRowExpandResult<Rec>
  onRow?: TableProps<Rec>['onRow']
  rowClassName?: TableProps<Rec>['rowClassName']
  nativeSelectionConfigured?: boolean
  resolvedSelectionMode?: GridSelectionMode
  selection?: UseRowSelectionResult<Rec>
  selectionAnchorKey?: React.Key | null
  effectiveSelectedKeys?: Array<React.Key>
  fireSelectionChange?: FireSelectionChangeMock
}

function renderBinding(overrides: RenderOpts = {}) {
  const setSelectionAnchorKey = vi.fn()
  const fireSelectionChange =
    overrides.fireSelectionChange ?? makeFireSelectionChange()
  const options: UseExpandRowBindingOptions<Rec> = {
    expandEnabled: overrides.expandEnabled ?? false,
    expandable: overrides.expandable,
    expand: overrides.expand ?? makeExpand(),
    onRow: overrides.onRow,
    rowClassName: overrides.rowClassName,
    rowKey: 'key',
    nativeSelectionConfigured: overrides.nativeSelectionConfigured ?? false,
    resolvedSelectionMode: overrides.resolvedSelectionMode ?? 'disabled',
    selection: overrides.selection ?? makeSelection(),
    selectionAnchorKey: overrides.selectionAnchorKey ?? null,
    setSelectionAnchorKey,
    effectiveSelectedKeys: overrides.effectiveSelectedKeys ?? [],
    fireSelectionChange,
  }
  const result = renderHook(() => useExpandRowBinding<Rec>(options))
  return { ...result, setSelectionAnchorKey, fireSelectionChange }
}

// 构造一个最小的 React.MouseEvent（避免依赖 jsdom 完整事件）
function makeMouseEvent(opts: {
  shiftKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  target?: EventTarget | null
} = {}): React.MouseEvent<HTMLElement> {
  const native = new MouseEvent('click', {
    shiftKey: opts.shiftKey ?? false,
    ctrlKey: opts.ctrlKey ?? false,
    metaKey: opts.metaKey ?? false,
  })
  // React 合成事件透传：我们只用这几个字段 + target + nativeEvent
  return {
    shiftKey: opts.shiftKey ?? false,
    ctrlKey: opts.ctrlKey ?? false,
    metaKey: opts.metaKey ?? false,
    target: opts.target ?? null,
    nativeEvent: native,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as React.MouseEvent<HTMLElement>
}

describe('useExpandRowBinding', () => {
  describe('onRowWithExpand - 透传', () => {
    it('expandEnabled=false 且无行点击选择 → 返回原 onRow（未包装）', () => {
      const onRow = vi.fn(() => ({ role: 'row' }))
      const { result } = renderBinding({
        expandEnabled: false,
        onRow,
        nativeSelectionConfigured: false,
        resolvedSelectionMode: 'disabled',
      })
      // 引用相等：未包装
      expect(result.current.onRowWithExpand).toBe(onRow)
    })

    it('expandEnabled=false 但行点击选择启用 → 仍包装（不返回原 onRow）', () => {
      const onRow = vi.fn(() => ({}))
      const { result } = renderBinding({
        expandEnabled: false,
        onRow,
        nativeSelectionConfigured: true,
        resolvedSelectionMode: 'single',
      })
      expect(result.current.onRowWithExpand).not.toBe(onRow)
    })
  })

  describe('onRowWithExpand - expandRowByClick', () => {
    it('expandRowByClick=true + 可展开行 → toggleExpand 被调 + 用户 onClick 也被调', () => {
      const toggleExpand = vi.fn()
      const expand = makeExpand({ toggleExpand })
      const userOnClick = vi.fn()
      const onRow = vi.fn((_record: Rec, _index: number) => ({
        onClick: userOnClick,
      }))
      const { result } = renderBinding({
        expandEnabled: true,
        expandable: { expandRowByClick: true },
        expand,
        onRow,
      })
      const props = getRowProps(result.current.onRowWithExpand, data[0], 0)
      const ev = makeMouseEvent({ target: null })
      act(() => {
        props.onClick(ev)
      })
      expect(toggleExpand).toHaveBeenCalledTimes(1)
      expect(toggleExpand).toHaveBeenCalledWith('a', data[0])
      expect(userOnClick).toHaveBeenCalledTimes(1)
      expect(userOnClick).toHaveBeenCalledWith(ev)
    })

    it('expandRowByClick=true + 非可展开行 → toggleExpand 不调，onClick 仍调', () => {
      const toggleExpand = vi.fn()
      const expand = makeExpand({ toggleExpand }) // expandableKeySet=['a','b']
      const userOnClick = vi.fn()
      const onRow = vi.fn(() => ({ onClick: userOnClick }))
      const { result } = renderBinding({
        expandEnabled: true,
        expandable: { expandRowByClick: true },
        expand,
        onRow,
      })
      // data[2].key='c' 不在 expandableKeySet
      const props = getRowProps(result.current.onRowWithExpand, data[2], 2)
      act(() => {
        props.onClick(makeMouseEvent({ target: null }))
      })
      expect(toggleExpand).not.toHaveBeenCalled()
      expect(userOnClick).toHaveBeenCalledTimes(1)
    })

    it('expandRowByClick=true 但 expandEnabled=false → 派生 expandRowByClick=false，不 toggle', () => {
      const toggleExpand = vi.fn()
      const expand = makeExpand({ toggleExpand })
      const onRow = vi.fn(() => ({}))
      const { result } = renderBinding({
        expandEnabled: false, // 注意：expandEnabled=false 关掉
        expandable: { expandRowByClick: true },
        expand,
        onRow,
      })
      // expandEnabled=false 且无行点击选择 → 返回原 onRow，未包装
      expect(result.current.onRowWithExpand).toBe(onRow)
    })
  })

  describe('onRowWithExpand - 行点击选择 single', () => {
    it('single → selectRow + setAnchor + fireSelectionChange(method=single, trigger含record/nativeEvent)', () => {
      const selectRow = vi.fn(() => ['a'])
      const selection = makeSelection({ selectRow })
      const userOnClick = vi.fn()
      const onRow = vi.fn(() => ({ onClick: userOnClick }))
      const { result, setSelectionAnchorKey, fireSelectionChange } = renderBinding({
        expandEnabled: false,
        onRow,
        nativeSelectionConfigured: true,
        resolvedSelectionMode: 'single',
        selection,
      })
      const props = getRowProps(result.current.onRowWithExpand, data[0], 0)
      const ev = makeMouseEvent({ target: null })
      act(() => {
        props.onClick(ev)
      })
      expect(selectRow).toHaveBeenCalledWith('a')
      expect(setSelectionAnchorKey).toHaveBeenCalledWith('a')
      expect(fireSelectionChange).toHaveBeenCalledTimes(1)
      const [nextKeys, method, trigger] = fireSelectionChange.mock.calls[0]
      expect(nextKeys).toEqual(['a'])
      expect(method).toBe('single')
      expect(trigger?.record).toBe(data[0])
      expect(trigger?.nativeEvent).toBe(ev.nativeEvent)
      // 用户 onClick 仍触发
      expect(userOnClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('onRowWithExpand - 行点击选择 multiple', () => {
    it('multiple → toggleRow + method=multiple + setAnchor', () => {
      const toggleRow = vi.fn(() => ['a', 'b'])
      const selection = makeSelection({ toggleRow })
      const onRow = vi.fn(() => ({}))
      const { result, setSelectionAnchorKey, fireSelectionChange } = renderBinding({
        nativeSelectionConfigured: true,
        resolvedSelectionMode: 'multiple',
        selection,
        onRow,
      })
      const props = getRowProps(result.current.onRowWithExpand, data[0], 0)
      act(() => {
        props.onClick(makeMouseEvent({ target: null }))
      })
      expect(toggleRow).toHaveBeenCalledWith('a')
      expect(setSelectionAnchorKey).toHaveBeenCalledWith('a')
      const [, method] = fireSelectionChange.mock.calls[0]
      expect(method).toBe('multiple')
    })
  })

  describe('onRowWithExpand - 行点击选择 extended', () => {
    it('extended 无修饰 → nextKeys=[key]，method=single，setAnchor', () => {
      const toggleRow = vi.fn()
      const selectRow = vi.fn()
      const selection = makeSelection({ toggleRow, selectRow })
      const onRow = vi.fn(() => ({}))
      const { result, setSelectionAnchorKey, fireSelectionChange } = renderBinding({
        nativeSelectionConfigured: true,
        resolvedSelectionMode: 'extended',
        selection,
        onRow,
      })
      const props = getRowProps(result.current.onRowWithExpand, data[1], 1)
      act(() => {
        props.onClick(makeMouseEvent({ target: null }))
      })
      // 无修饰 → 不调 toggleRow/selectRow，直接 nextKeys=[key]
      expect(toggleRow).not.toHaveBeenCalled()
      expect(selectRow).not.toHaveBeenCalled()
      const [nextKeys, method] = fireSelectionChange.mock.calls[0]
      expect(nextKeys).toEqual(['b'])
      expect(method).toBe('single')
      expect(setSelectionAnchorKey).toHaveBeenCalledWith('b')
    })

    it('extended + ctrl（additive）→ toggleRow 累加，method=multiple', () => {
      const toggleRow = vi.fn(() => ['a', 'b'])
      const selection = makeSelection({ toggleRow })
      const onRow = vi.fn(() => ({}))
      const { result, fireSelectionChange } = renderBinding({
        nativeSelectionConfigured: true,
        resolvedSelectionMode: 'extended',
        selection,
        onRow,
      })
      const props = getRowProps(result.current.onRowWithExpand, data[1], 1)
      act(() => {
        props.onClick(makeMouseEvent({ ctrlKey: true, target: null }))
      })
      expect(toggleRow).toHaveBeenCalledWith('b')
      const [nextKeys, method] = fireSelectionChange.mock.calls[0]
      expect(nextKeys).toEqual(['a', 'b'])
      expect(method).toBe('multiple')
    })

    it('extended + meta（additive）→ toggleRow 累加，method=multiple', () => {
      const toggleRow = vi.fn(() => ['a', 'b'])
      const selection = makeSelection({ toggleRow })
      const onRow = vi.fn(() => ({}))
      const { result, fireSelectionChange } = renderBinding({
        nativeSelectionConfigured: true,
        resolvedSelectionMode: 'extended',
        selection,
        onRow,
      })
      const props = getRowProps(result.current.onRowWithExpand, data[1], 1)
      act(() => {
        props.onClick(makeMouseEvent({ metaKey: true, target: null }))
      })
      expect(toggleRow).toHaveBeenCalledWith('b')
      expect(fireSelectionChange.mock.calls[0][1]).toBe('multiple')
    })

    it('extended + shift + anchor 存在 + 非 additive → nextKeys=range，range.length>1 → method=multiple', () => {
      const toggleRow = vi.fn()
      const selectRow = vi.fn()
      const selection = makeSelection({ toggleRow, selectRow })
      const onRow = vi.fn(() => ({}))
      const { result, fireSelectionChange } = renderBinding({
        nativeSelectionConfigured: true,
        resolvedSelectionMode: 'extended',
        selection, // selectableKeys=['a','b','c','d']
        selectionAnchorKey: 'a', // shift 锚点
        onRow,
      })
      // 点 'c'：range=['a','b','c']
      const props = getRowProps(result.current.onRowWithExpand, data[2], 2)
      act(() => {
        props.onClick(makeMouseEvent({ shiftKey: true, target: null }))
      })
      expect(toggleRow).not.toHaveBeenCalled()
      expect(selectRow).not.toHaveBeenCalled()
      const [nextKeys, method] = fireSelectionChange.mock.calls[0]
      expect(nextKeys).toEqual(['a', 'b', 'c'])
      expect(method).toBe('multiple') // range.length=3>1
    })

    it('extended + shift + anchor 存在 + range.length=1 → method=single', () => {
      const selection = makeSelection()
      const onRow = vi.fn(() => ({}))
      const { result, fireSelectionChange } = renderBinding({
        nativeSelectionConfigured: true,
        resolvedSelectionMode: 'extended',
        selection,
        selectionAnchorKey: 'b',
        onRow,
      })
      // 锚点='b'，点 'b' 自身：range=['b']
      const props = getRowProps(result.current.onRowWithExpand, data[1], 1)
      act(() => {
        props.onClick(makeMouseEvent({ shiftKey: true, target: null }))
      })
      const [nextKeys, method] = fireSelectionChange.mock.calls[0]
      expect(nextKeys).toEqual(['b'])
      expect(method).toBe('single')
    })

    it('extended + shift + ctrl（additive）→ 合并 effectiveSelectedKeys + range', () => {
      const toggleRow = vi.fn()
      const selection = makeSelection({ toggleRow })
      const onRow = vi.fn(() => ({}))
      const { result, fireSelectionChange } = renderBinding({
        nativeSelectionConfigured: true,
        resolvedSelectionMode: 'extended',
        selection,
        selectionAnchorKey: 'a',
        effectiveSelectedKeys: ['c'], // 已选 c
        onRow,
      })
      // shift 点 'b'：range=['a','b']，与 ['c'] 合并 → ['c','a','b']（顺序由 Set 迭代决定，至少含三元素）
      const props = getRowProps(result.current.onRowWithExpand, data[1], 1)
      act(() => {
        props.onClick(makeMouseEvent({ shiftKey: true, ctrlKey: true, target: null }))
      })
      const [nextKeys, method] = fireSelectionChange.mock.calls[0]
      expect(nextKeys).toHaveLength(3)
      expect(new Set(nextKeys)).toEqual(new Set(['a', 'b', 'c']))
      expect(method).toBe('multiple')
    })

    it('extended + shift 但 anchor=null → 退回 [key] 路径（不调 getRangeKeys），method=single', () => {
      // 用 selectableKeys 的 indexOf 退化路径无法直接观察，但可观察：fireSelectionChange 仅收到 [key]
      const selection = makeSelection()
      const onRow = vi.fn(() => ({}))
      const { result, fireSelectionChange } = renderBinding({
        nativeSelectionConfigured: true,
        resolvedSelectionMode: 'extended',
        selection,
        selectionAnchorKey: null, // ★ 无锚点
        onRow,
      })
      const props = getRowProps(result.current.onRowWithExpand, data[2], 2)
      act(() => {
        props.onClick(makeMouseEvent({ shiftKey: true, target: null }))
      })
      const [nextKeys, method] = fireSelectionChange.mock.calls[0]
      expect(nextKeys).toEqual(['c'])
      expect(method).toBe('single')
    })
  })

  describe('onRowWithExpand - 守卫', () => {
    it('shouldSkipRowSelectionClick(target)=true → 不触发选择也不 expand（仍触发用户 onClick）', () => {
      const selectRow = vi.fn()
      const toggleExpand = vi.fn()
      const expand = makeExpand({ toggleExpand })
      const selection = makeSelection({ selectRow })
      const userOnClick = vi.fn()
      const onRow = vi.fn(() => ({ onClick: userOnClick }))
      const { result, fireSelectionChange } = renderBinding({
        expandEnabled: true,
        expandable: { expandRowByClick: true },
        expand,
        nativeSelectionConfigured: true,
        resolvedSelectionMode: 'single',
        selection,
        onRow,
      })
      // 构造一个会被 shouldSkipRowSelectionClick 命中的 target（带 .dg-expand-icon）
      const skipTarget = document.createElement('span')
      skipTarget.className = 'dg-expand-icon'
      const props = getRowProps(result.current.onRowWithExpand, data[0], 0)
      act(() => {
        props.onClick(makeMouseEvent({ target: skipTarget }))
      })
      // 选择被守卫拦截
      expect(selectRow).not.toHaveBeenCalled()
      expect(fireSelectionChange).not.toHaveBeenCalled()
      // expand 也被 !skipInteraction 守卫拦截（实现里 expand 同样检查 skipInteraction）
      expect(toggleExpand).not.toHaveBeenCalled()
      // 但用户 onClick 仍触发（不受守卫影响）
      expect(userOnClick).toHaveBeenCalledTimes(1)
    })

    it('selection.isDisabled(record)=true → 不触发选择', () => {
      const selectRow = vi.fn()
      const isDisabled = vi.fn(() => true)
      const selection = makeSelection({ selectRow, isDisabled })
      const onRow = vi.fn(() => ({}))
      const { result, fireSelectionChange } = renderBinding({
        nativeSelectionConfigured: true,
        resolvedSelectionMode: 'single',
        selection,
        onRow,
      })
      const props = getRowProps(result.current.onRowWithExpand, data[0], 0)
      act(() => {
        props.onClick(makeMouseEvent({ target: null }))
      })
      expect(isDisabled).toHaveBeenCalledWith(data[0])
      expect(selectRow).not.toHaveBeenCalled()
      expect(fireSelectionChange).not.toHaveBeenCalled()
    })

    it('用户 onClick 永远保留（即使选择/expand 都不触发）', () => {
      const userOnClick = vi.fn()
      const onRow = vi.fn(() => ({ onClick: userOnClick }))
      const selectRow = vi.fn()
      const toggleExpand = vi.fn()
      const isDisabled = vi.fn(() => true)
      const expand = makeExpand({ toggleExpand })
      const selection = makeSelection({ selectRow, isDisabled })
      const { result, fireSelectionChange } = renderBinding({
        expandEnabled: true,
        expandable: { expandRowByClick: true },
        expand,
        nativeSelectionConfigured: true,
        resolvedSelectionMode: 'single',
        selection,
        onRow,
      })
      const props = getRowProps(result.current.onRowWithExpand, data[0], 0)
      const ev = makeMouseEvent({ target: null })
      act(() => {
        props.onClick(ev)
      })
      // 选择被 isDisabled 拦，expand 触发（可展开行，无 skipInteraction）
      expect(fireSelectionChange).not.toHaveBeenCalled()
      expect(toggleExpand).toHaveBeenCalledTimes(1)
      // 用户 onClick 仍然触发
      expect(userOnClick).toHaveBeenCalledTimes(1)
      expect(userOnClick).toHaveBeenCalledWith(ev)
    })
  })

  describe('rowClassNameWithExpand', () => {
    it('rowClassName=undefined + 无 expandedRowClassName → 返回 undefined', () => {
      const { result } = renderBinding({
        expandEnabled: false,
        rowClassName: undefined,
      })
      expect(result.current.rowClassNameWithExpand).toBeUndefined()
    })

    it('expandEnabled=false 时 expandedRowClassName 不生效（派生 undefined）→ 返回原 rowClassName', () => {
      const rowClassName = 'my-row'
      const { result } = renderBinding({
        expandEnabled: false, // 关键
        expandable: {
          expandedRowClassName: () => 'expanded',
        },
        rowClassName,
      })
      // expandedRowClassNameFn=undefined → 直接返回 rowClassName 原样（string）
      expect(result.current.rowClassNameWithExpand).toBe(rowClassName)
    })

    it('rowClassName=string + 展开行存在 → 归一为常量函数，追加 expandedRowClassName', () => {
      const expandedRowClassName = vi.fn(() => 'expanded-extra')
      const expand = makeExpand({ expandedRowKeys: ['a'] }) // 'a' 展开
      const { result } = renderBinding({
        expandEnabled: true,
        expandable: { expandedRowClassName },
        expand,
        rowClassName: 'base-row',
      })
      const fn = result.current.rowClassNameWithExpand as (
        record: Rec,
        index: number,
      ) => string
      // 展开行（'a'）→ base + extra
      expect(fn(data[0], 0)).toBe('base-row expanded-extra')
      expect(expandedRowClassName).toHaveBeenCalledWith(data[0], 0)
      // 收起行（'b'）→ 仅 base
      expect(fn(data[1], 1)).toBe('base-row')
    })

    it('rowClassName=函数 → 保留求值（传入 record/index）', () => {
      const rowClassNameFn = vi.fn(
        (record: Rec, index: number) => `row-${record.key}-${index}`,
      )
      const expandedRowClassName = vi.fn(() => 'extra')
      const expand = makeExpand({ expandedRowKeys: ['a'] })
      const { result } = renderBinding({
        expandEnabled: true,
        expandable: { expandedRowClassName },
        expand,
        rowClassName: rowClassNameFn,
      })
      const fn = result.current.rowClassNameWithExpand as (
        record: Rec,
        index: number,
      ) => string
      // 展开行 'a'
      expect(fn(data[0], 0)).toBe('row-a-0 extra')
      expect(rowClassNameFn).toHaveBeenCalledWith(data[0], 0)
      expect(expandedRowClassName).toHaveBeenCalledWith(data[0], 0)
    })

    it('收起行 → 不追加 expandedRowClassName（仅 base）', () => {
      const rowClassNameFn = vi.fn(
        (_record: Rec, _index: number) => 'only-base',
      )
      const expandedRowClassName = vi.fn(() => 'should-not-appear')
      const expand = makeExpand({ expandedRowKeys: [] }) // 没有展开行
      const { result } = renderBinding({
        expandEnabled: true,
        expandable: { expandedRowClassName },
        expand,
        rowClassName: rowClassNameFn,
      })
      const fn = result.current.rowClassNameWithExpand as (
        record: Rec,
        index: number,
      ) => string
      expect(fn(data[0], 0)).toBe('only-base')
      expect(expandedRowClassName).not.toHaveBeenCalled()
    })

    it('二者拼合：filter(Boolean).join(" ")（base 为空字符串时不产生前导空格）', () => {
      // rowClassName=undefined → baseFn=undefined → base=''
      const expandedRowClassName = vi.fn(() => 'only-extra')
      const expand = makeExpand({ expandedRowKeys: ['a'] })
      const { result } = renderBinding({
        expandEnabled: true,
        expandable: { expandedRowClassName },
        expand,
        rowClassName: undefined,
      })
      const fn = result.current.rowClassNameWithExpand as (
        record: Rec,
        index: number,
      ) => string
      // base='' → 拼合后不应有前导空格
      expect(fn(data[0], 0)).toBe('only-extra')
    })
  })
})
