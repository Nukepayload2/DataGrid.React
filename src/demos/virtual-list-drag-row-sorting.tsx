import { useEffect, useRef, useState } from 'react'
import { Button, Space, Switch, theme } from 'antd'
import type { CSSProperties, ReactNode } from 'react'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { useRowDragSort } from '../table/engine/useRowDragSort'
import { DemoToolbar } from './_compare/DemoToolbar'

interface VRow {
  key: number
  name: string
  age: number
  address: string
}

function makeData(count: number): VRow[] {
  return Array.from({ length: count }).map<VRow>((_, i) => ({
    key: i,
    name: `User ${i}`,
    age: 20 + (i % 40),
    address: `Address ${i}, Some Park, City ${(i % 7)}`,
  }))
}

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

const columns: ColumnType<VRow>[] = [
  { key: 'sort', align: 'center', width: 60, render: () => <DgDragHandle /> },
  { title: 'Key', dataIndex: 'key', key: 'key', width: 80 },
  { title: 'Name', dataIndex: 'name', key: 'name', width: 160 },
  { title: 'Age', dataIndex: 'age', key: 'age', width: 80 },
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

export default function DragVirtualListDemo() {
  const { token } = theme.useToken()
  const [autoScroll, setAutoScroll] = useState(true)
  const [resetTick, setResetTick] = useState(0)
  const [dataSource, setDataSource] = useState<VRow[]>(() => makeData(10000))

  const containerRef = useRef<HTMLDivElement>(null)

  const { dragState, indicator, containerProps } = useRowDragSort<VRow>({
    dataSource,
    rowKey: 'key',
    onSort: setDataSource,
    containerRef,
    handleSelector: '.dg-drag-handle',
    autoScroll,
  })
  const [scrollTop, setScrollTop] = useState(0)
  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    let cleaned = false
    let target: HTMLElement | null = null
    const onScrollSync = () => {
      if (target) setScrollTop(target.scrollTop)
    }
    const tryAttach = () => {
      if (cleaned) return
      const sc = node.querySelector<HTMLElement>('.dg-scroll')
      if (sc) {
        target = sc
        sc.addEventListener('scroll', onScrollSync, { passive: true })
        setScrollTop(sc.scrollTop)
      } else {
        requestAnimationFrame(tryAttach)
      }
    }
    tryAttach()
    return () => {
      cleaned = true
      if (target) target.removeEventListener('scroll', onScrollSync)
    }
  }, [resetTick])

  const totalCount = dataSource.length

  return (
    <div style={{ padding: 24 }}>
      
      <DemoToolbar>
        <Space wrap>
          <Switch
            checked={autoScroll}
            onChange={setAutoScroll}
            checkedChildren="AutoScroll"
            unCheckedChildren="AutoScroll"
          />
          <Button onClick={() => { setDataSource(makeData(10000)); setResetTick((t) => t + 1) }}>
            Reset data (10000 rows)
          </Button>
          <span style={{ fontSize: 12, color: token.colorTextTertiary }}>
            scrollTop: {Math.round(scrollTop)} px · 共 {totalCount} 行
          </span>
        </Space>
      </DemoToolbar>

      
      <div
        key={resetTick}
        ref={containerRef}
        style={{ position: 'relative', height: 440 }}
        {...containerProps}
      >
        <Table<VRow>
          rowKey="key"
          columns={columns}
          dataSource={dataSource}
          virtual
          scroll={{ y: true }}
          pagination={false}
          gridOptions={{ rowHeight: 40, headerHeight: 40, autoScrollOnDrag: autoScroll }}
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
          {dragState
            ? `from #${dragState.fromIndex} (key=${dataSource[dragState.fromIndex]?.key}) → 目标 #${dragState.overIndex} (key=${dataSource[dragState.overIndex]?.key})`
            : '无'}
        </div>
      </div>
    </div>
  )
}
