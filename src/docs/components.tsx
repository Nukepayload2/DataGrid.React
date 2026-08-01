import {
  Fragment,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'
import { Alert, Button, Spin, Tag, Typography } from 'antd'
import type { ColumnType, TableProps } from '../table'
import { Table as GridTable } from '../table'
import CodeView from '../CodeView'
import type { DocEntry, DocsAction } from './types'
import apiData from './generated/api.json'

const { Title, Paragraph, Text } = Typography

// #20：docs 区代码块接入 LiveEditor（与示例区同 sucrase 链路）。
// 懒加载避免把 sucrase/CodeMirror 拖进无 editable 块的文档页（绝大多数页面）。
// LiveErrorBoundary 是 named export，lazy 需 default 形态 → 适配一次。
const LiveEditor = lazy(() => import('../live/LiveEditor'))
const LiveErrorBoundary = lazy(() =>
  import('../live/LiveErrorBoundary').then((m) => ({ default: m.LiveErrorBoundary })),
)
const compileFn = () => import('../live/compile').then((m) => m.compile)
const evalModuleFn = () => import('../live/evalModule').then((m) => m.evalModule)

interface DocArticleProps {
  doc: DocEntry
  previous?: DocEntry
  next?: DocEntry
  onNavigate: (slug: string) => void
  children: ReactNode
}

interface DocSectionProps {
  id: string
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

  // Deep-link support: when a URL like `/docs/<slug>?anchor=<id>` is opened
  // (copied from PropertyName), scroll the matching element into view once
  // the article has mounted. The hash router ignores the query string, so we
  // own the scroll here.
  useEffect(() => {
    const anchorId = new URLSearchParams(window.location.search).get('anchor')
    if (!anchorId) return
    const el = document.getElementById(anchorId)
    if (el) {
      // Defer until after paint so the row is laid out.
      requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }))
    }
  }, [doc.slug])

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
  maxHeight,
  ariaLabel,
  editable = false,
  scope,
}: {
  code: string
  height?: number | string
  maxHeight?: number | string
  ariaLabel: string
  /** 开启后渲染 LiveEditor + 活预览，替代只读 CodeView。需要 scope 配合。 */
  editable?: boolean
  /** editable=true 时必需：require 注入表（通常用 src/docs/liveScope.ts 的 docsScope）。 */
  scope?: Record<string, unknown>
}) {
  // 默认行为不变：只读 CodeView + 复制按钮。
  if (!editable || !scope) {
    return <CodeView code={code} height={height} maxHeight={maxHeight ?? 360} ariaLabel={ariaLabel} />
  }
  return <EditableDocsCode code={code} scope={scope} ariaLabel={ariaLabel} />
}

/**
 * 可编辑 docs 代码块（#20）：活预览 + LiveEditor。
 *
 * - 挂载时异步 compile + evalModule 把初始代码跑起来（活预览零点击），失败显示 Alert。
 * - LiveEditor 三态 onApply：
 *   - 成功 (Comp, null)：预览切到 Comp。
 *   - 失败 (null, error)：预览清空、Alert 显示错误（LiveEditor 自身也显示）。
 *   - 重置 (null, null)：重新跑一次初始代码，回到挂载态预览。
 * - 渲染期错误由 LiveErrorBoundary 兜住（编译通过但运行时炸，比如读 null 字段），
 *   错误回灌到 bootError 通道复用同一展示位。
 */
function EditableDocsCode({
  code,
  scope,
  ariaLabel,
}: {
  code: string
  scope: Record<string, unknown>
  ariaLabel: string
}) {
  const [Comp, setComp] = useState<ComponentType<Record<string, unknown>> | null>(null)
  const [bootError, setBootError] = useState<string | null>(null)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  // 每次 seed/apply 增 1，用作 LiveErrorBoundary 的 key：
  // class 组件 hasError 状态跨 Apply 不会自清，必须 remount 才能恢复。
  const [runId, setRunId] = useState(0)

  // 编译 + 执行 code，把 default 导出组件灌进预览。挂载与重置共用此路径。
  const seed = useCallback(async () => {
    setBootError(null)
    setRuntimeError(null)
    setRunId((n) => n + 1)
    try {
      const [compile, evalModule] = await Promise.all([compileFn(), evalModuleFn()])
      const compiled = compile(code)
      if (!compiled.ok) {
        setComp(null)
        setBootError(compiled.error)
        return
      }
      const evaluated = evalModule(compiled.js, scope)
      if (!evaluated.ok) {
        setComp(null)
        setBootError(evaluated.error)
        return
      }
      // 组件本身是函数，必须用 updater 形式返回；直接 setComp(fn) 会被 React 当作
      // state updater 调用（fn(prev)），返回的 React 元素而非组件被存进 state，
      // 后续 <Comp/> 渲染会报 "Element type is invalid"。
      setComp(() => evaluated.Comp)
    } catch (e) {
      setComp(null)
      setBootError((e as Error)?.message ?? String(e))
    }
  }, [code, scope])

  useEffect(() => {
    void seed()
  }, [seed])

  return (
    <div className="docs-editable-code">
      <div className="docs-editable-preview">
        {bootError ? (
          <Alert
            type="error"
            showIcon
            message="初始编译失败"
            description={bootError}
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          />
        ) : runtimeError ? (
          <Alert
            type="error"
            showIcon
            message="预览运行时错误"
            description={runtimeError}
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          />
        ) : Comp ? (
          <Suspense fallback={<Text type="secondary">加载错误边界…</Text>}>
            <LiveErrorBoundary
              key={runId}
              onError={(msg) => {
                setRuntimeError(msg)
                setComp(null)
              }}
            >
              <Comp />
            </LiveErrorBoundary>
          </Suspense>
        ) : (
          <Spin size="small" />
        )}
      </div>

      <Suspense fallback={<Text type="secondary">加载编辑器…</Text>}>
        <LiveEditor
          initialCode={code}
          title={ariaLabel}
          scope={scope}
          onApply={(c, e) => {
            setRuntimeError(null)
            setRunId((n) => n + 1)
            if (c === null && e === null) {
              // 重置：重新跑初始代码。
              void seed()
            } else {
              // 同 seed：c 是组件函数，必须 updater 返回，避免被当 state updater 调用。
              setComp(() => c)
              setBootError(e)
            }
          }}
        />
      </Suspense>
    </div>
  )
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

// --- ApiRefTable (#14): consumes src/docs/generated/api.json -------------
//
// Design notes:
// - Dogfoods the real GridTable (via DocsDataGrid) to render API reference
//   tables — same path as the rest of the docs site.
// - Property name is rendered as an `<a>` with a stable `id` so other pages
//   can deep-link (e.g. `#/docs/table-api` + scrollIntoView by id).
// - All members of a namespace render in a single flat table. Escape-hatch
//   callbacks (advanced) are identified inline in their summary text rather
//   than via a separate marker column or visually-partitioned sub-section.
// - Summary is markdown-rendered with a hand-rolled minimal renderer
//   (no new deps). Subset: `**bold**`, `` `code` ``, `- list`, `[link](path)`,
//   ``` ``` fenced code. `docs/features/<category>/*.md` paths resolve to the
//   matching doc slug and become in-app links; other paths fall back to plain
//   text (we do not invent routes for unresolved targets).

export interface ApiMember {
  name: string
  kind: string
  signature: string
  type: string
  required: boolean
  advanced?: boolean
  deprecated?: string | boolean
  since?: string
  summary: string
  from?: string
  isTypeOnly?: boolean
}

type ApiDataSet = Record<string, ApiMember[]>

// Cast through `unknown`: the JSON inferred shape is a precise per-namespace
// union; we deliberately widen it to ApiMember[] so the renderer can treat
// every namespace uniformly.
const API_DATA = apiData as unknown as ApiDataSet

export function getApiMembers(namespace: string): ApiMember[] {
  return API_DATA[namespace] ?? []
}

// --- Minimal markdown subset ------------------------------------------------

interface MdInline {
  kind: 'text' | 'bold' | 'code' | 'link'
  text: string
  href?: string
}

const INLINE_MD_RE =
  /(\*\*[^*]+\*\*)|(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(\bdocs\/features\/[^\s)`,]+?\.md)/g

function parseInline(input: string): MdInline[] {
  const nodes: MdInline[] = []
  let lastIdx = 0
  for (const match of input.matchAll(INLINE_MD_RE)) {
    const idx = match.index ?? 0
    if (idx > lastIdx) {
      nodes.push({ kind: 'text', text: input.slice(lastIdx, idx) })
    }
    const token = match[0]
    if (token.startsWith('**')) {
      nodes.push({ kind: 'bold', text: token.slice(2, -2) })
    } else if (token.startsWith('`')) {
      nodes.push({ kind: 'code', text: token.slice(1, -1) })
    } else if (token.startsWith('docs/features/')) {
      // Bare path (not inside backticks or `[label](path)`): treat as a link
      // whose label IS the path; resolveDocLink maps it to an in-app slug.
      nodes.push({ kind: 'link', text: token, href: token })
    } else {
      const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
      if (m) nodes.push({ kind: 'link', text: m[1], href: m[2] })
    }
    lastIdx = idx + token.length
  }
  if (lastIdx < input.length) {
    nodes.push({ kind: 'text', text: input.slice(lastIdx) })
  }
  return nodes
}

/** Map repo-relative paths used inside JSDoc to in-app doc slugs. */
const FEATURES_CATEGORY_TO_SLUG: Record<string, string> = {
  // 4 个薄页已合并到 features：columns / display / layout / interaction / api。
  columns: 'features',
  display: 'features',
  layout: 'features',
  interaction: 'features',
  api: 'features',
  // 留独立的页（styling 修正：实际 slug 是 styling-and-theme）。
  scrolling: 'scrolling',
  styling: 'styling-and-theme',
}

function resolveDocLink(path: string): { kind: 'doc'; value: string } | null {
  // docs/features/<category>/*.md → doc slug（按 FEATURES_CATEGORY_TO_SLUG 映射；未列出的 category 原样作 slug fallback）。
  const features = path.match(/^docs\/features\/([^/]+)\//)
  if (features) {
    const category = features[1]
    const slug = FEATURES_CATEGORY_TO_SLUG[category] ?? category
    return { kind: 'doc', value: slug }
  }
  return null
}

function renderInlineNodes(
  nodes: MdInline[],
  onOpenDoc?: (slug: string) => void,
): ReactNode[] {
  return nodes.map((node, i) => {
    if (node.kind === 'bold') {
      return (
        <Text key={i} strong>
          {node.text}
        </Text>
      )
    }
    if (node.kind === 'code') {
      // Backticked doc paths (e.g. `详见 \`docs/features/scrolling/scrollbar.md\``)
      // get linkified in-place; other code stays as plain `<Text code>`.
      const codeTarget = resolveDocLink(node.text)
      if (codeTarget?.kind === 'doc') {
        return (
          <a
            key={i}
            href={`#/docs/${codeTarget.value}`}
            style={{ color: 'var(--docs-primary)' }}
            onClick={(event) => {
              event.preventDefault()
              onOpenDoc?.(codeTarget.value)
            }}
          >
            <Text code>{node.text}</Text>
          </a>
        )
      }
      return (
        <Text key={i} code>
          {node.text}
        </Text>
      )
    }
    if (node.kind === 'link') {
      const target = resolveDocLink(node.href ?? '')
      if (target?.kind === 'doc') {
        return (
          <a
            key={i}
            href={`#/docs/${target.value}`}
            style={{ color: 'var(--docs-primary)' }}
            onClick={(event) => {
              event.preventDefault()
              onOpenDoc?.(target.value)
            }}
          >
            {/* Bare doc paths render as code so they're visually distinct from
              prose links; `[label](path)` links render as plain text. */}
            {node.href && node.href === node.text ? (
              <Text code>{node.text}</Text>
            ) : (
              node.text
            )}
          </a>
        )
      }
      // Unresolved link target (no in-app route): render label as code so
      // the reader still sees the named concept without a broken jump.
      return (
        <Text key={i} code>
          {node.text}
        </Text>
      )
    }
    return <Fragment key={i}>{node.text}</Fragment>
  })
}

export function MarkdownSummary({
  summary,
  onOpenDoc,
}: {
  summary: string
  onOpenDoc?: (slug: string) => void
}) {
  if (!summary) {
    return (
      <Text type="secondary" italic>
        （无 JSDoc）
      </Text>
    )
  }
  const lines = summary.split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('```')) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing fence
      blocks.push(
        <pre
          key={key++}
          style={{
            margin: '6px 0',
            padding: '8px 10px',
            maxHeight: 240,
            overflow: 'auto',
            background: 'var(--docs-code-bg)',
            borderRadius: 4,
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <code>{codeLines.join('\n')}</code>
        </pre>,
      )
    } else if (line.trim().startsWith('- ')) {
      const items: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        items.push(lines[i].trim().slice(2))
        i++
      }
      blocks.push(
        <ul key={key++} className="docs-bullet-list" style={{ margin: '4px 0' }}>
          {items.map((item, j) => (
            <li key={j}>{renderInlineNodes(parseInline(item), onOpenDoc)}</li>
          ))}
        </ul>,
      )
    } else if (line.trim() === '') {
      i++
    } else {
      const paraLines: string[] = []
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !lines[i].startsWith('```') &&
        !lines[i].trim().startsWith('- ')
      ) {
        paraLines.push(lines[i])
        i++
      }
      blocks.push(
        <p key={key++} style={{ margin: '4px 0', lineHeight: 1.65 }}>
          {renderInlineNodes(parseInline(paraLines.join(' ')), onOpenDoc)}
        </p>,
      )
    }
  }
  return <div>{blocks}</div>
}

// --- Sub-cell renderers -----------------------------------------------------

function PropertyName({ anchorId, name }: { anchorId: string; name: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <a
      id={anchorId}
      href={`#${anchorId}`}
      title={copied ? '已复制锚点链接' : '点击复制锚点链接'}
      style={{ color: 'var(--docs-primary)', textDecoration: 'none' }}
      onClick={async (event) => {
        event.preventDefault()
        // Build a shareable deep link: keep the current route (hash-routing
        // owns `#/docs/<slug>`) and append the anchor id as a `?anchor=`
        // query param so the URL survives a paste-into-new-tab. DocArticle
        // consumes `?anchor=` on mount and scrolls.
        const url = new URL(window.location.href)
        url.searchParams.set('anchor', anchorId)
        try {
          await navigator.clipboard.writeText(url.toString())
          setCopied(true)
          setTimeout(() => setCopied(false), 1200)
        } catch {
          // Non-secure context or permission denied — silently fall back to
          // in-page scroll only; the tooltip still reads honestly.
        }
        // Hash routing owns `window.location.hash`; don't fight it — just
        // scroll the row into view (it is already visible, this is a no-op
        // most of the time, but keeps the click meaningful when used from
        // elsewhere via deep-link).
        document.getElementById(anchorId)?.scrollIntoView({ block: 'nearest' })
      }}
    >
      <Text code>{name}</Text>
    </a>
  )
}

function TypeSignature({ type }: { type: string }) {
  if (!type) return null
  const isLong = type.length > 80 || type.includes('\n')
  if (isLong) {
    return (
      <div style={{ maxHeight: 200, overflow: 'auto', maxWidth: '100%' }}>
        <pre
          className="docs-type-sig"
          style={{
            margin: 0,
            padding: '6px 10px',
            background: 'var(--docs-code-bg)',
            borderRadius: 4,
            fontSize: 12,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          <code>{type}</code>
        </pre>
      </div>
    )
  }
  return (
    <Text code>{type}</Text>
  )
}

function getCompactTypeDisplay(record: ApiMember): string {
  const type = record.type || record.signature
  const namePattern = record.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return type
    .replace(new RegExp(`^${namePattern}\\??:\\s*`), '')
    .replace(new RegExp(`^${namePattern}:\\s*`), '')
}

// --- Main component ---------------------------------------------------------

type ApiRefVariant = 'props' | 'exports'

export interface ApiRefTableProps {
  members: ApiMember[]
  /** Prefix for stable anchor ids (e.g. `table-prop`, `grid-options`, `export`). */
  anchorPrefix: string
  variant?: ApiRefVariant
  /** Compact layout merges name/type into one column so the summary column can breathe. */
  compact?: boolean
  /** Resolves in-app doc links inside summaries. */
  onOpenDoc?: (slug: string) => void
  /** Optional lede above the table. */
  description?: ReactNode
  /** Override the markdown description for specific members by name (layered
   *  on top of api.json summaries). Useful for re-exports that carry no JSDoc. */
  summaryOverrides?: Record<string, string>
}

export function ApiRefTable({
  members,
  anchorPrefix,
  variant = 'props',
  compact = false,
  onOpenDoc,
  description,
  summaryOverrides,
}: ApiRefTableProps) {
  const withOverrides = summaryOverrides
    ? members.map((m) =>
        summaryOverrides[m.name] ? { ...m, summary: summaryOverrides[m.name] } : m,
      )
    : members

  return (
    <div>
      {description ? (
        <Paragraph className="docs-table-description">{description}</Paragraph>
      ) : null}
      {withOverrides.length > 0 ? (
        <RefTable
          members={withOverrides}
          anchorPrefix={anchorPrefix}
          variant={variant}
          compact={compact}
          onOpenDoc={onOpenDoc}
        />
      ) : null}
    </div>
  )
}

interface RefTableProps {
  members: ApiMember[]
  anchorPrefix: string
  variant: ApiRefVariant
  compact: boolean
  onOpenDoc?: (slug: string) => void
}

function RefTable({ members, anchorPrefix, variant, compact, onOpenDoc }: RefTableProps) {
  if (variant === 'exports') {
    return (
      <DocsDataGrid<ApiMember>
        columns={[
          {
            title: '名称',
            dataIndex: 'name',
            key: 'name',
            width: 240,
            render: (_value, record) => (
              <PropertyName anchorId={`${anchorPrefix}-${record.name}`} name={record.name} />
            ),
          },
          {
            title: '描述',
            dataIndex: 'summary',
            key: 'summary',
            render: (_value, record) => (
              <MarkdownSummary summary={record.summary} onOpenDoc={onOpenDoc} />
            ),
          },
        ]}
        dataSource={members}
        rowKey="name"
      />
    )
  }
  if (compact) {
    return (
      <DocsDataGrid<ApiMember>
        columns={[
          {
            title: '属性 / 类型',
            dataIndex: 'name',
            key: 'name',
            width: 260,
            render: (_value, record) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <PropertyName
                  anchorId={`${anchorPrefix}-${record.name}`}
                  name={record.name}
                />
                <TypeSignature type={getCompactTypeDisplay(record)} />
              </div>
            ),
          },
          {
            title: '描述',
            dataIndex: 'summary',
            key: 'summary',
            render: (_value, record) => (
              <MarkdownSummary summary={record.summary} onOpenDoc={onOpenDoc} />
            ),
          },
        ]}
        dataSource={members}
        rowKey="name"
        scrollX={1180}
      />
    )
  }
  return (
    <DocsDataGrid<ApiMember>
      columns={[
        {
          title: '属性',
          dataIndex: 'name',
          key: 'name',
          width: 200,
          render: (_value, record) => (
            <PropertyName anchorId={`${anchorPrefix}-${record.name}`} name={record.name} />
          ),
        },
        {
          title: '类型 / 签名',
          dataIndex: 'type',
          key: 'type',
          width: 300,
          render: (value) => <TypeSignature type={value} />,
        },
        {
          title: '描述',
          dataIndex: 'summary',
          key: 'summary',
          render: (_value, record) => (
            <MarkdownSummary summary={record.summary} onOpenDoc={onOpenDoc} />
          ),
        },
      ]}
      dataSource={members}
      rowKey="name"
      scrollX={1180}
    />
  )
}
