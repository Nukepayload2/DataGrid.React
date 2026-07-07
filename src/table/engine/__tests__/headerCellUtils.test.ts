import { describe, expect, it } from 'vitest'
import type { CSSProperties } from 'react'
import {
  mergeHeaderEventProps,
  mergeHeaderExtraClass,
  mergeHeaderExtraStyle,
  mergeHeaderStickyStyle,
} from '../headerCellUtils'

/**
 * headerCellUtils 单元测试。
 *
 * 这些纯函数从 HeaderCell.tsx + FlatColumnCells.tsx 内联代码块抽出（两路径同款逻辑去重）。
 * 关键守护点：
 *   - className/style/event 合并顺序（行级最优先）。
 *   - sticky 合并的 z-index 层级（corner 双 sticky=5 > 仅纵向=4 > 仅横向=3）。
 *   - stickyHeaderOffset（页面级）优先于 headerStickyTop（容器内）。
 *   - 逐行偏移 headerStickyTopOffset 叠加（多级表头分层 sticky）。
 *
 * 不改 utils 源码，仅验证行为。
 */
describe('headerCellUtils — mergeHeaderExtraClass', () => {
  it('合并三段非空 className（顺序：列级 → 格级 → 行级）', () => {
    expect(mergeHeaderExtraClass('a', 'b', 'c')).toBe('a b c')
  })

  it('跳过 undefined / 空串', () => {
    expect(mergeHeaderExtraClass('a', undefined, '')).toBe('a')
    expect(mergeHeaderExtraClass(undefined, undefined, undefined)).toBeUndefined()
    expect(mergeHeaderExtraClass('', '', '')).toBeUndefined()
  })

  it('仅 cell 列级有值', () => {
    expect(mergeHeaderExtraClass('col-only')).toBe('col-only')
  })

  it('仅 onHeaderRow 行级有值', () => {
    expect(mergeHeaderExtraClass(undefined, undefined, 'row-only')).toBe('row-only')
  })

  it('行级 className 在末尾（最后合并 → 最优先 CSS）', () => {
    // 行级 class 放最后，CSS 同 specificity 时后写覆盖先写——对齐 antd 行级最优先语义。
    expect(mergeHeaderExtraClass('cell', 'onHeaderCell', 'onHeaderRow')).toBe(
      'cell onHeaderCell onHeaderRow',
    )
  })
})

describe('headerCellUtils — mergeHeaderExtraStyle', () => {
  it('合并三段 style（后者覆盖前者同名字段）', () => {
    const cell: CSSProperties = { color: 'red', fontSize: 12 }
    const onHeaderCell: CSSProperties = { color: 'blue', padding: 4 }
    const onHeaderRow: CSSProperties = { color: 'green', margin: 2 }
    expect(mergeHeaderExtraStyle(cell, onHeaderCell, onHeaderRow)).toEqual({
      color: 'green', // 行级覆盖格级覆盖列级
      fontSize: 12, // 仅列级有
      padding: 4, // 仅格级有
      margin: 2, // 仅行级有
    })
  })

  it('null / undefined 安全跳过', () => {
    expect(mergeHeaderExtraStyle(null, undefined, { color: 'red' })).toEqual({
      color: 'red',
    })
    expect(mergeHeaderExtraStyle(undefined, undefined, undefined)).toEqual({})
  })

  it('仅 cell.style 有值时原样返回', () => {
    const cell: CSSProperties = { color: 'red' }
    expect(mergeHeaderExtraStyle(cell)).toEqual({ color: 'red' })
  })
})

describe('headerCellUtils — mergeHeaderEventProps', () => {
  it('合并 onHeaderCell + onHeaderRow 事件 handler（行级覆盖格级同名字段）', () => {
    const onClickCell = () => {}
    const onClickRow = () => {}
    const onMouseEnterCell = () => {}
    const merged = mergeHeaderEventProps([
      { onClick: onClickCell, onMouseEnter: onMouseEnterCell },
      { onClick: onClickRow },
    ])
    expect(merged.onClick).toBe(onClickRow) // 行级覆盖格级
    expect(merged.onMouseEnter).toBe(onMouseEnterCell) // 仅格级有 → 保留
  })

  it('跳过 className / style（已单独合并）', () => {
    const merged = mergeHeaderEventProps([
      { className: 'a', style: { color: 'red' }, onClick: () => {} },
    ])
    expect(merged.className).toBeUndefined()
    expect(merged.style).toBeUndefined()
    expect(typeof merged.onClick).toBe('function')
  })

  it('跳过 undefined 源', () => {
    const handler = () => {}
    const merged = mergeHeaderEventProps([undefined, { onClick: handler }])
    expect(merged.onClick).toBe(handler)
  })

  it('空数组返回空对象', () => {
    expect(mergeHeaderEventProps([])).toEqual({})
  })

  it('非事件字段（非 onXxx）也透传（与原 inline 循环一致——只跳 className/style）', () => {
    // 原 inline 循环仅跳过 className/style；其它键（包括非 on* 前缀如 tabIndex/id）全保留。
    const merged = mergeHeaderEventProps([{ id: 'hdr-cell', tabIndex: 0 }])
    expect(merged.id).toBe('hdr-cell')
    expect(merged.tabIndex).toBe(0)
  })
})

describe('headerCellUtils — mergeHeaderStickyStyle', () => {
  it('全部 undefined → 空对象', () => {
    expect(mergeHeaderStickyStyle(undefined, undefined, undefined, undefined)).toEqual({})
  })

  it('仅横向 sticky（fixed start 列）→ z-index 3', () => {
    const result = mergeHeaderStickyStyle(
      { side: 'start', offset: 0 },
      undefined,
      undefined,
      undefined,
    )
    expect(result).toEqual({ position: 'sticky', left: 0, zIndex: 3 })
  })

  it('仅横向 sticky（fixed end 列）→ z-index 3', () => {
    const result = mergeHeaderStickyStyle(
      { side: 'end', offset: 100 },
      undefined,
      undefined,
      undefined,
    )
    expect(result).toEqual({ position: 'sticky', right: 100, zIndex: 3 })
  })

  it('仅纵向 sticky（容器内 top:0）→ z-index 4', () => {
    const result = mergeHeaderStickyStyle(undefined, undefined, true, 0)
    expect(result).toEqual({ position: 'sticky', top: '0px', zIndex: 4 })
  })

  it('仅纵向 sticky + 逐行偏移（多级表头 row2）→ top=offset', () => {
    const result = mergeHeaderStickyStyle(undefined, undefined, true, 40)
    expect(result).toEqual({ position: 'sticky', top: '40px', zIndex: 4 })
  })

  it('仅页面级 sticky（stickyHeaderOffset）→ z-index 4 + top=offset', () => {
    const result = mergeHeaderStickyStyle(undefined, 200, undefined, 0)
    expect(result).toEqual({ position: 'sticky', top: '200px', zIndex: 4 })
  })

  it('页面级 sticky + 逐行偏移叠加 → top = offsetHeader + rowOffset', () => {
    // 多级表头 sticky 启用时：top = stickyHeaderOffset + headerStickyTopOffset
    const result = mergeHeaderStickyStyle(undefined, 200, undefined, 40)
    expect(result).toEqual({ position: 'sticky', top: '240px', zIndex: 4 })
  })

  it('corner cell（横向 + 纵向 sticky）→ z-index 5（最高，盖住中间表头格 4 + 固定列 3）', () => {
    // 这是 corner cell z-index 修复的回归守护——原 bug 取纵向 z-index(4) 导致被中间表头格盖住。
    const result = mergeHeaderStickyStyle(
      { side: 'start', offset: 0 }, // 横向 fixed
      undefined,
      true, // 纵向 sticky
      0,
    )
    expect(result.position).toBe('sticky')
    expect(result.left).toBe(0)
    expect(result.top).toBe('0px')
    expect(result.zIndex).toBe(5) // 关键：双 sticky 取最高
  })

  it('corner cell + 页面级 sticky + 逐行偏移 → z-index 5 + 全字段正确', () => {
    const result = mergeHeaderStickyStyle(
      { side: 'end', offset: 80 },
      100, // 页面级
      undefined,
      20, // 逐行偏移
    )
    expect(result).toEqual({
      position: 'sticky',
      right: 80,
      top: '120px', // 100 + 20
      zIndex: 5,
    })
  })

  it('sticky.side 缺失（isEdge 类型变体）→ 仅纵向 sticky 不触发 corner', () => {
    // useStickyColumns.headerSticky 类型为 { side: FixedSide; offset: number; isEdge: boolean }，
    // 但 side 永远有值（fixed 列）。这里防御性测试 side 缺失场景：仅纵向 sticky 生效，z-index 4（非 5）。
    const result = mergeHeaderStickyStyle(
      { offset: 0 } as { side?: 'start'; offset: number }, // side 缺失
      undefined,
      true,
      0,
    )
    expect(result.zIndex).toBe(4) // 仅纵向，非 corner
    expect(result.left).toBeUndefined()
    expect(result.right).toBeUndefined()
  })

  it('headerStickyTopOffset 默认 0（undefined 时）', () => {
    const result = mergeHeaderStickyStyle(undefined, undefined, true, undefined)
    expect(result.top).toBe('0px')
  })
})
