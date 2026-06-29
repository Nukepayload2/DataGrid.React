/**
 * row-selection demo 的 antd 段（右栏），忠实复刻 antd row-selection demo。
 * props 驱动 `{ selectionType, selectedKeys, onTypeChange, onSelectedKeysChange, virtual }`
 * （由 row-selection.tsx 父组件传）。
 */
import { Divider, Radio, Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { data, type RecordType } from './_compare/row-selection.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd row-selection demo
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
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

type SelectionType = 'checkbox' | 'radio'

export default function RowSelectionAntd({
  selectionType = 'checkbox',
  selectedKeys = [],
  onTypeChange = () => {},
  onSelectedKeysChange = () => {},
  virtual = false,
}: {
  selectionType: SelectionType
  /** 受控 selectedKeys（父组件真理源），默认 [] 合理（初始无选择是有效态）。 */
  selectedKeys: Array<React.Key>
  /** type 切换回调（父组件 setSelectionType + setSelectedKeys([]) 同步两侧）。 */
  onTypeChange: (v: SelectionType) => void
  /** 选择变化写回父 state（驱动两侧同步）。 */
  onSelectedKeysChange: (keys: Array<React.Key>) => void
  virtual: boolean
}) {
  // 右栏（antd）rowSelection：与 antd row-selection demo 同款 + 受控 selectedRowKeys（父共享 state）。
  const antdRowSelection: TableProps<RecordType>['rowSelection'] = {
    type: selectionType,
    selectedRowKeys: selectedKeys,
    onChange: (keys: React.Key[], rows: RecordType[]) => {
      // eslint-disable-next-line no-console
      console.log(`selectedRowKeys: ${keys}`, 'selectedRows: ', rows)
      onSelectedKeysChange(keys)
    },
    getCheckboxProps: (record: RecordType) => ({
      disabled: record.name === 'Disabled User',
      name: record.name,
    }),
  }

  return (
    <div>
      <Radio.Group
        onChange={(e) => onTypeChange(e.target.value as SelectionType)}
        value={selectionType}
      >
        <Radio value="checkbox">Checkbox</Radio>
        <Radio value="radio">Radio</Radio>
      </Radio.Group>
      <Divider />
      {/* 虚拟化：ON→virtual+scroll.y=300（有分页，antd scroll.y 须数字）；OFF→不传，非虚拟。 */}
      <AntdTable<RecordType>
        rowSelection={antdRowSelection}
        columns={antdColumns}
        dataSource={data}
        virtual={virtual}
        scroll={virtual ? { y: 300 } : undefined}
      />
    </div>
  )
}
