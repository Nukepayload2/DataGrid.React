import { Table } from '../table'
import type { ColumnType, TableRowSelection } from '../table'
import { data, type RecordType } from './_compare/row-selection.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
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

// Minimal radio group so the left pane does not depend on antd form controls.

function RadioGroup({
  value,
  onChange,
  options,
}: {
  value: 'checkbox' | 'radio'
  onChange: (v: 'checkbox' | 'radio') => void
  options: Array<{ value: 'checkbox' | 'radio'; label: string }>
}) {
  return (
    <span style={{ display: 'inline-flex', gap: 16 }}>
      {options.map((opt) => (
        <label
          key={opt.value}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
        >
          <input
            type="radio"
            name="selection-type-dg"
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            style={{ margin: 0 }}
          />
          {opt.label}
        </label>
      ))}
    </span>
  )
}

type SelectionType = 'checkbox' | 'radio'

export default function RowSelectionDg({
  selectionType = 'checkbox',
  selectedKeys = [],
  onTypeChange = () => {},
  onSelectedKeysChange = () => {},
  virtual = false,
}: {
  selectionType: SelectionType
  /** 受控 selectedKeys（父组件真理源），编辑模式超集 props 不含此 key，默认 [] 合理（初始无选择是有效态）。 */
  selectedKeys: Array<React.Key>
  /** type 切换回调（父组件 setSelectionType + setSelectedKeys([]) 同步两侧）。 */
  onTypeChange: (v: SelectionType) => void
  /** 选择变化写回父 state（驱动两侧同步）。 */
  onSelectedKeysChange: (keys: Array<React.Key>) => void
  virtual: boolean
}) {
  const dgRowSelection: TableRowSelection<RecordType> = {
    type: selectionType,
    selectedRowKeys: selectedKeys,
    onChange: (keys, rows) => {
      // Ignore the third `info` arg here to keep the demo shape aligned with antd.
      // eslint-disable-next-line no-console
      console.log(`selectedRowKeys: ${JSON.stringify(keys)}`, 'selectedRows: ', rows)
      onSelectedKeysChange(keys)
    },
    getCheckboxProps: (record: RecordType) => ({
      disabled: record.name === 'Disabled User',
      name: record.name,
    }),
  }

  return (
    <div>
      <RadioGroup
        value={selectionType}
        onChange={onTypeChange}
        options={[
          { value: 'checkbox', label: 'Checkbox' },
          { value: 'radio', label: 'Radio' },
        ]}
      />
      {/* 分割线（antd demo 用 <Divider />，这里用 border-top 替代；颜色取 antd token 的 CSS var
          kebab 形式 var(--ant-color-border-secondary)，主题自适应 light/dark）。 */}
      <div style={{ borderTop: '1px solid var(--ant-color-border-secondary)', margin: '0 0 16px' }} />
      {/* 虚拟化：ON→virtual+scroll.y=true（CSS 自适应高度，SplitDemo 限高 pane body 提供可滚动区域）；
          OFF→不传，非虚拟全量 DOM。 */}
      <Table<RecordType>
        rowSelection={dgRowSelection}
        columns={dgColumns}
        dataSource={data}
        pagination={{}}
        virtual={virtual}
        scroll={virtual ? { y: true } : undefined}
      />
    </div>
  )
}
