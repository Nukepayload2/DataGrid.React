import { Tag } from 'antd'
import { Table } from '../table'
import type { ColumnType, StickyConfig, ScrollBarFoldMode } from '../table'
import { dataSource, type DataType } from './_compare/sticky.shared'

const stickyContainer = (): HTMLElement | Window =>
  document.querySelector<HTMLElement>('.ant-layout-content') ?? window

const sticky: StickyConfig = {
  offsetHeader: 0,
  offsetScroll: 0,
  getContainer: stickyContainer,
}

const statusColor: Record<DataType['status'], string> = {
  'On track': 'green',
  'At risk': 'gold',
  Blocked: 'red',
}

const dgColumns: ColumnType<DataType>[] = [
  { title: 'Initiative', width: 240, dataIndex: 'initiative', key: 'initiative' },
  { title: 'Owner', width: 150, dataIndex: 'owner', key: 'owner' },
  {
    title: 'Status',
    width: 120,
    dataIndex: 'status',
    key: 'status',
    render: (status: DataType['status']) => (
      <Tag color={statusColor[status]} style={{ marginInlineEnd: 0 }}>
        {status}
      </Tag>
    ),
  },
  { title: 'Impact', width: 140, dataIndex: 'impact', key: 'impact' },
  { title: 'Target', width: 120, dataIndex: 'target', key: 'target' },
  { title: 'Notes', width: 460, dataIndex: 'notes', key: 'notes' },
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
              Total initiatives
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2}>{rows.length}</Table.Summary.Cell>
            <Table.Summary.Cell index={3} colSpan={3}>
              Reviewed in document flow
            </Table.Summary.Cell>
          </Table.Summary.Row>
        </Table.Summary>
      )}
    />
  )
}
