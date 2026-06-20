/**
 * 决策 9：pagination 左右对比 demo 的共享配置（S11 分页集成与位置 / task #28 重做）。
 *
 * 提取两侧都复用的类型与数据。列定义因两侧类型不同（data-grid `ColumnType`
 * vs antd `TableProps['columns']`）保留在各自 demo 文件，但均引用本文件的
 * `RecordType` 与 `data`。
 *
 * === task #28 改动 ===
 *
 * 原 B14 双翻页器版本导出的 `topOptions` / `bottomOptions`（两个 Radio.Group 分别选
 * top / bottom）已废弃。重做后 demo 用**单翻页器 + 6 位置互斥选一**，选项直接定义在
 * `pagination.tsx` 内（`placementOptions`），本文件仅保留共享的 `RecordType` + `data`。
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
