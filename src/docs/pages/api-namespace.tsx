import { Typography } from 'antd'
import {
  DocSection,
  DocsActionList,
  DocsCode,
  DocsNote,
} from '../components'
import type { DocsPageContext } from '../types'
import { GRID_OPTIONS_CODE } from './shared'

const { Text } = Typography

export function renderApiNamespace({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection
        id="compatible"
        eyebrow="分工"
        title="兼容 API 留顶层，专属能力进命名空间"
        description="data-grid 的 API 表面分为两层：可迁移的 antd Table 能力留在顶层 Table props / Column props，data-grid 独有的能力（行高模型、列宽拖拽、原生选择、行/列拖拽排序、recycling 虚拟化）统一进入 gridOptions 与 gridColumnOptions 命名空间。这样 antd 用户能直接复用熟悉的字段，新能力也不会污染兼容层。"
      >
        <DocsNote title="判定规则">
          <ul className="docs-bullet-list">
            <li>
              <Text code>TableProps.*</Text> / <Text code>ColumnType.*</Text>：与 antd v6 同名同义的字段（columns、dataSource、rowKey、rowSelection、expandable、pagination、scroll、sorter、filters、components、classNames、styles、sticky、onRow、onHeaderRow、rowClassName、loading、bordered、size 等）。
            </li>
            <li>
              <Text code>gridOptions.*</Text>：表级专属能力 — 行高模型、列宽拖拽、悬浮滚动条策略、原生选择、行/列拖拽排序、虚拟化模式。
            </li>
            <li>
              <Text code>column.gridColumnOptions.*</Text>：列级专属能力 — 列拖拽锁定与 recycling 虚拟化的逃逸舱（escape-hatch）回调。
            </li>
          </ul>
        </DocsNote>
        <DocsCode code={GRID_OPTIONS_CODE} height={260} ariaLabel="gridOptions 示例代码" />
      </DocSection>
      <DocSection id="native" eyebrow="参考入口" title="去看完整清单">
        <p>
          命名空间成员的字段、类型、签名、默认值与详细语义在参考页统一维护，不在本概念页重复罗列。
        </p>
        <DocsActionList
          actions={[
            { label: 'Table API 参考页', kind: 'doc', value: 'table-api' },
            { label: 'Column API 参考页', kind: 'doc', value: 'column-api' },
            { label: 'gridOptions / gridColumnOptions 参考页', kind: 'doc', value: 'grid-options' },
            { label: '公开导出清单', kind: 'doc', value: 'public-api' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}
