/**
 * row-selection-custom-debug 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据。两侧 `renderCell` 逻辑逐字一致（同款合并行 +
 * checked:node 渲染），但因类型不同（data-grid `TableRowSelection` / antd
 * `TableProps['rowSelection']`）各自在 demo 文件内声明；本文件只共享
 * `RecordType` + `dataSource`。
 *
 * antd demo 要素：
 *   - 46 行数据（`key: i, name: i%2===0 ? 'Edward King i' : 'Another Row'`）。
 *   - 单列 Name。
 *   - `rowSelection.renderCell(checked, _record, index, node)` 返回
 *     `{ props: { rowSpan: index % 2 === 0 ? 2 : 0 }, children: <>{String(checked)}: {node}</> }`。
 */

/** 记录类型。两侧共用。 */
export interface RecordType {
  key: React.Key
  name: string
}

/** 数据（46 行）。两侧共用。 */
export const dataSource: RecordType[] = Array.from({ length: 46 }).map<
  RecordType
>((_, i) => ({
  key: i,
  name: i % 2 === 0 ? `Edward King ${i}` : 'Another Row',
}))
