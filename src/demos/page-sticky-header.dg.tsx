import { Tag } from 'antd'
import { Table } from '../table'
import type { ColumnType, StickyConfig, ScrollBarFoldMode } from '../table'
import { dataSource, type DataType } from './_compare/page-sticky-header.shared'

const stickyContainer = (): HTMLElement | Window =>
  document.querySelector<HTMLElement>('.ant-layout-content') ?? window

const sticky: StickyConfig = {
  offsetHeader: 0,
  offsetScroll: 0,
  getContainer: stickyContainer,
}

const statusColor: Record<DataType['status'], string> = {
  正常: 'green',
  有风险: 'gold',
  受阻: 'red',
}

const dgColumns: ColumnType<DataType>[] = [
  { title: '事项', width: 240, dataIndex: 'initiative', key: 'initiative' },
  { title: '负责人', width: 150, dataIndex: 'owner', key: 'owner' },
  {
    title: '状态',
    width: 120,
    dataIndex: 'status',
    key: 'status',
    render: (status: DataType['status']) => (
      <Tag color={statusColor[status]} style={{ marginInlineEnd: 0 }}>
        {status}
      </Tag>
    ),
  },
  { title: '影响范围', width: 140, dataIndex: 'impact', key: 'impact' },
  { title: '目标', width: 120, dataIndex: 'target', key: 'target' },
  { title: '备注', width: 460, dataIndex: 'notes', key: 'notes' },
]

export interface StickyDgProps {
  scrollBarFoldMode?: ScrollBarFoldMode
}

export default function StickyDg({ scrollBarFoldMode }: StickyDgProps) {
  return (
    <Table<DataType>
      columns={dgColumns}
      dataSource={dataSource}
      gridOptions={{ scrollBarFoldMode }}
      pagination={false}
      scroll={{ x: 1230 }}
      sticky={sticky}
      summary={(rows) => (
        <Table.Summary>
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={2}>
              事项总数
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2}>{rows.length}</Table.Summary.Cell>
            <Table.Summary.Cell index={3} colSpan={3}>
              在文档流中评审
            </Table.Summary.Cell>
          </Table.Summary.Row>
        </Table.Summary>
      )}
    />
  )
}
