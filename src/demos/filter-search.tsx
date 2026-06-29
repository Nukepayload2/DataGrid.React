/**
 * 复刻 antd filter-search demo：`G:\Projects\ant-design\components\table\demo\filter-search.tsx`。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为对齐 antd（Name `filterMode:'tree'` + filterSearch:true +
 *   filters 扁平 3 项 [Joe/Category 1/Category 2]；Address filters + filterSearch:true / Age sorter /
 *   onChange console.log / pagination={{}}）。
 *   ★ 与官方 antd filter-search.tsx:30 逐字一致（Name 列带 `filterMode: 'tree'`）。
 * - **右栏（antd Table）**：忠实复刻 antd filter-search demo（Name `filterMode:'tree'` + filterSearch +
 *   filters 扁平 3 项 [Joe/Category 1/Category 2]；Address filterSearch + filters；Age sorter）。
 * - **共享控制条**：`Bordered` 开关（antd filter-search demo 原本无控制条，此处加最小开关便于对照
 *   「有/无边框」下两侧 filterSearch 行为是否一致）。
 * - **共享数据**：`RecordType` + `data` 见 `_compare/filter-search.shared.ts`。
 *
 * === antd demo 要素（S6 筛选项搜索 filterSearch）===
 *
 * - Name 列：`filters`（Joe / Category 1 / Category 2）+ `filterMode: 'tree'` +
 *   `filterSearch: true` + `onFilter: (value,record)=>record.name.startsWith(value)` + `width: '30%'`。
 *   树形 UI（antd `<Tree checkable>`）—— 两侧均带 filterMode:'tree'（与官方 antd demo 逐字一致）。
 * - Age 列：`sorter: (a,b)=>a.age-b.age`（数值排序），无 filterSearch、无筛选。
 * - Address 列：`filters`（London / New York）+ `filterSearch: true` +
 *   `onFilter: (value,record)=>record.address.startsWith(value)` + `width: '40%'`。
 * - `onChange(pagination, filters, sorter, extra)`：点排序/应用筛选触发，console.log 各参数。
 *
 * === S6 演示点（filterSearch · tree + menu 共存）===
 *
 * 1. filterSearch: true → filter 面板顶部渲染搜索框（放大镜前缀 + placeholder 'Search'）。
 * 2. menu 模式（Address 列）：输入实时过滤筛选项列表（默认匹配：item.text 转字符串 trim+toLowerCase
 *    后**包含**输入即命中）；输入空 → 显示全部；关闭下拉清空搜索值。
 * 3. tree 模式（Name 列）：输入搜索词后命中节点**高亮**（antd `<Tree>` `filterTreeNode` "highlight" 语义），
 *    不隐藏不匹配节点。
 * 4. 搜索框只过滤**显示/高亮**，不影响"已勾选的筛选值"——搜索与勾选状态解耦。
 *
 * === 两侧对齐说明 ===
 *
 * 两侧 Name 列均 `filterMode: 'tree'`、Address 列均默认 menu（无 filterMode），filters/onFilter/filterSearch
 * 逐字一致——两侧 tree/menu 共存行为完全对齐（data-grid FilterDropdown 用 antd `<Tree>`，视觉/交互对齐）。
 *
 * === 拆子文件（task：live 编辑接入，同 basic 模式）===
 *
 * 父文件只保留「外壳职责」：bordered state + useVirtualization + DemoToolbar(Switch Bordered)
 * + SplitDemo 外壳 + children 对照说明。两侧表格 JSX + columns + onChange 拆到子文件：
 *   - `./filter-search.dg`：`FilterSearchDg({bordered, virtual})`（左栏）
 *   - `./filter-search.antd`：`FilterSearchAntd({bordered, virtual})`（右栏）
 *
 * ★ 状态提升说明：bordered 必须留父（控制条 Switch 直接读写）。筛选非受控（不传受控
 *   filteredValue），由 Table 内部管理；filterSearch 渲染的顶部搜索框也由引擎/antd FilterDropdown
 *   内部管理（输入实时过滤/高亮筛选项，关闭下拉清空搜索值）——子组件**不需要**筛选 state props。
 *
 * 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `FilterSearchDemo`，零编辑开销；
 * live 编辑模式 SplitDemoPreview 静态 import 真实子组件并按 editedDg/editedAntd 替换。
 *
 * === 验证点（S6 + S7 共存对照）===
 *
 * 【Name 列 · tree 模式 filterSearch（两侧一致）】
 * 1. Name 漏斗 → 打开为 antd `<Tree checkable>`（3 项扁平，无 children 子节点）—— 两侧一致。
 * 2. 搜索框输入 'cat' → 命中节点 'Category 1/2' **高亮**（antd filterTreeNode "highlight" 语义），不隐藏 Joe。
 * 3. 输入 'joe' → Joe 节点高亮；输入空 → 无高亮（全部正常显示）。
 * 4. 关闭再打开 → 搜索框为空（关闭清空生效）。
 * 5. 勾 Joe → 表格只剩 name 以 'Joe' 开头的行（Joe Black，onFilter name.startsWith）。
 *
 * 【Address 列 · menu 模式 filterSearch（两侧一致）】
 * 6. Address 漏斗 → 打开下拉：顶部有搜索框（放大镜 + 'Search' placeholder）。
 * 7. 搜索 'lon' → 只显示 'London'（默认 contains，大小写不敏感）；输入空 → 显示全部。
 * 8. 勾 London → 只剩 address 以 'London' 开头的行。
 *
 * 【共享控制条】
 * 9. Bordered 开关：同时切换两侧边框。
 */

import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（SplitDemo pane 自动限高，虚拟窗口才有滚动区）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + columns + onChange 由子组件提供（props 驱动）。RecordType/data
//   现在由子文件各自 import filter-search.shared；父文件不再需要。
import FilterSearchDg from './filter-search.dg'
import FilterSearchAntd from './filter-search.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function FilterSearchDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y（原 filter-search demo 无 scroll，
  // ON 用 dg {y:true}/antd {y:280}；OFF 回 undefined，行为与改造前一致）。
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
        minPaneWidth=480（窄表，3 列无 scroll.x，Name 30% + Address 40%）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<FilterSearchDg bordered={bordered} virtual={virtual} />}
        right={<FilterSearchAntd bordered={bordered} virtual={virtual} />}
      >
        <div>
          <strong>对照说明（决策 9 B7）：</strong>
          左右并排呈现 data-grid 与 antd filter-search demo（S6 筛选项搜索 filterSearch）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>Name</strong>：<code>filters</code>（Joe/Category 1/Category 2）+
              <code>filterMode: 'tree'</code> + <code>filterSearch: true</code> +
              <code>onFilter: name.startsWith</code>。两侧均 antd <code>&lt;Tree checkable&gt;</code>
              树形（与官方 antd demo 逐字一致）。
            </li>
            <li>
              <strong>Age</strong>：<code>sorter</code> 数值排序（无 filterSearch、无筛选）。
            </li>
            <li>
              <strong>Address</strong>：<code>filters</code>（London/New York）+ <code>filterSearch: true</code>
              + <code>onFilter</code>（两侧均 menu 模式，行为完全一致）。
            </li>
            <li>
              <strong>tree 模式 filterSearch</strong>（两侧 Name）：输入搜索词后命中节点
              <strong>高亮</strong>（antd <code>filterTreeNode</code> "highlight" 语义），
              <strong>不隐藏</strong>不匹配节点——两侧一致。
            </li>
            <li>
              <strong>menu 模式 filterSearch</strong>（两侧 Address）：打开下拉顶部有搜索框
              （放大镜 + 'Search' placeholder）；输入实时过滤筛选项（item.text 转小写包含输入即命中，
              大小写不敏感）；输入空显全部；关闭清空搜索值——两侧一致。
            </li>
            <li>
              <strong>Bordered 开关</strong>：同时切换两侧边框。打开 console 查看 onChange 参数
              （filters 形态 <code>{'{ [key]: value[] | null }'}</code>，extra.action='filter'/'sort'）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
