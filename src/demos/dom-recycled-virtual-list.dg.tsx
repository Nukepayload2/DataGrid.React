import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Modal, Segmented, Space, Switch, Typography } from 'antd'
import { Table } from '../table'
import type {
  ColumnType,
  DisposeCellElementReason,
  GridCellElementRenderParams,
} from '../table'
import {
  DEFAULT_RECYCLING_ROW_COUNT,
  LARGE_RECYCLING_ROW_COUNT,
  RECYCLING_SCROLL_X,
  makeRecyclingRows,
  type RecyclingRow,
  type RecyclingRowCountOption,
} from './_compare/dom-recycled-virtual-list.shared'

type Stats = {
  create: number
  reuse: number
  render: number
  recycle: number
  replace: number
  discard: number
  unmount: number
  reactMount: number
  reactRender: number
  reactUnmount: number
}

type DebugEntry = {
  delta: Stats
  total: Stats
  visibleElements: number
  scrollTop: number
}

type RecyclingDebugWindow = Window & {
  __dgRecyclingLog?: DebugEntry[]
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

function createTextRenderer<RecordType>(
  statsRef: React.MutableRefObject<Stats>,
  className?: (params: GridCellElementRenderParams<RecordType>) => string,
) {
  return (
    params: GridCellElementRenderParams<RecordType>,
    oldElement: HTMLElement | undefined,
  ): HTMLElement => {
    const element = oldElement ?? document.createElement('span')
    statsRef.current.render += 1
    if (oldElement) statsRef.current.reuse += 1
    else statsRef.current.create += 1
    element.className = className?.(params) ?? 'dg-recycling-text'
    element.textContent =
      params.value === null || params.value === undefined
        ? ''
        : String(params.value)
    return element
  }
}

function formatCellValue(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function renderStandardText(value: unknown) {
  return <span className="dg-recycling-text">{formatCellValue(value)}</span>
}

function renderStandardStatus(value: unknown) {
  return (
    <span className={`dg-recycling-text dg-recycling-status-${String(value).toLowerCase()}`}>
      {formatCellValue(value)}
    </span>
  )
}

function renderStandardPriority(value: unknown) {
  return (
    <span className={`dg-recycling-text dg-recycling-priority-${String(value).toLowerCase()}`}>
      {formatCellValue(value)}
    </span>
  )
}

function recordDispose(
  statsRef: React.MutableRefObject<Stats>,
  _element: HTMLElement,
  reason: DisposeCellElementReason,
) {
  statsRef.current[reason] += 1
}

function sameStats(a: Stats, b: Stats): boolean {
  return (
    a.create === b.create &&
    a.reuse === b.reuse &&
    a.render === b.render &&
    a.recycle === b.recycle &&
    a.replace === b.replace &&
    a.discard === b.discard &&
    a.unmount === b.unmount &&
    a.reactMount === b.reactMount &&
    a.reactRender === b.reactRender &&
    a.reactUnmount === b.reactUnmount
  )
}

function diffStats(current: Stats, previous: Stats): Stats {
  return {
    create: current.create - previous.create,
    reuse: current.reuse - previous.reuse,
    render: current.render - previous.render,
    recycle: current.recycle - previous.recycle,
    replace: current.replace - previous.replace,
    discard: current.discard - previous.discard,
    unmount: current.unmount - previous.unmount,
    reactMount: current.reactMount - previous.reactMount,
    reactRender: current.reactRender - previous.reactRender,
    reactUnmount: current.reactUnmount - previous.reactUnmount,
  }
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
  useEffect(() => {
    statsRef.current.reactMount += 1
    return () => {
      statsRef.current.reactUnmount += 1
    }
  }, [statsRef])

  useEffect(() => {
    statsRef.current.reactRender += 1
  })

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

function RecyclingCounters({
  statsRef,
  logEnabled,
  resetVersion,
}: {
  statsRef: React.MutableRefObject<Stats>
  logEnabled: boolean
  resetVersion: number
}) {
  const [stats, setStats] = useState<Stats>(() => ({ ...statsRef.current }))
  const lastLogStatsRef = useRef(statsRef.current)

  useEffect(() => {
    lastLogStatsRef.current = { ...statsRef.current }
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
      const delta = diffStats(current, lastLogStatsRef.current)
      lastLogStatsRef.current = current
      const visibleElements = document.querySelectorAll('.dg-recycling-text').length
      const scrollTop = document.querySelector('.dg-scroll')?.scrollTop ?? 0
      const entry: DebugEntry = {
        delta,
        total: current,
        visibleElements,
        scrollTop,
      }
      const debugWindow = window as RecyclingDebugWindow
      debugWindow.__dgRecyclingLog = [
        ...(debugWindow.__dgRecyclingLog ?? []),
        entry,
      ].slice(-20)
      console.info('[virtual-list-recycling]', entry)
    }, 1000)
    return () => window.clearInterval(id)
  }, [logEnabled, statsRef])

  return (
    <Typography.Text type="secondary" data-testid="recycling-counters">
      原生 DOM 创建 {stats.create} / 复用 {stats.reuse} / 更新 {stats.render} / 回收 {stats.recycle} / 销毁 {stats.discard}
      {' '}
      React 挂载 {stats.reactMount} / 渲染 {stats.reactRender} / 卸载 {stats.reactUnmount}
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
    <Typography.Text type="secondary" data-testid="frame-rate-meter">
      帧率 {frameStats.fps} / p95 {frameStats.p95}ms / 长帧 {frameStats.longFrames}
    </Typography.Text>
  )
}

export default function VirtualListRecyclingDg() {
  const statsRef = useRef<Stats>({
    create: 0,
    reuse: 0,
    render: 0,
    recycle: 0,
    replace: 0,
    discard: 0,
    unmount: 0,
    reactMount: 0,
    reactRender: 0,
    reactUnmount: 0,
  })
  const [mode, setMode] = useState<'standard' | 'recycling'>('recycling')
  const [rowCount, setRowCount] = useState<RecyclingRowCountOption>(DEFAULT_RECYCLING_ROW_COUNT)
  const [showActionColumn, setShowActionColumn] = useState(false)
  const [actionModal, setActionModal] = useState<ActionModalState>(null)
  const [logEnabled, setLogEnabled] = useState(false)
  const [version, setVersion] = useState(0)

  const data = useMemo(() => makeRecyclingRows(rowCount), [rowCount])
  const renderText = useMemo(() => createTextRenderer<RecyclingRow>(statsRef), [])
  const renderStatus = useMemo(
    () =>
      createTextRenderer<RecyclingRow>(
        statsRef,
        (params) => `dg-recycling-text dg-recycling-status-${String(params.value).toLowerCase()}`,
      ),
    [],
  )
  const renderPriority = useMemo(
    () =>
      createTextRenderer<RecyclingRow>(
        statsRef,
        (params) => `dg-recycling-text dg-recycling-priority-${String(params.value).toLowerCase()}`,
      ),
    [],
  )
  const dispose = useMemo(
    () => (element: HTMLElement, reason: DisposeCellElementReason) =>
      recordDispose(statsRef, element, reason),
    [],
  )

  const openActionModal = useCallback((action: ActionKind, row: RecyclingRow) => {
    setActionModal({ action, row })
  }, [])

  const columns = useMemo<ColumnType<RecyclingRow>[]>(
    () => {
      const baseColumns: ColumnType<RecyclingRow>[] = [
      { title: 'ID', dataIndex: 'id', width: 72 },
      { title: 'Account', dataIndex: 'account', width: 120 },
      { title: 'Status', dataIndex: 'status', width: 100, render: renderStandardStatus, gridColumnOptions: { renderCellElement: renderStatus, disposeCellElement: dispose } },
      { title: 'Region', dataIndex: 'region', width: 90 },
      { title: 'Owner', dataIndex: 'owner', width: 110 },
      { title: 'Priority', dataIndex: 'priority', width: 92, render: renderStandardPriority, gridColumnOptions: { renderCellElement: renderPriority, disposeCellElement: dispose } },
      { title: 'Amount', dataIndex: 'amount', width: 110 },
      { title: 'Score', dataIndex: 'score', width: 82 },
      { title: 'Updated', dataIndex: 'updated', width: 112 },
      { title: 'City', dataIndex: 'city', width: 112 },
      { title: 'Channel', dataIndex: 'channel', width: 105 },
      { title: 'Product', dataIndex: 'product', width: 105 },
      { title: 'Segment', dataIndex: 'segment', width: 125 },
      { title: 'Risk', dataIndex: 'risk', width: 88 },
      { title: 'SLA', dataIndex: 'sla', width: 72 },
      { title: 'Notes', dataIndex: 'notes', width: 150 },
      { title: 'Flag', dataIndex: 'flag', width: 95 },
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
          gridColumnOptions: {
            renderCellElement: undefined,
            disposeCellElement: undefined,
            renderCellReact: (params, slot) => (
              <ActionButtons
                key={slot.key}
                row={params.record}
                statsRef={statsRef}
                onAction={openActionModal}
              />
            ),
          },
        })
      }
      return baseColumns.map((column) => {
        const gridColumnOptions = {
          renderCellElement: renderText,
          disposeCellElement: dispose,
          ...column.gridColumnOptions,
        }
        if (mode === 'recycling') {
          return {
            ...column,
            render: undefined,
            gridColumnOptions,
          }
        }
        return {
          ...column,
          render: column.render ?? renderStandardText,
          gridColumnOptions,
        }
      })
    },
    [dispose, mode, openActionModal, renderPriority, renderStatus, renderText, showActionColumn],
  )

  const resetStats = () => {
    statsRef.current = {
      create: 0,
      reuse: 0,
      render: 0,
      recycle: 0,
      replace: 0,
      discard: 0,
      unmount: 0,
      reactMount: 0,
      reactRender: 0,
      reactUnmount: 0,
    }
    setVersion((current) => current + 1)
  }

  const onModeChange = (nextMode: 'standard' | 'recycling') => {
    setMode(nextMode)
    resetStats()
  }

  const onRowCountChange = (nextRowCount: RecyclingRowCountOption) => {
    setRowCount(nextRowCount)
    resetStats()
  }

  return (
    <div className="dg-recycling-demo demo-view demo-view--fill">
      <Space style={{ marginBottom: 8 }} align="center" wrap>
        <Typography.Text strong>DOM 复用虚拟列表</Typography.Text>
        <Typography.Text type="secondary">
          普通列的文本直接写入原生 DOM 元素，操作列的按钮用 React 组件渲染。
        </Typography.Text>
      </Space>
      <Space style={{ marginBottom: 12 }} align="center" wrap>
        <Segmented
          value={mode}
          onChange={(value) => onModeChange(value as 'standard' | 'recycling')}
          options={[
            { label: 'DOM 复用', value: 'recycling' },
            { label: '标准', value: 'standard' },
          ]}
        />
        <Segmented
          value={rowCount}
          onChange={(value) => onRowCountChange(value as RecyclingRowCountOption)}
          options={[
            { label: '8,000 行', value: DEFAULT_RECYCLING_ROW_COUNT },
            { label: '1,048,576 行', value: LARGE_RECYCLING_ROW_COUNT },
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
          checkedChildren="控制台日志"
          unCheckedChildren="控制台日志"
        />
        <Button size="small" onClick={resetStats}>重置计数</Button>
      </Space>
      <Space style={{ marginBottom: 12 }} align="center" wrap>
        <RecyclingCounters
          statsRef={statsRef}
          logEnabled={logEnabled}
          resetVersion={version}
        />
        <FrameRateMeter resetVersion={version} />
      </Space>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Table<RecyclingRow>
          key={version}
          size="small"
          virtual
          rowKey="id"
          columns={columns}
          dataSource={data}
          pagination={false}
          scroll={{ x: RECYCLING_SCROLL_X, y: true }}
          gridOptions={{
            virtualizationMode: mode,
            rowHeight: 20,
            headerHeight: 34,
          }}
        />
      </div>
      <Modal
        title="这只是个演示"
        open={actionModal !== null}
        onCancel={() => setActionModal(null)}
        onOk={() => setActionModal(null)}
      >
        <div>这只是演示，操作未实现。</div>
        <div>{actionModal ? JSON.stringify(actionModal.row) : ''}</div>
      </Modal>
      <style>{`
        /* 单元格 DOM 会被复用，选区随滚动错位；仅禁用表格内选中。 */
        .dg-recycling-demo .dg-wrapper {
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
      `}</style>
    </div>
  )
}
