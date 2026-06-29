/**
 * size 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型、数据、列形状（size demo 列简单：Name/Age/Address 纯文本，
 *两侧列定义可共享形状，仅类型不同——data-grid `ColumnType` vs antd `TableProps['columns']`，
 * 但字段完全一致，故提供原始 column 数据由两侧各自加类型）。
 */

/** 记录类型。两侧共用。 */
export interface RecordType {
  key: React.Key
  name: string
  age: number
  address: string
}

/** 数据（3 行）。两侧共用。 */
export const data: RecordType[] = [
  { key: '1', name: 'John Brown', age: 32, address: 'New York No. 1 Lake Park' },
  { key: '2', name: 'Jim Green', age: 42, address: 'London No. 1 Lake Park' },
  { key: '3', name: 'Joe Black', age: 32, address: 'Sydney No. 1 Lake Park' },
]

/**
 * 原始列定义（字段与 antd demo 一致）。两侧各自加类型注解：
 *   - data-grid: `ColumnType<RecordType>[]`
 *   - antd: `NonNullable<TableProps<RecordType>['columns']>`
 */
export const rawColumns = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Age', dataIndex: 'age' },
  { title: 'Address', dataIndex: 'address' },
] as const
