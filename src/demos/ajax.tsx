/**
 * 复刻 antd ajax demo：`G:\Projects\ant-design\components\table\demo\ajax.tsx`。
 *
 * === 决策 9 双栏对照（S12 远程数据 + loading）===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致——loading 态（Spin）+ 服务端分页/排序/筛选
 *   （受控 pagination + onChange 触发请求）+ preserveSelectedRowKeys 跨页保留勾选。
 * - **右栏（antd Table）**：忠实复刻 antd ajax demo（antd 原生 `<Table>` + loading + 受控分页 +
 *   onChange）。**唯一改动**：antd demo 原用真实 fetch 外部 mockapi.io，本 demo 统一改用本地
 *   mock（`_compare/ajax.shared.ts` 的 `queryData`，左右两栏共用），避免网络依赖（决策 6 +
 *   任务规约避免副作用）。
 * - **共享控制条**：无独立控制条（antd ajax demo 原本无控制条）。
 *
 * === ★ 异步加载 state 拆子文件后各自独立（SOP + 类 edit-cell 模式）===
 *
 * 改造前（单文件）：两侧共用同一组 state（tableParams / loading / data / selectedRowKeys），
 * 任一侧 onChange 都写回共享 tableParams → 触发同一个 useEffect → 同一份 data 同时回填两侧。
 *
 * 拆子文件后（按 SOP「交互 state 含异步加载/loading/分页/排序/筛选/选择/展开 优先留子组件内
 * 自管；仅当父控制条需直接操作时才提升父」）：本 demo 无外部控制条，故 data / loading /
 * tableParams / selectedRowKeys + fetchData + useEffect + handleTableChange + onSelectChange
 * 全部留各侧子组件内自管。两栏从「共享同一组 state」改为「各自独立 state」——任一侧 onChange
 * 只刷新该侧（不再跨栏同步）。这是拆子文件后的天然结果，与 edit-cell demo 的「编辑各自独立」
 * 同构。功能演示（loading + 服务端分页/排序/筛选 + preserveSelectedRowKeys 跨页保留）完整保留，
 * 两侧行为各自等价于改造前。
 *
 * === 共享数据 ===
 *
 * `RecordType` + `MOCK_DATA` + `queryData` 见 `_compare/ajax.shared.ts`，两侧复用同一 mock 数据源
 * + 同一服务端逻辑（保证 diff 对照公平）。
 *
 * === antd demo 要素（S12 远程数据 ajax + loading）===
 *
 * - columns：Name（`sorter: true`，服务端排序）/ Gender（filters male/female，服务端筛选）/ Email。
 * - state：`data`（当前页数据）/ `loading`（请求中）/ `tableParams`（受控 pagination + filters +
 *   sortField/sortOrder）/ `selectedRowKeys`（受控 + preserveSelectedRowKeys）。
 * - `fetchData`：`setLoading(true)` → 请求 → `setData` + `setLoading(false)` + `setPagination.total`。
 * - `useEffect[deps]` → `fetchData`（current/pageSize/sortOrder/sortField/filters 变化即重新请求）。
 * - `handleTableChange(pagination, filters, sorter)` → `setTableParams`（触发 useEffect）。
 * - `rowSelection`：**受控** selectedRowKeys + **preserveSelectedRowKeys: true**（跨页保留）。
 *   翻第 2 页勾几行 → 回第 1 页 → 再翻第 2 页，勾选保留。
 * - `loading={loading}` / `pagination={tableParams.pagination}`（受控）/ `rowKey="id"`。
 *
 * === 服务端模式机制（对齐 antd，data-grid §9 S12 已修）===
 *
 *   - 引擎复用 S11 受控分页（pagination.current/pageSize/total 受控）+ S1 sorter + S3 filters。
 *   - **slicePage server 模式检测**（data.grid `data.length < total` 不切片，对齐 antd
 *     `InternalTable.tsx:547-556`）——服务端场景 dataSource 已是当前页切片，引擎不再二次切片。
 *   - **filterable 放宽**：filters/filterDropdown/onFilter 任一即可（onFilter 非必需）——
 *     server 筛选无 onFilter 也渲染漏斗。
 *   - **激活态门**：纯 filters 无 onFilter 列也回填 filteredValue → 漏斗激活态生效。
 *
 * === 两侧保留的差异 ===
 *
 * 1. **数据源**：左栏 data-grid 与右栏 antd 均用同一本地 mock（`queryData`），区别于 antd 官方
 *    demo 的真实 fetch。机制（loading + 异步回填）与 antd 等价。
 * 2. **preserveSelectedRowKeys**：两侧均显式 `true`（对齐 antd ajax demo 风格——antd 官方 ajax
 *    demo 未演示勾选，本 demo 加上勾选以对照 preserveSelectedRowKeys 跨页保留）。
 * 3. **state 各自独立**：拆子文件后两栏不再共享 state，任一侧 onChange 只刷新该侧（类 edit-cell）。
 *
 * === 验证点（S12 + 决策 9）===
 *
 * 1. loading 态：首次进入 + 每次 onChange（翻页/排序/筛选）→ 该侧表格 Spin 转圈约 800ms
 *    → 数据刷新（两侧各自独立触发）。
 * 2. 服务端分页：翻页 → 触发该侧 useEffect → queryData → 数据刷新。
 * 3. 服务端排序：点 Name 表头 → ascend/descend → 全量按 name 排序后切片。
 * 4. 服务端筛选：Gender 漏斗选 male/female → 全量按 gender 筛选 + total 更新为筛选后长度。
 * 5. preserveSelectedRowKeys：第 2 页勾选 → 翻回第 1 页 → 翻回第 2 页，勾选保留。
 * 6. 回归：其它 demo（basic/head/...）未传 loading → 不包 Spin。
 *
 * === 拆子文件（task：live 编辑接入，自包含 pane 模式，类 edit-cell）===
 *
 * 父文件只保留「外壳职责」：useVirtualization + SplitDemo 外壳 + children 对照说明。
 * 两侧表格 JSX + columns + 异步加载 state + fetchData/useEffect/handleChange/onSelectChange
 * 拆到子文件（各自独立 state，不再共享）：
 *   - `./ajax.dg`：`AjaxDg({virtual})`（左栏）
 *   - `./ajax.antd`：`AjaxAntd({virtual})`（右栏）
 *
 * 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `AjaxDemo`，零编辑开销；
 * live 编辑模式 SplitDemoPreview 静态 import 真实子组件并按 editedDg/editedAntd 替换。
 * 子组件 props 全部带默认值（virtual=false），编辑态超集 props {bordered,virtual,size,autoScroll}
 * 不全也不崩（异步加载 state 全在子组件内自管）。
 */

import { SplitDemo } from './_compare/SplitDemo'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（loading×virtual 共存是已知 §9 简化）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + columns + 异步加载 state 由子组件提供（props 驱动）。
//   RecordType/queryData 现在由子文件各自 import ajax.shared；父文件不再需要。
import AjaxDg from './ajax.dg'
import AjaxAntd from './ajax.antd'

export default function AjaxDemo() {
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y（loading 态 Spin 与 virtual
  // 共存是已知 §9 简化——Spin 可能破坏 data-area flex 链高度，正常接入即可）。
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/*
        minPaneWidth=600（含 3 列 + email 宽列，无 scroll.x 但 email 列较长）→ 横排阈值 ≈ 1216。
        常规笔记本视口（≥1280）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={600}
        left={<AjaxDg virtual={virtual} />}
        right={<AjaxAntd virtual={virtual} />}
      >
        <div>
          <strong>对照说明（决策 9 B14 / S12 远程数据 + loading）：</strong>
          左右并排呈现 data-grid 与 antd ajax demo（loading + 服务端分页/排序/筛选 +
          preserveSelectedRowKeys）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>★ state 各自独立</strong>：拆子文件后，<code>tableParams</code> /
              <code> loading</code> / <code>data</code> / <code>selectedRowKeys</code> +
              <code> fetchData</code> + <code>useEffect</code> + <code>handleTableChange</code> +
              <code> onSelectChange</code> 全部留各侧子组件内自管（按 SOP「交互 state 含异步加载/
              loading/分页/排序/筛选/选择 优先留子组件内自管」，类 edit-cell 模式）。任一侧 onChange
              只刷新该侧（不再跨栏同步），功能演示完整保留。
            </li>
            <li>
              <strong>loading 态</strong>：首次进入 + 每次 onChange → 该侧表格 Spin 转圈约
              800ms（本地 mock + setTimeout，替代 antd demo 的真实 fetch，避免网络依赖）。
            </li>
            <li>
              <strong>服务端模式</strong>：受控 pagination（current/pageSize/total）+ onChange
              触发请求。data-grid §9 S12 已修：slicePage server 检测（data.length&lt;total 不切片）+
              filterable 放宽（无 onFilter 也渲染漏斗）+ 激活态门同步。
            </li>
            <li>
              <strong>preserveSelectedRowKeys</strong>：两侧均 <code>true</code>（跨页保留勾选）；
              第 2 页勾选 → 翻回第 1 页 → 翻回第 2 页，勾选保留。
            </li>
            <li>
              <strong>数据源</strong>：左右两栏均用同一本地 mock（<code>queryData</code>，100 条），
              机制与 antd demo 等价（loading + 异步回填）；区别于 antd 官方 demo 的真实 fetch。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
