import { Typography } from 'antd'
import {
  DocSection,
  DocsActionList,
} from '../components'
import type { DocsPageContext } from '../types'

const { Text } = Typography

export function renderScrolling({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection id="overview" title="滚动和虚拟化">
        <p>
          滚动能力分两层：常规 <Text code>{'scroll={{ x, y }}'}</Text> 覆盖大部分场景；超大数据量时再启用 <Text code>virtual</Text>，需要 DOM 复用再切到 <Text code>recycling</Text> 虚拟化。所有路径都要求父容器有明确高度。
        </p>
        <p>
          <Text code>scroll.y</Text> 只接受 <Text code>true</Text>（数据区域模式，高度由父容器驱动，不接受 antd 的 number/string max-height）。详见{' '}
          <a href="#/docs/scroll-y">scroll.y 语义页</a>。
        </p>
      </DocSection>
      <DocSection id="demos" title="优先查看的 demo">
        <DocsActionList
          actions={[
            { label: '虚拟列表 demo', kind: 'path', value: '/demos/virtual-list' },
            { label: 'DOM 复用 demo', kind: 'path', value: '/demos/dom-recycled-virtual-list' },
            { label: '页面级 sticky demo', kind: 'path', value: '/demos/page-sticky-header' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
      <DocSection id="references" title="相关文档">
        <DocsActionList
          actions={[
            { label: 'scroll.y 语义', kind: 'doc', value: 'scroll-y' },
            { label: 'gridOptions（VirtualizationMode）', kind: 'doc', value: 'grid-options' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}
