/** 记录类型。两侧共用。 */
export interface RecordType {
  key: string
  name: string
  age: number
  address: string
}

/** 初始数据（100 行）。两侧共用初始基准，各自独立编辑。 */
export const originData: RecordType[] = Array.from({ length: 100 }).map<RecordType>((_, i) => ({
  key: i.toString(),
  name: `Edward ${i}`,
  age: 32,
  address: `London Park no. ${i}`,
}))
