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
        eyebrow="表格"
        title="Table props"
        description="属性清单由 src/docs/generated/api.json 自动生成（extract-api.mjs 提取 TableProps 公开成员）。每条属性都带稳定锚点，可在页面内或外链深指。"
      >
        <ApiRefTable
          members={getApiMembers('table')}
          anchorPrefix="table-prop"
          onOpenDoc={(slug) => onOpen({ kind: 'doc', value: slug, label: slug })}
          description="data-grid 顶层 Table props（兼容 antd v6 TableProps 子集 + data-grid 专属 gridOptions 命名空间）。"
        />
      </DocSection>
      <DocSection
        id="table-ref"
        eyebrow="ref"
        title="TableRef"
        description="ref 句柄成员（由 api.json 自动生成）。与 antd Table ref.scrollTo 接口对齐，并额外暴露最外层根 DOM 节点。"
      >
        <ApiRefTable
          members={getApiMembers('tableRef')}
          anchorPrefix="table-ref"
          onOpenDoc={(slug) => onOpen({ kind: 'doc', value: slug, label: slug })}
          description="Table 实例 ref 暴露的方法与属性。scrollTo 仅在 virtual 模式下生效；非虚拟模式调用为 no-op。"
        />
      </DocSection>

      <DocSection id="static" eyebrow="静态属性" title="Table 静态入口">
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
