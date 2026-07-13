/** docs 视图：网页化文档壳，内容由 src/docs 注册表驱动。 */

import { useCallback, useMemo } from 'react'
import type { CSSProperties } from 'react'
import { Drawer, theme } from 'antd'
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

function DocsToc({
  groups,
  activeSlug,
  onSelect,
}: {
  groups: DocGroup[]
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
            </a>
          ))}
        </div>
      ))}
    </nav>
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
  } as CSSProperties

  return (
    <div className="docs-layout" style={docsStyle}>
      <aside className="docs-toc" aria-label="文档目录">
        <DocsToc groups={groups} activeSlug={activeDoc.slug} onSelect={goDoc} />
      </aside>

      <div className="docs-main-shell">
        <main className="docs-content">
          <div className="docs-breadcrumb">
            <a
              href="#/docs/intro"
              onClick={(event) => {
                event.preventDefault()
                goDoc('intro')
              }}
            >
              Docs
            </a>
            <span>/</span>
            <span>{activeDoc.group}</span>
            <span>/</span>
            <span>{activeDoc.title}</span>
          </div>
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
