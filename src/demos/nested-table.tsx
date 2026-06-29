/**
 * 复刻 antd `nested-table` demo（S24 嵌套子表格）：
 *   `G:\Projects\ant-design\components\table\demo\nested-table.tsx`
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（`expandable.expandedRowRender`
 *   返回嵌套子 `<Table>` —— 独立 grid 上下文，与主表正交 + `defaultExpandedRowKeys: ['0']`）。
 *   子表也是 data-grid `<Table>`（独立 grid 上下文）。
 * - **右栏（antd Table）**：忠实复刻 antd nested-table demo（antd `<Table>` 主表 +
 *   `expandedRowRender` 返回真实 antd `<Table>` 子表 + `defaultExpandedRowKeys: ['0']`）。
 * - **共享状态 + 控制条**：`Segmented` size（large/medium/small）同时驱动两侧主表
 *   —— 决策 9 要求「同一状态同时驱动两侧」，故将 antd demo 原本的「三张主表静态展示
 *   （large/medium/small）」改为「单主表 + size 切换」，对照同一档 size 下两侧嵌套子表
 *   行为更直观（三表结构在双栏下会变成 6 张表，对照反而不便）。
 * - **共享数据**：`RecordType` + `ExpandedDataType` + `dataSource` + `expandDataSource`
 *   + Dropdown items 见 `_compare/nested-table.shared.ts`。
 *
 * === antd demo 要素（S24 嵌套子表格）===
 *
 * - 主表 7 列：Name / Platform / Version / Upgraded / Creator / Date / Action。
 * - `expandable.expandedRowRender`：返回一个**嵌套子 `<Table>`**（子表格，5 列：
 *   Date / Name / Status(Badge) / Upgrade Status / Action(Dropdown)），`pagination={false}`。
 * - `expandable.defaultExpandedRowKeys: ['0']`：初始展开 key='0' 的行。
 * - 三张主表演示 size：默认（large）/ `size="medium"` / `size="small"`。
 *
 * === data-grid 实现（S24）要点 ===
 *
 * - **M9 复用，引擎零改动**：M9 的 `expandedRowRender` 渲染任意 ReactNode
 *   （GridTable.renderExpandedContents 把返回内容放进 `dg-row-expanded` div，
 *    grid-column: 1 / -1 跨整行）。嵌套 `<Table>` 只是其中一种 ReactNode——
 *   它是独立的 `<Table>` 实例（自己的 columns/dataSource/size），与主表正交，
 *   能正常渲染（grid 布局嵌套：子 Table 自己的 dg-grid 容器，独立 grid 上下文）。
 *
 * - **antd 组件复用**（决策 6）：子表 Status 用 antd `<Badge>`、Action 用 antd `<Space>`
 *   + `<Dropdown>`（表格非核心部位用 antd）。`DownOutlined` 左栏内联 SVG
 *   （**不 import @ant-design/icons**——与 custom-filter-panel / drag-sorting-handler 约定一致）。
 *
 * === 两侧保留的差异 ===
 *
 * - 嵌套子表实现：左栏子表是 data-grid `<Table>`（独立 grid 上下文）；右栏子表是真实 antd `<Table>`。
 * - size 类型：data-grid `medium` = antd `middle`（antd v6 也接受 `medium` 别名，视觉一致）。
 * - DownOutlined：左栏内联 SVG（不依赖 @ant-design/icons）；右栏 antd demo 用
 *   `@ant-design/icons` 的 `DownOutlined`（antd 间接依赖，本就可用）。
 *
 * === 验证点（S24 + 决策 9）===
 *
 * 1. 主表第一列为展开图标列；key='0' 的行初始展开（defaultExpandedRowKeys）。
 * 2. 展开内容为一个**嵌套子 Table**（5 列）：Date / Name / Status(Badge "Finished") /
 *    Upgrade Status / Action(Pause/Stop 链接 + More 下拉)。
 * 3. 子表 `pagination={false}`（不渲染分页器，3 行全显）。
 * 4. 点击其它行展开图标可展开/收起。
 * 5. 顶部 Segmented size（large/medium/small）同时驱动两侧主表 —— 两侧同步。
 *
 * === 拆子文件（task：live 编辑接入，同 basic/expand 模式）===
 *
 * 父文件只保留「外壳职责」：size state（父控制条 Segmented 直接驱动）+ useVirtualization +
 * DemoToolbar(Segmented size) + SplitDemo 外壳 + children 对照说明。
 * 两侧表格 JSX + columns + expandable（嵌套子 Table + defaultExpandedRowKeys）拆到子文件：
 *   - `./nested-table.dg`：`NestedTableDg({size, virtual})`（左栏）
 *   - `./nested-table.antd`：`NestedTableAntd({size, virtual})`（右栏）
 *
 * ★ 状态提升说明：size 必须留父——父渲染顶部 Segmented 控制条需直接读写它；且同一 state
 *   驱动两侧同步。子组件接 size + virtual props（配置型 state 提升，默认值 'large' 合理有效）。
 *   defaultExpandedRowKeys 是配置型初值（非受控），随 expandable 在子组件内派生即可，无需提升。
 */

import { useState } from 'react'
import { Segmented, Space, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（仅外层主表，内层子表保持非虚拟）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + columns + expandable（嵌套子 Table）由子组件提供（props 驱动）。
//   RecordType/ExpandedDataType/dataSource/expandDataSource/items 现在由子文件各自 import
//   nested-table.shared；父文件不再需要。
import NestedTableDg from './nested-table.dg'
import NestedTableAntd from './nested-table.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

// 共享 size 类型：'large'/'medium'/'small' 在两侧都被接受
// （data-grid 用 'medium'（= 'middle'）；antd v6 也接受 'medium' 别名（= 'middle'））。
type SharedSize = 'large' | 'medium' | 'small'

export default function NestedTableDemo() {
  // ★ 共享状态：同一个 size 同时驱动两侧主表。
  const [size, setSize] = useState<SharedSize>('large')
  // 全局虚拟化开关接入：开关 ON 时两栏主表叠加 virtual=true + scroll.y
  // ★ virtual 仅加在外层主表；内层子表（expandable.expandedRowRender 返回的）是展开内容，
  //   保持非虚拟、不动（与决策2一致——展开内容不参与虚拟窗口大小）。
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。 */}
      <DemoToolbar>
        <Space>
          <Segmented
            value={size}
            onChange={(val) => setSize(val as SharedSize)}
            options={[
              { label: 'large', value: 'large' },
              { label: 'medium', value: 'medium' },
              { label: 'small', value: 'small' },
            ]}
          />
          <span style={{ color: token.colorTextTertiary, fontSize: 12 }}>
            size 同时驱动两侧主表（antd demo 原本三表静态展示，决策 9 下改为单表 + size 切换）
          </span>
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=480（嵌套子表内容稍宽，主表 7 列 + 子表 5 列无 scroll.x）→
        横排阈值 ≈ 976。常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<NestedTableDg size={size} virtual={virtual} />}
        right={<NestedTableAntd size={size} virtual={virtual} />}
      >
        <div>
          <strong>对照说明（决策 9 B10 / S24 嵌套子表格）：</strong>
          左右并排呈现 data-grid 与 antd nested-table demo（expandedRowRender 返回嵌套子 Table +
          defaultExpandedRowKeys: ['0'] + size 切换）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>嵌套子表实现</strong>：左栏子表是 data-grid <code>&lt;Table&gt;</code>
              （独立 grid 上下文，与主表正交）；右栏子表是真实 antd <code>&lt;Table&gt;</code>。
            </li>
            <li>
              <strong>初始展开</strong>：key='0' 的行初始展开（<code>defaultExpandedRowKeys: ['0']</code>）；
              展开内容为 5 列子表（Date / Name / Status(Badge "Finished") / Upgrade Status / Action），
              <code> pagination={'{false}'}</code> 不分页。
            </li>
            <li>
              <strong>size 三档</strong>：顶部 Segmented 切换 large/medium/small，
              <strong> 同一档 size 同时驱动两侧主表</strong>（antd demo 原本三表静态展示，
              决策 9 下改为单表 + size 切换，对照更直观）。
            </li>
            <li>
              <strong>DownOutlined 差异</strong>：左栏内联 SVG（不依赖 @ant-design/icons）；
              右栏 antd demo 用 <code>@ant-design/icons</code> 的 <code>DownOutlined</code>
              （antd 间接依赖）。视觉等价。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
