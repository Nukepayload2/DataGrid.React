/**
 * FilterBuiltinPanel 单元测试（执行单元 #65）。
 *
 * FilterBuiltinPanel 是从 FilterDropdown.tsx builtinPanel JSX 抽出的纯展示子组件。
 * 所有 state/派生值/回调通过 props 透传——本测试直接构造 props，验证渲染 + 交互回调。
 *
 * 覆盖：
 *   - menu 多选（Checkbox.Group）渲染 visibleItems + 勾选触发 onLocalSelectedChange
 *   - menu 单选（Radio.Group）渲染 + 单选触发 onLocalSelectedChange
 *   - tree 模式渲染 antd Tree（treeData）+ 全选 Checkbox（onCheckAll）
 *   - 搜索框（hasSearch=true）渲染 + 输入触发 onSearchChange
 *   - filtersEmpty 占位（filterEmptyNode）
 *   - menu 搜索无匹配（visibleItems=[]）占位
 *   - 底部按钮（Reset/onReset、OK/onApply）
 *   - locale 文案透传（filterConfirm/filterReset/filterCheckAll/filterSearchPlaceholder）
 *   - data-multiple / data-filter-mode 标记
 *   - onClick / onMouseDown stopPropagation（不冒泡到表头格）
 *
 * 不改 FilterBuiltinPanel.tsx 源码，仅验证行为。
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { ConfigProvider } from 'antd'
import { describe, expect, it, vi } from 'vitest'
import { FilterBuiltinPanel } from '../FilterBuiltinPanel'
import type { EngineFilterItem } from '../types'
import type { FilterTreeNode } from '../filterDropdownUtils'

function renderWithProvider(node: React.ReactNode) {
  return render(<ConfigProvider>{node}</ConfigProvider>)
}

/** 构造一组最小可用的默认 props（menu 多选 + 2 个筛选项）。 */
function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    filterMultiple: true,
    isTree: false,
    filtersEmpty: false,
    filterEmptyNode: <div data-testid="empty-node">No filters</div>,
    hasSearch: false,
    localeFilterSearchPlaceholder: 'Search in filters',
    searchValue: '',
    onSearchChange: vi.fn(),
    treeData: [] as Array<FilterTreeNode>,
    allChecked: false,
    allIndeterminate: false,
    onCheckAll: vi.fn(),
    onTreeCheck: vi.fn(),
    filterTreeNode: undefined,
    localeFilterCheckAll: 'Select all items',
    visibleItems: [
      { text: 'London', value: 'london' },
      { text: 'New York', value: 'ny' },
    ] as Array<EngineFilterItem>,
    localSelected: [] as Array<string | number>,
    onLocalSelectedChange: vi.fn(),
    localeFilterReset: 'Reset',
    localeFilterConfirm: 'OK',
    onReset: vi.fn(),
    onApply: vi.fn(),
    ...overrides,
  }
}

describe('FilterBuiltinPanel — 基础结构 + data 标记', () => {
  it('渲染根 .dg-filter-dropdown + data-multiple/data-filter-mode 标记（menu 多选）', () => {
    renderWithProvider(<FilterBuiltinPanel {...makeProps()} />)
    const panel = document.querySelector('.dg-filter-dropdown')
    expect(panel).not.toBeNull()
    expect(panel).toHaveAttribute('data-multiple', '1')
    expect(panel).toHaveAttribute('data-filter-mode', 'menu')
  })

  it('单选模式 data-multiple=0', () => {
    renderWithProvider(<FilterBuiltinPanel {...makeProps({ filterMultiple: false })} />)
    expect(document.querySelector('.dg-filter-dropdown')).toHaveAttribute(
      'data-multiple',
      '0',
    )
  })

  it('tree 模式 data-filter-mode=tree', () => {
    renderWithProvider(
      <FilterBuiltinPanel {...makeProps({ isTree: true })} />,
    )
    expect(document.querySelector('.dg-filter-dropdown')).toHaveAttribute(
      'data-filter-mode',
      'tree',
    )
  })
})

describe('FilterBuiltinPanel — menu 多选（Checkbox.Group）', () => {
  it('渲染 visibleItems 为 Checkbox 列表', () => {
    renderWithProvider(<FilterBuiltinPanel {...makeProps()} />)
    expect(screen.getByText('London')).toBeInTheDocument()
    expect(screen.getByText('New York')).toBeInTheDocument()
    expect(document.querySelectorAll('.dg-filter-menu-item')).toHaveLength(2)
  })

  it('勾选一个 Checkbox 触发 onLocalSelectedChange（values 数组）', () => {
    const onLocalSelectedChange = vi.fn()
    renderWithProvider(
      <FilterBuiltinPanel {...makeProps({ onLocalSelectedChange })} />,
    )
    const checkboxes = screen.getAllByRole('checkbox')
    // visibleItems 2 个 Checkbox（无全选——非 tree）；第一个是 London。
    fireEvent.click(checkboxes[0])
    expect(onLocalSelectedChange).toHaveBeenCalledTimes(1)
    // antd Checkbox.Group onChange 传入选中 values 数组。
    const calls = onLocalSelectedChange.mock.calls[0]
    expect(calls[0]).toEqual(['london'])
  })

  it('localSelected 受控——预选值反映在 Checkbox.Group', () => {
    renderWithProvider(
      <FilterBuiltinPanel {...makeProps({ localSelected: ['ny'] })} />,
    )
    const nyCheckbox = screen.getByText('New York').closest('label')?.querySelector('input[type="checkbox"]')
    expect(nyCheckbox).toHaveAttribute('checked') // jsdom + antd 把 checked 写到 input
  })
})

describe('FilterBuiltinPanel — menu 单选（Radio.Group）', () => {
  it('filterMultiple=false 渲染 Radio 列表', () => {
    renderWithProvider(
      <FilterBuiltinPanel {...makeProps({ filterMultiple: false })} />,
    )
    expect(screen.getAllByRole('radio')).toHaveLength(2)
    expect(screen.getByText('London')).toBeInTheDocument()
  })

  it('单选一个 Radio 触发 onLocalSelectedChange（[value] 单元素数组）', () => {
    const onLocalSelectedChange = vi.fn()
    renderWithProvider(
      <FilterBuiltinPanel
        {...makeProps({ filterMultiple: false, onLocalSelectedChange })}
      />,
    )
    const radios = screen.getAllByRole('radio')
    fireEvent.click(radios[1]) // New York
    expect(onLocalSelectedChange).toHaveBeenCalledTimes(1)
    expect(onLocalSelectedChange.mock.calls[0][0]).toEqual(['ny'])
  })
})

describe('FilterBuiltinPanel — tree 模式（antd Tree）', () => {
  const treeData: Array<FilterTreeNode> = [
    {
      key: 'parent',
      title: 'Parent',
      children: [
        { key: 'child1', title: 'Child 1' },
        { key: 'child2', title: 'Child 2' },
      ],
    },
  ]

  it('tree 模式渲染 antd Tree（含 treeData 节点文字）', () => {
    renderWithProvider(
      <FilterBuiltinPanel
        {...makeProps({ isTree: true, treeData, visibleItems: [] })}
      />,
    )
    // antd Tree 渲染 treeData 的 title。
    expect(screen.getByText('Parent')).toBeInTheDocument()
    // Tree 默认不展开（除非 defaultExpandAll/autoExpandParent），但根节点 title 必渲染。
    // 全选 Checkbox 文案也渲染（filterMultiple=true）。
    expect(screen.getByText('Select all items')).toBeInTheDocument()
  })

  it('tree 模式 + filterMultiple=false 不渲染全选 Checkbox', () => {
    renderWithProvider(
      <FilterBuiltinPanel
        {...makeProps({
          isTree: true,
          treeData,
          filterMultiple: false,
          visibleItems: [],
        })}
      />,
    )
    expect(screen.queryByText('Select all items')).not.toBeInTheDocument()
  })

  it('全选 Checkbox onChange 触发 onCheckAll（透传 e.target.checked）', () => {
    const onCheckAll = vi.fn()
    renderWithProvider(
      <FilterBuiltinPanel
        {...makeProps({
          isTree: true,
          treeData,
          onCheckAll,
          visibleItems: [],
        })}
      />,
    )
    // 全选 Checkbox 是 .dg-filter-dropdown-checkall 内的第一个 checkbox。
    const checkallLabel = screen.getByText('Select all items').closest('label')
    const checkallInput = checkallLabel?.querySelector('input[type="checkbox"]')
    expect(checkallInput).not.toBeNull()
    fireEvent.click(checkallInput!)
    expect(onCheckAll).toHaveBeenCalledTimes(1)
    // onCheckAll 接收 { target: { checked } }——antd Checkbox onChange event 形态。
    const evt = onCheckAll.mock.calls[0][0]
    expect(evt.target.checked).toBe(true)
  })
})

describe('FilterBuiltinPanel — 搜索框', () => {
  it('hasSearch=true 渲染搜索框 + placeholder', () => {
    renderWithProvider(<FilterBuiltinPanel {...makeProps({ hasSearch: true })} />)
    const input = screen.getByPlaceholderText('Search in filters')
    expect(input).toBeInTheDocument()
  })

  it('hasSearch=false 不渲染搜索框', () => {
    renderWithProvider(<FilterBuiltinPanel {...makeProps({ hasSearch: false })} />)
    expect(screen.queryByPlaceholderText('Search in filters')).not.toBeInTheDocument()
  })

  it('输入触发 onSearchChange（传新值）', () => {
    const onSearchChange = vi.fn()
    renderWithProvider(
      <FilterBuiltinPanel
        {...makeProps({ hasSearch: true, onSearchChange })}
      />,
    )
    const input = screen.getByPlaceholderText('Search in filters')
    fireEvent.change(input, { target: { value: 'lon' } })
    expect(onSearchChange).toHaveBeenCalledTimes(1)
    expect(onSearchChange.mock.calls[0][0]).toBe('lon')
  })

  it('searchValue 受控——input 的 value 反映 searchValue', () => {
    renderWithProvider(
      <FilterBuiltinPanel
        {...makeProps({ hasSearch: true, searchValue: 'pre-filled' })}
      />,
    )
    expect(screen.getByPlaceholderText('Search in filters')).toHaveValue(
      'pre-filled',
    )
  })
})

describe('FilterBuiltinPanel — 占位（empty）', () => {
  it('filtersEmpty=true 渲染 filterEmptyNode 占位（替代列表/搜索区）', () => {
    renderWithProvider(<FilterBuiltinPanel {...makeProps({ filtersEmpty: true })} />)
    expect(screen.getByTestId('empty-node')).toBeInTheDocument()
    // 列表不渲染（visibleItems 文字 London/New York 不出现）。
    expect(screen.queryByText('London')).not.toBeInTheDocument()
  })

  it('menu 模式搜索无匹配（visibleItems=[]）渲染 filterEmptyNode 占位', () => {
    renderWithProvider(
      <FilterBuiltinPanel
        {...makeProps({ visibleItems: [], hasSearch: true })}
      />,
    )
    expect(screen.getByTestId('empty-node')).toBeInTheDocument()
    expect(screen.queryByText('London')).not.toBeInTheDocument()
  })

  it('filtersEmpty=true 时搜索框也不渲染（占位替代整个列表+搜索区）', () => {
    renderWithProvider(
      <FilterBuiltinPanel
        {...makeProps({ filtersEmpty: true, hasSearch: true })}
      />,
    )
    expect(screen.queryByPlaceholderText('Search in filters')).not.toBeInTheDocument()
  })
})

describe('FilterBuiltinPanel — 底部按钮（Reset / OK）', () => {
  it('渲染 Reset + OK 按钮（locale 文案）', () => {
    renderWithProvider(<FilterBuiltinPanel {...makeProps()} />)
    expect(screen.getByText('Reset')).toBeInTheDocument()
    expect(screen.getByText('OK')).toBeInTheDocument()
  })

  it('点击 Reset 触发 onReset', () => {
    const onReset = vi.fn()
    renderWithProvider(<FilterBuiltinPanel {...makeProps({ onReset })} />)
    fireEvent.click(screen.getByText('Reset'))
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('点击 OK 触发 onApply', () => {
    const onApply = vi.fn()
    renderWithProvider(<FilterBuiltinPanel {...makeProps({ onApply })} />)
    fireEvent.click(screen.getByText('OK'))
    expect(onApply).toHaveBeenCalledTimes(1)
  })

  it('自定义 locale 文案正确透传', () => {
    renderWithProvider(
      <FilterBuiltinPanel
        {...makeProps({
          localeFilterReset: 'Réinitialiser',
          localeFilterConfirm: 'Confirmer',
        })}
      />,
    )
    expect(screen.getByText('Réinitialiser')).toBeInTheDocument()
    expect(screen.getByText('Confirmer')).toBeInTheDocument()
  })
})

describe('FilterBuiltinPanel — 事件隔离（不冒泡到表头格）', () => {
  it('面板内 click 不冒泡（onClick stopPropagation）', () => {
    const outerClick = vi.fn()
    render(
      <div onClick={outerClick}>
        <ConfigProvider>
          <FilterBuiltinPanel {...makeProps()} />
        </ConfigProvider>
      </div>,
    )
    // 点击面板内部任意位置（按钮区）不应触发外层 onClick。
    fireEvent.click(screen.getByText('OK'))
    expect(outerClick).not.toHaveBeenCalled()
  })

  it('面板内 mousedown 不冒泡（onMouseDown stopPropagation）', () => {
    const outerMouseDown = vi.fn()
    render(
      <div onMouseDown={outerMouseDown}>
        <ConfigProvider>
          <FilterBuiltinPanel {...makeProps()} />
        </ConfigProvider>
      </div>,
    )
    fireEvent.mouseDown(screen.getByText('OK'))
    expect(outerMouseDown).not.toHaveBeenCalled()
  })
})
