/**
 * responsive 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据。列定义因两侧类型不同（data-grid `ColumnType` vs antd
 * `TableProps['columns']`）保留在各自 demo 文件，但字段完全一致（responsive 字段两侧都支持）。
 */

/** 记录类型。两侧共用。 */
export interface RecordType {
  key: React.Key
  name: string
  age: number
  address: string
}

/** 数据（1 行）。两侧共用。 */
export const data: RecordType[] = [
  {
    key: '1',
    name: 'John Brown',
    age: 32,
    address: 'New York No. 1 Lake Park',
  },
]
