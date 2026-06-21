/**
 * 复刻 antd ellipsis demo：`G:\Projects\ant-design\components\table\demo\ellipsis.tsx`。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（`column.ellipsis: true` → ellipsis CSS 类 +
 *   默认 native title 提示；S20 实现）。
 * - **右栏（antd Table）**：忠实复刻 antd ellipsis demo（antd 原生 `column.ellipsis: true` +
 *   antd 默认 title 提示）。
 * - **共享控制条**：`Bordered` 开关（antd ellipsis demo 原本无控制条，此处加最小开关便于对照
 *   「有/无边框」下两侧行为是否一致——尤其 §9 ellipsis 视觉 gap 对照价值）。
 * - **共享数据**：`RecordType` + `data` 见 `_compare/ellipsis.shared.ts`。
 *
 * === 两侧保留并如实呈现的差异（对照修 bug 的意义所在）===
 *
 * - **§9 ellipsis 视觉 gap（不修，登记 §9）**：
 *   - data-grid（左栏）：S20/#34 tableLayout:fixed 改造后，ellipsis 列隐式 fixed →
 *     `.dg-grid{width:100%}` + 无 width 列 `minmax(0,1fr)`（min:0 收缩）→ ellipsis 列 `...`
 *     **生效**（S20 收尾记录已验证 scrollWidth>clientWidth）。**但**若两侧容器在窄视口下宽度
 *     不足，仍可能出现列宽策略差异（data-grid minmax 收缩 vs antd width+flex fill）。
 *   - antd（右栏）：`<table>{width:100%}` + tableLayout:fixed，ellipsis 列稳定 `...`。
 *   - 如实保留两侧差异，对照价值（这正是决策 9 的意义）。
 *
 * === S20 验证点（回归）===
 *
 * 1. `column.ellipsis: true` 列表体单元格文本溢出省略号（text-overflow:ellipsis + nowrap + hidden）。
 * 2. ellipsis 列 hover 单元格 → native title 显示完整文本（dataIndex 原值）。
 * 3. ellipsis 列表头长 title 也省略 + hover title。
 * 4. 非 ellipsis 列（Name render `<a>`、Age 数值）正常显示，无省略号、无多余 title。
 */

import { useState } from 'react'
import { Space, Switch, Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { data, type RecordType } from './_compare/ellipsis.shared'

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
    ellipsis: true,
  },
  {
    title: 'Long Column Long Column Long Column',
    dataIndex: 'address',
    key: 'address 2',
    ellipsis: true,
  },
  {
    title: 'Long Column Long Column',
    dataIndex: 'address',
    key: 'address 3',
    ellipsis: true,
  },
  {
    title: 'Long Column',
    dataIndex: 'address',
    key: 'address 4',
    ellipsis: true,
  },
]

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd ellipsis demo
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
    ellipsis: true,
  },
  {
    title: 'Long Column Long Column Long Column',
    dataIndex: 'address',
    key: 'address 2',
    ellipsis: true,
  },
  {
    title: 'Long Column Long Column',
    dataIndex: 'address',
    key: 'address 3',
    ellipsis: true,
  },
  {
    title: 'Long Column',
    dataIndex: 'address',
    key: 'address 4',
    ellipsis: true,
  },
]

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function EllipsisDemo() {
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
        minPaneWidth=600（ellipsis 列有长文本 Address×4，略宽于 basic 的 480）→ 横排阈值 ≈ 1216。
        常规笔记本视口（≥1280）横排；窄视口自动换行竖排（每栏全宽，长文本更友好）。
      */}
      <SplitDemo
        minPaneWidth={600}
        left={<Table<RecordType> columns={dgColumns} dataSource={data} bordered={bordered} />}
        right={
          <AntdTable<RecordType> columns={antdColumns} dataSource={data} bordered={bordered} />
        }
      >
        <div>
          <strong>对照说明（决策 9 T1）：</strong>左右并排呈现 data-grid 与 antd ellipsis demo。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>ellipsis: true</strong>：Address ×4 列均省略号。左栏 data-grid S20 实现
              （<code>dg-cell-ellipsis</code> CSS 类：<code>overflow:hidden + white-space:nowrap +
              text-overflow:ellipsis + word-break:keep-all</code>，对齐 antd
              <code>genEllipsisStyle</code>（<code>table/style/ellipsis.ts</code>）+ 默认 native title）；
              右栏 antd 原生 ellipsis。
            </li>
            <li>
              <strong>title 长度递减</strong>：表头 'Address' → 'Long Column Long Column Long Column'
              → … → 'Long Column'。长表头两栏均应省略 + hover 显示完整标题。
            </li>
            <li>
              <strong>§9 ellipsis 视觉 gap（登记不修）</strong>：两侧列宽策略不同（data-grid
              #34 tableLayout:fixed + minmax(0,1fr) 收缩 vs antd width+flex fill），在边界宽度下
              省略号生效程度可能不同。如实保留，对照价值。
            </li>
            <li>
              <strong>Bordered 开关</strong>：同时切换两侧边框，对照有/无边框下省略号视觉是否一致。
            </li>
            <li>
              <strong>非 ellipsis 列</strong>：Name（render <code>&lt;a&gt;</code>，width 150）+ Age
              （width 80）正常显示，无省略号、无多余 title。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
