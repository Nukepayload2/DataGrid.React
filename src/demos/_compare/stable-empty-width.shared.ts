/**
 * stable-empty-width demo 共享数据。
 *
 * 直击 antd #56151（空数据列宽缩减）、#56713（scroll.y + 空数据因占位 th 列宽跳动）、
 * #55717（增列时 MeasureRow 高度抖动）。两侧均用**显式数字 px width** 的列，
 * data-grid 由 `grid-template-columns` 单点真理源严格生效；antd 如实呈现空数据/增列时的抖动。
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

/** 列数上下界（动态增/删列演示 #55717）。 */
export const COLUMN_COUNT_MIN = 3
export const COLUMN_COUNT_MAX = 6

/** 初始可见列数。 */
export const COLUMN_COUNT_DEFAULT = 4

/**
 * scroll.y：两侧均启用以触发 #56713（scroll.y + 空数据占位 th 列宽跳动）。
 *
 * - antd 侧：`scroll={{ y: SCROLL_Y }}`（数字 max-height，与官方一致）。
 * - data-grid 侧：`scroll={{ y: true }}` 仅接受布尔，父容器需明确高度，
 *   外层固定高度 div 用 `DG_WRAPPER_HEIGHT`（≈ 表头 + 5 行可见 + 余量）。
 */
export const SCROLL_Y = 220
export const DG_WRAPPER_HEIGHT = 280
