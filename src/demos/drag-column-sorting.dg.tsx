/**
 * drag-column-sorting demo 的 data-grid 段（左栏）。
 * 拖拽 columns 在子组件内自管（两栏各自独立）。自研 pointer 列拖拽（`useColumnDragSort`
 * 命中叶子表头格 + 垂直指示线 + arrayMoveColumns）。grid 渲染无"列 DOM"，transform 平移会
 * 破坏 grid 布局，故用指示线提示插入位置。
 */
import { useRef, useState } from 'react'
import { theme } from 'antd'
import { Table, useColumnDragSort } from '../table'
import type { ColumnType } from '../table'
import { data, type RecordType } from './_compare/drag-column-sorting.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）baseColumns —— Name/Gender/Age/Email/Address（对齐 antd demo）
// ---------------------------------------------------------------------------

const dgBaseColumns: ColumnType<RecordType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  {
    title: 'Gender',
    dataIndex: 'gender',
    key: 'gender',
    // 此列不可发起拖（movable:false）。其它列仍可拖——拖别的列时此列会被被动让位。
    gridColumnOptions: { movable: false },
  },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  {
    title: 'Email',
    dataIndex: 'email',
    key: 'email',
    // 此列锁定位置（lockPosition:true）——自身 index 不变，重排算法跳过；其它列可在其前后重排。
    gridColumnOptions: { lockPosition: true },
  },
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

// ---------------------------------------------------------------------------
// 子组件（自管拖拽排序 state）
// ---------------------------------------------------------------------------

export default function DragColumnSortingDg({
  bordered = false,
  autoScroll = true,
  columnReorder = true,
  virtual = false,
}: {
  bordered: boolean
  autoScroll: boolean
  columnReorder: boolean
  virtual: boolean
}) {
  // 列拖拽各自独立（两栏对照时互不干扰）。稳定 key（列重排时 React diff 用），与 antd demo `${i}` 索引作 key 同款。
  const [columns, setColumns] = useState<ColumnType<RecordType>[]>(() =>
    dgBaseColumns.map((column, i) => ({ ...column, key: `${i}` })),
  )

  const containerRef = useRef<HTMLDivElement>(null)
  const { token } = theme.useToken()

  const { dragState, indicator, containerProps } = useColumnDragSort<ColumnType<RecordType>>({
    columns,
    onSort: setColumns,
    containerRef,
    // 拖到左右边缘横向自动滚动（此 demo 5 列无 scroll.x，auto-scroll 为 no-op；开关用于对照）。
    autoScroll,
    // columnReorder 全局开关（false→所有列头不可拖，优先于单列 movable/lockPosition）。
    reorder: columnReorder,
  })

  return (
    <div ref={containerRef} style={{ position: 'relative' }} {...containerProps}>
      <Table<RecordType>
        rowKey="key"
        columns={columns}
        dataSource={data}
        bordered={bordered}
        // 对齐右栏 antd 默认分页（antd 对任意数据都渲染 .ant-pagination，data-grid 不传=无分页条）。
        pagination={{}}
        // 虚拟化开关：ON→virtual+scroll.y:true（CSS 自适应，填满 SplitDemo 限高；列拖拽命中表头，在虚拟窗口内）；
        // OFF→回 undefined，非虚拟。
        virtual={virtual}
        scroll={virtual ? { y: true } : undefined}
      />
      {/* 垂直拖拽指示线：绝对定位蓝色竖线，跨表头+表体高度。
          非 grid item（是 container 子元素），不影响 grid-template-columns 计算。 */}
      {indicator.visible ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: indicator.left,
            top: indicator.top,
            height: indicator.height,
            width: 2,
            background: token.colorPrimary,
            zIndex: 9999,
            pointerEvents: 'none',
            borderRadius: 1,
          }}
        />
      ) : null}
      <div style={{ marginTop: 8, fontSize: 12, color: token.colorTextTertiary }}>
        当前拖拽：
        {dragState ? `from #${dragState.fromIndex + 1} → 目标 #${dragState.overIndex + 1}` : '无'}
        ；当前列顺序：{columns.map((c) => c.title).join(' / ')}
        <br />
        {/* 列标志提示：Gender 不可发起拖（movable:false），Email 锁定位置（lockPosition:true）。columnReorder 全局关 → 所有列头不可拖。 */}
        <span style={{ color: token.colorPrimary }}>
          Gender: 不可发起拖(movable:false)；Email: 锁定位置(lockPosition:true)；ColumnReorder
          全局开关：{columnReorder ? '开' : '关（所有列头不可拖）'}
        </span>
      </div>
    </div>
  )
}
