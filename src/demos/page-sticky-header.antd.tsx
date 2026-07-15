import type { TableColumnsType } from 'antd'
import { Tag, Table as AntdTable } from 'antd'
import { dataSource, type DataType } from './_compare/page-sticky-header.shared'

const stickyContainer = (): HTMLElement | Window =>
  document.querySelector<HTMLElement>('.ant-layout-content') ?? window

const statusColor: Record<DataType['status'], string> = {
  正常: 'green',
  有风险: 'gold',
  受阻: 'red',
}

const antdColumns: TableColumnsType<DataType> = [
  { title: '事项', width: '22%', dataIndex: 'initiative', key: 'initiative' },
  { title: '负责人', width: '14%', dataIndex: 'owner', key: 'owner' },
  {
    title: '状态',
    width: '12%',
    dataIndex: 'status',
    key: 'status',
    render: (status: DataType['status']) => (
      <Tag color={statusColor[status]} style={{ marginInlineEnd: 0 }}>
        {status}
      </Tag>
    ),
  },
  { title: '影响范围', width: '12%', dataIndex: 'impact', key: 'impact' },
  { title: '目标', width: '10%', dataIndex: 'target', key: 'target' },
  { title: '备注', width: '30%', dataIndex: 'notes', key: 'notes' },
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
              事项总数
            </AntdTable.Summary.Cell>
            <AntdTable.Summary.Cell index={2}>{rows.length}</AntdTable.Summary.Cell>
            <AntdTable.Summary.Cell index={3} colSpan={3}>
              在文档流中评审
            </AntdTable.Summary.Cell>
          </AntdTable.Summary.Row>
        </AntdTable.Summary>
      )}
    />
  )
}
