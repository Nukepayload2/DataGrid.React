import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Space, Switch, Tag, theme } from 'antd'
import type { ScrollBarFoldMode } from '../table'
import StickyDg from './page-sticky-header.dg'
import StickyAntd from './page-sticky-header.antd'

function SectionTitle({
  children,
  kicker,
}: {
  children: ReactNode
  kicker: string
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          color: 'inherit',
          opacity: 0.45,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 0,
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {kicker}
      </div>
      <h2 style={{ margin: 0, fontSize: 22, lineHeight: 1.35 }}>
        {children}
      </h2>
    </div>
  )
}

export default function StickyDemo() {
  const { token } = theme.useToken()
  const [showOnTableHover, setShowOnTableHover] = useState(true)
  const [expandOnHover, setExpandOnHover] = useState(true)
  const scrollBarFoldMode = useMemo<ScrollBarFoldMode>(
    () => ({ showOnTableHover, expandOnHover }),
    [showOnTableHover, expandOnHover],
  )

  const pageStyle: CSSProperties = {
    margin: -24,
    padding: '32px 24px 64px',
    background: token.colorFillQuaternary,
  }

  const articleStyle: CSSProperties = {
    maxWidth: 1180,
    margin: '0 auto',
    padding: '40px 48px 64px',
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadius,
    color: token.colorText,
  }

  const paragraphStyle: CSSProperties = {
    margin: '0 0 12px',
    color: token.colorTextSecondary,
    fontSize: 14,
    lineHeight: 1.8,
  }

  const dividerStyle: CSSProperties = {
    height: 1,
    margin: '40px 0',
    background: token.colorBorderSecondary,
  }

  const controlBarStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
    alignItems: 'center',
    margin: '12px 0 16px',
    padding: '10px 12px',
    background: token.colorFillQuaternary,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadius,
  }

  return (
    <div style={pageStyle}>
      <article style={articleStyle}>
        <header style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <Tag color="blue">Controls review</Tag>
            <Tag>Document flow</Tag>
            <Tag>External scroll</Tag>
          </div>
          <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.25 }}>
            Sticky table headers in a long workspace document
          </h1>
          <p style={{ ...paragraphStyle, marginTop: 16, maxWidth: 860 }}>
            This page mimics a team review note: narrative text, long tables, and follow-up
            sections all live in the same scroll container. The tables do not create their
            own vertical scroll areas; the app content scrolls as one document.
          </p>
        </header>

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 20 }}>Context</h2>
          <p style={paragraphStyle}>
            Product, support, and compliance teams often review table-heavy pages inside a
            document workspace. The sticky header needs to remain useful while the reader
            moves through the rows and adjacent narrative sections, instead of being trapped
            inside a fixed-height table viewport.
          </p>
          <p style={paragraphStyle}>
            The first table uses data-grid page-level sticky mode. The second table keeps the
            same document structure with antd for comparison.
          </p>
        </section>

        <section>
          <SectionTitle kicker="Data grid">
            Quarterly controls register
          </SectionTitle>
          <p style={paragraphStyle}>
            The table below is part of the article flow. Its header hangs against the app
            content viewport while the surrounding document continues to scroll.
          </p>
          <div style={controlBarStyle}>
            <span style={{ color: token.colorTextSecondary, fontSize: 13 }}>
              gridOptions.scrollBarFoldMode
            </span>
            <Space wrap>
              <Switch
                checkedChildren="showOnTableHover"
                unCheckedChildren="showOnTableHover"
                checked={showOnTableHover}
                onChange={setShowOnTableHover}
              />
              <Switch
                checkedChildren="expandOnHover"
                unCheckedChildren="expandOnHover"
                checked={expandOnHover}
                onChange={setExpandOnHover}
              />
            </Space>
          </div>
          <StickyDg scrollBarFoldMode={scrollBarFoldMode} />
        </section>

        <div style={dividerStyle} />

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 20 }}>Review notes</h2>
          <p style={paragraphStyle}>
            Teams add notes between tables after each review pass. In a real document this
            region might contain decisions, linked tickets, exceptions, and follow-up owners.
            Keeping the table in the outer scroll flow makes the sticky header behave like a
            document affordance instead of a widget affordance.
          </p>
          <p style={paragraphStyle}>
            The content between the two tables is intentionally in the same flow so the
            transition from one sticky table region to the next is visible when scrolling.
          </p>
        </section>

        <section>
          <SectionTitle kicker="Ant Design">
            Reference table in the same document
          </SectionTitle>
          <p style={paragraphStyle}>
            This reference table uses the same rows, columns, and external vertical scroll
            pattern. It is stacked below the data-grid table rather than placed in a separate
            pane.
          </p>
          <StickyAntd />
        </section>
      </article>
    </div>
  )
}
