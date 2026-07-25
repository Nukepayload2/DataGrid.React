/**
 * stable-empty-width demo 共享数据。
 *
 * 两侧使用相同的列定义和样本数据，便于观察空数据、滚动和增删列时的列宽变化。
 */

/** 记录类型。两侧共用。 */
export interface RecordType {
  key: string
  id: string
  name: string
  age: number
  address: string
  email: string
  phone: string
}

/** 5 行样本数据，字段覆盖全部 6 列。 */
export const sampleData: RecordType[] = [
  { key: '1', id: 'ID-001', name: 'Edward King 0', age: 32, address: 'London, Park Lane no. 0', email: 'edward@example.com', phone: '+1 202 555 0000' },
  { key: '2', id: 'ID-002', name: 'Edward King 1', age: 33, address: 'London, Park Lane no. 1', email: 'edward1@example.com', phone: '+1 202 555 0001' },
  { key: '3', id: 'ID-003', name: 'Edward King 2', age: 34, address: 'London, Park Lane no. 2', email: 'edward2@example.com', phone: '+1 202 555 0002' },
  { key: '4', id: 'ID-004', name: 'Edward King 3', age: 35, address: 'London, Park Lane no. 3', email: 'edward3@example.com', phone: '+1 202 555 0003' },
  { key: '5', id: 'ID-005', name: 'Edward King 4', age: 36, address: 'London, Park Lane no. 4', email: 'edward4@example.com', phone: '+1 202 555 0004' },
]

/** 列数上下界（用于演示增删列时的列宽变化）。 */
export const COLUMN_COUNT_MIN = 3
export const COLUMN_COUNT_MAX = 6

/** 初始可见列数。 */
export const COLUMN_COUNT_DEFAULT = 4

/**
 * 两侧都开启竖向滚动，便于观察空 / 非空切换时的表头和列宽表现。
 */
export const SCROLL_Y = 220
export const DG_WRAPPER_HEIGHT = 280
