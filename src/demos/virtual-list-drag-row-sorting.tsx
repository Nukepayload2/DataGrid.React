import { useEffect, useRef, useState } from 'react'
import { Button, Space, Switch, theme } from 'antd'
import type { CSSProperties, ReactNode } from 'react'
import { Table } from '../table'
import type { ColumnType } from '../table'
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
  { key: 'sort', align: 'center', width: 80, render: () => <DgDragHandle /> },
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

  const [scrollTop, setScrollTop] = useState(0)
  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    let cleaned = false
    let target: HTMLElement | null = null
    let scrollRafId: number | null = null
    let latestScrollTop = 0
    const onScrollSync = () => {
      if (!target) return
      latestScrollTop = target.scrollTop
      if (scrollRafId !== null) return
      scrollRafId = requestAnimationFrame(() => {
        scrollRafId = null
        setScrollTop(latestScrollTop)
      })
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
      if (scrollRafId !== null) cancelAnimationFrame(scrollRafId)
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
        style={{ height: 440 }}
      >
        <Table<VRow>
          rowKey="key"
          columns={columns}
          dataSource={dataSource}
          virtual
          scroll={{ y: true }}
          pagination={false}
          gridOptions={{
            rowHeight: 40,
            headerHeight: 40,
            rowDragSort: {
              onSort: setDataSource,
              handleSelector: '.dg-drag-handle',
            },
            autoScrollOnDrag: autoScroll,
          }}
        />
        <div style={{ marginTop: 8, fontSize: 12, color: token.colorTextTertiary }}>
          当前首行：{dataSource[0]?.name ?? '无'}
        </div>
      </div>
    </div>
  )
}
