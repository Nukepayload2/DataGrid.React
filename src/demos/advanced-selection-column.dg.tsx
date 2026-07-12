import { Space, Tag } from 'antd'
import { Table } from '../table'
import type { ColumnType, TableRowSelection } from '../table'
import { data, type RecordType } from './_compare/advanced-selection-column.shared'

const columns: ColumnType<RecordType>[] = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Team', dataIndex: 'team' },
  { title: 'Score', dataIndex: 'score', align: 'end' },
]

function SelectionCell(props: any) {
  if (!props.selectionTone) return props.children
  return (
    <Space size={4}>
      {props.children}
      <Tag color="blue">{props.selectionTone}</Tag>
    </Space>
  )
}

export default function RowSelectionAdvancedDg({
  selectedKeys,
  onSelectedKeysChange,
  headerDisabled,
  onMultiple,
}: {
  selectedKeys: Array<React.Key>
  onSelectedKeysChange: (keys: Array<React.Key>) => void
  headerDisabled: boolean
  onMultiple: (message: string) => void
}) {
  const rowSelection: TableRowSelection<RecordType> = {
    selectedRowKeys: selectedKeys,
    columnTitle: (checkboxNode) => (
      <Space size={4}>
        <span>Pick</span>
        {checkboxNode}
      </Space>
    ),
    getTitleCheckboxProps: () => ({
      disabled: headerDisabled,
      'aria-label': 'Select all demo rows',
    }),
    onCell: (record) => ({
      selectionTone: record.team,
    }),
    onChange: onSelectedKeysChange,
    onSelectMultiple: (_selected, selectedRows, changeRows) => {
      onMultiple(`data-grid multiple: ${changeRows.length} changed, ${selectedRows.length} selected`)
    },
  }

  return (
    <Table<RecordType>
      rowSelection={rowSelection}
      columns={columns}
      components={{ body: { cell: SelectionCell } }}
      dataSource={data}
      pagination={false}
    />
  )
}
