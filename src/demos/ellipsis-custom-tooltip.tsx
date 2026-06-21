/**
 * 复刻 antd ellipsis-custom-tooltip demo：
 *   `G:\Projects\ant-design\components\table\demo\ellipsis-custom-tooltip.tsx`。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（`column.ellipsis: { showTitle: false }` S21
 *   关闭默认 native title + render 内 antd `<Tooltip placement="topLeft">` 接管 hover）。
 * - **右栏（antd Table）**：忠实复刻 antd ellipsis-custom-tooltip demo（antd 原生
 *   `ellipsis: { showTitle: false }` + antd `<Tooltip>` render）。
 * - **共享控制条**：`Bordered` 开关（antd demo 原本无控制条，此处加最小开关便于对照）。
 * - **共享数据**：`RecordType` + `data` 见 `_compare/ellipsis-custom-tooltip.shared.ts`。
 *
 * === 两侧列宽策略（C1 后已对齐）===
 *
 * C1 列宽策略（§11 第 0 步）落地后：任一 ellipsis 列（对象 `{ showTitle: false }` 也算 truthy）
 * → 派生 `tableLayout:'fixed'` → grid-template-columns 用 `minmax(width,1fr)` / 无 width 列
 * `minmax(0,1fr)`，与 antd `<table width:100%>`+tableLayout:fixed 等效 → 省略号 `...` 生效
 * （scrollWidth>clientWidth，与 antd 一致）。之前 §9 记的 ellipsis 视觉 gap（auto 模式）在本 demo
 * 已消除。S21 核心验证 showTitle 开关 + Tooltip hover，C1 后省略号视觉亦对齐。
 *
 * === S21 验证点（回归）===
 *
 * 1. **showTitle:false 关闭默认 native title**：`ellipsis: { showTitle: false }` 列的 cell-inner
 *    **不加** native `title` 属性（S20 的 toEllipsisTitle 门被 showTitle !== false 判定挡住）。
 * 2. **antd Tooltip 接管 hover**：render 内 `<Tooltip placement="topLeft" title={address}>`
 *    悬浮单元格显示 antd Tooltip（placement topLeft）。
 * 3. **回归不破**：`ellipsis: true`（S20 默认 showTitle=true）列仍加 native title；
 *    非 ellipsis 列（Name render `<a>`、Age 数值）正常显示。
 */

import { useState } from 'react'
import { Space, Switch, Table as AntdTable, Tooltip } from 'antd'
import type { TableProps } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { data, type RecordType } from './_compare/ellipsis-custom-tooltip.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— 行为与改造前一致
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <a>{text}</a>,
    width: 150,
  },
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
    width: 80,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address 1',
    // S21：对象形式 ellipsis —— showTitle:false 关闭默认 native title，由 render 的 antd Tooltip 接管。
    ellipsis: { showTitle: false },
    render: (address) => (
      <Tooltip placement="topLeft" title={address}>
        {address}
      </Tooltip>
    ),
  },
  {
    title: 'Long Column Long Column Long Column',
    dataIndex: 'address',
    key: 'address 2',
    ellipsis: { showTitle: false },
    render: (address) => (
      <Tooltip placement="topLeft" title={address}>
        {address}
      </Tooltip>
    ),
  },
  {
    title: 'Long Column Long Column',
    dataIndex: 'address',
    key: 'address 3',
    ellipsis: { showTitle: false },
    render: (address) => (
      <Tooltip placement="topLeft" title={address}>
        {address}
      </Tooltip>
    ),
  },
  {
    title: 'Long Column',
    dataIndex: 'address',
    key: 'address 4',
    ellipsis: { showTitle: false },
    render: (address) => (
      <Tooltip placement="topLeft" title={address}>
        {address}
      </Tooltip>
    ),
  },
]

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd ellipsis-custom-tooltip demo
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <a>{text}</a>,
    width: 150,
  },
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
    width: 80,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address 1',
    ellipsis: {
      showTitle: false,
    },
    render: (address) => (
      <Tooltip placement="topLeft" title={address}>
        {address}
      </Tooltip>
    ),
  },
  {
    title: 'Long Column Long Column Long Column',
    dataIndex: 'address',
    key: 'address 2',
    ellipsis: {
      showTitle: false,
    },
    render: (address) => (
      <Tooltip placement="topLeft" title={address}>
        {address}
      </Tooltip>
    ),
  },
  {
    title: 'Long Column Long Column',
    dataIndex: 'address',
    key: 'address 3',
    ellipsis: {
      showTitle: false,
    },
    render: (address) => (
      <Tooltip placement="topLeft" title={address}>
        {address}
      </Tooltip>
    ),
  },
  {
    title: 'Long Column',
    dataIndex: 'address',
    key: 'address 4',
    ellipsis: {
      showTitle: false,
    },
    render: (address) => (
      <Tooltip placement="topLeft" title={address}>
        {address}
      </Tooltip>
    ),
  },
]

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function EllipsisCustomTooltipDemo() {
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
        minPaneWidth=600（同 ellipsis demo：Address×4 长文本列，略宽于 480）→ 横排阈值 ≈ 1216。
        常规笔记本视口（≥1280）横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={600}
        left={<Table<RecordType> columns={dgColumns} dataSource={data} bordered={bordered} />}
        right={
          <AntdTable<RecordType> columns={antdColumns} dataSource={data} bordered={bordered} />
        }
      >
        <div>
          <strong>对照说明（决策 9 T1）：</strong>
          左右并排呈现 data-grid 与 antd ellipsis-custom-tooltip demo。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>ellipsis: {'{ showTitle: false }'}</strong>：Address ×4 列均关闭默认 native title。
              左栏 data-grid S21 实现（toEllipsisTitle 门被 showTitle !== false 挡住，cell-inner 不加
              title 属性）；右栏 antd 原生 showTitle:false。
            </li>
            <li>
              <strong>antd Tooltip 接管 hover</strong>：两侧 render 内均用
              <code>&lt;Tooltip placement="topLeft" title={'{address}'}&gt;</code>（决策 6：tooltip 用 antd）。
              hover 单元格显示 antd Tooltip（placement topLeft）。
            </li>
            <li>
              <strong>省略号视觉（C1 后对齐）</strong>：任一 ellipsis 列（含 <code>{'{' + ' showTitle: false }'}</code>
              对象形式）→ 派生 <code>tableLayout:'fixed'</code> → grid <code>minmax(width,1fr)</code> /
              无 width 列 <code>minmax(0,1fr)</code>，与 antd <code>&lt;table width:100%&gt;</code>+
              tableLayout:fixed 等效 → 省略号 <code>...</code> 生效（§11 C1 第 0 步落地，原 §9 ellipsis
              视觉 gap 在本 demo 已消除）。
            </li>
            <li>
              <strong>非 ellipsis 列</strong>：Name（render <code>&lt;a&gt;</code>，width 150）+ Age
              （width 80）正常显示。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
