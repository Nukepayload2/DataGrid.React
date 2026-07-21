import { Typography } from 'antd'
import {
  DocSection,
  DocsCode,
  DocsNote,
} from '../components'

const { Text } = Typography

const VIRTUAL_SCROLLING_CODE = `<section className="table-pane">
  {/* .table-pane 由页面布局分配剩余空间，例如 flex: 1; min-height: 0。 */}
  <Table
    columns={columns}
    dataSource={data}
    rowKey="id"
    scroll={{ x: 1200, y: true }}
    virtual
  />
</section>`

export function renderScrollY() {
  return (
    <>
      <DocSection
        id="meaning"
        eyebrow="语义"
        title="scroll.y 只接受 true"
        description="data-grid 把 scroll.y 定义为数据区域模式，而不是 antd 的 max-height 数字语义。"
      >
        <DocsCode code={VIRTUAL_SCROLLING_CODE} height={220} ariaLabel="scroll.y 示例代码" />
      </DocSection>
      <DocSection id="layout" eyebrow="布局" title="高度由父容器提供">
        <DocsNote title="实践规则">
          表格会占满父容器分配给它的可用空间；把父级做成自适应剩余空间的布局，再传 <Text code>{'scroll={{ y: true }}'}</Text>。
        </DocsNote>
      </DocSection>
    </>
  )
}
