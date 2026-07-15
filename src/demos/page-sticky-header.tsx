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
            <Tag color="blue">管控评审</Tag>
            <Tag>文档流</Tag>
            <Tag>外部滚动</Tag>
          </div>
          <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.25 }}>
            长篇工作区文档中的粘性表头
          </h1>
          <p style={{ ...paragraphStyle, marginTop: 16, maxWidth: 860 }}>
            本页模拟团队评审记录：说明文字、长表格和后续章节都位于同一个滚动容器中。
            表格不会创建自己的垂直滚动区域；应用内容会作为一篇文档整体滚动。
          </p>
        </header>

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 20 }}>背景</h2>
          <p style={paragraphStyle}>
            产品、支持和合规团队经常在文档工作区中评审表格密集的页面。
            读者浏览行数据和相邻说明章节时，粘性表头需要持续可用，而不是被限制在固定高度的表格视口内。
          </p>
          <p style={paragraphStyle}>
            第一张表使用 data-grid 的页面级粘性模式。第二张表保留相同的文档结构，并使用 antd 作为对照。
          </p>
        </section>

        <section>
          <SectionTitle kicker="Data grid">
            季度管控登记表
          </SectionTitle>
          <p style={paragraphStyle}>
            下方表格是文章内容流的一部分。周围文档继续滚动时，它的表头会贴附在应用内容视口上。
          </p>
          <div style={controlBarStyle}>
            <span style={{ color: token.colorTextSecondary, fontSize: 13 }}>
              gridOptions.scrollBarFoldMode
            </span>
            <Space wrap>
              <Switch
                checkedChildren="表格悬停显示"
                unCheckedChildren="表格悬停显示"
                checked={showOnTableHover}
                onChange={setShowOnTableHover}
              />
              <Switch
                checkedChildren="悬停展开"
                unCheckedChildren="悬停展开"
                checked={expandOnHover}
                onChange={setExpandOnHover}
              />
            </Space>
          </div>
          <StickyDg scrollBarFoldMode={scrollBarFoldMode} />
        </section>

        <div style={dividerStyle} />

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 20 }}>评审备注</h2>
          <p style={paragraphStyle}>
            团队会在每轮评审后在表格之间补充备注。在真实文档中，这个区域可能包含决策、
            关联工单、例外事项和后续负责人。将表格保留在外层滚动流中，可以让粘性表头更像文档能力，
            而不是单个组件能力。
          </p>
          <p style={paragraphStyle}>
            两张表之间的内容刻意放在同一个流中，因此滚动时可以看到一个粘性表格区域切换到下一个区域的过程。
          </p>
        </section>

        <section>
          <SectionTitle kicker="Ant Design">
            同一文档中的参考表格
          </SectionTitle>
          <p style={paragraphStyle}>
            这张参考表使用相同的行、列和外部垂直滚动模式。它堆叠在 data-grid 表格下方，
            而不是放在单独面板中。
          </p>
          <StickyAntd />
        </section>
      </article>
    </div>
  )
}
