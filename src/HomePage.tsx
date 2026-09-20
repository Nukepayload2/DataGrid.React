/** 学习资源首页。 */

import type { CSSProperties } from 'react'
import { Button, Card, Col, Row, Typography, theme } from 'antd'
import type { ColumnType, StickyConfig } from './table'
import { Table } from './table'
import { navigate } from './demos/registry'

const { Title, Paragraph, Text } = Typography

interface CapabilityRow {
  area: string
  advantage: string
  api: string
  demo: string
  demoPath: string
}

const capabilityRows: CapabilityRow[] = [
  {
    area: 'antd 迁移',
    advantage: '保留熟悉的 columns、dataSource、rowSelection、expandable、pagination 等 Table 写法。',
    api: 'TableProps / ColumnType',
    demo: '基础表格',
    demoPath: '/demos/basic-table',
  },
  {
    area: '虚拟滚动',
    advantage: '面向大数据列表优化，配合 CSS Grid 和可选 DOM 复用降低渲染成本。',
    api: 'virtual / scroll.y / gridOptions',
    demo: '虚拟列表',
    demoPath: '/demos/virtual-list',
  },
  {
    area: '固定列和表头',
    advantage: '固定列、固定表头、横向滚动和页面级 sticky 可以组合使用。',
    api: 'column.fixed / scroll / sticky',
    demo: '固定列和表头',
    demoPath: '/demos/fixed-columns-and-header',
  },
  {
    area: '布局稳定性',
    advantage: '用 CSS Grid 管理列轨道、合并、隐藏列和滚动条，减少传统 table 布局的错位问题。',
    api: 'width / colSpan / rowSpan / hidden',
    demo: '分组表头',
    demoPath: '/demos/grouped-header',
  },
  {
    area: '交互扩展',
    advantage: '选择、展开、筛选排序、拖拽、编辑等能力可以按业务场景组合。',
    api: 'rowSelection / expandable / components',
    demo: '动态表格设置',
    demoPath: '/demos/dynamic-table-settings',
  },
  {
    area: '主题和样式',
    advantage: '复用 antd v6 token，同时提供语义化 classNames 和 styles 槽位。',
    api: 'theme.components.Table / classNames / styles',
    demo: '组件主题令牌',
    demoPath: '/demos/component-theme-tokens',
  },
]

const capabilityColumns: Array<ColumnType<CapabilityRow>> = [
  {
    title: '方向',
    dataIndex: 'area',
    key: 'area',
    width: '16%',
    render: (value) => <Text strong>{value}</Text>,
  },
  {
    title: '优势',
    dataIndex: 'advantage',
    key: 'advantage',
    width: '42%',
  },
  {
    title: '常用 API',
    dataIndex: 'api',
    key: 'api',
    width: '28%',
    render: (value) => <Text code style={{ wordBreak: 'break-word' }}>{value}</Text>,
  },
  {
    title: '对应 demo',
    dataIndex: 'demo',
    key: 'demo',
    width: '14%',
    render: (value, record) => (
      <Button type="link" style={{ padding: 0 }} onClick={() => navigate(record.demoPath)}>
        {value}
      </Button>
    ),
  },
]

const stickyContainer = (): HTMLElement | Window =>
  document.querySelector<HTMLElement>('.ant-layout-content') ?? window

const capabilitySticky: StickyConfig = {
  offsetHeader: 0,
  offsetScroll: 0,
  getContainer: stickyContainer,
}

function DemosIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className="resource-card-icon">
      <rect x="8" y="10" width="48" height="38" rx="4" fill="currentColor" opacity="0.12" />
      <path d="M14 20h36M14 30h36M14 40h36M24 14v30M40 14v30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M18 52h28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function DocsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className="resource-card-icon">
      <path d="M18 8h22l10 10v38H18z" fill="currentColor" opacity="0.12" />
      <path d="M18 8h22l10 10v38H18z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M40 8v12h10M25 30h18M25 39h18M25 48h12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export default function HomePage() {
  const { token } = theme.useToken()

  // 价值卡是「置于页面之上的一层浅表面」：底色与描边走主题 token，
  // 否则 dark 下写死的深色叠加会等于没有表面（见 index.css 的 --resource-panel-* 消费处）。
  const panelVars = {
    '--resource-panel-bg': token.colorFillAlter,
    '--resource-panel-border': token.colorBorderSecondary,
  } as CSSProperties

  return (
    <div className="resource-home" style={panelVars}>
      <section className="resource-home-intro">
        <Title level={1}>构建、迁移和验证 data-grid 表格</Title>
        <Paragraph>
          @nukepayload2/data-grid 用 CSS Grid 重做 antd Table 的核心体验，保留熟悉的 React API，
          同时强化虚拟滚动、固定列、滚动条、拖拽和主题组合能力。
        </Paragraph>
      </section>

      <Row gutter={[16, 16]} className="resource-value-grid">
        <Col xs={24} md={12} lg={6}>
          <div className="resource-value">
            <Text type="secondary">兼容</Text>
            <Title level={3}>接近 antd Table 的使用方式</Title>
            <Paragraph>
              从 columns、rowSelection、expandable、pagination 等常用入口开始迁移，
              data-grid 专属增强集中在 gridOptions 和 gridColumnOptions。
            </Paragraph>
          </div>
        </Col>
        <Col xs={24} md={12} lg={6}>
          <div className="resource-value">
            <Text type="secondary">性能</Text>
            <Title level={3}>面向大数据和复杂滚动</Title>
            <Paragraph>
              虚拟滚动、稳定 rowKey、可选 DOM 复用和固定列组合，服务于更大的数据规模和更连续的滚动体验。
            </Paragraph>
          </div>
        </Col>
        <Col xs={24} md={12} lg={6}>
          <div className="resource-value">
            <Text type="secondary">设计</Text>
            <Title level={3}>CSS Grid 驱动的表格布局</Title>
            <Paragraph>
              列轨道、合并单元格、隐藏列、固定列和悬浮滚动条由同一套布局模型管理，减少宽度和滚动错位。
            </Paragraph>
          </div>
        </Col>
        <Col xs={24} md={12} lg={6}>
          <div className="resource-value">
            <Text type="secondary">基线</Text>
            <Title level={3}>最低支持 Chrome 105+</Title>
            <Paragraph>
              发布 CSS 按 Chrome 105 检查；完整动效体验建议 Chrome 107+。
            </Paragraph>
          </div>
        </Col>
      </Row>

      <section className="resource-capability">
        <div className="resource-section-heading">
          <Title level={2}>能力和 API 速览</Title>
          <Paragraph>
            这个表格由 data-grid 自己渲染；页面级 sticky 表头、sticky 横向滚动条和列宽控制都在首页直接体现。
          </Paragraph>
        </div>
        <Table<CapabilityRow>
          bordered
          columns={capabilityColumns}
          dataSource={capabilityRows}
          pagination={false}
          rowKey="area"
          scroll={{ x: 950 }}
          size="small"
          sticky={capabilitySticky}
        />
      </section>

      <Row gutter={[16, 16]} className="resource-card-grid">
        <Col xs={24} md={12}>
          <Card
            hoverable
            className="resource-card"
            onClick={() => navigate('/docs')}
          >
            <DocsIcon />
            <Title level={2}>Docs</Title>
            <Paragraph>
              面向使用者的快速开始、API 摘要、迁移指南、虚拟滚动和主题说明。
            </Paragraph>
            <Button type="primary" onClick={(event) => {
              event.stopPropagation()
              navigate('/docs')
            }}>
              打开文档
            </Button>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            hoverable
            className="resource-card"
            onClick={() => navigate('/demos')}
          >
            <DemosIcon />
            <Title level={2}>Demos</Title>
            <Paragraph>
              浏览表格示例，查看 data-grid 与 antd 的对照和源码。
            </Paragraph>
            <Button type="primary" onClick={(event) => {
              event.stopPropagation()
              navigate('/demos')
            }}>
              浏览 demo
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
