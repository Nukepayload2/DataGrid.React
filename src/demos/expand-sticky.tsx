/**
 * 参考 antd `expand-sticky` demo（M9 展开列位置 + 合并×展开）：
 *   `G:\Projects\ant-design\components\table\demo\expand-sticky.tsx`
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（bordered + Team 列每 2 行合并
 *   onCell rowSpan:2/0 + `Table.EXPAND_COLUMN` 哨兵控位置 + expandable.expandedRowRender）。
 * - **右栏（antd Table）**：忠实复刻 antd expand-sticky demo（antd `<Table>` bordered +
 *   antd `Table.EXPAND_COLUMN` 哨兵 + antd expandable，含 antd demo 原样的
 *   `expandedRowOffset: 3`——该 prop v5.26+ 已废弃但 antd 本体仍接受，内部转为 EXPAND_COLUMN
 *   等效行为）。
 * - **共享状态 + 控制条**：`expandedRowKeys` 受控（同一份 state 同时驱动两侧）+
 *   顶部全宽按钮组「Expand All / Collapse All」一键展开/收起（同步驱动两侧）。
 * - **共享数据**：`RecordType` + `data`（4 行，Team A/B 各 2 行）见
 *   `_compare/expand-sticky.shared.ts`。
 *
 * === antd demo 要素 ===
 *
 * - `bordered`。
 * - 合并行：Team 列每 2 行合并（`onCell` rowSpan: 2 / 0）。
 * - `Table.EXPAND_COLUMN` 哨兵控制展开列位置（Team 之后）。
 * - `expandable.expandedRowOffset: 3`（antd **已废弃**，等效于把展开列放在第 3 列位置，
 *   antd 建议改用 `Table.EXPAND_COLUMN`）。
 * - `expandable.expandedRowRender(record)`：展开 description。
 *
 * === 简化说明 ===
 *
 * antd 的 `expandedRowOffset` 已废弃（v5.26+）：设置后会强制把前 N 列设为固定列 + 展开列偏移。
 * 官方建议改用 `Table.EXPAND_COLUMN` 通过列顺序控制位置。**左栏 data-grid 本就用 EXPAND_COLUMN
 * 哨兵控位置**（不复刻废弃 offset）；**右栏 antd 忠实复刻 antd demo 原样保留 `expandedRowOffset: 3`**
 * （antd 本体仍接受该 prop，内部转为 EXPAND_COLUMN 等效行为）。两侧展开列位置应一致
 * （Team 之后、Name 之前）。
 *
 * === 两侧保留的差异 ===
 *
 * - 哨兵来源：左栏 `Table.EXPAND_COLUMN` 来自 data-grid 引擎；右栏 antd 同名哨兵来自 antd 本体。
 * - 展开列位置控制：左栏纯靠 EXPAND_COLUMN 哨兵；右栏 antd demo 同时有哨兵 + 废弃 offset
 *   （offset 在 antd 本体内部等效哨兵，不产生额外视觉差异）。
 * - 展开过渡实现差异：左栏 data-grid grid track `0fr↔1fr`；右栏 antd 内置展开动画。
 *
 * === 验证点（M9 + 决策 9）===
 *
 * 1. 展开列位于 Team 列之后、Name 列之前（EXPAND_COLUMN 哨兵位置生效）——两侧一致。
 * 2. Team 列每 2 行合并（M3 合并 × M9 展开组合：合并 track 与展开 track 各自独立，互不干扰）。
 * 3. 展开内容跨整行（grid-column: 1 / -1），不受合并列影响。
 * 4. bordered + 展开视觉正确。
 * 5. 顶部「Expand All / Collapse All」一键展开/收起，同一份 expandedRowKeys 同时驱动两侧。
 */

import { useState } from 'react'
import { Button, Space, Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { Table } from '../table'
import type { ColumnOrSentinel, Expandable } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { data, type RecordType } from './_compare/expand-sticky.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）columns —— 哨兵控制位置（行为与改造前一致）
// ---------------------------------------------------------------------------

const dgColumns: ColumnOrSentinel<RecordType>[] = [
  {
    title: 'Team',
    dataIndex: 'team',
    key: 'team',
    width: 100,
    // 每 2 行合并：偶数行 rowSpan=2，奇数行 rowSpan=0（被覆盖）。
    onCell: (_record, index = 0) =>
      index % 2 === 0 ? { rowSpan: 2 } : { rowSpan: 0 },
  },
  // 展开列位置哨兵：放在 Team 之后。
  Table.EXPAND_COLUMN,
  { title: 'Name', dataIndex: 'name', key: 'name', width: 150 },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  { title: 'Address', dataIndex: 'address', key: 'address' },
  {
    title: 'Action',
    dataIndex: '',
    key: 'x',
    render: () => <a>Delete</a>,
  },
]

// ---------------------------------------------------------------------------
// 右栏（antd）columns —— 忠实复刻 antd expand-sticky demo
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'Team',
    dataIndex: 'team',
    key: 'team',
    onCell: (_record, index = 0) =>
      index % 2 === 0 ? { rowSpan: 2 } : { rowSpan: 0 },
    width: 100,
  },
  AntdTable.EXPAND_COLUMN,
  { title: 'Name', dataIndex: 'name', key: 'name', width: 150 },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  { title: 'Address', dataIndex: 'address', key: 'address' },
  {
    title: 'Action',
    dataIndex: '',
    key: 'x',
    render: () => <a>Delete</a>,
  },
]

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function ExpandStickyDemo() {
  // ★ 共享状态：同一份 expandedRowKeys 同时驱动两侧表格（受控）。
  const [expandedRowKeys, setExpandedRowKeys] = useState<Array<React.Key>>([])

  // 一键展开所有行（本 demo 无 rowExpandable，4 行均可展开）。
  const expandAll = () => setExpandedRowKeys(data.map((r) => r.key))
  // 一键收起所有行。
  const collapseAll = () => setExpandedRowKeys([])

  // 左栏 data-grid expandable：纯靠 EXPAND_COLUMN 哨兵控位置，不消费废弃 offset。
  const dgExpandable: Expandable<RecordType> = {
    expandedRowRender: (record) => <div>{record.description}</div>,
    expandedRowKeys,
    onExpandedRowsChange: (keys) => setExpandedRowKeys([...keys]),
  }

  // 右栏 antd expandable：忠实复刻 antd demo（含废弃 expandedRowOffset: 3）。
  const antdExpandable: NonNullable<TableProps<RecordType>['expandable']> = {
    expandedRowOffset: 3,
    expandedRowRender: (record) => <div>{record.description}</div>,
    expandedRowKeys,
    onExpandedRowsChange: (keys) => setExpandedRowKeys([...keys]),
  }

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一状态同时驱动两侧表格。 */}
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
          <Button onClick={expandAll}>Expand All</Button>
          <Button onClick={collapseAll}>Collapse All</Button>
          <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
            expandedRowKeys: [
            {expandedRowKeys.map((k) => `"${k}"`).join(', ')}]（同时驱动两侧）
          </span>
        </Space>
      </div>

      {/*
        minPaneWidth=480（窄表偏宽，6 列含展开哨兵 + bordered，无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <Table<RecordType>
            bordered
            columns={dgColumns}
            expandable={dgExpandable}
            dataSource={data}
            pagination={{}}
          />
        }
        right={
          <AntdTable<RecordType>
            bordered
            columns={antdColumns}
            expandable={antdExpandable}
            dataSource={data}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B10 / M9 展开列位置 + 合并×展开）：</strong>
          左右并排呈现 data-grid 与 antd expand-sticky demo（bordered + Team 列每 2 行合并
          + EXPAND_COLUMN 哨兵控制展开列位置）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>展开列位置</strong>：Team → <strong>展开列（EXPAND_COLUMN）</strong>
              → Name → Age → Address → Action。两侧一致。
            </li>
            <li>
              <strong>合并 × 展开</strong>：Team 列每 2 行合并（M3 onCell rowSpan:2/0）与
              M9 展开组合；展开内容跨整行（grid-column: 1 / -1），不受合并列影响。
            </li>
            <li>
              <strong>共享展开状态</strong>：顶部「Expand All / Collapse All」一键展开/收起，
              <strong>同一份 expandedRowKeys 同时驱动两侧</strong>（受控，切换一次、左右同步 diff）。
            </li>
            <li>
              <strong>expandedRowOffset 差异</strong>：左栏 data-grid 纯靠 EXPAND_COLUMN 哨兵控位置
              （不复刻废弃 offset）；右栏 antd 忠实复刻 antd demo 原样保留{' '}
              <code>expandedRowOffset: 3</code>（v5.26+ 已废弃，antd 本体内部等效哨兵，不产生额外视觉差异）。
            </li>
            <li>
              <strong>展开过渡差异</strong>：左栏 data-grid grid track <code>0fr↔1fr</code>；
              右栏 antd 内置展开动画。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
