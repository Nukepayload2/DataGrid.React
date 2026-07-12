import { Space, Table as AntdTable, Tag } from 'antd'
import type { TableProps } from 'antd'
import { data, type RecordType } from './_compare/advanced-selection-column.shared'

const columns: NonNullable<TableProps<RecordType>['columns']> = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Team', dataIndex: 'team' },
  { title: 'Score', dataIndex: 'score', align: 'right' },
]

function SelectionCell(props: any) {
  const { selectionTone, children, ...rest } = props
  return (
    <td {...rest}>
      {selectionTone ? (
        <Space size={4}>
          {children}
          <Tag color="blue">{selectionTone}</Tag>
        </Space>
      ) : children}
    </td>
  )
}

export default function RowSelectionAdvancedAntd({
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
  const rowSelection: TableProps<RecordType>['rowSelection'] = {
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
    }) as any,
    onChange: onSelectedKeysChange,
    onSelectMultiple: (_selected, selectedRows, changeRows) => {
      onMultiple(`antd multiple: ${changeRows.length} changed, ${selectedRows.length} selected`)
    },
  }

  return (
    <AntdTable<RecordType>
      rowSelection={rowSelection}
      columns={columns}
      components={{ body: { cell: SelectionCell } }}
      dataSource={data}
      pagination={false}
    />
  )
}
