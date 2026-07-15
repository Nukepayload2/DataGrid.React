import type { DocEntry, DocGroup } from './types'
import {
  renderApiNamespace,
  renderArchitecture,
  renderColumnApi,
  renderCompatMatrix,
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
} from './pages'

export const docs: DocEntry[] = [
  {
    slug: 'intro',
    group: '开始',
    title: 'data-grid 文档',
    description: '用网页组件展示 data-grid 的使用路径、API、兼容边界和 demo 对照入口。',
    appliesTo: 'data-grid / antd v6',
    updated: '2026-07-12',
    sections: [
      { id: 'start', title: '阅读路径' },
    ],
    render: renderIntro,
  },
  {
    slug: 'quick-start',
    group: '开始',
    title: '快速开始',
    description: '安装、样式导入、最小表格和 JSX 列声明。',
    sections: [
      { id: 'install', title: '导入组件和样式' },
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
    description: '先复用熟悉的 antd Table 写法，再处理 data-grid 的布局和 DOM 差异。',
    sections: [
      { id: 'reuse', title: '复用写法' },
      { id: 'differences', title: '迁移差异' },
      { id: 'demos', title: '推荐 demo' },
    ],
    render: renderMigration,
  },
  {
    slug: 'architecture-overview',
    group: '核心概念',
    title: '架构总览',
    description: 'data-grid 的分层、产品边界和长期文档入口。',
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
    description: 'CSS Grid 渲染结构、DOM 形态和迁移时的扩展点选择。',
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
    description: 'data-grid 的 scroll.y 是数据区模式开关，由父容器高度决定滚动区域。',
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
      { id: 'compatible', title: '兼容 API' },
      { id: 'native', title: '专属能力' },
    ],
    render: renderApiNamespace,
  },
  {
    slug: 'columns',
    group: '功能指南',
    title: '列',
    description: '列宽、固定列、隐藏列、响应式列和列默认值。',
    sections: [
      { id: 'overview', title: '列能力入口' },
      { id: 'demos', title: '优先 demo' },
    ],
    render: renderFeaturePage('columns'),
  },
  {
    slug: 'layout',
    group: '功能指南',
    title: '布局',
    description: '表头、合并、summary、边框和 sticky。',
    sections: [
      { id: 'overview', title: '布局能力入口' },
      { id: 'demos', title: '优先 demo' },
    ],
    render: renderFeaturePage('layout'),
  },
  {
    slug: 'scrolling',
    group: '功能指南',
    title: '滚动和虚拟化',
    description: '大数据表格、页面级 sticky、固定列和 DOM 复用。',
    sections: [
      { id: 'overview', title: '滚动入口' },
      { id: 'demos', title: '优先 demo' },
    ],
    render: renderFeaturePage('scrolling'),
  },
  {
    slug: 'interaction',
    group: '功能指南',
    title: '交互',
    description: '选择、展开、树形、筛选排序、分页、编辑和拖拽。',
    sections: [
      { id: 'overview', title: '交互入口' },
      { id: 'demos', title: '优先 demo' },
    ],
    render: renderFeaturePage('interaction'),
  },
  {
    slug: 'styling-and-theme',
    group: '功能指南',
    title: '样式和主题',
    description: 'antd token、语义槽位和主题编辑器。',
    sections: [
      { id: 'overview', title: '样式入口' },
      { id: 'theme-code', title: 'ConfigProvider token' },
      { id: 'demos', title: '优先 demo' },
    ],
    render: renderFeaturePage('styling'),
  },
  {
    slug: 'semantic-dom',
    group: '功能指南',
    title: 'Semantic DOM',
    description: 'classNames / styles 的 13 个语义槽位、data-grid DOM 落点和 a11y 边界。',
    sections: [
      { id: 'slots', title: '13 槽位落点矩阵' },
      { id: 'a11y', title: 'a11y 属性兼容矩阵' },
      { id: 'demo', title: '交互验证' },
    ],
    render: renderSemanticDom,
  },
  {
    slug: 'api-extension',
    group: '功能指南',
    title: 'API 扩展点',
    description: 'JSX API、components、行级钩子和语义化样式槽位。',
    sections: [
      { id: 'overview', title: '扩展入口' },
      { id: 'demos', title: '优先 demo' },
    ],
    render: renderFeaturePage('api'),
  },
  {
    slug: 'public-api',
    group: '参考',
    title: '公开 API',
    description: '主入口导出、稳定性、data-grid 专属命名空间和不公开的内部能力。',
    sections: [
      { id: 'exports', title: '主入口导出' },
      { id: 'native', title: '专属命名空间' },
      { id: 'internal', title: '内部能力' },
    ],
    render: renderPublicApi,
  },
  {
    slug: 'table-api',
    group: '参考',
    title: 'Table API',
    description: '常用 Table props 和 Table 静态属性。',
    sections: [
      { id: 'table-props', title: 'Table props' },
      { id: 'static', title: '静态属性' },
    ],
    render: renderTableApi,
  },
  {
    slug: 'api-summary',
    group: '参考',
    title: 'Table API 摘要',
    description: '旧入口保留，内容等同 Table API。',
    sections: [
      { id: 'table-props', title: 'Table props' },
      { id: 'static', title: '静态属性' },
    ],
    render: renderTableApi,
  },
  {
    slug: 'column-api',
    group: '参考',
    title: 'Column API',
    description: '常用 Column props、展示控制和列级 data-grid 扩展点。',
    sections: [
      { id: 'column-props', title: 'Column props' },
    ],
    render: renderColumnApi,
  },
  {
    slug: 'compat-matrix',
    group: '参考',
    title: '兼容矩阵',
    description: 'data-grid 与 antd v6 Table 的 API 兼容状态摘要。',
    sections: [
      { id: 'matrix', title: '兼容状态摘要' },
    ],
    render: renderCompatMatrix,
  },
  {
    slug: 'known-limitations',
    group: '参考',
    title: '已知限制',
    description: '仍有长期价值的架构边界、兼容缺口和可实施 backlog。',
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
    description: 'data-grid 专属表级能力的命名空间和常见增强项。',
    sections: [
      { id: 'namespace', title: '命名空间' },
      { id: 'examples', title: 'gridOptions 成员' },
      { id: 'selection', title: 'gridOptions.selection' },
      { id: 'scrollbar', title: 'scrollBarFoldMode' },
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
