import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Space, Switch, Typography } from 'antd'
import { Table } from '../table'
import type {
  ColumnType,
} from '../table'
import type {
  DisposeCellElementReason,
  GridCellElementRenderParams,
} from '../table/engine/recyclingCellTypes'

type Row = {
  id: number
  account: string
  status: 'Open' | 'Review' | 'Closed'
  region: string
  owner: string
  priority: 'P0' | 'P1' | 'P2'
  amount: number
  score: number
  updated: string
  city: string
  channel: string
  product: string
  segment: string
  risk: string
  sla: string
  notes: string
  flag: string
}

type Stats = {
  create: number
  reuse: number
  render: number
  recycle: number
  replace: number
  discard: number
  unmount: number
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

const regions = ['NA', 'EU', 'APAC', 'LATAM']
const owners = ['Ada', 'Grace', 'Linus', 'Ken', 'Radia', 'Margaret']
const cities = ['Tokyo', 'Berlin', 'Seattle', 'Singapore', 'Paris', 'Shenzhen']
const channels = ['Direct', 'Partner', 'Web', 'Field']
const products = ['Core', 'Edge', 'Vault', 'Flow', 'Pulse']
const segments = ['Enterprise', 'Mid Market', 'Startup']
const statuses: Row['status'][] = ['Open', 'Review', 'Closed']
const priorities: Row['priority'][] = ['P0', 'P1', 'P2']

function makeRows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    account: `AC-${String(index + 1).padStart(5, '0')}`,
    status: statuses[index % statuses.length],
    region: regions[index % regions.length],
    owner: owners[index % owners.length],
    priority: priorities[index % priorities.length],
    amount: 5000 + (index * 137) % 90000,
    score: 40 + (index * 7) % 60,
    updated: `2026-07-${String((index % 28) + 1).padStart(2, '0')}`,
    city: cities[index % cities.length],
    channel: channels[index % channels.length],
    product: products[index % products.length],
    segment: segments[index % segments.length],
    risk: index % 9 === 0 ? 'High' : index % 5 === 0 ? 'Medium' : 'Low',
    sla: `${4 + (index % 6)}h`,
    notes: `Batch ${Math.floor(index / 50)} item ${index % 50}`,
    flag: index % 11 === 0 ? 'Watch' : 'Normal',
  }))
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
    a.unmount === b.unmount
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
  }
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
  })
  const [stats, setStats] = useState<Stats>(() => ({ ...statsRef.current }))
  const [logEnabled, setLogEnabled] = useState(true)
  const [version, setVersion] = useState(0)
  const lastLogStatsRef = useRef(statsRef.current)

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = { ...statsRef.current }
      setStats((current) => (sameStats(current, next) ? current : next))
    }, 250)
    return () => window.clearInterval(id)
  }, [])

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
  }, [logEnabled])

  const data = useMemo(() => makeRows(8000), [])
  const renderText = useMemo(() => createTextRenderer<Row>(statsRef), [])
  const renderStatus = useMemo(
    () =>
      createTextRenderer<Row>(
        statsRef,
        (params) => `dg-recycling-text dg-recycling-status-${String(params.value).toLowerCase()}`,
      ),
    [],
  )
  const renderPriority = useMemo(
    () =>
      createTextRenderer<Row>(
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

  const columns = useMemo<ColumnType<Row>[]>(
    () => [
      { title: 'ID', dataIndex: 'id', width: 72 },
      { title: 'Account', dataIndex: 'account', width: 120 },
      { title: 'Status', dataIndex: 'status', width: 100, gridColumnOptions: { renderCellElement: renderStatus, disposeCellElement: dispose } },
      { title: 'Region', dataIndex: 'region', width: 90 },
      { title: 'Owner', dataIndex: 'owner', width: 110 },
      { title: 'Priority', dataIndex: 'priority', width: 92, gridColumnOptions: { renderCellElement: renderPriority, disposeCellElement: dispose } },
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
    ].map((column) => ({
      ...column,
      gridColumnOptions: {
        renderCellElement: renderText,
        disposeCellElement: dispose,
        ...column.gridColumnOptions,
      },
    })),
    [dispose, renderPriority, renderStatus, renderText],
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
    }
    lastLogStatsRef.current = statsRef.current
    setStats({ ...statsRef.current })
    setVersion((current) => current + 1)
  }

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 12 }} align="center" wrap>
        <Typography.Text strong>Recycling virtual body</Typography.Text>
        <Typography.Text type="secondary" data-testid="recycling-counters">
          create {stats.create} / reuse {stats.reuse} / render {stats.render} / recycle {stats.recycle} / discard {stats.discard}
        </Typography.Text>
        <Switch
          checked={logEnabled}
          onChange={setLogEnabled}
          checkedChildren="Console log"
          unCheckedChildren="Console log"
        />
        <Button size="small" onClick={resetStats}>Reset counters</Button>
      </Space>
      <div style={{ height: 874 }}>
        <Table<Row>
          key={version}
          size="small"
          virtual
          rowKey="id"
          columns={columns}
          dataSource={data}
          pagination={false}
          scroll={{ x: 1800, y: true }}
          gridOptions={{
            virtualizationMode: 'recycling',
            rowHeight: 28,
            headerHeight: 34,
          }}
        />
      </div>
      <style>{`
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
      `}</style>
    </div>
  )
}
