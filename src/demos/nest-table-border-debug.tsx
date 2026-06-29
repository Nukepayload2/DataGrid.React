/**
 * 复刻 antd `nest-table-border-debug` demo：
 *   `G:\Projects\ant-design\components\table\demo\nest-table-border-debug.tsx`
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致——主表 + expandedRowRender 返回嵌套子
 *   data-grid `<Table>`（独立 grid 上下文，与主表正交）；主表/子表的 `bordered` 各自独立
 *   受共享 state 驱动（M9 expandedRowRender 渲染任意 ReactNode + S26 bordered 是每张 Table
 *   自身 prop，天然隔离）。
 * - **右栏（antd Table）**：忠实复刻 antd nest-table-border-debug demo（antd `<Table>` 主表 +
 *   expandedRowRender 返回真实 antd `<Table>` 子表 + `createExpandedRowRender(bordered)` 闭包）。
 * - **共享状态 + 控制条**：`rootTableBordered` / `childTableBordered` 两个 Switch，
 *   **同一组 state 同时驱动两侧主表 + 子表**（决策 9 双驱动——两侧主表/子表 bordered 同步切换）。
 * - **共享数据**：`RecordType` + `ExpandedDataType` + `dataSource` + `expandedDataSource`
 *   + `items` 见 `_compare/nest-table-border-debug.shared.ts`。
 *
 * === D1 边界/隔离用例：嵌套表格父子 bordered 隔离 ===
 *
 * **目标**：验证 M9 expandedRowRender 嵌套子 Table + S26 bordered 的**父子隔离**——
 * 主表 `bordered` 与子 Table `bordered` **各自独立**（父表开 bordered 不强制子表，反之亦然）。
 *
 * === 拆子文件（task：live 编辑接入，同 nested-table 模式）===
 *
 * 父文件只保留「外壳职责」：rootTableBordered/childTableBordered state（父控制条 Form
 * Switch 直接驱动）+ useVirtualization + SplitDemo 外壳 + children 对照说明。
 * 两侧表格 JSX + columns + expandable（嵌套子 Table，bordered 由子 Table 各自 prop 驱动）
 * 拆到子文件：
 *   - `./nest-table-border-debug.dg`：`NestTableBorderDebugDg({rootTableBordered, childTableBordered, virtual})`（左栏）
 *   - `./nest-table-border-debug.antd`：`NestTableBorderDebugAntd({rootTableBordered, childTableBordered, virtual})`（右栏）
 *
 * ★ 状态提升说明：rootTableBordered / childTableBordered 必须留父——父渲染顶部 Form 控制条
 *   需直接读写它们；且同一组 state 驱动两侧同步（父子隔离的核心可观察点）。子组件接
 *   rootTableBordered + childTableBordered + virtual props（配置型 state 提升，默认值 true 合理有效）。
 */

import { useState } from 'react'
import { Form, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
// 全局虚拟化开关接入：开关 ON 时主表叠加 virtual + scroll.y（子表是展开内容，不动）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + columns + expandable（嵌套子 Table）由子组件提供（props 驱动）。
//   RecordType/ExpandedDataType/dataSource/expandedDataSource/items 现在由子文件各自 import
//   nest-table-border-debug.shared；父文件不再需要。
import NestTableBorderDebugDg from './nest-table-border-debug.dg'
import NestTableBorderDebugAntd from './nest-table-border-debug.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function NestTableBorderDebugDemo() {
  // D1 核心：父子 bordered 各自受控（独立 Switch）——两侧共享同一组 state。
  const [rootTableBordered, setRootTableBordered] = useState(true)
  const [childTableBordered, setChildTableBordered] = useState(true)
  // 全局虚拟化开关接入：开关 ON 时主表叠加 virtual=true + scroll.y（子表是展开内容，不动）
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。两个 Switch 同时驱动两侧主表/子表 bordered。 */}
      <Form
        layout="inline"
        className="table-demo-control-bar"
        style={{ marginBottom: 16 }}
      >
        <Form.Item label="Root Table Bordered">
          <Switch
            checked={rootTableBordered}
            onChange={(v) => setRootTableBordered(v)}
          />
        </Form.Item>
        <Form.Item label="Child Table Bordered">
          <Switch
            checked={childTableBordered}
            onChange={(v) => setChildTableBordered(v)}
          />
        </Form.Item>
      </Form>

      {/*
        minPaneWidth=480（嵌套子表内容稍宽，主表 7 列 + 子表 5 列无 scroll.x）→
        横排阈值 ≈ 976。常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <NestTableBorderDebugDg
            rootTableBordered={rootTableBordered}
            childTableBordered={childTableBordered}
            virtual={virtual}
          />
        }
        right={
          <NestTableBorderDebugAntd
            rootTableBordered={rootTableBordered}
            childTableBordered={childTableBordered}
            virtual={virtual}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B20 / D1 嵌套表格父子 bordered 隔离）：</strong>
          左右并排呈现 data-grid 与 antd nest-table-border-debug demo（主表 +
          expandedRowRender 子 Table，父子 bordered 各自独立 Switch）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>父子 bordered 隔离</strong>：主表 <code>bordered</code> 与
              expandedRowRender 内子 Table 的 <code>bordered</code> 各自独立。
              切换 Root Switch 仅影响主表外边框/竖线；切换 Child Switch 仅影响子表边框。
            </li>
            <li>
              <strong>双驱动</strong>：同一组 <code>rootTableBordered</code> /
              <code> childTableBordered</code> state 同时驱动两侧主表 + 子表，
              <strong> 两侧同步切换</strong>（点任一 Switch，两侧主表/子表同时变化）。
            </li>
            <li>
              <strong>嵌套子表实现</strong>：左栏子表是 data-grid
              <code>&lt;Table&gt;</code>（独立 grid 上下文，与主表正交，引擎零改动）；
              右栏子表是真实 antd <code>&lt;Table&gt;</code>。
            </li>
            <li>
              <strong>title/footer</strong>：两侧主表{' '}
              <code>{"title={() => 'cool'}"}</code>
              {' + '}
              <code>{"footer={() => 'cool'}"}</code>（始终在主表上下，与 antd 一致）。
            </li>
            <li>
              <strong>DownOutlined</strong>：两侧均使用同一内联 SVG 组件
              （<code>@ant-design/icons</code> 未在 package.json 声明，仅 antd 间接依赖，
              与 nested-table / custom-filter-panel 约定一致）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
