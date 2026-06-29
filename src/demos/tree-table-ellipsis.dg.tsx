/**
 * tree-table-ellipsis demo 的 data-grid 段（左栏）。
 *
 * props 驱动 `{ fixed, virtual }`（由父组件传）：
 *   - fixed：首列 Name 是否固定（父控制条 Switch 切换，同时驱动两侧）。
 *   - virtual：全局虚拟化开关。
 *
 * 自包含：dgColumnsBase（Name ellipsis + width:'30%' / Age width:'12%' / Address）+
 * 按 fixed 派生的 dgColumns + `<Table>`（rowSelection 前置 + expandable 全展开）。
 */
import { Table } from '../table'
import type { ColumnType } from '../table'
import { data, type RecordType } from './_compare/tree-table-ellipsis.shared'

// 列定义：字段（title/dataIndex/key/width/ellipsis）与 antd 官方 demo 逐字一致；fixed 由 props 驱动。

const dgColumnsBase: ColumnType<RecordType>[] = [
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
export default function TreeTableEllipsisDg({
  fixed = true,
  virtual = false,
}: {
  fixed: boolean
  virtual: boolean
}) {
  // 仅首列 Name 固定（对齐 antd 官方 demo 只 fixed Name 列）。Age/Address 不 fixed ——
  // Address 无 width 走 minmax(0,1fr) 被容器拘束，避免全列 fixed 后变 max-content 撑爆容器溢出。
  const dgColumns: ColumnType<RecordType>[] = dgColumnsBase.map((col) =>
    col.dataIndex === 'name' ? { ...col, fixed } : col,
  )

  return (
    <Table<RecordType>
      columns={dgColumns}
      rowSelection={{ columnWidth: 100 }}
      expandable={{ defaultExpandAllRows: true }}
      dataSource={data}
      // pagination={{}} 对齐右栏 antd 默认分页（antd 对任意数据都渲染 .ant-pagination）。
      pagination={{}}
      // 虚拟化：ON→virtual+scroll.y=true（CSS 自适应高度，SplitDemo 限高 pane body 提供可滚动区域）；
      // OFF→不传，非虚拟全量 DOM。本 demo 无 scroll.x（fixed 走列层 sticky），ON 时不强制 scroll.x。
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
