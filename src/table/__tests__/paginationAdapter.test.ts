import { describe, expect, it } from 'vitest'
import { getPaginationSize } from '../paginationAdapter'
import type { SizeType, TablePaginationConfig } from '../types'

describe('paginationAdapter', () => {
  it('uses compact pagination for compact table sizes by default', () => {
    const compactTableSizes: Array<SizeType> = ['small', 'middle', 'medium', 'compact']

    for (const tableSize of compactTableSizes) {
      expect(getPaginationSize(tableSize, undefined)).toBe('small')
    }
  })

  it('keeps large and unspecified table sizes at default pagination size', () => {
    expect(getPaginationSize('large', undefined)).toBeUndefined()
    expect(getPaginationSize(undefined, undefined)).toBeUndefined()
  })

  it('lets pagination.size override table size', () => {
    expect(getPaginationSize('large', 'small')).toBe('small')
    expect(getPaginationSize('small', 'default')).toBeUndefined()
  })

  it('covers every supported table size with pagination.size precedence', () => {
    const tableSizes: Array<SizeType> = ['small', 'middle', 'medium', 'compact', 'large']
    const paginationSizes: Array<TablePaginationConfig['size']> = [
      undefined,
      'small',
      'default',
    ]

    const actual = tableSizes.map((tableSize) =>
      paginationSizes.map((paginationSize) => getPaginationSize(tableSize, paginationSize)),
    )

    expect(actual).toEqual([
      ['small', 'small', undefined],
      ['small', 'small', undefined],
      ['small', 'small', undefined],
      ['small', 'small', undefined],
      [undefined, 'small', undefined],
    ])
  })
})
