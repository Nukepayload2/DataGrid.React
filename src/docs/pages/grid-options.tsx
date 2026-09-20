import { Typography } from 'antd'
import {
  ApiRefTable,
  DocSection,
  DocsCode,
  DocsNote,
  getApiMembers,
} from '../components'
import type { DocsPageContext } from '../types'
import { GRID_OPTIONS_CODE } from './shared'

const { Text } = Typography

const RECYCLING_CODE = `<Table
  columns={columns}
  dataSource={rows}
  rowKey="id"
  virtual
  scroll={{ y: true, x: 1200 }}
  gridOptions={{
    rowHeight: 48,
    virtualizationMode: 'recycling',
  }}
/>`

const GRID_COLUMN_OPTIONS_CODE = `const columns: ColumnType<Row>[] = [
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    gridColumnOptions: {
      renderCellReact: (params, slot) => (
        <StatusBadge key={slot.key} value={params.value} />
      ),
    },
  },
]`

export function renderGridOptions({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection
        id="namespace"
        title="data-grid 专属能力归到 gridOptions"
        description="这些能力不是 antd Table 兼容 API 的一部分，放入 gridOptions 可以避免和兼容 API 混淆。"
      >
        <DocsCode code={GRID_OPTIONS_CODE} height={260} ariaLabel="gridOptions 示例代码" />
      </DocSection>
      <DocSection id="examples" title="gridOptions 成员">
        <ApiRefTable
          members={getApiMembers('gridOptions')}
          anchorPrefix="grid-options"
          onOpenDoc={(slug) => onOpen({ kind: 'doc', value: slug, label: slug })}
          description="表级专属能力（行高模型 / 列宽拖拽 / 悬浮滚动条 / 原生选择 / 行列拖拽 / 虚拟化模式）。"
        />
      </DocSection>
      <DocSection id="selection" title="gridOptions.selection">
        <ApiRefTable
          members={getApiMembers('selection')}
          anchorPrefix="grid-selection"
          onOpenDoc={(slug) => onOpen({ kind: 'doc', value: slug, label: slug })}
          description="data-grid 原生行选择配置（优先级高于 antd rowSelection）。"
        />
      </DocSection>
      <DocSection id="virtualization-mode" title="VirtualizationMode">
        <ApiRefTable
          members={getApiMembers('virtualizationMode')}
          anchorPrefix="virtualization-mode"
          onOpenDoc={(slug) => onOpen({ kind: 'doc', value: slug, label: slug })}
          description="虚拟渲染模式枚举（`standard` 默认 / `recycling` DOM 复用路径）。"
        />
      </DocSection>
      <DocSection id="column-options" title="gridColumnOptions">
        <ApiRefTable
          members={getApiMembers('gridColumnOptions')}
          anchorPrefix="grid-column-options"
          onOpenDoc={(slug) => onOpen({ kind: 'doc', value: slug, label: slug })}
          description="data-grid 列级专属能力（拖拽锁定与 recycling 自定义渲染回调）。"
        />
        <DocsCode code={GRID_COLUMN_OPTIONS_CODE} height={300} ariaLabel="gridColumnOptions 示例代码" />
      </DocSection>
      <DocSection id="recycling" title="recycling 渲染模式">
        <DocsNote title="使用条件">
          <Text code>virtualizationMode: 'recycling'</Text> 只在 <Text code>virtual</Text> 与
          <Text code>{'scroll={{ y: true }}'}</Text>（详见{' '}
          <a href="#/docs/scrolling">scroll.y 语义</a>）同时启用时生效。一般场景用默认
          <Text code>standard</Text>，只有超大表格或需要在 DOM 层做深度集成时才考虑 recycling。
        </DocsNote>
        <DocsCode code={RECYCLING_CODE} height={260} ariaLabel="recycling 虚拟化示例代码" />
      </DocSection>
    </>
  )
}
