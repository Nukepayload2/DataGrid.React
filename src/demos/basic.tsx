/**
 * 复刻 antd basic demo：`G:\Projects\ant-design\components\table\demo\basic.tsx`。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（render `<a>`/内联最小 Tag/Action 链接），
 *   仅接共享 `Bordered` 控制条。
 * - **右栏（antd Table）**：忠实复刻 antd basic demo（antd `<Tag>` + `<Flex>` + `<Space>`，
 *   不再用左栏的内联最小 Tag 实现）。
 * - **共享控制条**：`Bordered` 开关同时驱动两侧（antd basic demo 原本无控制条，此处加一个
 *   最小开关便于对照「有/无边框」两侧行为是否一致）。
 * - **共享数据**：`RecordType` + `data` + `tagColor` 见 `_compare/basic.shared.ts`。
 *
 * === 两侧保留的差异 ===
 *
 * 1. **Tag 实现**：左栏内联最小实现（因 data-grid 引擎本身不依赖 antd 本体的 Tag，保留改造前
 *    的内联 `Tag`），右栏 antd `<Tag>`（antd 内置预设色 geekblue/green/volcano）。
 * 2. **Action 布局**：左栏内联 `<span style={{display:'inline-flex',gap:8}}>`；右栏 antd `<Space>`。
 * 3. **size="medium"**：antd Space 用 `size="medium"`（antd v6 兼容别名，规范值为 'middle'）。
 */

import { useState } from 'react'
import { Flex, Space, Switch, Table as AntdTable, Tag } from 'antd'
import type { TableProps } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { data, tagColor, type RecordType } from './_compare/basic.shared'

/**
 * 左栏内联最小 Tag（data-grid 不依赖 antd Tag；视觉等价 antd 预设色）。
 * 改造前行为保留。
 */
const inlineTagColorMap: Record<string, string> = {
  geekblue: '#2f54eb',
  green: '#389e0d',
  volcano: '#fa541c',
}

function InlineTag({ color, children }: { color: string; children: import('react').ReactNode }) {
  const bg = color in inlineTagColorMap ? inlineTagColorMap[color] : color
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0 7px',
        fontSize: 12,
        lineHeight: '20px',
        borderRadius: 4,
        color: bg,
        background: `${bg}1a`, // ~10% alpha
        border: `1px solid ${bg}33`,
        marginRight: 4,
      }}
    >
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— 行为与改造前一致
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <a>{text}</a>,
  },
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address',
  },
  {
    title: 'Tags',
    key: 'tags',
    dataIndex: 'tags',
    render: (_, { tags }) => (
      <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
        {tags.map((tag) => (
          <InlineTag color={tagColor(tag)} key={tag}>
            {tag.toUpperCase()}
          </InlineTag>
        ))}
      </span>
    ),
  },
  {
    title: 'Action',
    key: 'action',
    render: (_, record) => (
      <span style={{ display: 'inline-flex', gap: 8 }}>
        <a>Invite {record.name}</a>
        <a>Delete</a>
      </span>
    ),
  },
]

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd basic demo
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <a>{text}</a>,
  },
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address',
  },
  {
    title: 'Tags',
    key: 'tags',
    dataIndex: 'tags',
    render: (_, { tags }) => (
      <Flex gap="small" align="center" wrap>
        {tags.map((tag) => (
          <Tag color={tagColor(tag)} key={tag}>
            {tag.toUpperCase()}
          </Tag>
        ))}
      </Flex>
    ),
  },
  {
    title: 'Action',
    key: 'action',
    render: (_, record) => (
      <Space size="medium">
        <a>Invite {record.name}</a>
        <a>Delete</a>
      </Space>
    ),
  },
]

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function BasicDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一个状态同时驱动两侧表格。 */}
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          background: '#fff',
        }}
      >
        <Space>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
        </Space>
      </div>

      {/*
        minPaneWidth=480（窄表，3-5 列无 scroll.x）→ 横排阈值 ≈ 480×2 + 16 = 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <Table<RecordType>
            columns={dgColumns}
            dataSource={data}
            bordered={bordered}
            /* pagination={{}}：对齐 antd 默认分页条（antd 6.4.4 对任意行数都渲染 .ant-pagination，
               即便行数 ≤ pageSize 也会渲染 disabled 态分页条；data-grid 不传=不渲染）。 */
            pagination={{}}
          />
        }
        right={
          <AntdTable<RecordType> columns={antdColumns} dataSource={data} bordered={bordered} />
        }
      >
        <div>
          <strong>对照说明（决策 9 T1）：</strong>左右并排呈现 data-grid 与 antd basic demo。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>Bordered 开关</strong>：同时切换两侧表格边框，对照两侧行为是否一致。
            </li>
            <li>
              <strong>Tag 实现</strong>：左栏 data-grid 用内联最小 Tag（引擎不依赖 antd Tag）；
              右栏 antd 用原生 <code>&lt;Tag&gt;</code>（预设色 geekblue/green/volcano）。
            </li>
            <li>
              <strong>Action 布局</strong>：左栏内联 <code>&lt;span&gt;</code> + flex；
              右栏 antd <code>&lt;Space size="medium"&gt;</code>。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
