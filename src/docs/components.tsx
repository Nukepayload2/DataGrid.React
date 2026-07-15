import type { ReactNode } from 'react'
import { Button, Tag, Typography } from 'antd'
import type { ColumnType, TableProps } from '../table'
import { Table as GridTable } from '../table'
import CodeView from '../CodeView'
import type { DocEntry, DocsAction } from './types'

const { Title, Paragraph, Text } = Typography

interface DocArticleProps {
  doc: DocEntry
  previous?: DocEntry
  next?: DocEntry
  onNavigate: (slug: string) => void
  children: ReactNode
}

interface DocSectionProps {
  id: string
  eyebrow?: string
  title: string
  description?: ReactNode
  children: ReactNode
}

interface DocsDataGridProps<T extends object> {
  description?: ReactNode
  columns: Array<ColumnType<T>>
  dataSource: T[]
  rowKey: TableProps<T>['rowKey']
  scrollX?: number | string
}

interface DocCard {
  key: string
  title: string
  description: string
  action: DocsAction
}

export function DocArticle({
  doc,
  previous,
  next,
  onNavigate,
  children,
}: DocArticleProps) {
  const hasMeta = Boolean(doc.appliesTo || doc.updated)

  return (
    <article className="docs-article">
      <header className="docs-article-header">
        <Title level={1}>{doc.title}</Title>
        <Paragraph className="docs-article-lede">{doc.description}</Paragraph>
        {hasMeta ? (
          <div className="docs-article-meta">
            {doc.appliesTo ? <Tag>{doc.appliesTo}</Tag> : null}
            {doc.updated ? <Text type="secondary">更新于 {doc.updated}</Text> : null}
          </div>
        ) : null}
      </header>

      {children}

      <footer className="docs-article-footer">
        <div>
          {previous ? (
            <Button onClick={() => onNavigate(previous.slug)}>
              上一篇：{previous.title}
            </Button>
          ) : null}
        </div>
        <div>
          {next ? (
            <Button type="primary" onClick={() => onNavigate(next.slug)}>
              下一篇：{next.title}
            </Button>
          ) : null}
        </div>
      </footer>
    </article>
  )
}

export function DocSection({
  id,
  title,
  description,
  children,
}: DocSectionProps) {
  return (
    <section id={id} className="docs-section">
      <div className="docs-section-header">
        <Title level={2}>{title}</Title>
        {description ? <Paragraph>{description}</Paragraph> : null}
      </div>
      {children}
    </section>
  )
}

export function DocsDataGrid<T extends object>({
  description,
  columns,
  dataSource,
  rowKey,
  scrollX,
}: DocsDataGridProps<T>) {
  return (
    <div className="docs-table-wrap">
      {description ? <Paragraph className="docs-table-description">{description}</Paragraph> : null}
      <GridTable<T>
        bordered
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        rowKey={rowKey}
        sticky
        scroll={scrollX ? { x: scrollX } : undefined}
        size="small"
      />
    </div>
  )
}

export function DocsCode({
  code,
  height = 220,
  ariaLabel,
}: {
  code: string
  height?: number | string
  ariaLabel: string
}) {
  return <CodeView code={code} height={height} maxHeight={360} ariaLabel={ariaLabel} />
}

export function DocsActionList({
  actions,
  onOpen,
}: {
  actions: DocsAction[]
  onOpen: (action: DocsAction) => void
}) {
  return (
    <div className="docs-inline-actions">
      {actions.map((action) => (
        <Button key={`${action.kind}:${action.value}`} onClick={() => onOpen(action)}>
          {action.label}
        </Button>
      ))}
    </div>
  )
}

export function DocsCardGrid({
  items,
  onOpen,
}: {
  items: DocCard[]
  onOpen: (action: DocsAction) => void
}) {
  return (
    <div className="docs-entry-grid">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className="docs-entry-card"
          onClick={() => onOpen(item.action)}
        >
          <span className="docs-entry-card-title">{item.title}</span>
          <span className="docs-entry-card-desc">{item.description}</span>
        </button>
      ))}
    </div>
  )
}

export function DocsNote({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="docs-note">
      <Text strong>{title}</Text>
      <div>{children}</div>
    </div>
  )
}
