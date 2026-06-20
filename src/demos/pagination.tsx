/**
 * 复刻 antd pagination demo：`G:\Projects\ant-design\components\table\demo\pagination.tsx`。
 *
 * === 决策 9 双栏对照（S11 分页集成与位置）===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致——显式传 `pagination` 对象启用分页
 *   （data-grid 默认不分页，§9 已知差异）。placement 用 v6 数组语义 `[top, bottom]`，
 *   同时驱动顶部/底部两个分页器的渲染与对齐。
 * - **右栏（antd Table）**：忠实复刻 antd pagination demo（antd 原生 `<Table>` + 同款
 *   pagination + 同款 placement 数组）。
 * - **共享控制条**：顶部 `top` / `bottom` 两个 `Radio.Group`（全宽，在 SplitDemo 上方），
 *   **同一组 state 同时驱动两侧**（切换 top / bottom，左右两侧的分页器位置同步 diff）。
 * - **共享数据**：`RecordType` + `data` + `topOptions` + `bottomOptions`
 *   见 `_compare/pagination.shared.ts`，两侧复用。
 *
 * === antd demo 要素（S11 分页集成与位置）===
 *
 * - columns：Name（render `<a>`）/ Age / Address / Tags（Tag，颜色按 tag 长度/kawaii 区分）/
 *   Action（Invite/Delete 链接）。
 * - 3 行数据（John Brown / Jim Green / Joe Black）。
 * - 两个 `Radio.Group`：top（topStart/topCenter/topEnd/none）+ bottom（bottomStart/Center/End/none）。
 * - `pagination={{ placement: [top, bottom] }}`：v6 数组语义。
 *
 * === data-grid placement（v6 数组，以 antd 6.4.4 实测为准）===
 *
 *   - 数组元素 ∈ 'topStart'|'topCenter'|'topEnd'|'bottomStart'|'bottomCenter'|'bottomEnd'|'none'。
 *   - 取"含 'top' 的首个元素"→顶部 + 对齐；"含 'bottom' 的首个元素"→底部 + 对齐。
 *   - 'none' 不含 top/bottom → 该侧不显示。默认 `['bottomEnd']`。
 *   - 对齐映射：含 'center'→居中；含 'start'/'left'→左；否则→右。
 *
 * === 两侧保留的差异 ===
 *
 * - demo 1:1 复刻 antd，无视觉差异。data-grid `pagination` prop 签名对齐 antd v6
 *   `TablePaginationConfig`；默认不分页是 §9 已知差异（本 demo 显式传 pagination 启用）。
 * - pageSize 默认 10 → 3 行 1 页，分页器仍渲染以演示 placement 位置切换。
 *
 * === 验证点（S11 + 决策 9）===
 *
 * 1. 默认 top=topStart, bottom=bottomEnd → 两侧顶部左对齐 + 底部右对齐各一个分页器。
 * 2. 切 top → topCenter → 两侧顶部分页器同步居中。
 * 3. 切 top → none → 两侧顶部不显示分页器（仅底部）。
 * 4. 切 bottom → bottomCenter/bottomEnd/none 同理（两侧同步）。
 * 5. 回归：basic/head 等未传 pagination 的 demo 仍全显无分页器。
 */

import { useState } from 'react'
import { Flex, Radio, Space, Table as AntdTable, Tag } from 'antd'
import type { TableProps } from 'antd'
import { Table } from '../table'
import type {
  ColumnType,
  TablePaginationPlacement,
} from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import {
  bottomOptions,
  data,
  topOptions,
  type RecordType,
} from './_compare/pagination.shared'

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
    render: (tags: string[]) => (
      <Flex gap="small" align="center" wrap>
        {tags.map((tag) => {
          let color = tag.length > 5 ? 'geekblue' : 'green'
          if (tag === 'kawaii') {
            color = 'volcano'
          }
          return (
            <Tag color={color} key={tag}>
              {tag.toUpperCase()}
            </Tag>
          )
        })}
      </Flex>
    ),
  },
  {
    title: 'Action',
    key: 'action',
    render: (_, record) => (
      <Space size="middle">
        <a>Invite {record.name}</a>
        <a>Delete</a>
      </Space>
    ),
  },
]

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd pagination demo
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
    render: (tags: string[]) => (
      <Flex gap="small" align="center" wrap>
        {tags.map((tag) => {
          let color = tag.length > 5 ? 'geekblue' : 'green'
          if (tag === 'kawaii') {
            color = 'volcano'
          }
          return (
            <Tag color={color} key={tag}>
              {tag.toUpperCase()}
            </Tag>
          )
        })}
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

export default function PaginationDemo() {
  // ★ 共享状态：top / bottom placement 同时驱动两侧 pagination。
  const [top, setTop] = useState<TablePaginationPlacement>('topStart')
  const [bottom, setBottom] = useState<TablePaginationPlacement>('bottomEnd')

  return (
    <div style={{ padding: 24 }}>
      {/*
        ★ 顶部全宽控制条：两个 Radio.Group（top / bottom）作为共享控制条全宽置于 SplitDemo 上方。
        同一组 state（top / bottom）同时驱动两侧 pagination.placement。
      */}
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <Radio.Group
          options={[...topOptions]}
          value={top}
          onChange={(e) => setTop(e.target.value)}
        />
        <Radio.Group
          options={[...bottomOptions]}
          value={bottom}
          onChange={(e) => setBottom(e.target.value)}
        />
      </div>

      {/*
        minPaneWidth=480（窄表，5 列无 scroll.x）→ 横排阈值 ≈ 480×2 + 16 = 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <Table<RecordType>
            columns={dgColumns}
            pagination={{ placement: [top, bottom] }}
            dataSource={data}
          />
        }
        right={
          <AntdTable<RecordType>
            columns={antdColumns}
            pagination={{ placement: [top, bottom] }}
            dataSource={data}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B14 / S11 分页 placement）：</strong>
          左右并排呈现 data-grid 与 antd pagination demo（分页 placement v6 数组语义）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>共享 placement</strong>：顶部两个 <code>Radio.Group</code>（top / bottom）
              共用同一组 state，切换后**两侧分页器位置/对齐同步**（顶部 topStart/topCenter/topEnd/none、
              底部 bottomStart/Center/End/none）。
            </li>
            <li>
              <strong>v6 数组语义</strong>：<code>pagination={'{'} placement: [top, bottom] {'}'}</code>
              —— 取"含 'top' 的首个元素"决定顶部 + 对齐，"含 'bottom' 的首个元素"决定底部 + 对齐，
              'none' 该侧不显示。
            </li>
            <li>
              <strong>★ data-grid 默认不分页</strong>（§9 已知差异）：本 demo 左栏显式传
              <code> pagination</code> 对象启用；其它未传 pagination 的 demo（basic/head/...）仍全显。
            </li>
            <li>
              <strong>无视觉差异</strong>：demo 1:1 复刻 antd，3 行 1 页（pageSize 默认 10），
              分页器仍渲染以演示 placement 切换。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
