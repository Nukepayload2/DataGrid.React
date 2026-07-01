/** theme-editor 对照 demo 的共享数据。 */

/** 共享记录类型。两侧共用。 */
export interface RecordType {
  key: number
  name: string
  age: number
  address: string
  description: string
}

/** 12 行对照数据，覆盖排序、筛选和选中态相关的可视状态。 */
export const dataSource: RecordType[] = Array.from({ length: 12 }).map<
  RecordType
>((_, i) => ({
  key: i,
  name: `John Brown ${i}`,
  age: Number(`${i}2`),
  address: i % 2 === 0 ? `New York No. ${i} Lake Park` : `London No. ${i} Park`,
  description: `My name is John Brown ${i}, I am ${i}2 years old, living at ${
    i % 2 === 0 ? `New York No. ${i} Lake Park` : `London No. ${i} Park`
  }.`,
}))
