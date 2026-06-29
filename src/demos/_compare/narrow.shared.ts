/**
 * narrow 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型、数据、列形状。narrow demo 列简单（Name/Age/Address 纯文本），
 * 两侧列定义字段一致，仅类型不同，故提供原始列数据由两侧各自加类型。
 */

/** 记录类型。两侧共用。 */
export interface RecordType {
  key: React.Key
  name: string
  age: number
  address: string
}

/** 数据（200 行）。两侧共用。 */
export const dataSource = Array.from({ length: 200 }).map<RecordType>((_, key) => ({
  key,
  name: 'Sample Name',
  age: 30 + (key % 5),
  address: `Sample Address ${key}`,
}))

/**
 * 原始列定义（字段与 antd demo 一致）。两侧各自加类型注解。
 */
export const rawColumns = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Age', dataIndex: 'age' },
  { title: 'Address', dataIndex: 'address' },
] as const
