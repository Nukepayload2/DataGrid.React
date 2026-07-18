/**
 * drag-column-sorting 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据。列定义因两侧类型/render 不同各自保留在 demo 文件，但均引用本文件的
 * `RecordType` 与 `data`（数据本身非拖拽目标，固定不动；拖拽对象是列）。
 *
 * === 两侧各自的拖拽实现（不强求共享状态，各自列重排便于对照）===
 *
 *  - **左 data-grid**：通过公开 `gridOptions.columnDragSort` 启用；内部命中叶子表头格
 *    `data-leaf-index`，用垂直指示线 + arrayMoveColumns 重排 columns。
 *  - **右 antd**：忠实复刻官方 `drag-column-sorting.tsx`（`@dnd-kit/*` + restrictToHorizontalAxis +
 *    SortableContext horizontalListSortingStrategy + `components.header.cell = TableHeaderCell` +
 *    `components.body.cell = TableBodyCell` + DragIndexContext borderInline 虚线指示 +
 *    DragOverlay 预览 + arrayMove）。
 *
 *  两侧各自维护一份 columns（独立的 useState），列拖拽互相不影响，便于对照差异（左垂直指示线 /
 *  右 transform 平移整列 + body cell 虚线 + DragOverlay 预览）。
 */

/** 记录类型。两侧共用。 */
export interface RecordType {
  key: string
  name: string
  gender: string
  age: number
  email: string
  address: string
}

/**
 * 数据（4 行）。两侧共用，保证对照基准一致。
 * 数据本身固定（非拖拽目标），拖拽对象是列顺序。
 */
export const data: RecordType[] = [
  {
    key: '1',
    name: 'John Brown',
    gender: 'male',
    age: 32,
    email: 'John Brown@example.com',
    address: 'London No. 1 Lake Park',
  },
  {
    key: '2',
    name: 'Jim Green',
    gender: 'female',
    age: 42,
    email: 'jimGreen@example.com',
    address: 'London No. 1 Lake Park',
  },
  {
    key: '3',
    name: 'Joe Black',
    gender: 'female',
    age: 32,
    email: 'JoeBlack@example.com',
    address: 'Sidney No. 1 Lake Park',
  },
  {
    key: '4',
    name: 'George Hcc',
    gender: 'male',
    age: 20,
    email: 'george@example.com',
    address: 'Sidney No. 1 Lake Park',
  },
]
