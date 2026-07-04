import type { TableColumnsType } from 'antd'
import { Tag, Table as AntdTable } from 'antd'
import { dataSource, type DataType } from './_compare/sticky.shared'

const stickyContainer = (): HTMLElement | Window =>
  document.querySelector<HTMLElement>('.ant-layout-content') ?? window

const statusColor: Record<DataType['status'], string> = {
  'On track': 'green',
  'At risk': 'gold',
  Blocked: 'red',
}

const antdColumns: TableColumnsType<DataType> = [
  { title: 'Initiative', width: '22%', dataIndex: 'initiative', key: 'initiative' },
  { title: 'Owner', width: '14%', dataIndex: 'owner', key: 'owner' },
  {
    title: 'Status',
    width: '12%',
    dataIndex: 'status',
    key: 'status',
    render: (status: DataType['status']) => (
      <Tag color={statusColor[status]} style={{ marginInlineEnd: 0 }}>
        {status}
      </Tag>
    ),
  },
  { title: 'Impact', width: '12%', dataIndex: 'impact', key: 'impact' },
  { title: 'Target', width: '10%', dataIndex: 'target', key: 'target' },
  { title: 'Notes', width: '30%', dataIndex: 'notes', key: 'notes' },
]

export default function StickyAntd() {
  return (
    <AntdTable<DataType>
      columns={antdColumns}
      dataSource={dataSource}
      pagination={false}
      scroll={{ x: '100%' }}
      sticky={{
        offsetHeader: 0,
        offsetScroll: 0,
        getContainer: stickyContainer,
      }}
      summary={(rows) => (
        <AntdTable.Summary>
          <AntdTable.Summary.Row>
            <AntdTable.Summary.Cell index={0} colSpan={2}>
              Total initiatives
            </AntdTable.Summary.Cell>
            <AntdTable.Summary.Cell index={2}>{rows.length}</AntdTable.Summary.Cell>
            <AntdTable.Summary.Cell index={3} colSpan={3}>
              Reviewed in document flow
            </AntdTable.Summary.Cell>
          </AntdTable.Summary.Row>
        </AntdTable.Summary>
      )}
    />
  )
}
