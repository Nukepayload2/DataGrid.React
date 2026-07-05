import { isValidElement, type ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import {
  clampSize,
  fixedClass,
  omitKey,
  renderCellContent,
  resolveNumericRowHeight,
  shadowClass,
  toEllipsisTitle,
  toTrack,
} from '../cellRenderUtils'
import type { EngineLeafColumn, EngineTableProps } from '../types'

describe('cellRenderUtils', () => {
  it('converts track values', () => {
    expect(toTrack(24)).toBe('24px')
    expect(toTrack('minmax(0, 1fr)')).toBe('minmax(0, 1fr)')
    expect(toTrack(null)).toBeUndefined()
    expect(toTrack(undefined)).toBeUndefined()
  })

  it('derives ellipsis title from supported text nodes', () => {
    expect(toEllipsisTitle('Ada')).toBe('Ada')
    expect(toEllipsisTitle(42)).toBe('42')
    expect(toEllipsisTitle(<span>Ada</span>)).toBe('Ada')
    expect(toEllipsisTitle(['A', <span key="b">B</span>, 3])).toBe('AB3')
  })

  it('skips ellipsis title for unsupported nodes', () => {
    expect(toEllipsisTitle(null)).toBeUndefined()
    expect(toEllipsisTitle(undefined)).toBeUndefined()
    expect(toEllipsisTitle(false)).toBeUndefined()
    expect(toEllipsisTitle({ value: 'Ada' } as never)).toBeUndefined()
  })

  it('resolves numeric row height values', () => {
    const record = { id: 1 }

    expect(resolveNumericRowHeight(32, record, 0)).toBe(32)
    expect(resolveNumericRowHeight((_row, index) => 40 + index, record, 2)).toBe(42)
    expect(resolveNumericRowHeight(() => '40px', record, 0)).toBe(40)
    expect(resolveNumericRowHeight(() => '40', record, 0)).toBe(40)
    expect(resolveNumericRowHeight(() => 'invalid', record, 0)).toBe(0)
  })

  it('clamps and rounds sizes', () => {
    expect(clampSize(10.4)).toBe(10)
    expect(clampSize(8, 10, 20)).toBe(10)
    expect(clampSize(24, 10, 20)).toBe(20)
    expect(clampSize(14.6, 10, 20)).toBe(15)
  })

  it('resolves fixed and shadow classes', () => {
    expect(fixedClass('start')).toBe('dg-cell-fixed-start')
    expect(fixedClass('end')).toBe('dg-cell-fixed-end')
    expect(fixedClass(undefined)).toBeUndefined()

    expect(shadowClass({ side: 'start', isEdge: true })).toBe('dg-sticky-shadow-start')
    expect(shadowClass({ side: 'end', isEdge: true })).toBe('dg-sticky-shadow-end')
    expect(shadowClass({ side: 'start', isEdge: false })).toBeUndefined()
    expect(shadowClass(undefined)).toBeUndefined()
  })

  it('omits one key without mutating the input object', () => {
    const input = { onClick: 'handled', className: 'cell', tabIndex: 0 }

    expect(omitKey(input, 'onClick')).toEqual({ className: 'cell', tabIndex: 0 })
    expect(input).toEqual({ onClick: 'handled', className: 'cell', tabIndex: 0 })
    expect(omitKey(null as never, 'onClick')).toEqual({})
  })

  it('returns rendered content when no custom cell is provided', () => {
    expect(renderCellContent({
      components: undefined,
      column: { key: 'name', dataIndex: 'name' },
      record: { name: 'Ada' },
      index: 0,
      rendered: 'Ada',
      onCellProps: undefined,
    })).toBe('Ada')
  })

  it('passes cell props to a custom cell component', () => {
    type Row = { name: string }
    const shouldCellUpdate = (prev: Row, next: Row) => prev.name !== next.name
    const CustomCell = () => <span>custom</span>
    const components: EngineTableProps<Row>['components'] = {
      body: { cell: CustomCell },
    }
    const column: EngineLeafColumn<Row> = {
      key: 'name',
      dataIndex: ['user', 'name'],
      shouldCellUpdate,
    }
    const record = { name: 'Ada' }
    const node = renderCellContent({
      components,
      column,
      record,
      index: 3,
      rendered: <strong>Ada</strong>,
      onCellProps: { className: 'editable', colSpan: 2 },
    })

    expect(isValidElement(node)).toBe(true)
    const props = (node as ReactElement<Record<string, unknown>>).props
    expect(props.children).toEqual(<strong>Ada</strong>)
    expect(props.record).toBe(record)
    expect(props.index).toBe(3)
    expect(props.dataIndex).toEqual(['user', 'name'])
    expect(props.shouldCellUpdate).toBe(shouldCellUpdate)
    expect(props.className).toBe('editable')
    expect(props.colSpan).toBe(2)
  })
})
