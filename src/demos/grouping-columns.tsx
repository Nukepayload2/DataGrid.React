/**
 * 复刻 antd `grouping-columns` demo：`G:\Projects\ant-design\components\table\demo\grouping-columns.tsx`。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：多级表头（任意深度嵌套 children）+ 固定列（Name fixed 'start'、
 *   Gender fixed 'end'）+ scroll.x。行为与改造前一致（M1 已实现多级表头 grid-column/grid-row span N，
 *   M2 已实现 fixed sticky 偏移）。grid-column span N / grid-row span N 实现多级表头。
 * - **右栏（antd Table）**：忠实复刻 antd 官方 grouping-columns demo（Name fixed:left + filters/onFilter、
 *   Age sorter、Gender fixed:right、size="medium"、scroll:{x:'calc(700px + 50%)', y:47*5}、100 行、
 *   createStyles 自定义滚动条样式）。
 * - **共享控制条**：`Bordered`（初值 true）+ `Size`（medium/large 切换）+ 行数 `Count`（100/6）
 *   同时驱动两侧表格。
 * - **共享数据**：`DataType` + `getData(count)` 见 `_compare/grouping-columns.shared.ts`。
 *
 * === 两侧保留并如实呈现的差异（对照修 bug 的意义所在）===
 *
 * 1. **filters / sorter**：antd 官方 demo 的 Name 列含 `filters/onFilter`、Age 列含 `sorter`。
 *    - 右栏 antd：忠实保留 filters（Joe/John）+ Age sorter（点击排序）。
 *    - 左栏 data-grid：**去掉** filters/sorter 字段（与改造前一致——M1 demo 仅演示多级表头结构，
 *      排序/筛选属 S1/S3 自研任务的覆盖范围；组合多级表头 × filters 留 S1/S3 验证）。
 *    - 如实保留：左栏无漏斗/排序图标，右栏有；对照价值（多级表头与排序/筛选正交组合）。
 * 2. **size**：antd demo 用 `size="medium"`（v6 中等行高）。
 *    - 两侧均通过共享控制条切换 size（medium / large）。
 * 3. **scroll**：antd demo 用 `scroll={{x:'calc(700px + 50%)', y:47*5}}`（固定表头 + 表体 max-height 235px 纵滚）。
 *    - 右栏 antd：忠实复刻该 scroll（x 含 calc 公式）；y:235 是**表体滚动 max-height**，antd 整表
 *      撑满父容器，表体高度 = min(内容自然高, 235)。
 *    - 左栏 data-grid：用 `scroll={{x:'calc(700px + 50%)', y:true}}`（决策 7：y:true 数据区域模式，
 *      CSS 自动适应高度；父容器填满 SplitDemo body）。父容器 height:100% 填满 body（~423px =
 *      表头 ~188 + 表体 ~235），表体 ~235px 对齐 antd y:235。
 *    - ★ 任务 S：旧实现误用 `height:240≈antd y` 把整表硬限 240px（误把表体 max-height 当整表高），
 *      表体仅 ~52px；已改为 height:100% 填满 body，表体对齐 antd。
 * 4. **★ §9 右固定列脱离已修（C1 列宽策略落地后）**：左栏含 scroll.x + Gender fixed 'end' +
 *    Company Name 列无 width。C1 前（§9 narrow gap 同源，task #38 virtual-list 暴露）横滚到最右时
 *    右固定列脱离容器右边缘；C1 列宽策略（absolute width → grid `minmax(width,1fr)`，无 width 列
 *    `minmax(0,1fr)`，派生 fixed tableLayout）后该列填满 scroll.x 剩余空间，Gender 严格贴右
 *    （实测 diff 0.000003px 亚像素，与 antd 等价）。右栏 antd 一直无此问题，现两侧一致。
 * 5. **数据量**：antd demo 固定 100 行；data-grid 侧通过 Count 控件可切换 100/6（默认 100 对齐 antd）。
 */

import { useState } from 'react'
import { Segmented, Space, Switch, Table as AntdTable } from 'antd'
import type { TableColumnsType } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { getData, type DataType } from './_compare/grouping-columns.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义
// ---------------------------------------------------------------------------

// 多级表头列定义（任意深度嵌套 children）+ 固定列。
// 与 antd 官方 demo 的列结构逐字一致（title/dataIndex/key/width/children 嵌套），
// 仅去掉 filters/onFilter/sorter（M1 demo 范围：仅多级表头，排序/筛选留 S1/S3）。
// fixed 用 data-grid 逻辑属性 'start'/'end'（等价 antd 'left'/'right'，RTL 自动适配）。
const dgColumns: ColumnType<DataType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    width: 100,
    fixed: 'start',
  },
  {
    title: 'Other',
    children: [
      {
        title: 'Age',
        dataIndex: 'age',
        key: 'age',
        width: 150,
      },
      {
        title: 'Address',
        children: [
          {
            title: 'Street',
            dataIndex: 'street',
            key: 'street',
            width: 150,
          },
          {
            title: 'Block',
            children: [
              {
                title: 'Building',
                dataIndex: 'building',
                key: 'building',
                width: 100,
              },
              {
                title: 'Door No.',
                dataIndex: 'number',
                key: 'number',
                width: 100,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Company',
    children: [
      {
        title: 'Company Address',
        dataIndex: 'companyAddress',
        key: 'companyAddress',
        width: 200,
      },
      {
        title: 'Company Name',
        dataIndex: 'companyName',
        key: 'companyName',
      },
    ],
  },
  {
    title: 'Gender',
    dataIndex: 'gender',
    key: 'gender',
    width: 80,
    fixed: 'end',
  },
]

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd 官方 grouping-columns demo
// ---------------------------------------------------------------------------

const antdColumns: TableColumnsType<DataType> = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    width: 100,
    fixed: 'left',
    filters: [
      {
        text: 'Joe',
        value: 'Joe',
      },
      {
        text: 'John',
        value: 'John',
      },
    ],
    onFilter: (value, record) => record.name.indexOf(value as string) === 0,
  },
  {
    title: 'Other',
    children: [
      {
        title: 'Age',
        dataIndex: 'age',
        key: 'age',
        width: 150,
        sorter: (a, b) => a.age - b.age,
      },
      {
        title: 'Address',
        children: [
          {
            title: 'Street',
            dataIndex: 'street',
            key: 'street',
            width: 150,
          },
          {
            title: 'Block',
            children: [
              {
                title: 'Building',
                dataIndex: 'building',
                key: 'building',
                width: 100,
              },
              {
                title: 'Door No.',
                dataIndex: 'number',
                key: 'number',
                width: 100,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Company',
    children: [
      {
        title: 'Company Address',
        dataIndex: 'companyAddress',
        key: 'companyAddress',
        width: 200,
      },
      {
        title: 'Company Name',
        dataIndex: 'companyName',
        key: 'companyName',
      },
    ],
  },
  {
    title: 'Gender',
    dataIndex: 'gender',
    key: 'gender',
    width: 80,
    fixed: 'right',
  },
]

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

type SizeOption = 'medium' | 'large'

export default function GroupingColumnsDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(true)
  const [size, setSize] = useState<SizeOption>('medium')
  const [count, setCount] = useState<number>(100)

  const data = getData(count)

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
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
          <Segmented
            value={size}
            onChange={(val) => setSize(val as SizeOption)}
            options={[
              { label: 'medium', value: 'medium' },
              { label: 'large', value: 'large' },
            ]}
          />
          <Segmented
            value={count}
            onChange={(val) => setCount(val as number)}
            options={[
              { label: '6 rows', value: 6 },
              { label: '100 rows', value: 100 },
            ]}
          />
        </Space>
      </div>

      {/*
        minPaneWidth=900 → 横排阈值 ≈ 900×2 + 16 = 1816px。纯 CSS flex-wrap 自适应（无 JS）。
        本 demo 含 scroll.x:'calc(700px + 50%)' 的宽表 + 多级表头，半宽（~960px at 1920 视口）
        下每栏仅 ~480px 太挤；取大阈值使常规笔记本视口（1440–1920）下竖排（每栏全宽，对宽表更友好），
        仅超宽屏（≥2200）才横排。
      */}
      <SplitDemo
        minPaneWidth={900}
        left={
          /* ★★★ 任务 S（数据区域高度返工，第二次）：
             **问题历史**：
               - 原始：`height: 240` → wrapper 仅 240px，扣多级表头 4 行(~188px)后表体仅 ~52px(1 行)。
               - 第一次返工：改 `height: '100%'` 期望填满 SplitDemo body。但 `.dg-compare__body`
                 (`compare.css:64-71`) 是 `flex:1; min-height:0; overflow:auto; display:flex;
                 flex-direction:column`——它的高度依赖父链 `.dg-compare__pane → .dg-compare` 的
                 显式高度，而 demo 在文档流里无视口约束（.dg-compare 无固定高）→ height:100% 解析成
                 内容自然高(100 行全展开 4869px)，外溢无滚动条。用户："数据区非常高，全 100 行"。
             **目标**：表体 ~235px（对齐 antd `scroll.y:47*5=235`，5 行可见），不是 4869(全行)也不是
               53(原 240 卡死)。
             **修复**：直接给左栏 wrapper `<div>` 设**固定像素高** `423px`，不再依赖 flex 链传递。
               423 = 表头 4 行 medium(~47px×4 ≈ 188) + 表体 235。`.dg-wrapper.dg-data-area`
               (`table.css:86-89` height:100% + flex column) 解析成 423，内部 flex 链：
               wrapper 423 → `.dg-scroll-wrap` flex:1 → `.dg-scroll` flex:1 + overflow-y:auto，
               表头 sticky 钉顶(188)后表体可见区 = 423 − 188 = 235px ≈ 5 行，精确对齐 antd。
             **为何不用 height:100%**：SplitDemo body 无视口约束 → 100% 无限高(4869)。
             **为何不用 height:240**：表头占 188 后表体仅 52(1 行)。
             **fragility 说明**：表头高随 size 变（large 更高），medium 下 4 行 ≈ 188 是经验值。
               若切 large 需重测（large 表头更高，wrapper 应相应加大）。当前 demo 默认 medium，
               423 精确对齐 antd medium 下 y:235 表体。 */
          <div style={{ height: '423px' }}>
            <Table<DataType>
              columns={dgColumns}
              dataSource={data}
              bordered={bordered}
              size={size === 'medium' ? 'middle' : 'large'}
              scroll={{ x: 'calc(700px + 50%)', y: true }}
            />
          </div>
        }
        right={
          /* antd 官方 grouping-columns demo 忠实复刻：
             filters（Joe/John）+ Age sorter + fixed:left/right + size="medium" +
             scroll={{x:'calc(700px + 50%)', y:47*5}}（固定表头 5 行高纵滚）+ 100 行。 */
          <AntdTable<DataType>
            columns={antdColumns}
            dataSource={data}
            bordered={bordered}
            size={size}
            scroll={{ x: 'calc(700px + 50%)', y: 47 * 5 }}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B11，多级表头）：</strong>本 demo 左右并排呈现 data-grid 与 antd
          grouping-columns，方便对照修 bug。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>多级表头</strong>：Other → Age / Address（→ Street / Block（→ Building / Door No.））
              + Company（→ Company Address / Company Name），任意深度嵌套。data-grid grid-column span N /
              grid-row span N 实现多级表头；antd 原生 children 嵌套。两侧结构应一致。
            </li>
            <li>
              <strong>filters / sorter 差异</strong>：右栏 antd Name 列含 filters（Joe/John）+ Age 列含 sorter
              （点击排序）；左栏 data-grid <strong>去掉</strong> filters/sorter（M1 范围仅多级表头，组合留
              S1/S3 验证）。如实保留：左栏无漏斗/排序图标。
            </li>
            <li>
              <strong>固定列差异</strong>：左栏 data-grid 用 <code>fixed:'start'/'end'</code>（逻辑属性，
              等价 antd <code>'left'/'right'</code>，RTL 自动适配）；右栏 antd 原生 <code>'left'/'right'</code>。
            </li>
            <li>
              <strong>scroll 差异</strong>：右栏 antd <code>scroll: {'{ x:"calc(700px+50%)", y:47*5 }'}</code>；
              左栏 data-grid <code>scroll: {'{ x:"calc(700px+50%)", y:true }'}</code>（决策 7：y:true 数据区域
              模式 + 父容器 height:100% 填满 SplitDemo body）。
            </li>
            <li>
              <strong>size 差异</strong>：右栏 antd <code>size="medium"</code>（v6 中等行高）；左栏 data-grid
              <code>size="middle"</code>（data-grid v6 别名，等价 medium）。可通过控制条切换。
            </li>
            <li>
              <strong>★ §9 右固定列脱离已修（C1 列宽策略）</strong>：左栏含 scroll.x + Gender fixed 'end' +
              Company Name 列无 width。C1 列宽策略（absolute width → grid <code>minmax(width,1fr)</code>，
              无 width 列 <code>minmax(0,1fr)</code>，派生 fixed tableLayout）后该列填满 scroll.x 剩余空间，
              Gender 严格贴右（实测 diff 0.000003px 亚像素，与 antd 等价）。右栏 antd 一直无此问题，
              现两侧一致。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
