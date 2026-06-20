/**
 * 复刻 antd `bordered` demo：`G:\Projects\ant-design\components\table\demo\bordered.tsx`。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（S26 实现：`bordered` 表格外边框 + 单元格
 *   竖线 + title/footer；固定列组合下边框完整——bordered 模式给 fixed-end 边界格补
 *   border-inline-start，避免 lun 「右 sticky 列缺左 border」缺陷）。
 * - **右栏（antd Table）**：忠实复刻 antd bordered demo（antd 原生 bordered + title/footer）。
 * - **共享控制条**：`Bordered` 开关（初值 true，对齐 antd demo）同时驱动两侧 + 示例 1/示例 2。
 * - **共享数据**：`RowType`/`FixedRow` + `data`/`fixedData` 见 `_compare/bordered.shared.ts`。
 *
 * === 两示例（照 antd demo 结构 + data-grid S26 对照扩展）===
 *
 * - **示例 1**（antd 官方 `bordered.tsx`）：3 列（Name render `<a>` / Cash Assets align right
 *   className 'column-money' / Address）+ title 'Header' + footer 'Footer'。
 * - **示例 2**（data-grid S26 新增对照）：bordered + fixed 组合——Full Name+Age 左固定、
 *   Column 1..5 中间、Action 右固定 + scroll.x。验证固定列在 bordered 模式下竖向边框完整。
 *
 * === 两侧保留并如实呈现的差异 ===
 *
 * - **示例 1 Cash Assets 列**：antd demo 用 `className: 'column-money'`（CSS 类金额高亮）+ `align:'right'`。
 *   - 左栏 data-grid：接口全兼容阶段已支持 `column.className`（透传到数据格 + 表头格），但 demo demo
 *     CSS 未定义 `.column-money` 样式 → 无视觉高亮（className 透传但无对应 CSS）。`align` 用 'end'
 *     （data-grid 逻辑属性，等价 antd 'right'）。
 *   - 右栏 antd：原生 `className` + `align:'right'`，金额列有 antd 内置 `.column-money` 样式高亮。
 *   - 如实保留：左栏金额列无高亮（CSS 缺），右栏有；对照价值（className 透传 vs CSS 消费）。
 * - **示例 2 固定列边框**：data-grid S26 主动补 border-inline-start 修正 lun 缺陷；antd 原生正确。
 *   两侧均应边框完整，对照验证 data-grid 修正生效。
 */

import { useState } from 'react'
import { Space, Switch, Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { data, fixedData, type FixedRow, type RowType } from './_compare/bordered.shared'

// ---------------------------------------------------------------------------
// 示例 1 列定义
// ---------------------------------------------------------------------------

// 左栏（data-grid）：align 用逻辑属性 'end'（等价 antd 'right'）。
const dgColumnsExample1: ColumnType<RowType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    render: (text) => <a>{text}</a>,
  },
  {
    title: 'Cash Assets',
    // 注：antd demo 此列带 className:'column-money'（CSS 类金额高亮）。
    // data-grid 支持 column.className 透传，但本 demo CSS 未定义 .column-money → 无视觉高亮（对照点）。
    className: 'column-money',
    dataIndex: 'money',
    // 注：antd demo 此处为 align:'right'；data-grid 用逻辑属性 'end'（等价 right，RTL 自动适配）。
    align: 'end',
  },
  {
    title: 'Address',
    dataIndex: 'address',
  },
]

// 右栏（antd）：忠实复刻 antd bordered demo（align:'right'，className:'column-money'）。
const antdColumnsExample1: NonNullable<TableProps<RowType>['columns']> = [
  {
    title: 'Name',
    dataIndex: 'name',
    render: (text) => <a>{text}</a>,
  },
  {
    title: 'Cash Assets',
    className: 'column-money',
    dataIndex: 'money',
    align: 'right',
  },
  {
    title: 'Address',
    dataIndex: 'address',
  },
]

// ---------------------------------------------------------------------------
// 示例 2 列定义（bordered + fixed 组合）
// ---------------------------------------------------------------------------

// 左栏（data-grid）：fixed 用逻辑属性 'start'/'end'（等价 antd 'left'/'right'）。
const dgColumnsExample2: ColumnType<FixedRow>[] = [
  {
    title: 'Full Name',
    dataIndex: 'name',
    width: 120,
    fixed: 'start',
  },
  { title: 'Age', dataIndex: 'age', width: 100, fixed: 'start' },
  { title: 'Column 1', dataIndex: 'address', key: '1' },
  { title: 'Column 2', dataIndex: 'address', key: '2' },
  { title: 'Column 3', dataIndex: 'address', key: '3' },
  { title: 'Column 4', dataIndex: 'address', key: '4' },
  { title: 'Column 5', dataIndex: 'address', key: '5' },
  {
    title: 'Action',
    key: 'operation',
    width: 100,
    fixed: 'end',
    render: () => <a>action</a>,
  },
]

// 右栏（antd）：fixed 用 'left'/'right'（antd 原生）。
const antdColumnsExample2: NonNullable<TableProps<FixedRow>['columns']> = [
  {
    title: 'Full Name',
    dataIndex: 'name',
    width: 120,
    fixed: 'left',
  },
  { title: 'Age', dataIndex: 'age', width: 100, fixed: 'left' },
  { title: 'Column 1', dataIndex: 'address', key: '1' },
  { title: 'Column 2', dataIndex: 'address', key: '2' },
  { title: 'Column 3', dataIndex: 'address', key: '3' },
  { title: 'Column 4', dataIndex: 'address', key: '4' },
  { title: 'Column 5', dataIndex: 'address', key: '5' },
  {
    title: 'Action',
    key: 'operation',
    width: 100,
    fixed: 'right',
    render: () => <a>action</a>,
  },
]

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function BorderedDemo() {
  // ★ 共享状态：同一个 bordered 同时驱动两侧 + 示例 1/示例 2（初值 true 对齐 antd demo）。
  const [bordered, setBordered] = useState(true)

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ★ 共享控制条：全宽，在最上方。同一个 bordered 状态同时驱动两侧 + 两示例。 */}
      <div
        style={{
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
            同时驱动下方两示例左右两栏
          </span>
        </Space>
      </div>

      {/* === 示例 1：bordered + title/footer（复刻 antd 官方 bordered demo）=== */}
      <div>
        <h3 style={{ margin: '0 0 12px' }}>
          示例 1：bordered + title/footer（antd 官方 bordered demo）
        </h3>
        {/*
          minPaneWidth=600（示例 1 窄表 3 列，但含 title/footer，略宽于 basic 480）→ 横排阈值 ≈ 1216。
          常规笔记本视口（≥1280）横排。
        */}
        <SplitDemo
          minPaneWidth={600}
          left={
            <Table<RowType>
              columns={dgColumnsExample1}
              dataSource={data}
              bordered={bordered}
              title={() => 'Header'}
              footer={() => 'Footer'}
            />
          }
          right={
            <AntdTable<RowType>
              columns={antdColumnsExample1}
              dataSource={data}
              bordered={bordered}
              title={() => 'Header'}
              footer={() => 'Footer'}
            />
          }
        >
          <div>
            <strong>对照说明（示例 1，决策 9 T1）：</strong>bordered + title/footer。
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              <li>
                <strong>bordered</strong>：表格外边框 + 单元格竖线 + 表头 ::before 抑制（避免双线）。
                两侧均应边框完整。
              </li>
              <li>
                <strong>title/footer</strong>：上方 dg-title（bordered 加底边框）+ 下方 dg-footer
                （bordered 加顶边框）。两侧均应渲染 'Header' / 'Footer'。
              </li>
              <li>
                <strong>Cash Assets 列差异</strong>：antd demo <code>className:'column-money'</code>
                + <code>align:'right'</code>。右栏 antd 金额列有内置 .column-money 样式高亮；
                左栏 data-grid 已透传 className（接口全兼容阶段支持）但本 demo CSS 未定义该类
                → <strong>无视觉高亮</strong>（对照点：className 透传 vs CSS 消费）。align 两栏等价
                （data-grid 'end' = antd 'right'）。
              </li>
            </ul>
          </div>
        </SplitDemo>
      </div>

      {/* === 示例 2：bordered + fixed 组合（data-grid S26 对照）=== */}
      <div>
        <h3 style={{ margin: '0 0 12px' }}>
          示例 2：bordered + fixed 组合（验证固定列边框完整）
        </h3>
        {/*
          minPaneWidth=600（示例 2 含 fixed + scroll.x:max-content，8 列横向滚动，略宽于 480）→
          横排阈值 ≈ 1216。常规笔记本视口（≥1280）横排；窄视口竖排。
        */}
        <SplitDemo
          minPaneWidth={600}
          left={
            <Table<FixedRow>
              columns={dgColumnsExample2}
              dataSource={fixedData}
              bordered={bordered}
              scroll={{ x: 'max-content' }}
            />
          }
          right={
            <AntdTable<FixedRow>
              columns={antdColumnsExample2}
              dataSource={fixedData}
              bordered={bordered}
              scroll={{ x: 'max-content' }}
            />
          }
        >
          <div>
            <strong>对照说明（示例 2，决策 9 T1）：</strong>bordered + fixed 组合。
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              <li>
                <strong>固定列边框</strong>：Full Name+Age 左固定、Action 右固定，bordered 模式下
                竖向边框完整。左栏 data-grid S26 主动补 <code>border-inline-start</code> 给 fixed-end
                边界格（修正 lun 「右 sticky 列缺左 border」缺陷）；右栏 antd 原生正确。两侧均应完整。
              </li>
              <li>
                <strong>fixed 取值差异</strong>：data-grid 用逻辑属性 <code>'start'/'end'</code>
                （等价 antd <code>'left'/'right'</code>，RTL 自动适配）。
              </li>
              <li>
                <strong>横向滚动</strong>：<code>scroll: {'{ x: "max-content" }'}</code>，两侧均可横滚，
                固定列 sticky。横滚到尽头边界完整（对照 §9 narrow gap：task #38 暴露的右固定列脱离
                容器问题——本示例列宽不同可能不触发，登记观察）。
              </li>
            </ul>
          </div>
        </SplitDemo>
      </div>
    </div>
  )
}
