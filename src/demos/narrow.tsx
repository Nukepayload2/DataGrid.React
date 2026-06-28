/**
 * 复刻 antd `narrow` demo：`G:\Projects\ant-design\components\table\demo\narrow.tsx`。
 *
 * === S27 落地说明 ===
 *
 * antd v6 narrow demo：窄容器（width: 300）内 + 200 行数据 + `size="small"` + 分页
 * `defaultCurrent: 13`，演示在小空间内展示大量数据。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（外层 width:300 容器 + small + pagination）。
 * - **右栏（antd Table）**：忠实复刻 antd narrow demo（同款 width:300 + small + pagination）。
 * - **共享控制条**：`Pagination` 开关 + `Default Current` Segmented（1/13/20），两侧同步。
 * - **共享数据/列**：见 `_compare/narrow.shared.ts`。
 *
 * === ★ 已知 gap（§9 列宽策略，登记不修）===
 *
 * data-grid 表格总宽默认 = `max-content`（每列 track 取内容宽度），窄容器 300px 下表格会
 * 横向溢出。antd 用 `table-layout: fixed` + `width: 100%` 让列均分容器宽度。两侧差异对照可见。
 * 根因：narrow demo 列无 width + 未显式传 `tableLayout: 'fixed'` → data-grid 走 auto 语义（每列
 * max-content），符合 grid auto 模式预期（非回归）。若要消除溢出需 demo 显式传 fixed（决策层事项）。
 *
 * === ★ 已知 polish（§9 B2：Page Segmented 切换不翻页，登记不修）===
 *
 * 控制条 Page 1/13/20 Segmented 用 `pagination.defaultCurrent`（非受控初值），切换 Segmented 只更新
 * React state，不会重置 Table 内部 current（antd `defaultCurrent` 同语义，两侧行为一致）。非引擎 bug。
 *
 * minPaneWidth=320：narrow demo 单侧容器 300px + 边框/padding，两栏并排需 ~656+；320 阈值使
 * 容器 ≥ 656 横排（超宽屏），常规视口竖排（每栏全宽，300 容器 + 表格更清晰）。
 */

import { useState } from 'react'
import { Segmented, Space, Switch, Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { Table } from '../table'
import type { ColumnType, TablePaginationConfig } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { dataSource, rawColumns, type RecordType } from './_compare/narrow.shared'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（SplitDemo pane 自动限高，虚拟窗口才有滚动区）
import { useVirtualization } from './VirtualizationContext'

// 左栏 data-grid 列定义。
const dgColumns: ColumnType<RecordType>[] = rawColumns.map((c) => ({ ...c }))
// 右栏 antd 列定义。
const antdColumns: NonNullable<TableProps<RecordType>['columns']> = rawColumns.map((c) => ({ ...c }))

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function NarrowDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [paginated, setPaginated] = useState(true)
  const [defaultCurrent, setDefaultCurrent] = useState<number>(13)
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y（原 narrow demo 无 scroll，
  // ON 用 dg {y:true}/antd {y:280}——200 行虚拟化对窄容器很有意义；OFF 回 undefined，行为与改造前一致）。
  const { virtual } = useVirtualization()

  // pagination 配置：开 = { defaultCurrent }，关 = false（全显）。
  const dgPagination: TablePaginationConfig | false = paginated ? { defaultCurrent } : false
  const antdPagination: TableProps<RecordType>['pagination'] = paginated
    ? { defaultCurrent }
    : false

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。
          DemoToolbar 用 useToken（light/dark/自定义 token 自适应），替代硬编码 #fff/#f0f0f0。 */}
      <DemoToolbar>
        <Space wrap>
          <Switch
            checked={paginated}
            onChange={setPaginated}
            checkedChildren="Pagination"
            unCheckedChildren="Pagination"
          />
          <Segmented
            value={defaultCurrent}
            onChange={(val) => setDefaultCurrent(val as number)}
            options={[
              { label: 'Page 1', value: 1 },
              { label: 'Page 13', value: 13 },
              { label: 'Page 20', value: 20 },
            ]}
            disabled={!paginated}
          />
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=320：narrow 单侧容器 300px，两栏并排需 ~656+（300×2 + padding/border + gap）。
        320 阈值使超宽屏（≥2560）可横排；常规视口（1440–1920）竖排，每栏全宽更清晰。
      */}
      <SplitDemo
        minPaneWidth={320}
        left={
          /* ★ virtual ON 时内层 div 加 flex 链（flex:1 + minHeight:0 + 自身 flex column），
             让 .dg-compare__body（virtual ON 时 height:400, flex column）的有界高经本 div
             透传给 .dg-wrapper.dg-data-area（height:100%）→ .dg-scroll-wrap flex:1 → 虚拟窗口有界裁剪。
             原因：data-grid scroll.y:true 用 CSS 自适应高度（依赖父链有界），而 narrow 内层 div
             原本只有 width:300 无 height → .dg-wrapper height:100% 退化为 auto → 200 行全渲染（11238px）。
             OFF 时回原状（仅 width:300，无 flex 干预，行为与改造前一致）。 */
          <div
            style={
              virtual
                ? { width: 300, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }
                : { width: 300 }
            }
          >
            <Table<RecordType>
              columns={dgColumns}
              dataSource={dataSource}
              size="small"
              pagination={dgPagination}
              /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
                 pane 限高，虚拟窗口才有滚动区）；OFF 时回 undefined（原 narrow demo 无 scroll），零回归。 */
              virtual={virtual}
              scroll={virtual ? { y: true } : undefined}
            />
          </div>
        }
        right={
          <div style={{ width: 300 }}>
            <AntdTable<RecordType>
              columns={antdColumns}
              dataSource={dataSource}
              size="small"
              pagination={antdPagination}
              /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:280（antd 不认 true，且表头/分页画在
                 scroll.y 之外，扣除后约 280 塞进 pane 限高）；OFF 时回 undefined（原 narrow demo 无 scroll），零回归。 */
              virtual={virtual}
              scroll={virtual ? { y: 280 } : undefined}
            />
          </div>
        }
      >
        <div>
          <strong>对照说明（决策 9 T1）：</strong>左右并排呈现 data-grid 与 antd narrow demo，
          两侧均包 300px 宽容器 + 200 行 + size="small" + 分页。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>Pagination 开关</strong>：开 = 分页（defaultCurrent 可选 1/13/20）；
              关 = 全显 200 行（两侧同步）。
            </li>
            <li>
              <strong>★ 列宽 gap（§9）</strong>：左栏 data-grid 列宽 max-content → 表格溢出 300px
              容器（出现横向滚动）；右栏 antd <code>table-layout:fixed</code> + <code>width:100%</code>
              → 列均分容器。这是 data-grid 列宽策略 gap（非 size 问题），登记 §9 不在本任务修。
            </li>
            <li>
              <strong>size="small"</strong>：两侧均 small（cell padding 8/8），对照行高一致。
            </li>
            <li>
              <strong>★ Page Segmented 切换不翻页（§9 B2 polish，已知保留）</strong>：控制条 Page 1 /
              13 / 20 Segmented 仅设 <code>pagination.defaultCurrent</code>（antd Table 的
              <strong>非受控初值</strong>，仅在 Table 挂载时读取一次）。切换 Segmented 后 state 更新但
              <strong>不会重置 Table 内部 current</strong>，故分页器不跳转（两侧行为一致：antd 官方
              <code>defaultCurrent</code> 同语义）。要实现切换即跳转需改受控 <code>pagination.current</code>
              + <code>onChange</code>（demo 决策层事项，非引擎 bug）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
