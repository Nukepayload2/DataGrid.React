import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SortIndicator } from '../../../src/table/engine/SortIndicator'

describe('SortIndicator', () => {
  it('renders active ascend and priority state', () => {
    const { container } = render(<SortIndicator sortOrder="ascend" priority={2} />)

    const sorter = container.querySelector('.dg-column-sorter') as HTMLElement
    expect(sorter).not.toBeNull()
    expect(sorter).toHaveClass('dg-column-sorter')
    expect(sorter).toHaveClass('ant-table-column-sorter')
    expect(sorter).toHaveAttribute('aria-hidden', 'true')
    expect(sorter.querySelector('.dg-column-sorter-up')).toHaveClass(
      'dg-column-sorter-active',
    )
    expect(sorter.querySelector('.dg-column-sorter-up')).toHaveClass(
      'ant-table-column-sorter-up',
    )
    expect(sorter.querySelector('.dg-column-sorter-up')).toHaveClass('active')
    expect(sorter.querySelector('.dg-column-sorter-down')).not.toHaveClass(
      'dg-column-sorter-active',
    )
    expect(screen.getByText('2')).toHaveClass('dg-column-sorter-priority')
  })

  it('renders descend state without priority', () => {
    const { container } = render(<SortIndicator sortOrder="descend" />)

    const sorter = container.querySelector('.dg-column-sorter') as HTMLElement
    expect(sorter).not.toBeNull()
    expect(sorter.querySelector('.dg-column-sorter-up')).not.toHaveClass(
      'dg-column-sorter-active',
    )
    expect(sorter.querySelector('.dg-column-sorter-down')).toHaveClass(
      'dg-column-sorter-active',
    )
    expect(document.querySelector('.dg-column-sorter-priority')).toBeNull()
  })

  it('prevents mousedown default behavior', () => {
    const { container } = render(<SortIndicator sortOrder={null} />)

    const sorter = container.querySelector('.dg-column-sorter') as HTMLElement
    expect(sorter).not.toBeNull()
    const prevented = fireEvent.mouseDown(sorter)

    expect(prevented).toBe(false)
  })
})
