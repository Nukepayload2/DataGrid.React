/** component-token / dynamic-settings 共享记录类型。 */
export interface RecordType {
  key: number
  name: string
  age: number
  address: string
  description: string
}

/** 10 行数据（对齐 antd component-token demo 的 dataSource）。两侧复用同一份。 */
export const dataSource: RecordType[] = Array.from({ length: 10 }).map<
  RecordType
>((_, i) => ({
  key: i,
  name: 'John Brown',
  age: Number(`${i}2`),
  address: `New York No. ${i} Lake Park`,
  description: `My name is John Brown, I am ${i}2 years old, living in New York No. ${i} Lake Park.`,
}))

/** 默认 title / footer（无副作用函数字面量，两侧共用）。 */
export const defaultTitle = () => 'Here is title'
export const defaultFooter = () => 'Here is footer'
