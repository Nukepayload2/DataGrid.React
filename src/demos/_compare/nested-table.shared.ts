/**
 * nested-table 左右对比 demo 的共享配置（嵌套子表格）。
 *
 * 提取两侧都复用的类型与数据（主表 + 子表）。
 * 列定义因类型不同（data-grid `ColumnType` / antd `ColumnsType`）由各自 demo 声明，
 * 本文件只共享类型 + 数据 + Dropdown items。
 *
 * antd `nested-table` demo 要素：
 *   - 主表 7 列：Name / Platform / Version / Upgraded / Creator / Date / Action。
 *   - `expandable.expandedRowRender`：返回嵌套子 `<Table>`（5 列：
 *     Date / Name / Status(Badge) / Upgrade Status / Action(Dropdown)），`pagination={false}`。
 *   - `expandable.defaultExpandedRowKeys: ['0']`。
 *   - 三张主表演示 size：默认（large）/ `size="medium"` / `size="small"`。
 */

/** 子表记录类型（expandedRowRender 内嵌套 Table 的数据）。 */
export interface ExpandedDataType {
  key: React.Key
  date: string
  name: string
  upgradeNum: string
}

/** 主表记录类型。两侧共用。 */
export interface RecordType {
  key: React.Key
  name: string
  platform: string
  version: string
  upgradeNum: number
  creator: string
  createdAt: string
}

/** Dropdown items（Action 列 More 下拉）。两侧共用。 */
export const items = [
  { key: '1', label: 'Action 1' },
  { key: '2', label: 'Action 2' },
]

/** 子表数据（3 行）。两侧共用。 */
export const expandDataSource: ExpandedDataType[] = Array.from({ length: 3 }).map(
  (_, i) => ({
    key: i.toString(),
    date: '2014-12-24 23:12:00',
    name: 'This is production name',
    upgradeNum: 'Upgraded: 56',
  }),
)

/** 主表数据（3 行）。两侧共用。 */
export const dataSource: RecordType[] = Array.from({ length: 3 }).map((_, i) => ({
  key: i.toString(),
  name: 'Screen',
  platform: 'iOS',
  version: '10.3.4.5654',
  upgradeNum: 500,
  creator: 'Jack',
  createdAt: '2014-12-24 23:12:00',
}))
