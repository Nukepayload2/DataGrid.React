/**
 * 复刻 antd `fixed-gapped-columns` demo：
 *   `G:\Projects\ant-design\components\table\demo\fixed-gapped-columns.tsx`
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：**分散的多个固定列堆叠** + bordered + `scroll={{ x:'max-content' }}`。
 *   行为与改造前一致（M2 已实现分散固定列按列顺序累加偏移堆叠）。
 * - **右栏（antd Table）**：忠实复刻 antd 官方 fixed-gapped-columns demo（分散固定列堆叠 +
 *   bordered + `scroll={{ x:'max-content' }}` + `pagination={false}`）。
 * - **共享控制条**：`Bordered`（初值 true，对齐 antd demo bordered）+ `Size`（medium/large 切换）
 *   同时驱动两侧表格。antd demo 原本无控制条，此处加最小开关便于对照「有/无边框」「尺寸」。
 * - **共享数据**：`DataType` + `dataSource` 见 `_compare/fixed-gapped-columns.shared.ts`。
 *
 * === 列结构（与 antd demo 完全一致）===
 *
 * - start 侧分散两段：[FullName(start)] ... [Column1(start)]（中间夹着非固定的 Age）
 *   —— 即 start 侧有 2 个固定列，但它们不相邻（Name 在最左、Column1 在第 3 列）。
 * - end 侧分散两段：[Action1(end)] ... [Action3(end)]（中间夹着非固定的 Action2）。
 * - 启用 bordered，便于看清堆叠边界。
 *
 * === 两侧保留并如实呈现的差异（对照修 bug 的意义所在）===
 *
 * 1. **fixed 逻辑属性**：两侧均用 antd v6 逻辑属性 `fixed:'start'/'end'`（等价 'left'/'right'，
 *    RTL 自动适配）。data-grid 与 antd demo 同款写法，无需转换。
 * 2. **pagination**：右栏 antd 显式 `pagination={false}`（取消 antd 默认分页，2 行全显）；
 *    左栏 data-grid 默认不分页（全显），无需传。
 * 3. **createStyles 滚动条**：antd 官方 demo 用 `antd-style` createStyles 自定义细滚动条样式。
 *    data-grid 项目未装 `antd-style`（决策 6 + 与 colspan-rowspan/style-class 等已迁移 demo 同款
 *    简化）——略去该 className，使用浏览器默认滚动条。视觉略简，功能等价。
 * 4. **★ §9 右固定列脱离（C1 已确认本 demo 不复现）**：本 demo 用 `scroll.x:'max-content'`，
 *    C1 列宽策略验收时已确认 max-content 路径下**左右固定列严格贴边、无脱离**（与 antd 一致）。
 *    §9 登记的「右固定列脱离」只在数字 `scroll.x` + 无 width 列总和 < 声明宽的场景复现
 *    （如 virtual-list / grouping-columns），本 demo 不命中。如实保留对照。
 * 5. **固定列边缘阴影恒显**（unfixable，跨 demo 共享）：data-grid 固定列 start/end 边缘阴影
 *    `inset 10px 0 8px -8px colorSplit` 恒显（纯 CSS，不脚本监听 scrollLeft）；
 *    antd 由 rc-table 监听 scrollLeft 动态切换 shadow-show（滚到最左隐藏 start 阴影 / 最右隐藏 end）。
 *    本 demo 两侧分散固定列（Column1 起 start 阴影 / Action1 起 end 阴影）恒显，视觉差异极小
 *    （阴影本身 8px 模糊 + 0.06 alpha 极淡），登记不修（纯 CSS 范围内无法动态切换）。
 *
 * === 拆子文件（task #56：live 编辑接入，同 basic 模式）===
 *
 * 父文件只保留「外壳职责」：bordered/size state + useVirtualization + DemoToolbar(Switch Bordered
 * + Segmented size) + SplitDemo 外壳 + children 对照说明。两侧表格 JSX 与 columns 拆到子文件：
 *   - `./fixed-gapped-columns.dg`：`FixedGappedColumnsDg({bordered, size, virtual})`（左栏）
 *   - `./fixed-gapped-columns.antd`：`FixedGappedColumnsAntd({bordered, size, virtual})`（右栏）
 *
 * dataSource 为 shared 静态导出，子文件各自 import；父文件不再需要 shared import。
 *
 * 这样：
 *   - 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `FixedGappedColumnsDemo`，零编辑开销。
 *   - live 编辑模式：SplitDemoPreview 静态 import 真实子组件，并按 editedDg/editedAntd 替换。
 */

import { useState } from 'react'
import { Segmented, Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + columns 由子组件提供（props 驱动）。DataType/dataSource
//   现在由子文件各自 import fixed-gapped-columns.shared，父文件不再需要。
import FixedGappedColumnsDg from './fixed-gapped-columns.dg'
import FixedGappedColumnsAntd from './fixed-gapped-columns.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

type SizeOption = 'medium' | 'large'

export default function FixedGappedColumnsDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(true)
  const [size, setSize] = useState<SizeOption>('medium')
  // ★ 虚拟化开关（决策 9 对照）：两侧表格同步切换虚拟/非虚拟。
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
        本 demo 含 scroll.x:'max-content' 的宽表（25 列，含分散固定列堆叠），半宽（~960px at
        1920 视口）下每栏仅 ~480px 太挤、横滚严重 + 分散堆叠结构看不清；取大阈值使常规笔记本
        视口（1440–1920）下 **竖排**（每栏全宽，对宽表更友好），仅超宽屏（≥2200）才横排。
      */}
      <SplitDemo
        minPaneWidth={900}
        left={
          /* 左栏 data-grid：分散固定列堆叠，行为与改造前一致（仅接共享 bordered/size）。
             无 scroll.y（表体不纵向滚动，整体随页面），保留改造前形态. */
          <FixedGappedColumnsDg bordered={bordered} size={size} virtual={virtual} />
        }
        right={
          /* antd 官方 fixed-gapped-columns demo 忠实复刻：
             分散固定列堆叠（start: FullName+Column1 不相邻 / end: Action1+Action3 不相邻）
             + bordered + scroll x max-content + pagination false. */
          <FixedGappedColumnsAntd bordered={bordered} size={size} virtual={virtual} />
        }
      >
        <div>
          <strong>对照说明（决策 9 B12，分散固定列堆叠）：</strong>本 demo 左右并排呈现 data-grid 与
          antd fixed-gapped-columns，方便对照修 bug。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>分散固定列堆叠</strong>：start 侧 FullName（最左）+ Column1（第 3 列，中间夹
              Age）不相邻；end 侧 Action1 + Action3（中间夹 Action2）不相邻。横向滚动时 4 个固定列
              都 sticky 固定（start 两个叠在左侧、end 两个叠在右侧）。两侧结构一致。
            </li>
            <li>
              <strong>堆叠实现</strong>：data-grid <code>useStickyColumns</code> 按列顺序累加偏移
              （start 从左扫遇 fixed=start 累加；end 从右扫遇 fixed=end 累加），不要求固定列相邻。
              antd 原生 <code>fixed:'start'/'end'</code> 同款语义。
            </li>
            <li>
              <strong>bordered</strong>：默认开启（对齐 antd demo），便于看清堆叠边界与固定列分隔。
              可通过控制条关闭对照。
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
              <strong>★ §9 右固定列脱离（C1 已确认本 demo 不复现）</strong>：本 demo 用
              <code>scroll.x:'max-content'</code>，C1 列宽策略验收时确认 max-content 路径下
              左右固定列严格贴边、无脱离（与 antd 一致）。§9 登记的「右固定列脱离」只在数字
              scroll.x + 无 width 列总和 &lt; 声明宽的场景复现（如 virtual-list/grouping-columns），
              本 demo 不命中。
            </li>
            <li>
              <strong>固定列边缘阴影恒显</strong>（unfixable，跨 demo 共享）：data-grid 固定列
              start/end 边缘阴影恒显（纯 CSS，不脚本监听 scrollLeft）；antd 由 rc-table 监听
              scrollLeft 动态切换。本 demo 分散固定列（Column1 起 start 阴影 / Action1 起 end 阴影）
              恒显，视觉差异极小（阴影 8px 模糊 + 0.06 alpha 极淡），登记不修。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
