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
      <DocSection id="overview" eyebrow="指南" title="样式和主题">
        <p>
          全局主题走 antd <Text code>ConfigProvider</Text> 的 Table token，data-grid 复用整套 token 并把 CSS 变量映射到单元格、表头、边框等视觉模块。局部结构差异通过 <Text code>classNames</Text> / <Text code>styles</Text> 的语义槽位覆盖。
        </p>
        <p>
          槽位落点与 a11y 兼容状态见 Semantic DOM 页；主题编辑器在顶栏 Modal，可实时预览 token 改动。
        </p>
      </DocSection>
      <DocSection
        id="theme-code"
        eyebrow="代码"
        title="ConfigProvider token"
        description="ConfigProvider token 是 antd 主题系统的设计令牌（design token），通过 `<ConfigProvider theme={{ token: {...} }}>` 注入；data-grid 复用同一套 token 以保持视觉一致。"
      >
        <DocsCode code={THEMING_CODE} height={300} ariaLabel="主题代码" />
      </DocSection>
      <DocSection id="demos" eyebrow="对照" title="优先查看的 demo">
        <DocsActionList
          actions={[
            { label: 'Semantic DOM 文档', kind: 'doc', value: 'semantic-dom' },
            { label: '组件主题令牌 demo', kind: 'path', value: '/demos/component-theme-tokens' },
            { label: '语义化样式 demo', kind: 'path', value: '/demos/semantic-styling' },
            { label: '语义化 DOM 插槽 demo', kind: 'path', value: '/demos/semantic-dom-slots' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
      <DocSection id="references" eyebrow="交叉参考" title="相关文档">
        <DocsActionList
          actions={[
            { label: 'Semantic DOM 槽位矩阵', kind: 'doc', value: 'semantic-dom' },
            { label: 'Table API', kind: 'doc', value: 'table-api' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}
