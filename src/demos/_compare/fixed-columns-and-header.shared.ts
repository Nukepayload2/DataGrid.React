export interface DataType {
  key: string | number
  name: string
  age: number
  address: string
}

/**
 * demo 数据（对齐 antd 官方 fixed-columns-header demo 的 100 行）。
 * 两侧共用同一引用，确保对照差异仅在渲染层。
 */
export const dataSource: DataType[] = Array.from({ length: 100 }).map<DataType>(
  (_, i) => ({
    key: i,
    name: `Edward King ${i}`,
    age: 32,
    address: `London, Park Lane no. ${i}`,
  }),
)
