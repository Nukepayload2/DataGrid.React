import { Table as AntdTable } from 'antd'
import type { TableColumnsType } from 'antd'
import { dataSource, type DataType } from './_compare/fixed-header.shared'

// 右栏（antd）列定义 —— 忠实复刻 antd 官方 fixed-header demo

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

