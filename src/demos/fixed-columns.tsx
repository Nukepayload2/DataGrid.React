/**
 * 复刻 antd `fixed-columns` demo：
 *   `G:\Projects\ant-design\components\table\demo\fixed-columns.tsx`
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：左右固定列（Full Name + Age 固定 start，Action 固定 end）
 *   + `scroll={{ x: 'max-content' }}` 横向滚动。行为与改造前一致（M2 已实现 fixed sticky 偏移）。
 * - **右栏（antd Table）**：忠实复刻 antd 官方 fixed-columns demo（Full Name/Age fixed start +
 *   Age `sorter:true` + Action fixed end + `scroll={{ x:'max-content' }}` + `pagination={false}`）。
 * - **共享控制条**：`Bordered`（初值 false，对齐 antd demo 无 bordered）+ `Size`
 *   （medium/large 切换）同时驱动两侧表格。antd demo 原本无控制条，此处加最小开关便于对照。
 * - **共享数据**：`DataType` + `dataSource` 见 `_compare/fixed-columns.shared.ts`。
 *
 * === 两侧保留并如实呈现的差异（对照修 bug 的意义所在）===
 *
 * 1. **sorter**：antd 官方 demo 的 Age 列含 `sorter: true`（点击排序）。
 *    - 两侧均保留 Age sorter（点击表头排序图标三态切换）——已对齐（左栏补回 sorter:true）。
 * 2. **fixed 逻辑属性**：两侧均用 antd v6 逻辑属性 `fixed:'start'/'end'`（等价 'left'/'right'，
 *    RTL 自动适配）。data-grid 与 antd demo 同款写法，无需转换。
 * 3. **pagination**：右栏 antd 显式 `pagination={false}`（取消 antd 默认分页，2 行全显）；
 *    左栏 data-grid 默认不分页（全显），无需传。
 * 4. **createStyles 滚动条**：antd 官方 demo 用 `antd-style` createStyles 自定义细滚动条样式。
 *    data-grid 项目未装 `antd-style`（决策 6 + 与 colspan-rowspan/style-class 等已迁移 demo 同款
 *    简化）——略去该 className，使用浏览器默认滚动条。视觉略简，功能等价。
 * 5. **★ §9 右固定列脱离观察**（task #38 同源 narrow gap）：左栏含 `scroll.x:'max-content'` +
 *    Action fixed 'end' + 中间 Column 1-20 无 width（max-content），横滚到最右时 data-grid
 *    右固定列 Action 可能脱离容器右边缘（§9 已登记：无 width 列 max-content vs antd width+flex
 *    fill）。右栏 antd 无此问题。如实保留对照，登记 §9 不修。
 *
 * === §11 fixed-columns 阴影对齐结论 ===
 * 6. **★ 固定列边缘阴影**（已对齐）：data-grid `.dg-sticky-shadow-start/end` 已在 `table.css`
 *    补 `inset` 关键字，与 antd 6.4.4 `fixed.ts:6-16` getShadowStyle 视觉一致（阴影落在固定列
 *    内侧、更含蓄）。
 * 7. **★ 阴影随滚动切换（unfixable，登记不修）**：antd 的 shadowStart/shadowEnd 由 rc-table 的
 *    横向 scrollLeft 监听动态切换；data-grid 两侧阴影恒显（纯 CSS，不脚本监听）。可接受差异。
 * 8. **固定列偏移/边框/横滚贴边/z-index/固定列×hover-selected**：均沿用已落地共享修复。
 *
 * === 拆子文件（task #56：live 编辑接入，同 basic 模式）===
 *
 * 父文件只保留「外壳职责」：bordered/size state + useVirtualization + DemoToolbar(Switch Bordered
 * + Segmented size) + SplitDemo 外壳 + children 对照说明。两侧表格 JSX 与 columns 拆到子文件：
 *   - `./fixed-columns.dg`：`FixedColumnsDg({bordered, size, virtual})`（左栏）
 *   - `./fixed-columns.antd`：`FixedColumnsAntd({bordered, size, virtual})`（右栏）
 *
 * 这样：
 *   - 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `FixedColumnsDemo`，零编辑开销。
 *   - live 编辑模式：SplitDemoPreview 静态 import 真实子组件，并按 editedDg/editedAntd 替换。
 */

import { useState } from 'react'
import { Segmented, Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（split pane 自动限高 400px）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + columns 由子组件提供（props 驱动）。DataType/dataSource
//   现在由子文件各自 import fixed-columns.shared，父文件不再需要。
import FixedColumnsDg from './fixed-columns.dg'
import FixedColumnsAntd from './fixed-columns.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

type SizeOption = 'medium' | 'large'

export default function FixedColumnsDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)
  const [size, setSize] = useState<SizeOption>('medium')
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + 在原 scroll.x 上合并 scroll.y
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
          <Segmented
            value={size}
            onChange={(val) => setSize(val as SizeOption)}
            options={[
              { label: 'medium', value: 'medium' },
              { label: 'large', value: 'large' },
            ]}
          />
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=900 → 横排阈值 ≈ 900×2 + 16 = 1816px。纯 CSS flex-wrap 自适应（无 JS）。
        本 demo 含 scroll.x:'max-content' 的宽表（23 列），半宽（~960px at 1920 视口）下
        每栏仅 ~480px 太挤、横滚严重；取大阈值使常规笔记本视口（1440–1920）下 **竖排**
        （每栏全宽，对 max-content 宽表更友好），仅超宽屏（≥2200）才横排。
      */}
      <SplitDemo
        minPaneWidth={900}
        left={
          /* 左栏 data-grid：行为与改造前一致（仅接共享 bordered/size）。 */
          <FixedColumnsDg bordered={bordered} size={size} virtual={virtual} />
        }
        right={
          /* antd 官方 fixed-columns demo 忠实复刻：
             Full Name/Age fixed start + Age sorter true + Action fixed end
             + scroll x max-content + pagination false. */
          <FixedColumnsAntd bordered={bordered} size={size} virtual={virtual} />
        }
      >
        <div>
          <strong>对照说明（决策 9 B12，固定列）：</strong>本 demo 左右并排呈现 data-grid 与 antd
          fixed-columns，方便对照修 bug。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>固定列</strong>：Full Name + Age 固定 <code>start</code>（左），Action 固定
              <code>end</code>（右）；中间 Column 1-20 普通列。横向滚动时 sticky 固定两侧列。
              两侧结构一致。
            </li>
            <li>
              <strong>sorter</strong>：两侧 Age 列均含 <code>sorter:true</code>（点击表头
              排序图标三态切换）。已对齐。
            </li>
            <li>
              <strong>fixed 逻辑属性</strong>：两侧均用 antd v6 <code>fixed:'start'/'end'</code>
              （等价 'left'/'right'，RTL 自动适配），无需转换。
            </li>
            <li>
              <strong>pagination 差异</strong>：右栏 antd 显式 <code>pagination={'{false}'}</code>
              （取消默认分页，2 行全显）；左栏 data-grid 默认不分页（全显）。
            </li>
            <li>
              <strong>createStyles 滚动条差异</strong>：antd 官方 demo 用 antd-style 自定义细滚动条；
              data-grid 项目未装 antd-style，两侧均用浏览器默认滚动条（视觉略简，功能等价）。
            </li>
            <li>
              <strong>★ §9 右固定列脱离观察</strong>（task #38 同源 narrow gap）：左栏含
              <code> scroll.x:'max-content' </code>+ Action fixed 'end' + 中间 Column 1-20 无 width
              （max-content），横滚到最右时 data-grid 右固定列 Action 可能脱离容器右边缘
              （§9 已登记：无 width 列 max-content vs antd width+flex fill）；右栏 antd 无此问题。
              如实保留对照，登记 §9 不修。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
