/**
 * drag-sorting demo 的 data-grid 段（左栏）。
 * 拖拽 dataSource 在子组件内自管（两栏各自独立）。自研 pointer 行拖拽（`useRowDragSort` +
 * 蓝色指示线 + arrayMove）。
 */
import { useRef, useState } from 'react'
import { Table, useRowDragSort } from '../table'
import type { ColumnType } from '../table'
import { theme } from 'antd'
import { initialData, type RecordType } from './_compare/drag-sorting.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— Name / Age / Address（对齐 antd demo）
// ---------------------------------------------------------------------------

// 列宽策略：Name/Age 给窄 width（fixed 模式下锁定不参与 fr 分配），Address 不设 width
// （fixed 模式 → minmax(0,1fr) 填剩余空间，超长文本换行而非撑出横滚条）。这是本 demo 的目标态。
const dgColumns: ColumnType<RecordType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name', width: 120 },
  { title: 'Age', dataIndex: 'age', key: 'age', width: 80 },
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

// ---------------------------------------------------------------------------
// 子组件（自管拖拽排序 state）
// ---------------------------------------------------------------------------

export default function DragSortingDg({
  bordered = false,
  autoScroll = true,
  virtual = false,
}: {
  bordered: boolean
  autoScroll: boolean
  virtual: boolean
}) {
  // 拖拽 dataSource 各自独立（两栏对照时互不干扰）。
  const { token } = theme.useToken()
  const [dataSource, setDataSource] = useState<RecordType[]>(initialData)

  // 外层容器 ref（指示线相对此容器绝对定位；hit-test 遍历容器内 [data-row-index] 单元格）。
  const containerRef = useRef<HTMLDivElement>(null)

  const { dragState, indicator, containerProps } = useRowDragSort<RecordType>({
    dataSource,
    rowKey: 'key',
    onSort: setDataSource,
    containerRef,
    // 拖到容器边缘自动滚动（此 demo 数据少无 scroll 容器，auto-scroll 为 no-op；开关用于对照）。
    autoScroll,
  })

  return (
    <div ref={containerRef} style={{ position: 'relative' }} {...containerProps}>
      <Table<RecordType>
        rowKey="key"
        columns={dgColumns}
        dataSource={dataSource}
        bordered={bordered}
        // 对齐右栏 antd 默认分页（antd 对任意数据都渲染 .ant-pagination，data-grid 不传=无分页条）。
        pagination={{}}
        // fixed 布局：无 width 列（Address）变 minmax(0,1fr) 填剩余空间，超长文本换行而非撑出横滚条；
        // 非虚拟默认 rowHeight='auto'，行随换行内容自动增高。fixed 与虚拟化正交。
        tableLayout="fixed"
        // 整行 cursor:move：data-grid 无 tr，用 styles.body.cell 把 cursor:move 注入每个 body 单元格。
        styles={{ body: { cell: { cursor: 'move' } } }}
        // 虚拟化开关：ON→virtual+scroll.y:true（CSS 自适应，填满 SplitDemo 限高）；
        // OFF→回 undefined，非虚拟全量 DOM。
        virtual={virtual}
        scroll={virtual ? { y: true } : undefined}
      />
      {/* 拖拽指示线：绝对定位蓝色横线，跨整行（left:0/right:0 相对 container）。
          非 grid item（是 container 子元素），不影响 grid-template-rows 计算。 */}
      {indicator.visible ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: indicator.top,
            left: indicator.left,
            right: indicator.right,
            height: 2,
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
      </div>
    </div>
  )
}
