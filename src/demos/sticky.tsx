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
 *   - antd 原版 `sticky={{ offsetHeader: 64 }}`：表头跟随**页面**滚动固定（offsetHeader:64 模拟站点 header 高度）。
 *
 * === 决策 9 双栏对照（容器内固定表头 M8）===
 *
 * - **左栏（data-grid Table）**：M8 容器内固定表头（`scroll={{ x: 1500, y: true }}`，决策 7：scroll.y
 *   仅支持 `true`，纯 CSS flex 自适应，需父容器明确高度——故外包 `<div style={{ height: 500 }}>`；
 *   表体在表格容器内部滚动、表头钉在表格容器顶部）+ fixed 列 + summary fixed（Switch on/off）。
 * - **右栏（antd Table）**：忠实复刻 antd 官方 sticky demo 的列结构与 summary（同列结构 + summary
 *   fixed top/bottom Switch + 100 行），用 `scroll={{ x: 1500, y: 400 }}`（antd 接受数字 y，
 *   max-height 语义）容器内固定表头。
 * - **共享控制条**：`Summary Fixed` 开关（同一状态）同时驱动两侧 summary 的 fixed 行为（左侧
 *   on/off，右侧 top/bottom，功能等价）。共享数据见 `_compare/sticky.shared.ts`。
 *
 * === 改因：从 S34 页面级 sticky 改为 M8 容器内固定 ===
 *
 * demo 门户已改为 app-shell（Content 内部滚动，取消整页/页面滚动条）。原 S34 页面级 sticky
 * （`sticky={{ offsetHeader: 64 }}` 表头相对 viewport 固定、靠页面滚动驱动）在 app-shell 下完全不
 * 工作（antd 侧页面级 sticky 靠 JS 监听 window scroll，无页面滚动即失效；data-grid 侧表头也无法
 * 相对 viewport 固定）。故改为 M8 容器内固定表头：表体在表格容器内部滚动、表头钉在表格容器顶部，
 * 两侧（data-grid + antd）都能在 app-shell 下正常演示。两侧 scroll.y 实现路径不同但视觉等价：
 * data-grid `y: true`（决策 7 纯 CSS flex + 父容器 height:500） vs antd `y: 400`（max-height）。
 *
 * === 两侧保留并如实呈现的差异（对照修 bug 的意义所在）===
 *
 * 1. **summary fixed 类型差异**：右栏 antd 用 `fixed: fixedTop ? 'top' : 'bottom'`（顶/底切换）；
 *    左栏 data-grid S22 summary 的 `fixed` 简化为 boolean（仅 sticky bottom，不支持 'top'），
 *    Switch 切换 on/off。功能等价：summary fixed 在 grid 内，与容器内固定表头共存。
 * 2. **容器内固定表头实现路径**：data-grid 用 `scroll.y: true`（决策 7 纯 CSS flex + 父容器高度），
 *    antd 用 `scroll.y: 400`（rc-table max-height）；两侧均靠 scroll.y 形成内部滚动容器，表头钉在
 *    表格容器顶部，data-grid 与 antd rc-table 的内部实现路径不同但视觉对齐。
 *
 * === 外壳说明 ===
 *
 * app-shell 下 Content 内部滚动（无页面滚动）。两侧表格均用 scroll.y 形成内部滚动容器（data-grid
 * `y: true` + 父容器 height:500、antd `y: 400`），表体在表格容器内部滚动验证表头钉在容器顶部；
 * SplitDemo 顶部/底部说明区作讲解（不再需要"撑长页面"语义）。
 */

import { useState } from 'react'
import { Space, Switch, Table as AntdTable, theme } from 'antd'
import type { TableColumnsType } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
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
  // 主题 token：顶部/底部说明区文字色 + 控制条 hint 文字色 token 化（暗主题自适应）。
  // colorTextSecondary≈rgba(0,0,0,0.65)、colorTextTertiary≈rgba(0,0,0,0.45)。
  const { token } = theme.useToken()

  return (
    <div style={{ padding: 24 }}>
      {/* 顶部说明区：讲解容器内固定表头（M8）行为，适配 app-shell（Content 内滚，无页面滚动）。 */}
      <p style={{ color: token.colorTextSecondary }}>
        M8 容器内固定表头（适配 app-shell，原 S34 页面级 sticky 已失效）：滚动<strong>表格内部</strong>
        ，两侧表头都会钉在表格容器顶部（左栏 data-grid <code>scroll.y: true</code> 决策 7 + 父容器
        <code>height:500</code>；右栏 antd <code>scroll.y: 400</code>；表体在容器内滚动）；
        横向滚动表格内部查看 fixed 列。共享「Summary Fixed」开关同时驱动两侧 summary 的 fixed 行为。
      </p>

      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一个状态同时驱动两侧表格。
          DemoToolbar 用 useToken（light/dark/自定义 token 自适应），替代硬编码 #fff/#f0f0f0；
          ★ 仅 chrome 控制条容器化，不动两侧表格的 scroll.y 容器内固定逻辑。 */}
      <DemoToolbar>
        <Space wrap>
          <Switch
            checkedChildren="Summary Fixed"
            unCheckedChildren="Summary Fixed"
            checked={summaryFixed}
            onChange={setSummaryFixed}
          />
          <span style={{ color: token.colorTextTertiary, fontSize: 12 }}>
            左栏 data-grid：on/off；右栏 antd：top/bottom（功能等价，S22 简化）
          </span>
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=900 → 横排阈值 ≈ 900×2 + 16 = 1816px。纯 CSS flex-wrap 自适应（无 JS）。
        本 demo 含 scroll.x:1500 的宽表（11 列），半宽（~960px at 1920 视口）下每栏仅 ~480px
        太挤、横滚严重；取大阈值使常规笔记本视口（1440–1920）下 **竖排**（每栏全宽，对 1500px
        宽表 + 容器内固定表头更友好），仅超宽屏（≥2200）才横排。
      */}
      <SplitDemo
        minPaneWidth={900}
        // ★ virtualizable={false}：本 demo 聚焦容器内固定表头（M8）演示，不接入全局「Virtual」
        // 开关——ON 时也不加 `.dg-compare--virtual` 限高，保持两侧容器内固定行为一致对照
        // （避免虚拟化引入额外变量干扰 sticky 表头对照）。
        virtualizable={false}
        left={
          // 左栏 data-grid：M8 容器内固定表头 + scroll.x:1500/y:true + fixed 列 + summary fixed。
          //
          // ★ 决策 7：data-grid 的 scroll.y 刻意**仅支持 `true`**（纯 CSS flex 自适应高度，不用 JS 算
          //   数字 max-height），GridTable.tsx 用 `scrollY === true` 判定；数字 400 被判 false → M8 容器
          //   内固定不启用 → 表头不固定、表体不滚。故 data-grid 用 `y: true`（不是 y:400）。
          //   `y: true` 要求**父容器有明确 height**（决策 7），否则 .dg-wrapper.dg-data-area 的
          //   height:100% 无依托——故此处外包 `<div style={{ height: 500 }}>` 提供明确高度（演示用固定
          //   值，可按需改 calc()/vh/其它）。
          //   进入数据区域模式后：表体在该高度内 flex 限高内滚 + 表头 sticky 钉在容器顶；
          //   scroll.x:1500 横向滚动走 `.dg-scroll`（数据区域模式双向滚动）。无 sticky prop。
          <div style={{ height: 500 }}>
            <Table<DataType>
              columns={dgColumns}
              dataSource={dataSource}
              scroll={{ x: 1500, y: true }}
            // ★ 对齐右栏 antd 默认分页（校准事实 1：antd 对任意行数都渲染 .ant-pagination
            //   disabled 态分页条；data-grid omit=不渲染）。补 pagination={{}} 启用默认分页器，
            //   两侧分页条存在性一致。
            pagination={{}}
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
            />
          </div>
        }
        right={
          // antd 官方 sticky demo 列结构忠实复刻：
          // Full Name/Age fixed start + Column 1..8 + Action fixed end +
          // scroll x 1500 / y 400 + summary fixed top/bottom Switch + 100 行。
          // （原版 sticky prop 省略——改用 scroll.y 容器内固定表头，适配 app-shell。）
          //
          // ★ 与左栏差异：antd 接受**数字 `y: 400`**（max-height 语义，rc-table 直接给表体容器设
          //   max-height:400px 限高 + 表头固定），无需父容器明确高度；左栏 data-grid 用 `y: true`
          //   （决策 7，纯 CSS flex，需父容器高度，故外包 height:500 div）。两侧实现路径不同但视觉
          //   对齐（均为 M8 容器内固定表头：表头钉容器顶 + 表体内部滚动）。
          <AntdTable<DataType>
            columns={antdColumns}
            dataSource={dataSource}
            scroll={{ x: 1500, y: 400 }}
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
          />
        }
      >
        <div>
          <strong>对照说明（决策 9，容器内固定表头 M8，适配 app-shell）：</strong>
          本 demo 左右并排呈现 data-grid 与 antd 表格，方便对照修 bug。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>容器内固定表头</strong>（M8，由原 S34 页面级 sticky 改造）：滚动
              <strong>表格内部</strong>时表头钉在表格容器顶部（表体在容器内限高滚动），100 行验证内部
              滚动 + 表头固定。两侧 scroll.y 取值<strong>不同但视觉等价</strong>：左栏 data-grid 用
              <code>{'scroll={{ x: 1500, y: true }}'}</code>（决策 7：scroll.y 仅支持 <code>true</code>，
              纯 CSS flex 自适应，需父容器明确高度——故左栏外包 <code>{'<div style={{ height: 500 }}>'}</code>）；
              右栏 antd 用 <code>{'scroll={{ x: 1500, y: 400 }}'}</code>（接受数字 y，max-height 语义）。
              改因：app-shell 取消页面滚动，原 S34 页面级 sticky（表头相对 viewport 固定）失效。
            </li>
            <li>
              <strong>横向滚动 + fixed 列</strong>：两侧 <code>scroll.x:1500</code>
              撑宽表格（表格内部横向滚动）；Full Name/Age 固定 <code>start</code>，Action 固定
              <code>end</code>。表头固定列格同时有横向 sticky + 纵向 sticky（corner cell 双 sticky）。
            </li>
            <li>
              <strong>summary fixed 差异</strong>：右栏 antd 用
              <code> fixed: fixedTop ? 'top' : 'bottom' </code>（顶/底切换，忠实官方）；
              左栏 data-grid S22 summary 的 <code>fixed</code> 简化为 boolean（仅 sticky bottom，
              不支持 'top'），Switch 切换 on/off。功能等价：summary fixed 在 grid 内，与容器内固定表头共存。
            </li>
            <li>
              <strong>实现路径差异</strong>：两侧均靠 <code>scroll.y</code> 形成内部滚动容器，
              表头钉在表格容器顶部；data-grid 与 antd rc-table 的内部实现路径不同但视觉对齐
              （表头钉容器顶 + 表体内部滚动）。data-grid 走 <code>y: true</code>（决策 7 纯 CSS flex +
              父容器高度），antd 走 <code>y: 400</code>（rc-table max-height）。
            </li>
            <li>
              <strong>虚拟化开关不接入</strong>：本 demo 聚焦容器内固定表头（M8）演示，不接入全局
              「Virtual」开关——保持两侧容器内固定行为一致对照，避免虚拟化引入额外变量干扰 sticky
              表头对照。
            </li>
          </ul>
        </div>
      </SplitDemo>

      {/* 底部说明区：讲解容器内固定表头（M8）行为，表格内部滚动到底部时表头仍钉在容器顶部。 */}
      <p style={{ padding: '16px 0', color: token.colorTextSecondary }}>
        表格内部滚动到底部 — 两侧表头均钉在表格容器顶部（容器内固定表头 M8，
        非页面级 sticky；适配 app-shell，Content 内滚、无页面滚动）。
      </p>
    </div>
  )
}
