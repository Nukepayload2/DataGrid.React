/** row-selection 对照 demo 的共享类型与数据。 */

/** 记录类型。两侧共用。 */
export interface RecordType {
  key: React.Key
  name: string
  age: number
  address: string
}

/** 4 行对照数据；最后一行继续由两侧同款谓词禁用。 */
export const data: RecordType[] = [
  { key: '1', name: 'John Brown', age: 32, address: 'New York No. 1 Lake Park' },
  { key: '2', name: 'Jim Green', age: 42, address: 'London No. 1 Lake Park' },
  { key: '3', name: 'Joe Black', age: 32, address: 'Sydney No.1 Lake Park' },
  { key: '4', name: 'Disabled User', age: 99, address: 'Sydney No.1 Lake Park' },
]
