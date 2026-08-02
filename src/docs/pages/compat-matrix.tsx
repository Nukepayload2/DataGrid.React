import {
  DocSection,
  DocsActionList,
  DocsDataGrid,
} from '../components'
import type { DocsPageContext } from '../types'
import { DeprecatedMembersTable } from './deprecated-antd-members'

interface CompatRow {
  key: string
  api: string
  status: string
  detail: string
}

const compatRows: CompatRow[] = [
  { key: 'base', api: 'dataSource / columns / rowKey', status: '完全兼容', detail: '基础数据、列定义和行 key 沿用 antd 使用习惯。' },
  { key: 'selection', api: 'rowSelection', status: '部分兼容', detail: '常用选择、受控键、自定义选择项和 renderCell 已覆盖；自定义样式和事件绑定的位置与 antd 略有差异。过时成员 onSelectMultiple 的处理见下方特例。' },
  { key: 'expandable', api: 'expandable', status: '部分兼容', detail: '展开行、默认展开、expandRowByClick、columnTitle、fixed 已覆盖；expandedRowOffset 的处理见下方特例。' },
  { key: 'scroll', api: 'scroll', status: '部分兼容', detail: 'x 支持常用形态；y 只接受 true（数据区域模式，高度由父容器驱动）。详见 #/docs/scroll-y。' },
  { key: 'components', api: 'components', status: '部分兼容', detail: '支持 body.cell、body.row；header.cell、wrapper / table 级替换暂未开放。可替换的组件位置见 Semantic DOM 页。' },
  { key: 'locale', api: 'locale', status: '部分兼容', detail: '表体空态、筛选下拉、选择菜单、排序和展开文案已接入 antd locale 链路；filterCheckall 兼容别名见下方特例。' },
  { key: 'sticky', api: 'sticky', status: '兼容支持', detail: '支持 offsetHeader、offsetSummary、offsetScroll 和 getContainer；offsetSummary 在 fixed summary、页面级 sticky、非 scroll.y 数据区域模式下生效。' },
  { key: 'summary', api: 'Table.Summary', status: '完全兼容', detail: '以 Table.Summary 容器 + Row + Cell 三段组合声明汇总栏（与 antd v6 对齐）。' },
  { key: 'pagination', api: 'pagination', status: '完全兼容', detail: '复用 antd Pagination 组件，props 直接传递。' },
  { key: 'size', api: 'size', status: '部分兼容', detail: '合法取值 large / middle / medium / small / compact；缺省视觉等价 large（与 antd v6 默认一致）。middle ≡ medium、compact ≡ small 视觉等价；antd v3 旧名 default 不支持。' },
]

export function renderCompatMatrix({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection
        id="matrix"
        title="兼容状态摘要"
        description="每个 API 领域一行：一眼看清完全兼容、部分兼容和暂未支持的范围。涉及 antd 过时成员（deprecated）的旧写法，见下方迁移特例。"
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
      </DocSection>

      <DocSection
        id="deprecated-members"
        title="过时成员迁移特例"
        description="下面列出 antd Table 已标记 deprecated、但迁移时仍可能遇到的旧成员。新代码优先使用迁移建议里的当前 API。"
      >
        <DeprecatedMembersTable />
      </DocSection>

      <DocSection id="related" title="相关说明">
        <DocsActionList
          actions={[
            { label: 'Semantic DOM 说明', kind: 'doc', value: 'semantic-dom' },
            { label: 'scroll.y 语义', kind: 'doc', value: 'scroll-y' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}
