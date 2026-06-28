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
 *   表体滚动 + 纵向悬浮滚动条）+ 父容器 height:394（CSS 自适应高度，实测换算：stickyHeader 54.8 +
 *   表体可见 275.2（= 5×55 + 余量，对齐 antd y:55*5=275，可显 6 行）= scroll 330，再加 scroll 外的
 *   分页条区 64（dg-pagination 32 + 上下间距 32）= wrapper 394）+ `pagination={{ pageSize: 50 }}`
 *   （对齐 antd 官方 demo 同款分页）。
 * - **右栏（antd Table）**：忠实复刻 antd 官方 fixed-header demo（同列结构 +
 *   `scroll={{ y:55*5 }}` + `pagination={{ pageSize:50 }}` + 100 行）。
 * - **共享控制条**：`Bordered` 开关同时驱动两侧表格。antd demo 原本无控制条，此处加最小开关便于对照。
 *   共享数据见 `_compare/fixed-header.shared.ts`。
 *
 * === 两侧保留并如实呈现的差异（对照修 bug 的意义所在）===
 *
 * 1. **scroll.y**：左栏 data-grid `scroll.y:true`（决策 7 CSS 自适应高度，父容器 height:394≈
 *    stickyHeader 54.8 + 表体可见 275.2（对齐 antd y:55*5=275，显 6 行）+ 分页条区 64，总可见高对齐
 *    antd 且行数一致）；右栏 antd 数字 `scroll.y:55*5`（忠实官方）。两侧表体均可纵向滚动、表头钉顶。
 *    ★ 分页条(.dg-pagination)是 .dg-wrapper.dg-data-area flex column 的末尾 flex item（在 .dg-scroll
 *    之外、wrapper 之内），占用 wrapper 垂直空间 → wrapper 需含分页条高，否则表体 flex:1 被挤、可见行
 *    少于右栏（回归实测：380 时左 5 行 / 右 6 行；394 后对齐 6=6）。
 * 2. **pagination**：两侧均 `pagination={{ pageSize: 50 }}`（每页 50 条）——已对齐（左栏补齐同款）。
 * 3. **createStyles 细滚动条**：antd 官方 demo 用 antd-style 自定义细滚动条；data-grid 项目未装
 *    antd-style（决策 6），左侧走 #35 悬浮滚动条（macOS 风格），右侧用浏览器默认。
 */

import { useState } from 'react'
import { Space, Switch, Table as AntdTable } from 'antd'
import type { TableColumnsType } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { dataSource, type DataType } from './_compare/fixed-header.shared'
// 全局虚拟化开关接入：本 demo 已自带限高 div(394) + scroll.y，开关 ON 时仅叠加 virtual
import { useVirtualization } from './VirtualizationContext'

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
  // 全局虚拟化开关接入：本 demo 已是 M8 数据区域模式（限高 div + scroll.y:true），
  // 开关 ON 时仅在两侧叠加 virtual=true，从 M8 切到 M4 虚拟。
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一个状态同时驱动两侧表格。
          DemoToolbar 用 useToken（light/dark/自定义 token 自适应），替代硬编码 #fff/#f0f0f0。 */}
      <DemoToolbar>
        <Space wrap>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=600 → 横排阈值 ≈ 600×2 + 16 = 1216px。纯 CSS flex-wrap 自适应（无 JS）。
        本 demo 是窄表（3 列、无 scroll.x），但表体有 300px 高 + 双向需要可读宽度；
        取中等阈值使常规笔记本视口（≥1280）横排，更窄屏（<1216）竖排。
      */}
      <SplitDemo
        minPaneWidth={600}
        left={
          // 左栏 data-grid：决策 7 父容器需有明确 height（394，实测换算见文件头）。scroll.y:true 数据
          // 区域模式，表体 flex:1 填满 wrapper 扣除表头与分页条后的剩余空间。
          // pagination={{ pageSize: 50 }}：对齐 antd 官方 demo 同款分页。
          // ★ 分页条(.dg-pagination)是 .dg-wrapper.dg-data-area flex column 末尾 flex item（在 .dg-scroll
          // 之外、wrapper 之内），占用 wrapper 垂直空间 → wrapper 必须把分页条区(64)算进去，否则表体
          // flex:1 被挤、可见行少于右栏（380 → 左 5 行/右 6 行；394 后对齐 6=6）。
          <div style={{ height: 394 }}>
            <Table<DataType>
              columns={dgColumns}
              dataSource={dataSource}
              bordered={bordered}
              scroll={{ y: true }}
              pagination={{ pageSize: 50 }}
              /* 全局虚拟化开关接入：本 demo 已自带限高 div(394) + scroll.y:true（M8 数据区域模式），
                 开关 ON 时叠加 virtual=true，从 M8 切到 M4 虚拟；OFF 时不传 virtual，行为与改造前
                 完全一致（scroll.y 原值保留，与开关无关）。 */
              virtual={virtual}
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
            /* 全局虚拟化开关接入：本 demo 已自带 scroll.y:55*5（M8 模式），开关 ON 时叠加 virtual=true
               切到 M4 虚拟；OFF 时不传 virtual，scroll.y 原值保留，行为与改造前一致。 */
            virtual={virtual}
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
              （决策 7 数据区域模式 + CSS 自适应高度，父容器 height:394 = stickyHeader 54.8 +
              表体可见 275.2（对齐 antd 275、显 6 行）+ 分页条区 64，表体 flex:1 填满 wrapper 扣除
              表头/分页条后的剩余空间）；右栏 antd 数字 <code>scroll.y:55*5</code>（忠实官方）。
            </li>
            <li>
              <strong>pagination</strong>：两侧均 <code>pagination={'{ pageSize:50 }'}</code>
              （每页 50 条，翻页看固定表头）。已对齐。
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
