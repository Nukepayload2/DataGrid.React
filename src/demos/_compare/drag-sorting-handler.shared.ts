/**
 * 决策 9：drag-sorting-handler 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据。列定义因两侧类型/render 不同各自保留在 demo 文件，但均引用本文件的
 * `RecordType` 与 `initialData`。
 *
 * === 两侧各自的拖拽实现（不强求共享状态，各自排序便于对照）===
 *
 *  - **左 data-grid**：方案 B 自研 pointer（复用 S17 `useRowDragSort` + `handleSelector: '.dg-drag-handle'`
 *    限定手柄列触发）。DragHandle 用 antd `<Button>` + 自绘 HolderOutlined SVG（不 import
 *    @ant-design/icons，与 custom-filter-panel/nested-table 约定一致）。
 *  - **右 antd**：忠实复刻官方 `drag-sorting-handler.tsx`（`@dnd-kit/*` + RowContext.Provider 透传
 *    setActivatorNodeRef/listeners 到 DragHandle，仅手柄触发）。图标同样用内联 HolderOutlined SVG
 *    （项目未直接声明 @ant-design/icons 依赖，与左栏共用 InlineHolderOutlined，视觉与官方逐字节一致）。
 *
 *  两侧各自维护一份 dataSource（独立的 useState），拖拽互相不影响，便于对照差异（左指示线 /
 *  右 transform 平移整行；两栏手柄图标均为内联 SVG，视觉一致）。
 */

/** antd drag-sorting-handler demo 的记录类型。两侧共用。 */
export interface RecordType {
  key: string
  name: string
  age: number
  address: string
}

/**
 * antd drag-sorting-handler demo 的初始数据（3 行；第 1 行 address 为短"Long text Long"，
 * 对齐官方 demo——区别于 drag-sorting demo 的超长 address）。
 * 两侧共用，保证对照基准一致。
 */
export const initialData: RecordType[] = [
  { key: '1', name: 'John Brown', age: 32, address: 'Long text Long' },
  { key: '2', name: 'Jim Green', age: 42, address: 'London No. 1 Lake Park' },
  { key: '3', name: 'Joe Black', age: 32, address: 'Sidney No. 1 Lake Park' },
]
