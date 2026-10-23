import { lazy, Suspense, type ReactNode } from 'react'
import type { DocEntry, DocGroup, DocsPageContext } from './types'

/**
 * 文档页按 slug 惰性加载。
 *
 * 历史：这里本来是 `import { renderX } from './pages'` 的静态桶 —— 16 个页面
 * （含 80 KB 的 api.json 与全部 docs 组件）随 App 一起进首屏，实测 96 KB(min)。
 * 现在每个 slug 只在自己被点开时下载，`render(ctx)` 的同步签名保持不变
 * （Suspense 兜住加载态），调用方 DocsPage 无需改动。
 */
type PageRender = (context: DocsPageContext) => ReactNode
type PageModule = Record<string, PageRender>

function lazyPage(load: () => Promise<PageModule>, exportName: string): PageRender {
  const Page = lazy(async () => {
    const module = await load()
    const render = module[exportName]
    return {
      default: ({ ctx }: { ctx: DocsPageContext }) => <>{render(ctx)}</>,
    }
  })
  return (ctx: DocsPageContext) => (
    <Suspense fallback={<div style={{ padding: 24, opacity: 0.6 }}>加载文档…</div>}>
      <Page ctx={ctx} />
    </Suspense>
  )
}

export const docs: DocEntry[] = [
  {
    slug: 'quick-start',
    group: '开始',
    title: '快速开始',
    description: 'data-grid 的定位、安装、最小表格与 JSX 列声明；跑通第一次渲染后再选迁移路径或能力入口。',
    appliesTo: 'data-grid / antd v6',
    sections: [
      { id: 'what-is', title: 'data-grid 是什么' },
      { id: 'install', title: '导入组件' },
      { id: 'minimal', title: '最小表格' },
      { id: 'jsx', title: 'JSX 列声明' },
      { id: 'next', title: '下一步' },
    ],
    render: lazyPage(() => import('./pages/quick-start'), 'renderQuickStart'),
  },
  {
    slug: 'when-to-migrate',
    group: '开始',
    title: '何时从 antd Table 迁移',
    description: '先判断 data-grid 是否适合你的表格场景，再决定是否开始迁移。',
    sections: [
      { id: 'fit', title: '适合迁移' },
      { id: 'pain-to-cure', title: '痛点 → 解药' },
      { id: 'cost', title: '迁移成本' },
      { id: 'adjust', title: '需要同步调整的部分' },
      { id: 'avoid', title: '不支持的场景' },
    ],
    render: lazyPage(() => import('./pages/when-to-migrate'), 'renderWhenToMigrate'),
  },
  {
    slug: 'migrate-from-antd',
    group: '开始',
    title: '如何从 antd Table 迁移',
    description: '按步骤把 antd Table 迁移到 data-grid，并核对滚动语义、过时成员和兼容边界。',
    sections: [
      { id: 'step-1', title: '先接入 data-grid' },
      { id: 'step-2', title: '改滚动高度' },
      { id: 'prompt', title: '迁移提示词' },
      { id: 'deprecated-members', title: '核对过时成员' },
    ],
    render: lazyPage(() => import('./pages/migrate-from-antd'), 'renderMigration'),
  },
  {
    slug: 'architecture-overview',
    group: '核心概念',
    title: '架构总览',
    description: '本页讲清 data-grid 的四层职责、自研与复用的边界，以及长期文档入口。',
    sections: [
      { id: 'layers', title: '四层职责' },
      { id: 'boundaries', title: '产品边界' },
    ],
    render: lazyPage(() => import('./pages/architecture-overview'), 'renderArchitecture'),
  },
  {
    slug: 'rendering-model',
    group: '核心概念',
    title: '渲染模型',
    description: '本页讲清 data-grid 的 CSS Grid 渲染结构、DOM 形态与 antd Table 的差异，以及迁移时该选哪些扩展点。',
    sections: [
      { id: 'css-grid', title: 'CSS Grid' },
      { id: 'dom', title: 'DOM 形态' },
    ],
    render: lazyPage(() => import('./pages/rendering-model'), 'renderRenderingModel'),
  },
  {
    slug: 'api-namespace',
    group: '核心概念',
    title: 'API 命名空间',
    description: '兼容 API 留在 antd 风格入口，data-grid 专属能力进入 gridOptions 和 gridColumnOptions。',
    sections: [
      { id: 'compatible', title: '兼容 API 留顶层，专属能力进命名空间' },
      { id: 'native', title: '参考入口' },
    ],
    render: lazyPage(() => import('./pages/api-namespace'), 'renderApiNamespace'),
  },
  {
    slug: 'features',
    group: '功能指南',
    title: '能力总览',
    description: 'data-grid 各能力域的入口、说明与跳转：列、布局、交互、API 扩展点。',
    sections: [
      { id: 'overview', title: '能力清单' },
      { id: 'demos', title: 'demo 入口' },
    ],
    render: lazyPage(() => import('./pages/features'), 'renderFeatures'),
  },
  {
    slug: 'scrolling',
    group: '功能指南',
    title: '滚动和虚拟化',
    description: '本页汇总滚动与虚拟化的分层入口、scroll.y 语义和父容器高度责任，并指向具体 demo。',
    sections: [
      { id: 'overview', title: '滚动入口' },
      { id: 'scroll-y', title: 'scroll.y 语义' },
      { id: 'demos', title: '滚动相关 demo' },
    ],
    render: lazyPage(() => import('./pages/scrolling'), 'renderScrolling'),
  },
  {
    slug: 'styling-and-theme',
    group: '功能指南',
    title: '样式和主题',
    description: '本页讲清如何用 antd 令牌 做全局主题、用语义槽位做局部覆盖，并指向主题编辑器 demo。',
    sections: [
      { id: 'overview', title: '样式入口' },
      { id: 'theme-code', title: 'ConfigProvider token' },
      { id: 'demos', title: '优先 demo' },
    ],
    render: lazyPage(() => import('./pages/styling-and-theme'), 'renderStyling'),
  },
  {
    slug: 'semantic-dom',
    group: '功能指南',
    title: 'Semantic DOM',
    description: '本页列出 classNames / styles 的 13 个语义槽位、对应的 DOM 位置，以及 a11y 属性的兼容状态。',
    sections: [
      { id: 'slots', title: 'Semantic DOM 槽位矩阵' },
      { id: 'a11y', title: 'a11y 属性兼容矩阵' },
      { id: 'demo', title: '交互验证' },
    ],
    render: lazyPage(() => import('./pages/semantic-dom'), 'renderSemanticDom'),
  },
  {
    slug: 'public-api',
    group: '参考',
    title: '公开 API',
    description: '本页列出包主入口的公开导出清单（由 api.json 自动生成），并指出 data-grid 专属命名空间的入口。',
    sections: [
      { id: 'exports', title: '主入口导出' },
      { id: 'native', title: '专属 API 入口' },
    ],
    render: lazyPage(() => import('./pages/public-api'), 'renderPublicApi'),
  },
  {
    slug: 'table-api',
    group: '参考',
    title: 'Table API',
    description: '本页列出 Table props 的完整清单（由 api.json 自动生成），并指向 Table 静态属性入口。',
    sections: [
      { id: 'table-props', title: 'Table props' },
      { id: 'table-ref', title: 'TableRef' },
      { id: 'static', title: '静态属性' },
    ],
    render: lazyPage(() => import('./pages/table-api'), 'renderTableApi'),
  },
  {
    slug: 'column-api',
    group: '参考',
    title: 'Column API',
    description: '本页列出 Column props 的完整清单（由 api.json 自动生成），并指向列级 data-grid 扩展点。',
    sections: [
      { id: 'column-props', title: 'Column props' },
    ],
    render: lazyPage(() => import('./pages/column-api'), 'renderColumnApi'),
  },
  {
    slug: 'compat-matrix',
    group: '参考',
    title: '兼容矩阵',
    description: '本页用一行一个 API 领域的方式，摘要 data-grid 与 antd v6 Table 的兼容状态。',
    sections: [
      { id: 'matrix', title: '兼容状态摘要' },
      { id: 'deprecated-members', title: '过时成员迁移特例' },
      { id: 'related', title: '相关说明' },
    ],
    render: lazyPage(() => import('./pages/compat-matrix'), 'renderCompatMatrix'),
  },
  {
    slug: 'known-limitations',
    group: '参考',
    title: '已知限制',
    description: '本页列出长期有效的架构边界、兼容差异和迁移时的行为注意事项，帮助你在迁移前判断取舍。',
    sections: [
      { id: 'boundaries', title: '架构边界和兼容缺口' },
    ],
    render: lazyPage(() => import('./pages/known-limitations'), 'renderKnownLimitations'),
  },
  {
    slug: 'grid-options',
    group: '参考',
    title: 'gridOptions',
    description: '本页列出 data-grid 专属表级 / 列级能力的命名空间完整字段（由 api.json 自动生成）。',
    sections: [
      { id: 'namespace', title: '命名空间' },
      { id: 'examples', title: 'gridOptions 成员' },
      { id: 'selection', title: 'gridOptions.selection' },
      { id: 'virtualization-mode', title: 'VirtualizationMode' },
      { id: 'column-options', title: 'gridColumnOptions' },
      { id: 'recycling', title: 'recycling' },
    ],
    render: lazyPage(() => import('./pages/grid-options'), 'renderGridOptions'),
  },
]

export function groupDocs(list: DocEntry[] = docs): DocGroup[] {
  const groups: DocGroup[] = []
  for (const doc of list) {
    const current = groups.find((group) => group.group === doc.group)
    if (current) current.items.push(doc)
    else groups.push({ group: doc.group, items: [doc] })
  }
  return groups
}
