import { useMemo, useState } from 'react'
import { Button, Segmented, Space, Switch, Typography } from 'antd'
import { Table } from '../table'
import type { ColumnType, GridSelectionMode, TableProps } from '../table'
import { data, type RecordType } from './_compare/basic-row-selection.shared'

const columns: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
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
  const [selectionMode, setSelectionMode] = useState<GridSelectionMode>('extended')
  const [showSelectionColumn, setShowSelectionColumn] = useState(false)
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
        <Segmented
          options={[
            { label: 'Disabled', value: 'disabled' },
            { label: 'Single', value: 'single' },
            { label: 'Multiple', value: 'multiple' },
            { label: 'Extended', value: 'extended' },
          ]}
          value={selectionMode}
          onChange={(value) => setSelectionMode(value as GridSelectionMode)}
        />
        <Switch
          checked={showSelectionColumn}
          onChange={setShowSelectionColumn}
          checkedChildren="Column"
          unCheckedChildren="No column"
        />
        <Button onClick={() => setSelectedValues(['John Brown'])}>Select John</Button>
        <Button onClick={() => setSelectedValues(['John Brown', 'Joe Black'])}>Select John + Joe</Button>
        <Button
          onClick={() => {
            setSelectedValues([])
            setCompatSelectedKeys([])
          }}
        >
          Clear
        </Button>
      </Space>

      <Typography.Text>
        `selectedValues` drives UI. In extended mode, normal row click replaces selection, Ctrl/Meta
        toggles, and Shift ranges from the last row click to the current row.
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
            selectionMode,
            showSelectionColumn,
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
