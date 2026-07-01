import type { TableColumnsType } from 'antd'
import { Switch, Table as AntdTable } from 'antd'
import { dataSource, type DataType } from './_compare/sticky.shared'

const antdColumns: TableColumnsType<DataType> = [
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

export interface StickyAntdProps {
  summaryFixed: boolean
  onSummaryFixedChange: (value: boolean) => void
}

export default function StickyAntd({
  summaryFixed = false,
  onSummaryFixedChange = () => {
  },
}: StickyAntdProps) {
  return (
    <AntdTable<DataType>
      columns={antdColumns}
      dataSource={dataSource}
      scroll={{ x: 1500, y: 400 }}
      summary={() => (
        <AntdTable.Summary fixed={summaryFixed ? 'top' : 'bottom'}>
          <AntdTable.Summary.Row>
            <AntdTable.Summary.Cell index={0} colSpan={2}>
              <Switch
                checkedChildren="Fixed Top"
                unCheckedChildren="Fixed Top"
                checked={summaryFixed}
                onChange={(checked) => onSummaryFixedChange(checked)}
              />
            </AntdTable.Summary.Cell>
            <AntdTable.Summary.Cell index={2} colSpan={8}>
              Scroll Context
            </AntdTable.Summary.Cell>
            <AntdTable.Summary.Cell index={10}>Fix Right</AntdTable.Summary.Cell>
          </AntdTable.Summary.Row>
        </AntdTable.Summary>
      )}
    />
  )
}
