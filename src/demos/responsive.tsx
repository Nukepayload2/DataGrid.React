/**
 * 复刻 antd `responsive` demo：
 *   `G:\Projects\ant-design\components\table\demo\responsive.tsx`
 *
 * === S28 落地说明 ===
 *
 * - `column.responsive: Breakpoint[]`：按视口断点显隐列（对齐 antd `column.responsive`）。
 * - 断点检测用 antd `Grid.useBreakpoint`（决策 6：响应式检测用 antd）。`screens[bp]===true`
 *   表示当前视口 >= bp，故 `responsive: ['md']` 实际语义是 **md 及以上显示**
 *   （与 antd responsive demo 注释 "medium screen or bigger" 一致）。
 *
 * 3 列：
 *   - Name（render `<a>`，**无 responsive** → 所有视口始终显示）。
 *   - Age（`responsive: ['md']` → md 及以上显示；<md 视口隐藏）。
 *   - Address（`responsive: ['lg']` → lg 及以上显示；<lg 视口隐藏）。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（column.responsive 字段 + 引擎 needResponsive
 *   订阅 useBreakpoint + visibleColumns 过滤）。
 * - **右栏（antd Table）**：忠实复刻 antd responsive demo（antd 原生 column.responsive）。
 * - **共享控制条**：`Bordered` 开关（响应式靠视口宽度自然驱动，无需额外控制；Bordered 便于对照）。
 * - **共享数据**：`RecordType` + `data` 见 `_compare/responsive.shared.ts`。
 *
 * === 两侧保留的差异 ===
 *
 * data-grid 与 antd 都用 antd `Grid.useBreakpoint` 检测断点，故两侧列显隐切换应完全同步。
 * 调整浏览器视口宽度对照：≥lg 三列全显；md（<lg）Name+Age；<md 仅 Name。
 */

import { useState } from 'react'
import { Grid, Space, Switch, Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { data, type RecordType } from './_compare/responsive.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— 行为与改造前一致
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  {
    title: 'Name (all screens)',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <a>{text}</a>,
  },
  {
    title: 'Age (medium screen or bigger)',
    dataIndex: 'age',
    key: 'age',
    responsive: ['md'],
  },
  {
    title: 'Address (large screen or bigger)',
    dataIndex: 'address',
    key: 'address',
    responsive: ['lg'],
  },
]

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd responsive demo
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'Name (all screens)',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <a>{text}</a>,
  },
  {
    title: 'Age (medium screen or bigger)',
    dataIndex: 'age',
    key: 'age',
    responsive: ['md'],
  },
  {
    title: 'Address (large screen or bigger)',
    dataIndex: 'address',
    key: 'address',
    responsive: ['lg'],
  },
]

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function ResponsiveDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)

  // 两侧都用 antd Grid.useBreakpoint 检测断点（决策 6：响应式检测用 antd）。
  // 显示当前断点状态便于对照（虽然两侧各自内部也会检测，这里仅作 UI 提示）。
  const screens = Grid.useBreakpoint()

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。 */}
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          background: '#fff',
        }}
      >
        <Space wrap>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
          <span style={{ color: 'rgba(0,0,0,0.65)', fontSize: 12 }}>
            Current breakpoints: md={screens.md ? '✓' : '✗'} lg={screens.lg ? '✓' : '✗'}
            （调整视口宽度对照列显隐）
          </span>
        </Space>
      </div>

      {/*
        minPaneWidth=480（窄表，1-3 列视断点，无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <Table<RecordType>
            columns={dgColumns}
            dataSource={data}
            bordered={bordered}
            // ★ 对齐右栏 antd 默认分页（校准事实 1：antd 对任意行数都渲染 .ant-pagination
            //   disabled 态分页条；data-grid omit=不渲染）。补 pagination={{}} 启用默认分页器，
            //   两侧分页条存在性一致。
            pagination={{}}
          />
        }
        right={
          <AntdTable<RecordType>
            columns={antdColumns}
            dataSource={data}
            bordered={bordered}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 T1）：</strong>左右并排呈现 data-grid 与 antd responsive demo。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>column.responsive</strong>：Age <code>responsive:['md']</code>（md+ 显示）；
              Address <code>responsive:['lg']</code>（lg+ 显示）。
            </li>
            <li>
              <strong>断点检测</strong>：两侧都用 antd <code>Grid.useBreakpoint</code>，列显隐应完全同步。
            </li>
            <li>
              <strong>对照方式</strong>：调整浏览器视口宽度——≥lg（≥992px）三列全显；md（768–991px）
              Name+Age；&lt;md（&lt;768px）仅 Name。两栏应同时切换。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
