/**
 * 复刻 antd summary demo：`G:\Projects\ant-design\components\table\demo\summary.tsx`。
 *
 * === 决策 9 双栏对照（S22 汇总 summary）===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致——示例1 计算总计 + 示例2 fixed sticky bottom。
 * - **右栏（antd Table）**：忠实复刻 antd summary demo（antd 原生 `<Table>` + 同 columns/data +
 *   同 summary 函数）。antd 官方 demo 用 `antd-style` createStyles 自定义细滚动条，
 *   data-grid 项目未装 antd-style（决策 6），右栏删除 className（两侧均用浏览器默认滚动条）。
 * - **共享数据**：`DataType` / `FixedDataType` / `dataSource` / `fixedDataSource` 见
 *   `_compare/summary.shared.ts`，两侧复用（子文件各自 import）。
 * - **无共享控制条**：summary demo 的两示例各自独立（示例1 静态 + 示例2 固定开关嵌在 Table.Summary
 *   fixed 属性中），不像 tree-table-ellipsis 有顶部 Switch；为忠实复刻 antd demo 结构，
 *   本 demo 不加控制条（两示例直接并排）。每示例左右各一对（共 4 张表）。
 *
 * === antd demo 要素（两示例，S22 汇总）===
 *
 * 示例 1（计算总计）：
 * - bordered + pagination:false。
 * - 3 列：Name / Borrow / Repayment。4 行数据。
 * - `summary={(pageData) => ...}`：函数接收当前页数据，计算 totalBorrow / totalRepayment，
 *   返回两行 summary：
 *     * Total 行：Name=Total，Borrow=`<Text type="danger">{totalBorrow}</Text>`，
 *       Repayment=`<Text>{totalRepayment}</Text>`。
 *     * Balance 行：Name=Balance，Borrow colSpan=2 = `<Text type="danger">{totalBorrow - totalRepayment}</Text>`。
 *
 * 示例 2（fixed sticky bottom）：
 * - bordered + scroll:{x:2000, y:500}（antd 数字）/ {x:2000, y:true}（data-grid 决策 7 CSS 自适应）+
 *   pagination:false。
 * - 2 列：Name（fixed, width:100）/ Description。20 行数据。
 * - `summary={() => <Table.Summary fixed>...}`：fixed sticky bottom，单行 Summary。
 *
 * === data-grid 实现（S22）要点 ===
 *
 * - `summary` prop：函数（接收 pagedDataSource 当前页数据）/ ReactNode。
 * - `Table.Summary`（容器，`fixed` 可选）/ `Table.Summary.Row`（行）/ `Table.Summary.Cell`
 *   （`index` 列索引 0-based + `colSpan` 跨列）。
 * - data-grid 用 CSS Grid 渲染：summary Cell 作为 grid item，按 `index`+`colSpan` 定位
 *   （`gridColumn: <index+1> / span <colSpan>`，`gridRow` 由引擎注入）。
 * - `fixed` sticky bottom：summary cell `position: sticky; bottom: 0`（配合 scroll.y）。
 *
 * === 两侧保留的差异 ===
 *
 * 1. **scroll.y**：示例2 左栏 data-grid `scroll.y:true`（决策 7 CSS 自适应高度，父容器 height:550，
 *    对齐右栏 antd scroll.y:500 表体 + 表头 ~50 总高）；右栏 antd 数字 `scroll.y:500`（忠实官方）。
 * 2. **antd-style 细滚动条**：antd 官方 demo 用 antd-style 自定义细滚动条；data-grid 项目未装
 *    antd-style（决策 6），两侧均用浏览器默认（data-grid 侧走 #35 悬浮滚动条）。
 * 3. **DOM 结构**：antd summary 是 `<tfoot><tr><td colspan>`；data-grid 是 div + CSS Grid（无 tfoot）。
 *    视觉等价：summary 在表体底部，Cell 按 index+colSpan 定位，fixed sticky bottom。
 *
 * === 拆子文件（task：live 编辑接入）===
 *
 * 父文件只保留「外壳职责」：useVirtualization + 两个 SplitDemo（示例1 / 示例2 各一对左右栏）
 * + children 对照说明 + 底部说明区。两侧表格 JSX + columns + Summary 子组件拆到子文件：
 *   - `./summary.dg`：导出 `SummaryTotalDg` / `SummaryFixedDg`（命名，父按示例选用）+ `SummaryDg`（默认，live 编辑用）。
 *   - `./summary.antd`：导出 `SummaryTotalAntd` / `SummaryFixedAntd`（命名）+ `SummaryAntd`（默认，live 编辑用）。
 *
 * ★ 状态提升说明：本 demo 无共享控制条（两示例各自独立），virtual 是唯一父传 prop（顶栏全局开关）。
 *   示例2 `Table.Summary fixed` 是 summary 节点属性（非控制条开关），不提升父，留在子组件固定为 true
 *   （对齐改造前行为）。示例数据用 shared 初始数据（非空），子组件默认值合理有效。
 *
 * 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `SummaryDemo`，零编辑开销；
 * live 编辑模式 SplitDemoPreview 静态 import 真实子组件默认导出并按 editedDg/editedAntd 替换
 * （编辑态展示单侧两示例堆叠，不对照——Phase 1 简化）。
 */

import { Flex, Typography, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（split pane 自动限高）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + columns + Summary 子组件由子组件提供（props 驱动）。DataType/
//   FixedDataType/dataSource/fixedDataSource 现在由子文件各自 import summary.shared；父文件不再需要。
//   父按示例分别取命名导出（示例1 / 示例2 各一对左右栏）。
import { SummaryTotalDg, SummaryFixedDg } from './summary.dg'
import { SummaryTotalAntd, SummaryFixedAntd } from './summary.antd'

const { Text } = Typography

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function SummaryDemo() {
  // 全局虚拟化开关接入：开关 ON 时两侧叠加 virtual=true。
  // - 示例 1：ON 时叠加 scroll.y（两侧 pagination={false} → antd y:340，无分页条高需扣除）。
  // - 示例 2：已自带 scroll（dg y:true 数据区域模式 / antd y:500 忠实官方），ON 时仅叠加 virtual
  //   （从数据区域模式切到虚拟）；scroll 原值保留，与开关无关（fixed sticky bottom 仍生效）。
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  return (
    <div style={{ padding: 24 }}>
      <Flex vertical gap="middle">
        {/*
          示例 1（计算总计）：两侧并排对照。
          minPaneWidth=600（3 列窄表）→ 横排阈值 ≈ 1216，常规视口（≥1280）横排。
        */}
        <div>
          <div
            style={{
              marginBottom: 8,
              fontWeight: 600,
              color: token.colorText,
            }}
          >
            示例 1：summary 函数计算总计（Total + Balance colSpan=2）
          </div>
          <SplitDemo
            minPaneWidth={600}
            left={<SummaryTotalDg virtual={virtual} />}
            right={<SummaryTotalAntd virtual={virtual} />}
          />
        </div>

        {/*
          示例 2（fixed sticky bottom）：两侧并排对照。
          左栏 data-grid scroll.y:true（决策 7 CSS 自适应高度，父容器 height:550，
          对齐右栏 antd scroll.y:500 表体 + 表头 ~50 总高）。
          右栏 antd scroll.y:500（忠实官方数字）。
          minPaneWidth=600（2 列，scroll.x:2000 宽表）→ 横排阈值 ≈ 1216。
        */}
        <div>
          <div
            style={{
              marginBottom: 8,
              fontWeight: 600,
              color: token.colorText,
            }}
          >
            示例 2：Table.Summary fixed sticky bottom（滚动固定底部）
          </div>
          <SplitDemo
            minPaneWidth={600}
            left={<SummaryFixedDg virtual={virtual} />}
            right={<SummaryFixedAntd virtual={virtual} />}
          />
        </div>
      </Flex>

      {/*
        底部说明区（SplitDemo 之外的独立块，两个示例共用一份说明）。
      */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: token.colorFillQuaternary,
          borderRadius: 8,
          color: token.colorTextSecondary,
          fontSize: 12,
          lineHeight: 1.8,
        }}
      >
        <p style={{ margin: '0 0 4px' }}>
          <b>对照说明（决策 9 B16 / S22 汇总 summary）：</b>
          左右并排呈现 data-grid 与 antd summary demo（示例1 计算总计 + 示例2 fixed sticky bottom）。
        </p>
        <p style={{ margin: 0 }}>
          - 示例 1：<code>summary=&#123;(pageData) =&gt; ...&#125;</code> 计算总计——
          Total 行（Borrow=<Text type="danger">195</Text> / Repayment=<Text>88</Text>）+
          Balance 行（colSpan=2 = <Text type="danger">107</Text>）。
        </p>
        <p style={{ margin: 0 }}>
          - 示例 2：<code>&lt;Table.Summary fixed&gt;</code> sticky bottom——表体纵向滚动时 summary
          固定底部；左 data-grid <code>scroll.y:true</code>（决策 7 CSS 自适应高度，父容器 height:550，
          对齐右栏 antd scroll.y:500 表体 + 表头 ~50 总高）；
          右 antd <code>scroll.y:500</code>（忠实官方数字）。
        </p>
        <p style={{ margin: 0 }}>
          - <code>Table.Summary.Cell</code>：<code>index</code>（列索引 0-based）+ <code>colSpan</code>（跨列）。
        </p>
        <p style={{ margin: 0 }}>
          - antd-style 细滚动条差异：antd 官方 demo 用 antd-style；项目未装（决策 6），两侧均用默认滚动条
          （data-grid 侧走 #35 悬浮滚动条）。
        </p>
      </div>
    </div>
  )
}
