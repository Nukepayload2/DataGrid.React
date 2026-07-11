import { describe, expect, it } from 'vitest'
import {
  buildResizeSiblingByKey,
  buildVisibleLeafKeys,
  clampWidth,
  computeColumnResize,
} from '../../../../src/table/engine/resizeColumnUtils'
import type { EngineLeafColumn } from '../../../../src/table/engine/types'

function leaves(
  columns: Array<Pick<EngineLeafColumn, 'key' | 'hidden'>>,
): Array<Pick<EngineLeafColumn, 'key' | 'hidden'>> {
  return columns
}

describe('resizeColumnUtils', () => {
  it('builds visible leaf keys in column order', () => {
    expect(
      buildVisibleLeafKeys(
        leaves([
          { key: 'name' },
          { key: 'age', hidden: true },
          { key: 'city' },
        ]),
      ),
    ).toEqual(['name', 'city'])
  })

  it('maps each visible leaf to its next visible sibling', () => {
    const siblingByKey = buildResizeSiblingByKey(
      leaves([
        { key: 'selection' },
        { key: 'name' },
        { key: 'age', hidden: true },
        { key: 'city' },
        { key: 'actions' },
      ]),
    )

    expect(Array.from(siblingByKey.entries())).toEqual([
      ['selection', 'name'],
      ['name', 'city'],
      ['city', 'actions'],
    ])
    expect(siblingByKey.has('actions')).toBe(false)
    expect(siblingByKey.has('age')).toBe(false)
  })

  it('clamps ResizeLeft width between min and max', () => {
    expect(clampWidth(20, 30, 120)).toBe(30)
    expect(clampWidth(80, 30, 120)).toBe(80)
    expect(clampWidth(200, 30, 120)).toBe(120)

    expect(
      computeColumnResize({
        mode: 'ResizeLeft',
        delta: -90,
        startWidth: 100,
        minWidth: 40,
        maxWidth: 160,
      }),
    ).toEqual({ width: 40 })
    expect(
      computeColumnResize({
        mode: 'ResizeLeft',
        delta: 90,
        startWidth: 100,
        minWidth: 40,
        maxWidth: 160,
      }),
    ).toEqual({ width: 160 })
  })

  it('resizes sibling columns in opposite directions while preserving total width', () => {
    const result = computeColumnResize({
      mode: 'ResizeSibling',
      delta: 25,
      startWidth: 100,
      minWidth: 40,
      maxWidth: 180,
      siblingStartWidth: 120,
      siblingMinWidth: 50,
      siblingMaxWidth: 200,
    })

    expect(result).toEqual({ width: 125, siblingWidth: 95 })
    expect(result.width + result.siblingWidth!).toBe(220)
  })

  it('bounds ResizeSibling by both left and sibling min/max constraints', () => {
    expect(
      computeColumnResize({
        mode: 'ResizeSibling',
        delta: 200,
        startWidth: 100,
        minWidth: 40,
        maxWidth: 180,
        siblingStartWidth: 120,
        siblingMinWidth: 70,
        siblingMaxWidth: 200,
      }),
    ).toEqual({ width: 150, siblingWidth: 70 })

    expect(
      computeColumnResize({
        mode: 'ResizeSibling',
        delta: -200,
        startWidth: 100,
        minWidth: 60,
        maxWidth: 180,
        siblingStartWidth: 120,
        siblingMinWidth: 70,
        siblingMaxWidth: 150,
      }),
    ).toEqual({ width: 70, siblingWidth: 150 })
  })
})
