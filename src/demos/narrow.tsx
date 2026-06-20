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
import { dataSource, rawColumns, type RecordType } from './_compare/narrow.shared'

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

  // pagination 配置：开 = { defaultCurrent }，关 = false（全显）。
  const dgPagination: TablePaginationConfig | false = paginated ? { defaultCurrent } : false
  const antdPagination: TableProps<RecordType>['pagination'] = paginated
    ? { defaultCurrent }
    : false

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。 */}
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
      </div>

      {/*
        minPaneWidth=320：narrow 单侧容器 300px，两栏并排需 ~656+（300×2 + padding/border + gap）。
        320 阈值使超宽屏（≥2560）可横排；常规视口（1440–1920）竖排，每栏全宽更清晰。
      */}
      <SplitDemo
        minPaneWidth={320}
        left={
          <div style={{ width: 300 }}>
            <Table<RecordType>
              columns={dgColumns}
              dataSource={dataSource}
              size="small"
              pagination={dgPagination}
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
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
