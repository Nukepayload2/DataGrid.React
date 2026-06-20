/**
 * 决策 9：row-selection-and-operation 左右对比 demo 的共享配置（S8 受控）。
 *
 * 提取两侧都复用的类型与数据生成函数。列定义因两侧类型不同（data-grid `ColumnType`
 * vs antd `TableProps['columns']`）保留在各自 demo 文件，但均引用本文件的 `RecordType`
 * 与 `dataSource`。
 */

/** antd row-selection-and-operation demo 的记录类型。两侧共用。 */
export interface RecordType {
  key: React.Key
  name: string
  age: number
  address: string
}

/**
 * 生成 46 行数据（对齐 antd row-selection-and-operation demo：Edward King 0..45，
 * age 32，address `London, Park Lane no. i`）。两侧共用。
 */
export const dataSource: RecordType[] = Array.from({ length: 46 }).map<RecordType>((_, i) => ({
  key: i,
  name: `Edward King ${i}`,
  age: 32,
  address: `London, Park Lane no. ${i}`,
}))
