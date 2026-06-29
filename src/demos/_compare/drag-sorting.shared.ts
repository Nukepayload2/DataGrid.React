/**
 * drag-sorting 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据。列定义因两侧类型/render 不同（data-grid `ColumnType` 用最简
 * Name/Age/Address 三列；antd `TableColumnsType` 用同结构但独立定义，避免跨类型耦合），各自保留在
 * demo 文件，但均引用本文件的 `RecordType` 与 `initialData`。
 *
 * === 两侧各自的拖拽实现（不强求共享状态，各自排序便于对照）===
 *
 *  - **左 data-grid**：方案 B 自研 pointer（`useRowDragSort` + 事件委托 + 蓝色指示线 + arrayMove）。
 *    不依赖 @dnd-kit（理由：grid 渲染无"行 DOM"，行容器 div 会破坏 CSS Grid 布局）。
 *  - **右 antd**：忠实复刻官方 `drag-sorting.tsx`（`@dnd-kit/*` DndContext + PointerSensor +
 *    restrictToVerticalAxis + SortableContext + `components.body.row = Row` useSortable +
 *    transform 跟随指针 + arrayMove）。
 *
 *  两侧各自维护一份 dataSource（独立的 useState），拖拽互相不影响，便于对照差异（左指示线 /
 *  右 transform 平移整行）。
 */

/** 记录类型。两侧共用。 */
export interface RecordType {
  key: string
  name: string
  age: number
  address: string
}

/**
 * 初始数据（3 行；第 1 行 address 为超长文本，测换行行高）。
 * 两侧共用，保证对照基准一致。
 */
export const initialData: RecordType[] = [
  {
    key: '1',
    name: 'John Brown',
    age: 32,
    address:
      'Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text',
  },
  {
    key: '2',
    name: 'Jim Green',
    age: 42,
    address: 'London No. 1 Lake Park',
  },
  {
    key: '3',
    name: 'Joe Black',
    age: 32,
    address: 'Sidney No. 1 Lake Park',
  },
]
