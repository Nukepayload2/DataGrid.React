/**
 * 复刻 antd `fixed-columns` demo：
 *   `G:\Projects\ant-design\components\table\demo\fixed-columns.tsx`
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：左右固定列（Full Name + Age 固定 start，Action 固定 end）
 *   + `scroll={{ x: 'max-content' }}` 横向滚动。行为与改造前一致（M2 已实现 fixed sticky 偏移）。
 * - **右栏（antd Table）**：忠实复刻 antd 官方 fixed-columns demo（Full Name/Age fixed start +
 *   Age `sorter:true` + Action fixed end + `scroll={{ x:'max-content' }}` + `pagination={false}`）。
 * - **共享控制条**：`Bordered`（初值 false，对齐 antd demo 无 bordered）+ `Size`
 *   （medium/large 切换）同时驱动两侧表格。antd demo 原本无控制条，此处加最小开关便于对照。
 * - **共享数据**：`DataType` + `dataSource` 见 `_compare/fixed-columns.shared.ts`。
 *
 * === 两侧保留并如实呈现的差异（对照修 bug 的意义所在）===
 *
 * 1. **sorter**：antd 官方 demo 的 Age 列含 `sorter: true`（点击排序）。
 *    - 右栏 antd：忠实保留 Age sorter（点击表头排序图标三态切换）。
 *    - 左栏 data-grid：**去掉** sorter 字段（与改造前一致——S1 单列排序自研任务覆盖范围，
 *      此 demo 聚焦 M2 固定列；排序 × 固定列组合留 S1 验证）。
 *    - 如实保留：左栏 Age 表头无排序图标，右栏有；对照价值（固定列与排序正交组合）。
 * 2. **fixed 逻辑属性**：两侧均用 antd v6 逻辑属性 `fixed:'start'/'end'`（等价 'left'/'right'，
 *    RTL 自动适配）。data-grid 与 antd demo 同款写法，无需转换。
 * 3. **pagination**：右栏 antd 显式 `pagination={false}`（取消 antd 默认分页，2 行全显）；
 *    左栏 data-grid 默认不分页（全显），无需传。
 * 4. **createStyles 滚动条**：antd 官方 demo 用 `antd-style` createStyles 自定义细滚动条样式。
 *    data-grid 项目未装 `antd-style`（决策 6 + 与 colspan-rowspan/style-class 等已迁移 demo 同款
 *    简化）——略去该 className，使用浏览器默认滚动条。视觉略简，功能等价。
 * 5. **★ §9 右固定列脱离观察**（task #38 同源 narrow gap）：左栏含 `scroll.x:'max-content'` +
 *    Action fixed 'end' + 中间 Column 1-20 无 width（max-content），横滚到最右时 data-grid
 *    右固定列 Action 可能脱离容器右边缘（§9 已登记：无 width 列 max-content vs antd width+flex
 *    fill）。右栏 antd 无此问题。如实保留对照，登记 §9 不修。
 *
 * === §11 fixed-columns 阴影对齐结论（本轮实施）===
 * 6. **★ 固定列边缘阴影**（已对齐）：data-grid `.dg-sticky-shadow-start/end` 此前用 **外投影**
 *    `box-shadow: 10px 0 8px -8px`（缺 `inset`），antd 6.4.4 `fixed.ts:6-16` getShadowStyle 用
 *    **内投影** `inset 10px 0 8px -8px colorSplit` / `inset -10px 0 8px -8px colorSplit`。本轮
 *    已在 `table.css` 补 `inset` 关键字（颜色/方向/偏移原本就对）——与 antd 视觉一致（阴影落在
 *    固定列内侧、更含蓄）。
 * 7. **★ 阴影随滚动切换（unfixable，登记不修）**：antd 的 `fix-start/end-shadow-show` class 由
 *    rc-table 的横向 scrollLeft 监听动态切换——滚到最左时 start 阴影隐藏、滚到最右时 end 阴影隐藏
 *    （`react-component/table/src/Table.tsx:825-826` shadowStart/shadowEnd）。data-grid 两侧阴影
 *    **恒显**（纯 CSS，不脚本监听 scrollLeft，遵守 §11 约束）。视觉差异：data-grid 滚到尽头时
 *    固定列边缘仍有一道极淡阴影线（antd 没有）——阴影很淡（8px 模糊 + colorSplit 0.06 alpha），
 *    不破坏视觉，反而始终提示固定列边界。属可接受差异，无需修。
 * 8. **固定列偏移/边框/横滚贴边/z-index/固定列×hover-selected**：均沿用已落地共享修复
 *    （C1 列宽 + 选中行色含 `.dg-cell-fixed-*` + 表头分隔线 + bordered 固定列组合边框 + corner
 *    z-index 5），本轮无新增改动——验证者按下方清单逐项核对即可。
 */

import { useState } from 'react'
import { Segmented, Space, Switch, Table as AntdTable } from 'antd'
import type { TableColumnsType } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { dataSource, type DataType } from './_compare/fixed-columns.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— 与 antd demo 列结构逐字一致，仅去掉 Age sorter
// ---------------------------------------------------------------------------

// 注：与改造前一致——data-grid ColumnType 暂未含 sorter 字段（S1 任务），故 Age 列略去 sorter:true。
// fixed 用 antd v6 逻辑属性 'start'/'end'（等价 'left'/'right'，RTL 自动适配）。
const dgColumns: ColumnType<DataType>[] = [
  {
    title: 'Full Name',
    width: 100,
    dataIndex: 'name',
    key: 'name',
    fixed: 'start',
  },
  {
    title: 'Age',
    width: 100,
    dataIndex: 'age',
    key: 'age',
    fixed: 'start',
  },
  { title: 'Column 1', dataIndex: 'address', key: '1' },
  { title: 'Column 2', dataIndex: 'address', key: '2' },
  { title: 'Column 3', dataIndex: 'address', key: '3' },
  { title: 'Column 4', dataIndex: 'address', key: '4' },
  { title: 'Column 5', dataIndex: 'address', key: '5' },
  { title: 'Column 6', dataIndex: 'address', key: '6' },
  { title: 'Column 7', dataIndex: 'address', key: '7' },
  { title: 'Column 8', dataIndex: 'address', key: '8' },
  { title: 'Column 9', dataIndex: 'address', key: '9' },
  { title: 'Column 10', dataIndex: 'address', key: '10' },
  { title: 'Column 11', dataIndex: 'address', key: '11' },
  { title: 'Column 12', dataIndex: 'address', key: '12' },
  { title: 'Column 13', dataIndex: 'address', key: '13' },
  { title: 'Column 14', dataIndex: 'address', key: '14' },
  { title: 'Column 15', dataIndex: 'address', key: '15' },
  { title: 'Column 16', dataIndex: 'address', key: '16' },
  { title: 'Column 17', dataIndex: 'address', key: '17' },
  { title: 'Column 18', dataIndex: 'address', key: '18' },
  { title: 'Column 19', dataIndex: 'address', key: '19' },
  { title: 'Column 20', dataIndex: 'address', key: '20' },
  {
    title: 'Action',
    key: 'operation',
    fixed: 'end',
    width: 100,
    render: () => <a>action</a>,
  },
]

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd 官方 fixed-columns demo
// ---------------------------------------------------------------------------

const antdColumns: TableColumnsType<DataType> = [
  {
    title: 'Full Name',
    width: 100,
    dataIndex: 'name',
    key: 'name',
    fixed: 'start',
  },
  {
    title: 'Age',
    width: 100,
    dataIndex: 'age',
    key: 'age',
    fixed: 'start',
    sorter: true,
  },
  { title: 'Column 1', dataIndex: 'address', key: '1' },
  { title: 'Column 2', dataIndex: 'address', key: '2' },
  { title: 'Column 3', dataIndex: 'address', key: '3' },
  { title: 'Column 4', dataIndex: 'address', key: '4' },
  { title: 'Column 5', dataIndex: 'address', key: '5' },
  { title: 'Column 6', dataIndex: 'address', key: '6' },
  { title: 'Column 7', dataIndex: 'address', key: '7' },
  { title: 'Column 8', dataIndex: 'address', key: '8' },
  { title: 'Column 9', dataIndex: 'address', key: '9' },
  { title: 'Column 10', dataIndex: 'address', key: '10' },
  { title: 'Column 11', dataIndex: 'address', key: '11' },
  { title: 'Column 12', dataIndex: 'address', key: '12' },
  { title: 'Column 13', dataIndex: 'address', key: '13' },
  { title: 'Column 14', dataIndex: 'address', key: '14' },
  { title: 'Column 15', dataIndex: 'address', key: '15' },
  { title: 'Column 16', dataIndex: 'address', key: '16' },
  { title: 'Column 17', dataIndex: 'address', key: '17' },
  { title: 'Column 18', dataIndex: 'address', key: '18' },
  { title: 'Column 19', dataIndex: 'address', key: '19' },
  { title: 'Column 20', dataIndex: 'address', key: '20' },
  {
    title: 'Action',
    key: 'operation',
    fixed: 'end',
    width: 100,
    render: () => <a>action</a>,
  },
]

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

type SizeOption = 'medium' | 'large'

export default function FixedColumnsDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)
  const [size, setSize] = useState<SizeOption>('medium')

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
        </Space>
      </div>

      {/*
        minPaneWidth=900 → 横排阈值 ≈ 900×2 + 16 = 1816px。纯 CSS flex-wrap 自适应（无 JS）。
        本 demo 含 scroll.x:'max-content' 的宽表（23 列），半宽（~960px at 1920 视口）下
        每栏仅 ~480px 太挤、横滚严重；取大阈值使常规笔记本视口（1440–1920）下 **竖排**
        （每栏全宽，对 max-content 宽表更友好），仅超宽屏（≥2200）才横排。
      */}
      <SplitDemo
        minPaneWidth={900}
        left={
          /* 左栏 data-grid：行为与改造前一致（仅接共享 bordered/size）。
             无 scroll.y（表体不纵向滚动，整体随页面），保留改造前形态。 */
          <>
            <Table<DataType>
              columns={dgColumns}
              dataSource={dataSource}
              bordered={bordered}
              size={size === 'medium' ? 'middle' : 'large'}
              scroll={{ x: 'max-content' }}
            />
          </>
        }
        right={
          /* antd 官方 fixed-columns demo 忠实复刻：
             Full Name/Age fixed start + Age sorter true + Action fixed end
             + scroll x max-content + pagination false. */
          <>
            <AntdTable<DataType>
              columns={antdColumns}
              dataSource={dataSource}
              bordered={bordered}
              size={size}
              scroll={{ x: 'max-content' }}
              pagination={false}
            />
          </>
        }
      >
        <div>
          <strong>对照说明（决策 9 B12，固定列）：</strong>本 demo 左右并排呈现 data-grid 与 antd
          fixed-columns，方便对照修 bug。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>固定列</strong>：Full Name + Age 固定 <code>start</code>（左），Action 固定
              <code>end</code>（右）；中间 Column 1-20 普通列。横向滚动时 sticky 固定两侧列。
              两侧结构一致。
            </li>
            <li>
              <strong>sorter 差异</strong>：右栏 antd Age 列含 <code>sorter:true</code>（点击表头
              排序图标三态切换）；左栏 data-grid <strong>去掉</strong> sorter（S1 排序任务范围，
              此 demo 聚焦 M2 固定列）。如实保留：左栏 Age 表头无排序图标。
            </li>
            <li>
              <strong>fixed 逻辑属性</strong>：两侧均用 antd v6 <code>fixed:'start'/'end'</code>
              （等价 'left'/'right'，RTL 自动适配），无需转换。
            </li>
            <li>
              <strong>pagination 差异</strong>：右栏 antd 显式 <code>pagination={'{false}'}</code>
              （取消默认分页，2 行全显）；左栏 data-grid 默认不分页（全显）。
            </li>
            <li>
              <strong>createStyles 滚动条差异</strong>：antd 官方 demo 用 antd-style 自定义细滚动条；
              data-grid 项目未装 antd-style，两侧均用浏览器默认滚动条（视觉略简，功能等价）。
            </li>
            <li>
              <strong>★ §9 右固定列脱离观察</strong>（task #38 同源 narrow gap）：左栏含
              <code> scroll.x:'max-content' </code>+ Action fixed 'end' + 中间 Column 1-20 无 width
              （max-content），横滚到最右时 data-grid 右固定列 Action 可能脱离容器右边缘
              （§9 已登记：无 width 列 max-content vs antd width+flex fill）；右栏 antd 无此问题。
              如实保留对照，登记 §9 不修。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
