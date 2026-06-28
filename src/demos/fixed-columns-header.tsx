/**
 * 复刻 antd `fixed-columns-header` demo：
 *   `G:\Projects\ant-design\components\table\demo\fixed-columns-header.tsx`
 *
 * antd 原版用 `scroll={{ x: 'max-content', y: 55 * 5 }}` 同时实现：
 *   (a) 固定列（横向 sticky）—— M2 ✅
 *   (b) 固定表头（纵向 sticky，y 控制表体高度）—— M8 ✅
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：固定列（Name/Age fixed start + Action fixed end）+
 *   `scroll={{ x: 'max-content', y: true }}`（决策 7 数据区域模式，表头固定 + 表体滚动 +
 *   纵/横悬浮滚动条）+ 父容器 height:330（CSS 自适应高度，对齐 antd y:55*5=275 表体 + 表头 ~55）。
 * - **右栏（antd Table）**：忠实复刻 antd 官方 fixed-columns-header demo（同列结构 +
 *   `scroll={{ x:'max-content', y:55*5 }}` + 100 行）。
 * - **共享控制条**：`Bordered` 开关同时驱动两侧表格。antd demo 原本无控制条，此处加最小
 *   开关便于对照。共享数据见 `_compare/fixed-columns-header.shared.ts`。
 *
 * === corner cell 双 sticky（M8 × M2）===
 *
 * 左上角（Name/Age fixed start 的表头格）与右上角（Action fixed end 的表头格）同时：
 *   - 横向 sticky（left/right，M2，zIndex 3）
 *   - 纵向 sticky（top:0，M8，zIndex 4）
 * 单元素双 sticky 浏览器原生支持（与 antd rc-table corner cell 一致）。角单元格 z-index 取
 * **最高（5）**（仅纵向 4 的中间表头格、仅横向 3 的固定列表头格都低于它），保证横向滚动时
 * 中间表头格不会盖住 corner cell，纵向滚动时固定列表头格也不被普通表头盖住。
 *
 * === 两侧保留并如实呈现的差异（对照修 bug 的意义所在）===
 *
 * 1. **scroll.y**：左栏 data-grid `scroll.y:true`（决策 7 CSS 自适应高度，父容器 height:330≈
 *    antd y:55*5=275 表体 + 表头 ~55）；右栏 antd 数字 `scroll.y:55*5`（忠实官方）。
 * 2. **createStyles 细滚动条**：antd 官方 demo 用 antd-style 自定义细滚动条；data-grid 项目未装
 *    antd-style（决策 6），两侧均用浏览器默认滚动条（data-grid 侧走 #35 悬浮滚动条）。
 * 3. **★ §9 右固定列脱离观察**（task #38 同源 narrow gap）：左栏含 `scroll.x:'max-content'` +
 *    Action fixed 'end' + 中间 Column 8-20 无 width（max-content），横滚到最右时 data-grid
 *    右固定列 Action 可能脱离容器右边缘（§9 已登记：无 width 列 max-content vs antd width+flex
 *    fill）。右栏 antd 无此问题。如实保留对照，登记 §9 不修。
 */

import { useState } from 'react'
import { Space, Switch, Table as AntdTable } from 'antd'
import type { TableColumnsType } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import { dataSource, type DataType } from './_compare/fixed-columns-header.shared'

// ---------------------------------------------------------------------------
// 列定义 —— 两侧字段（title/dataIndex/key/width/fixed/render）逐字一致
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<DataType>[] = [
  { title: 'Full Name', width: 100, dataIndex: 'name', key: 'name', fixed: 'start' },
  { title: 'Age', width: 100, dataIndex: 'age', key: 'age', fixed: 'start' },
  { title: 'Column 1', dataIndex: 'address', key: '1', width: 150 },
  { title: 'Column 2', dataIndex: 'address', key: '2', width: 150 },
  { title: 'Column 3', dataIndex: 'address', key: '3', width: 150 },
  { title: 'Column 4', dataIndex: 'address', key: '4', width: 150 },
  { title: 'Column 5', dataIndex: 'address', key: '5', width: 150 },
  { title: 'Column 6', dataIndex: 'address', key: '6', width: 150 },
  { title: 'Column 7', dataIndex: 'address', key: '7', width: 150 },
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

const antdColumns: TableColumnsType<DataType> = [
  { title: 'Full Name', width: 100, dataIndex: 'name', key: 'name', fixed: 'start' },
  { title: 'Age', width: 100, dataIndex: 'age', key: 'age', fixed: 'start' },
  { title: 'Column 1', dataIndex: 'address', key: '1', width: 150 },
  { title: 'Column 2', dataIndex: 'address', key: '2', width: 150 },
  { title: 'Column 3', dataIndex: 'address', key: '3', width: 150 },
  { title: 'Column 4', dataIndex: 'address', key: '4', width: 150 },
  { title: 'Column 5', dataIndex: 'address', key: '5', width: 150 },
  { title: 'Column 6', dataIndex: 'address', key: '6', width: 150 },
  { title: 'Column 7', dataIndex: 'address', key: '7', width: 150 },
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

export default function FixedColumnsHeaderDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)
  // ★ 虚拟化开关（决策 9 对照）：两侧表格同步切换虚拟/非虚拟。
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一个状态同时驱动两侧表格。
          DemoToolbar 用 useToken（light/dark/自定义 token 自适应），替代硬编码 #fff/#f0f0f0。 */}
      <DemoToolbar>
        <Space wrap>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=900 → 横排阈值 ≈ 900×2 + 16 = 1816px。纯 CSS flex-wrap 自适应（无 JS）。
        本 demo 含 scroll.x:'max-content' 的宽表（23 列），半宽（~960px at 1920 视口）下
        每栏仅 ~480px 太挤、横滚严重；取大阈值使常规笔记本视口（1440–1920）下 **竖排**
        （每栏全宽，对 max-content 宽表更友好），仅超宽屏（≥2200）才横排。
      */}
      <SplitDemo
        minPaneWidth={900}
        left={
          /* 左栏 data-grid：决策 7 父容器需有明确 height。
             height 330 ≈ antd y:55*5=275 表体 + 表头 ~55，对齐右栏可视高度。
             scroll.y:true 数据区域模式，表体 flex:1 填满容器剩余空间。 */
          <div style={{ height: 330 }}>
            <Table<DataType>
              columns={dgColumns}
              dataSource={dataSource}
              bordered={bordered}
              // ★ 虚拟化透传；data-grid 已有 scroll.y:true（表体纵向滚动模式），
              // ON 仅叠加 virtual，scroll 不动（已有 y，避免重复计算）。
              virtual={virtual}
              scroll={{ x: 'max-content', y: true }}
            />
          </div>
        }
        right={
          // antd 官方 fixed-columns-header demo 忠实复刻：
          // Full Name/Age fixed start + Action fixed end +
          // scroll x max-content + y 55*5 + 100 行。
          <AntdTable<DataType>
            columns={antdColumns}
            dataSource={dataSource}
            bordered={bordered}
            // ★ 虚拟化透传；antd 已有数字 scroll.y:55*5（表体高度），ON 仅叠加 virtual + x 转数字 2000
            // （antd virtual 不接受 'max-content'，转数字规避；OFF 回退原 max-content 零回归）。
            virtual={virtual}
            scroll={virtual ? { x: 2000, y: 55 * 5 } : { x: 'max-content', y: 55 * 5 }}
            pagination={false}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B13，固定列 + 固定表头 M2×M8）：</strong>
          本 demo 左右并排呈现 data-grid 与 antd fixed-columns-header，方便对照修 bug。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>固定列 + 固定表头</strong>：Full Name + Age 固定 <code>start</code>（左），
              Action 固定 <code>end</code>（右）；表头纵向固定（表体滚动时表头钉顶）。
              corner cell（左上 Name/Age 表头格 + 右上 Action 表头格）双 sticky
              （横向 left/right + 纵向 top:0），z-index 最高（5），横向滚动不被中间表头格盖住。
            </li>
            <li>
              <strong>scroll.y 差异</strong>：左栏 data-grid <code>scroll.y:true</code>
              （决策 7 数据区域模式 + CSS 自适应高度，父容器 height:330≈ antd 表体 275 + 表头 ~55）；
              右栏 antd 数字 <code> scroll.y:55*5 </code>（忠实官方）。两侧表体均可纵向滚动、表头钉顶。
            </li>
            <li>
              <strong>createStyles 滚动条差异</strong>：antd 官方 demo 用 antd-style 自定义细滚动条；
              data-grid 项目未装 antd-style，左侧走 #35 悬浮滚动条（macOS 风格），右侧用浏览器默认。
            </li>
            <li>
              <strong>★ §9 右固定列脱离观察</strong>（task #38 同源 narrow gap）：左栏含
              <code> scroll.x:'max-content' </code>+ Action fixed 'end' + 中间 Column 8-20 无 width
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
