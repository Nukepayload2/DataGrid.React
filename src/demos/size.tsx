/**
 * 复刻 antd `size` demo：`G:\Projects\ant-design\components\table\demo\size.tsx`。
 *
 * === S27 落地说明 ===
 *
 * antd v6 size demo 用两个 Table 演示 medium/small 两档行高 padding 差异（antd v6 用 Divider 分隔）。
 * data-grid 三档视觉尺寸（tokens.css `dg-size-*`，对齐 antd v6）：
 *   - large（默认）：16 / 16。
 *   - medium = middle（dg-size-middle）：12 / 8。
 *   - small（dg-size-small）：8 / 8。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（size prop 驱动 dg-size-* 类）。
 * - **右栏（antd Table）**：忠实复刻 antd size demo 的表格（同样的 size prop 驱动 antd 内置尺寸）。
 * - **共享控制条**：`Segmented` size（large/medium/small）同时驱动两侧——决策 9 要求「同一状态
 *   同时驱动两侧」，故将 antd demo 原本的「双表静态展示」改为「单表 + size 切换」，对照同一档
 *   size 下两侧行高/padding 差异更直观（双表结构在双栏下会变成 4 张表，对照反而不便）。
 * - **共享数据/列**：见 `_compare/size.shared.ts`。
 *
 * === 两侧保留的差异 ===
 *
 * - data-grid `medium` = antd `middle`（antd v6 规范值为 'middle'，data-grid 用 'medium' 别名
 *   等价 'middle'，视觉一致）。
 */

import { useState } from 'react'
import { Segmented, Space, Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { data, rawColumns, type RecordType } from './_compare/size.shared'

// 左栏 data-grid 列定义。
const dgColumns: ColumnType<RecordType>[] = rawColumns.map((c) => ({ ...c }))
// 右栏 antd 列定义。
const antdColumns: NonNullable<TableProps<RecordType>['columns']> = rawColumns.map((c) => ({ ...c }))

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

// 共享 size 类型：antd v6 TableProps['size'] = 'default' | 'middle' | 'small'，
// 但 antd demo 用 'medium'/'small'（antd v6 兼容 'medium'='middle'）。data-grid SizeType
// = 'large' | 'middle' | 'medium' | 'small' | 'compact'。两侧共享用字符串字面量，
// 'large'/'medium'/'small' 在两侧都被接受（antd v6 接受 'medium' 别名）。
type SharedSize = 'large' | 'medium' | 'small'

export default function SizeDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [size, setSize] = useState<SharedSize>('medium')

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
          <Segmented
            value={size}
            onChange={(val) => setSize(val as SharedSize)}
            options={[
              { label: 'large', value: 'large' },
              { label: 'medium', value: 'medium' },
              { label: 'small', value: 'small' },
            ]}
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
            size={size}
          />
        }
        right={
          <AntdTable<RecordType>
            columns={antdColumns}
            dataSource={data}
            size={size}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 T1）：</strong>左右并排呈现 data-grid 与 antd size demo，
          共享 Segmented 切换 size 档位。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>size 三档</strong>：large（默认 16/16）/ medium（12/8）/ small（8/8），
              两侧同步切换对照行高与 cell padding。
            </li>
            <li>
              <strong>medium 别名</strong>：data-grid 用 <code>medium</code>（= <code>middle</code>）；
              antd v6 也接受 <code>medium</code> 别名（= <code>middle</code>），视觉一致。
            </li>
            <li>
              <strong>与 antd demo 结构差异</strong>：antd 原本用 Divider 分隔的双表（medium + small
              静态展示）；决策 9 双栏下改为单表 + size 切换，对照同一档 size 两侧行为更直观。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
