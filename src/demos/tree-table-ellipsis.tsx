/**
 * 复刻 antd `tree-table-ellipsis` demo（S25 issue #36583 复现）：
 *   `G:\Projects\ant-design\components\table\demo\tree-table-ellipsis.tsx`
 *
 * === 决策 9 双栏对照（S25 树形首列 ellipsis + fixed 组合）===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致——树形 data（children 嵌套）+
 *   Name 列 `ellipsis:true + width:'30%' + fixed`（Switch 受控）+ rowSelection 前置 +
 *   defaultExpandAllRows 全展开。
 * - **右栏（antd Table）**：忠实复刻 antd tree-table-ellipsis demo（antd 原生 `<Table>` +
 *   同列结构 + 同 rowSelection + 同 expandable）。
 * - **共享控制条**：`Fixed first column` 开关同时驱动两侧（默认 true，对齐 antd demo）。
 * - **共享数据**：`RecordType` + `data` 见 `_compare/tree-table-ellipsis.shared.ts`。
 *
 * === S25 核心验证点（issue #36583 组合）===
 *
 * issue #36583 是 antd **树形首列 ellipsis + fixed** 的组合 bug（缩进/展开图标在 fixed 列
 * 内渲染异常）。data-grid 复刻此组合验证四机制共存：
 *
 * 1. **树形首列**（Name = 第一个含 dataIndex 的叶子列）：
 *    - 缩进（`level × indentSize`，S13 useTreeData）。
 *    - 展开图标（hasChildren 行，▶/▼，点击 toggle）。
 * 2. **ellipsis 类**（S20）：Name 列加 `dg-cell-ellipsis`（CSS text-overflow:ellipsis）+ native title。
 * 3. **fixed sticky**（M2）：Switch 切到 fixed 时，Name 列 `position:sticky; left:<offset>`，
 *    横向滚动时固定；表头格同侧固定。
 * 4. **rowSelection**（M5）：选择列作为前置哨兵列（columnWidth 100），在 Name 之前。
 *
 * 四机制在引擎 BodyCell 渲染时**正交组合**（不同层面：fixed sticky 定位 / ellipsis CSS 类 /
 * 树形内容前缀 / rowSelection），不冲突——组合正确工作。
 *
 * === 两侧保留的差异（对照价值）===
 *
 * 1. **checkStrictly 默认值（§9 S13/S25）**：data-grid 引擎层 `rowSelection.checkStrictly`
 *    默认 **true**（父子独立），antd 默认 **false**（父子联动）。本 demo 未传 checkStrictly
 *    （antd demo 也未传），故**两侧行为不同**——左 data-grid 父子独立勾选、右 antd 父子联动。
 *    如实保留对照（这正是决策 9 的意义，登记 §9 不修）。
 * 2. **§9 ellipsis 视觉 gap**：data-grid grid 列宽策略 + width:'30%' 相对值在 auto 模式下
 *    可能使 ellipsis 列 track 不收缩 → 无 `...`；antd `<table>{width:100%}` + tableLayout:fixed
 *    ellipsis 稳定 `...`。不阻塞组合验证，登记 §9。
 */

import { useState } from 'react'
import { Space, Switch, Table as AntdTable } from 'antd'
import type { TableColumnsType } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { data, type RecordType } from './_compare/tree-table-ellipsis.shared'

// ---------------------------------------------------------------------------
// 列定义 —— 两侧字段（title/dataIndex/key/width/ellipsis）逐字一致；
// `fixed` 由顶部 Switch 共享驱动（columns 在渲染时动态拼装 fixed）。
// ---------------------------------------------------------------------------

const dgColumnsBase: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    width: '30%',
    ellipsis: true,
  },
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
    width: '12%',
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address',
  },
]

const antdColumnsBase: TableColumnsType<RecordType> = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    width: '30%',
    ellipsis: true,
  },
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
    width: '12%',
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address',
  },
]

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function TreeTableEllipsisDemo() {
  // ★ 共享状态：同一个 fixed state 同时驱动两侧表格。
  // 默认 true（对齐 antd demo：首列默认固定，Switch 可切换）。
  const [fixed, setFixed] = useState(true)

  const dgColumns: ColumnType<RecordType>[] = dgColumnsBase.map((col) => ({
    ...col,
    fixed,
  }))
  const antdColumns: TableColumnsType<RecordType> = antdColumnsBase.map(
    (col) => ({ ...col, fixed }),
  )

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一个 fixed state 同时驱动两侧。 */}
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          background: '#fff',
        }}
      >
        <Space align="center">
          <span>Fixed first column:</span>
          <Switch checked={fixed} onChange={setFixed} />
        </Space>
      </div>

      {/*
        minPaneWidth=900（scroll.x 隐式宽表，Name name 超长撑开 + 固定列 + 选择列）→
        横排阈值 ≈ 900×2+16 = 1816px。常规笔记本视口（1440–1920）下竖排
        （每栏全宽，宽表内容更友好），仅超宽屏（≥2200）才横排。
      */}
      <SplitDemo
        minPaneWidth={900}
        left={
          <Table<RecordType>
            columns={dgColumns}
            rowSelection={{ columnWidth: 100 }}
            expandable={{ defaultExpandAllRows: true }}
            dataSource={data}
          />
        }
        right={
          <AntdTable<RecordType>
            columns={antdColumns}
            rowSelection={{ columnWidth: 100 }}
            expandable={{ defaultExpandAllRows: true }}
            dataSource={data}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B16 / S25 树形首列 ellipsis + fixed 组合，issue #36583）：</strong>
          左右并排呈现 data-grid 与 antd tree-table-ellipsis demo（树形 name 超长 +
          Name ellipsis+fixed(Switch) + defaultExpandAllRows + rowSelection）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>四机制正交</strong>（data-grid 引擎 BodyCell 组合验证）：
              ① <strong>fixed sticky</strong>（M2，Switch 切到 fixed 时 Name 列横向 sticky 定位）；
              ② <strong>ellipsis CSS 类</strong>（S20，Name 列 <code>dg-cell-ellipsis</code> + native title）；
              ③ <strong>树形内容前缀</strong>（S13，首列缩进 <code>level × indentSize</code> + 展开图标 ▶/▼）；
              ④ <strong>rowSelection</strong>（M5，前置哨兵列 columnWidth:100）。
              四者作用于不同层面（定位 / CSS 类 / 内容 / 列），不冲突。
            </li>
            <li>
              <strong>Fixed 开关（核心）</strong>：共享 state 同时驱动两侧——切换 Name 列 fixed
              true/false，横向滚动时观察两侧固定行为是否一致。
            </li>
            <li>
              <strong>checkStrictly 默认差异（§9 S13/S25）</strong>：本 demo 未传 checkStrictly
              （antd demo 也未传）→ 左 data-grid 默认 <strong>true</strong>（父子独立勾选）、
              右 antd 默认 <strong>false</strong>（父子联动）。如实保留对照，登记 §9 不修。
            </li>
            <li>
              <strong>§9 ellipsis 视觉 gap</strong>：data-grid auto 模式下 <code>width:'30%'</code>
              相对值 + grid 列宽策略可能使 ellipsis 列无 <code>...</code>；antd width+flex fill 稳定
              <code> ...</code>。登记 §9 不修，不阻塞组合验证。
            </li>
            <li>
              <strong>决策 2</strong>：树形展开行视为普通表格行，遵循行高约定（不动态测量）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
