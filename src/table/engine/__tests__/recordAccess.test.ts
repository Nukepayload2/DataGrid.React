import { describe, expect, it } from 'vitest'
import { getRowKey, getValueByDataIndex } from '../recordAccess'

describe('recordAccess', () => {
  it('returns undefined for null records and empty dataIndex', () => {
    expect(getValueByDataIndex(null, 'id')).toBeUndefined()
    expect(getValueByDataIndex({ id: 1 }, undefined)).toBeUndefined()
    expect(getValueByDataIndex({ id: 1 }, null)).toBeUndefined()
  })

  it('reads direct string and number keys', () => {
    expect(getValueByDataIndex({ name: 'Ada' }, 'name')).toBe('Ada')
    expect(getValueByDataIndex(['zero', 'one'], 1)).toBe('one')
  })

  it('reads nested array paths and stops on undefined intermediates', () => {
    const record = { user: { names: ['Ada'] } }

    expect(getValueByDataIndex(record, ['user', 'names', 0])).toBe('Ada')
    expect(getValueByDataIndex(record, ['user', 'missing', 0])).toBeUndefined()
  })

  it('does not parse dot strings as paths', () => {
    expect(getValueByDataIndex({ user: { name: 'Ada' }, 'user.name': 'direct' }, 'user.name')).toBe('direct')
  })

  it('resolves row keys from functions, direct fields, and missing fields', () => {
    expect(getRowKey({ id: 0 }, (record) => record.id)).toBe(0)
    expect(getRowKey({ id: '' }, 'id')).toBe('')
    expect(getRowKey({ id: 0 }, 'id')).toBe(0)
    expect(getRowKey({ name: 'Ada' }, 'id')).toBe('')
    expect(getRowKey(null, 'id')).toBe('')
  })
})
