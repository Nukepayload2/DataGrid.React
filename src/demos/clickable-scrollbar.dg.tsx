import { useMemo } from 'react'
import type { Ref } from 'react'
import { Table } from '../table'
import type { ColumnType, ScrollBarFoldMode, TableRef } from '../table'
import { getData, type RecordType } from './_compare/virtual-list.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义
//
// 目的：让横向（scroll.x）与纵向（scroll.y）双向都明显溢出，触发横向 + 纵向
// FloatingScrollBar 同时显示，便于和右栏 antd 的 rc-virtual-list 自绘条对照。
// 固定首三列 + 固定末列，让"拖动横向悬浮条"时能直观看到固定列的钉住效果。
// ---------------------------------------------------------------------------

const dgWideColumns: ColumnType<RecordType>[] = [
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
      <span style={{ display: 'inline-flex', gap: 8 }}>
        <a>Action1</a>
        <a>Action2</a>
      </span>
    ),
  },
]

export interface ClickableScrollbarDgProps {
  /** 父组件持有的 data-grid Table ref（用于双侧 scrollTo 对照）。 */
  tableRef?: Ref<TableRef>
  /** data-grid 专属：悬浮滚动条折叠/显示策略。 */
  scrollBarFoldMode?: ScrollBarFoldMode
}

export default function ClickableScrollbarDg({
  tableRef,
  scrollBarFoldMode,
}: ClickableScrollbarDgProps) {
  // 万行虚拟表：触发纵向 + 横向双向滚动条。
  const data = useMemo(() => getData(10000), [])

  return (
    /* 父容器需有明确 height：对齐右栏 antd scroll.y:400 表体区——右栏 400 是表体高，
       整表=表头(~40)+表体(400)≈440；左栏 height 是整表高（含表头），取 440 像素级对齐。
       虚拟窗口高度由容器 clientHeight 实时测量（ResizeObserver）。 */
    <div style={{ height: 440 }}>
      <Table<RecordType>
        ref={tableRef}
        bordered
        virtual
        columns={dgWideColumns}
        scroll={{ x: 2200, y: true }}
        rowKey="id"
        dataSource={data}
        pagination={false}
        // 每行 40px 作未测兜底；虚拟窗口由 RO 实测真实高驱动。
        // scrollBarFoldMode 由顶栏开关控制——演示组件级 visibility/fold 配置。
        gridOptions={{ rowHeight: 40, headerHeight: 40, scrollBarFoldMode }}
      />
    </div>
  )
}
