import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ConfigProvider } from 'antd'
import { describe, expect, it, vi } from 'vitest'
import { FilterDropdown } from '../../../../src/table/engine/FilterDropdown'
import type { FilterDropdownProps as DgFilterDropdownProps } from '../../../../src/table/types'

const filters = [
  { text: 'London', value: 'london' },
  { text: 'New York', value: 'ny' },
]

function renderFilterDropdown(
  props: Partial<React.ComponentProps<typeof FilterDropdown>> = {},
) {
  const onApply = vi.fn()
  const view = render(
    <ConfigProvider>
      <FilterDropdown
        filters={filters}
        filteredValue={[]}
        onApply={onApply}
        {...props}
      />
    </ConfigProvider>,
  )
  return { ...view, onApply }
}

describe('FilterDropdown trigger integration', () => {
  it('renders an active trigger and calls custom filterIcon with filtered state', () => {
    const customIcon = vi.fn((filtered: boolean) => (
      <span data-testid="custom-icon">{filtered ? 'on' : 'off'}</span>
    ))

    renderFilterDropdown({
      filteredValue: ['london'],
      customIcon,
      dropdownProps: {
        triggerClassName: 'extra-trigger',
        triggerStyle: { color: 'rgb(255, 0, 0)' },
      },
    })

    const trigger = document.querySelector('.dg-filter-trigger')
    expect(trigger).toHaveClass('dg-filter-trigger-active')
    expect(trigger).toHaveClass('extra-trigger')
    expect(trigger).toHaveStyle({ color: 'rgb(255, 0, 0)' })
    expect(customIcon).toHaveBeenCalledWith(true)
    expect(screen.getByTestId('custom-icon')).toHaveTextContent('on')
  })

  it('lets triggerRender override customIcon', () => {
    const customIcon = vi.fn(() => <span>unused</span>)
    const triggerRender = vi.fn((activated: boolean) => (
      <span data-testid="trigger-render">{String(activated)}</span>
    ))

    renderFilterDropdown({
      filteredValue: ['london'],
      customIcon,
      triggerRender,
    })

    expect(triggerRender).toHaveBeenCalledWith(true)
    expect(customIcon).not.toHaveBeenCalled()
    expect(screen.getByTestId('trigger-render')).toHaveTextContent('true')
  })
})

describe('FilterDropdown builtin dropdown integration', () => {
  it('filters builtin menu items through default search text', async () => {
    renderFilterDropdown({
      filterSearch: true,
      dropdownProps: { open: true },
    })

    const search = await screen.findByPlaceholderText('Search in filters')
    expect(screen.getByText('London')).toBeInTheDocument()
    expect(screen.getByText('New York')).toBeInTheDocument()

    fireEvent.change(search, { target: { value: '  lon  ' } })

    await waitFor(() => {
      expect(screen.getByText('London')).toBeInTheDocument()
      expect(screen.queryByText('New York')).not.toBeInTheDocument()
    })
  })

  it('applies checked builtin menu values from OK and reset clears the draft', async () => {
    const { onApply } = renderFilterDropdown({
      filteredValue: ['london'],
      dropdownProps: { open: true },
    })

    fireEvent.click(await screen.findByRole('button', { name: 'Reset' }))
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))

    expect(onApply).toHaveBeenCalledWith([])
  })

  it('applies single-select radio menu values', async () => {
    const { onApply } = renderFilterDropdown({
      filterMultiple: false,
      dropdownProps: { open: true },
    })

    fireEvent.click(await screen.findByRole('radio', { name: 'New York' }))
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))

    expect(onApply).toHaveBeenCalledWith(['ny'])
  })

  it('uses locale filterEmptyText for empty builtin filters', async () => {
    renderFilterDropdown({
      filters: [],
      locale: { filterEmptyText: 'No column filters' },
      dropdownProps: { open: true },
    })

    expect(await screen.findByText('No column filters')).toBeInTheDocument()
  })

  it('normalizes single-select tree checks before applying', async () => {
    const { onApply } = renderFilterDropdown({
      filters: [
        {
          text: 'Europe',
          value: 'eu',
          children: [{ text: 'London', value: 'london' }],
        },
      ],
      filterMode: 'tree',
      filterMultiple: false,
      dropdownProps: { open: true },
    })

    expect(await screen.findByText('Europe')).toBeInTheDocument()
    const treeCheckboxes = document.querySelectorAll('.ant-tree-checkbox')
    expect(treeCheckboxes.length).toBeGreaterThanOrEqual(2)

    fireEvent.click(treeCheckboxes[1]!)
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))

    expect(onApply).toHaveBeenCalledWith(['london'])
  })
})

describe('FilterDropdown custom dropdown integration', () => {
  it('passes antd-compatible custom dropdown props and confirms selected keys', async () => {
    let latestProps: DgFilterDropdownProps | null = null
    const customDropdown = vi.fn((props: DgFilterDropdownProps) => {
      latestProps = props
      return (
        <div>
          <output data-testid="selected">{props.selectedKeys.join(',')}</output>
          <output data-testid="visible">{String(props.visible)}</output>
          <button onClick={() => props.setSelectedKeys(['ny'])} type="button">
            set
          </button>
          <button onClick={() => props.confirm({ closeDropdown: false })} type="button">
            confirm
          </button>
        </div>
      )
    })
    const { onApply } = renderFilterDropdown({
      filteredValue: ['london'],
      customDropdown,
      dropdownProps: { open: true },
    })

    expect(await screen.findByTestId('selected')).toHaveTextContent('london')
    expect(screen.getByTestId('visible')).toHaveTextContent('true')
    expect(latestProps).toEqual(
      expect.objectContaining({
        prefixCls: 'dg-filter',
        filters: [],
        visible: true,
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'set' }))

    await waitFor(() => {
      expect(screen.getByTestId('selected')).toHaveTextContent('ny')
    })

    fireEvent.click(screen.getByRole('button', { name: 'confirm' }))

    expect(onApply).toHaveBeenCalledWith(['ny'])
  })

  it('clears filters with confirm and supports custom close without applying', async () => {
    const customDropdown = (props: DgFilterDropdownProps) => (
      <div>
        <button
          onClick={() => props.clearFilters?.({ confirm: true, closeDropdown: false })}
          type="button"
        >
          clear
        </button>
        <button onClick={() => props.close()} type="button">
          close
        </button>
      </div>
    )
    const { onApply } = renderFilterDropdown({
      filteredValue: ['london'],
      customDropdown,
      dropdownProps: { open: true },
    })

    fireEvent.click(await screen.findByRole('button', { name: 'clear' }))
    expect(onApply).toHaveBeenCalledWith([])

    fireEvent.click(screen.getByRole('button', { name: 'close' }))
    expect(onApply).toHaveBeenCalledTimes(1)
  })

  it('renders custom dropdown nodes inside an isolated custom panel', async () => {
    renderFilterDropdown({
      customDropdown: <div data-testid="custom-node">Custom</div>,
      dropdownProps: { open: true },
    })

    expect(await screen.findByTestId('custom-node')).toHaveTextContent('Custom')
    expect(document.querySelector('.dg-filter-dropdown-custom')).not.toBeNull()
  })
})
