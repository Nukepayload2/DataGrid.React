/** 记录类型。两侧共用。 */
export interface DataType {
  key: string | number
  name: string
  age: number
  address: string
}

/**
 * demo 数据（对齐 antd 官方 fixed-gapped-columns demo 的 2 行字面量）。
 * 两侧共用同一引用，确保对照差异仅在渲染层。
 */
export const dataSource: DataType[] = [
  { key: '1', name: 'Olivia', age: 32, address: 'New York Park' },
  { key: '2', name: 'Ethan', age: 40, address: 'London Park' },
]
