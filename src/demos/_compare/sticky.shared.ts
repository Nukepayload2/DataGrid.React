/**
 * 决策 9：sticky 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据：
 *   - `DataType`：antd 官方 sticky demo 的记录类型（4 字段）。
 *   - `dataSource`：100 行 demo 数据（对齐 antd demo `Edward ${i}`）。
 *
 * 列定义两侧字段（title/dataIndex/key/width/fixed/render）逐字一致；类型来源不同
 * （data-grid `ColumnType` vs antd `TableColumnsType`），保留各自 demo 文件。
 *
 * 差异（如实保留对照）：
 *   - **summary fixed**：antd 官方 demo 用 `fixed: fixedTop ? 'top' : 'bottom'` 切换
 *     summary 顶/底 sticky；data-grid S22 summary 的 `fixed` 简化为 boolean（仅 sticky
 *     bottom，不支持 'top'），Switch 切换 on/off（功能等价：summary fixed 在 grid 内，
 *     与页面级表头共存）。
 *   - **S34 页面级 vs M8 容器内**：data-grid sticky 启用时走页面级 StickyScrollBar（不消费
 *     横向悬浮条，S34 原设计）；antd rc-table 的 sticky 与 data-grid 简化路径不同但视觉
 *     对齐（表头跟随页面滚动固定 + offsetHeader:64）。
 */
export interface DataType {
  key: string | number
  name: string
  age: number
  address: string
}

/**
 * demo 数据（对齐 antd 官方 sticky demo 的 100 行）。
 * 两侧共用同一引用。
 */
export const dataSource: DataType[] = Array.from({ length: 100 }).map<DataType>(
  (_, i) => ({
    key: i,
    name: `Edward ${i}`,
    age: 32,
    address: `London Park no. ${i}`,
  }),
)
