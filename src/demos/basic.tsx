/**
 * 复刻 antd basic demo：`G:\Projects\ant-design\components\table\demo\basic.tsx`。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（render `<a>`/内联最小 Tag/Action 链接），
 *   仅接共享 `Bordered` 控制条。
 * - **右栏（antd Table）**：忠实复刻 antd basic demo（antd `<Tag>` + `<Flex>` + `<Space>`，
 *   不再用左栏的内联最小 Tag 实现）。
 * - **共享控制条**：`Bordered` 开关同时驱动两侧（antd basic demo 原本无控制条，此处加一个
 *   最小开关便于对照「有/无边框」两侧行为是否一致）。
 * - **共享数据**：`RecordType` + `data` + `tagColor` 见 `_compare/basic.shared.ts`。
 *
 * === 两侧保留的差异 ===
 *
 * 1. **Tag 实现**：左栏内联最小实现（因 data-grid 引擎本身不依赖 antd 本体的 Tag，保留改造前
 *    的内联 `Tag`），右栏 antd `<Tag>`（antd 内置预设色 geekblue/green/volcano）。
 * 2. **Action 布局**：左栏内联 `<span style={{display:'inline-flex',gap:8}}>`；右栏 antd `<Space>`。
 * 3. **size="medium"**：antd Space 用 `size="medium"`（antd v6 兼容别名，规范值为 'middle'）。
 *
 * === 拆子文件（task #54：live 编辑接入）===
 *
 * 父文件只保留「外壳职责」：bordered state + useVirtualization + DemoToolbar(Switch Bordered)
 * + SplitDemo 外壳 + children 对照说明。两侧表格 JSX 与 columns 拆到子文件：
 *   - `./basic.dg`：`BasicDg({bordered, virtual})`（左栏）
 *   - `./basic.antd`：`BasicAntd({bordered, virtual})`（右栏）
 *
 * 这样：
 *   - 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `BasicDemo`，零编辑开销。
 *   - live 编辑模式：SplitDemoPreview 静态 import 真实子组件，并按 editedDg/editedAntd 替换。
 */

import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（split pane 自动限高 400px）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + columns 由子组件提供（props 驱动）。RecordType/data/tagColor
//   现在由子文件各自 import basic.shared，父文件不再需要。
import BasicDg from './basic.dg'
import BasicAntd from './basic.antd'

export default function BasicDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一个状态同时驱动两侧表格。
          DemoToolbar 用 useToken（light/dark/自定义 token 自适应），替代硬编码 #fff/#f0f0f0。 */}
      <DemoToolbar>
        <Space>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=480（窄表，3-5 列无 scroll.x）→ 横排阈值 ≈ 480×2 + 16 = 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<BasicDg bordered={bordered} virtual={virtual} />}
        right={<BasicAntd bordered={bordered} virtual={virtual} />}
      >
        <div>
          <strong>对照说明（决策 9 T1）：</strong>左右并排呈现 data-grid 与 antd basic demo。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>Bordered 开关</strong>：同时切换两侧表格边框，对照两侧行为是否一致。
            </li>
            <li>
              <strong>Tag 实现</strong>：左栏 data-grid 用内联最小 Tag（引擎不依赖 antd Tag）；
              右栏 antd 用原生 <code>&lt;Tag&gt;</code>（预设色 geekblue/green/volcano）。
            </li>
            <li>
              <strong>Action 布局</strong>：左栏内联 <code>&lt;span&gt;</code> + flex；
              右栏 antd <code>&lt;Space size="medium"&gt;</code>。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
