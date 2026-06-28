/**
 * data-grid dev demo 门户（WinUI Gallery 风格：顶栏 + 侧栏分类导航 + 主内容）。
 *
 * 布局：
 *   Layout
 *   ├─ Header（深色顶栏：汉堡 + 品牌 + 主题编辑器 + dark/light + Virtual 开关）
 *   └─ Layout hasSider
 *      ├─ Sider（collapsible：inline Menu，按 groupByCategory 分组 demo 列表 + 主页/Docs）
 *      └─ Content（home / demo[Breadcrumb+Tabs 预览|源码] / docs / notFound）
 *      └─（Modal：主题编辑器，由顶栏按钮打开）
 *
 * 路由（hash）：
 *   #/                  → HomePage（分组卡片网格 + 搜索）
 *   #/demos/<name>      → 具体 demo（预览 Tab + 源码 Tab）
 *   #/docs[/<section>]  → DocsPage
 *   else                → notFound
 *
 * ★ 主题/虚拟化单一真理源不变：useTheme(themeMode/setThemeMode/isDark) +
 *   useVirtualization(virtual/setVirtual)。dark/light 顶栏 Segmented 驱动全站。
 *
 * ★ 源码 Tab 懒加载：仅当切到 source Tab 且 view.kind==='demo' 时才请求 demo 模块源码
 *   （useDemoSource + import.meta.glob '?raw' + cache）。
 */

import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import {
  Breadcrumb,
  Button,
  Layout,
  Menu,
  Segmented,
  Switch,
  Tabs,
  Typography,
} from 'antd'
import {
  FileTextOutlined,
  HomeOutlined,
  MenuOutlined,
} from '@ant-design/icons'
import { demos } from './demos'
import { groupByCategory, navigate, useHashRoute } from './demos/registry'
import HomePage from './HomePage'
import DocsPage from './DocsPage'
import CodeView from './CodeView'
import { useDemoSource } from './useDemoSource'
import ThemeEditorModal from './ThemeEditorModal'
import { useTheme, type ThemeMode } from './theme/ThemeContext'
import { useVirtualization } from './demos/VirtualizationContext'

const { Header, Sider, Content } = Layout
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
  // ★ 全局主题 store（单一真理源）。
  const { themeMode, setThemeMode } = useTheme()
  const isDark = themeMode === 'dark'
  // ★ 全局虚拟化开关（单一真理源）。
  const { virtual, setVirtual } = useVirtualization()

  // 侧栏折叠状态。
  const [collapsed, setCollapsed] = useState(false)
  // 侧栏 inline Menu openKeys（受控，便于 demo 切换时自动展开所属分类）。
  const [openKeys, setOpenKeys] = useState<string[]>([])
  // 主题编辑器 Modal 开关。
  const [themeModalOpen, setThemeModalOpen] = useState(false)
  // demo 预览/源码 Tab。
  const [activeTab, setActiveTab] = useState<'preview' | 'source'>('preview')

  const view = useMemo<View>(() => {
    if (segments.length === 0) return { kind: 'home' }
    if (segments[0] === 'demos' && segments[1]) {
      const match = lazyDemos.find((d) => d.meta.name === segments[1])
      if (match) return { kind: 'demo', name: match.meta.name, title: match.meta.title }
    }
    if (segments[0] === 'docs') return { kind: 'docs', section: segments[1] }
    return { kind: 'notFound' }
  }, [segments])

  const DemoComp =
    view.kind === 'demo'
      ? lazyDemos.find((d) => d.meta.name === view.name)?.Comp
      : undefined

  // 当前选中菜单项 key。
  const selectedKey =
    view.kind === 'home'
      ? '/'
      : view.kind === 'docs'
        ? '/docs'
        : view.kind === 'demo'
          ? `/demos/${view.name}`
          : ''

  // demo 切换时自动展开所属分类（仅展开，不折叠其它已展开项）。
  useEffect(() => {
    if (view.kind !== 'demo') return
    const cat = demos.find((d) => d.name === view.name)?.category
    if (!cat) return
    const catKey = `cat::${cat}`
    setOpenKeys((o) => (o.includes(catKey) ? o : [...o, catKey]))
  }, [view])

  // 切换 demo 时把 Tab 重置回预览（避免停留在上一个 demo 的源码 Tab）。
  useEffect(() => {
    setActiveTab('preview')
  }, [view])

  // 源码懒加载：仅 source Tab + demo 视图时请求。
  const { source, loading } = useDemoSource(
    activeTab === 'source' && view.kind === 'demo' ? view.name : undefined,
  )

  // Sider 菜单 items：主页 + Docs + divider + 按分类分组的 demo 列表。
  const groups = useMemo(() => groupByCategory(demos), [])
  const menuItems = useMemo(
    () => [
      { key: '/', icon: <HomeOutlined />, label: '主页' },
      { key: '/docs', icon: <FileTextOutlined />, label: 'Docs' },
      { type: 'divider' as const },
      ...groups.map((g) => ({
        key: `cat::${g.category}`,
        label: g.category,
        children: g.items.map((d) => ({
          key: `/demos/${d.name}`,
          label: d.title,
        })),
      })),
    ],
    [groups],
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          paddingInline: 16,
          // ★ Header 背景跟随全局主题（沿用改造前视觉）。
          background: isDark ? '#141414' : '#001529',
          borderBottom: isDark ? '1px solid #303030' : 'none',
        }}
      >
        {/* 汉堡：折叠/展开 Sider */}
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={() => setCollapsed((c) => !c)}
          style={{ color: '#fff' }}
        />
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

        <div style={{ flex: 1 }} />

        {/*
          ★ 主题编辑器入口（门户重构）：从顶栏按钮打开 Modal，不再走 demo 路由。
          ThemeEditorPanel 行为零变化，只是承载形态从路由 demo 改为 Modal。
        */}
        <Button onClick={() => setThemeModalOpen(true)}>主题编辑器</Button>

        {/*
          ★ 顶栏全局 dark/light 切换（单一真理源）。
          Segmented 直接写 setThemeMode → ThemeProvider 重渲染 → ConfigProvider algorithm
          切换 → 全站 antd cssinjs 重算 + data-grid Table.tsx useToken realToken 重算 →
          .dg-wrapper --ant-* 刷新。
        */}
        <Segmented
          value={themeMode}
          onChange={(val) => setThemeMode(val as ThemeMode)}
          options={[
            { label: '☀ Light', value: 'light' },
            { label: '🌙 Dark', value: 'dark' },
          ]}
          style={{
            // 顶栏是深色底，Segmented 自身用浅色块（无论 light/dark 模式都看得清）。
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
          }}
        />
        {/*
          ★ 全局虚拟化开关（单一真理源）：顶栏 Switch 驱动 VirtualizationProvider 的 virtual
          状态 → 接入的对比 demo 两侧（data-grid + antd）Table 的 virtual 属性 + SplitDemo
          pane body 限高同步变化。
        */}
        <Switch
          checked={virtual}
          onChange={setVirtual}
          checkedChildren="Virtual"
          unCheckedChildren="Virtual"
        />
      </Header>
      <Layout hasSider>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={220}
          collapsedWidth={64}
          theme={isDark ? 'dark' : 'light'}
          trigger={null}
        >
          <Menu
            mode="inline"
            inlineCollapsed={collapsed}
            theme={isDark ? 'dark' : 'light'}
            selectedKeys={selectedKey ? [selectedKey] : []}
            openKeys={openKeys}
            onOpenChange={setOpenKeys}
            onClick={({ key }) => navigate(key)}
            items={menuItems}
            style={{ height: '100%', borderInlineEnd: 0 }}
          />
        </Sider>
        <Content style={{ padding: 24 }}>
          {view.kind === 'home' ? <HomePage /> : null}

          {view.kind === 'demo' && DemoComp ? (
            <div>
              <Breadcrumb
                style={{ marginBottom: 16 }}
                items={[
                  { title: <Link onClick={() => navigate('/')}>首页</Link> },
                  { title: view.title },
                ]}
              />
              <Tabs
                activeKey={activeTab}
                onChange={(k) => setActiveTab(k as 'preview' | 'source')}
                items={[
                  {
                    key: 'preview',
                    label: '预览',
                    children: (
                      <Suspense fallback={<div>Loading demo…</div>}>
                        <DemoComp />
                      </Suspense>
                    ),
                  },
                  {
                    key: 'source',
                    label: '源码',
                    children: loading ? (
                      <div style={{ padding: 24 }}>Loading source…</div>
                    ) : source ? (
                      <CodeView code={source} />
                    ) : (
                      <div>无源码</div>
                    ),
                  },
                ]}
              />
            </div>
          ) : null}

          {view.kind === 'docs' ? <DocsPage section={view.section} /> : null}

          {view.kind === 'notFound' ? (
            <div style={{ textAlign: 'center', paddingTop: 64 }}>
              <Title level={3}>Not Found</Title>
              <Button type="primary" onClick={() => navigate('/')}>
                返回首页
              </Button>
            </div>
          ) : null}
        </Content>
      </Layout>
      <ThemeEditorModal
        open={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
      />
    </Layout>
  )
}

export default App
