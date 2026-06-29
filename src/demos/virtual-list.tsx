/**
 * 复刻 antd `virtual-list` demo（M4 验收）：
 *   `G:\Projects\ant-design\components\table\demo\virtual-list.tsx`
 *
 * === 决策 9（demo 左右对比框架）试点改造 ===
 *
 * 本 demo 是决策 9「demo 左右对比框架」的首个试点：
 *   - **左栏（data-grid Table）** + **右栏（antd Table）** 并排（50/50，见 SplitDemo）。
 *   - **顶部共享控制条**：同一个状态同时驱动两侧表格（Bordered / Fixed / Expandable /
 *     Empty / Merged / Count 等任一控件变化，左右两栏同时变化），才能对照 diff。
 *   - 提取共享 `RecordType` + `getData`（见 `_compare/virtual-list.shared.ts`）供两侧复用；
 *     列定义因两侧类型/render 不同各自保留在子文件，但均引用同一 `RecordType`。
 *
 * **本次试点选取 virtual-list 的目的**（用户指定）：评估 50/50 左右并排在「宽 + 高 + 双向滚动」
 * 的 demanding demo（scroll.x:2000 + scroll.y:400 + 万行虚拟）上是否好用。布局质量是核心评估目标。
 *
 * === 两侧保留并如实呈现的差异（对照修 bug 的意义所在）===
 *
 * 1. **rowSelection**（已对齐，原为对照点）：
 *    - 右栏 antd：展开关闭时 `rowSelection={{ type: 'radio', columnWidth: 48 }}`（忠实 antd demo）。
 *    - 左栏 data-grid：**现已补齐同款 radio 行选择**（展开关闭时 `{ type:'radio', columnWidth:48 }`，
 *      展开时 `undefined`），与右栏像素/行为对齐。原「不加 rowSelection 作对照点」已被
 *      demo 配置等价修复任务推翻。
 *
 * 2. **Merged（合并）开关**：
 *    - 右栏 antd：merged 行为由 `fixed + !expanded` 推导（fixed 时展开关闭即合并、展开即清 onCell）。
 *    - 左栏 data-grid：保留独立的 `Merged` 开关（用户可直接对照「有合并 vs 无合并」下的虚拟渲染差异）。
 *
 * 3. **合并 × 虚拟的已知简化**（见 §9 M4 行）：
 *    - 左栏 data-grid：合并组左上角滚出可视区上边界后，其延伸到可视区的覆盖部分不补画
 *      （视觉「缺一块」），尤其 Scroll To index 999 把合并区拉到边界时。完整实现需补
 *      rc-table 的 extraRender 机制——留作 M4 增强。右栏 antd 无此问题。
 *
 * 4. **展开行高度 × 虚拟**（决策 2）：
 *    - 左栏 data-grid：展开内容直接渲染但**不计入虚拟窗口**（窗口按收起态 rowHeight=40 算）。
 *    - 右栏 antd：展开内容也参与测量，但 antd 官方 demo 行为参考即可。
 *
 * 5. **Expandable rowExpandable**：
 *    - 右栏 antd：`rowExpandable: r => r.id % 2 === 0`（奇数行无展开图标）。
 *    - 左栏 data-grid：保留同样的 rowExpandable（验证决策 2 + 与右栏对照「哪些行可展开」一致）。
 *
 * 6. **scrollTo 双 ref**：
 *    - 「Scroll To index 999」/「Scroll To Top」按钮同时调用两侧 ref.scrollTo（data-grid ref +
 *      antd ref），对照两侧滚动行为是否一致。data-grid 原「Scroll To key 50」保留为左栏专属。
 *
 * 7. **悬浮滚动条**（决策 7 + 决策 8，有意差异）：
 *    - 左栏 data-grid：自定义 macOS 风格悬浮滚动条（细线 2px + hover hit 24px 变 8px + 拖动同步），
 *      替代浏览器原生纵/横滚动条；滚动行为等价。
 *    - 右栏 antd：浏览器原生滚动条。视觉更轻是有意设计，不是 bug。
 *
 * === 强制虚拟 demo（不消费全局虚拟开关）===
 *
 * 本 demo 是**强制虚拟 demo**——自身永久 virtual=true、自管高度，不消费顶栏「Virtual」Switch。
 * 故父组件 SplitDemo 传 `virtualizable={false}`（不参与全局开关限高 / 不加 .dg-compare--virtual）。
 * 两侧子组件内部各自硬编码 virtual=true + scroll（左 data-grid `scroll={{x:2000,y:true}}` + 父容器
 * height:440 对齐右栏表体 y:400；右 antd `scroll={{x:2000,y:400}}` + pagination={false}）。
 * 父组件**不再**接 useVirtualization（无意义——子组件不消费）。
 *
 * === data-grid 侧行为与改造前一致（回归不破）===
 *
 * - virtual + scroll={{ x: 2000, y: true }}（决策 7：CSS 自适应高度，父容器 height:440 对齐右栏表体 y:400）。
 * - rowKey="id"、gridOptions={{ rowHeight:40, headerHeight:40 }}、mergedColumns/plainColumns 切换。
 * - Expandable 开关（验证决策 2 虚拟 × 展开），展开时强制 plainColumns（合并与展开互斥）。
 * - rowSelection：展开关闭时 radio 单选列（对齐右栏），展开时关闭。
 *
 * === 拆子文件（live 编辑接入，自包含 pane 模式，类 edit-cell）===
 *
 * 父文件只保留「外壳职责」：fixed/bordered/expanded/empty/count/merged state + 双 ref +
 * DemoToolbar(Switch×5 + Segmented count + 滚动按钮×3) + SplitDemo 外壳（virtualizable={false}）+
 * children 对照说明。两侧表格 JSX + columns + expandable + virtual/scroll 拆到子文件：
 *   - `./virtual-list.dg`：`VirtualListDg({bordered, fixed, expanded, empty, merged, data, tableRef})`（左栏）
 *   - `./virtual-list.antd`：`VirtualListAntd({bordered, fixed, expanded, empty, data, tableRef})`（右栏）
 *
 * 父文件保留 `useMemo(getData(count))`（count 由控制条驱动，生成的 data 以 prop 下发两侧子组件），
 * 以及双 ref（dgRef/antdRef，以 tableRef prop 下发，驱动双侧 scrollTo 对照）。
 *
 * 这样：
 *   - 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `VirtualListDemo`，零编辑开销。
 *   - live 编辑模式：SplitDemoPreview 静态 import 真实子组件，并按 editedDg/editedAntd 替换。
 *     子组件 props 全部带默认值（含 data 默认 getData(10000) 非空），编辑态超集 props
 *     {bordered,virtual,size,autoScroll} 不全也不崩。
 */

import { useMemo, useRef, useState } from 'react'
import { Button, Segmented, Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { getData, type RecordType } from './_compare/virtual-list.shared'
import type { TableRef } from '../table'
import type { GetRef } from 'antd'
import { Table as AntdTable } from 'antd'
// ★ 拆子文件后，左/右栏 JSX + columns + expandable + virtual/scroll 由子组件提供（props 驱动）。
//   RecordType/getData 父文件保留（生成 data 下发两侧）；双 ref 父文件保留（驱动双侧 scrollTo）。
import VirtualListDg from './virtual-list.dg'
import VirtualListAntd from './virtual-list.antd'

/** antd Table 的 ref 实例类型（含 scrollTo）。antd 顶层未导出 TableRef，用 GetRef 取得。 */
type AntdTableRef = GetRef<typeof AntdTable>

export default function VirtualListDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [fixed, setFixed] = useState(true)
  const [bordered, setBordered] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [empty, setEmpty] = useState(false)
  const [count, setCount] = useState<number>(10000)
  // data-grid 专属：保留独立的 Merged 开关（对照点）。
  const [merged, setMerged] = useState(true)

  // 双 ref：父文件持有，以 tableRef prop 下发两侧子组件，驱动双侧 scrollTo 对照。
  const dgRef = useRef<TableRef>(null)
  const antdRef = useRef<AntdTableRef | null>(null)

  const data = useMemo<RecordType[]>(() => getData(count), [count])

  // ----- 双侧 scrollTo（同时滚动两侧）-----
  const scrollToBoth = (opts: { index?: number; key?: import('react').Key }) => {
    dgRef.current?.scrollTo(opts)
    antdRef.current?.scrollTo(opts)
  }

  const showScroll = data.length >= 999

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一个状态同时驱动两侧表格。
          DemoToolbar 用 useToken（light≈#fff/#f0f0f0、dark/自定义 token 自适应），替代硬编码底/边色。
          仅容器化，内部 Bordered/Fixed/Expandable/Empty/Merged/Count/scrollTo 控件与虚拟/scroll/data 逻辑不动。 */}
      <DemoToolbar>
        <Space wrap>
          <Switch
            checked={bordered}
            onChange={() => setBordered(!bordered)}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
          <Switch
            checked={fixed}
            onChange={() => setFixed(!fixed)}
            checkedChildren="Fixed"
            unCheckedChildren="Fixed"
          />
          <Switch
            checked={expanded}
            onChange={() => setExpanded(!expanded)}
            checkedChildren="Expandable"
            unCheckedChildren="Expandable"
          />
          <Switch
            checked={empty}
            onChange={() => setEmpty(!empty)}
            checkedChildren="Empty"
            unCheckedChildren="Empty"
          />
          {/* data-grid 专属：独立 Merged 开关（对照点）。antd 侧 merged 行为由 fixed+expanded 推导。 */}
          <Switch
            checked={merged}
            onChange={() => setMerged(!merged)}
            checkedChildren="Merged (data-grid only)"
            unCheckedChildren="Merged (data-grid only)"
          />
          <Segmented
            value={count}
            onChange={(val) => setCount(val as number)}
            options={[
              { label: 'None', value: 0 },
              { label: 'Less', value: 4 },
              { label: 'Lot', value: 10000 },
            ]}
          />
          {showScroll ? (
            <>
              <Button onClick={() => scrollToBoth({ index: 999 })}>
                Scroll To index 999 (both)
              </Button>
              <Button onClick={() => scrollToBoth({ index: 0 })}>
                Scroll To Top (both)
              </Button>
              {/* data-grid 专属：保留原 key 50 滚动（左栏专属）。 */}
              <Button onClick={() => dgRef.current?.scrollTo({ key: 50 })}>
                Scroll To key 50 (data-grid)
              </Button>
            </>
          ) : null}
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=1000 → 写入 CSS 变量 --pane-min:1000px，横排阈值 ≈ 1000×2 + 16 = 2016px。
        纯 CSS flex-wrap 自适应（无 JS）：容器 ≥ 2016 → 横排；< 2016 → 自动换行竖排。
        原因：本 demo 是 scroll.x:2000 的宽表，半宽（~960px at 1920 视口）下每栏仅 ~354px
        太挤、横滚严重；取大阈值使常规笔记本视口（1440–1920）下 **竖排**（每栏全宽，对 2000px
        表更友好），仅在超宽屏（≥2560）才横排。这正是用户要的「放不下就竖排，每个 demo 阈值不同」。

        ★ virtualizable={false}：强制虚拟 demo（自身永久 virtual=true + 自管高度），不消费顶栏
          「Virtual」Switch，不加 .dg-compare--virtual 限高类（子组件内部已硬编码 scroll + 父容器 height）。
      */}
      <SplitDemo
        minPaneWidth={1000}
        virtualizable={false}
        left={
          <VirtualListDg
            bordered={bordered}
            fixed={fixed}
            expanded={expanded}
            empty={empty}
            merged={merged}
            data={data}
            tableRef={dgRef}
          />
        }
        right={
          <VirtualListAntd
            bordered={bordered}
            fixed={fixed}
            expanded={expanded}
            empty={empty}
            data={data}
            tableRef={antdRef}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 试点）：</strong>本 demo 左右并排呈现 data-grid 与 antd
          virtual-list，方便对照修 bug。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>rowSelection</strong>：两侧均展开关闭时显示 radio 单选列、展开时关闭
              （{`{ type:'radio', columnWidth:48 }`}），已对齐。
            </li>
            <li>
              <strong>Merged 开关</strong>：左栏 data-grid 专属（直接对照有/无合并的虚拟渲染）；
              右栏 antd 的 merged 由 Fixed + Expandable 推导。
            </li>
            <li>
              <strong>合并 × 虚拟已知简化</strong>（§9 M4）：左栏 data-grid 合并组左上角滚出可视区
              上边界后，其延伸到可视区的覆盖部分不补画（「Scroll To index 999」拉到边界时可见）；
              右栏 antd 无此问题。
            </li>
            <li>
              <strong>展开行高 × 虚拟</strong>（决策 2）：左栏 data-grid 展开内容直接渲染但
              <strong>不计入虚拟窗口</strong>（窗口按收起态 rowHeight=40 算，展开后滚动稳定）。
            </li>
            <li>
              <strong>scrollTo 双 ref</strong>：「Scroll To index 999 / Top」同时滚动两侧对照；
              「Scroll To key 50」仅左栏 data-grid（原 demo 保留）。
            </li>
            <li>
              <strong>悬浮滚动条</strong>（决策 7 + 决策 8，有意差异）：左栏 data-grid 用 macOS 风格
              自定义悬浮滚动条（默认 2px 半透明细线，hover hit 24px 区变 8px 实色 + 拖动同步），
              替代浏览器原生纵/横滚动条；右栏 antd 用浏览器原生滚动条。data-grid 侧滚动条视觉更轻，
              但滚动行为（滚轮/拖动/键盘/程序 scrollTop）与原生等价。
            </li>
            <li>
              <strong>本试点核心评估</strong>（用户指定）：50/50 左右并排在「宽 + 高 + 双向滚动」
              的 demanding demo 上是否好用——视口是否够放得下 2000px 宽表 + 400px 高表体 + 两栏并排。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
