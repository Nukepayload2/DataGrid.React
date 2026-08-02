import { Tag, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import StickySummaryOffsetDg from './sticky-summary-offset.dg'
import StickySummaryOffsetAntd from './sticky-summary-offset.antd'

export default function StickySummaryOffsetDemo() {
  const { token } = theme.useToken()

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 48px)',
        padding: '32px 24px 96px',
        background: token.colorFillQuaternary,
      }}
    >
      <div
        style={{
          maxWidth: 1320,
          margin: '0 auto',
          padding: '32px 40px 48px',
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadius,
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <Tag color="blue">运营工单</Tag>
          <h1 style={{ margin: '12px 0 8px', fontSize: 28 }}>固定汇总栏避让底部操作栏</h1>
          <p style={{ margin: 0, color: token.colorTextSecondary, lineHeight: 1.8 }}>
            表格跟随页面滚动，底部批量操作栏始终可用；当前批次汇总保持在操作栏上方。
          </p>
        </div>

        <SplitDemo
          minPaneWidth={600}
          minPaneHeight={0}
          stickyMode
          virtualizable={false}
          left={<StickySummaryOffsetDg />}
          right={<StickySummaryOffsetAntd />}
        />
      </div>
    </div>
  )
}
