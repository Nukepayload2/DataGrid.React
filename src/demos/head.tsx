/**
 * 复刻 antd head demo（排序 + 筛选）：`G:\Projects\ant-design\components\table\demo\head.tsx`。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为对齐 antd（Name sorter+filters / Age sorter+defaultSortOrder /
 *   Address filters 默认多选 / Table 级 showSorterTooltip / onChange console.log / pagination={{}}）。
 * - **右栏（antd Table）**：忠实复刻 antd head demo（antd 原生 sorter/filters/onFilter/filterMultiple +
 *   antd 原生 filter 下拉 Checkbox/Radio + 确定/重置）。
 * - **共享控制条**：`Bordered` 开关 + `Reset` 按钮（antd head demo 原本无控制条，此处加最小开关便于对照
 *   「有/无边框」下两侧行为是否一致；Reset 用 React key remount 两侧 Table 一次清空所有排序/筛选草稿
 *   与激活态——避免引入受控语义破坏 head demo 的非受控本质）。
 * - **共享数据**：`RecordType` + `data` 见 `_compare/head.shared.ts`。
 *
 * === antd demo 要素（排序 + 筛选共存）===
 *
 * - Name 列：`sorter: (a,b) => a.name.length - b.name.length`（按名字字符串长度排序），
 *   `sortDirections: ['descend']`（点击循环：null → descend → null，不经过 ascend），
 *   `showSorterTooltip: { target: 'full-header' }`（hover 整表头格提示）。
 *   同时带 `filters`（Joe/Jim/Submenu→Green/Black）+ `onFilter`（按名字起始匹配）——
 *   排序 + 筛选共存（S1 + S3 组合，head demo 核心场景）。
 * - Age 列：`sorter: (a,b) => a.age - b.age`（数值排序），`defaultSortOrder: 'descend'`（初始降序）。无筛选。
 * - Address 列：带 `filters`（London/New York）+ `onFilter`（按地址起始匹配），无 sorter。
 *   默认多选（Checkbox）——与官方 antd demo 逐字一致（官方 head.tsx 此列无 filterMultiple）。
 * - Table 级 `showSorterTooltip: { target: 'sorter-icon' }`（默认 tooltip 绑定到排序图标）。
 * - `onChange(pagination, filters, sorter, extra)`：点击排序/应用筛选触发，console.log 各参数。
 *
 * === 两侧保留的差异 ===
 *
 * 1. **filter 下拉控件**：
 *    - 左栏 data-grid：FilterDropdown 自绘（决策 6 非核心部位用 antd Dropdown/Checkbox/Radio/Button，
 *      但由引擎 FilterDropdown 组件统一渲染）。
 *    - 右栏 antd：antd 原生 filter 下拉（Checkbox/Radio + OK/Reset Button）。
 *    - 两侧行为对齐 antd 6.4.4（filterOnClose 默认 / confirm 应用 / clearFilters 草稿不立即清表）。
 * 2. **Submenu（filters children）属 S7 树形筛选**：
 *    - 左栏 data-grid：扁平化为顶层项参与勾选（不做二级菜单 UI——data-grid 现状，S7 已知简化）。
 *    - 右栏 antd：antd demo 同样声明了 Submenu→children，antd 原生 menu 模式会渲染二级菜单——
 *      **右栏如实呈现 antd 行为**（点 Submenu 弹出二级 Green/Black）。
 *    - 两侧 filters 数据结构完全一致（逐字 antd demo），差异仅在渲染层（一级 vs 二级菜单 UI）。
 *
 * === S5 经验（验证者勿误判）===
 *
 * 1. **clearFilters() 不立即清表**：`clearFilters()` 无参默认 `{confirm:false}`，点 Reset 只清草稿
 *    （Input 清空）、不立即清表，需再 Search（confirm 空草稿）或关闭下拉（filterOnClose）才回全量。
 *    与 antd `onReset`（ant-design\components\table\hooks\useFilter\FilterDropdown.tsx:298-315）逐字一致。
 * 2. **sortDirections 第三次回 null**：`sortDirections:['descend','ascend']` 第三次点击回 null 是
 *    antd 本身循环（antd `nextSortDirection` 与 data-grid `useSorter.ts:163-171` 逐字相同）。
 *
 * === 拆子文件（task：live 编辑接入，同 basic 模式）===
 *
 * 父文件只保留「外壳职责」：bordered/remountKey state + useVirtualization + DemoToolbar(Switch Bordered
 * + Reset Button) + SplitDemo 外壳 + children 对照说明。两侧表格 JSX 与 columns + onChange 拆到子文件：
 *   - `./head.dg`：`HeadDg({bordered, virtual, remountKey})`（左栏）
 *   - `./head.antd`：`HeadAntd({bordered, virtual, remountKey})`（右栏）
 *
 * ★ 状态提升说明：bordered 必须留父（控制条 Switch 直接读写）；remountKey 必须留父（控制条 Reset
 *   按钮递增它），并以 prop 下发子组件，子组件把它应用到内部 `<Table key={...}>` 强制 remount 清空
 *   排序/筛选草稿（head demo 排序/筛选非受控，不能通过受控 setState 重置）。排序/筛选瞬时态由 Table
 *   内部自管（非受控），不提升。
 *
 * 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `HeadDemo`，零编辑开销；
 * live 编辑模式 SplitDemoPreview 静态 import 真实子组件并按 editedDg/editedAntd 替换。
 */

import { useState } from 'react'
import { Button, Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（SplitDemo pane 自动限高，虚拟窗口才有滚动区）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + columns + onChange 由子组件提供（props 驱动）。RecordType/data
//   现在由子文件各自 import head.shared；父文件不再需要。
import HeadDg from './head.dg'
import HeadAntd from './head.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function HeadDemo() {
  // ★ 共享状态（提升到父）：同一个状态同时驱动两侧表格 + 顶部控制条。
  const [bordered, setBordered] = useState(false)
  // Reset trick：递增 remountKey 强制两侧 Table 重新挂载，清空所有排序/筛选草稿与激活态
  // （不引入受控 filteredValue/sortOrder，保持 head demo 非受控本质）。
  const [remountKey, setRemountKey] = useState(0)
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y（原 head demo 无 scroll，
  // ON 用 dg {y:true}/antd {y:280}；OFF 回 undefined，行为与改造前一致）。
  const { virtual } = useVirtualization()

  const handleReset = () => setRemountKey((k) => k + 1)

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
          <Button onClick={handleReset}>Reset (remount both)</Button>
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=480（窄表，3 列无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <HeadDg
            bordered={bordered}
            virtual={virtual}
            remountKey={remountKey}
          />
        }
        right={
          <HeadAntd
            bordered={bordered}
            virtual={virtual}
            remountKey={remountKey}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B5）：</strong>
          左右并排呈现 data-grid 与 antd head demo（排序 + 筛选共存，S1 + S3）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>Name</strong>：<code>sorter</code> 按名字长度 + <code>sortDirections: ['descend']</code>
              （点击循环 null → descend → null）；同时带 <code>filters</code>（Joe/Jim/Submenu→Green/Black，
              多选 Checkbox）+ <code>onFilter</code>。★ Submenu：左栏 data-grid 扁平化为顶层项（S7 已知简化），
              右栏 antd 原生 menu 二级（点 Submenu 弹 Green/Black）。
            </li>
            <li>
              <strong>Age</strong>：<code>sorter</code> 数值 + <code>defaultSortOrder: 'descend'</code>（初始降序）。
            </li>
            <li>
              <strong>Address</strong>：<code>filters</code>（London/New York）+ <code>onFilter</code>，
              默认多选 Checkbox（与官方 antd demo 逐字一致——两侧均无 filterMultiple）。
            </li>
            <li>
              <strong>filterOnClose=true</strong>（默认）：勾选后点外部/ESC 关闭即应用；确定按钮也应用；
              重置按钮清草稿（S5 经验：<code>clearFilters()</code> 无参默认 <code>{'{confirm:false}'}</code>，
              点 Reset 只清草稿不立即清表，与 antd <code>onReset</code> 一致，<strong>勿误判</strong>）。
            </li>
            <li>
              <strong>排序+筛选叠加</strong>：raw → sort → filter（与 antd 一致）。打开 console 查看 onChange
              参数（filters 形态 <code>{'{ [key]: value[] | null }'}</code>，extra.action='filter'/'sort'）。
            </li>
            <li>
              <strong>sortDirections 第三次回 null</strong>（S5 经验）：data-grid 与 antd
              <code>nextSortDirection</code> 逐字相同，耗尽回 null 是 antd 本身循环，<strong>勿误判</strong>。
            </li>
            <li>
              <strong>Bordered 开关</strong>：同时切换两侧边框。 <strong>Reset 按钮</strong>：递增 React key
              强制两侧 Table 重新挂载，清空所有排序/筛选草稿与激活态（不引入受控语义）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
