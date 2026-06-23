/**
 * 复刻 antd `virtual-list` demo（M4 验收）：
 *   `G:\Projects\ant-design\components\table\demo\virtual-list.tsx`
 *
 * === 决策 9（demo 左右对比框架）试点改造 ===
 *
 * 本 demo 是决策 9「demo 左右对比框架」的首个试点：
 *   - **左栏（data-grid Table）** + **右栏（antd Table）** 并排（50/50，见 SplitDemo）。
 *   - **顶部共享控制条**：同一个状态同时驱动两侧表格（Bordered / Fixed / Expandable /
 *     Count / Empty 等任一控件变化，左右两栏同时变化），才能对照 diff。
 *   - 提取共享 `RecordType` + `getData`（见 `_compare/virtual-list.shared.ts`）供两侧复用；
 *     列定义因两侧类型/render 不同各自保留，但引用同一 `RecordType`。
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
 * === data-grid 侧行为与改造前一致（回归不破）===
 *
 * - virtual + scroll={{ x: 2000, y: true }}（决策 7：CSS 自适应高度，父容器 height:440 对齐右栏表体 y:400）。
 * - rowKey="id"、rowHeight={40} headerHeight={40}、mergedColumns/plainColumns 切换。
 * - Expandable 开关（验证决策 2 虚拟 × 展开），展开时强制 plainColumns（合并与展开互斥）。
 * - rowSelection：展开关闭时 radio 单选列（对齐右栏），展开时关闭。
 */

import { useMemo, useRef, useState } from 'react'
import { Button, Segmented, Space, Switch, Table as AntdTable, Typography } from 'antd'
import type { GetRef, TableProps } from 'antd'
import { Table } from '../table'
import type { ColumnType, TableRef } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { getData, type RecordType } from './_compare/virtual-list.shared'

/** antd Table 的 ref 实例类型（含 scrollTo）。antd 顶层未导出 TableRef，用 GetRef 取得。 */
type AntdTableRef = GetRef<typeof AntdTable>

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义
// ---------------------------------------------------------------------------

// 含固定列 + 合并的列定义（对齐 antd virtual-list demo 的 fixedColumns）。
// 合并语义：
//   - Group 列：id % 4 === 0 的行 rowSpan=4（向下合并 4 行），其余 rowSpan=0（被覆盖）。
//   - Age 列：id % 4 === 0 的行 colSpan=2（向右合并 2 列，吃掉 Address 1）。
//   - Address 1 列：id % 4 === 0 的行 colSpan=0（被 Age 的 colSpan=2 覆盖）。
const dgMergedColumns: ColumnType<RecordType>[] = [
  {
    title: 'ID',
    dataIndex: 'id',
    width: 100,
    fixed: 'start',
  },
  {
    title: 'FirstName',
    dataIndex: 'firstName',
    width: 120,
    fixed: 'start',
  },
  {
    title: 'LastName',
    dataIndex: 'lastName',
    width: 120,
    fixed: 'start',
  },
  {
    title: 'Group',
    width: 120,
    render: (_, record) => `Group ${Math.floor(record.id / 4)}`,
    onCell: (record) => ({
      rowSpan: record.id % 4 === 0 ? 4 : 0,
    }),
  },
  {
    title: 'Age',
    dataIndex: 'age',
    width: 100,
    onCell: (record) => ({
      colSpan: record.id % 4 === 0 ? 2 : 1,
    }),
  },
  {
    title: 'Address 1',
    dataIndex: 'address1',
    onCell: (record) => ({
      colSpan: record.id % 4 === 0 ? 0 : 1,
    }),
  },
  {
    title: 'Address 2',
    dataIndex: 'address2',
  },
  {
    title: 'Address 3',
    dataIndex: 'address3',
  },
  {
    title: 'Action',
    width: 150,
    fixed: 'end',
    render: () => (
      <span style={{ display: 'inline-flex', gap: 8 }}>
        <a>Action1</a>
        <a>Action2</a>
      </span>
    ),
  },
]

// 关闭合并后的列定义（对齐 antd demo "expanded 时清掉 onCell" 的等价路径）。
const dgPlainColumns: ColumnType<RecordType>[] = [
  { title: 'ID', dataIndex: 'id', width: 100, fixed: 'start' },
  { title: 'FirstName', dataIndex: 'firstName', width: 120, fixed: 'start' },
  { title: 'LastName', dataIndex: 'lastName', width: 120, fixed: 'start' },
  { title: 'Group', width: 120, render: (_, r) => `Group ${Math.floor(r.id / 4)}` },
  { title: 'Age', dataIndex: 'age', width: 100 },
  { title: 'Address 1', dataIndex: 'address1' },
  { title: 'Address 2', dataIndex: 'address2' },
  { title: 'Address 3', dataIndex: 'address3' },
  {
    title: 'Action',
    width: 150,
    fixed: 'end',
    render: () => (
      <span style={{ display: 'inline-flex', gap: 8 }}>
        <a>Action1</a>
        <a>Action2</a>
      </span>
    ),
  },
]

// 非固定列（3 列，对齐 antd demo 的 columns 变体）。
const dgShortColumns: ColumnType<RecordType>[] = [
  { title: 'ID', dataIndex: 'id', width: 100 },
  { title: 'FirstName', dataIndex: 'firstName', width: 120 },
  { title: 'LastName', dataIndex: 'lastName', width: 120 },
]

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd 官方 virtual-list demo
// ---------------------------------------------------------------------------

const antdFixedColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'ID',
    dataIndex: 'id',
    width: 100,
    fixed: 'start',
  },
  {
    // 官方 antd virtual-list demo 此处为 'FistName'（笔误）。两侧统一为正确拼写「FirstName」
    // 以消除标题层面的可见差异（列定义对齐任务要求）。
    title: 'FirstName',
    dataIndex: 'firstName',
    width: 120,
    fixed: 'start',
  },
  {
    title: 'LastName',
    dataIndex: 'lastName',
    width: 120,
    fixed: 'start',
  },
  {
    title: 'Group',
    width: 120,
    render: (_, record) => `Group ${Math.floor(record.id / 4)}`,
    onCell: (record) => ({
      rowSpan: record.id % 4 === 0 ? 4 : 0,
    }),
  },
  {
    title: 'Age',
    dataIndex: 'age',
    width: 100,
    onCell: (record) => ({
      colSpan: record.id % 4 === 0 ? 2 : 1,
    }),
  },
  {
    title: 'Address 1',
    dataIndex: 'address1',
    onCell: (record) => ({
      colSpan: record.id % 4 === 0 ? 0 : 1,
    }),
  },
  {
    title: 'Address 2',
    dataIndex: 'address2',
  },
  {
    title: 'Address 3',
    dataIndex: 'address3',
  },
  {
    title: 'Action',
    width: 150,
    fixed: 'end',
    render: () => (
      <Space>
        <Typography.Link>Action1</Typography.Link>
        <Typography.Link>Action2</Typography.Link>
      </Space>
    ),
  },
]

const antdShortColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'ID',
    dataIndex: 'id',
    width: 100,
  },
  {
    // 同 antdFixedColumns：官方 demo 此处亦为 'FistName' 笔误，统一改为 'FirstName'。
    title: 'FirstName',
    dataIndex: 'firstName',
    width: 120,
  },
  {
    title: 'LastName',
    dataIndex: 'lastName',
    width: 120,
  },
]

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function VirtualListDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [fixed, setFixed] = useState(true)
  const [bordered, setBordered] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [empty, setEmpty] = useState(false)
  const [count, setCount] = useState<number>(10000)
  // data-grid 专属：保留独立的 Merged 开关（对照点）。
  const [merged, setMerged] = useState(true)

  const dgRef = useRef<TableRef>(null)
  const antdRef = useRef<AntdTableRef | null>(null)

  const data = useMemo<RecordType[]>(() => getData(count), [count])

  // ----- 左栏（data-grid）列选择逻辑（与改造前一致）-----
  const dgColumns = useMemo<ColumnType<RecordType>[]>(() => {
    if (!fixed) return dgShortColumns // 与 antd 一致：非 fixed 时只显示前 3 列。
    // 展开启用时强制 plainColumns（与 antd demo "Expandable 开关切到展开时清 onCell" 一致）。
    return merged && !expanded ? dgMergedColumns : dgPlainColumns
  }, [fixed, merged, expanded])

  // ----- 右栏（antd）列选择逻辑（对齐 antd demo mergedColumns useMemo）-----
  const antdColumns = useMemo<NonNullable<TableProps<RecordType>['columns']>>(() => {
    if (!fixed) return antdShortColumns
    if (!expanded) return antdFixedColumns
    return antdFixedColumns.map((col) => ({ ...col, onCell: undefined }))
  }, [expanded, fixed])

  // ----- 左栏（data-grid）expandable（决策 2：展开内容不计入虚拟窗口）-----
  const dgExpandable = useMemo(() => {
    if (!expanded) return undefined
    return {
      expandedRowRender: (record: RecordType) => (
        <div style={{ padding: 8 }}>
          Expanded content for id={record.id}: {record.address1} / {record.address2}
        </div>
      ),
      rowExpandable: (record: RecordType) => record.id % 2 === 0,
    }
  }, [expanded])

  // ----- 右栏（antd）expandable（忠实 antd demo expandableProps）-----
  const antdExpandable = useMemo<TableProps<RecordType>['expandable']>(() => {
    if (!expanded) return undefined
    return {
      columnWidth: 48,
      expandedRowRender: (record: RecordType) => (
        <p style={{ margin: 0 }}>🎉 Expanded {record.address1}</p>
      ),
      rowExpandable: (record: RecordType) => record.id % 2 === 0,
    }
  }, [expanded])

  // ----- 双侧 scrollTo（同时滚动两侧）-----
  const scrollToBoth = (opts: { index?: number; key?: import('react').Key }) => {
    dgRef.current?.scrollTo(opts)
    antdRef.current?.scrollTo(opts)
  }

  const showScroll = data.length >= 999

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一个状态同时驱动两侧表格。 */}
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          background: '#fff',
        }}
      >
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
      </div>

      {/*
        minPaneWidth=1000 → 写入 CSS 变量 --pane-min:1000px，横排阈值 ≈ 1000×2 + 16 = 2016px。
        纯 CSS flex-wrap 自适应（无 JS）：容器 ≥ 2016 → 横排；< 2016 → 自动换行竖排。
        原因：本 demo 是 scroll.x:2000 的宽表，半宽（~960px at 1920 视口）下每栏仅 ~354px
        太挤、横滚严重；取大阈值使常规笔记本视口（1440–1920）下 **竖排**（每栏全宽，对 2000px
        表更友好），仅在超宽屏（≥2560）才横排。这正是用户要的「放不下就竖排，每个 demo 阈值不同」。
      */}
      <SplitDemo
        minPaneWidth={1000}
        left={
          /* ★ 决策 7：父容器需有明确 height。
             对齐右栏 antd `scroll.y:400`：右栏 400 是**表体高**，整表=表头(~40)+表体(400)≈440。
             左栏 `height` 是**整表高**（含表头），故取 440 与右栏表体区像素级对齐。
             虚拟滚动窗口高度由容器 clientHeight 实时测量（ResizeObserver），CSS 自动适应。
             （验证者实测后如发现表头实际高≠40，微调此处。） */
          <div style={{ height: 440 }}>
            <Table<RecordType>
              ref={dgRef}
              bordered={bordered}
              virtual
              columns={dgColumns}
              scroll={{ x: 2000, y: true }}
              rowKey="id"
              dataSource={empty ? [] : data}
              expandable={dgExpandable}
              // 对齐右栏 antd：展开关闭时显示 radio 单选列（columnWidth:48），
              // 展开时关闭（避免展开图标列与选择列并存的视觉拥挤，忠实 antd demo）。
              rowSelection={
                expanded ? undefined : { type: 'radio', columnWidth: 48 }
              }
              // 行高约定：每行 40px（决策 2：虚拟窗口按此约定算，不测量真实 DOM 高）。
              rowHeight={40}
              headerHeight={40}
            />
          </div>
        }
        right={
          /* antd 官方 virtual-list demo 忠实复刻：
             virtual + scroll={{ x:2000, y:400 }} + pagination={false} +
             rowSelection（展开关闭时 radio）+ expandable + fixedColumns。 */
          <AntdTable<RecordType>
            ref={antdRef}
            bordered={bordered}
            virtual
            columns={antdColumns}
            scroll={{ x: 2000, y: 400 }}
            rowKey="id"
            dataSource={empty ? [] : data}
            pagination={false}
            rowSelection={expanded ? undefined : { type: 'radio', columnWidth: 48 }}
            expandable={antdExpandable}
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
