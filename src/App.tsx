/**
 * data-grid dev demo 门户（WinUI Gallery 风格：顶栏 + 侧栏分类导航 + 主内容）。
 *
 * 布局：
 *   Layout
 *   ├─ Header（深色顶栏：汉堡 + 品牌 + 主题编辑器 + dark/light + Virtual 开关）
 *   └─ Layout hasSider
 *      ├─ Sider（collapsible：inline Menu，按 groupByCategory 分组 demo 列表 + 主页/Docs）
 *      └─ Content（home / demo[Breadcrumb+预览区+Collapse 源码区] / docs / notFound）
 *      └─（Modal：主题编辑器，由顶栏按钮打开）
 *
 * 路由（hash）：
 *   #/                  → HomePage（分组卡片网格 + 搜索）
 *   #/demos/<name>      → 具体 demo（预览区 + 下方折叠源码区）
 *   #/docs[/<section>]  → DocsPage
 *   else                → notFound
 *
 * 主题/虚拟化单一真理源：useTheme(themeMode/setThemeMode/isDark) +
 *   useVirtualization(virtual/setVirtual)。dark/light 顶栏 Segmented 驱动全站。
 *
 * 源码懒加载：
 *   - 非 split demo：useDemoSource（只读 CodeView），按 view.kind==='demo' 加载。
 *   - split demo：useSplitDemoSource（dg+antd 两段 LiveEditor），展开折叠区
 *     才加载源码；LiveEditor 内部按需 dynamic import sucrase（默认渲染路径不加载编译器）。
 */

import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from 'react'
import {
  Breadcrumb,
  Button,
  Collapse,
  Layout,
  Menu,
  Segmented,
  Switch,
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
import { useSplitDemoSource } from './useSplitDemoSource'
import ThemeEditorModal from './ThemeEditorModal'
import { useTheme, type ThemeMode } from './theme/ThemeContext'
import { useVirtualization } from './demos/VirtualizationContext'
// SplitDemoPreview 承载默认/编辑双模式；LiveEditor/scope/stripComments
//   仅 split demo 展开折叠区时才渲染（默认渲染路径不加载 sucrase——LiveEditor 内部按需 dynamic import）。
import { SplitDemoPreview } from './demos/_compare/SplitDemoPreview'
import LiveEditor from './live/LiveEditor'
import { scopeForDemo } from './live/scope'
import { stripComments } from './live/stripComments'

const { Header, Sider, Content } = Layout
const { Title, Link } = Typography

// split demo 名集合（模块顶层 glob 自动发现）：有 *.dg.tsx 段的 demo 即视为 split demo。
//   glob 相对路径 './demos/*.dg.tsx'（App.tsx 在 src/）。key 形如 './demos/basic.dg.tsx'，
//   用正则取 '/' 后、'.dg.tsx' 前的部分。
const splitDemoNames = new Set(
  Object.keys(import.meta.glob('./demos/*.dg.tsx')).map(
    (p) => p.match(/([^/]+)\.dg\.tsx$/)![1],
  ),
)

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
  // 全局主题 store（单一真理源）。
  const { themeMode, setThemeMode } = useTheme()
  const isDark = themeMode === 'dark'
  // 全局虚拟化开关（单一真理源）。
  const { virtual, setVirtual } = useVirtualization()

  // 侧栏折叠状态。
  const [collapsed, setCollapsed] = useState(false)
  // 侧栏 inline Menu openKeys（受控，便于 demo 切换时自动展开所属分类）。
  const [openKeys, setOpenKeys] = useState<string[]>([])
  // 主题编辑器 Modal 开关。
  const [themeModalOpen, setThemeModalOpen] = useState(false)
  // split demo 编辑产物。null = 未编辑/重置（默认模式渲染真实 DemoComp）。
  // view 变化（切 demo）时 useEffect 重置为 null。
  const [editedDg, setEditedDg] = useState<ComponentType<Record<string, unknown>> | null>(null)
  const [editedAntd, setEditedAntd] = useState<ComponentType<Record<string, unknown>> | null>(null)

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

  // 切换 demo 时重置 live 编辑产物（避免上一个 demo 的编辑结果残留到新 demo）。
  useEffect(() => {
    setEditedDg(null)
    setEditedAntd(null)
  }, [view])

  // split demo 集合：用 glob 自动发现所有 *.dg.tsx 的 demo 名。
  //   有 .dg.tsx 段的 demo 自动接入 split + 编辑；无 .dg.tsx 段的降级为只读 CodeView。
  //   新增 demo 只需把 <name>.dg.tsx 文件放进 src/demos/ 即自动接入，无需改本文件。
  const isSplitDemo = (n: string) => splitDemoNames.has(n)

  // 源码懒加载：
  //   - 非 split demo：useDemoSource（只读 CodeView）。
  //   - split demo：useSplitDemoSource（dg + antd 两段，供双 LiveEditor）。
  const demoName = view.kind === 'demo' ? view.name : undefined
  const isSplit = view.kind === 'demo' && isSplitDemo(view.name)
  const { source, loading } = useDemoSource(
    demoName && !isSplit ? demoName : undefined,
  )
  const splitSrc = useSplitDemoSource(isSplit ? demoName : undefined)

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
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          paddingInline: 16,
          // Header 背景跟随全局主题。
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
          主题编辑器入口：从顶栏按钮打开 Modal，不再走 demo 路由。
          ThemeEditorPanel 行为零变化，只是承载形态从路由 demo 改为 Modal。
        */}
        <Button onClick={() => setThemeModalOpen(true)}>主题编辑器</Button>

        {/*
          顶栏全局 dark/light 切换（单一真理源）。
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
          全局虚拟化开关（单一真理源）：顶栏 Switch 驱动 VirtualizationProvider 的 virtual
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
      <Layout hasSider style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
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
            style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', borderInlineEnd: 0 }}
          />
        </Sider>
        <Content style={{ padding: 24, overflow: 'auto' }}>
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
              {/*
                预览区（上方）：
                - split demo：SplitDemoPreview 承载默认/编辑双模式。默认模式
                  渲染真实 DemoComp（零编辑开销）；任一 edited 非空切编辑模式。
                - 非 split demo：直接渲染 DemoComp。
              */}
              {isSplit ? (
                <SplitDemoPreview
                  name={view.name}
                  editedDg={editedDg}
                  editedAntd={editedAntd}
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
                - split demo：dg + antd 两段 LiveEditor（可编辑），展开才加载源码 + sucrase。
                  LiveEditor onApply 三态：(Comp,null)成功→setEditedXxx(Comp)；
                  (null,error)失败→setEditedXxx(null)（同时 Alert 显示错误）；(null,null)重置→
                  setEditedXxx(null) 回默认模式。代码先经 stripComments 去注释再展示。
                - 非 split demo：降级为只读 CodeView（原 source 三态）。
              */}
              <Collapse
                style={{ marginTop: 16 }}
                items={[
                  {
                    key: 'code',
                    label: isSplit ? '源码（可编辑）' : '源码（只读）',
                    children: isSplit ? (
                      splitSrc.loading ? (
                        <div>Loading source…</div>
                      ) : (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
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
                          <LiveEditor
                            key={`${view.name}-antd`}
                            initialCode={stripComments(splitSrc.antdSource ?? '')}
                            title="antd"
                            scope={scopeForDemo(view.name)}
                            onApply={(c, e) => setEditedAntd(() => (e ? null : c))}
                          />
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
