/**
 * Semantic DOM 兼容性对比 demo（item3 B-impl）。
 *
 * 对齐 antd `_semantic.tsx` 的 13 槽位思路 + data-grid 的双栏对比框架。本 demo 同时验证
 * 三件事：
 *
 * 1. **13 槽位 classNames/styles 染色对照**：给两侧表格各传一套高对比 classNames/styles
 *    （每槽一种霓虹色 outline + data-slot 标注），让每个槽位视觉可辨。预期差异：
 *      - dg 的 header.wrapper / body.wrapper **不染色**（架构限制：dg 无 thead/tbody 容器，
 *        仅有逻辑槽位接口，渲染层无对应 DOM）。
 *      - dg 的 header.row / body.row 染色**分散到行内所有 cell**（grid 无 tr，行 class 透传
 *        到该行所有单元格；本次 B-impl 已补 header.row 注入，与 body.row 对称）。
 *      - 其余 9 槽位（root/section/content/title/footer/header.cell/body.cell/pagination.root/
 *        pagination.item）两侧视觉等价。
 *
 * 2. **a11y 对比**（demo 下方说明区表格）：列出 role(table/row/rowgroup/columnheader/
 *    gridcell/rowheader) / aria-sort / aria-expanded / aria-label / aria-colspan 等 a11y
 *    属性，分 antd（真 table 天然/显式）vs dg 现状 vs dg 补齐后 三栏对照。
 *
 * 3. **排序 aria-sort 专项**：Age 列可排序（sorter: true），点击表头时两侧表头 aria-sort
 *    同步 ascending ↔ descending ↔ （未设）。用 devtools Elements 面板点表头观察 aria-sort
 *    属性变化。
 *
 * 详见兼容矩阵：`docs/semantic-dom-compat.md`。
 *
 * ★ 架构天花板说明：data-grid 用 div + CSS Grid 渲染（非真 `<table>`），行＝多 cell 直接铺
 *   在 grid 上**无行容器**，故无法构成有效 ARIA table 结构（role=table/row/rowgroup/
 *   columnheader/gridcell/rowheader 需父子层级才有效）。本 demo 不强行加这些 role（避免
 *   无效 ARIA），仅在 doc 记录天花板。补行容器是未来架构工作。
 */

import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { TableProps as AntdTableProps, TableColumnsType } from 'antd'
import { Table as AntdTable } from 'antd'
import { Table } from '../table'
import type { ColumnType, TableClassNames, TableStyles } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { semanticData, type SemanticRecord } from './_compare/semantic-dom.shared'

// ---------------------------------------------------------------------------
// 13 槽位染色：每槽一种霓虹色 outline + className（两侧共用同一套字面量）。
// ---------------------------------------------------------------------------

// data-grid 侧 classNames（13 槽）。header.wrapper / body.wrapper 在 dg 渲染层无对应 DOM，
// 引擎忽略（不报错，但视觉无变化）——这正是要演示的「架构限制」差异。
const dgClassNames: TableClassNames<SemanticRecord> = {
  root: 'dg-semi-slot-root',
  section: 'dg-semi-slot-section',
  content: 'dg-semi-slot-content',
  title: 'dg-semi-slot-title',
  footer: 'dg-semi-slot-footer',
  header: {
    wrapper: 'dg-semi-slot-header-wrapper', // dg 无 thead 容器 → 不渲染
    row: 'dg-semi-slot-header-row', // B-impl 已补：透传到表头行所有 cell
    cell: 'dg-semi-slot-header-cell',
  },
  body: {
    wrapper: 'dg-semi-slot-body-wrapper', // dg 无 tbody 容器 → 不渲染
    row: 'dg-semi-slot-body-row', // 透传到表体行所有 cell
    cell: 'dg-semi-slot-body-cell',
  },
  pagination: {
    root: 'dg-semi-slot-pagination-root',
    item: 'dg-semi-slot-pagination-item',
  },
}

// antd 侧 classNames（13 槽，逐字相同）。antd 有 thead/tbody/tr 真实容器，故 header.wrapper/
// body.wrapper/header.row/body.row 全部染色成功（与 dg 形成对照）。
const antdClassNames: NonNullable<AntdTableProps<SemanticRecord>['classNames']> = {
  root: 'dg-semi-slot-root',
  section: 'dg-semi-slot-section',
  content: 'dg-semi-slot-content',
  title: 'dg-semi-slot-title',
  footer: 'dg-semi-slot-footer',
  header: {
    wrapper: 'dg-semi-slot-header-wrapper',
    row: 'dg-semi-slot-header-row',
    cell: 'dg-semi-slot-header-cell',
  },
  body: {
    wrapper: 'dg-semi-slot-body-wrapper',
    row: 'dg-semi-slot-body-row',
    cell: 'dg-semi-slot-body-cell',
  },
  pagination: {
    root: 'dg-semi-slot-pagination-root',
    item: 'dg-semi-slot-pagination-item',
  },
}

// styles：每槽补一个 inline outline + data-slot 标注（视觉冗余，便于 devtools 定位）。
// 用 inline style 而非依赖外部 CSS，确保 demo 自包含（无 CSS 文件依赖）。
const slotOutline = (color: string): CSSProperties => ({
  outline: `2px dashed ${color}`,
  outlineOffset: -2,
})
const dgStyles: TableStyles<SemanticRecord> = {
  root: slotOutline('#ff00ff'),
  section: slotOutline('#00ffff'),
  content: slotOutline('#ffff00'),
  title: slotOutline('#ff5500'),
  footer: slotOutline('#00ff55'),
  header: {
    wrapper: slotOutline('#5500ff'),
    row: slotOutline('#ff0055'),
    cell: slotOutline('#ff5555'),
  },
  body: {
    wrapper: slotOutline('#55ff00'),
    row: slotOutline('#0055ff'),
    cell: slotOutline('#5555ff'),
  },
  pagination: {
    root: slotOutline('#ffaa00'),
    item: slotOutline('#aa00ff'),
  },
}
const antdStyles: NonNullable<AntdTableProps<SemanticRecord>['styles']> = dgStyles

// ---------------------------------------------------------------------------
// 列定义：Age 可排序（aria-sort 专项）+ Name rowScope（行表头语义演示）。
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<SemanticRecord>[] = [
  {
    title: 'Personal Info',
    children: [
      { title: 'Name', dataIndex: 'name', key: 'name', rowScope: 'row' },
      {
        title: 'Age',
        dataIndex: 'age',
        key: 'age',
        sorter: true,
        showSorterTooltip: false,
      },
    ],
  },
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

const antdColumns: TableColumnsType<SemanticRecord> = [
  {
    title: 'Personal Info',
    children: [
      { title: 'Name', dataIndex: 'name', key: 'name', rowScope: 'row' },
      {
        title: 'Age',
        dataIndex: 'age',
        key: 'age',
        sorter: true,
        showSorterTooltip: false,
      },
    ],
  },
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

// ---------------------------------------------------------------------------
// a11y 兼容矩阵（demo 下方说明区表格）。源数据同步 docs/semantic-dom-compat.md。
// ---------------------------------------------------------------------------

interface A11yRow {
  attr: string
  antd: string
  dgNow: string
  dgAfter: string
}

const a11yMatrix: A11yRow[] = [
  {
    attr: 'role="table"（根）',
    antd: '天然（<table>）',
    dgNow: '缺失',
    dgAfter: '不加（无行容器，单独 role=table 无效）',
  },
  {
    attr: 'role="rowgroup"（thead/tbody）',
    antd: '天然（<thead>/<tbody>）',
    dgNow: '缺失',
    dgAfter: '不加（dg 无 thead/tbody 容器）',
  },
  {
    attr: 'role="row"（tr）',
    antd: '天然（<tr>）',
    dgNow: '缺失',
    dgAfter: '不加（dg 行＝多 cell 无容器，role=row 需子级 cell 才有效）',
  },
  {
    attr: 'role="columnheader"（th）',
    antd: '天然（<th>）',
    dgNow: '缺失',
    dgAfter: '不加（需父级 role=row）',
  },
  {
    attr: 'role="gridcell"（td）',
    antd: '天然（<td>）',
    dgNow: '缺失',
    dgAfter: '不加（需父级 role=row）',
  },
  {
    attr: 'role="rowheader"（rowScope 列）',
    antd: '天然（<th scope="row">）',
    dgNow: '缺失',
    dgAfter: '不加（需父级 role=row）',
  },
  {
    attr: 'aria-sort（可排序列表头）',
    antd: '显式（useSorter.tsx:246-248）',
    dgNow: '✅ 已补（B-impl：ascending/descending，未排序不设）',
    dgAfter: '✅ 已补',
  },
  {
    attr: 'aria-expanded（展开行）',
    antd: '显式（ExpandIcon.tsx）',
    dgNow: '✅ 已有（engine/ExpandIcon.tsx:60-61）',
    dgAfter: '✅ 已有',
  },
  {
    attr: 'aria-label（表头/控件）',
    antd: '部分（select-all 等）',
    dgNow: '部分（selection aria、resize separator）',
    dgAfter: '部分（同 antd）',
  },
  {
    attr: 'aria-colspan（合并数据格）',
    antd: '天然（<td colspan>）',
    dgNow: '✅ 已补（B-impl：colSpan>=2 时设）',
    dgAfter: '✅ 已补',
  },
  {
    attr: 'aria-rowspan（合并数据格）',
    antd: '天然（<td rowspan>）',
    dgNow: '✅ 已补（B-impl：rowSpanTracks>=2 时设）',
    dgAfter: '✅ 已补',
  },
]

// ---------------------------------------------------------------------------
// 13 槽位染色对照表（demo 下方说明区）。
// ---------------------------------------------------------------------------

interface SlotRow {
  slot: string
  color: string
  dgRender: string
  antdRender: string
}

const slotMatrix: SlotRow[] = [
  { slot: 'root', color: '#ff00ff', dgRender: '.dg-wrapper', antdRender: '.ant-table-wrapper' },
  { slot: 'section', color: '#00ffff', dgRender: '.dg-scroll', antdRender: '.ant-table' },
  { slot: 'content', color: '#ffff00', dgRender: '.dg-grid', antdRender: '.ant-table-container' },
  { slot: 'title', color: '#ff5500', dgRender: '.dg-title', antdRender: '.ant-table-title' },
  { slot: 'footer', color: '#00ff55', dgRender: '.dg-footer', antdRender: '.ant-table-footer' },
  {
    slot: 'header.wrapper',
    color: '#5500ff',
    dgRender: '❌ 不渲染（无 thead 容器）',
    antdRender: '.ant-table-thead',
  },
  {
    slot: 'header.row',
    color: '#ff0055',
    dgRender: '✅ B-impl 已补（透传到表头行所有 cell）',
    antdRender: '<tr>',
  },
  {
    slot: 'header.cell',
    color: '#ff5555',
    dgRender: '.dg-cell-header',
    antdRender: '<th>',
  },
  {
    slot: 'body.wrapper',
    color: '#55ff00',
    dgRender: '❌ 不渲染（无 tbody 容器）',
    antdRender: '.ant-table-tbody',
  },
  {
    slot: 'body.row',
    color: '#0055ff',
    dgRender: '✅ 透传到表体行所有 cell',
    antdRender: '<tr>',
  },
  {
    slot: 'body.cell',
    color: '#5555ff',
    dgRender: '.dg-cell-body',
    antdRender: '<td>',
  },
  {
    slot: 'pagination.root',
    color: '#ffaa00',
    dgRender: '.dg-pagination',
    antdRender: '.ant-pagination',
  },
  {
    slot: 'pagination.item',
    color: '#aa00ff',
    dgRender: '透传到 antd Pagination',
    antdRender: '.ant-pagination-item',
  },
]

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function SemanticDomDemo() {
  // 共享 sortKey（演示 aria-sort 同步；两侧各持有自身 sortOrder 态，但点击 Age 表头时
  // 视觉/aria-sort 应一致——本 demo 不强同步两表 state，各自独立排序，但同一列的 aria-sort
  // 语义相同，便于 devtools 对照）。
  const [dgSortOrder, setDgSortOrder] = useState<'ascend' | 'descend' | null>(null)
  const [antdSortOrder, setAntdSortOrder] = useState<'ascend' | 'descend' | null>(null)

  const dgPagination = { pageSize: 3 }
  const antdPagination = { pageSize: 3 }

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          background: '#fff',
          fontSize: 13,
          color: 'rgba(0,0,0,0.75)',
        }}
      >
        <strong>Semantic DOM 兼容对照：</strong> 左右并排呈现 data-grid 与 antd Table，13 槽位
        classNames/styles 各染一种霓虹色 outline。点击 <strong>Age</strong> 表头排序，用 devtools
        Elements 面板观察两侧表头 <code>aria-sort</code> 同步变化。完整矩阵见下方说明区 +
        <code> docs/semantic-dom-compat.md</code>。
      </div>

      <SplitDemo
        minPaneWidth={520}
        // ★ virtualizable={false}：本 demo 展示完整 DOM 结构 / a11y 矩阵，虚拟化会隐藏非可视行
        // 破坏检视目的，故排除——全局「Virtual」开关对它不生效（ON 时也不加 `.dg-compare--virtual` 限高）。
        virtualizable={false}
        left={
          <div>
            <Table<SemanticRecord>
              columns={dgColumns}
              dataSource={semanticData}
              classNames={dgClassNames}
              styles={dgStyles}
              title={() => 'data-grid Title'}
              footer={() => 'data-grid Footer'}
              size="small"
              pagination={dgPagination}
              onChange={(_pag, _filters, sorter) => {
                const order = Array.isArray(sorter)
                  ? (sorter[0]?.order ?? null)
                  : (sorter?.order ?? null)
                setDgSortOrder(order as 'ascend' | 'descend' | null)
              }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>
              当前 Age 列 sortOrder = <code>{String(dgSortOrder)}</code>
            </div>
          </div>
        }
        right={
          <div>
            <AntdTable<SemanticRecord>
              columns={antdColumns}
              dataSource={semanticData}
              classNames={antdClassNames}
              styles={antdStyles}
              title={() => 'antd Title'}
              footer={() => 'antd Footer'}
              size="small"
              pagination={antdPagination}
              onChange={(_pag, _filters, sorter) => {
                const order = Array.isArray(sorter)
                  ? (sorter[0]?.order ?? null)
                  : (sorter?.order ?? null)
                setAntdSortOrder(order as 'ascend' | 'descend' | null)
              }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>
              当前 Age 列 sortOrder = <code>{String(antdSortOrder)}</code>
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 13 槽位染色对照表 */}
          <div>
            <h3 style={{ margin: '0 0 8px' }}>13 槽位染色对照</h3>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12,
              }}
            >
              <thead>
                <tr style={{ background: '#fafafa', textAlign: 'left' }}>
                  <th style={cellBorder}>槽位</th>
                  <th style={cellBorder}>色标</th>
                  <th style={cellBorder}>data-grid 渲染</th>
                  <th style={cellBorder}>antd 渲染</th>
                </tr>
              </thead>
              <tbody>
                {slotMatrix.map((row) => (
                  <tr key={row.slot}>
                    <td style={cellBorder}>
                      <code>{row.slot}</code>
                    </td>
                    <td style={{ ...cellBorder, width: 24 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 16,
                          height: 16,
                          background: row.color,
                          border: '1px solid rgba(0,0,0,0.15)',
                        }}
                      />
                    </td>
                    <td style={cellBorder}>{row.dgRender}</td>
                    <td style={cellBorder}>{row.antdRender}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginTop: 6 }}>
              <strong>预期差异</strong>：dg 的 <code>header.wrapper</code> /
              <code> body.wrapper</code> 不染色（架构限制）；<code>header.row</code> /
              <code> body.row</code> 染色分散到行内所有 cell（grid 无 tr）；其余 9 槽位两侧视觉等价。
            </p>
          </div>

          {/* a11y 兼容矩阵 */}
          <div>
            <h3 style={{ margin: '0 0 8px' }}>a11y 属性兼容矩阵</h3>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12,
              }}
            >
              <thead>
                <tr style={{ background: '#fafafa', textAlign: 'left' }}>
                  <th style={cellBorder}>属性 / role</th>
                  <th style={cellBorder}>antd（真 table）</th>
                  <th style={cellBorder}>dg 现状</th>
                  <th style={cellBorder}>dg 补齐后</th>
                </tr>
              </thead>
              <tbody>
                {a11yMatrix.map((row) => (
                  <tr key={row.attr}>
                    <td style={cellBorder}>
                      <code>{row.attr}</code>
                    </td>
                    <td style={cellBorder}>{row.antd}</td>
                    <td style={cellBorder}>{row.dgNow}</td>
                    <td style={cellBorder}>{row.dgAfter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginTop: 6 }}>
              <strong>架构天花板</strong>：dg 用 div + CSS Grid 渲染，行＝多 cell 直接铺在 grid 上
              <strong> 无行容器</strong>，故 role=table/row/rowgroup/columnheader/gridcell/rowheader
              无法构成有效 ARIA 结构（需父子层级）。补行容器是未来架构工作；详见
              <code> docs/semantic-dom-compat.md</code>。
            </p>
          </div>

          {/* aria-sort 专项 */}
          <div>
            <h3 style={{ margin: '0 0 8px' }}>aria-sort 专项验证</h3>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: 'rgba(0,0,0,0.75)' }}>
              <li>用 devtools Elements 面板选中两侧 Age 列表头格（<code>.dg-cell-header</code> /
                <code> th</code>）。</li>
              <li>点击 Age 表头：观察 <code>aria-sort</code> 属性
                — <code>ascending</code> → <code>descending</code> → （未设）循环。</li>
              <li>两侧 <code>aria-sort</code> 语义一致（ascending/descending 同款）。</li>
            </ol>
            <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginTop: 6 }}>
              <strong>虚拟化开关不生效</strong>：本 demo 展示完整 DOM 结构 / a11y 矩阵，
              虚拟化会隐藏非可视行破坏检视目的，故排除。
            </p>
          </div>
        </div>
      </SplitDemo>
    </div>
  )
}

// 共享 cell border 样式（说明区表格用）。
const cellBorder: CSSProperties = {
  border: '1px solid #f0f0f0',
  padding: '6px 8px',
  verticalAlign: 'top',
}
