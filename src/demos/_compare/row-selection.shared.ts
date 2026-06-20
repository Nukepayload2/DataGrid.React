/**
 * 决策 9：row-selection 左右对比 demo 的共享配置（M5）。
 *
 * 提取两侧都复用的类型与数据。列定义因两侧类型不同（data-grid `ColumnType` 用 Name 列
 * `<a>` render；antd `TableProps['columns']` 同款 `<a>` render，结构等价），但因两侧
 * 均在各自 demo 文件内声明保持职责清晰，统一引用本文件的 `RecordType` 与 `data`。
 */

/** antd row-selection demo 的记录类型。两侧共用。 */
export interface RecordType {
  key: React.Key
  name: string
  age: number
  address: string
}

/**
 * antd row-selection demo 的数据（4 行）。两侧共用，保证对照基准一致。
 *
 * 最后一行 "Disabled User" 被 `getCheckboxProps` 禁用（两侧同款判定 record.name === 'Disabled User'）。
 */
export const data: RecordType[] = [
  { key: '1', name: 'John Brown', age: 32, address: 'New York No. 1 Lake Park' },
  { key: '2', name: 'Jim Green', age: 42, address: 'London No. 1 Lake Park' },
  { key: '3', name: 'Joe Black', age: 32, address: 'Sydney No.1 Lake Park' },
  { key: '4', name: 'Disabled User', age: 99, address: 'Sydney No.1 Lake Park' },
]
