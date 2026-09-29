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

// 23-A（步骤 58 新增，来源＝分母「数量增加」声明）：箭头**节点集**跟随 `sortDirections`。
// 参照 antd 6.4.4 `es/table/hooks/useSorter.js:89`/`:94` 的节点级条件渲染，
// 与 `:98-107` 的 `-full`（仅两枚都在时）。
// ⚠️ 本文件钉的是 **组件层**的门；两条表头路径（`HeaderCell.tsx:426` / `FlatColumnCells.tsx:379`）
//   各自把生效方向传下来这一步本棒禁写 ⇒ 端到端门尚未成立，见步骤 58 日志末行交回项。
describe('SortIndicator / sortDirections 裁剪箭头（23-A）', () => {
  const caretCounts = (container: HTMLElement) => ({
    up: container.querySelectorAll('.dg-column-sorter-up').length,
    down: container.querySelectorAll('.dg-column-sorter-down').length,
    innerKids: container.querySelector('.dg-column-sorter-inner')?.children.length ?? -1,
    full: !!container.querySelector('.ant-table-column-sorter-full'),
  })

  it('renders only the down caret for sortDirections=["descend"]', () => {
    const { container } = render(
      <SortIndicator sortOrder="descend" sortDirections={['descend']} />,
    )
    expect(caretCounts(container)).toEqual({ up: 0, down: 1, innerKids: 1, full: false })
    expect(container.querySelector('.dg-column-sorter-down')).toHaveClass('active')
    expect(container.querySelector('.dg-column-sorter-down')).toHaveClass(
      'dg-column-sorter-active',
    )
  })

  it('renders only the up caret for sortDirections=["ascend"]', () => {
    const { container } = render(
      <SortIndicator sortOrder="ascend" sortDirections={['ascend']} />,
    )
    expect(caretCounts(container)).toEqual({ up: 1, down: 0, innerKids: 1, full: false })
    expect(container.querySelector('.dg-column-sorter-up')).toHaveClass('active')
  })

  it('keeps the single rendered caret inactive when sortOrder is null', () => {
    // 三循环位里的"无"位：参照此时 down 节点存在但不带 active。
    const { container } = render(
      <SortIndicator sortOrder={null} sortDirections={['descend']} />,
    )
    expect(caretCounts(container)).toEqual({ up: 0, down: 1, innerKids: 1, full: false })
    expect(container.querySelector('.dg-column-sorter-down')).not.toHaveClass('active')
  })

  it('adds the -full alias only when both directions are present', () => {
    const { container } = render(
      <SortIndicator sortOrder="ascend" sortDirections={['descend', 'ascend']} />,
    )
    expect(caretCounts(container)).toEqual({ up: 1, down: 1, innerKids: 2, full: true })
    expect(container.querySelector('.dg-column-sorter')).toHaveClass('dg-column-sorter-full')
    expect(container.querySelector('.dg-column-sorter')).toHaveClass(
      'ant-table-column-sorter-full',
    )
  })

  it('keeps the historical markup (both carets, no -full) when sortDirections is omitted', () => {
    // 兼容口径门：prop 缺省 ⇒ 逐字节维持改前形态，避免在调用点补 prop 之前动存量快照。
    const { container } = render(<SortIndicator sortOrder="ascend" />)
    expect(caretCounts(container)).toEqual({ up: 1, down: 1, innerKids: 2, full: false })
  })
})
