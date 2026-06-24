/**
 * HomePage：demo 门户首页。
 *
 * - 顶部 Input.Search（受控 query）+ 命中数。
 * - query 空 → 按 DemoMeta.category 分组渲染卡片网格（Row/Col 响应式）。
 * - query 非空 → 扁平按 title/description/name 不区分大小写过滤，渲染单节「搜索结果」；无命中 Empty。
 */

import { useMemo, useState } from 'react'
import { Card, Col, Empty, Input, Row, Tag, Typography } from 'antd'
import type { DemoMeta } from './demos/registry'
import { demos } from './demos'
import { navigate } from './demos/registry'

const { Title, Paragraph, Text } = Typography

interface CategoryGroup {
  category: string
  items: DemoMeta[]
}

/** 按 registry 声明顺序分组（保持稳定展示顺序，按首次出现排序）。 */
function groupByCategory(list: DemoMeta[]): CategoryGroup[] {
  const order: string[] = []
  const map = new Map<string, DemoMeta[]>()
  for (const d of list) {
    if (!map.has(d.category)) {
      map.set(d.category, [])
      order.push(d.category)
    }
    map.get(d.category)!.push(d)
  }
  return order.map((category) => ({ category, items: map.get(category)! }))
}

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
          meta.description ? (
            <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>
              {meta.description}
            </Paragraph>
          ) : null
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
  const [query, setQuery] = useState('')

  const trimmed = query.trim()
  const lower = trimmed.toLowerCase()

  const filtered = useMemo(() => {
    if (!trimmed) return demos
    return demos.filter((d) =>
      [d.title, d.description ?? '', d.name].some((s) => s.toLowerCase().includes(lower)),
    )
  }, [trimmed, lower])

  const groups = useMemo(() => groupByCategory(filtered), [filtered])

  return (
    <div>
      <Input.Search
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索 demo…"
        allowClear
        enterButton={false}
        style={{ maxWidth: 480, marginBottom: 8 }}
      />
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        共 {filtered.length} 个 demo
      </Text>

      {filtered.length === 0 ? (
        <Empty description="没有匹配的 demo" />
      ) : trimmed ? (
        <CategorySection group={{ category: '搜索结果', items: filtered }} />
      ) : (
        groups.map((g) => <CategorySection key={g.category} group={g} />)
      )}
    </div>
  )
}
