/**
 * 复刻 antd `column-defaults` demo：
 *   `G:\Projects\ant-design\components\table\demo\column-defaults.tsx`。
 *
 * === S32 列默认值 column（自研任务）===
 *
 * antd 允许在 Table 级传 `column={{...}}` 设置**所有列的默认属性**，单列可通过自身同名字段覆盖。
 *
 * data-grid 对齐实现（S32）：
 *   - `TableProps.column?: Partial<ColumnType<RecordType>>`。
 *   - 适配层 `applyColumnDefaults`：把 `column` 默认**浅合并**到每个列——**列自身优先**；
 *     哨兵（EXPAND_COLUMN/SELECTION_COLUMN）豁免；多级表头逐层递归合并。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（`column={{ align: 'center', ellipsis }}` +
 *   Address `align: 'start'`，data-grid Align 类型用 'start'/'center'/'end'）。
 * - **右栏（antd Table）**：忠实复刻 antd column-defaults demo（Address `align: 'left'`，
 *   antd 原生 'left'/'center'/'right'）。
 * - **共享控制条**：`Ellipsis` 开关切换 Table 级 column.ellipsis（两侧同步），对照省略号视觉差异。
 * - **共享数据**：`RecordType` + `data` 见 `_compare/column-defaults.shared.ts`。
 *
 * === 两侧保留的差异 ===
 *
 * - **Align 字面量**：左栏 data-grid 用 'start'/'center'/'end'（对齐 CSS logical）；右栏 antd
 *   用 'left'/'center'/'right'（antd v6 物理方向）。语义等价（'start'='left'），类型系统不同。
 *
 * === §11 外观/行为对齐 核对结论 ===
 *
 * 1. **Table 级 column 默认生效**：`column={{ align:'center', ellipsis:true }}` →
 *    applyColumnDefaults（Table.tsx）浅合并（列自身优先 + 哨兵豁免 + children 递归），
 *    对齐 antd `useFilledColumns`（`mergeProps(default, col)` 同语义）。
 *    Name/Description 继承 center+ellipsis；Address 自身 `align:'start'` 覆盖默认 center。
 * 2. **单列覆盖**：Address `align:'start'` → data-grid `merge` 函数列自身字段后于 base 展开，
 *    覆盖 base.align='center'；与 antd `mergeProps(default, col)` 同。
 * 3. **ellipsis 默认**：所有列默认 ellipsis（`column.ellipsis:true`）→ `derivedTableLayout` 派生
 *    `'fixed'` → fixed 模式下 width 列 `minmax(width,1fr)`（GridTable colTracks）→ track 受限 →
 *    `.dg-cell-inner` 溢出 → `...` 生效（§9 S20 ellipsis 视觉 gap 已由 #34 tableLayout:fixed 修复闭合）。
 * 4. **ellipsis `...` + keep-all**：`.dg-cell-ellipsis .dg-cell-inner`（table.css）含
 *    `text-overflow:ellipsis; white-space:nowrap; overflow:hidden; word-break:keep-all`，
 *    对齐 antd `style/ellipsis.ts`（textEllipsis + wordBreak:'keep-all'）。表头/表体同款。
 * 5. **行 hover / 表头 hover / 分隔线 / 边框 / padding / 列宽**：共享 CSS 消费 `--ant-*` token
 *    （theme-injection-antd 已落地），column-defaults 无特殊覆盖需求 → 自动对齐。
 *
 * === 拆子文件（task：live 编辑接入，同 basic 模式）===
 *
 * 父文件只保留「外壳职责」：ellipsis state + useVirtualization + DemoToolbar(Switch Ellipsis)
 * + SplitDemo 外壳 + children 对照说明。两侧表格 JSX（含 column-defaults 配置 + 各自列定义）
 * 拆到子文件：
 *   - `./column-defaults.dg`：`ColumnDefaultsDg({ellipsis, virtual})`（左栏）
 *   - `./column-defaults.antd`：`ColumnDefaultsAntd({ellipsis, virtual})`（右栏）
 *
 * 这样：
 *   - 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `ColumnDefaultsDemo`，零编辑开销。
 *   - live 编辑模式：SplitDemoPreview 静态 import 真实子组件，并按 editedDg/editedAntd 替换。
 */

import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（split pane 自动限高 400px）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX（含 column-defaults 配置 + 各自列定义）由子组件提供（props 驱动）。
//   RecordType/data 现在由子文件各自 import column-defaults.shared；父文件不再需要。
import ColumnDefaultsDg from './column-defaults.dg'
import ColumnDefaultsAntd from './column-defaults.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function ColumnDefaultsDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [ellipsis, setEllipsis] = useState(true)
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。
          DemoToolbar 用 useToken（light/dark/自定义 token 自适应），替代硬编码 #fff/#f0f0f0。 */}
      <DemoToolbar>
        <Space>
          <Switch
            checked={ellipsis}
            onChange={setEllipsis}
            checkedChildren="Ellipsis"
            unCheckedChildren="Ellipsis"
          />
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=480（窄表，3 列，无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<ColumnDefaultsDg ellipsis={ellipsis} virtual={virtual} />}
        right={<ColumnDefaultsAntd ellipsis={ellipsis} virtual={virtual} />}
      >
        <div>
          <strong>对照说明（决策 9 T1）：</strong>左右并排呈现 data-grid 与 antd column-defaults demo。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>Table 级 column 默认</strong>：两侧均传 <code>column</code> prop 设
              <code> align: center</code> 与 <code>ellipsis: true</code>——Name/Description 继承 center；
              Address 单列覆盖。
            </li>
            <li>
              <strong>Align 字面量</strong>：左栏 data-grid Address 用 <code>align:'start'</code>；
              右栏 antd 用 <code>align:'left'</code>（两侧语义等价，类型系统不同）。
            </li>
            <li>
              <strong>Ellipsis 省略号</strong>：开启时两侧均显示 <code>...</code>（对齐：data-grid
              <code>derivedTableLayout</code> 派生 <code>fixed</code> + <code>minmax(width,1fr)</code>
              限 track 宽 + <code>.dg-cell-ellipsis</code> CSS <code>text-overflow:ellipsis</code>
              <code>word-break:keep-all</code>，对齐 antd <code>table-layout:fixed</code> +
              <code>style/ellipsis.ts</code>）。关掉 Ellipsis 开关两侧均无省略号（对照基线）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
