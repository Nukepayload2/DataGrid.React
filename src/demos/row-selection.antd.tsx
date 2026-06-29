/**
 * row-selection demo 的 antd 段（右栏），从 row-selection.tsx 拆出。
 *
 * - props 驱动 `{ selectionType, selectedKeys, onTypeChange, onSelectedKeysChange, virtual }`
 *   （由 row-selection.tsx 父组件传：selectionType 控制条 + 受控 selectedKeys 真理源
 *   + 切 type 时清空选择的外部回调 onTypeChange）。
 * - 自包含：含 `antdColumns` + `<AntdTable>` JSX + antd `<Radio.Group>` + antd `<Divider>`。
 * - 忠实复刻 antd row-selection demo：antd `<Radio.Group>` + antd `<Divider>` + antd 原生
 *   rowSelection（type 切换 + getCheckboxProps 禁用 + onChange 回调）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/row-selection.shared'`）。
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
  // 右栏（antd）rowSelection：selectedRowKeys 受控（父共享 state）+ onChange 写回父 state。
  // ★ 与 antd row-selection demo 逐字一致（onChange + getCheckboxProps），叠加 type + selectedRowKeys 受控。
  const antdRowSelection: TableProps<RecordType>['rowSelection'] = {
    type: selectionType,
    selectedRowKeys: selectedKeys,
    onChange: (keys: React.Key[], rows: RecordType[]) => {
      // eslint-disable-next-line no-console
      console.log(`selectedRowKeys: ${keys}`, 'selectedRows: ', rows)
      onSelectedKeysChange(keys)
    },
    getCheckboxProps: (record: RecordType) => ({
      disabled: record.name === 'Disabled User', // Column configuration not to be checked
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
      {/* 虚拟化（决策 7）：ON→virtual+scroll.y=300（有分页，antd scroll.y 须数字）；OFF→不传，非虚拟（零回归）。 */}
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
