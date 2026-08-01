import { Typography } from 'antd'
import {
  ApiRefTable,
  DocSection,
  DocsActionList,
  getApiMembers,
} from '../components'
import type { DocsPageContext } from '../types'

const { Text } = Typography

export function renderTableApi({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection
        id="table-props"
        title="Table props"
        description="本页列出 Table 可用 props。每条属性都带稳定锚点，可在页内定位、也可从外部深链过来。"
      >
        <ApiRefTable
          members={getApiMembers('table')}
          anchorPrefix="table-prop"
          compact
          onOpenDoc={(slug) => onOpen({ kind: 'doc', value: slug, label: slug })}
          description="data-grid 顶层 Table props（兼容 antd v6 TableProps 子集 + data-grid 专属 gridOptions 命名空间）。"
        />
      </DocSection>
      <DocSection
        id="table-ref"
        title="TableRef"
        description="ref 句柄成员。与 antd Table ref.scrollTo 接口对齐，并额外暴露根节点。"
      >
        <ApiRefTable
          members={getApiMembers('tableRef')}
          anchorPrefix="table-ref"
          compact
          onOpenDoc={(slug) => onOpen({ kind: 'doc', value: slug, label: slug })}
          description="Table 实例 ref 暴露的方法与属性。scrollTo 仅在 virtual 模式下生效；非虚拟模式调用为 no-op。"
        />
      </DocSection>

      <DocSection id="static" title="Table 静态入口">
        <ul className="docs-bullet-list">
          <li><Text code>Table.Column</Text> / <Text code>Table.ColumnGroup</Text></li>
          <li><Text code>Table.EXPAND_COLUMN</Text> / <Text code>Table.SELECTION_COLUMN</Text></li>
          <li><Text code>Table.Summary</Text> / <Text code>Table.Summary.Row</Text> / <Text code>Table.Summary.Cell</Text></li>
          <li><Text code>Table.SELECTION_ALL</Text> / <Text code>Table.SELECTION_INVERT</Text> / <Text code>Table.SELECTION_NONE</Text></li>
        </ul>
        <DocsActionList
          actions={[
            { label: '看公开导出清单', kind: 'doc', value: 'public-api' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}
