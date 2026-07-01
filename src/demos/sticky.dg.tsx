import { Switch } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { dataSource, type DataType } from './_compare/sticky.shared'

const dgColumns: ColumnType<DataType>[] = [
  { title: 'Full Name', width: 100, dataIndex: 'name', key: 'name', fixed: 'start' },
  { title: 'Age', width: 100, dataIndex: 'age', key: 'age', fixed: 'start' },
  { title: 'Column 1', dataIndex: 'address', key: '1', width: 150 },
  { title: 'Column 2', dataIndex: 'address', key: '2', width: 150 },
  { title: 'Column 3', dataIndex: 'address', key: '3', width: 150 },
  { title: 'Column 4', dataIndex: 'address', key: '4', width: 150 },
  { title: 'Column 5', dataIndex: 'address', key: '5', width: 150 },
  { title: 'Column 6', dataIndex: 'address', key: '6', width: 150 },
  { title: 'Column 7', dataIndex: 'address', key: '7', width: 150 },
  { title: 'Column 8', dataIndex: 'address', key: '8' },
  {
    title: 'Action',
    key: 'operation',
    fixed: 'end',
    width: 100,
    render: () => <a>action</a>,
  },
]

export interface StickyDgProps {
  summaryFixed: boolean
  onSummaryFixedChange: (value: boolean) => void
}

export default function StickyDg({
  summaryFixed = false,
  onSummaryFixedChange = () => {
  },
}: StickyDgProps) {
  return (
    <div style={{ height: 500 }}>
      <Table<DataType>
        columns={dgColumns}
        dataSource={dataSource}
        scroll={{ x: 1500, y: true }}
        pagination={{}}
        summary={() => (
          <Table.Summary fixed={summaryFixed}>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <Switch
                  checkedChildren="Summary Fixed"
                  unCheckedChildren="Summary Fixed"
                  checked={summaryFixed}
                  onChange={(checked) => onSummaryFixedChange(checked)}
                />
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} colSpan={8}>
                Scroll Context
              </Table.Summary.Cell>
              <Table.Summary.Cell index={10}>Fix Right</Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </div>
  )
}
