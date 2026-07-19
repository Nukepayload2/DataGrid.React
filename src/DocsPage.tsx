/** docs 视图：网页化文档壳，内容由 src/docs 注册表驱动。 */

import { useCallback, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Drawer, Input, theme } from 'antd'
import { CaretRightOutlined } from '@ant-design/icons'
import { DocArticle } from './docs/components'
import { docs, groupDocs } from './docs/docRegistry'
import type { DocEntry, DocGroup, DocsAction } from './docs/types'
import { navigate } from './demos/registry'

const docAliases = new Map([
  ['virtual-scrolling', 'scrolling'],
])

function openDocsAction(action: DocsAction, goDoc: (slug: string) => void) {
  if (action.kind === 'doc') goDoc(action.value)
  else navigate(action.value)
}

function matchDoc(doc: DocEntry, lowerQuery: string): boolean {
  if (!lowerQuery) return true
  return [doc.title, doc.description, doc.group, doc.slug].some((s) =>
    s.toLowerCase().includes(lowerQuery),
  )
}

function DocsToc({
  groups,
  activeSlug,
  onSelect,
}: {
  groups: DocGroup[]
  activeSlug: string
  onSelect: (slug: string) => void
}) {
  const { token } = theme.useToken()
  const [query, setQuery] = useState('')
  // 默认所有分组展开；用户点 title 折叠/展开。空 query 时受控于用户操作。
  const [collapsedSet, setCollapsedSet] = useState<Set<string>>(() => new Set())
  const trimmed = query.trim()
  const lowerQuery = trimmed.toLowerCase()
  const hasQuery = lowerQuery.length > 0

  // 搜索时按标题/描述/分组过滤；命中分组保留并强制展开，未命中分组整组隐藏。
  const visibleGroups = useMemo(() => {
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => matchDoc(item, lowerQuery)),
      }))
      .filter((group) => group.items.length > 0)
  }, [groups, lowerQuery])

  const toggleGroup = (group: string) => {
    setCollapsedSet((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  return (
    <div className="docs-toc-list">
      <Input
        className="docs-toc-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="过滤文档..."
        allowClear
        aria-label="过滤文档目录"
      />
      {visibleGroups.length === 0 ? (
        <div className="docs-toc-empty">没有匹配的文档</div>
      ) : null}
      {visibleGroups.map((group) => {
        // 搜索时强制展开，否则看 collapsedSet。
        const collapsed = hasQuery ? false : collapsedSet.has(group.group)
        return (
          <div key={group.group} className="docs-toc-group">
            <button
              type="button"
              className="docs-toc-group-title"
              aria-expanded={!collapsed}
              aria-label={collapsed ? `展开 ${group.group} 分组` : `折叠 ${group.group} 分组`}
              onClick={() => toggleGroup(group.group)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                width: '100%',
                padding: '6px 10px 5px',
                border: 0,
                background: 'transparent',
                color: token.colorTextSecondary,
                fontSize: 12,
                fontWeight: 600,
                textAlign: 'start',
                cursor: 'pointer',
              }}
            >
              <CaretRightOutlined
                style={{
                  fontSize: 10,
                  transition: 'transform 0.15s',
                  transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                }}
              />
              <span>{group.group}</span>
            </button>
            {collapsed ? null : (
              <div className="docs-toc-group-items">
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
                  </a>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ArticleToc({ doc }: { doc: DocEntry }) {
  if (doc.sections.length === 0) return null
  return (
    <nav className="docs-article-toc-list" aria-label="本文内容">
      <div className="docs-article-toc-title">本文内容</div>
      {doc.sections.map((section) => (
        <a
          key={section.id}
          href={`#/docs/${doc.slug}`}
          onClick={(event) => {
            event.preventDefault()
            document.getElementById(section.id)?.scrollIntoView({ block: 'start' })
          }}
        >
          {section.title}
        </a>
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
  const groups = useMemo(() => groupDocs(docs), [])
  const docsBySlug = useMemo(() => new Map(docs.map((doc) => [doc.slug, doc])), [])
  const activeSlug = docAliases.get(section ?? '') ?? section ?? 'intro'
  const activeDoc = docsBySlug.get(activeSlug) ?? docsBySlug.get('intro')!
  const activeIndex = docs.findIndex((doc) => doc.slug === activeDoc.slug)
  const previousDoc = activeIndex > 0 ? docs[activeIndex - 1] : undefined
  const nextDoc = activeIndex >= 0 && activeIndex < docs.length - 1 ? docs[activeIndex + 1] : undefined

  const goDoc = useCallback(
    (slug: string) => {
      navigate(`/docs/${slug}`)
      onTocOpenChange(false)
    },
    [onTocOpenChange],
  )
  const onOpen = useCallback((action: DocsAction) => openDocsAction(action, goDoc), [goDoc])

  const docsStyle = {
    '--docs-text': token.colorText,
    '--docs-text-secondary': token.colorTextSecondary,
    '--docs-border': token.colorBorderSecondary,
    '--docs-fill': token.colorFillAlter,
    '--docs-code-bg': token.colorFillTertiary,
    '--docs-primary': token.colorPrimary,
    '--docs-primary-bg': token.colorPrimaryBg,
    '--docs-bg-container': token.colorBgContainer,
    // Mirror SplitDemo's `--compare-primary-text` so the `活对照` badge (and any
    // other docs element keyed off --docs-primary-text) stays legible on the
    // primary-colored background in both light and dark mode.
    '--docs-primary-text': token.colorTextLightSolid,
  } as CSSProperties

  // 面包屑分组级目标：同组第一个文档 slug。
  const groupEntrySlug = useMemo(() => {
    const sameGroup = docs.filter((d) => d.group === activeDoc.group)
    return sameGroup[0]?.slug ?? activeDoc.slug
  }, [activeDoc.group, activeDoc.slug])

  return (
    <div className="docs-layout" style={docsStyle}>
      <aside className="docs-toc" aria-label="文档目录">
        <DocsToc groups={groups} activeSlug={activeDoc.slug} onSelect={goDoc} />
      </aside>

      <div className="docs-main-shell">
        <main className="docs-content">
          <nav className="docs-breadcrumb" aria-label="breadcrumb">
            <a
              href="#/docs/intro"
              onClick={(event) => {
                event.preventDefault()
                goDoc('intro')
              }}
            >
              Docs
            </a>
            <span aria-hidden="true">/</span>
            <a
              href={`#/docs/${groupEntrySlug}`}
              onClick={(event) => {
                event.preventDefault()
                goDoc(groupEntrySlug)
              }}
            >
              {activeDoc.group}
            </a>
            <span aria-hidden="true">/</span>
            <a
              href={`#/docs/${activeDoc.slug}`}
              aria-current="page"
              onClick={(event) => {
                event.preventDefault()
                document.querySelector('.docs-article')?.scrollIntoView({ block: 'start' })
              }}
            >
              {activeDoc.title}
            </a>
          </nav>
          <DocArticle
            doc={activeDoc}
            previous={previousDoc}
            next={nextDoc}
            onNavigate={goDoc}
          >
            {activeDoc.render({ goDoc, onOpen })}
          </DocArticle>
        </main>

        <aside className="docs-article-toc" aria-label="本文内容">
          <ArticleToc doc={activeDoc} />
        </aside>
      </div>

      <Drawer
        title="文档目录"
        placement="left"
        open={tocOpen}
        onClose={() => onTocOpenChange(false)}
        size={300}
      >
        <div className="docs-drawer-toc">
          <DocsToc groups={groups} activeSlug={activeDoc.slug} onSelect={goDoc} />
        </div>
      </Drawer>
    </div>
  )
}
