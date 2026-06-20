/**
 * 决策 9：fixed-header 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据：
 *   - `DataType`：antd 官方 fixed-header demo 的记录类型（4 字段）。
 *   - `dataSource`：100 行 demo 数据（对齐 antd demo `Edward King ${i}`）。
 *
 * 列定义两侧字段（title/dataIndex/width）逐字一致；类型来源不同（data-grid `ColumnType`
 * vs antd `TableColumnsType`），保留各自 demo 文件。
 *
 * 差异（如实保留对照）：
 *   - **scroll.y**：data-grid 用 `scroll.y:true`（决策 7 数据区域模式 + CSS 自适应高度，
 *     父容器 height:300）；antd 用数字 `scroll.y:55*5`（忠实官方）。
 *   - **pagination**：antd 官方 demo 含 `pagination={{ pageSize: 50 }}`（每页 50 条）；
 *     data-grid 默认不分页（全显）——如实保留作为对照点（如需可后续对齐 antd 默认分页）。
 *   - **createStyles 细滚动条**：antd 官方 demo 用 antd-style 自定义细滚动条；data-grid
 *     项目未装 antd-style（决策 6），两侧均用浏览器默认滚动条（视觉略简，功能等价）。
 */
export interface DataType {
  key: string | number
  name: string
  age: number
  address: string
}

/**
 * demo 数据（对齐 antd 官方 fixed-header demo 的 100 行）。
 * 两侧共用同一引用。
 */
export const dataSource: DataType[] = Array.from({ length: 100 }).map<DataType>(
  (_, i) => ({
    key: i,
    name: `Edward King ${i}`,
    age: 32,
    address: `London, Park Lane no. ${i}`,
  }),
)
