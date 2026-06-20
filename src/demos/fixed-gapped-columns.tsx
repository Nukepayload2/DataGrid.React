/**
 * 复刻 antd `fixed-gapped-columns` demo：
 *   `G:\Projects\ant-design\components\table\demo\fixed-gapped-columns.tsx`
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：**分散的多个固定列堆叠** + bordered + `scroll={{ x:'max-content' }}`。
 *   行为与改造前一致（M2 已实现分散固定列按列顺序累加偏移堆叠）。
 * - **右栏（antd Table）**：忠实复刻 antd 官方 fixed-gapped-columns demo（分散固定列堆叠 +
 *   bordered + `scroll={{ x:'max-content' }}` + `pagination={false}`）。
 * - **共享控制条**：`Bordered`（初值 true，对齐 antd demo bordered）+ `Size`（medium/large 切换）
 *   同时驱动两侧表格。antd demo 原本无控制条，此处加最小开关便于对照「有/无边框」「尺寸」。
 * - **共享数据**：`DataType` + `dataSource` 见 `_compare/fixed-gapped-columns.shared.ts`。
 *
 * === 列结构（与 antd demo 完全一致）===
 *
 * - start 侧分散两段：[FullName(start)] ... [Column1(start)]（中间夹着非固定的 Age）
 *   —— 即 start 侧有 2 个固定列，但它们不相邻（Name 在最左、Column1 在第 3 列）。
 * - end 侧分散两段：[Action1(end)] ... [Action3(end)]（中间夹着非固定的 Action2）。
 * - 启用 bordered，便于看清堆叠边界。
 *
 * === 两侧保留并如实呈现的差异（对照修 bug 的意义所在）===
 *
 * 1. **fixed 逻辑属性**：两侧均用 antd v6 逻辑属性 `fixed:'start'/'end'`（等价 'left'/'right'，
 *    RTL 自动适配）。data-grid 与 antd demo 同款写法，无需转换。
 * 2. **pagination**：右栏 antd 显式 `pagination={false}`（取消 antd 默认分页，2 行全显）；
 *    左栏 data-grid 默认不分页（全显），无需传。
 * 3. **createStyles 滚动条**：antd 官方 demo 用 `antd-style` createStyles 自定义细滚动条样式。
 *    data-grid 项目未装 `antd-style`（决策 6 + 与 colspan-rowspan/style-class 等已迁移 demo 同款
 *    简化）——略去该 className，使用浏览器默认滚动条。视觉略简，功能等价。
 * 4. **★ §9 右固定列脱离观察**（task #38 同源 narrow gap）：左栏含 `scroll.x:'max-content'` +
 *    Action1/Action3 fixed 'end' + 中间 Column 2-20 无 width（max-content），横滚到最右时
 *    data-grid 右侧分散固定列（Action1/Action3）可能脱离容器右边缘（§9 已登记：无 width 列
 *    max-content vs antd width+flex fill）。右栏 antd 无此问题。如实保留对照，登记 §9 不修。
 *    特别地，本 demo 的「分散堆叠」结构在 §9 场景下视觉更复杂（Action1 叠在 Action3 左侧），
 *    是 §9 对照的高价值 demo。
 */

import { useState } from 'react'
import { Segmented, Space, Switch, Table as AntdTable } from 'antd'
import type { TableColumnsType } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { dataSource, type DataType } from './_compare/fixed-gapped-columns.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— 与 antd demo 列结构逐字一致
// ---------------------------------------------------------------------------

// 分散固定列堆叠：start 侧 FullName + Column1（不相邻），end 侧 Action1 + Action3（不相邻）。
// useStickyColumns 按列顺序累加偏移：start 从左扫遇 fixed=start 累加；end 从右扫遇 fixed=end 累加。
const dgColumns: ColumnType<DataType>[] = [
  {
    title: 'Full Name',
    width: 100,
    dataIndex: 'name',
    fixed: 'start',
  },
  {
    title: 'Age',
    width: 100,
    dataIndex: 'age',
  },
  { title: 'Column 1', dataIndex: 'address', key: '1', fixed: 'start' },
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
    title: 'Action 1',
    fixed: 'end',
    width: 90,
    render: () => <a>action</a>,
  },
  {
    title: 'Action 2',
    width: 90,
    render: () => <a>action</a>,
  },
  {
    title: 'Action 3',
    fixed: 'end',
    width: 90,
    render: () => <a>action</a>,
  },
]

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd 官方 fixed-gapped-columns demo
// ---------------------------------------------------------------------------

const antdColumns: TableColumnsType<DataType> = [
  {
    title: 'Full Name',
    width: 100,
    dataIndex: 'name',
    fixed: 'start',
  },
  {
    title: 'Age',
    width: 100,
    dataIndex: 'age',
  },
  { title: 'Column 1', dataIndex: 'address', key: '1', fixed: 'start' },
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
    title: 'Action 1',
    fixed: 'end',
    width: 90,
    render: () => <a>action</a>,
  },
  {
    title: 'Action 2',
    width: 90,
    render: () => <a>action</a>,
  },
  {
    title: 'Action 3',
    fixed: 'end',
    width: 90,
    render: () => <a>action</a>,
  },
]

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

type SizeOption = 'medium' | 'large'

export default function FixedGappedColumnsDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(true)
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
        本 demo 含 scroll.x:'max-content' 的宽表（25 列，含分散固定列堆叠），半宽（~960px at
        1920 视口）下每栏仅 ~480px 太挤、横滚严重 + 分散堆叠结构看不清；取大阈值使常规笔记本
        视口（1440–1920）下 **竖排**（每栏全宽，对宽表更友好），仅超宽屏（≥2200）才横排。
      */}
      <SplitDemo
        minPaneWidth={900}
        left={
          /* 左栏 data-grid：行为与改造前一致（仅接共享 bordered/size）。
             无 scroll.y（表体不纵向滚动，整体随页面），保留改造前形态. */
          <>
            <Table<DataType>
              bordered={bordered}
              columns={dgColumns}
              dataSource={dataSource}
              size={size === 'medium' ? 'middle' : 'large'}
              scroll={{ x: 'max-content' }}
            />
          </>
        }
        right={
          /* antd 官方 fixed-gapped-columns demo 忠实复刻：
             分散固定列堆叠（start: FullName+Column1 不相邻 / end: Action1+Action3 不相邻）
             + bordered + scroll x max-content + pagination false. */
          <>
            <AntdTable<DataType>
              bordered={bordered}
              columns={antdColumns}
              dataSource={dataSource}
              size={size}
              scroll={{ x: 'max-content' }}
              pagination={false}
            />
          </>
        }
      >
        <div>
          <strong>对照说明（决策 9 B12，分散固定列堆叠）：</strong>本 demo 左右并排呈现 data-grid 与
          antd fixed-gapped-columns，方便对照修 bug。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>分散固定列堆叠</strong>：start 侧 FullName（最左）+ Column1（第 3 列，中间夹
              Age）不相邻；end 侧 Action1 + Action3（中间夹 Action2）不相邻。横向滚动时 4 个固定列
              都 sticky 固定（start 两个叠在左侧、end 两个叠在右侧）。两侧结构一致。
            </li>
            <li>
              <strong>堆叠实现</strong>：data-grid <code>useStickyColumns</code> 按列顺序累加偏移
              （start 从左扫遇 fixed=start 累加；end 从右扫遇 fixed=end 累加），不要求固定列相邻。
              antd 原生 <code>fixed:'start'/'end'</code> 同款语义。
            </li>
            <li>
              <strong>bordered</strong>：默认开启（对齐 antd demo），便于看清堆叠边界与固定列分隔。
              可通过控制条关闭对照。
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
              <strong>★ §9 右固定列脱离观察</strong>（task #38 同源 narrow gap，高价值对照点）：
              左栏含 <code>scroll.x:'max-content' </code>+ Action1/Action3 fixed 'end' + 中间
              Column 2-20 无 width（max-content），横滚到最右时 data-grid 右侧分散固定列可能脱离
              容器右边缘（§9 已登记：无 width 列 max-content vs antd width+flex fill）。
              本 demo 的「分散堆叠」结构在 §9 场景下视觉更复杂（Action1 叠在 Action3 左侧），
              是 §9 对照的高价值 demo。右栏 antd 无此问题。如实保留对照，登记 §9 不修。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
