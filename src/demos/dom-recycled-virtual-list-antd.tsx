import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Modal, Segmented, Space, Switch, Table as AntdTable, Typography } from 'antd'
import type { TableProps } from 'antd'
import {
  DEFAULT_RECYCLING_ROW_COUNT,
  LARGE_RECYCLING_ROW_COUNT,
  RECYCLING_SCROLL_X,
  makeRecyclingRows,
  type RecyclingRow,
  type RecyclingRowCountOption,
} from './_compare/dom-recycled-virtual-list.shared'

type Stats = {
  reactMount: number
  reactRender: number
  reactUnmount: number
}

type ActionKind = 'details' | 'delete'

type ActionModalState = {
  action: ActionKind
  row: RecyclingRow
} | null

type FrameStats = {
  fps: number
  p95: number
  longFrames: number
}

type DebugEntry = {
  total: Stats
  visibleElements: number
  scrollTop: number
}

type AntdRecyclingDebugWindow = Window & {
  __antdRecyclingControlLog?: DebugEntry[]
}

function sameStats(a: Stats, b: Stats): boolean {
  return (
    a.reactMount === b.reactMount &&
    a.reactRender === b.reactRender &&
    a.reactUnmount === b.reactUnmount
  )
}

function formatCellValue(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function InstrumentedText({
  value,
  className = 'dg-recycling-text',
  statsRef,
}: {
  value: unknown
  className?: string
  statsRef: React.MutableRefObject<Stats>
}) {
  statsRef.current.reactRender += 1

  useEffect(() => {
    statsRef.current.reactMount += 1
    return () => {
      statsRef.current.reactUnmount += 1
    }
  }, [statsRef])

  return <span className={className}>{formatCellValue(value)}</span>
}

function ActionButtons({
  row,
  statsRef,
  onAction,
}: {
  row: RecyclingRow
  statsRef: React.MutableRefObject<Stats>
  onAction: (action: ActionKind, row: RecyclingRow) => void
}) {
  statsRef.current.reactRender += 1

  useEffect(() => {
    statsRef.current.reactMount += 1
    return () => {
      statsRef.current.reactUnmount += 1
    }
  }, [statsRef])

  return (
    <span className="dg-recycling-actions">
      <Button type="link" size="small" onClick={() => onAction('details', row)}>
        详情
      </Button>
      <Button type="link" size="small" danger onClick={() => onAction('delete', row)}>
        删除
      </Button>
    </span>
  )
}

function ReactCounters({
  statsRef,
  logEnabled,
  resetVersion,
}: {
  statsRef: React.MutableRefObject<Stats>
  logEnabled: boolean
  resetVersion: number
}) {
  const [stats, setStats] = useState<Stats>(() => ({ ...statsRef.current }))

  useEffect(() => {
    setStats({ ...statsRef.current })
  }, [resetVersion, statsRef])

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = { ...statsRef.current }
      setStats((current) => (sameStats(current, next) ? current : next))
    }, 250)
    return () => window.clearInterval(id)
  }, [statsRef])

  useEffect(() => {
    if (!logEnabled) return undefined
    const id = window.setInterval(() => {
      const current = { ...statsRef.current }
      const entry: DebugEntry = {
        total: current,
        visibleElements: document.querySelectorAll('.dg-recycling-text').length,
        scrollTop: document.querySelector('.ant-table-body')?.scrollTop ?? 0,
      }
      const debugWindow = window as AntdRecyclingDebugWindow
      debugWindow.__antdRecyclingControlLog = [
        ...(debugWindow.__antdRecyclingControlLog ?? []),
        entry,
      ].slice(-20)
      console.info('[antd-virtual-list-control]', entry)
    }, 1000)
    return () => window.clearInterval(id)
  }, [logEnabled, statsRef])

  return (
    <Typography.Text type="secondary" data-testid="antd-recycling-counters">
      React mount {stats.reactMount} / render {stats.reactRender} / unmount {stats.reactUnmount}
    </Typography.Text>
  )
}

function FrameRateMeter({ resetVersion }: { resetVersion: number }) {
  const [frameStats, setFrameStats] = useState<FrameStats>({
    fps: 0,
    p95: 0,
    longFrames: 0,
  })

  useEffect(() => {
    let rafId = 0
    let lastTime = performance.now()
    let lastPublish = lastTime
    let frameTimes: number[] = []

    const tick = (time: number) => {
      const delta = time - lastTime
      lastTime = time
      if (delta > 0 && delta < 1000) frameTimes.push(delta)

      if (time - lastPublish >= 1000) {
        const sorted = [...frameTimes].sort((a, b) => a - b)
        const p95Index = sorted.length > 0
          ? Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))
          : 0
        const p95 = sorted[p95Index] ?? 0
        const longFrames = frameTimes.filter((value) => value > 50).length
        const elapsedSeconds = (time - lastPublish) / 1000
        const fps = elapsedSeconds > 0 ? frameTimes.length / elapsedSeconds : 0
        setFrameStats({
          fps: Math.round(fps),
          p95: Math.round(p95 * 10) / 10,
          longFrames,
        })
        frameTimes = []
        lastPublish = time
      }

      rafId = window.requestAnimationFrame(tick)
    }

    rafId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(rafId)
  }, [resetVersion])

  return (
    <Typography.Text type="secondary" data-testid="antd-frame-rate-meter">
      FPS {frameStats.fps} / p95 {frameStats.p95}ms / long {frameStats.longFrames}
    </Typography.Text>
  )
}

function useMeasuredScrollY(resetVersion: number): [React.RefObject<HTMLDivElement | null>, number] {
  const hostRef = useRef<HTMLDivElement>(null)
  const [scrollY, setScrollY] = useState(400)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined

    const update = () => {
      const header = host.querySelector('.ant-table-thead')
      const headerHeight = header?.getBoundingClientRect().height ?? 34
      const height = host.getBoundingClientRect().height
      setScrollY(Math.max(20, Math.floor(height - headerHeight)))
    }
    update()

    const resizeObserver = new ResizeObserver(update)
    resizeObserver.observe(host)
    return () => resizeObserver.disconnect()
  }, [resetVersion])

  return [hostRef, scrollY]
}

export default function DomRecycledVirtualListAntdDemo() {
  const statsRef = useRef<Stats>({
    reactMount: 0,
    reactRender: 0,
    reactUnmount: 0,
  })
  const [rowCount, setRowCount] = useState<RecyclingRowCountOption>(DEFAULT_RECYCLING_ROW_COUNT)
  const [showActionColumn, setShowActionColumn] = useState(false)
  const [actionModal, setActionModal] = useState<ActionModalState>(null)
  const [logEnabled, setLogEnabled] = useState(false)
  const [version, setVersion] = useState(0)
  const [tableHostRef, scrollY] = useMeasuredScrollY(version)

  const data = useMemo(() => makeRecyclingRows(rowCount), [rowCount])

  const resetStats = () => {
    statsRef.current = {
      reactMount: 0,
      reactRender: 0,
      reactUnmount: 0,
    }
    setVersion((current) => current + 1)
  }

  const onRowCountChange = (nextRowCount: RecyclingRowCountOption) => {
    setRowCount(nextRowCount)
    resetStats()
  }

  const openActionModal = (action: ActionKind, row: RecyclingRow) => {
    setActionModal({ action, row })
  }

  const renderText = (value: unknown) => (
    <InstrumentedText value={value} statsRef={statsRef} />
  )
  const renderStatus = (value: unknown) => (
    <InstrumentedText
      value={value}
      statsRef={statsRef}
      className={`dg-recycling-text dg-recycling-status-${String(value).toLowerCase()}`}
    />
  )
  const renderPriority = (value: unknown) => (
    <InstrumentedText
      value={value}
      statsRef={statsRef}
      className={`dg-recycling-text dg-recycling-priority-${String(value).toLowerCase()}`}
    />
  )

  const columns = useMemo<NonNullable<TableProps<RecyclingRow>['columns']>>(() => {
    const baseColumns: NonNullable<TableProps<RecyclingRow>['columns']> = [
      { title: 'ID', dataIndex: 'id', width: 72, render: renderText },
      { title: 'Account', dataIndex: 'account', width: 120, render: renderText },
      { title: 'Status', dataIndex: 'status', width: 100, render: renderStatus },
      { title: 'Region', dataIndex: 'region', width: 90, render: renderText },
      { title: 'Owner', dataIndex: 'owner', width: 110, render: renderText },
      { title: 'Priority', dataIndex: 'priority', width: 92, render: renderPriority },
      { title: 'Amount', dataIndex: 'amount', width: 110, render: renderText },
      { title: 'Score', dataIndex: 'score', width: 82, render: renderText },
      { title: 'Updated', dataIndex: 'updated', width: 112, render: renderText },
      { title: 'City', dataIndex: 'city', width: 112, render: renderText },
      { title: 'Channel', dataIndex: 'channel', width: 105, render: renderText },
      { title: 'Product', dataIndex: 'product', width: 105, render: renderText },
      { title: 'Segment', dataIndex: 'segment', width: 125, render: renderText },
      { title: 'Risk', dataIndex: 'risk', width: 88, render: renderText },
      { title: 'SLA', dataIndex: 'sla', width: 72, render: renderText },
      { title: 'Notes', dataIndex: 'notes', width: 150, render: renderText },
      { title: 'Flag', dataIndex: 'flag', width: 95, render: renderText },
    ]

    if (showActionColumn) {
      baseColumns.push({
        key: 'actions',
        title: '操作',
        width: 120,
        render: (_value, row) => (
          <ActionButtons
            row={row}
            statsRef={statsRef}
            onAction={openActionModal}
          />
        ),
      })
    }

    return baseColumns
  }, [showActionColumn])

  return (
    <div
      style={{
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      <Space style={{ marginBottom: 8 }} align="center" wrap>
        <Typography.Text strong>对照：antd 大量数据</Typography.Text>
        <Typography.Text type="secondary">
          同数据、同列宽、同操作列；antd 侧固定使用 virtual Table。
        </Typography.Text>
      </Space>
      <Space style={{ marginBottom: 12 }} align="center" wrap>
        <Segmented
          value={rowCount}
          onChange={(value) => onRowCountChange(value as RecyclingRowCountOption)}
          options={[
            { label: '8,000 rows', value: DEFAULT_RECYCLING_ROW_COUNT },
            { label: '1,048,576 rows', value: LARGE_RECYCLING_ROW_COUNT },
          ]}
        />
        <Switch
          checked={showActionColumn}
          onChange={setShowActionColumn}
          checkedChildren="操作列"
          unCheckedChildren="操作列"
        />
        <Switch
          checked={logEnabled}
          onChange={setLogEnabled}
          checkedChildren="Console log"
          unCheckedChildren="Console log"
        />
        <Button size="small" onClick={resetStats}>Reset counters</Button>
      </Space>
      <Space style={{ marginBottom: 12 }} align="center" wrap>
        <ReactCounters
          statsRef={statsRef}
          logEnabled={logEnabled}
          resetVersion={version}
        />
        <FrameRateMeter resetVersion={version} />
      </Space>
      <div ref={tableHostRef} style={{ flex: 1, minHeight: 0 }}>
        <AntdTable<RecyclingRow>
          key={version}
          className="antd-recycling-control-table"
          size="small"
          virtual
          rowKey="id"
          columns={columns}
          dataSource={data}
          pagination={false}
          scroll={{ x: RECYCLING_SCROLL_X, y: scrollY }}
        />
      </div>
      <Modal
        title="这只是个演示"
        open={actionModal !== null}
        onCancel={() => setActionModal(null)}
        onOk={() => setActionModal(null)}
      >
        <div>不支持指定的方法。</div>
        <div>{actionModal ? JSON.stringify(actionModal.row) : ''}</div>
      </Modal>
      <style>{`
        /* 与 dg 侧保持一致：antd virtual Table 同样复用行元素，选中状态同样会被滚动破坏。
           对照组两侧都禁止选中，避免选区差异成为对照结论的干扰变量。 */
        .antd-recycling-control-table {
          user-select: none;
        }
        .dg-recycling-text {
          display: inline-block;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          vertical-align: middle;
        }
        .dg-recycling-status-open { color: #1677ff; }
        .dg-recycling-status-review { color: #7a4d00; }
        .dg-recycling-status-closed { color: #237804; }
        .dg-recycling-priority-p0 { color: #cf1322; font-weight: 600; }
        .dg-recycling-priority-p1 { color: #0958d9; font-weight: 600; }
        .dg-recycling-priority-p2 { color: #595959; }
        .dg-recycling-actions {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        }
        .dg-recycling-actions .ant-btn {
          padding-inline: 0;
        }
        .antd-recycling-control-table .ant-table-thead .ant-table-cell {
          height: 34px;
          padding: 0 8px !important;
          line-height: 20px;
        }
        .antd-recycling-control-table .ant-table-tbody .ant-table-row,
        .antd-recycling-control-table .ant-table-tbody .ant-table-cell {
          height: 20px;
          min-height: 20px;
        }
        .antd-recycling-control-table .ant-table-tbody .ant-table-cell {
          padding: 0 8px !important;
          line-height: 20px;
        }
      `}</style>
    </div>
  )
}
