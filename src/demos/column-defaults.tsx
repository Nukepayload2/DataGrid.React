/**
 * 复刻 antd `column-defaults` demo：
 *   `G:\Projects\ant-design\components\table\demo\column-defaults.tsx`。
 *
 * === S32 列默认值 column（自研任务）===
 *
 * antd 允许在 Table 级传 `column={{...}}` 设置**所有列的默认属性**，单列可通过自身同名字段覆盖。
 *
 * data-grid 对齐实现（S32）：
 *   - `TableProps.column?: Partial<ColumnType<RecordType>>`。
 *   - 适配层 `applyColumnDefaults`：把 `column` 默认**浅合并**到每个列——**列自身优先**；
 *     哨兵（EXPAND_COLUMN/SELECTION_COLUMN）豁免；多级表头逐层递归合并。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（`column={{ align: 'center', ellipsis }}` +
 *   Address `align: 'start'`，data-grid Align 类型用 'start'/'center'/'end'）。
 * - **右栏（antd Table）**：忠实复刻 antd column-defaults demo（Address `align: 'left'`，
 *   antd 原生 'left'/'center'/'right'）。
 * - **共享控制条**：`Ellipsis` 开关切换 Table 级 column.ellipsis（两侧同步），对照省略号视觉差异。
 * - **共享数据**：`RecordType` + `data` 见 `_compare/column-defaults.shared.ts`。
 *
 * === 两侧保留的差异 ===
 *
 * - **Align 字面量**：左栏 data-grid 用 'start'/'center'/'end'（对齐 CSS logical）；右栏 antd
 *   用 'left'/'center'/'right'（antd v6 物理方向）。
 * - **视觉省略号 gap（§9）**：data-grid grid 列宽 `max-content`，ellipsis 列 track=content 宽 →
 *   cell-inner 不溢出 → 视觉无 `...`；antd 用 `table-layout:fixed` + `width:100%`，ellipsis 列
 *   视觉省略号生效。两侧差异对照（API 与合并逻辑正确，缺列宽约束）。
 */

import { useState } from 'react'
import { Space, Switch, Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import type { ColumnType } from '../table'
import { Table } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { data, type RecordType } from './_compare/column-defaults.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— Address 用 'start'（data-grid Align 类型）
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    width: 140,
  },
  {
    title: 'Description',
    dataIndex: 'description',
    width: 180,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    // data-grid Align 类型用 'start'/'center'/'end'（'start' 等价 antd 'left'）。
    align: 'start',
    width: 220,
  },
]

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实 antd demo，Address 用 'left'
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'Name',
    dataIndex: 'name',
    width: 140,
  },
  {
    title: 'Description',
    dataIndex: 'description',
    width: 180,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    align: 'left',
    width: 220,
  },
]

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function ColumnDefaultsDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [ellipsis, setEllipsis] = useState(true)

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
        <Space>
          <Switch
            checked={ellipsis}
            onChange={setEllipsis}
            checkedChildren="Ellipsis"
            unCheckedChildren="Ellipsis"
          />
        </Space>
      </div>

      {/*
        minPaneWidth=480（窄表，3 列，无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <Table<RecordType>
            columns={dgColumns}
            dataSource={data}
            column={{ align: 'center', ellipsis }}
            pagination={false}
          />
        }
        right={
          <AntdTable<RecordType>
            columns={antdColumns}
            dataSource={data}
            column={{ align: 'center', ellipsis }}
            pagination={false}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 T1）：</strong>左右并排呈现 data-grid 与 antd column-defaults demo。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>Table 级 column 默认</strong>：两侧均传 <code>column</code> prop 设
              <code> align: center</code> 与 <code>ellipsis: true</code>——Name/Description 继承 center；
              Address 单列覆盖。
            </li>
            <li>
              <strong>Align 字面量</strong>：左栏 data-grid Address 用 <code>align:'start'</code>；
              右栏 antd 用 <code>align:'left'</code>（两侧语义等价，类型系统不同）。
            </li>
            <li>
              <strong>Ellipsis 视觉 gap（§9）</strong>：左栏 data-grid 列宽 max-content → 视觉无
              <code>...</code>；右栏 antd <code>table-layout:fixed</code> → 省略号生效。关掉
              Ellipsis 开关两侧均无省略号（对照基线）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
