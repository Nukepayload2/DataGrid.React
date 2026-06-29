/**
 * row-selection-fixed 左右对比 demo 的共享配置。
 *
 * 复刻 antd 测试 `Table.rowSelection.test.tsx:807-829`（selection 列邻列 fixed 继承）
 * + useSelection.tsx:694-717 的继承逻辑，提取两侧都复用的类型与数据。
 *
 * 列定义因两侧类型不同（data-grid `ColumnType` 用 `fixed:'start'/'end'` 逻辑属性；
 * antd `TableProps['columns']` 用 `fixed:'left'/'right'` 物理属性），保留在各自 demo
 * 文件，但列字段逐字一致（首列 Name width 200 fixed 由 firstColFixed 开关控、中间 6 个
 * 占位列 width 100、末列 Action width 100 fixed 末尾，render `<a>action</a>`）。
 */

/** 记录类型。两侧共用。 */
export interface RecordType {
  key: string
  name: string
}

/** 数据（4 行）。两侧共用，保证对照基准一致。 */
export const data: RecordType[] = [
  { key: '1', name: 'Edward King 0' },
  { key: '2', name: 'Edward King 1' },
  { key: '3', name: 'Edward King 2' },
  { key: '4', name: 'Edward King 3' },
]
