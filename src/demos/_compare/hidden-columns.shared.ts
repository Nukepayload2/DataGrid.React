/** hidden-columns 左右对比 demo 的共享配置：提取两侧复用的类型、数据、原始列定义（8 列 dataIndex 全为 address，title 各异）。两侧列定义字段一致，仅类型不同（data-grid `ColumnType` vs antd `TableProps['columns']`），故提供原始列数据由两侧各自加类型。 */

/** antd hidden-columns demo 的记录类型。两侧共用。 */
export interface RecordType {
  key: React.Key
  name: string
  age: number
  address: string
}

/** antd hidden-columns demo 的数据（2 行）。两侧共用。 */
export const data: RecordType[] = [
  { key: '1', name: 'John Brown', age: 32, address: 'New York Park' },
  { key: '2', name: 'Jim Green', age: 40, address: 'London Park' },
]

/**
 * 原始列定义（8 列，dataIndex 全为 address，title 各异，key 为 '1'..'8'）。
 * 与 antd demo 逐字一致。两侧各自加类型注解。
 */
export const rawColumns = [
  { title: 'Column 1', dataIndex: 'address', key: '1' },
  { title: 'Column 2', dataIndex: 'address', key: '2' },
  { title: 'Column 3', dataIndex: 'address', key: '3' },
  { title: 'Column 4', dataIndex: 'address', key: '4' },
  { title: 'Column 5', dataIndex: 'address', key: '5' },
  { title: 'Column 6', dataIndex: 'address', key: '6' },
  { title: 'Column 7', dataIndex: 'address', key: '7' },
  { title: 'Column 8', dataIndex: 'address', key: '8' },
] as const

/** 默认全选（所有列可见）。 */
export const defaultCheckedList = rawColumns.map((item) => item.key)
