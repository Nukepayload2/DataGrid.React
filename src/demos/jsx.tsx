/**
 * 复刻 antd `jsx` demo：`G:\Projects\ant-design\components\table\demo\jsx.tsx`。
 *
 * === S31 JSX 风格 API（自研任务）===
 *
 * antd 允许用 `<Table>` 的 JSX 子元素声明列（语法糖），等价于传 `columns` prop：
 *   - `<Table.Column title="..." dataIndex="..." key="..." />`：单列（叶子列）。
 *   - `<Table.ColumnGroup title="..."><Column/>...</ColumnGroup>`：分组列（多级表头，复用 M1）。
 *
 * data-grid 对齐实现（S31）：
 *   - `Table.Column` / `Table.ColumnGroup` 静态属性，均为渲染 null 的数据载体组件。
 *   - Table 适配层 `convertChildrenToColumns`：当**未传 `columns` prop** 时，用 React.Children
 *     遍历 JSX 子元素，把 Column 的 props 转为 ColumnType、ColumnGroup 转为 `{ title, children: [...] }`。
 *   - **columns 或 children 二选一**：传 columns 走 columns 路径；不传 columns 但传 JSX children
 *     走解析路径（本 demo）。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（`const { Column, ColumnGroup } = Table`
 *   从 data-grid Table 静态属性解构；Flex/Tag/Space 用 antd 控件——jsx demo 改造前已用 antd）。
 * - **右栏（antd Table）**：忠实复刻 antd jsx demo（`const { Column, ColumnGroup } = Table`
 *   从 antd Table 解构，antd `<Flex>`/`<Tag>`/`<Space>`）。
 * - **共享控制条**：`Bordered` 开关同时驱动两侧（antd jsx demo 原本无控制条，此处加一个最小
 *   开关便于对照）。
 * - **共享数据**：`RecordType` + `data` + `tagColor` 见 `_compare/jsx.shared.ts`。
 *
 * === 两侧保留的差异 ===
 *
 * - antd demo 的 `<Space size="medium">`：data-grid 用 antd Space 的 `size="middle"`
 *   （antd v6 Space size 类型为 `'small'|'middle'|'large'|number`，无 'medium'；antd jsx demo
 *   写 'medium' 实为 v6 别名兼容，data-grid 显式用规范的 'middle'）。**右栏忠实 antd demo 用
 *   'medium'**（antd 侧 antd 自家兼容别名）。
 *
 * === 拆子文件（task：live 编辑接入，同 basic 模式）===
 *
 * 父文件只保留「外壳职责」：bordered state + useVirtualization + DemoToolbar(Switch Bordered)
 * + SplitDemo 外壳 + children 对照说明。两侧表格 JSX（Table.Column/ColumnGroup 子元素声明列）
 * 拆到子文件：
 *   - `./jsx.dg`：`JsxDg({bordered, virtual})`（左栏）
 *   - `./jsx.antd`：`JsxAntd({bordered, virtual})`（右栏）
 *
 * 这样：
 *   - 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `JsxDemo`，零编辑开销。
 *   - live 编辑模式：SplitDemoPreview 静态 import 真实子组件，并按 editedDg/editedAntd 替换。
 */

import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（split pane 自动限高 400px）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX（Table.Column/ColumnGroup 子元素声明列）由子组件提供（props 驱动）。
//   RecordType/data/tagColor 现在由子文件各自 import jsx.shared，父文件不再需要。
import JsxDg from './jsx.dg'
import JsxAntd from './jsx.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function JsxDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。
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
        minPaneWidth=480（窄表，5 列含 Name 分组 → 6 叶子列，无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<JsxDg bordered={bordered} virtual={virtual} />}
        right={<JsxAntd bordered={bordered} virtual={virtual} />}
      >
        <div>
          <strong>对照说明（决策 9 T1）：</strong>左右并排呈现 data-grid 与 antd jsx demo，
          两侧均用 JSX <code>&lt;Table.Column&gt;</code>/<code>&lt;Table.ColumnGroup&gt;</code> 子元素声明列。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>ColumnGroup 多级表头</strong>：两侧均支持「Name」分组下含 First/Last Name
              （复用 M1）。
            </li>
            <li>
              <strong>Space size</strong>：左栏 data-grid 用 <code>size="middle"</code>（antd v6
              规范值）；右栏 antd 用 <code>size="medium"</code>（antd demo 原样，v6 别名兼容）。
            </li>
            <li>
              <strong>Bordered 开关</strong>：同时切换两侧边框。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
