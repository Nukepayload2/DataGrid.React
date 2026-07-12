import { fireEvent, render, screen } from '@testing-library/react'
import { ConfigProvider } from 'antd'
import { describe, expect, it, vi } from 'vitest'
import { SelectionInput } from '../../../../src/table/engine/SelectionInput'

function renderInput(node: React.ReactNode) {
  return render(<ConfigProvider>{node}</ConfigProvider>)
}

describe('SelectionInput', () => {
  it('bridges antd Checkbox changes to the internal checked/event callback', () => {
    const onChange = vi.fn()

    renderInput(
      <SelectionInput
        type="checkbox"
        checked={false}
        indeterminate
        name="selected[]"
        aria-label="select row"
        onChange={onChange}
        style={{ marginInlineStart: 4 }}
      />,
    )

    expect(screen.getByRole('checkbox', { name: 'select row' })).toHaveAttribute(
      'name',
      'selected[]',
    )
    expect(document.querySelector('.ant-checkbox-indeterminate')).not.toBeNull()
    expect(document.querySelector('.dg-selection-input-checkbox')).not.toBeNull()

    fireEvent.click(screen.getByRole('checkbox', { name: 'select row' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).toBe(true)
    expect(onChange.mock.calls[0][1]).toBeInstanceOf(Event)
  })

  it('renders radio mode without indeterminate state and forwards checked changes', () => {
    const onChange = vi.fn()

    renderInput(
      <SelectionInput
        type="radio"
        checked={false}
        indeterminate
        name="single"
        aria-label="pick row"
        onChange={onChange}
      />,
    )

    const radio = screen.getByRole('radio', { name: 'pick row' })
    expect(radio).toHaveAttribute('name', 'single')
    expect(document.querySelector('.dg-selection-input-radio')).not.toBeNull()
    expect(document.querySelector('.ant-checkbox-indeterminate')).toBeNull()

    fireEvent.click(radio)

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).toBe(true)
    expect(onChange.mock.calls[0][1]).toBeInstanceOf(Event)
  })

  it('does not emit changes for disabled controls', () => {
    const onChange = vi.fn()

    renderInput(
      <SelectionInput
        type="checkbox"
        checked={false}
        disabled
        aria-label="blocked"
        onChange={onChange}
      />,
    )

    const checkbox = screen.getByRole('checkbox', { name: 'blocked' })
    expect(checkbox).toBeDisabled()

    fireEvent.click(checkbox)

    expect(onChange).not.toHaveBeenCalled()
  })
})
