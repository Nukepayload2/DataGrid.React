import type { CSSProperties } from 'react'
import { SplitDemo } from './_compare/SplitDemo'
import SemanticDomDg from './semantic-dom-slots.dg'
import SemanticDomAntd from './semantic-dom-slots.antd'

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
    dgNow: '✅ 已补（ascending/descending，未排序不设）',
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
    dgNow: '✅ 已补（colSpan>=2 时设）',
    dgAfter: '✅ 已补',
  },
  {
    attr: 'aria-rowspan（合并数据格）',
    antd: '天然（<td rowspan>）',
    dgNow: '✅ 已补（rowSpanTracks>=2 时设）',
    dgAfter: '✅ 已补',
  },
]

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
    dgRender: '✅ 透传到表头行所有 cell',
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

const cellBorder: CSSProperties = {
  border: '1px solid #f0f0f0',
  padding: '6px 8px',
  verticalAlign: 'top',
}

export default function SemanticDomDemo() {
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
        virtualizable={false}
        left={<SemanticDomDg />}
        right={<SemanticDomAntd />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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
              无法构成有效 ARIA 结构（需父子层级）。详见
              <code> docs/design-notes/layout.md</code> 与 <code>docs/semantic-dom-compat.md</code>。
            </p>
          </div>

          {/* aria-sort 专项 */}
          <div>
            <h3 style={{ margin: '0 0 8px' }}>aria-sort 专项验证</h3>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(0,0,0,0.75)' }}>
              点击 Age 表头排序，两侧表头 <code>aria-sort</code> 在
              <code> ascending</code> → <code>descending</code> → （未设）循环，语义一致。
            </p>
          </div>
        </div>
      </SplitDemo>
    </div>
  )
}
