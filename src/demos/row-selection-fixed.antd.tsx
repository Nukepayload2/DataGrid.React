/**
 * row-selection-fixed demo 的 antd 段（右栏）。
 *
 * - props 驱动 `{ selectionType, firstColFixed, selFixed, selectedKeys, onSelectedKeysChange, virtual }`
 *   （与左栏 dg 子组件同款签名）。
 * - 自包含：含 `buildAntdColumns(firstColFixed)`（首列 fixed 由开关控 + 中间 6 占位列 + 末列
 *   fixed 'right'）+ `<AntdTable>` JSX + `antdRowSelection` 派生。
 * - 忠实复刻 antd 行为：antd useSelection 原生继承逻辑（对照基准）；fixed 用 antd 原生
 *   'left'/'right'（selFixed 'start'→'left', 'end'→'right', 'auto'→undefined 走邻列继承）。
 */
import { useMemo } from 'react'
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { data, type RecordType } from './_compare/row-selection-fixed.shared'

// 类型本地声明（与 dg 子文件同款）。
type SelectionType = 'checkbox' | 'radio'
type SelFixed = 'auto' | 'start' | 'end'

// ---------------------------------------------------------------------------
// 列定义（首列 fixed 由 firstColFixed 开关控；末列固定 'right'）
// ---------------------------------------------------------------------------

function buildAntdColumns(
  firstColFixed: boolean,
): NonNullable<TableProps<RecordType>['columns']> {
  const middle: NonNullable<TableProps<RecordType>['columns']>[number][] =
    Array.from({ length: 6 }, (_, i) => ({
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
      fixed: firstColFixed ? 'left' : undefined,
    },
    ...middle,
    {
      title: 'Action',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: () => <a>action</a>,
    },
  ]
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

// props 默认值同左栏 dg（合理有效初值）。
export default function RowSelectionFixedAntd({
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
  const antdColumns = useMemo(() => buildAntdColumns(firstColFixed), [
    firstColFixed,
  ])

  // rowSelection.fixed：'auto' = 不传（走邻列继承），其余 'start'→'left', 'end'→'right'。
  const antdFixedProp =
    selFixed === 'start' ? 'left' : selFixed === 'end' ? 'right' : undefined

  const antdRowSelection: TableProps<RecordType>['rowSelection'] = {
    type: selectionType,
    fixed: antdFixedProp,
    selectedRowKeys: selectedKeys,
    onChange: (keys: React.Key[]) => onSelectedKeysChange(keys),
  }

  return (
    <AntdTable<RecordType>
      columns={antdColumns}
      rowSelection={antdRowSelection}
      dataSource={data}
      /* 全局虚拟化开关接入：ON 时 virtual=true + 在原 scroll.x:1200 基础上合并 y:300
         （本 demo 有分页条，antd 表头/分页画在 scroll.y 之外，扣除后约 300 塞进 pane 限高；
         OFF 时回原 scroll={{x:1200}}）。 */
      virtual={virtual}
      scroll={virtual ? { x: 1200, y: 300 } : { x: 1200 }}
      pagination={false}
    />
  )
}
