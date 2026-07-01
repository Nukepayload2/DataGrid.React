import { Table } from '../table'
import type { ColumnType } from '../table'
import { dataSource, type DataType } from './_compare/fixed-header.shared'

// 左栏（data-grid）列定义 —— 与 antd demo 列结构逐字一致

const dgColumns: ColumnType<DataType>[] = [
  { title: 'Name', dataIndex: 'name', width: 150 },
  { title: 'Age', dataIndex: 'age', width: 150 },
  { title: 'Address', dataIndex: 'address' },
]

export default function FixedHeaderDg({
  bordered = false,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  return (
    /* 数据区域模式 — 详见 docs/design-notes/layout.md
       父容器需有明确 height（394 = stickyHeader 54.8 + 表体可见 275.2 + 分页条区 64）；
       分页条(.dg-pagination) 是 wrapper 末尾 flex item（在 .dg-scroll 之外、wrapper 之内），
       占用 wrapper 垂直空间，故 height 必须把分页条区算进去，否则表体 flex:1 被挤、可见行少于右栏。 */
    <div style={{ height: 394 }}>
      <Table<DataType>
        columns={dgColumns}
        dataSource={dataSource}
        bordered={bordered}
        scroll={{ y: true }}
        pagination={{ pageSize: 50 }}
        virtual={virtual}
      />
    </div>
  )
}

