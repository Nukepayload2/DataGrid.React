import { describe, expect, it } from 'vitest'
import {
  buildResizeSiblingByKey,
  buildVisibleLeafKeys,
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
})
