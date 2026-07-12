/** demo 门户首页。 */

import { useMemo } from 'react'
import { Card, Col, Row, Tag, Typography } from 'antd'
import type { DemoMeta } from './demos/registry'
import { demos } from './demos'
import { navigate, groupByCategory, type CategoryGroup } from './demos/registry'

const { Title, Paragraph, Text } = Typography

function DemoCard({ meta }: { meta: DemoMeta }) {
  return (
    <Card
      hoverable
      size="small"
      onClick={() => navigate(`/demos/${meta.name}`)}
      style={{ height: '100%', cursor: 'pointer' }}
    >
      <Card.Meta
        title={
          <span>
            {meta.title}
            {meta.compare ? (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                对比
              </Tag>
            ) : null}
          </span>
        }
        description={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {meta.subtitle ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {meta.subtitle}
              </Text>
            ) : null}
            {meta.description ? (
              <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>
                {meta.description}
              </Paragraph>
            ) : null}
          </div>
        }
      />
    </Card>
  )
}

function CategorySection({ group }: { group: CategoryGroup }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <Title level={3} style={{ marginTop: 0 }}>
        {group.category} <Text type="secondary" style={{ fontSize: 14, fontWeight: 'normal' }}>（{group.items.length}）</Text>
      </Title>
      <Row gutter={[16, 16]}>
        {group.items.map((meta) => (
          <Col key={meta.name} xs={24} sm={12} md={8} lg={6}>
            <DemoCard meta={meta} />
          </Col>
        ))}
      </Row>
    </section>
  )
}

export default function HomePage() {
  const groups = useMemo(() => groupByCategory(demos), [])

  return (
    <div>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        共 {demos.length} 个 demo
      </Text>
      {groups.map((g) => <CategorySection key={g.category} group={g} />)}
    </div>
  )
}
