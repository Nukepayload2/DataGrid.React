import { useState } from 'react'
import { Button, Space, Switch, theme } from 'antd'
import type { FC } from 'react'
import { Table } from '../table'
import type { ColumnType, TableRowSelection } from '../table'
import { useVirtualization } from './VirtualizationContext'
import { DemoToolbar } from './_compare/DemoToolbar'
interface RecordType {
  key: string
  name: string
  age: number
  address: string
}
const initialData: RecordType[] = [
  { key: '1', name: 'John Brown', age: 32, address: 'New York No. 1 Lake Park' },
  { key: '2', name: 'Jim Green', age: 42, address: 'London No. 1 Lake Park' },
  { key: '3', name: 'Joe Black', age: 32, address: 'Sidney No. 1 Lake Park' },
  { key: '4', name: 'Jon Snow', age: 28, address: 'Winterfell' },
  { key: '5', name: 'Arya Stark', age: 24, address: 'Braavos' },
  { key: '6', name: 'Sansa Stark', age: 26, address: 'Winterfell' },
]
const InlineHolderOutlined: FC = () => (
  <svg
    viewBox="0 0 1024 1024"
    width="1em"
    height="1em"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M384 128a64 64 0 1 0-128 0 64 64 0 0 0 128 0zm0 384a64 64 0 1 0-128 0 64 64 0 0 0 128 0zm0 384a64 64 0 1 0-128 0 64 64 0 0 0 128 0zm384-768a64 64 0 1 0-128 0 64 64 0 0 0 128 0zm0 384a64 64 0 1 0-128 0 64 64 0 0 0 128 0zm0 384a64 64 0 1 0-128 0 64 64 0 0 0 128 0z" />
  </svg>
)
const DragHandle: FC = () => (
  <Button
    type="text"
    size="small"
    className="dg-drag-handle"
    style={{ cursor: 'grab', padding: '0 4px' }}
    aria-label="drag handle"
  >
    <InlineHolderOutlined />
  </Button>
)
const columns: ColumnType<RecordType>[] = [
  { key: 'sort', align: 'center', width: 64, render: () => <DragHandle /> },
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age', width: 80 },
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

export default function DragMultiRowReorderDemo() {
  const { token } = theme.useToken()
  const [dataSource, setDataSource] = useState<RecordType[]>(initialData)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [multiRowReorder, setMultiRowReorder] = useState(true)
  const { virtual } = useVirtualization()
  const rowSelection: TableRowSelection<RecordType> = {
    type: 'checkbox',
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  }

  return (
    <div className="demo-view">
      <DemoToolbar>
        <Space>
          <Switch
            checked={multiRowReorder}
            onChange={setMultiRowReorder}
            checkedChildren="MultiRowReorder"
            unCheckedChildren="MultiRowReorder"
          />
          <span style={{ fontSize: 12, color: token.colorTextTertiary }}>
            已选 {selectedRowKeys.length} 行
          </span>
        </Space>
        <div style={{ marginTop: 8, fontSize: 12, color: token.colorTextSecondary }}>
          操作：勾选多行（如 3 行）→ 拖其中任一选中行的手柄到别处 →
          {multiRowReorder
            ? '所有选中行成块移动到目标位置（保持相对顺序）。'
            : '只移被拖行（其它选中行不动）。'}
          <br />
          边界：被拖行未选中→只移它；目标落在选中块内部→无变化。
        </div>
      </DemoToolbar>

      <div>
        
        <div style={virtual ? { height: 400 } : undefined}>
          <Table<RecordType>
            rowKey="key"
            columns={columns}
            dataSource={dataSource}
            rowSelection={rowSelection}
            pagination={{}}
            virtual={virtual}
            scroll={virtual ? { y: true } : undefined}
            gridOptions={{
              rowDragSort: {
                onSort: setDataSource,
                handleSelector: '.dg-drag-handle',
              },
              multiRowReorder,
            }}
          />
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: token.colorTextTertiary }}>
          当前行顺序：{dataSource.map((r) => r.name).join(' / ')}
        </div>
      </div>
    </div>
  )
}
