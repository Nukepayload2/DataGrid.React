import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ExpandIcon } from '../../../src/table/engine/ExpandIcon'

describe('ExpandIcon', () => {
  it('renders collapsed state with the default label', () => {
    render(<ExpandIcon expanded={false} onExpand={vi.fn()} />)

    const button = screen.getByRole('button', { name: 'Expand row' })
    expect(button).toHaveClass('dg-expand-icon-collapsed')
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('renders expanded state with a custom label and forwards clicks', () => {
    const onExpand = vi.fn()

    render(
      <ExpandIcon
        expanded
        aria-label="Toggle row"
        style={{ color: 'rgb(255, 0, 0)' }}
        onExpand={onExpand}
      />,
    )

    const button = screen.getByRole('button', { name: 'Toggle row' })
    expect(button).toHaveClass('dg-expand-icon-expanded')
    expect(button).toHaveStyle({ color: 'rgb(255, 0, 0)' })

    fireEvent.click(button)

    expect(onExpand).toHaveBeenCalledTimes(1)
  })

  it('renders disabled state as spaced and disabled', () => {
    render(<ExpandIcon expanded disabled onExpand={vi.fn()} />)

    const button = screen.getByRole('button', { name: 'Collapse row' })
    expect(button).toBeDisabled()
    expect(button).toHaveClass('dg-expand-icon-spaced')
  })
})
