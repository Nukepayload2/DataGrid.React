/**
 * 复刻 antd `sticky` demo：
 *   `G:\Projects\ant-design\components\table\demo\sticky.tsx`
 *
 * antd 原版要素：
 *   - 100 行（Edward 0..99，age 32，address London Park no. i）。
 *   - 11 列：Full Name（fixed start, 100）/ Age（fixed start, 100）/ Column 1..8（address，150/.../auto）/
 *     Action（fixed end, 100，render `<a>action</a>`）。
 *   - `scroll={{ x: 1500 }}` 横向滚动。
 *   - `summary`：单行，Switch 切换 fixed top/bottom + "Scroll Context" + "Fix Right"。
 *   - `sticky={{ offsetHeader: 64 }}`：表头跟随**页面**滚动固定（offsetHeader:64 模拟站点 header 高度）。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：S34 页面级粘性表头（`sticky={{ offsetHeader: 64 }}`，表头
 *   `position:sticky; top:64px` 相对 viewport 固定）+ `scroll={{ x: 1500 }}`（grid min-width:1500
 *   撑宽页面，页面横向滚动 + 底部 StickyScrollBar 同步）+ fixed 列 + summary fixed（Switch on/off）。
 * - **右栏（antd Table）**：忠实复刻 antd 官方 sticky demo（同列结构 + summary fixed top/bottom
 *   Switch + `sticky={{ offsetHeader: 64 }}` + 100 行）。
 * - **共享控制条**：`Summary Fixed` 开关（同一状态）同时驱动两侧 summary 的 fixed 行为（左侧
 *   on/off，右侧 top/bottom，功能等价）。共享数据见 `_compare/sticky.shared.ts`。
 *
 * === S34 页面级 vs M8 容器内（data-grid 简化）===
 *
 * - **S34 页面级粘性表头**：`sticky={{ offsetHeader: 64 }}` 表头跟随**页面**滚动固定（相对
 *   viewport，top:64px）。区别 M8（`scroll.y` 容器内固定）：M8 表体在容器内滚动、表头钉在容器顶部；
 *   S34 表格不在容器内滚动，**页面本身滚动**、表头钉在视口顶部。
 * - 实现关键：sticky 启用时 `.dg-wrapper.dg-sticky` overflow:visible（放开 sticky 上下文），
 *   grid 直接渲染 + min-width: scrollX 撑宽页面；表头 grid item 相对 viewport 固定（无 overflow 祖先）。
 * - **S34 与 M8 互斥**：data-grid 简化路径（S34 不消费横向悬浮条，走页面级 StickyScrollBar 原设计）。
 *
 * === 两侧保留并如实呈现的差异（对照修 bug 的意义所在）===
 *
 * 1. **summary fixed 类型差异**：右栏 antd 用 `fixed: fixedTop ? 'top' : 'bottom'`（顶/底切换）；
 *    左栏 data-grid S22 summary 的 `fixed` 简化为 boolean（仅 sticky bottom，不支持 'top'），
 *    Switch 切换 on/off。功能等价：summary fixed 在 grid 内，与页面级表头共存。
 * 2. **页面级 sticky 实现路径**：data-grid S34 走页面级 StickyScrollBar（不消费横向悬浮条，
 *    原设计）；antd rc-table 的 sticky 实现路径不同但视觉对齐（表头跟随页面滚动固定 + offsetHeader:64）。
 *
 * === 外壳说明 ===
 *
 * 为验证"页面滚动时表头固定"，demo 需足够内容使页面可滚动。两侧表格均渲染 100 行撑长页面；
 * SplitDemo 外再加顶部/底部说明区，确保即使表格在视口中间，滚动也能验证表头固定到 offsetHeader 位置。
 */

import { useState } from 'react'
import { Space, Switch, Table as AntdTable } from 'antd'
import type { TableColumnsType } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { dataSource, type DataType } from './_compare/sticky.shared'

// ---------------------------------------------------------------------------
// 列定义 —— 两侧字段（title/dataIndex/key/width/fixed/render）逐字一致
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<DataType>[] = [
  { title: 'Full Name', width: 100, dataIndex: 'name', key: 'name', fixed: 'start' },
  { title: 'Age', width: 100, dataIndex: 'age', key: 'age', fixed: 'start' },
  { title: 'Column 1', dataIndex: 'address', key: '1', width: 150 },
  { title: 'Column 2', dataIndex: 'address', key: '2', width: 150 },
  { title: 'Column 3', dataIndex: 'address', key: '3', width: 150 },
  { title: 'Column 4', dataIndex: 'address', key: '4', width: 150 },
  { title: 'Column 5', dataIndex: 'address', key: '5', width: 150 },
  { title: 'Column 6', dataIndex: 'address', key: '6', width: 150 },
  { title: 'Column 7', dataIndex: 'address', key: '7', width: 150 },
  { title: 'Column 8', dataIndex: 'address', key: '8' },
  {
    title: 'Action',
    key: 'operation',
    fixed: 'end',
    width: 100,
    render: () => <a>action</a>,
  },
]

const antdColumns: TableColumnsType<DataType> = [
  { title: 'Full Name', width: 100, dataIndex: 'name', key: 'name', fixed: 'start' },
  { title: 'Age', width: 100, dataIndex: 'age', key: 'age', fixed: 'start' },
  { title: 'Column 1', dataIndex: 'address', key: '1', width: 150 },
  { title: 'Column 2', dataIndex: 'address', key: '2', width: 150 },
  { title: 'Column 3', dataIndex: 'address', key: '3', width: 150 },
  { title: 'Column 4', dataIndex: 'address', key: '4', width: 150 },
  { title: 'Column 5', dataIndex: 'address', key: '5', width: 150 },
  { title: 'Column 6', dataIndex: 'address', key: '6', width: 150 },
  { title: 'Column 7', dataIndex: 'address', key: '7', width: 150 },
  { title: 'Column 8', dataIndex: 'address', key: '8' },
  {
    title: 'Action',
    key: 'operation',
    fixed: 'end',
    width: 100,
    render: () => <a>action</a>,
  },
]

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function StickyDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧 summary 的 fixed 行为。
  // 左栏 data-grid：summaryFixed true/false（on/off，data-grid S22 fixed 仅 boolean）。
  // 右栏 antd：fixedTop true→'top' / false→'bottom'（忠实 antd demo 顶/底切换）。
  const [summaryFixed, setSummaryFixed] = useState(false)

  return (
    <div style={{ padding: 24 }}>
      {/* 顶部说明区：撑长页面，使表格初始不在视口顶部，滚动后验证表头固定到 offsetHeader 位置。 */}
      <p style={{ color: 'rgba(0,0,0,0.65)' }}>
        S34 页面级粘性表头（区别 M8 容器内固定）：向下滚动<strong>页面</strong>
        ，两侧表头都会钉在视口顶部 64px 处（offsetHeader 模拟站点 header 偏移）；
        横向滚动页面查看 fixed 列。共享「Summary Fixed」开关同时驱动两侧 summary 的 fixed 行为。
      </p>

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
            checkedChildren="Summary Fixed"
            unCheckedChildren="Summary Fixed"
            checked={summaryFixed}
            onChange={setSummaryFixed}
          />
          <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
            左栏 data-grid：on/off；右栏 antd：top/bottom（功能等价，S22 简化）
          </span>
        </Space>
      </div>

      {/*
        minPaneWidth=900 → 横排阈值 ≈ 900×2 + 16 = 1816px。纯 CSS flex-wrap 自适应（无 JS）。
        本 demo 含 scroll.x:1500 的宽表（11 列），半宽（~960px at 1920 视口）下每栏仅 ~480px
        太挤、横滚严重；取大阈值使常规笔记本视口（1440–1920）下 **竖排**（每栏全宽，对 1500px
        宽表 + 页面级 sticky 更友好），仅超宽屏（≥2200）才横排。
      */}
      <SplitDemo
        minPaneWidth={900}
        // ★ stickyMode：放开 SplitDemo pane/body 的 overflow（默认 hidden/auto 会成为 sticky
        // 滚动祖先拦截 S34 页面级 sticky）。true → pane/body overflow:visible，让页面滚动驱动
        // 表头钉视口顶 64px。仅页面级 sticky demo 需要；其它 demo 默认 false 行为不变。
        stickyMode
        left={
          // 左栏 data-grid：S34 页面级粘性表头 + scroll.x:1500 + fixed 列 + summary fixed。
          // sticky 启用后 .dg-wrapper overflow:visible，grid min-width:1500 撑宽页面，
          // 表头相对 viewport 固定（top:64px）。
          <Table<DataType>
            columns={dgColumns}
            dataSource={dataSource}
            scroll={{ x: 1500 }}
            summary={() => (
              <Table.Summary fixed={summaryFixed}>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={2}>
                    <Switch
                      checkedChildren="Summary Fixed"
                      unCheckedChildren="Summary Fixed"
                      checked={summaryFixed}
                      onChange={() => {
                        setSummaryFixed(!summaryFixed)
                      }}
                    />
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} colSpan={8}>
                    Scroll Context
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={10}>Fix Right</Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
            sticky={{ offsetHeader: 64 }}
          />
        }
        right={
          // antd 官方 sticky demo 忠实复刻：
          // Full Name/Age fixed start + Column 1..8 + Action fixed end +
          // scroll x 1500 + summary fixed top/bottom Switch + sticky offsetHeader 64 + 100 行。
          <AntdTable<DataType>
            columns={antdColumns}
            dataSource={dataSource}
            scroll={{ x: 1500 }}
            summary={() => (
              <AntdTable.Summary fixed={summaryFixed ? 'top' : 'bottom'}>
                <AntdTable.Summary.Row>
                  <AntdTable.Summary.Cell index={0} colSpan={2}>
                    <Switch
                      checkedChildren="Fixed Top"
                      unCheckedChildren="Fixed Top"
                      checked={summaryFixed}
                      onChange={() => {
                        setSummaryFixed(!summaryFixed)
                      }}
                    />
                  </AntdTable.Summary.Cell>
                  <AntdTable.Summary.Cell index={2} colSpan={8}>
                    Scroll Context
                  </AntdTable.Summary.Cell>
                  <AntdTable.Summary.Cell index={10}>Fix Right</AntdTable.Summary.Cell>
                </AntdTable.Summary.Row>
              </AntdTable.Summary>
            )}
            // antd site header height
            sticky={{ offsetHeader: 64 }}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B13，页面级粘性表头 S34）：</strong>
          本 demo 左右并排呈现 data-grid 与 antd sticky，方便对照修 bug。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>页面级粘性表头</strong>（S34，区别 M8 容器内固定）：两侧均
              <code>{'sticky={{ offsetHeader: 64 }}'}</code>，向下滚动<strong>页面</strong>
              时表头钉在视口顶部 64px 处（模拟站点 header 遮挡偏移）。100 行撑长页面验证。
            </li>
            <li>
              <strong>横向滚动 + fixed 列</strong>：两侧 <code>scroll.x:1500</code>
              撑宽页面（页面横向滚动）；Full Name/Age 固定 <code>start</code>，Action 固定
              <code>end</code>。表头固定列格同时有横向 sticky + 纵向 sticky（corner cell 双 sticky）。
            </li>
            <li>
              <strong>summary fixed 差异</strong>：右栏 antd 用
              <code> fixed: fixedTop ? 'top' : 'bottom' </code>（顶/底切换，忠实官方）；
              左栏 data-grid S22 summary 的 <code>fixed</code> 简化为 boolean（仅 sticky bottom，
              不支持 'top'），Switch 切换 on/off。功能等价：summary fixed 在 grid 内，与页面级表头共存。
            </li>
            <li>
              <strong>S34 实现路径差异</strong>：data-grid sticky 启用后
              <code> .dg-wrapper.dg-sticky </code>overflow:visible（放开 sticky 上下文）+ grid
              min-width:1500 撑宽 + 底部 StickyScrollBar 同步；antd rc-table 实现路径不同但视觉对齐。
              S34 与 M8 互斥（data-grid 简化）。
            </li>
          </ul>
        </div>
      </SplitDemo>

      {/* 底部说明区：撑长页面，使表格下方仍有内容，滚动到底部时表头仍固定。 */}
      <p style={{ padding: '16px 0', color: 'rgba(0,0,0,0.65)' }}>
        表格下方填充内容 — 继续向下滚动，两侧表头均保持在视口顶部 64px 处（页面级 sticky，
        非容器内固定）。
      </p>
    </div>
  )
}
