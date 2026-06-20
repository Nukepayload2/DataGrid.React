/**
 * 复刻 antd `colspan-rowspan` demo：
 *   `G:\Projects\ant-design\components\table\demo\colspan-rowspan.tsx`
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：表头列合并（column.colSpan）+ 单元格行/列合并
 *   （onCell 返回 {rowSpan, colSpan}，含 =0 不渲染）。行为与改造前一致（M3 已实现合并：
 *   columnTree.applyHeaderColSpan 表头合并、cellMerge.computeCellMergePlan 单元格合并）。
 * - **右栏（antd Table）**：忠实复刻 antd 官方 colspan-rowspan demo（同列定义、同 onCell、
 *   同 5 行数据、bordered）。
 * - **共享控制条**：`Bordered`（初值 true）同时驱动两侧。
 * - **共享数据**：`DataType` + `data` + `sharedOnCell` 见 `_compare/colspan-rowspan.shared.ts`。
 *
 * === antd demo 行为拆解（5 行 × 6 列，两侧同）===
 *
 * 列定义（前序）：
 *   1. RowHead (key)       rowScope='row'        —— 行标题列（视觉加粗）。
 *   2. Name (name)         onCell: index===1 → colSpan:5   —— 第 2 行 Name 向右合并 5 列。
 *   3. Age (age)           onCell: sharedOnCell (index===1 → colSpan:0) —— 第 2 行被覆盖。
 *   4. Home phone (tel)    表头 colSpan:2 + onCell:
 *                          - index===3 → rowSpan:2（第 4 行向下合并 2 行）
 *                          - index===4 → rowSpan:0（被覆盖）
 *                          - index===1 → colSpan:0（被 Name 的 colSpan:5 覆盖）
 *   5. Phone (phone)       表头 colSpan:0（被 Home phone 的 colSpan:2 覆盖，不渲染表头格）
 *                          onCell: sharedOnCell (index===1 → colSpan:0)
 *   6. Address (address)   onCell: sharedOnCell (index===1 → colSpan:0)
 *
 * 预期渲染结果（与 antd 一致，两侧应同）：
 *   - 表头：5 个可见格（RowHead | Name | Home phone 跨 2 列 | Address）。Phone 表头被 Home phone 覆盖。
 *   - 第 1 行：正常 6 格。
 *   - 第 2 行（index===1）：Name 跨 5 列（覆盖 Age/Home phone/Phone/Address），共 2 格（RowHead + Name）。
 *   - 第 3 行：正常 6 格。
 *   - 第 4 行（index===3）：Home phone 向下合并 2 行（覆盖第 5 行同列）。共 6 格。
 *   - 第 5 行（index===4）：Home phone 被覆盖（rowSpan:0），共 5 格。
 *
 * === M3 实现说明 ===
 *
 * - 表头合并（column.colSpan）：引擎 columnTree.applyHeaderColSpan 把 colSpan>=2 的叶子表头格
 *   gridColumnEnd 扩展，后续 colSpan-1 个叶子表头格标 covered=true（不渲染 DOM）。
 * - 单元格合并（column.onCell）：cellMerge.computeCellMergePlan 对每格算 hidden + colSpan/rowSpan；
 *   hidden 格不渲染 DOM；左上角格设 grid-column/grid-row 的 span。
 * - rowScope='row'：视觉加粗（.dg-cell-rowscope），与 antd 一致。
 * - bordered：保留（与 antd demo 一致，便于看清合并边界）。
 */

import { useState } from 'react'
import { Space, Switch, Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { data, sharedOnCell, type DataType } from './_compare/colspan-rowspan.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<DataType>[] = [
  {
    title: 'RowHead',
    dataIndex: 'key',
    rowScope: 'row',
  },
  {
    title: 'Name',
    dataIndex: 'name',
    render: (text) => <a>{text}</a>,
    onCell: (_record, index) => ({
      colSpan: index === 1 ? 5 : 1,
    }),
  },
  {
    title: 'Age',
    dataIndex: 'age',
    onCell: sharedOnCell,
  },
  {
    title: 'Home phone',
    colSpan: 2,
    dataIndex: 'tel',
    onCell: (_record, index) => {
      if (index === 3) {
        return { rowSpan: 2 }
      }
      // These two are merged into above cell
      if (index === 4) {
        return { rowSpan: 0 }
      }
      if (index === 1) {
        return { colSpan: 0 }
      }

      return {}
    },
  },
  {
    title: 'Phone',
    colSpan: 0,
    dataIndex: 'phone',
    onCell: sharedOnCell,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    onCell: sharedOnCell,
  },
]

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd 官方 colspan-rowspan demo
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<DataType>['columns']> = [
  {
    title: 'RowHead',
    dataIndex: 'key',
    rowScope: 'row',
  },
  {
    title: 'Name',
    dataIndex: 'name',
    render: (text) => <a>{text}</a>,
    onCell: (_, index) => ({
      colSpan: index === 1 ? 5 : 1,
    }),
  },
  {
    title: 'Age',
    dataIndex: 'age',
    onCell: sharedOnCell,
  },
  {
    title: 'Home phone',
    colSpan: 2,
    dataIndex: 'tel',
    onCell: (_, index) => {
      if (index === 3) {
        return { rowSpan: 2 }
      }
      // These two are merged into above cell
      if (index === 4) {
        return { rowSpan: 0 }
      }
      if (index === 1) {
        return { colSpan: 0 }
      }

      return {}
    },
  },
  {
    title: 'Phone',
    colSpan: 0,
    dataIndex: 'phone',
    onCell: sharedOnCell,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    onCell: sharedOnCell,
  },
]

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function ColspanRowspanDemo() {
  // ★ 共享状态：同一个 bordered 同时驱动两侧（初值 true 对齐 antd demo）。
  const [bordered, setBordered] = useState(true)

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一个 bordered 状态同时驱动两侧。 */}
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
          <span style={{ color: 'rgba(0,0,0,0.65)', fontSize: 12 }}>
            同时驱动左右两栏
          </span>
        </Space>
      </div>

      {/*
        minPaneWidth=480（窄表 6 列、无 scroll.x）→ 横排阈值 ≈ 480×2 + 16 = 976。
        常规笔记本视口（≥1024）横排；窄视口竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <Table<DataType> columns={dgColumns} dataSource={data} bordered={bordered} />
        }
        right={
          <AntdTable<DataType>
            columns={antdColumns}
            dataSource={data}
            bordered={bordered}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B11，合并单元格）：</strong>本 demo 左右并排呈现 data-grid 与 antd
          colspan-rowspan，方便对照修 bug。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>表头列合并</strong>：Home phone 列 <code>colSpan:2</code> 跨 2 列 + Phone 列
              <code>colSpan:0</code> 被覆盖不渲染表头格。data-grid columnTree.applyHeaderColSpan 扩展
              gridColumnEnd + 后续标 covered；antd 原生。两侧表头均为 5 可见格。
            </li>
            <li>
              <strong>单元格列合并</strong>：第 2 行（index===1）Name <code>colSpan:5</code> 向右合并 5 列
              （覆盖 Age/Home phone/Phone/Address）；Age/Phone/Address 列 onCell sharedOnCell 返回
              <code>colSpan:0</code> 被覆盖。Home phone 列 index===1 同样 colSpan:0。
            </li>
            <li>
              <strong>单元格行合并</strong>：第 4 行（index===3）Home phone <code>rowSpan:2</code> 向下合并
              2 行；第 5 行（index===4）Home phone <code>rowSpan:0</code> 被覆盖不渲染。data-grid
              cellMerge.computeCellMergePlan 算 hidden + span；antd 原生。两侧合并区应一致。
            </li>
            <li>
              <strong>rowScope='row'</strong>：RowHead 列行标题视觉加粗（.dg-cell-rowscope），两侧一致。
            </li>
            <li>
              <strong>渲染格数对照</strong>：表头 5 格 + 第 1/3 行各 6 格 + 第 2 行 2 格（RowHead + Name 跨 5）
              + 第 4 行 6 格 + 第 5 行 5 格（Home phone 被 rowSpan:0 覆盖）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
