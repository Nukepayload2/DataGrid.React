import { useMemo, useState } from 'react'
import { Button, Space, Tag, Typography } from 'antd'
import { Table } from '../table'
import type { ColumnType, TableProps } from '../table'
import { data, type RecordType } from './_compare/row-selection.shared'

const columns: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    render: (text: string) => <a>{text}</a>,
  },
  {
    title: 'Age',
    dataIndex: 'age',
  },
  {
    title: 'Address',
    dataIndex: 'address',
  },
]

export default function RowSelectionNativeDemo() {
  const [selectedValues, setSelectedValues] = useState<Array<string>>(['John Brown'])
  const [compatSelectedKeys, setCompatSelectedKeys] = useState<Array<React.Key>>(['4'])

  const rowSelection = useMemo<NonNullable<TableProps<RecordType>['rowSelection']>>(
    () => ({
      selectedRowKeys: compatSelectedKeys,
      onChange: (keys) => {
        setCompatSelectedKeys(keys)
      },
      getCheckboxProps: (record) => ({
        disabled: record.name === 'Disabled User',
        name: record.name,
      }),
    }),
    [compatSelectedKeys],
  )

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space wrap>
        <Button onClick={() => setSelectedValues(['John Brown'])}>Select John</Button>
        <Button onClick={() => setSelectedValues(['John Brown', 'Joe Black'])}>Select Range Seed</Button>
        <Button
          onClick={() => {
            setSelectedValues([])
            setCompatSelectedKeys([])
          }}
        >
          Clear
        </Button>
        <Tag color="blue">selectionMode=extended</Tag>
        <Tag>showSelectionColumn=false</Tag>
      </Space>

      <Typography.Text>
        `selectedValues` drives UI. The compat `selectedRowKeys` state starts from `['4']`, but the
        first selected row is still `John Brown`.
      </Typography.Text>

      <div>
        <strong>selectedValues:</strong>{' '}
        {selectedValues.length === 0 ? <span>[]</span> : <code>[{selectedValues.join(', ')}]</code>}
      </div>
      <div>
        <strong>compat selectedRowKeys:</strong>{' '}
        {compatSelectedKeys.length === 0 ? (
          <span>[]</span>
        ) : (
          <code>[{compatSelectedKeys.join(', ')}]</code>
        )}
      </div>

      <Table<RecordType>
        rowSelection={rowSelection}
        columns={columns}
        dataSource={data}
        pagination={false}
        gridOptions={{
          selection: {
            selectionMode: 'extended',
            showSelectionColumn: false,
            getSelectionValue: (record) => record.name,
            selectedValues,
            onSelectedValuesChange: (nextValues) => {
              setSelectedValues(nextValues as Array<string>)
            },
          },
        }}
      />
    </Space>
  )
}
