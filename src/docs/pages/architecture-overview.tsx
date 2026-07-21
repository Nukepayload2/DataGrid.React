import {
  DocSection,
  DocsDataGrid,
} from '../components'
import type { OverviewRow } from './shared'

export function renderArchitecture() {
  return (
    <>
      <DocSection
        id="layers"
        eyebrow="系统分层"
        title="四层职责"
        description="data-grid 的目标是用 CSS Grid 重做 antd Table，并保持 antd v6 的 React API 和 token 生态尽量可迁移。"
      >
        <DocsDataGrid<OverviewRow>
          columns={[
            { title: '层级', dataIndex: 'area', key: 'area', width: '20%' },
            { title: '职责', dataIndex: 'purpose', key: 'purpose', width: '60%' },
            { title: '文档入口', dataIndex: 'entry', key: 'entry', width: '20%' },
          ]}
          dataSource={[
            { key: 'render', area: '渲染层', purpose: '列轨道、表头、表体、固定列、合并和虚拟化。', entry: '渲染模型' },
            { key: 'compat', area: '兼容层', purpose: '暴露 TableProps、ColumnType 和 JSX API，与 antd Table 同名同义以便直接迁移。', entry: '兼容矩阵' },
            { key: 'style', area: '样式层', purpose: '复用 antd v6 token 和 CSS variables。', entry: '样式和主题' },
            { key: 'demo', area: 'demo 站点', purpose: '用左右对照验证 data-grid 与 antd 官方示例的差异。', entry: 'demo' },
          ]}
          rowKey="key"
        />
      </DocSection>

      <DocSection id="boundaries" eyebrow="产品边界" title="什么自研，什么复用">
        <ul className="docs-bullet-list">
          <li>表格核心自研：多级表头、固定列、合并、虚拟滚动、排序、筛选、选择、展开。</li>
          <li>非表格核心复用 antd：Pagination、Spin、Tooltip、Dropdown、Empty 及其它通用控件。</li>
          <li>兼容目标以真实业务和 antd demo 为主，不追求所有历史兼容 API。</li>
        </ul>
      </DocSection>
    </>
  )
}
