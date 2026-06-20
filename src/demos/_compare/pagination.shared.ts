/**
 * 决策 9：pagination 左右对比 demo 的共享配置（S11 分页集成与位置）。
 *
 * 提取两侧都复用的类型与数据。列定义因两侧类型不同（data-grid `ColumnType`
 * vs antd `TableProps['columns']`）保留在各自 demo 文件，但均引用本文件的
 * `RecordType` 与 `data`。
 */

/** antd pagination demo 的记录类型。两侧共用。 */
export interface RecordType {
  key: string
  name: string
  age: number
  address: string
  tags: string[]
}

/**
 * 3 行数据（对齐 antd pagination demo：John Brown / Jim Green / Joe Black）。
 * 两侧共用。pageSize 默认 10 → 1 页（分页器仍渲染以演示 placement 位置切换）。
 */
export const data: RecordType[] = [
  {
    key: '1',
    name: 'John Brown',
    age: 32,
    address: 'New York No. 1 Lake Park',
    tags: ['nice', 'developer'],
  },
  {
    key: '2',
    name: 'Jim Green',
    age: 42,
    address: 'London No. 1 Lake Park',
    tags: ['kawaii'],
  },
  {
    key: '3',
    name: 'Joe Black',
    age: 32,
    address: 'Sydney No. 1 Lake Park',
    tags: ['cool', 'teacher'],
  },
]

/**
 * 顶部 / 底部 placement 单选选项（对齐 antd pagination demo 的 topOptions/bottomOptions）。
 * data-grid 的 `TablePaginationPlacement` 与 antd v6 `TablePaginationPlacement`
 * 同名同值集，两侧共用同一份选项。
 */
export const topOptions = [
  { label: 'topStart', value: 'topStart' },
  { label: 'topCenter', value: 'topCenter' },
  { label: 'topEnd', value: 'topEnd' },
  { label: 'none', value: 'none' },
] as const

export const bottomOptions = [
  { label: 'bottomStart', value: 'bottomStart' },
  { label: 'bottomCenter', value: 'bottomCenter' },
  { label: 'bottomEnd', value: 'bottomEnd' },
  { label: 'none', value: 'none' },
] as const
