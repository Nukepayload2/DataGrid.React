/**
 * tree-table-ellipsis demo 的 antd 段（右栏）。
 *
 * props 驱动 `{ fixed, virtual }`（与左栏 dg 子组件同款，由父组件传）：
 *   - fixed：首列 Name 是否固定（同一档同时驱动两侧）。
 *   - virtual：全局虚拟化开关。
 *
 * 忠实复刻 antd tree-table-ellipsis demo：antd 原生 `<Table>` + 同列结构 + 同 rowSelection + 同 expandable。
 */
import { Table as AntdTable } from 'antd'
import type { TableColumnsType } from 'antd'
import { data, type RecordType } from './_compare/tree-table-ellipsis.shared'

// 列定义：字段（title/dataIndex/key/width/ellipsis）与 antd 官方 demo 逐字一致；fixed 由 props 驱动。

const antdColumnsBase: TableColumnsType<RecordType> = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    width: '30%',
    ellipsis: true,
  },
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
    width: '12%',
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address',
  },
]

// fixed 默认值 true：配置型 state，对齐 antd demo「首列 Name 默认固定」语义（仅 Name fixed）。
export default function TreeTableEllipsisAntd({
  fixed = true,
  virtual = false,
}: {
  fixed: boolean
  virtual: boolean
}) {
  // 仅首列 Name 固定（对齐 antd 官方 demo 只 fixed Name 列）；Age/Address 不 fixed（详见左栏 dg 段）。
  const antdColumns: TableColumnsType<RecordType> = antdColumnsBase.map((col) =>
    col.dataIndex === 'name' ? { ...col, fixed } : col,
  )

  return (
    <AntdTable<RecordType>
      columns={antdColumns}
      rowSelection={{ columnWidth: 100 }}
      expandable={{ defaultExpandAllRows: true }}
      dataSource={data}
      // 虚拟化：ON→virtual+scroll.y=300（有分页，antd scroll.y 须数字）；OFF→不传，非虚拟。
      // 本 demo 无 scroll.x（fixed 走列层 sticky），ON 时不强制 scroll.x。
      virtual={virtual}
      scroll={virtual ? { y: 300 } : undefined}
    />
  )
}
