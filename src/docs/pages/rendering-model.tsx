import { Typography } from 'antd'
import {
  DocSection,
  DocsNote,
} from '../components'

const { Text } = Typography

export function renderRenderingModel() {
  return (
    <>
      <DocSection id="css-grid" title="CSS Grid 是核心结构">
        <p>data-grid 不是包装原生 table，而是用 CSS Grid 明确管理列轨道、行轨道、固定列和合并单元格。这样可以在固定列、虚拟滚动和动态行高之间保持同一套布局模型。</p>
      </DocSection>
      <DocSection id="dom" title="DOM 形态与 antd 不完全相同">
        <DocsNote title="迁移影响">
          行和单元格相关定制优先用 <Text code>onRow</Text>、<Text code>onCell</Text>、<Text code>components</Text>、<Text code>classNames</Text> 和 <Text code>styles</Text>，不要依赖固定的 table/tr/td 层级。
        </DocsNote>
      </DocSection>
    </>
  )
}
