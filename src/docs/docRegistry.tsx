import type { DocEntry, DocGroup } from './types'
import {
  renderApiNamespace,
  renderArchitecture,
  renderColumnApi,
  renderCompatMatrix,
  renderDeprecatedAntdMembers,
  renderFeaturePage,
  renderGridOptions,
  renderIntro,
  renderKnownLimitations,
  renderMigration,
  renderPublicApi,
  renderQuickStart,
  renderRenderingModel,
  renderScrollY,
  renderSemanticDom,
  renderTableApi,
  renderWhenToMigrate,
} from './pages'

export const docs: DocEntry[] = [
  {
    slug: 'intro',
    group: '开始',
    title: 'data-grid 文档',
    description: '本站集中展示 data-grid 的使用路径、API、兼容边界与 demo 对照入口；从快速开始或迁移指南入手都行。',
    appliesTo: 'data-grid / antd v6',
    updated: '2026-07-12',
    sections: [
      { id: 'start', title: '阅读路径' },
      { id: 'glossary', title: '术语速查' },
    ],
    render: renderIntro,
  },
  {
    slug: 'quick-start',
    group: '开始',
    title: '快速开始',
    description: '本页带你完成安装与组件导入，并用最小表格和 JSX 列声明跑通第一次渲染。',
    sections: [
      { id: 'install', title: '导入组件' },
      { id: 'minimal', title: '最小表格' },
      { id: 'jsx', title: 'JSX 列声明' },
      { id: 'next', title: '下一步' },
    ],
    render: renderQuickStart,
  },
  {
    slug: 'migrate-from-antd',
    group: '开始',
    title: '从 antd 迁移',
    description: '按步骤把 antd Table 迁移到 data-grid，并核对滚动语义和过时成员。',
    sections: [
      { id: 'step-1', title: '先接入 data-grid' },
      { id: 'step-2', title: '改滚动高度' },
      { id: 'deprecated-members', title: '核对过时成员' },
    ],
    render: renderMigration,
  },
  {
    slug: 'when-to-migrate',
    group: '开始',
    title: '何时迁移 / 何时不要迁移',
    description: 'data-grid 适合与不适合的场景速览，帮助在动手迁移前判断取舍。',
    sections: [
      { id: 'fit', title: '适合迁移' },
      { id: 'avoid', title: '先别迁' },
      { id: 'next', title: '相关参考' },
    ],
    render: renderWhenToMigrate,
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
    render: renderArchitecture,
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
    render: renderRenderingModel,
  },
  {
    slug: 'scroll-y',
    group: '核心概念',
    title: 'scroll.y 语义',
    description: 'data-grid 的 scroll.y 是数据区域模式开关，由父容器高度决定滚动区域。',
    sections: [
      { id: 'meaning', title: '只接受 true' },
      { id: 'layout', title: '高度链' },
    ],
    render: renderScrollY,
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
    render: renderApiNamespace,
  },
  {
    slug: 'columns',
    group: '功能指南',
    title: '列',
    description: '本页汇总列宽、固定列、隐藏列、响应式列与列默认值的入口，并指向具体 demo。',
    sections: [
      { id: 'overview', title: '列能力入口' },
      { id: 'demos', title: '优先 demo' },
      { id: 'references', title: '交叉参考' },
    ],
    render: renderFeaturePage('columns'),
  },
  {
    slug: 'layout',
    group: '功能指南',
    title: '布局',
    description: '本页汇总多级表头、合并单元格、summary、边框与 sticky 的入口，并指向具体 demo。',
    sections: [
      { id: 'overview', title: '布局能力入口' },
      { id: 'demos', title: '优先 demo' },
      { id: 'references', title: '交叉参考' },
    ],
    render: renderFeaturePage('layout'),
  },
  {
    slug: 'scrolling',
    group: '功能指南',
    title: '滚动和虚拟化',
    description: '本页汇总大数据虚拟滚动、页面级 sticky、固定列与 DOM 复用的入口，并指向具体 demo。',
    sections: [
      { id: 'overview', title: '滚动入口' },
      { id: 'demos', title: '优先 demo' },
      { id: 'references', title: '交叉参考' },
    ],
    render: renderFeaturePage('scrolling'),
  },
  {
    slug: 'interaction',
    group: '功能指南',
    title: '交互',
    description: '本页汇总行选择、展开、树形、筛选排序、分页、编辑与拖拽的入口，并指向具体 demo。',
    sections: [
      { id: 'overview', title: '交互入口' },
      { id: 'demos', title: '优先 demo' },
      { id: 'references', title: '交叉参考' },
    ],
    render: renderFeaturePage('interaction'),
  },
  {
    slug: 'styling-and-theme',
    group: '功能指南',
    title: '样式和主题',
    description: '本页讲清如何用 antd token 做全局主题、用语义槽位做局部覆盖，并指向主题编辑器 demo。',
    sections: [
      { id: 'overview', title: '样式入口' },
      { id: 'theme-code', title: 'ConfigProvider token' },
      { id: 'demos', title: '优先 demo' },
      { id: 'references', title: '交叉参考' },
    ],
    render: renderFeaturePage('styling'),
  },
  {
    slug: 'semantic-dom',
    group: '功能指南',
    title: 'Semantic DOM',
    description: '本页列出 classNames / styles 的 13 个语义槽位、对应的 DOM 落点，以及 a11y 属性的兼容状态。',
    sections: [
      { id: 'slots', title: 'Semantic DOM 槽位矩阵' },
      { id: 'a11y', title: 'a11y 属性兼容矩阵' },
      { id: 'demo', title: '交互验证' },
    ],
    render: renderSemanticDom,
  },
  {
    slug: 'api-extension',
    group: '功能指南',
    title: 'API 扩展点',
    description: '本页汇总 JSX 列声明、components 替换、行级钩子与语义化样式槽位的入口，并指向具体 demo。',
    sections: [
      { id: 'overview', title: '扩展入口' },
      { id: 'demos', title: '优先 demo' },
      { id: 'references', title: '交叉参考' },
    ],
    render: renderFeaturePage('api'),
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
    render: renderPublicApi,
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
    render: renderTableApi,
  },
  {
    slug: 'column-api',
    group: '参考',
    title: 'Column API',
    description: '本页列出 Column props 的完整清单（由 api.json 自动生成），并指向列级 data-grid 扩展点。',
    sections: [
      { id: 'column-props', title: 'Column props' },
    ],
    render: renderColumnApi,
  },
  {
    slug: 'compat-matrix',
    group: '参考',
    title: '兼容矩阵',
    description: '本页用一行一个 API 领域的方式，摘要 data-grid 与 antd v6 Table 的兼容状态。',
    sections: [
      { id: 'matrix', title: '兼容状态摘要' },
    ],
    render: renderCompatMatrix,
  },
  {
    slug: 'deprecated-antd-members',
    group: '参考',
    title: '过时 antd Table 成员',
    description: '本页逐条说明 antd Table 已标记 deprecated 的成员、旧写法，以及 data-grid 对它们的迁移兼容处理。',
    sections: [
      { id: 'policy', title: '迁移策略' },
      { id: 'members', title: '过时成员支持状态' },
      { id: 'dom', title: 'DOM 差异' },
      { id: 'related', title: '继续核对' },
    ],
    render: renderDeprecatedAntdMembers,
  },
  {
    slug: 'known-limitations',
    group: '参考',
    title: '已知限制',
    description: '本页列出长期有效的架构边界、兼容缺口与可实施 backlog，帮助你在迁移前判断取舍。',
    sections: [
      { id: 'boundaries', title: '架构边界' },
      { id: 'backlog', title: 'Backlog' },
    ],
    render: renderKnownLimitations,
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
    render: renderGridOptions,
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
