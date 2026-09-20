import { Typography } from 'antd'
import {
  DocSection,
  DocsActionList,
  DocsCode,
  DocsNote,
} from '../components'
import type { DocsPageContext } from '../types'

const { Text } = Typography

const SCROLL_Y_CODE = `<section className="table-pane">
  {/* .table-pane 由页面布局分配剩余空间，例如 flex: 1; min-height: 0。 */}
  <Table
    columns={columns}
    dataSource={data}
    rowKey="id"
    scroll={{ y: true }}
  />
</section>`

export function renderScrolling({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection
        id="overview"
        title="滚动能力分两层"
        description="常规 scroll={{ x, y }} 覆盖大部分场景；超大数据量时再启用 virtual，需要在 DOM 层复用节点时切到 recycling 虚拟化。"
      >
        <p>所有滚动路径都要求父容器给出明确的可用高度，表格不会替业务算高度。</p>
      </DocSection>

      <DocSection
        id="scroll-y"
        title="scroll.y 只接受 true"
        description="data-grid 把 scroll.y 定义为数据区域模式开关，不接受 antd 的 number / string 滚动区域高度语义。"
      >
        <DocsCode code={SCROLL_Y_CODE} height={220} ariaLabel="scroll.y 示例代码" />
        <DocsNote title="高度由父容器提供">
          表格会占满父容器分配给它的可用空间；把父级做成自适应剩余空间的布局（例如 <Text code>flex: 1</Text> + <Text code>min-height: 0</Text>），再传 <Text code>{'scroll={{ y: true }}'}</Text>。原先用 resize 监听手算高度再塞回 Table 的代码可以整条删掉。
        </DocsNote>
      </DocSection>

      <DocSection id="demos" title="滚动相关 demo">
        <DocsActionList
          actions={[
            { label: '虚拟列表 demo', kind: 'path', value: '/demos/virtual-list' },
            { label: 'DOM 复用 demo', kind: 'path', value: '/demos/dom-recycled-virtual-list' },
            { label: '固定表头 demo', kind: 'path', value: '/demos/fixed-header' },
            { label: '页面级 sticky demo', kind: 'path', value: '/demos/page-sticky-header' },
            { label: 'sticky summary 避让操作栏 demo', kind: 'path', value: '/demos/sticky-summary-offset' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}
