/**
 * 决策 9：row-selection-custom 左右对比 demo 的共享配置（S9）。
 *
 * 提取两侧都复用的类型与数据。两侧 selections 数组（3 内置哨兵 + odd/even 自定义）逻辑
 * 一致但类型不同（data-grid `SelectionItem` / antd `TableSelectionItem`），各自在 demo 文件
 * 内声明；本文件只共享 `RecordType` + `dataSource`。
 */

/** antd row-selection-custom demo 的记录类型。两侧共用。 */
export interface RecordType {
  key: React.Key
  name: string
  age: number
  address: string
}

/**
 * antd row-selection-custom demo 的数据（46 行）。两侧共用，保证对照基准一致。
 *
 * 行名 `Edward King 0..45`，age 32，address `London, Park Lane no. i`——与 antd demo 逐字一致。
 */
export const dataSource: RecordType[] = Array.from({ length: 46 }).map<RecordType>((_, i) => ({
  key: i,
  name: `Edward King ${i}`,
  age: 32,
  address: `London, Park Lane no. ${i}`,
}))
