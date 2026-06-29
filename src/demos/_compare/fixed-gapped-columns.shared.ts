/**
 * fixed-gapped-columns 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据：
 *   - `DataType`：antd 官方 fixed-gapped-columns demo 的记录类型（4 字段）。
 *   - `dataSource`：2 行 demo 数据（对齐 antd demo 字面量 Olivia / Ethan）。
 *
 * 列定义因两侧类型差异（data-grid `ColumnType` 用 `fixed:'start'/'end'` 逻辑属性；
 * antd `TableColumnsType` 用 `fixed:'start'/'end'`）——列定义保留在各自 demo 文件，
 * 但字段（title/dataIndex/key/width/render）逐字一致，验证「分散固定列堆叠」对照。
 */

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
