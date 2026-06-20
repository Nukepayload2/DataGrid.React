/**
 * 决策 9：fixed-columns-header 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据：
 *   - `DataType`：antd 官方 fixed-columns-header demo 的记录类型（4 字段）。
 *   - `dataSource`：100 行 demo 数据（对齐 antd demo `Edward King ${i}`）。
 *
 * 列定义因两侧类型差异（data-grid `ColumnType` 与 antd `TableColumnsType` 字段同名但
 * 类型来源不同），保留在各自 demo 文件，但字段（title/dataIndex/key/width/fixed/render）
 * 逐字一致。scroll 差异：data-grid 用 `scroll.y:true`（决策 7 数据区域模式，CSS 自适应高度）；
 * antd 用数字 `scroll.y:55*5`（忠实官方）。
 */
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
