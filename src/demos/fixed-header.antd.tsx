/**
 * fixed-header demo 的 antd 段（右栏）。
 *
 * props 驱动 `{ bordered, virtual }`（由 fixed-header.tsx 父组件传）。
 * 自包含：含 `antdColumns`（Name/Age/Address 3 列）+ `<AntdTable>` JSX。
 * 忠实复刻 antd 官方 fixed-header demo：scroll y 55*5 + pagination pageSize 50 + 100 行。
 */
import { Table as AntdTable } from 'antd'
import type { TableColumnsType } from 'antd'
import { dataSource, type DataType } from './_compare/fixed-header.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd 官方 fixed-header demo
// ---------------------------------------------------------------------------

const antdColumns: TableColumnsType<DataType> = [
  { title: 'Name', dataIndex: 'name', width: 150 },
  { title: 'Age', dataIndex: 'age', width: 150 },
  { title: 'Address', dataIndex: 'address' },
]

export default function FixedHeaderAntd({
  bordered = false,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  return (
    <AntdTable<DataType>
      columns={antdColumns}
      dataSource={dataSource}
      bordered={bordered}
      pagination={{ pageSize: 50 }}
      scroll={{ y: 55 * 5 }}
      virtual={virtual}
    />
  )
}
