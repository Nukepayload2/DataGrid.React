import { useMemo } from 'react'
import type { Ref } from 'react'
import { Space, Table as AntdTable, Typography } from 'antd'
import type { GetRef, TableProps } from 'antd'
import { getData, type RecordType } from './_compare/virtual-list.shared'

/** antd Table ref type with `scrollTo`. */
type AntdTableRef = GetRef<typeof AntdTable>

// ---------------------------------------------------------------------------
// 右栏（antd）列定义
//
// 如实呈现 antd #53813：virtual 模式下横向 / 纵向滚动条均由 rc-virtual-list 自绘
// （`.rc-virtual-list-scrollbar` + `.rc-virtual-list-scrollbar-thumb`），只有 thumb
// 本体可拖；点击轨道空白处无反应（既不跳页也不定位）。
// 列对齐左栏 data-grid（同样的固定首三列 + 固定末列）以消除对照偏差。
// ---------------------------------------------------------------------------

const antdWideColumns: NonNullable<TableProps<RecordType>['columns']> = [
  { title: 'ID', dataIndex: 'id', width: 100, fixed: 'start' },
  { title: 'FirstName', dataIndex: 'firstName', width: 150, fixed: 'start' },
  { title: 'LastName', dataIndex: 'lastName', width: 150, fixed: 'start' },
  { title: 'Age', dataIndex: 'age', width: 120 },
  { title: 'Address 1', dataIndex: 'address1', width: 280 },
  { title: 'Address 2', dataIndex: 'address2', width: 280 },
  { title: 'Address 3', dataIndex: 'address3', width: 280 },
  {
    title: 'Email',
    width: 240,
    render: (_, r) => `user${r.id}@example.com`,
  },
  {
    title: 'Phone',
    width: 180,
    render: (_, r) => `+1-555-0100-${r.id.toString().padStart(4, '0')}`,
  },
  {
    title: 'Department',
    width: 180,
    render: (_, r) => `Dept ${r.id % 8}`,
  },
  {
    title: 'Status',
    width: 140,
    render: (_, r) => (r.id % 3 === 0 ? 'Active' : 'Idle'),
  },
  {
    title: 'Action',
    width: 150,
    fixed: 'end',
    render: () => (
      <Space>
        <Typography.Link>Action1</Typography.Link>
        <Typography.Link>Action2</Typography.Link>
      </Space>
    ),
  },
]

export interface ClickableScrollbarAntdProps {
  /** 父组件持有的 antd Table ref（用于双侧 scrollTo 对照）。 */
  tableRef?: Ref<AntdTableRef>
}

export default function ClickableScrollbarAntd({
  tableRef,
}: ClickableScrollbarAntdProps) {
  // 与左栏一致的万行虚拟表。
  const data = useMemo(() => getData(10000), [])

  return (
    <AntdTable<RecordType>
      ref={tableRef}
      bordered
      virtual
      columns={antdWideColumns}
      scroll={{ x: 2200, y: 400 }}
      rowKey="id"
      dataSource={data}
      pagination={false}
    />
  )
}
