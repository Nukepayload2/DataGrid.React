import {
  DocSection,
  DocsActionList,
  DocsDataGrid,
  DocsNote,
} from '../components'
import type { DocsPageContext } from '../types'

interface CompatRow {
  key: string
  api: string
  status: string
  detail: string
}

const compatRows: CompatRow[] = [
  { key: 'base', api: 'dataSource / columns / rowKey', status: '完全兼容', detail: '基础数据、列定义和行 key 维持 antd 使用习惯。' },
  { key: 'selection', api: 'rowSelection', status: '部分兼容', detail: '常用选择、受控键、自定义选择项和 renderCell 已覆盖；DOM 形态存在适配差异。具体过时成员（如 onSelectMultiple）见过时成员页。' },
  { key: 'expandable', api: 'expandable', status: '部分兼容', detail: '展开行、默认展开和 expandRowByClick 已覆盖；columnTitle / fixed 仍是 backlog；expandedRowOffset 见过时成员页。' },
  { key: 'scroll', api: 'scroll', status: '部分兼容', detail: 'x 支持常用形态；y 只接受 true（数据区域模式，高度由父容器驱动）。详见 #/docs/scroll-y。' },
  { key: 'components', api: 'components', status: '部分兼容', detail: '支持 body.cell、body.row；header.cell、wrapper / table 级替换不是当前公开能力。落点差异见 Semantic DOM 页。' },
  { key: 'locale', api: 'locale', status: '部分兼容', detail: '表体空态、筛选下拉、选择菜单、排序和展开文案已接入 antd locale 链路；filterCheckall 兼容别名见过时成员页。' },
  { key: 'sticky', api: 'sticky', status: '部分兼容', detail: '表头吸顶与 offsetHeader 已支持；offsetSummary 仍是 backlog。' },
  { key: 'summary', api: 'Table.Summary', status: '完全兼容', detail: '以 Table.Summary 容器 + Row + Cell 三段组合声明汇总栏（与 antd v6 对齐）。' },
  { key: 'pagination', api: 'pagination', status: '完全兼容', detail: '复用 antd Pagination 组件，props 直接透传。' },
  { key: 'size', api: 'size', status: '部分兼容', detail: '合法取值 large / middle / medium / small / compact；缺省视觉等价 large（与 antd v6 默认一致）。middle ≡ medium、compact ≡ small 视觉等价；antd v3 旧名 default 不支持。' },
]

export function renderCompatMatrix({ onOpen }: DocsPageContext) {
  return (
    <DocSection
      id="matrix"
      eyebrow="参考"
      title="兼容状态摘要"
      description="每个 API 领域一行：一眼看清完全 / 部分 / 未暴露。本页只讲领域级状态，具体过时成员的迁移动作不在这里展开——见过时成员页。"
    >
      <DocsDataGrid<CompatRow>
        columns={[
          { title: 'API', dataIndex: 'api', key: 'api', width: '26%' },
          { title: '支持度', dataIndex: 'status', key: 'status', width: '18%' },
          { title: '说明', dataIndex: 'detail', key: 'detail', width: '56%' },
        ]}
        dataSource={compatRows}
        rowKey="key"
      />
      <DocsNote title="本页与过时成员页的分工">
        本页回答「某个 API 领域整体兼容到什么程度」；过时 antd Table 成员页回答「具体某个 deprecated 成员怎么改」。同一主题不在两页重复展开——遇到部分兼容时，按上方说明里的指引跳到对应细节页。
      </DocsNote>
      <div style={{ marginTop: 16 }}>
        <DocsActionList
          actions={[
            { label: '具体过时成员迁移动作', kind: 'doc', value: 'deprecated-antd-members' },
            { label: 'Semantic DOM 槽位落点', kind: 'doc', value: 'semantic-dom' },
            { label: 'scroll.y 语义', kind: 'doc', value: 'scroll-y' },
          ]}
          onOpen={onOpen}
        />
      </div>
    </DocSection>
  )
}
