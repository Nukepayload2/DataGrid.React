/**
 * data-grid dev demo 门户（antd Layout 壳 + hash 路由）。
 *
 * 路由：
 *   #/                  → HomePage（分组卡片网格 + 搜索）
 *   #/demos/<name>      → 具体 demo（Breadcrumb + Suspense 懒载）
 *   #/docs[/<section>]  → DocsPage（Part 2 提供）
 *   else                → notFound
 */

import { lazy, Suspense, useMemo } from 'react'
import { Breadcrumb, Button, Layout, Menu, Typography } from 'antd'
import { demos } from './demos'
import { navigate, useHashRoute } from './demos/registry'
import HomePage from './HomePage'
import DocsPage from './DocsPage'

const { Header, Content } = Layout
const { Title, Link } = Typography

const lazyDemos = demos.map((d) => ({
  meta: d,
  Comp: lazy(() => d.element().then((m) => ({ default: m.default }))),
}))

type View =
  | { kind: 'home' }
  | { kind: 'demo'; name: string; title: string }
  | { kind: 'docs'; section?: string }
  | { kind: 'notFound' }

function App() {
  const segments = useHashRoute()

  const selectedKey = segments[0] === 'docs' ? 'docs' : 'demos'

  const view = useMemo<View>(() => {
    if (segments.length === 0) return { kind: 'home' }
    if (segments[0] === 'demos' && segments[1]) {
      const match = lazyDemos.find((d) => d.meta.name === segments[1])
      if (match) return { kind: 'demo', name: match.meta.name, title: match.meta.title }
    }
    if (segments[0] === 'docs') return { kind: 'docs', section: segments[1] }
    return { kind: 'notFound' }
  }, [segments])

  const DemoComp = view.kind === 'demo' ? lazyDemos.find((d) => d.meta.name === view.name)?.Comp : undefined

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          paddingInline: 24,
        }}
      >
        <div
          style={{
            color: '#fff',
            fontSize: 18,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/')}
        >
          data-grid
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selectedKey]}
          onClick={({ key }) => navigate(key === 'demos' ? '/' : key === 'docs' ? '/docs' : '/')}
          items={[
            { key: 'demos', label: 'Demos' },
            { key: 'docs', label: 'Docs' },
          ]}
          style={{ minWidth: 0, flex: 1 }}
        />
      </Header>
      <Content style={{ padding: 24 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {view.kind === 'home' ? (
            <HomePage />
          ) : null}

          {view.kind === 'demo' && DemoComp ? (
            <div>
              <Breadcrumb
                style={{ marginBottom: 16 }}
                items={[
                  { title: <Link onClick={() => navigate('/')}>首页</Link> },
                  { title: view.title },
                ]}
              />
              <Suspense fallback={<div>Loading demo…</div>}>
                <DemoComp />
              </Suspense>
            </div>
          ) : null}

          {view.kind === 'docs' ? (
            <DocsPage section={view.section} />
          ) : null}

          {view.kind === 'notFound' ? (
            <div style={{ textAlign: 'center', paddingTop: 64 }}>
              <Title level={3}>Not Found</Title>
              <Button type="primary" onClick={() => navigate('/')}>
                返回首页
              </Button>
            </div>
          ) : null}
        </div>
      </Content>
    </Layout>
  )
}

export default App
