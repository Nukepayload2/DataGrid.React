/**
 * row-selection-fixed demo 的 data-grid 段（左栏）。
 *
 * - props 驱动 `{ selectionType, firstColFixed, selFixed, selectedKeys, onSelectedKeysChange, virtual }`
 *   （由父组件传）：
 *   selectionType：'checkbox' | 'radio'（控制条驱动）；
 *   firstColFixed：首列 Name 是否 fixed 'start'（控制条驱动）；
 *   selFixed：'auto' | 'start' | 'end'，rowSelection.fixed 取值（控制条驱动）；
 *   selectedKeys：受控勾选行 key 列表（真理源在父，控制条 type 切换会清空它）；
 *   onSelectedKeysChange：勾选变化回调（写回父 selectedKeys）；virtual：全局虚拟化开关。
 * - 自包含：含 `buildColumns(firstColFixed)`（首列 fixed 由开关控 + 中间 6 占位列 + 末列 fixed 'end'）
 *   + `<Table>` JSX + `dgRowSelection` 派生。
 * - data-grid 用 `fixed:'start'/'end'` 逻辑属性（normalizeFixed 把 'left' 映射 'start'）。
 */
import { useMemo } from 'react'
import { Table } from '../table'
import type { ColumnType, TableRowSelection } from '../table'
import { data, type RecordType } from './_compare/row-selection-fixed.shared'

// ---------------------------------------------------------------------------
// 类型与选项
// ---------------------------------------------------------------------------

export type SelectionType = 'checkbox' | 'radio'
export type SelFixed = 'auto' | 'start' | 'end'

// ---------------------------------------------------------------------------
// 列定义（首列 fixed 由 firstColFixed 开关控；末列固定 'end'）
// ---------------------------------------------------------------------------

function buildColumns(firstColFixed: boolean): ColumnType<RecordType>[] {
  const middle: ColumnType<RecordType>[] = Array.from({ length: 6 }, (_, i) => ({
    title: `Col ${i + 1}`,
    dataIndex: `col${i + 1}`,
    width: 100,
    render: () => '—',
  }))
  return [
    {
      title: 'Name',
      dataIndex: 'name',
      width: 200,
      fixed: firstColFixed ? 'start' : undefined,
    },
    ...middle,
    {
      title: 'Action',
      key: 'action',
      width: 100,
      fixed: 'end',
      render: () => <a>action</a>,
    },
  ]
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

// props 默认值均为合理有效初值：selectionType='checkbox'（antd 默认选择类型）；
// firstColFixed=true（首列固定是 demo 核心场景）；selFixed='auto'（邻列继承默认演示路径）；
// selectedKeys=[]（纯瞬时选择态初始空）。
export default function RowSelectionFixedDg({
  selectionType = 'checkbox',
  firstColFixed = true,
  selFixed = 'auto',
  selectedKeys = [],
  onSelectedKeysChange,
  virtual = false,
}: {
  selectionType: SelectionType
  firstColFixed: boolean
  selFixed: SelFixed
  selectedKeys: Array<React.Key>
  onSelectedKeysChange: (keys: Array<React.Key>) => void
  virtual: boolean
}) {
  const dgColumns = useMemo(() => buildColumns(firstColFixed), [firstColFixed])

  // rowSelection.fixed：'auto' = 不传（走邻列继承），其余显式传 'start'/'end'。
  const fixedProp = selFixed === 'auto' ? undefined : selFixed

  const dgRowSelection: TableRowSelection<RecordType> = {
    type: selectionType,
    fixed: fixedProp,
    selectedRowKeys: selectedKeys,
    onChange: (keys) => onSelectedKeysChange(keys),
  }

  return (
    <Table<RecordType>
      columns={dgColumns}
      rowSelection={dgRowSelection}
      dataSource={data}
      /* 全局虚拟化开关接入：ON 时 virtual=true + 在原 scroll.x:1200 基础上合并 y:true
         （CSS 自适应，填满 SplitDemo pane 限高，虚拟窗口才有滚动区；selection 列 fixed
         继承不受影响）；OFF 时回原 scroll={{x:1200}}。 */
      virtual={virtual}
      scroll={virtual ? { x: 1200, y: true } : { x: 1200 }}
      pagination={{}}
    />
  )
}
