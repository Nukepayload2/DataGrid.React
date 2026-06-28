/**
 * 复刻 antd `order-column` demo（M9 + M5 + S10）：
 *   `G:\Projects\ant-design\components\table\demo\order-column.tsx`
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（columns 用 `Table.EXPAND_COLUMN` +
 *   `Table.SELECTION_COLUMN` 哨兵控制展开/选择列位置：Name → 展开 → Age → 选择 → Address；
 *   rowSelection + expandable.expandedRowRender）。
 * - **右栏（antd Table）**：忠实复刻 antd order-column demo（antd `<Table>` + antd
 *   `Table.EXPAND_COLUMN` / `Table.SELECTION_COLUMN` 哨兵 + antd rowSelection + expandable）。
 * - **共享数据**：`RecordType` + `data`（4 行，第 3 行 "Not Expandable" 仅文字）见
 *   `_compare/order-column.shared.ts`。
 * - **无独立控制条**：本 demo antd 原始结构无控制条（哨兵位置由 columns 数组静态决定），
 *   无需共享控件；两栏直接静态呈现。
 *
 * === antd demo 要素 ===
 *
 * - columns 数组中通过 `Table.EXPAND_COLUMN` 和 `Table.SELECTION_COLUMN` 哨兵
 *   控制展开列 / 选择列的位置（不一定首列）。
 * - antd demo 的列顺序：Name → EXPAND_COLUMN → Age → SELECTION_COLUMN → Address。
 * - 同时配 `rowSelection={{}}`（默认 checkbox）和 `expandable.expandedRowRender`。
 *
 * === 两侧保留的差异 ===
 *
 * - 基本逐字复刻（columns 顺序 / rowSelection / expandable 一致）。
 * - 哨兵类型差异：左栏 `Table.EXPAND_COLUMN/SELECTION_COLUMN` 来自 data-grid 引擎
 *   （`types.ts` 同款哨兵对象），右栏 antd `Table.EXPAND_COLUMN/SELECTION_COLUMN` 来自
 *   antd 本体。两侧 columns 数组结构等价。
 * - 左栏额外页面下方展示 selectedKeys（便于无 console 环境验证）；antd demo 无。
 * - 左栏 rowSelection 用受控 selectedRowKeys（便于页面下方显示），右栏 antd 用 `rowSelection={{}}`
 *   非受控（与 antd demo 逐字一致）。此差异不影响哨兵位置验证（核心目标）。
 *
 * === 验证点（M9 + M5 + S10 + 决策 9）===
 *
 * 1. 两侧展开列均位于 Name 与 Age 之间（EXPAND_COLUMN 哨兵位置生效）。
 * 2. 两侧选择列均位于 Age 与 Address 之间（SELECTION_COLUMN 哨兵位置生效）。
 * 3. 两侧勾选 / 展开独立工作（M5 × M9 组合，互不干扰）。
 * 4. 选择列：checkbox 全选/半选/单选；展开列：展开/收起 0fr↔1fr 过渡。
 * 5. antd demo 未设 rowExpandable，4 行均可展开（"Not Expandable" 仅文字）——两侧忠实。
 */

import { useState } from 'react'
import { Table as AntdTable, theme } from 'antd'
import type { TableProps } from 'antd'
import { Table } from '../table'
import type { ColumnOrSentinel, Expandable, TableRowSelection } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { data, type RecordType } from './_compare/order-column.shared'
// 虚拟化开关（决策 7）：顶栏 Switch 全局驱动两侧 Table 的 virtual + scroll.y。
import { useVirtualization } from './VirtualizationContext'

// ---------------------------------------------------------------------------
// 左栏（data-grid）columns —— 哨兵控制位置（行为与改造前一致）
// ---------------------------------------------------------------------------

const dgColumns: ColumnOrSentinel<RecordType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  // 展开列哨兵：放在 Name 之后。
  Table.EXPAND_COLUMN,
  { title: 'Age', dataIndex: 'age', key: 'age' },
  // 选择列哨兵：放在 Age 之后。
  Table.SELECTION_COLUMN,
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

// ---------------------------------------------------------------------------
// 右栏（antd）columns —— 忠实复刻 antd order-column demo
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  AntdTable.EXPAND_COLUMN,
  { title: 'Age', dataIndex: 'age', key: 'age' },
  AntdTable.SELECTION_COLUMN,
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

// expandable 两侧同款（expandedRowRender 渲染 description 段落）。
const expandable: Expandable<RecordType> = {
  expandedRowRender: (record) => <p style={{ margin: 0 }}>{record.description}</p>,
}

const antdExpandable: NonNullable<TableProps<RecordType>['expandable']> = {
  expandedRowRender: (record) => <p style={{ margin: 0 }}>{record.description}</p>,
}

export default function OrderColumnDemo() {
  // 左栏 rowSelection 受控（便于页面下方显示 selectedKeys，对照验证选择功能）。
  const [selectedKeys, setSelectedKeys] = useState<Array<React.Key>>([])
  // 虚拟化开关（决策 7）：顶栏 Switch ON 时两侧 Table 接入 virtual + scroll.y。
  const { virtual } = useVirtualization()
  // 主题 token：选中态可视化区文字色 token 化（colorTextSecondary≈rgba(0,0,0,0.65)、
  // colorTextTertiary≈rgba(0,0,0,0.45)），暗主题自适应。
  const { token } = theme.useToken()

  const dgRowSelection: TableRowSelection<RecordType> = {
    selectedRowKeys: selectedKeys,
    onChange: (keys) => setSelectedKeys(keys),
  }

  // 右栏 antd rowSelection 与 antd demo 逐字一致（{} 非受控默认 checkbox）。
  const antdRowSelection: TableProps<RecordType>['rowSelection'] = {}

  return (
    <div style={{ padding: 24 }}>
      {/*
        minPaneWidth=480（5 列含展开/选择哨兵，无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <Table<RecordType>
            columns={dgColumns}
            rowSelection={dgRowSelection}
            expandable={expandable}
            dataSource={data}
            pagination={{}}
            virtual={virtual}
            scroll={virtual ? { y: true } : undefined}
          />
        }
        right={
          <AntdTable<RecordType>
            columns={antdColumns}
            rowSelection={antdRowSelection}
            expandable={antdExpandable}
            dataSource={data}
            virtual={virtual}
            scroll={virtual ? { y: 300 } : undefined}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B9 / S10 列顺序）：</strong>
          左右并排呈现 data-grid 与 antd order-column demo（EXPAND_COLUMN + SELECTION_COLUMN
          哨兵控制展开/选择列位置）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>列顺序</strong>：Name → <strong>展开列（EXPAND_COLUMN）</strong> → Age →
              <strong> 选择列（SELECTION_COLUMN）</strong> → Address。两侧一致。
            </li>
            <li>
              <strong>哨兵来源差异</strong>：左栏 <code>Table.EXPAND_COLUMN/SELECTION_COLUMN</code>
              来自 data-grid 引擎；右栏 antd 同名哨兵来自 antd 本体。结构等价。
            </li>
            <li>
              <strong>M9 × M5 组合</strong>：勾选 / 展开独立工作，互不干扰；4 行均可展开
              （antd demo 未设 rowExpandable，"Not Expandable" 仅文字）。
            </li>
            <li>
              <strong>rowSelection 受控差异</strong>：左栏受控（便于页面下方显示 selectedKeys）；
              右栏 antd <code>{'{'}{'}'}</code> 非受控（与 antd demo 逐字一致）。不影响哨兵位置验证。
            </li>
          </ul>
        </div>
      </SplitDemo>

      {/* 左栏选中态可视化（便于无 console 环境验证选择功能）。 */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: token.colorFillQuaternary,
          borderRadius: 8,
          color: token.colorTextSecondary,
          fontSize: 12,
        }}
      >
        <strong>左栏 data-grid selectedKeys:</strong>{' '}
        {selectedKeys.length === 0 ? (
          <span style={{ color: token.colorTextTertiary }}>(none)</span>
        ) : (
          <code>[{selectedKeys.map((k) => `"${k}"`).join(', ')}]</code>
        )}
        <div style={{ marginTop: 4 }}>
          列顺序：Name → <strong>展开列（EXPAND_COLUMN）</strong> → Age →
          <strong> 选择列（SELECTION_COLUMN）</strong> → Address。
        </div>
      </div>
    </div>
  )
}
