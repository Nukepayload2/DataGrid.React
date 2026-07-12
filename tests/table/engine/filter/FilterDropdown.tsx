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
