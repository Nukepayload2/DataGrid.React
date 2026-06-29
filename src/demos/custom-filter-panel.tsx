/**
 * 复刻 antd custom-filter-panel demo：
 *   `G:\Projects\ant-design\components\table\demo\custom-filter-panel.tsx`。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（filterDropdown + filterIcon + filterDropdownProps
 *   + onFilter + confirm/clearFilters/close + react-highlight-words 高亮 + Address 列 sorter）。
 *   内联 SearchOutlined SVG（不直接依赖 @ant-design/icons）；HTMLInputElement ref。
 * - **右栏（antd Table）**：忠实复刻 antd custom-filter-panel demo（antd 原生 filterDropdown + antd
 *   原生 <Input> + antd <Button> + antd InputRef + react-highlight-words）。
 * - **共享控制条**：`Bordered` 开关（antd custom-filter-panel demo 原本无控制条，此处加最小开关便于
 *   对照「有/无边框」两侧行为是否一致）。
 * - **共享数据**：`RecordType` + `data` + `DataIndex` 见 `_compare/custom-filter-panel.shared.ts`。
 *
 * === 两侧状态独立（忠实各自复刻）===
 *
 * filterDropdown 内的搜索词（searchText/searchedColumn/searchInput）属该 demo 的**局部交互状态**，
 * 强行共享会割裂两侧「忠实各自复刻」语义（点左栏搜索不应影响右栏的搜索词，对照价值在于看两栏
 * 独立操作下行为是否一致）。故两侧各自独立维护 searchText/searchedColumn/searchInput，
 * `getColumnSearchProps` 工厂两侧各自实现（data-grid ColumnType / antd TableColumnType 类型不同）。
 * 这与 head/multiple-sorter 共享控制条只放 Bordered（不变状态）的策略一致。
 * 拆子文件后此状态仍**留在各自子组件内自管**（`useDgColumnSearch`/`useAntdColumnSearch` hook），
 * 不提升父——父控制条只有 Bordered（不变状态）。
 *
 * === antd demo 要素（S5 自定义筛选面板）===
 *
 * - 三列均用 `getColumnSearchProps(dataIndex)` 工厂注入自定义筛选配置：
 *     * `filterDropdown`：自定义下拉（antd Input 搜索框 + Space[Search/Reset/Filter/close] 四按钮）。
 *       注入 props（data-grid 与 antd 同签名）：
 *         - `setSelectedKeys` / `selectedKeys`：搜索词草稿（Input.value ↔ selectedKeys[0]）。
 *         - `confirm({ closeDropdown })`：应用搜索词为该列 filteredValue；closeDropdown 控制是否关闭。
 *         - `clearFilters()`：清空（Reset）。
 *         - `close()`：仅关闭下拉（不应用）。
 *       Input.onPressEnter / Search 按钮 → handleSearch（confirm + 记录 searchText/searchedColumn 用于高亮）。
 *       Reset 按钮 → handleReset（clearFilters + 清 searchText）。
 *       Filter 按钮 → confirm({ closeDropdown: false })（应用但保持打开）。
 *       close 按钮 → close()。
 *     * `filterIcon: (filtered) => <SearchOutlined color={filtered ? '#1677ff' : undefined}/>`：
 *       自定义漏斗图标（用放大镜；激活态蓝色）。
 *     * `onFilter: (value, record) => record[dataIndex].includes(value)`：useFilter 用此过滤。
 *     * `filterDropdownProps.onOpenChange(open)`：打开时 setTimeout 聚焦 Input。
 *     * `render: (text) => searchedColumn === dataIndex ? <Highlighter .../> : text`：
 *       命中单元格文本高亮（react-highlight-words）。
 *
 * === data-grid 实现要点（S5）===
 *
 * - filterDropdown 取代内置 Checkbox/Radio 下拉（引擎 FilterDropdown 把它渲染进 antd Dropdown popupRender，
 *   注入 antd 兼容 FilterDropdownProps）。
 * - selectedKeys 经 confirm 应用为 filteredValue → useFilter 用 onFilter 过滤（与 S3 同机制）。
 * - filterIcon 覆盖默认漏斗（放大镜 + 激活态蓝）。
 * - filterDropdownProps.onOpenChange 透传（聚焦 Input）。
 *
 * === 两侧保留的差异 ===
 *
 * 1. **SearchOutlined 来源**：
 *    - 左栏 data-grid：内联 SVG（`@ant-design/icons` 未在 package.json 声明，仅 antd 间接依赖；
 *      与改造前 demo 决策一致，不引入未声明依赖；SVG path 与 antd 官方完全相同，视觉零差异）。
 *    - 右栏 antd：antd 官方原 demo 直接 `import { SearchOutlined } from '@ant-design/icons'`——
 *      但本项目 package.json 未声明该包（仅 antd 间接依赖）。为避免引入未声明直接依赖触发 lint/build 问题，
 *      右栏**同样使用内联 SVG**（与左栏共用 `SearchOutlined` 组件），视觉与 antd 原生 SearchOutlined
 *      完全一致（同一 SVG path）。这是「忠实复刻」的工程化折中：图标视觉零差异，仅 import 来源不同。
 * 2. **Input ref 类型**：
 *    - 左栏 data-grid：`HTMLInputElement`（原生 input ref，antd Input ref 透传到内部 input，select() 一致）。
 *    - 右栏 antd：`InputRef`（antd Input ref，与官方 demo 一致）。
 * 3. **FilterDropdownProps 类型来源**：
 *    - 左栏：从 `../table` 导出（data-grid 导出，与 antd `antd/es/table/interface` 同签名）。
 *    - 右栏：从 `antd` 主入口导入（与 antd `antd/es/table/interface` 签名等价，antd 主入口 re-export；
 *      子路径 'antd/es/table/interface' 不在 scope.ts baseScope，故改主入口 import 保 live scope 纯净）。
 *
 * === S5 经验（验证者勿误判）===
 *
 * 1. **clearFilters() 不立即清表**：`clearFilters()` 无参默认 `{confirm:false}`，点 Reset 只清草稿
 *    （Input 清空）、不立即清表，需再 Search（confirm 空草稿）或关闭下拉（filterOnClose）才回全量。
 *    与 antd `onReset`（`ant-design\components\table\hooks\useFilter\FilterDropdown.tsx:298-315`）逐字一致。
 * 2. **sortDirections 第三次回 null**（本 demo Address 列 `sortDirections: ['descend','ascend']`）：
 *    第三次点击回 null 是 antd 本身循环（antd `nextSortDirection` 与 data-grid `useSorter.ts:163-171`
 *    逐字相同），勿误判。
 *
 * === 拆子文件（task：live 编辑接入，同 basic 模式）===
 *
 * 父文件只保留「外壳职责」：bordered state + useVirtualization + DemoToolbar(Switch Bordered)
 * + SplitDemo 外壳 + children 对照说明。两侧表格 JSX + columns + getColumnSearchProps 工厂 +
 * 内联 SearchOutlined + 搜索 state（searchText/searchedColumn/searchInput，局部交互自管）拆到子文件：
 *   - `./custom-filter-panel.dg`：`CustomFilterPanelDg({bordered, virtual})`（左栏）
 *   - `./custom-filter-panel.antd`：`CustomFilterPanelAntd({bordered, virtual})`（右栏）
 *
 * ★ 状态提升说明：bordered 必须留父（控制条 Switch 直接读写）。filterDropdown 内搜索词
 *   （searchText/searchedColumn/searchInput）属局部交互态，子组件各自自管（不提升），原因见
 *   「两侧状态独立」段——强行共享会割裂两侧「忠实各自复刻」语义。
 *
 * 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `CustomFilterPanelDemo`，零编辑开销；
 * live 编辑模式 SplitDemoPreview 静态 import 真实子组件并按 editedDg/editedAntd 替换。
 *
 * === 验证点（S5）===
 *
 * 1. 三列表头均为放大镜图标（非默认漏斗）。
 * 2. 点 Name 放大镜 → 弹出自定义面板（Input + 4 按钮）；输入 "John" → 点 Search → 表格只剩含 John 的行；
 *    放大镜变蓝（激活）；Name 列单元格命中文本高亮（黄色背景）。
 * 3. 点 Reset → 清空搜索词，表格回到全量；放大镜恢复灰。
 * 4. 点 Filter（confirm closeDropdown:false）→ 应用搜索词但下拉保持打开。
 * 5. 点 close → 关闭下拉（不改变已应用筛选）。
 * 6. 再次打开下拉，Input 自动聚焦（filterDropdownProps.onOpenChange + setTimeout select）。
 * 7. Address 列同时带 sorter（点击表头排序），与自定义筛选共存。
 * 8. 回归：head / reset-filter / multiple-sorter demo 不受影响。
 */

import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（SplitDemo pane 自动限高，虚拟窗口才有滚动区）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + columns + getColumnSearchProps 工厂 + 内联 SearchOutlined +
//   搜索 state（局部交互自管）由子组件提供（props 驱动）。RecordType/data/DataIndex
//   现在由子文件各自 import custom-filter-panel.shared；父文件不再需要。
import CustomFilterPanelDg from './custom-filter-panel.dg'
import CustomFilterPanelAntd from './custom-filter-panel.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function CustomFilterPanelDemo() {
  // ★ 共享控制条状态：Bordered 开关同时驱动两侧。
  const [bordered, setBordered] = useState(false)
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y（原 custom-filter-panel demo 无
  // scroll，ON 用 dg {y:true}/antd {y:280}；OFF 回 undefined，行为与改造前一致）。
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。Bordered 开关同时驱动两侧。
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
        minPaneWidth=480（窄表，3 列；Name/Age 有 width 百分比 + Address 自适应）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <CustomFilterPanelDg bordered={bordered} virtual={virtual} />
        }
        right={
          <CustomFilterPanelAntd bordered={bordered} virtual={virtual} />
        }
      >
        <div>
          <strong>对照说明（决策 9 B6）：</strong>
          左右并排呈现 data-grid 与 antd custom-filter-panel demo（S5 自定义筛选面板）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              三列均用 <code>filterDropdown</code>（antd Input 搜索 + Search/Reset/Filter/close 四按钮）
              + <code>filterIcon</code>（放大镜，激活态 <code>colorPrimary</code>）+ <code>onFilter</code>
              + <code>filterDropdownProps.onOpenChange</code>（打开时聚焦 Input）。
            </li>
            <li>
              <code>confirm()</code> 应用搜索词；<code>confirm({'{ closeDropdown: false }'})</code>
              应用但保持打开；<code>clearFilters()</code> 清空（Reset）；<code>close()</code> 仅关闭。
              命中单元格文本高亮（react-highlight-words，<code>colorWarningBorderHover</code>
              —— 对齐 antd 官方 custom-filter-panel 的高亮浅黄 <code>#ffc069</code>；
              light <code>#ffd666</code> 最接近，dark 跟随主题）。
            </li>
            <li>
              <strong>Address 列</strong>同时支持 <code>sorter</code>（点表头排序）+
              <code>sortDirections: ['descend','ascend']</code>，与自定义筛选共存。
            </li>
            <li>
              <strong>两侧状态独立</strong>（忠实各自复刻）：filterDropdown 内搜索词属局部交互，
              点左栏搜索不影响右栏——对照价值在于看两栏独立操作下行为是否一致（面板 UI / 应用/重置
              语义 / 高亮 / 放大镜激活态）。
            </li>
            <li>
              <strong>Bordered 开关</strong>：同时切换两侧边框。
            </li>
            <li>
              <strong>已知正确行为勿误判</strong>：① <code>clearFilters()</code> 无参默认
              <code>{'{confirm:false}'}</code>，点 Reset 只清草稿不立即清表，需再 Search 或关闭下拉
              才回全量——与 antd <code>onReset</code> 逐字一致。② Address 列
              <code>sortDirections</code> 第三次回 null 是 antd 本身循环（data-grid 与 antd
              <code>nextSortDirection</code> 逐字相同）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
