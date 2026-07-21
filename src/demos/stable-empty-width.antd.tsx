import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { sampleData, SCROLL_Y, type RecordType } from './_compare/stable-empty-width.shared'

/**
 * 与 data-grid 侧**完全相同**的列定义（相同 dataIndex/key/width），只类型不同。
 *
 * 如实呈现 antd 三条 bug，不做任何 hack掩盖：
 * - #56151 空数据列宽缩减：dataSource 为空时 colgroup 的 width 提示不被严格执行。
 * - #56713 scroll.y + 空数据：占位 `<th>`（rc-table 为表头对齐表体滚动条插入的 spacer th）
 *   在空/非空切换时列宽跳动。
 * - #55717 增列 MeasureRow 抖动：rc-table 内部测量行在列数变化时重新计算，可见高度/宽度抖动。
 */
const allColumns: NonNullable<TableProps<RecordType>['columns']> = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: 'Name', dataIndex: 'name', key: 'name', width: 150 },
  { title: 'Age', dataIndex: 'age', key: 'age', width: 80 },
  { title: 'Address', dataIndex: 'address', key: 'address', width: 220 },
  { title: 'Email', dataIndex: 'email', key: 'email', width: 200 },
  { title: 'Phone', dataIndex: 'phone', key: 'phone', width: 160 },
]

export default function StableEmptyWidthAntd({
  hasData,
  columnCount,
}: {
  hasData: boolean
  columnCount: number
}) {
  return (
    <AntdTable<RecordType>
      bordered
      columns={allColumns.slice(0, columnCount)}
      dataSource={hasData ? sampleData : []}
      pagination={false}
      rowKey="key"
      size="small"
      scroll={{ y: SCROLL_Y }}
    />
  )
}
