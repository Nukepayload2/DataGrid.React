import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  InputNumber,
  Segmented,
  Space,
  Table as AntdTable,
  type TableProps,
  theme,
} from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'

type LayoutMode = 'auto' | 'fixed'

type Row = {
  key: string
  orderNo: string
  customer: string
  status: string
  owner: string
}

const data: Row[] = [
  {
    key: '1',
    orderNo: 'ORD-2048',
    customer: 'North Region Settlement Team',
    status: '待复核',
    owner: 'Ada',
  },
  {
    key: '2',
    orderNo: 'ORD-2091',
    customer: 'Payment Channel Operations',
    status: '处理中',
    owner: 'Ben',
  },
  {
    key: '3',
    orderNo: 'ORD-2156',
    customer: 'Inventory Allocation Desk',
    status: '已锁定',
    owner: 'Chen',
  },
]

const ACTION_MIN_WIDTH = 36
const ACTION_MAX_WIDTH = 56
const SCROLL_X = 420

function ConstraintCell({
  value,
  tone = 'default',
}: {
  value: string
  tone?: 'default' | 'muted'
}) {
  const { token } = theme.useToken()

  return (
    <span
      style={{
        display: 'inline-block',
        maxWidth: '100%',
        whiteSpace: 'normal',
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
        lineHeight: 1.5,
        color: tone === 'muted' ? token.colorTextSecondary : token.colorText,
        fontFamily:
          tone === 'muted'
            ? 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace'
            : undefined,
      }}
      title={value}
    >
      {value}
    </span>
  )
}

function ActionCell({ referenceWidth }: { referenceWidth: number }) {
  const { token } = theme.useToken()

  return (
    <span
      style={{
        display: 'inline-flex',
        width: referenceWidth,
        minHeight: 24,
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px dashed ${token.colorWarning}`,
        borderRadius: 4,
      }}
      title={`${referenceWidth}px reference`}
    >
      <Button
        type="text"
        size="small"
        aria-label="编辑"
        icon={<EditOutlined />}
      />
    </span>
  )
}

function useMeasuredColumnWidth(
  selector: string,
  layoutMode: LayoutMode,
  scrollX: number,
  minWidth?: number,
  maxWidth?: number,
) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number>()

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    let frame = 0
    const measure = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const columnCell = root.querySelector<HTMLElement>(selector)
        setWidth(
          columnCell
            ? Math.round(columnCell.getBoundingClientRect().width)
            : undefined,
        )
      })
    }

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure)
    const initialColumnCell = root.querySelector<HTMLElement>(selector)
    resizeObserver?.observe(root)
    if (initialColumnCell) resizeObserver?.observe(initialColumnCell)
    window.addEventListener('resize', measure)
    measure()

    return () => {
      if (frame) cancelAnimationFrame(frame)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [layoutMode, maxWidth, minWidth, scrollX, selector])

  return [rootRef, width] as const
}

function WidthStatus({
  actualWidth,
  declaredLabel,
  expectedMaxWidth,
  issueLabel,
}: {
  actualWidth: number | undefined
  declaredLabel: string
  expectedMaxWidth?: number
  issueLabel?: string
}) {
  const { token } = theme.useToken()
  const overflow =
    actualWidth !== undefined && expectedMaxWidth !== undefined
      ? actualWidth - expectedMaxWidth
      : 0
  const hasOverflow = overflow > 1

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      <span style={{ color: token.colorTextSecondary }}>操作列</span>
      <code>{declaredLabel}</code>
      <strong style={{ color: hasOverflow ? token.colorError : token.colorSuccess }}>
        实际 {actualWidth ?? '--'}px
      </strong>
      {hasOverflow && issueLabel ? (
        <span style={{ color: token.colorError }}>
          {issueLabel} +{overflow}px
        </span>
      ) : null}
    </div>
  )
}

function modeLabel(mode: LayoutMode): string {
  if (mode === 'auto') return '自动布局'
  return '固定布局'
}

function layoutForTable(mode: LayoutMode): 'auto' | 'fixed' {
  return mode === 'auto' ? 'auto' : 'fixed'
}

function buildDgColumns(
  mode: LayoutMode,
  minWidth: number,
  maxWidth: number,
): ColumnType<Row>[] {
  const fixedActionWidth = mode === 'fixed' ? minWidth : undefined

  return [
    {
      title: '订单',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 120,
      render: (value) => <ConstraintCell value={value} tone="muted" />,
    },
    {
      title: '客户',
      dataIndex: 'customer',
      key: 'customer',
      render: (value) => <ConstraintCell value={value} />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 96,
    },
    {
      title: '负责人',
      dataIndex: 'owner',
      key: 'owner',
      width: 96,
    },
    {
      title: '操作',
      key: 'action',
      width: fixedActionWidth,
      gridColumnOptions: {
        minWidth,
        maxWidth,
      },
      render: () => <ActionCell referenceWidth={minWidth} />,
    },
  ]
}

type AntdColumn = NonNullable<TableProps<Row>['columns']>[number] & {
  minWidth?: number
}

function buildAntdColumns(): AntdColumn[] {
  return [
    {
      title: '订单',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 120,
      render: (value) => <ConstraintCell value={value} tone="muted" />,
    },
    {
      title: '客户',
      dataIndex: 'customer',
      key: 'customer',
      render: (value) => <ConstraintCell value={value} />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 96,
    },
    {
      title: '负责人',
      dataIndex: 'owner',
      key: 'owner',
      width: 96,
    },
    {
      title: '操作',
      key: 'action',
      minWidth: ACTION_MIN_WIDTH,
      render: () => <ActionCell referenceWidth={ACTION_MIN_WIDTH} />,
    },
  ]
}

export default function ColumnWidthConstraintsDemo() {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('auto')
  const [minWidth, setMinWidth] = useState(ACTION_MIN_WIDTH)
  const [maxWidth, setMaxWidth] = useState(ACTION_MAX_WIDTH)

  return (
    <div className="demo-view">
      <DemoToolbar>
        <Space wrap size={[16, 8]}>
          <Space>
            <span>布局:</span>
            <Segmented
              value={layoutMode}
              onChange={(value) => setLayoutMode(value as LayoutMode)}
              options={[
                { label: '自动', value: 'auto' },
                { label: '固定', value: 'fixed' },
              ]}
            />
          </Space>
          <Space>
            <span>操作列最小宽度:</span>
            <InputNumber
              id="column-width-constraints-min"
              value={minWidth}
              min={24}
              max={80}
              step={4}
              onChange={(value) => {
                const next = Number(value) || ACTION_MIN_WIDTH
                setMinWidth(next)
                setMaxWidth((current) => Math.max(current, next))
              }}
              style={{ width: 84 }}
            />
            <span>px</span>
          </Space>
          <Space>
            <span>操作列最大宽度:</span>
            <InputNumber
              id="column-width-constraints-max"
              value={maxWidth}
              min={36}
              max={120}
              step={4}
              onChange={(value) => {
                const next = Number(value) || ACTION_MAX_WIDTH
                setMaxWidth(next)
                setMinWidth((current) => Math.min(current, next))
              }}
              style={{ width: 84 }}
            />
            <span>px</span>
          </Space>
        </Space>
      </DemoToolbar>

      <SplitDemo
        minPaneWidth={520}
        left={
          <LeftPane
            layoutMode={layoutMode}
            scrollX={SCROLL_X}
            minWidth={minWidth}
            maxWidth={maxWidth}
          />
        }
        right={<RightPane layoutMode={layoutMode} scrollX={SCROLL_X} />}
      >
        <div>
          <strong>{modeLabel(layoutMode)}观察重点：</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              data-grid 上方的「操作列最小宽度 / 最大宽度」只作用于 data-grid 的「操作」列，
              对应列定义里的 <code>gridColumnOptions.minWidth/maxWidth</code>。
            </li>
            <li>
              复现 antd discussion 56602：保持「自动」布局，antd 的「操作」列声明{' '}
              <code>minWidth: {ACTION_MIN_WIDTH}</code>，单元格内容只有一个图标按钮。
              antd 表格上方的读数会显示声明值和实际列宽。
            </li>
            <li>
              操作列如果遵循这个极小宽度，列宽应贴近单元格内的虚线框；实际 antd 会被图标按钮自身尺寸、
              表头内容和单元格内边距撑开。复现点不是切换不同 <code>scroll.x</code>，
              而是在给定 <code>scroll.x={SCROLL_X}</code> 后直接观察 antd 实际列宽。
            </li>
            <li>
              data-grid 自动布局在未声明列级下限时，列宽可被内容换行压缩（下限是最长不可拆分的词）；
              本页 data-grid「操作」列显式设置列级边界，固定布局则按列定义和约束分配，不再按内容撑宽。
            </li>
            <li>
              data-grid「操作」列通过 <code>gridColumnOptions.minWidth/maxWidth</code> 声明列级边界；
              antd 在自动布局 + 给定 <code>scroll.x</code> 时不能稳定遵循这种极小列宽意图，
              固定布局也不支持最小宽度语义。
            </li>
            <li>
              data-grid 表头分隔线启用 <code>ResizeSibling</code>，拖动时会同时改变左右相邻列，
              并受上方列级最小 / 最大约束限制；antd 没有这层列宽边界能力。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

function LeftPane({
  layoutMode,
  scrollX,
  minWidth,
  maxWidth,
}: {
  layoutMode: LayoutMode
  scrollX: number
  minWidth: number
  maxWidth: number
}) {
  const columns = useMemo(
    () => buildDgColumns(layoutMode, minWidth, maxWidth),
    [layoutMode, maxWidth, minWidth],
  )
  const [rootRef, actionWidth] = useMeasuredColumnWidth(
    '.dg-cell-header[data-column-key="action"]',
    layoutMode,
    scrollX,
    minWidth,
    maxWidth,
  )

  return (
    <div ref={rootRef}>
      <WidthStatus
        actualWidth={actionWidth}
        declaredLabel={`gridColumnOptions ${minWidth}-${maxWidth}px`}
        expectedMaxWidth={maxWidth}
        issueLabel="超过列级最大值"
      />
      <Table<Row>
        columns={columns}
        dataSource={data}
        pagination={false}
        size="small"
        tableLayout={layoutForTable(layoutMode)}
        scroll={{ x: scrollX }}
        gridOptions={{
          columnResizeMode: 'ResizeSibling',
        }}
      />
    </div>
  )
}

function RightPane({
  layoutMode,
  scrollX,
}: {
  layoutMode: LayoutMode
  scrollX: number
}) {
  const columns = useMemo(() => buildAntdColumns(), [])
  const [rootRef, actionWidth] = useMeasuredColumnWidth(
    '.ant-table-thead > tr > th:last-child',
    layoutMode,
    scrollX,
  )

  return (
    <div ref={rootRef}>
      <WidthStatus
        actualWidth={actionWidth}
        declaredLabel={
          layoutMode === 'auto'
            ? `minWidth ${ACTION_MIN_WIDTH}px`
            : `minWidth ${ACTION_MIN_WIDTH}px（固定布局未采用）`
        }
        expectedMaxWidth={ACTION_MIN_WIDTH}
        issueLabel={
          layoutMode === 'auto'
            ? '被内容和 padding 撑开'
            : '固定布局未使用 minWidth 语义'
        }
      />
      <AntdTable<Row>
        columns={columns as NonNullable<TableProps<Row>['columns']>}
        dataSource={data}
        pagination={false}
        size="small"
        tableLayout={layoutForTable(layoutMode)}
        scroll={{ x: scrollX }}
      />
    </div>
  )
}
