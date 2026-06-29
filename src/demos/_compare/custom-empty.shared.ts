/**
 * custom-empty 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据生成函数。列定义因两侧类型不同（data-grid `ColumnType` vs antd
 * `TableProps['columns']`）且 Age 列 filters 随 dataSource 变化，保留在各自 demo 文件。
 */

/** 记录类型。两侧共用。 */
export interface RecordType {
  key: number
  name: string
  age: number
  address: string
}

/**
 * 生成假数据（对齐 antd custom-empty demo 的 genFakeData 字段约定）。
 * - count 默认 5。
 * - name = `Edward King ${index}`，age = 32 + index，address = `London, Park Lane no. ${index}`。
 */
export const genFakeData = (count = 5): RecordType[] =>
  Array.from({ length: count }).map<RecordType>((_, index) => ({
    key: index,
    name: `Edward King ${index}`,
    age: 32 + index,
    address: `London, Park Lane no. ${index}`,
  }))
