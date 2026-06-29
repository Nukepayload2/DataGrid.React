/**
 * 复刻 antd `grouping-columns` demo：`G:\Projects\ant-design\components\table\demo\grouping-columns.tsx`。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：多级表头（任意深度嵌套 children）+ 固定列（Name fixed 'start'、
 *   Gender fixed 'end'）+ scroll.x。行为与改造前一致（M1 已实现多级表头 grid-column/grid-row span N，
 *   M2 已实现 fixed sticky 偏移）。grid-column span N / grid-row span N 实现多级表头。
 * - **右栏（antd Table）**：忠实复刻 antd 官方 grouping-columns demo（Name fixed:left + filters/onFilter、
 *   Age sorter、Gender fixed:right、size="medium"、scroll:{x:'calc(700px + 50%)', y:47*5}、100 行、
 *   createStyles 自定义滚动条样式）。
 * - **共享控制条**：`Bordered`（初值 true）+ `Size`（medium/large 切换）+ 行数 `Count`（100/6）
 *   同时驱动两侧表格。
 * - **共享数据**：`DataType` + `getData(count)` 见 `_compare/grouping-columns.shared.ts`。
 *
 * === 两侧保留并如实呈现的差异（对照修 bug 的意义所在）===
 *
 * 1. **filters / sorter**：antd 官方 demo 的 Name 列含 `filters/onFilter`、Age 列含 `sorter`。
 *    - 两侧均保留 filters（Joe/John）+ Age sorter（点击排序）——已对齐（左栏补回 filters/onFilter/sorter）。
 * 2. **size**：antd demo 用 `size="medium"`（v6 中等行高）。
 *    - 两侧均通过共享控制条切换 size（medium / large）。
 * 3. **scroll**：antd demo 用 `scroll={{x:'calc(700px + 50%)', y:47*5}}`（固定表头 + 表体 max-height 235px 纵滚）。
 *    - 右栏 antd：忠实复刻该 scroll（x 含 calc 公式）；y:235 是**表体滚动 max-height**，antd 整表
 *      撑满父容器，表体高度 = min(内容自然高, 235)。
 *    - 左栏 data-grid：用 `scroll={{x:'calc(700px + 50%)', y:true}}`（决策 7：y:true 数据区域模式，
 *      CSS 自动适应高度；父容器填满 SplitDemo body）。父容器 height:100% 填满 body（~473px =
 *      表头 ~188 + 表体 ~235 + 分页条 ~50），表体 ~235px 对齐 antd y:235。
 *    - ★ 任务 S：旧实现误用 `height:240≈antd y` 把整表硬限 240px（误把表体 max-height 当整表高），
 *      表体仅 ~52px；已改为 height:100% 填满 body，表体对齐 antd。
 * 4. **★ §9 右固定列脱离已修（C1 列宽策略落地后）**：左栏含 scroll.x + Gender fixed 'end' +
 *    Company Name 列无 width。C1 前（§9 narrow gap 同源，task #38 virtual-list 暴露）横滚到最右时
 *    右固定列脱离容器右边缘；C1 列宽策略（absolute width → grid `minmax(width,1fr)`，无 width 列
 *    `minmax(0,1fr)`，派生 fixed tableLayout）后该列填满 scroll.x 剩余空间，Gender 严格贴右
 *    （实测 diff 0.000003px 亚像素，与 antd 等价）。右栏 antd 一直无此问题，现两侧一致。
 * 5. **数据量**：antd demo 固定 100 行；data-grid 侧通过 Count 控件可切换 100/6（默认 100 对齐 antd）。
 *
 * === 拆子文件（task #56：live 编辑接入，同 basic 模式）===
 *
 * 父文件只保留「外壳职责」：bordered/size/count state + useVirtualization + DemoToolbar(Switch Bordered
 * + Segmented size + Segmented count) + SplitDemo 外壳 + children 对照说明。两侧表格 JSX 与 columns 拆到子文件：
 *   - `./grouping-columns.dg`：`GroupingColumnsDg({bordered, size, virtual, data})`（左栏）
 *   - `./grouping-columns.antd`：`GroupingColumnsAntd({bordered, size, virtual, data})`（右栏）
 *
 * 父文件保留 `getData(count)` 调用（count 由控制条驱动，生成的 data 以 prop 下发两侧子组件）。
 *
 * 这样：
 *   - 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `GroupingColumnsDemo`，零编辑开销。
 *   - live 编辑模式：SplitDemoPreview 静态 import 真实子组件，并按 editedDg/editedAntd 替换。
 */

import { useState } from 'react'
import { Segmented, Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { getData } from './_compare/grouping-columns.shared'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（split pane 自动限高 400px）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + columns 由子组件提供（props 驱动）。DataType 现在由子文件各自
//   import grouping-columns.shared；父文件只保留 getData 调用（生成 data 下发两侧）。
import GroupingColumnsDg from './grouping-columns.dg'
import GroupingColumnsAntd from './grouping-columns.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

type SizeOption = 'medium' | 'large'

export default function GroupingColumnsDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(true)
  const [size, setSize] = useState<SizeOption>('medium')
  const [count, setCount] = useState<number>(100)
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + 在原 scroll 基础上合并 scroll.y
  const { virtual } = useVirtualization()

  const data = getData(count)

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
          <Segmented
            value={size}
            onChange={(val) => setSize(val as SizeOption)}
            options={[
              { label: 'medium', value: 'medium' },
              { label: 'large', value: 'large' },
            ]}
          />
          <Segmented
            value={count}
            onChange={(val) => setCount(val as number)}
            options={[
              { label: '6 rows', value: 6 },
              { label: '100 rows', value: 100 },
            ]}
          />
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=900 → 横排阈值 ≈ 900×2 + 16 = 1816px。纯 CSS flex-wrap 自适应（无 JS）。
        本 demo 含 scroll.x:'calc(700px + 50%)' 的宽表 + 多级表头，半宽（~960px at 1920 视口）
        下每栏仅 ~480px 太挤；取大阈值使常规笔记本视口（1440–1920）下竖排（每栏全宽，对宽表更友好），
        仅超宽屏（≥2200）才横排。
      */}
      <SplitDemo
        minPaneWidth={900}
        left={
          /* 左栏 data-grid：多级表头 + 固定列 + filters/sorter，行为与改造前一致。
             473px 父高 wrapper 在子组件内（表头 4 行 ~188 + 表体 ~235 + 分页条 ~50，对齐 antd）。 */
          <GroupingColumnsDg
            bordered={bordered}
            size={size}
            virtual={virtual}
            data={data}
          />
        }
        right={
          /* antd 官方 grouping-columns demo 忠实复刻：
             filters（Joe/John）+ Age sorter + fixed:left/right + size="medium" +
             scroll={{x:'calc(700px + 50%)', y:47*5}}（固定表头 5 行高纵滚）。 */
          <GroupingColumnsAntd
            bordered={bordered}
            size={size}
            virtual={virtual}
            data={data}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B11，多级表头）：</strong>本 demo 左右并排呈现 data-grid 与 antd
          grouping-columns，方便对照修 bug。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>多级表头</strong>：Other → Age / Address（→ Street / Block（→ Building / Door No.））
              + Company（→ Company Address / Company Name），任意深度嵌套。data-grid grid-column span N /
              grid-row span N 实现多级表头；antd 原生 children 嵌套。两侧结构应一致。
            </li>
            <li>
              <strong>filters / sorter</strong>：两侧 Name 列均含 filters（Joe/John）+ onFilter；
              Age 列均含 sorter（点击排序）。已对齐，两侧均显示漏斗/排序图标。
            </li>
            <li>
              <strong>固定列差异</strong>：左栏 data-grid 用 <code>fixed:'start'/'end'</code>（逻辑属性，
              等价 antd <code>'left'/'right'</code>，RTL 自动适配）；右栏 antd 原生 <code>'left'/'right'</code>。
            </li>
            <li>
              <strong>scroll 差异</strong>：右栏 antd <code>scroll: {'{ x:"calc(700px+50%)", y:47*5 }'}</code>；
              左栏 data-grid <code>scroll: {'{ x:"calc(700px+50%)", y:true }'}</code>（决策 7：y:true 数据区域
              模式 + 父容器固定高 473px = 表头 ~188 + 表体 ~235 + 分页条 ~50）。
            </li>
            <li>
              <strong>size 差异</strong>：右栏 antd <code>size="medium"</code>（v6 中等行高）；左栏 data-grid
              <code>size="middle"</code>（data-grid v6 别名，等价 medium）。可通过控制条切换。
            </li>
            <li>
              <strong>★ §9 右固定列脱离已修（C1 列宽策略）</strong>：左栏含 scroll.x + Gender fixed 'end' +
              Company Name 列无 width。C1 列宽策略（absolute width → grid <code>minmax(width,1fr)</code>，
              无 width 列 <code>minmax(0,1fr)</code>，派生 fixed tableLayout）后该列填满 scroll.x 剩余空间，
              Gender 严格贴右（实测 diff 0.000003px 亚像素，与 antd 等价）。右栏 antd 一直无此问题，
              现两侧一致。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
