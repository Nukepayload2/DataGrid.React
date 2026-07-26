import { useState, type ReactNode } from 'react'
import { Segmented, Space, Table as AntdTable, type TableProps } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'

type Row = {
  key: string
  ticket: string
  title: string
  owner: string
  note: string
}

const data: Row[] = [
  {
    key: '1',
    ticket: 'REQ-2048',
    title: '结算页要支持一条很长的产品说明，窄屏时不能一下子压到看不懂',
    owner: 'Ada',
    note: '最小宽度要保住，内容才能先看清，再谈是否继续扩展。',
  },
  {
    key: '2',
    ticket: 'REQ-2091',
    title: '审批列表里的备注列希望可伸缩，但不要无限长到一眼看不完重点',
    owner: 'Ben',
    note: '理想宽度可以变，最大宽度也要有边界。',
  },
  {
    key: '3',
    ticket: 'REQ-2156',
    title: '字段名很长的时候，表格最好先把最重要的信息保住',
    owner: 'Chen',
    note: '把内容当成一段有范围的区块，而不是一个死宽度。',
  },
]

function ConstraintText({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block',
        minWidth: 220,
        maxWidth: 320,
        width: '100%',
        padding: '2px 0',
        whiteSpace: 'normal',
        lineHeight: 1.6,
        wordBreak: 'break-word',
      }}
    >
      {children}
    </span>
  )
}

const dgColumns: ColumnType<Row>[] = [
  {
    title: '工单',
    dataIndex: 'ticket',
    key: 'ticket',
    width: 120,
  },
  {
    title: '标题',
    dataIndex: 'title',
    key: 'title',
    render: (text) => <ConstraintText>{text}</ConstraintText>,
  },
  {
    title: '负责人',
    dataIndex: 'owner',
    key: 'owner',
    width: 96,
  },
  {
    title: '备注',
    dataIndex: 'note',
    key: 'note',
    render: (text) => <ConstraintText>{text}</ConstraintText>,
  },
]

const antdColumns: NonNullable<TableProps<Row>['columns']> = [
  {
    title: '工单',
    dataIndex: 'ticket',
    key: 'ticket',
    width: 120,
    render: (text) => <span>{text}</span>,
  },
  {
    title: '标题',
    dataIndex: 'title',
    key: 'title',
    render: (text) => <ConstraintText>{text}</ConstraintText>,
  },
  {
    title: '负责人',
    dataIndex: 'owner',
    key: 'owner',
    width: 96,
  },
  {
    title: '备注',
    dataIndex: 'note',
    key: 'note',
    render: (text) => <ConstraintText>{text}</ConstraintText>,
  },
]

export default function ColumnWidthConstraintsDemo() {
  const [layoutMode, setLayoutMode] = useState<'auto' | 'fixed'>('auto')
  const [paneWidth, setPaneWidth] = useState(760)

  return (
    <div style={{ padding: 24 }}>
      <DemoToolbar>
        <Space wrap>
          <Segmented
            value={layoutMode}
            onChange={(value) => setLayoutMode(value as 'auto' | 'fixed')}
            options={[
              { label: '自动布局', value: 'auto' },
              { label: '固定布局', value: 'fixed' },
            ]}
          />
          <Segmented
            value={paneWidth}
            onChange={(value) => setPaneWidth(value as number)}
            options={[
              { label: '窄', value: 560 },
              { label: '中', value: 760 },
              { label: '宽', value: 960 },
            ]}
          />
        </Space>
      </DemoToolbar>

      <SplitDemo
        minPaneWidth={520}
        left={<LeftPane layoutMode={layoutMode} paneWidth={paneWidth} />}
        right={<RightPane layoutMode={layoutMode} paneWidth={paneWidth} />}
      >
        <div>
          <strong>观察重点：</strong>把标题和备注列当成有范围的内容块来看，先切窄容器，再切固定布局。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>左栏</strong>：内容块可以保住最小宽度，容器变宽后也不会无限放大。
            </li>
            <li>
              <strong>右栏</strong>：切到固定布局后，这类约束更容易被压扁，读起来会更累。
            </li>
            <li>
              <strong>怎么看</strong>：先选「窄」，再切「固定布局」；随后改成「宽」，看两侧是否还能保持同一套可读性。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

function LeftPane({
  layoutMode,
  paneWidth,
}: {
    layoutMode: 'auto' | 'fixed'
    paneWidth: number
  }) {
  return (
    <div style={{ width: '100%', maxWidth: paneWidth }}>
      <Table<Row>
        columns={dgColumns}
        dataSource={data}
        pagination={false}
        size="small"
        tableLayout={layoutMode}
      />
    </div>
  )
}

function RightPane({
  layoutMode,
  paneWidth,
}: {
    layoutMode: 'auto' | 'fixed'
    paneWidth: number
  }) {
  return (
    <div style={{ width: '100%', maxWidth: paneWidth }}>
      <AntdTable<Row>
        columns={antdColumns}
        dataSource={data}
        pagination={false}
        size="small"
        tableLayout={layoutMode}
      />
    </div>
  )
}
