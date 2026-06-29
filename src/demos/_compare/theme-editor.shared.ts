/**
 * theme-editor demo 的共享配置。
 *
 * 与 component-token.shared 同款结构（RecordType + dataSource），但数据行更丰富
 * （含可排序列 Age 数值差异 + 可筛选列 Address 取值分布），用于触发：
 *   - 排序 caret（headerSortHoverBg / headerSortActiveBg 视觉变化）
 *   - 筛选下拉（filterDropdownBg / filterDropdownMenuBg）
 *   - 行选择 checkbox（rowSelectedBg / rowSelectedHoverBg）
 *
 * 两侧（data-grid + antd）共用同一份，列定义因类型不同保留在各 demo 文件。
 */

/** 共享记录类型。两侧共用。 */
export interface RecordType {
  key: number
  name: string
  age: number
  address: string
  description: string
}

/** 12 行数据（Address 取值分布在 London/New York 两类，便于 filters 演示）。两侧复用同一份。 */
export const dataSource: RecordType[] = Array.from({ length: 12 }).map<
  RecordType
>((_, i) => ({
  key: i,
  name: `John Brown ${i}`,
  age: Number(`${i}2`),
  address: i % 2 === 0 ? `New York No. ${i} Lake Park` : `London No. ${i} Park`,
  description: `My name is John Brown ${i}, I am ${i}2 years old, living at ${
    i % 2 === 0 ? `New York No. ${i} Lake Park` : `London No. ${i} Park`
  }.`,
}))
