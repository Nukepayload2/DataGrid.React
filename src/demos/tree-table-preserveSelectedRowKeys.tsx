/**
 * 复刻 antd tree-table-preserveSelectedRowKeys demo：
 * `G:\Projects\ant-design\components\table\demo\tree-table-preserveSelectedRowKeys.tsx`。
 *
 * === 决策 9 双栏对照（S14 树形 × 分页 × checkStrictly × preserveSelectedRowKeys）===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致——树形 × 分页 × checkStrictly ×
 *   preserveSelectedRowKeys 三场景（issue #50621）。
 * - **右栏（antd Table）**：忠实复刻 antd demo（antd 原生 `<Table>` + 树形 + 分页 + 原生
 *   checkStrictly + preserveSelectedRowKeys）。
 * - **共享控制条**：`CheckStrictly` + `preserveSelectedRowKeys` 两开关同时驱动两侧
 *   （默认 checkStrictly=false 父子联动 + preserve=true 翻页/折叠保留，对齐 antd demo），
 *   全宽置 SplitDemo 上方。
 * - **共享状态**：`checkStrictly` + `preserveSelectedRowKeys` state，两侧共用同一组
 *   （父控制条直接操作 → 提升父 + prop 传子）。rowSelection 的 onChange/... console.log
 *   各自独立（非跨栏同步选中态——本 demo 演示 preserve/checkStrictly 联动行为对照，勾选独立
 *   便于 diff 两侧行为差异）。
 * - **共享数据**：`RecordType` + `dataSource` 见 `_compare/tree-table-preserveSelectedRowKeys.shared.ts`。
 *
 * === antd demo 要素 ===
 *
 * - **15 个父行**（Edward 0..14），每父含 **2 个子行**（Brown / Jimmy）→ 树形模式。
 * - 3 列 Name/Age/Address。
 * - 顶部 **CheckStrictly** Switch（默认 **false** = 父子联动）。
 * - 顶部 **preserveSelectedRowKeys** Switch（默认 **true** = 翻页/折叠保留已选 key）。
 * - `rowSelection={{ checkStrictly, preserveSelectedRowKeys, onChange, onSelect }}`。
 * - `pagination={{ defaultPageSize: 5 }}`（15 父 → 3 页）。
 *
 * === S14 关键场景（issue #50621）===
 *
 * 组合：树形 × 分页 × `checkStrictly=false` × `preserveSelectedRowKeys=true`。
 *
 * - **跨页保留**：第 1 页勾选某父（联动勾选其全部含跨页子）→ 翻到第 2 页 → 回第 1 页，
 *   之前页选的父+子仍选中（preserve=true 保留 key）。
 * - **折叠保留**：展开父行→勾选子→折叠父行→子 key 仍在 selectedRowKeys（preserve 保留），
 *   再展开子仍是选中态。
 * - **联动跨页/折叠**：勾父→全部子（含折叠/跨页的）被勾；antd 递归 parentChildrenMap（全树，
 *   不受展开/分页影响）。
 *
 * === 引擎组合确认（无需修复）===
 *
 * - `usePagination.dataSourceLength = flattenedDataSource.length`：分页基于扁平化后可见行数。
 * - `slicePage(flattenedDataSource, ...)`：切片作用于扁平化后。
 * - `useRowSelection.dataSource = flattenedDataSource` + `parentChildrenMap = 全树`：
 *   父子联动基于全树结构，不受展开/分页影响。
 * - `fireSelectionChange` 存在性判定用**全树**（filteredDataSource 递归 walk children）。
 *
 * === 两侧保留的差异 ===
 *
 * 1. **checkStrictly 默认值（§9 S13/S25）**：data-grid 引擎层默认 **true**，antd 默认 **false**；
 *    本 demo 两侧均显式传共享 state（初值 false），规避差异。
 * 2. **preserve=false 树形语义（§9 S14）**：两侧对**固定树形数据**行为一致——antd
 *    `getRecordByKey`（useLazyKVMap.ts:21 dig）递归走 `rawData` 全树（含跨页父+折叠子），
 *    data-grid `fireSelectionChange` 存在性判定也走全树 `filteredDataSource`（Table.tsx:1433）。
 *    故本 demo 翻页/折叠不会丢 key。差异仅出现在 **ajax（数据源切换）** 场景（§9 S14 登记）。
 *    preserve=true 时两侧行为严格一致（key 原样保留）。
 * 3. **rowSelection.onSelect（决策 3 第二步未补齐）**：antd demo 含 `onSelect`；data-grid 仅
 *    `onChange`（功能等价）。
 *
 * === 决策 2 ===
 *
 * 树形展开行视为普通表格行：非虚拟走约定 `rowHeight`（track），虚拟路径同样被 RO 实测（measured-first + 约定兜底）。
 *
 * === 拆子文件（task：live 编辑接入，同 basic 模式）===
 *
 * 父文件只保留「外壳职责」：checkStrictly + preserveSelectedRowKeys state（父控制条 Switch 直接
 * 操作这两个 state → 必须提升父）+ useVirtualization + DemoToolbar + SplitDemo 外壳 + children 对照说明。
 * 两侧表格 JSX + columns + 本侧 rowSelection(onChange/onSelect 控制台日志) 拆到子文件：
 *   - `./tree-table-preserveSelectedRowKeys.dg`：`TreeTablePreserveSelectedRowKeysDg({checkStrictly, preserveSelectedRowKeys, virtual})`（左栏）
 *   - `./tree-table-preserveSelectedRowKeys.antd`：`TreeTablePreserveSelectedRowKeysAntd({...})`（右栏）
 *
 * ★ state 提升决策（SOP）：checkStrictly/preserveSelectedRowKeys 必须提升父——共享 DemoToolbar
 * Switch 直接 setCheckStrictly/setPreserveSelectedRowKeys 操作这两个 state，且两侧共用同一组
 * （切一次、两侧同步 diff 联动行为 + 保留行为）。rowSelection 的选中态/onChange 各侧独立（瞬时
 * 日志态），留子组件内自管。
 *
 * 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件根组件，零编辑开销；
 * live 编辑模式 SplitDemoPreview 静态 import 真实子组件并按 editedDg/editedAntd 替换。
 * 子组件 props 全部带默认值（checkStrictly=false/preserve=true/virtual=false），编辑态超集
 * props {bordered,virtual,size,autoScroll} 不全也不崩（tree-table 特有 prop 靠默认值兜底）。
 */

import { useState } from 'react'
import { Space, Switch, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（split pane 自动限高 400px）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + columns + 本侧 rowSelection 由子组件提供（props 驱动）。
//   RecordType/dataSource 现在由子文件各自 import shared；父文件不再需要。
import TreeTablePreserveSelectedRowKeysDg from './tree-table-preserveSelectedRowKeys.dg'
import TreeTablePreserveSelectedRowKeysAntd from './tree-table-preserveSelectedRowKeys.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function TreeTablePreserveSelectedRowKeysDemo() {
  // ★ 共享状态：同一组 state（checkStrictly + preserveSelectedRowKeys）同时驱动两侧。
  // 默认 checkStrictly=false（父子联动）+ preserve=true（翻页/折叠保留），对齐 antd demo
  // （§9 S13：data-grid 引擎 checkStrictly 默认 true，此处显式传 false 覆盖对齐 antd demo）。
  // ★ 提升父：共享 DemoToolbar Switch 直接操作这两个 state，两侧共用同一组。
  const [checkStrictly, setCheckStrictly] = useState(false)
  const [preserveSelectedRowKeys, setPreserveSelectedRowKeys] = useState(true)
  // 虚拟化开关接入（决策 7）：顶栏 Switch ON 时两侧 Table 叠加 virtual + scroll.y。
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。两开关同时驱动两侧表格。 */}
      <DemoToolbar>
        <Space>
          <Switch
            checked={checkStrictly}
            onChange={setCheckStrictly}
            checkedChildren="CheckStrictly"
            unCheckedChildren="CheckStrictly"
          />
          <Switch
            checked={preserveSelectedRowKeys}
            onChange={setPreserveSelectedRowKeys}
            checkedChildren="Preserve"
            unCheckedChildren="Preserve"
          />
          <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>
            checkStrictly={String(checkStrictly)} · preserveSelectedRowKeys=
            {String(preserveSelectedRowKeys)}
          </span>
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=480（窄表，3 列 + 选择列 = 4 列，无 scroll.x；分页 5/页）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <TreeTablePreserveSelectedRowKeysDg
            checkStrictly={checkStrictly}
            preserveSelectedRowKeys={preserveSelectedRowKeys}
            virtual={virtual}
          />
        }
        right={
          <TreeTablePreserveSelectedRowKeysAntd
            checkStrictly={checkStrictly}
            preserveSelectedRowKeys={preserveSelectedRowKeys}
            virtual={virtual}
          />
        }
      >
        <div>
          <strong>
            对照说明（决策 9 B15 / S14 issue #50621）：
          </strong>
          左右并排呈现 data-grid 与 antd tree-table-preserveSelectedRowKeys demo
          （树形 × 分页 × checkStrictly × preserveSelectedRowKeys）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>三场景（issue #50621）</strong>：
              <ol style={{ margin: '4px 0', paddingLeft: 20 }}>
                <li>
                  <strong>跨页保留</strong>：页1勾父（联动勾全部含跨页子）→ 翻页2 → 翻回页1，
                  之前页选的父+子仍选中。
                </li>
                <li>
                  <strong>折叠保留</strong>：展开父→勾子→折叠父→子 key 仍保留→再展开仍勾。
                </li>
                <li>
                  <strong>联动跨页/折叠</strong>：勾父→全部子（含折叠/跨页的）被勾。
                </li>
              </ol>
            </li>
            <li>
              <strong>共享开关（核心）</strong>：<code>CheckStrictly</code> +
              <code> Preserve</code> 两 state 同时驱动两侧——切一次、两侧同步 diff 联动行为 +
              保留行为。
            </li>
            <li>
              <strong>分页</strong>：15 父 × 2 子 + 分页 <code>defaultPageSize:5</code> → 3 页/父
              （data-grid S11 受控分页，切片基于扁平化后可见行数）。
            </li>
            <li>
              <strong>引擎默认差异（§9 S13/S25）</strong>：data-grid <code>checkStrictly</code>
              默认 <strong>true</strong>，antd 默认 <strong>false</strong>；本 demo 两侧均显式传
              共享 state（初值 false），规避差异。
            </li>
            <li>
              <strong>preserve=false 语义（§9 S14）</strong>：对<em>本 demo 固定树形数据</em>两侧
              行为一致——antd <code>getRecordByKey</code>（useLazyKVMap dig 递归 <code>rawData</code>
              全树）与 data-grid 全树存在性判定（<code>filteredDataSource</code> 递归 walk）覆盖
              等价，翻页/折叠不丢 key。差异仅出现在 <strong>ajax（数据源切换）</strong>场景（§9 登记）。
              preserve=true 时严格一致。
            </li>
            <li>
              <strong>onSelect 差异</strong>：antd demo 含 <code>onSelect</code>；data-grid 仅
              <code>onChange</code>（功能等价，决策 3 第二步补齐）。
            </li>
            <li>
              <strong>决策 2</strong>：树形展开行视为普通表格行（虚拟路径同样被 RO 实测，measured-first + 约定兜底）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
