import { useMemo, useState } from 'react'
import { Button, Segmented, Space, Switch, Typography } from 'antd'
import { Table } from '../table'
import type { ColumnType, GridSelectionMode, TableProps } from '../table'
import { data, type RecordType } from './_compare/basic-row-selection.shared'

const localizedData: RecordType[] = data.map((record) => {
  const overrides: Record<string, Pick<RecordType, 'name' | 'address'>> = {
    '1': { name: '张三', address: '纽约湖滨路 1 号' },
    '2': { name: '李四', address: '伦敦湖滨路 1 号' },
    '3': { name: '王五', address: '悉尼湖滨路 1 号' },
    '4': { name: '禁用用户', address: '悉尼湖滨路 1 号' },
  }

  return {
    ...record,
    ...overrides[String(record.key)],
  }
})

const columns: ColumnType<RecordType>[] = [
  {
    title: '姓名',
    dataIndex: 'name',
  },
  {
    title: '年龄',
    dataIndex: 'age',
  },
  {
    title: '地址',
    dataIndex: 'address',
  },
]

export default function RowSelectionNativeDemo() {
  const [selectionMode, setSelectionMode] = useState<GridSelectionMode>('extended')
  const [showSelectionColumn, setShowSelectionColumn] = useState(false)
  const [selectedValues, setSelectedValues] = useState<Array<string>>(['张三'])
  const [compatSelectedKeys, setCompatSelectedKeys] = useState<Array<React.Key>>(['4'])

  const rowSelection = useMemo<NonNullable<TableProps<RecordType>['rowSelection']>>(
    () => ({
      selectedRowKeys: compatSelectedKeys,
      onChange: (keys) => {
        setCompatSelectedKeys(keys)
      },
      getCheckboxProps: (record) => ({
        disabled: record.name === '禁用用户',
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
            { label: '禁用', value: 'disabled' },
            { label: '单选', value: 'single' },
            { label: '多选', value: 'multiple' },
            { label: '扩展选择', value: 'extended' },
          ]}
          value={selectionMode}
          onChange={(value) => setSelectionMode(value as GridSelectionMode)}
        />
        <Switch
          checked={showSelectionColumn}
          onChange={setShowSelectionColumn}
          checkedChildren="显示选择列"
          unCheckedChildren="隐藏选择列"
        />
        <Button onClick={() => setSelectedValues(['张三'])}>选择张三</Button>
        <Button onClick={() => setSelectedValues(['张三', '王五'])}>选择张三和王五</Button>
        <Button
          onClick={() => {
            setSelectedValues([])
            setCompatSelectedKeys([])
          }}
        >
          清空选择
        </Button>
      </Space>

      <Typography.Text>
        当前选中值会直接控制表格的选中状态。扩展选择模式下，普通点击会改为只选当前行；
        按住 Ctrl / Command 键可切换单行选中；按住 Shift 键可从上次点击的行连续选到当前行。
      </Typography.Text>

      <div>
        <strong>当前选中值：</strong>
        {selectedValues.length === 0 ? <span>[]</span> : <code>[{selectedValues.join(', ')}]</code>}
      </div>
      <div>
        <strong>兼容行键：</strong>
        {compatSelectedKeys.length === 0 ? (
          <span>[]</span>
        ) : (
          <code>[{compatSelectedKeys.join(', ')}]</code>
        )}
      </div>

      <Table<RecordType>
        rowSelection={rowSelection}
        columns={columns}
        dataSource={localizedData}
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
