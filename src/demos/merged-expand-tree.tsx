import { useState, type Key } from 'react'
import { Alert, Button, Space, Table as AntdTable, theme } from 'antd'
import type { TableProps as AntdTableProps } from 'antd'
import { Table } from '../table'
import type { ColumnOrSentinel } from '../table'
import { DemoToolbar } from './_compare/DemoToolbar'
import { SplitDemo } from './_compare/SplitDemo'

interface RecordType {
  key: Key
  group: string
  name: string
  role: string
  location: string
  children?: RecordType[]
}

/**
 * 分组列的合并声明：`rowSpan: 3` 数的是**行**（华东组 = 张三 / 李四 / 王五），
 * 不是展开后的扁平行数——已展开的子行由引擎当作附加轨道并入合并区。
 * 详见 docs/features/layout/header-and-span.md 的「树形数据上的合并」。
 */
const groupRowSpan: Record<string, number> = {
  'east-1': 3,
  'east-2': 0,
  'east-3': 0,
  'north-1': 2,
  'north-2': 0,
}

const flatRows: RecordType[] = [
  {
    key: 'east-1',
    group: '华东组',
    name: '张三',
    role: '负责人',
    location: '上海',
  },
  {
    key: 'east-2',
    group: '华东组',
    name: '李四',
    role: '运营',
    location: '杭州',
  },
  {
    key: 'east-3',
    group: '华东组',
    name: '王五',
    role: '支持',
    location: '苏州',
  },
  {
    key: 'north-1',
    group: '华北组',
    name: '赵六',
    role: '负责人',
    location: '北京',
  },
  {
    key: 'north-2',
    group: '华北组',
    name: '钱七',
    role: '交付',
    location: '天津',
  },
]

const treeRows: RecordType[] = [
  {
    ...flatRows[0],
    children: [
      {
        key: 'east-1-a',
        group: '华东组子项',
        name: '张三 / 任务 A',
        role: '排期',
        location: '上海',
      },
      {
        key: 'east-1-b',
        group: '华东组子项',
        name: '张三 / 任务 B',
        role: '验收',
        location: '上海',
      },
    ],
  },
  flatRows[1],
  flatRows[2],
  flatRows[3],
  flatRows[4],
]

function getGroupCell(record: RecordType) {
  const rowSpan = groupRowSpan[String(record.key)]
  return rowSpan === undefined ? {} : { rowSpan }
}

const dgColumns: ColumnOrSentinel<RecordType>[] = [
  {
    title: '分组',
    dataIndex: 'group',
    key: 'group',
    width: 120,
    onCell: getGroupCell,
  },
  { title: '姓名', dataIndex: 'name', key: 'name', width: 180 },
  { title: '职责', dataIndex: 'role', key: 'role', width: 120 },
  { title: '地点', dataIndex: 'location', key: 'location' },
]

const antdColumns: NonNullable<AntdTableProps<RecordType>['columns']> = [
  {
    title: '分组',
    dataIndex: 'group',
    key: 'group',
    width: 120,
    onCell: getGroupCell,
  },
  { title: '姓名', dataIndex: 'name', key: 'name', width: 180 },
  { title: '职责', dataIndex: 'role', key: 'role', width: 120 },
  { title: '地点', dataIndex: 'location', key: 'location' },
]

function DataGridPane({
  expandedRowKeys,
  onExpandedRowsChange,
}: {
  expandedRowKeys: Key[]
  onExpandedRowsChange: (keys: Key[]) => void
}) {
  return (
    <Table<RecordType>
      bordered
      columns={dgColumns}
      dataSource={treeRows}
      expandable={{
        expandedRowKeys,
        onExpandedRowsChange,
      }}
      pagination={false}
      rowKey="key"
      size="small"
    />
  )
}

function AntdPane({
  expandedRowKeys,
  onExpandedRowsChange,
}: {
  expandedRowKeys: Key[]
  onExpandedRowsChange: (keys: readonly Key[]) => void
}) {
  return (
    <AntdTable<RecordType>
      bordered
      columns={antdColumns}
      dataSource={treeRows}
      expandable={{
        expandedRowKeys,
        onExpandedRowsChange,
      }}
      pagination={false}
      rowKey="key"
      size="small"
    />
  )
}

export default function MergedExpandTreeDemo() {
  const [expandedRowKeys, setExpandedRowKeys] = useState<Key[]>(['east-1'])
  const { token } = theme.useToken()

  const collapseAll = () => setExpandedRowKeys([])
  const expandFirstGroup = () => setExpandedRowKeys(['east-1'])

  return (
    <div className="demo-view">
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="本页专门观察行合并与树形数据叠加时的列对齐表现。antd 展开第一组子行后，分组单元格可能覆盖树形子行，后续单元格位置会变得不稳定；data-grid 保持分组列和数据列对齐，并且合并格会跟着子行长高——分组仍是 3 行（张三 / 李四 / 王五），展开张三后合并格自动盖住张三的两个子行。"
      />

      <DemoToolbar>
        <Space wrap>
          <Button type="primary" onClick={expandFirstGroup}>
            展开第一组
          </Button>
          <Button onClick={collapseAll}>全部收起</Button>
          <span style={{ color: token.colorTextTertiary, fontSize: 12 }}>
            当前：树形子行展开 · 展开键 [
            {expandedRowKeys.map((key) => `"${key}"`).join(', ')}]
          </span>
        </Space>
      </DemoToolbar>

      <SplitDemo
        minPaneWidth={520}
        virtualizable={false}
        left={
          <DataGridPane
            expandedRowKeys={expandedRowKeys}
            onExpandedRowsChange={(keys) => setExpandedRowKeys([...keys])}
          />
        }
        right={
          <AntdPane
            expandedRowKeys={expandedRowKeys}
            onExpandedRowsChange={(keys) => setExpandedRowKeys([...keys])}
          />
        }
      />
    </div>
  )
}
