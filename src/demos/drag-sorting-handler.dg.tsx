/**
 * drag-sorting-handler demo 的 data-grid 段（左栏）。
 * 拖拽 dataSource 在子组件内自管（两栏各自独立）。手柄列触发行拖拽
 * （`useRowDragSort` + `handleSelector: '.dg-drag-handle'` + 蓝色指示线 + arrayMove）。
 */
import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { ReactNode } from 'react'
import { Button, theme } from 'antd'
import { Table, useRowDragSort } from '../table'
import type { ColumnType } from '../table'
import { initialData, type RecordType } from './_compare/drag-sorting-handler.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）内联 HolderOutlined SVG —— 避免 import @ant-design/icons
// ---------------------------------------------------------------------------

/**
 * 内联 HolderOutlined（拖拽手柄"七点"图标）。项目未直接声明 @ant-design/icons 依赖（仅 antd
 * 间接依赖，pnpm 严格隔离不可访问），故内联 SVG：viewBox + path 取自 @ant-design/icons-svg
 * HolderOutlined（viewBox "64 64 896 896"，7 个圆点），与官方逐字节一致；size 跟随父节点 1em。
 */
function InlineHolderOutlined({ style }: { style?: CSSProperties }): ReactNode {
  return (
    <svg
      viewBox="64 64 896 896"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-0.125em', ...style }}
    >
      <path d="M300 276.5a56 56 0 1056-97 56 56 0 00-56 97zm0 284a56 56 0 1056-97 56 56 0 00-56 97zM640 228a56 56 0 10112 0 56 56 0 00-112 0zm0 284a56 56 0 10112 0 56 56 0 00-112 0zM300 844.5a56 56 0 1056-97 56 56 0 00-56 97zM640 796a56 56 0 10112 0 56 56 0 00-112 0z" />
    </svg>
  )
}

/** 左栏 DragHandle：cursor:move + .dg-drag-handle class（供 handleSelector 命中）。 */
function DgDragHandle() {
  return (
    <Button
      type="text"
      size="small"
      className="dg-drag-handle"
      icon={<InlineHolderOutlined />}
      style={{ cursor: 'move' }}
    />
  )
}

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— 首列手柄 + Name/Age/Address（对齐 antd demo）
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  { key: 'sort', align: 'center', width: 80, render: () => <DgDragHandle /> },
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

// ---------------------------------------------------------------------------
// 子组件（自管拖拽排序 state）
// ---------------------------------------------------------------------------

export default function DragSortingHandlerDg({
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

  // 外层容器 ref（指示线相对此容器绝对定位；hit-test 遍历容器内命中 .dg-drag-handle）。
  const containerRef = useRef<HTMLDivElement>(null)

  const { dragState, indicator, containerProps } = useRowDragSort<RecordType>({
    dataSource,
    rowKey: 'key',
    onSort: setDataSource,
    containerRef,
    // 手柄列限定：仅 .dg-drag-handle 命中才启动拖拽（Name/Age/Address 不触发）。
    handleSelector: '.dg-drag-handle',
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
        // 虚拟化开关：ON→virtual+scroll.y:true（CSS 自适应，填满 SplitDemo 限高）；OFF→回 undefined，非虚拟。
        virtual={virtual}
        scroll={virtual ? { y: true } : undefined}
      />
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
