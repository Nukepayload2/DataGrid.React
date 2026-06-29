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
 * 本文件（`placementOptions`），子文件与父文件均引用。
 *
 * === 拆子文件（task：live 编辑接入）===
 *
 * `TablePaginationPlacement` 类型（纯字符串字面量联合，不含 React）与 `placementOptions`
 * （6 位置 + none 互斥选项数组）提升到本文件，供 dg/antd 子文件 + 父文件共同引用——
 * 避免子文件跨子文件 import 类型（破坏 live scope），同时保持两侧选项字面一致。
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
 * 分页位置（S11，对齐 antd v6 `TablePaginationPlacement`，**以 antd 6.4.4 实测为准**）。
 *
 * 值域：`topStart | topCenter | topEnd | bottomStart | bottomCenter | bottomEnd | none`。
 * 纯字符串字面量联合（不含 React），故提升到本 shared 文件供两侧子文件 + 父文件共用，
 * 避免子文件跨子文件 import 类型（破坏 live scope）。
 *
 * 注：data-grid `../table` 也导出同名类型（与其字面一致），dg 子文件按需亦可从
 * `'../table'` import；本文件单独声明是为了 antd 子文件也能引用（antd 不公开此类型）。
 */
export type TablePaginationPlacement =
  | 'topStart'
  | 'topCenter'
  | 'topEnd'
  | 'bottomStart'
  | 'bottomCenter'
  | 'bottomEnd'
  | 'none'

/**
 * 单翻页器 placement 互斥选项（task #28）。
 *
 * 6 个位置（top/bottom × Start/Center/End）+ none（关闭分页器）。
 * 选中后以 `placement: [selected]` 单元素数组传给两侧表格。
 * 父文件顶部 `Radio.Group` 的 options；子文件无需直接引用（仅用 `placement` prop）。
 */
export const placementOptions: Array<{
  label: string
  value: TablePaginationPlacement
}> = [
  { label: 'topStart', value: 'topStart' },
  { label: 'topCenter', value: 'topCenter' },
  { label: 'topEnd', value: 'topEnd' },
  { label: 'bottomStart', value: 'bottomStart' },
  { label: 'bottomCenter', value: 'bottomCenter' },
  { label: 'bottomEnd', value: 'bottomEnd' },
  { label: 'none', value: 'none' },
]
