/** docs 视图：面向 data-grid 使用者的文档和 demo 导览。 */

import { useMemo } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Drawer, Typography, theme } from 'antd'
import { demos } from './demos'
import { groupByCategory, navigate } from './demos/registry'

const { Text } = Typography

interface DocEntry {
  slug: string
  group: string
  title: string
  description: string
  source: string
}

const INTRO_SOURCE = `# data-grid

data-grid 是一个 React 数据表格组件，提供接近 antd Table 的使用方式，并针对大数据、固定列、虚拟滚动、拖拽和可控选择做了专门优化。

这个站点面向 data-grid 的使用者。左侧 demo 用来查看能力、复制写法、对照 antd 行为；文档页只说明使用路径、常用 API 和迁移注意事项。

## 推荐路径

1. 从 [快速开始](#/docs/quick-start) 建立最小表格。
2. 在 [示例目录](#/docs/demo-catalog) 找到与你的场景最接近的 demo。
3. 如果从 antd Table 迁移，先读 [从 antd 迁移](#/docs/migrate-from-antd)。
4. 使用虚拟滚动、固定列、拖拽、选择等能力前，查看对应 demo 的源码和对照说明。

## 什么时候适合用 data-grid

- 需要 antd Table 风格 API，但普通 table 布局难以满足滚动、固定列和虚拟化组合。
- 表格数据量大，需要更稳定的滚动和更低的渲染成本。
- 需要在同一套表格中组合选择、展开、树形、筛选排序、列宽拖拽和主题 token。

## 常用入口

- [基础表格 demo](#/demos/basic-table)
- [虚拟列表 demo](#/demos/virtual-list)
- [固定列和表头 demo](#/demos/fixed-columns-and-header)
- [动态表格设置 demo](#/demos/dynamic-table-settings)
- [Table API 摘要](#/docs/api-summary)
`

const QUICK_START_SOURCE = `# 快速开始

## 安装和导入

\`\`\`tsx
import { Table } from '@nukepayload2/data-grid'
import type { ColumnType } from '@nukepayload2/data-grid'
import '@nukepayload2/data-grid/style.css'
\`\`\`

## 最小表格

\`\`\`tsx
interface Record {
  key: string
  name: string
  age: number
}

const columns: ColumnType<Record>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age', align: 'end' },
]

const data: Record[] = [
  { key: '1', name: 'Alice', age: 28 },
  { key: '2', name: 'Bob', age: 34 },
]

export default function Demo() {
  return <Table columns={columns} dataSource={data} />
}
\`\`\`

## JSX 列声明

\`\`\`tsx
<Table dataSource={data}>
  <Table.Column title="Name" dataIndex="name" key="name" />
  <Table.Column title="Age" dataIndex="age" key="age" />
</Table>
\`\`\`

相关示例：

- [基础表格](#/demos/basic-table)
- [JSX 列声明](#/demos/jsx-columns)
- [表格级列默认值](#/demos/table-column-defaults)
`

const API_SUMMARY_SOURCE = `# Table API 摘要

这里列出使用 data-grid 时最常用的入口。完整类型以包导出的 TypeScript 类型为准。

## Table props

| 属性 | 用途 |
|---|---|
| \`columns\` | 列配置数组。 |
| \`dataSource\` | 表格数据数组。 |
| \`rowKey\` | 行唯一标识，选择、展开和滚动定位都依赖它。 |
| \`scroll\` | 横向滚动和数据区滚动。data-grid 的 \`scroll.y\` 使用 \`true\` 开启，实际高度由容器决定。 |
| \`virtual\` | 开启虚拟滚动。 |
| \`rowSelection\` | antd 风格行选择配置。 |
| \`expandable\` | 展开行和树表配置。 |
| \`pagination\` | 分页配置。传 \`false\` 关闭分页。 |
| \`components\` | 自定义单元格、行或表头交互。 |
| \`classNames\` / \`styles\` | 语义化样式槽位。 |
| \`sticky\` | 页面级 sticky 表头。 |
| \`gridOptions\` | data-grid 专属表级能力，例如行高、列宽拖拽、原生选择、拖拽增强。 |

## Column props

| 属性 | 用途 |
|---|---|
| \`title\` / \`dataIndex\` / \`key\` | 列标题、字段路径和稳定 key。 |
| \`width\` / \`fixed\` / \`align\` | 宽度、固定列和对齐方式。 |
| \`render\` | 自定义单元格内容。 |
| \`onCell\` / \`onHeaderCell\` | 注入单元格或表头属性，也可用于合并单元格。 |
| \`sorter\` / \`filters\` | 排序和筛选。 |
| \`ellipsis\` / \`hidden\` / \`responsive\` | 展示控制。 |
| \`gridColumnOptions\` | data-grid 专属列级能力，例如列拖拽锁定。 |

## 静态属性

- \`Table.Column\` / \`Table.ColumnGroup\`
- \`Table.EXPAND_COLUMN\` / \`Table.SELECTION_COLUMN\`
- \`Table.Summary\` / \`Table.Summary.Row\` / \`Table.Summary.Cell\`
- \`Table.SELECTION_ALL\` / \`Table.SELECTION_INVERT\` / \`Table.SELECTION_NONE\`

相关示例：

- [排序和筛选](#/demos/sorting-and-filtering)
- [基础行选择](#/demos/basic-row-selection)
- [展开行](#/demos/expandable-rows)
- [语义化样式](#/demos/semantic-styling)
`

const MIGRATION_SOURCE = `# 从 antd Table 迁移

data-grid 的主要目标是让 antd Table 用户可以用熟悉的 props 开始迁移，同时获得更稳定的 CSS Grid 布局、虚拟滚动和固定列能力。

## 优先复用的写法

- \`columns\`、\`dataSource\`、\`rowKey\`
- \`rowSelection\`
- \`expandable\`
- \`pagination\`
- \`sorter\` / \`filters\`
- \`Table.Column\` / \`Table.ColumnGroup\`

## 迁移时最需要注意的差异

| 差异 | data-grid 写法 |
|---|---|
| \`scroll.y\` 不接收数字高度 | 用 \`scroll={{ y: true }}\` 开启数据区滚动，并给父容器明确高度。 |
| data-grid 专属能力不放在顶层 | 使用 \`gridOptions\` 和 \`gridColumnOptions\`。 |
| 不依赖原生 \`table/tr/td\` DOM | 行和单元格相关定制优先用 \`onRow\`、\`onCell\`、\`components\`、\`classNames\`、\`styles\`。 |
| 虚拟滚动和固定列组合更常见 | 先从对应 demo 复制容器高度、scroll 和 virtual 写法。 |

## 推荐对照 demo

- [基础表格](#/demos/basic-table)
- [固定列](#/demos/fixed-columns)
- [固定列和表头](#/demos/fixed-columns-and-header)
- [排序和筛选](#/demos/sorting-and-filtering)
- [分页](#/demos/pagination)
- [单元格编辑](#/demos/cell-editing)
`

const SCROLLING_SOURCE = `# 虚拟滚动和性能

data-grid 的虚拟滚动用于大数据量表格。普通表格不需要默认开启；当行数较多、固定列和滚动组合复杂时，再开启虚拟化。

## 基础写法

\`\`\`tsx
<div style={{ height: 520 }}>
  <Table
    columns={columns}
    dataSource={data}
    rowKey="id"
    scroll={{ x: 1200, y: true }}
    virtual
  />
</div>
\`\`\`

## 使用建议

- 父容器需要明确高度，\`scroll.y\` 只负责启用数据区滚动。
- 大表格优先保证 \`rowKey\` 稳定。
- 固定列、树形数据、展开行、合并单元格和虚拟滚动组合时，先参考对应 demo。
- 超大数据量可查看 DOM 复用虚拟列表，它是 data-grid 专属能力。

相关示例：

- [虚拟列表](#/demos/virtual-list)
- [DOM 复用虚拟列表](#/demos/dom-recycled-virtual-list)
- [固定列和表头](#/demos/fixed-columns-and-header)
- [虚拟列表拖拽排序](#/demos/virtual-list-drag-row-sorting)
`

const THEMING_SOURCE = `# 样式和主题

data-grid 复用 antd v6 token 和 CSS variables。非表格控件继续使用 antd，表格主体由 data-grid 渲染。

## 常用方式

- 用 antd \`ConfigProvider\` 配置主题 token。
- 用 \`theme.components.Table\` 调整表格视觉变量。
- 用 \`classNames\` / \`styles\` 对语义槽位做局部样式。
- 用站点顶栏的主题编辑器观察 data-grid 与 antd 对照效果。

## 相关示例

- [组件主题令牌](#/demos/component-theme-tokens)
- [语义化样式](#/demos/semantic-styling)
- [语义化 DOM 插槽](#/demos/semantic-dom-slots)
- [动态表格设置](#/demos/dynamic-table-settings)
`

function buildDemoCatalogSource(): string {
  const groups = groupByCategory(demos)
  const sections = groups
    .map((group) => {
      const items = group.items
        .map((demo) => {
          const subtitle = demo.subtitle ? ` - ${demo.subtitle}` : ''
          const description = demo.description ? `：${demo.description}` : ''
          const compare = demo.compare ? '（含 antd 对照）' : ''
          return `- [${demo.title}](#/demos/${demo.name})${subtitle}${compare}${description}`
        })
        .join('\n')
      return `## ${group.category}\n\n${items}`
    })
    .join('\n\n')

  return `# 示例目录

示例按使用场景分组。多数示例左侧是 data-grid，右侧是 antd 对照，便于确认迁移差异和视觉结果。

${sections}
`
}

function createDocs(): DocEntry[] {
  return [
    {
      slug: 'intro',
      group: '开始',
      title: '概览',
      description: 'data-grid 的定位、适用场景和阅读路径。',
      source: INTRO_SOURCE,
    },
    {
      slug: 'quick-start',
      group: '开始',
      title: '快速开始',
      description: '安装、样式导入和最小表格。',
      source: QUICK_START_SOURCE,
    },
    {
      slug: 'demo-catalog',
      group: '开始',
      title: '示例目录',
      description: '按功能场景浏览全部 demo。',
      source: buildDemoCatalogSource(),
    },
    {
      slug: 'api-summary',
      group: '参考',
      title: 'Table API 摘要',
      description: '常用 Table、Column 和静态属性。',
      source: API_SUMMARY_SOURCE,
    },
    {
      slug: 'migrate-from-antd',
      group: '指南',
      title: '从 antd 迁移',
      description: '迁移路径、差异和推荐对照示例。',
      source: MIGRATION_SOURCE,
    },
    {
      slug: 'virtual-scrolling',
      group: '指南',
      title: '虚拟滚动和性能',
      description: '大数据表格、容器高度和 DOM 复用。',
      source: SCROLLING_SOURCE,
    },
    {
      slug: 'styling-and-theme',
      group: '指南',
      title: '样式和主题',
      description: 'antd token、语义槽位和主题编辑器。',
      source: THEMING_SOURCE,
    },
  ]
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const tokenPattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index))
    const token = match[0]
    const key = `${keyPrefix}-${match.index}`
    if (token.startsWith('`')) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>)
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{renderInline(token.slice(2, -2), `${key}-strong`)}</strong>)
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (linkMatch) {
        nodes.push(
          <a key={key} href={linkMatch[2]}>
            {renderInline(linkMatch[1], `${key}-link`)}
          </a>,
        )
      }
    }
    cursor = match.index + token.length
  }

  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?[\s:|-]+\|[\s:|-]+\|?\s*$/.test(line)
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function headingId(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[`*_#[\]()]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '')
}

function renderHeading(depth: number, text: string, index: number): ReactNode {
  const children = renderInline(text, `heading-${index}`)
  const id = headingId(text)
  if (depth === 1) return <h1 key={`heading-${index}`} id={id}>{children}</h1>
  if (depth === 2) return <h2 key={`heading-${index}`} id={id}>{children}</h2>
  if (depth === 3) return <h3 key={`heading-${index}`} id={id}>{children}</h3>
  return <h4 key={`heading-${index}`} id={id}>{children}</h4>
}

function MarkdownView({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) {
      index += 1
      continue
    }

    const fenceMatch = line.match(/^```(\w+)?/)
    if (fenceMatch) {
      const code: string[] = []
      index += 1
      while (index < lines.length && !lines[index].startsWith('```')) {
        code.push(lines[index])
        index += 1
      }
      index += 1
      blocks.push(
        <pre key={`code-${index}`} className="docs-code-block">
          <code data-language={fenceMatch[1]}>{code.join('\n')}</code>
        </pre>,
      )
      continue
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      blocks.push(renderHeading(headingMatch[1].length, headingMatch[2].trim(), index))
      index += 1
      continue
    }

    if (
      line.trim().startsWith('|') &&
      index + 1 < lines.length &&
      isTableSeparator(lines[index + 1])
    ) {
      const rows: string[][] = [splitTableRow(line)]
      index += 2
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        rows.push(splitTableRow(lines[index]))
        index += 1
      }
      const [header, ...body] = rows
      blocks.push(
        <div key={`table-${index}`} className="docs-table-wrap">
          <table>
            <thead>
              <tr>
                {header.map((cell, cellIndex) => (
                  <th key={cellIndex}>{renderInline(cell, `th-${index}-${cellIndex}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{renderInline(cell, `td-${index}-${rowIndex}-${cellIndex}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    const listMatch = line.match(/^(\s*)([-*]|\d+\.)\s+(.+)$/)
    if (listMatch) {
      const ordered = /^\d+\./.test(listMatch[2])
      const items: string[] = []
      while (index < lines.length) {
        const itemMatch = lines[index].match(/^(\s*)([-*]|\d+\.)\s+(.+)$/)
        if (!itemMatch || /^\d+\./.test(itemMatch[2]) !== ordered) break
        items.push(itemMatch[3])
        index += 1
      }
      const ListTag = ordered ? 'ol' : 'ul'
      blocks.push(
        <ListTag key={`list-${index}`} className="docs-list">
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item, `li-${index}-${itemIndex}`)}</li>
          ))}
        </ListTag>,
      )
      continue
    }

    const paragraph: string[] = [line.trim()]
    index += 1
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,6})\s+/.test(lines[index]) &&
      !lines[index].startsWith('```') &&
      !/^(\s*)([-*]|\d+\.)\s+/.test(lines[index]) &&
      !(lines[index].trim().startsWith('|') && index + 1 < lines.length && isTableSeparator(lines[index + 1]))
    ) {
      paragraph.push(lines[index].trim())
      index += 1
    }
    blocks.push(<p key={`p-${index}`}>{renderInline(paragraph.join(' '), `p-${index}`)}</p>)
  }

  return <article className="docs-markdown">{blocks}</article>
}

function groupDocs(docs: DocEntry[]): Array<{ group: string; items: DocEntry[] }> {
  const groups: Array<{ group: string; items: DocEntry[] }> = []
  for (const doc of docs) {
    const current = groups.find((group) => group.group === doc.group)
    if (current) current.items.push(doc)
    else groups.push({ group: doc.group, items: [doc] })
  }
  return groups
}

function DocsToc({
  groups,
  activeSlug,
  onSelect,
}: {
  groups: Array<{ group: string; items: DocEntry[] }>
  activeSlug: string
  onSelect: (slug: string) => void
}) {
  return (
    <nav className="docs-toc-list" aria-label="文档目录">
      {groups.map((group) => (
        <div key={group.group} className="docs-toc-group">
          <div className="docs-toc-group-title">{group.group}</div>
          {group.items.map((item) => (
            <a
              key={item.slug}
              className={item.slug === activeSlug ? 'docs-toc-link docs-toc-link-active' : 'docs-toc-link'}
              href={`#/docs/${item.slug}`}
              onClick={(event) => {
                event.preventDefault()
                onSelect(item.slug)
              }}
            >
              <span>{item.title}</span>
              <Text type="secondary" className="docs-toc-desc">
                {item.description}
              </Text>
            </a>
          ))}
        </div>
      ))}
    </nav>
  )
}

export default function DocsPage({
  section,
  tocOpen,
  onTocOpenChange,
}: {
  section?: string
  tocOpen: boolean
  onTocOpenChange: (open: boolean) => void
}) {
  const { token } = theme.useToken()
  const docs = useMemo(() => createDocs(), [])
  const docsBySlug = useMemo(() => new Map(docs.map((doc) => [doc.slug, doc])), [docs])
  const activeDoc = docsBySlug.get(section ?? 'intro') ?? docsBySlug.get('intro')!
  const groups = useMemo(() => groupDocs(docs), [docs])
  const docsStyle = {
    '--docs-text': token.colorText,
    '--docs-text-secondary': token.colorTextSecondary,
    '--docs-border': token.colorBorderSecondary,
    '--docs-fill': token.colorFillAlter,
    '--docs-code-bg': token.colorFillTertiary,
    '--docs-primary': token.colorPrimary,
    '--docs-primary-bg': token.colorPrimaryBg,
  } as CSSProperties

  const goDoc = (slug: string) => {
    navigate(`/docs/${slug}`)
    onTocOpenChange(false)
  }

  return (
    <div className="docs-layout" style={docsStyle}>
      <aside className="docs-toc" aria-label="文档目录">
        <DocsToc groups={groups} activeSlug={activeDoc.slug} onSelect={goDoc} />
      </aside>

      <main className="docs-content">
        <div className="docs-breadcrumb">
          <a href="#/docs/intro" onClick={(event) => {
            event.preventDefault()
            goDoc('intro')
          }}>
            Docs
          </a>
          <span>/</span>
          <span>{activeDoc.group}</span>
        </div>
        <MarkdownView source={activeDoc.source} />
      </main>

      <Drawer
        title="文档目录"
        placement="left"
        open={tocOpen}
        onClose={() => onTocOpenChange(false)}
        width={300}
      >
        <div className="docs-drawer-toc">
          <DocsToc groups={groups} activeSlug={activeDoc.slug} onSelect={goDoc} />
        </div>
      </Drawer>
    </div>
  )
}
