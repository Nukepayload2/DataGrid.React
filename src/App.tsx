/** demo 门户壳层：路由、导航、预览区和源码区。 */

import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from 'react'
import {
  AutoComplete,
  Breadcrumb,
  Button,
  Collapse,
  Layout,
  Menu,
  Segmented,
  Switch,
  Typography,
  theme as antdTheme,
} from 'antd'
import {
  HomeOutlined,
  MenuOutlined,
} from '@ant-design/icons'
import { demos } from './demos'
import { groupByCategory, navigate, replaceHash, useHashRoute, useHashSearchParams } from './demos/registry'
import { docs } from './docs/docRegistry'
import HomePage from './HomePage'
import DemoHomePage from './DemoHomePage'
import DocsPage from './DocsPage'
import CodeView from './CodeView'
import { useDemoSource } from './useDemoSource'
import { useSplitDemoSource } from './useSplitDemoSource'
import ThemeEditorModal from './ThemeEditorModal'
import { useTheme, type ThemeMode } from './theme/ThemeContext'
import { useVirtualization } from './demos/VirtualizationContext'
// split demo 才接入对比预览和 live 编辑链路。
import { SplitDemoPreview } from './demos/_compare/SplitDemoPreview'
import LiveEditor from './live/LiveEditor'
import { scopeForDemo } from './live/scope'
import { stripComments } from './live/stripComments'
// 版本号单一真理源：package.json#version（顶栏读取）。
import pkg from '../package.json'

const { Header, Sider, Content } = Layout
const { Title, Link } = Typography

// 有 `*.dg.tsx` 的 demo 可编辑；同时有 `*.antd.tsx` 才进入双栏对比编辑。
const editableDgDemoNames = new Set(
  Object.keys(import.meta.glob('./demos/*.dg.tsx')).map(
    (p) => p.match(/([^/]+)\.dg\.tsx$/)![1],
  ),
)
const editableAntdDemoNames = new Set(
  Object.keys(import.meta.glob('./demos/*.antd.tsx')).map(
    (p) => p.match(/([^/]+)\.antd\.tsx$/)![1],
  ),
)

const lazyDemos = demos.map((d) => ({
  meta: d,
  Comp: lazy(() => d.element().then((m) => ({ default: m.default }))),
}))

const demoByName = new Map(demos.map((demo) => [demo.name, demo]))
const demoByAlias = new Map<string, (typeof demos)[number]>()
for (const demo of demos) {
  for (const alias of demo.aliases ?? []) {
    demoByAlias.set(alias, demo)
  }
}

type View =
  | { kind: 'home' }
  | { kind: 'demosHome' }
  | { kind: 'demo'; name: string; title: string }
  | { kind: 'docs'; section?: string }
  | { kind: 'notFound' }

function DemoMenuLabel({
  title,
  subtitle,
  query,
}: {
  title: string
  subtitle?: string
  query: string
}) {
  const { token } = antdTheme.useToken()
  return (
    <span style={{ display: 'flex', minWidth: 0, flexDirection: 'column', lineHeight: 1.25 }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <HighlightText text={title} query={query} />
      </span>
      {subtitle ? (
        <span
          style={{
            color: token.colorTextSecondary,
            fontSize: 12,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <HighlightText text={subtitle} query={query} />
        </span>
      ) : null}
    </span>
  )
}

function HighlightText({ text, query }: { text: string; query: string }) {
  const { token } = antdTheme.useToken()
  const trimmed = query.trim()
  if (!trimmed) return <>{text}</>
  const lowerText = text.toLowerCase()
  const lowerQuery = trimmed.toLowerCase()
  const parts: Array<{ text: string; hit: boolean }> = []
  let cursor = 0
  while (cursor < text.length) {
    const index = lowerText.indexOf(lowerQuery, cursor)
    if (index < 0) {
      parts.push({ text: text.slice(cursor), hit: false })
      break
    }
    if (index > cursor) parts.push({ text: text.slice(cursor, index), hit: false })
    parts.push({ text: text.slice(index, index + trimmed.length), hit: true })
    cursor = index + trimmed.length
  }
  return (
    <>
      {parts.map((part, index) =>
        part.hit ? (
          <mark
            key={index}
            style={{
              background: token.colorWarningBg,
              color: 'inherit',
              padding: 0,
            }}
          >
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  )
}

function App() {
  const segments = useHashRoute()
  const searchParams = useHashSearchParams()
  const urlHighlight = searchParams.get('q')?.trim() ?? ''
  const { token } = antdTheme.useToken()
  // 全局主题 store（单一真理源）。
  const { themeMode, setThemeMode } = useTheme()
  const isDark = themeMode === 'dark'
  const headerBackground = isDark ? '#141414' : token.colorBgContainer
  const headerColor = isDark ? '#fff' : token.colorText
  const headerControlBackground = isDark ? 'rgba(255,255,255,0.15)' : token.colorFillTertiary
  // 全局虚拟化开关（单一真理源）。
  const { virtual, setVirtual } = useVirtualization()

  // 侧栏折叠状态。
  const [collapsed, setCollapsed] = useState(false)
  // 侧栏 inline Menu openKeys（受控，便于 demo 切换时自动展开所属分类）。
  const [openKeys, setOpenKeys] = useState<string[]>([])
  // 主题编辑器 Modal 开关。
  const [themeModalOpen, setThemeModalOpen] = useState(false)
  // 窄屏 docs 目录 Drawer 开关（Header 左侧汉堡触发）。
  const [docsTocOpen, setDocsTocOpen] = useState(false)
  // 顶栏全局 demo 搜索输入。URL q 参数用于跳转后高亮，输入框跟随它同步。
  const [globalSearch, setGlobalSearch] = useState('')
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)
  // 顶栏 docs 区搜索输入（仅 docs 视图下显示）。
  const [docsSearch, setDocsSearch] = useState('')
  const [docsSearchOpen, setDocsSearchOpen] = useState(false)
  // split demo 编辑产物。null = 未编辑/重置（默认模式渲染真实 DemoComp）。
  // view 变化（切 demo）时 useEffect 重置为 null。
  const [editedDg, setEditedDg] = useState<ComponentType<Record<string, unknown>> | null>(null)
  const [editedAntd, setEditedAntd] = useState<ComponentType<Record<string, unknown>> | null>(null)

  const view = useMemo<View>(() => {
    if (segments.length === 0) return { kind: 'home' }
    if (segments[0] === 'demos' && !segments[1]) return { kind: 'demosHome' }
    if (segments[0] === 'demos' && segments[1]) {
      const meta = demoByName.get(segments[1]) ?? demoByAlias.get(segments[1])
      if (meta) return { kind: 'demo', name: meta.name, title: meta.title }
    }
    if (segments[0] === 'docs') return { kind: 'docs', section: segments[1] }
    return { kind: 'notFound' }
  }, [segments])

  useEffect(() => {
    if (segments[0] !== 'demos' || !segments[1]) return
    const meta = demoByAlias.get(segments[1])
    if (!meta || meta.name === segments[1]) return
    const query = searchParams.toString()
    replaceHash(`/demos/${meta.name}${query ? `?${query}` : ''}`)
  }, [searchParams, segments])

  const DemoComp =
    view.kind === 'demo'
      ? lazyDemos.find((d) => d.meta.name === view.name)?.Comp
      : undefined
  const currentDemoMeta = view.kind === 'demo' ? demoByName.get(view.name) : undefined

  // 当前选中菜单项 key。
  const selectedKey =
    view.kind === 'home'
      ? '/'
      : view.kind === 'demosHome'
        ? '/demos'
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

  // 切换 demo 时重置 live 编辑产物（避免上一个 demo 的编辑结果残留到新 demo）。
  useEffect(() => {
    setEditedDg(null)
    setEditedAntd(null)
  }, [view])

  // 有 `*.dg.tsx` 的 demo 接入 live 编辑；同时有 `*.antd.tsx` 才显示 antd 对照栏。
  const isEditableDemo = (n: string) => editableDgDemoNames.has(n)
  const hasAntdCompare = (n: string) => editableAntdDemoNames.has(n)

  // 非可编辑 demo 取单段源码；可编辑 demo 取 dg/antd 两段源码（antd 可为空）。
  const demoName = view.kind === 'demo' ? view.name : undefined
  const isEditable = view.kind === 'demo' && isEditableDemo(view.name)
  const hasEditableAntd = view.kind === 'demo' && hasAntdCompare(view.name)
  const { source, loading } = useDemoSource(
    demoName && !isEditable ? demoName : undefined,
  )
  const splitSrc = useSplitDemoSource(isEditable ? demoName : undefined)
  const isDemoArea = view.kind === 'demosHome' || view.kind === 'demo'

  useEffect(() => {
    setGlobalSearch(urlHighlight)
  }, [urlHighlight])

  const globalSearchQuery = globalSearch.trim()
  const globalSearchLower = globalSearchQuery.toLowerCase()
  const globalSearchResults = useMemo(() => {
    if (!globalSearchLower) return []
    return demos
      .filter((d) =>
        [
          d.title,
          d.subtitle ?? '',
          d.description ?? '',
          d.name,
          ...(d.aliases ?? []),
          d.category,
        ].some((s) => s.toLowerCase().includes(globalSearchLower)),
      )
      .slice(0, 8)
  }, [globalSearchLower])
  const globalSearchOptions = useMemo(
    () =>
      globalSearchResults.map((d) => ({
        value: d.name,
        label: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span>
              <HighlightText text={d.title} query={globalSearchQuery} />
            </span>
            <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>
              <HighlightText text={d.category} query={globalSearchQuery} />
              {d.subtitle ? (
                <>
                  {' · '}
                  <HighlightText text={d.subtitle} query={globalSearchQuery} />
                </>
              ) : null}
              {d.description ? (
                <>
                  {' · '}
                  <HighlightText text={d.description} query={globalSearchQuery} />
                </>
              ) : null}
            </span>
          </div>
        ),
      })),
    [globalSearchQuery, globalSearchResults, token.colorTextSecondary],
  )

  // Sider 菜单 items：主页 + divider + 按分类分组的 demo 列表。
  const groups = useMemo(() => groupByCategory(demos), [])
  const menuItems = useMemo(
    () => [
      { key: '/demos', icon: <HomeOutlined />, label: '示例一览' },
      { type: 'divider' as const },
      ...groups.map((g) => ({
        key: `cat::${g.category}`,
        label: g.category,
        children: g.items.map((d) => ({
          key: `/demos/${d.name}`,
          label: (
            <DemoMenuLabel
              title={d.title}
              subtitle={collapsed ? undefined : d.subtitle}
              query={urlHighlight}
            />
          ),
        })),
      })),
    ],
    [collapsed, groups, urlHighlight],
  )

  const goSearchResult = (name: string) => {
    const query = globalSearch.trim()
    const suffix = query ? `?q=${encodeURIComponent(query)}` : ''
    setGlobalSearchOpen(false)
    navigate(`/demos/${name}${suffix}`)
  }

  // docs 区搜索：按标题 / 描述 / 分组过滤文档条目。
  const docsSearchQuery = docsSearch.trim()
  const docsSearchLower = docsSearchQuery.toLowerCase()
  const docsSearchResults = useMemo(() => {
    if (!docsSearchLower) return []
    return docs
      .filter((d) =>
        [d.title, d.description, d.group, d.slug].some((s) =>
          s.toLowerCase().includes(docsSearchLower),
        ),
      )
      .slice(0, 10)
  }, [docsSearchLower])
  const docsSearchOptions = useMemo(
    () =>
      docsSearchResults.map((d) => ({
        value: d.slug,
        label: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span>
              <HighlightText text={d.title} query={docsSearchQuery} />
            </span>
            <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>
              <HighlightText text={d.group} query={docsSearchQuery} />
              {' · '}
              <HighlightText text={d.description} query={docsSearchQuery} />
            </span>
          </div>
        ),
      })),
    [docsSearchQuery, docsSearchResults, token.colorTextSecondary],
  )

  const goDocsSearchResult = (slug: string) => {
    setDocsSearchOpen(false)
    setDocsSearch('')
    navigate(`/docs/${slug}`)
  }

  return (
    <Layout className="app-shell" style={{ height: '100vh', overflow: 'hidden' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          paddingInline: 16,
          // Header 背景跟随全局主题。
          background: headerBackground,
          borderBottom: `1px solid ${isDark ? '#303030' : token.colorBorderSecondary}`,
        }}
      >
        {isDemoArea ? (
          <Button
            className="app-header-menu-button"
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setCollapsed((c) => !c)}
            style={{ color: headerColor }}
          />
        ) : view.kind === 'docs' ? (
          <Button
            className="app-header-menu-button docs-header-menu-button"
            type="text"
            icon={<MenuOutlined />}
            aria-label="打开文档目录"
            onClick={() => setDocsTocOpen(true)}
            style={{ color: headerColor }}
          />
        ) : null}
        <div
          style={{
            color: headerColor,
            fontSize: 18,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
          }}
          onClick={() => navigate('/')}
        >
          <span>data-grid</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 400,
              color: isDark ? 'rgba(255,255,255,0.55)' : token.colorTextSecondary,
            }}
          >
            v{pkg.version}
          </span>
        </div>

        {isDemoArea ? (
          <AutoComplete
            className="app-demo-search"
            value={globalSearch}
            options={globalSearchOptions}
            open={globalSearchOpen && globalSearchQuery.length > 0}
            onChange={(value) => {
              const next = value ?? ''
              setGlobalSearch(next)
              setGlobalSearchOpen(next.trim().length > 0)
            }}
            onFocus={() => setGlobalSearchOpen(globalSearchQuery.length > 0)}
            onBlur={() => setGlobalSearchOpen(false)}
            onSelect={(value) => goSearchResult(value)}
            placeholder="搜索示例..."
            allowClear
            notFoundContent={globalSearchQuery ? '没有匹配的示例' : null}
            filterOption={false}
          />
        ) : view.kind === 'docs' ? (
          <AutoComplete
            className="app-docs-search"
            popupMatchSelectWidth={false}
            classNames={{ popup: { root: 'app-docs-search-popup' } }}
            value={docsSearch}
            options={docsSearchOptions}
            open={docsSearchOpen && docsSearchQuery.length > 0}
            onChange={(value) => {
              const next = value ?? ''
              setDocsSearch(next)
              setDocsSearchOpen(next.trim().length > 0)
            }}
            onFocus={() => setDocsSearchOpen(docsSearchQuery.length > 0)}
            onBlur={() => setDocsSearchOpen(false)}
            onSelect={(value) => goDocsSearchResult(value)}
            placeholder="搜索文档..."
            allowClear
            notFoundContent={docsSearchQuery ? '没有匹配的文档' : null}
            filterOption={false}
          />
        ) : null}

        <div style={{ flex: 1 }} />

        <Segmented
          className="app-theme-switcher"
          value={themeMode}
          onChange={(val) => setThemeMode(val as ThemeMode)}
          options={[
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
          ]}
          style={{
            background: headerControlBackground,
            color: headerColor,
          }}
        />

        {isDemoArea ? (
          <div className="app-demo-actions">
            <Button onClick={() => setThemeModalOpen(true)}>主题编辑器</Button>
            <Switch
              checked={virtual}
              onChange={setVirtual}
              checkedChildren="Virtual"
              unCheckedChildren="Virtual"
            />
          </div>
        ) : null}
      </Header>
      <Layout hasSider={isDemoArea} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {isDemoArea ? (
          <Sider
            className="app-sider"
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
              style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', borderInlineEnd: 0 }}
            />
          </Sider>
        ) : null}
        <Content
          className={view.kind === 'docs' ? 'app-content app-content-docs' : 'app-content'}
          style={{ paddingInline: 24, overflow: 'auto' }}
        >
          {view.kind === 'home' ? <HomePage /> : null}
          {view.kind === 'demosHome' ? <DemoHomePage /> : null}

          {view.kind === 'demo' && DemoComp ? (
            <div className="demo-page" data-demo-name={view.name}>
              <Breadcrumb
                style={{ marginBottom: 16 }}
                items={[
                  { title: <Link onClick={() => navigate('/demos')}>示例一览</Link> },
                  {
                    title: (
                      <HighlightText
                        text={view.title}
                        query={urlHighlight}
                      />
                    ),
                  },
                ]}
              />
              {currentDemoMeta?.description ? (
                <div
                  className="demo-page__intro"
                  style={{
                    background: token.colorFillAlter,
                    borderColor: token.colorBorderSecondary,
                    color: token.colorTextSecondary,
                  }}
                >
                  {currentDemoMeta.description}
                </div>
              ) : null}
              {/*
                预览区（上方）：
                - 可编辑 demo：SplitDemoPreview 承载默认/编辑双模式。默认模式
                  渲染真实 DemoComp（零编辑开销）；任一 edited 非空切编辑模式。
                - 非 split demo：直接渲染 DemoComp。
              */}
              {isEditable ? (
                <SplitDemoPreview
                  name={view.name}
                  editedDg={editedDg}
                  editedAntd={hasEditableAntd ? editedAntd : null}
                  compareWithAntd={hasEditableAntd}
                >
                  <Suspense fallback={<div>Loading demo…</div>}>
                    <DemoComp />
                  </Suspense>
                </SplitDemoPreview>
              ) : (
                <Suspense fallback={<div>Loading demo…</div>}>
                  <DemoComp />
                </Suspense>
              )}

              {/*
                代码区（下方，折叠 Collapse）：
                - 可编辑 demo：dg LiveEditor；有 antd 对照时再显示 antd LiveEditor。
                  LiveEditor onApply 三态：(Comp,null)成功→setEditedXxx(Comp)；
                  (null,error)失败→setEditedXxx(null)（同时 Alert 显示错误）；(null,null)重置→
                  setEditedXxx(null) 回默认模式。代码先经 stripComments 去注释再展示。
                - 非 split demo：降级为只读 CodeView（原 source 三态）。
              */}
              <Collapse
                className="demo-source-collapse"
                style={{ marginTop: 16 }}
                items={[
                  {
                    key: 'code',
                    label: isEditable ? '源码（可编辑）' : '源码（只读）',
                    children: isEditable ? (
                      splitSrc.loading ? (
                        <div>Loading source…</div>
                      ) : (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: hasEditableAntd
                              ? 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))'
                              : 'minmax(0, 1fr)',
                            gap: 16,
                          }}
                        >
                          {/* key={view.name}：切 demo 时 remount → LiveEditor 内部 code state
                              重新取新 initialCode（否则 useState(initialCode) 仅 mount 取一次，
                              切 demo 不刷新页面时 code 停留在旧 demo 源码）。App 已有 useEffect
                              清 editedDg/editedAntd，此处 remount 与之一致。 */}
                          <LiveEditor
                            key={`${view.name}-dg`}
                            initialCode={stripComments(splitSrc.dgSource ?? '')}
                            title="data-grid"
                            scope={scopeForDemo(view.name)}
                            onApply={(c, e) => setEditedDg(() => (e ? null : c))}
                          />
                          {hasEditableAntd ? (
                            <LiveEditor
                              key={`${view.name}-antd`}
                              initialCode={stripComments(splitSrc.antdSource ?? '')}
                              title="antd"
                              scope={scopeForDemo(view.name)}
                              onApply={(c, e) => setEditedAntd(() => (e ? null : c))}
                            />
                          ) : null}
                        </div>
                      )
                    ) : loading ? (
                      <div>Loading source…</div>
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

          {view.kind === 'docs' ? (
            <DocsPage
              section={view.section}
              tocOpen={docsTocOpen}
              onTocOpenChange={setDocsTocOpen}
            />
          ) : null}

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
