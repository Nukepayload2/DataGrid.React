import { Button, Space, Table as AntdTable, Tag } from 'antd'
import type { TableColumnsType, TableProps } from 'antd'
import {
  dataSource,
  selectedCount,
  summaryOffset,
  type DataType,
} from './_compare/sticky-summary-offset.shared'

const stickyContainer = (): HTMLElement | Window =>
  document.querySelector<HTMLElement>('.ant-layout-content') ?? window

const statusColor: Record<DataType['status'], string> = {
  待处理: 'gold',
  处理中: 'blue',
  已完成: 'green',
}

const columns: TableColumnsType<DataType> = [
  { title: '工单', dataIndex: 'task', key: 'task', width: 220 },
  { title: '负责人', dataIndex: 'owner', key: 'owner', width: 140 },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 120,
    render: (status: DataType['status']) => (
      <Tag color={statusColor[status]} style={{ marginInlineEnd: 0 }}>
        {status}
      </Tag>
    ),
  },
  { title: '金额', dataIndex: 'amount', key: 'amount', width: 140, align: 'right' },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 140 },
  { title: '处理备注', dataIndex: 'task', key: 'note', width: 360, render: (task) => `${task} 等待复核` },
]

function BulkActionBar() {
  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        minHeight: summaryOffset,
        padding: '12px 16px',
        background: 'var(--ant-color-bg-container)',
        border: '1px solid var(--ant-color-border-secondary)',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.08)',
      }}
    >
      <Space size="small">
        <Tag color="blue">已选择 {selectedCount} 项</Tag>
        <span>运营工单批量处理</span>
      </Space>
      <Space size="small">
        <Button size="small">批量归档</Button>
        <Button size="small" type="primary">提交复核</Button>
      </Space>
    </div>
  )
}

export default function StickySummaryOffsetAntd() {
  return (
    <div>
      <AntdTable<DataType>
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        scroll={{ x: 1120 }}
        sticky={{
          offsetSummary: summaryOffset,
          getContainer: stickyContainer,
        } as TableProps<DataType>['sticky']}
        summary={() => (
          <AntdTable.Summary fixed>
            <AntdTable.Summary.Row>
              <AntdTable.Summary.Cell index={0} colSpan={2}>
                当前批次汇总
              </AntdTable.Summary.Cell>
              <AntdTable.Summary.Cell index={2}>{dataSource.length} 项</AntdTable.Summary.Cell>
              <AntdTable.Summary.Cell index={3} colSpan={3} align="right">
                汇总栏避开底部操作栏 {summaryOffset}px
              </AntdTable.Summary.Cell>
            </AntdTable.Summary.Row>
          </AntdTable.Summary>
        )}
      />
      <BulkActionBar />
    </div>
  )
}
