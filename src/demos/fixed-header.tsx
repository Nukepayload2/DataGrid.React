/**
 * 复刻 antd `fixed-header` demo：
 *   `G:\Projects\ant-design\components\table\demo\fixed-header.tsx`
 *
 * antd 原版：3 列（Name/Age/Address）× 100 行，`scroll={{ y: 55 * 5 }}` 表头固定、表体纵向滚动，
 * `pagination={{ pageSize: 50 }}`。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：3 列 + `scroll={{ y: true }}`（决策 7 数据区域模式，表头固定 +
 *   表体滚动 + 纵向悬浮滚动条）+ 父容器 height:300（CSS 自适应高度）。
 * - **右栏（antd Table）**：忠实复刻 antd 官方 fixed-header demo（同列结构 +
 *   `scroll={{ y:55*5 }}` + `pagination={{ pageSize:50 }}` + 100 行）。
 * - **共享控制条**：`Bordered` 开关同时驱动两侧表格。antd demo 原本无控制条，此处加最小开关便于对照。
 *   共享数据见 `_compare/fixed-header.shared.ts`。
 *
 * === 两侧保留并如实呈现的差异（对照修 bug 的意义所在）===
 *
 * 1. **scroll.y**：左栏 data-grid `scroll.y:true`（决策 7 CSS 自适应高度，父容器 height:300）；
 *    右栏 antd 数字 `scroll.y:55*5`（忠实官方）。两侧表体均可纵向滚动、表头钉顶。
 * 2. **pagination**：右栏 antd 官方 demo 含 `pagination={{ pageSize: 50 }}`（每页 50 条）；
 *    左栏 data-grid 默认不分页（全显 100 行）——如实保留作为对照点（S11 已知简化，data-grid
 *    默认不分页 vs antd 默认分页，登记 §9）。
 * 3. **createStyles 细滚动条**：antd 官方 demo 用 antd-style 自定义细滚动条；data-grid 项目未装
 *    antd-style（决策 6），左侧走 #35 悬浮滚动条（macOS 风格），右侧用浏览器默认。
 */

import { useState } from 'react'
import { Space, Switch, Table as AntdTable } from 'antd'
import type { TableColumnsType } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { dataSource, type DataType } from './_compare/fixed-header.shared'

// ---------------------------------------------------------------------------
// 列定义 —— 两侧字段（title/dataIndex/width）逐字一致
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<DataType>[] = [
  { title: 'Name', dataIndex: 'name', width: 150 },
  { title: 'Age', dataIndex: 'age', width: 150 },
  { title: 'Address', dataIndex: 'address' },
]

const antdColumns: TableColumnsType<DataType> = [
  { title: 'Name', dataIndex: 'name', width: 150 },
  { title: 'Age', dataIndex: 'age', width: 150 },
  { title: 'Address', dataIndex: 'address' },
]

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function FixedHeaderDemo() {
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
        <Space wrap>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
        </Space>
      </div>

      {/*
        minPaneWidth=600 → 横排阈值 ≈ 600×2 + 16 = 1216px。纯 CSS flex-wrap 自适应（无 JS）。
        本 demo 是窄表（3 列、无 scroll.x），但表体有 300px 高 + 双向需要可读宽度；
        取中等阈值使常规笔记本视口（≥1280）横排，更窄屏（<1216）竖排。
      */}
      <SplitDemo
        minPaneWidth={600}
        left={
          // 左栏 data-grid：决策 7 父容器需有明确 height（300px，约等价 antd y:55*5=275）。
          // scroll.y:true 数据区域模式，表体 flex:1 填满容器剩余空间（表头之外）。
          <div style={{ height: 300 }}>
            <Table<DataType>
              columns={dgColumns}
              dataSource={dataSource}
              bordered={bordered}
              scroll={{ y: true }}
            />
          </div>
        }
        right={
          // antd 官方 fixed-header demo 忠实复刻：
          // 3 列 + scroll y 55*5 + pagination pageSize 50 + 100 行。
          <AntdTable<DataType>
            columns={antdColumns}
            dataSource={dataSource}
            bordered={bordered}
            pagination={{ pageSize: 50 }}
            scroll={{ y: 55 * 5 }}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B13，固定表头 M8）：</strong>
          本 demo 左右并排呈现 data-grid 与 antd fixed-header，方便对照修 bug。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>固定表头</strong>：3 列（Name/Age/Address）× 100 行，表头纵向固定
              （<code>position:sticky; top:0</code>），表体纵向滚动时表头钉顶。两侧结构一致。
            </li>
            <li>
              <strong>scroll.y 差异</strong>：左栏 data-grid <code>scroll.y:true</code>
              （决策 7 数据区域模式 + CSS 自适应高度，父容器 height:300，表体 flex:1 填满容器）；
              右栏 antd 数字 <code>scroll.y:55*5</code>（忠实官方）。
            </li>
            <li>
              <strong>pagination 差异</strong>：右栏 antd 显式 <code>pagination={'{ pageSize:50 }'}</code>
              （每页 50 条，翻页看固定表头）；左栏 data-grid 默认不分页（全显 100 行，S11 已知简化，
              §9 登记：data-grid 默认不分页 vs antd 默认分页）。
            </li>
            <li>
              <strong>createStyles 滚动条差异</strong>：antd 官方 demo 用 antd-style 自定义细滚动条；
              data-grid 项目未装 antd-style，左侧走 #35 悬浮滚动条（macOS 风格），右侧用浏览器默认。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
