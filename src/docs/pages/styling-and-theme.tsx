import { Typography } from 'antd'
import {
  DocSection,
  DocsActionList,
  DocsCode,
} from '../components'
import type { DocsPageContext } from '../types'

const { Text } = Typography

const THEMING_CODE = `import { ConfigProvider } from 'antd'
import { Table } from '@nukepayload2/data-grid'

export default function App() {
  return (
    <ConfigProvider
      theme={{
        components: {
          Table: {
            headerBg: '#f5f8ff',
          },
        },
      }}
    >
      <Table columns={columns} dataSource={data} rowKey="key" />
    </ConfigProvider>
  )
}`

export function renderStyling({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection id="overview" title="样式和主题">
        <p>
          全局主题通过 antd <Text code>ConfigProvider</Text> 的 Table 令牌配置，data-grid 复用同一套令牌，并把 CSS 变量映射到单元格、表头、边框等部位。局部结构差异通过 <Text code>classNames</Text> / <Text code>styles</Text> 的语义化样式入口覆盖。
        </p>
        <p>
          可替换的组件位置与 a11y 兼容状态见 Semantic DOM 页；主题编辑器在顶栏弹窗，可实时预览令牌修改效果。
        </p>
      </DocSection>
      <DocSection
        id="theme-code"
        title="ConfigProvider token"
        description="ConfigProvider token（主题令牌）是 antd 主题系统的设计令牌，通过 `<ConfigProvider theme={{ token: {...} }}>` 注入；data-grid 复用同一套令牌以保持视觉一致性。"
      >
        <DocsCode code={THEMING_CODE} height={300} ariaLabel="主题代码" />
      </DocSection>
      <DocSection id="demos" title="优先查看的 demo">
        <DocsActionList
          actions={[
            { label: '组件主题令牌 demo', kind: 'path', value: '/demos/component-theme-tokens' },
            { label: '语义化样式 demo', kind: 'path', value: '/demos/semantic-styling' },
            { label: 'Semantic DOM 槽位 demo', kind: 'path', value: '/demos/semantic-dom-slots' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}
