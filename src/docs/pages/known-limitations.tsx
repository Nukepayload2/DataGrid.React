import { Typography } from 'antd'
import {
  DocSection,
  DocsActionList,
  DocsDataGrid,
  DocsNote,
} from '../components'
import type { DocsPageContext } from '../types'

const { Text } = Typography

interface GapRow {
  key: string
  topic: string
  boundary: string
  action: string
}

const limitationRows: GapRow[] = [
  { key: 'semantic-dom', topic: 'semantic DOM', boundary: '不能完整复刻 thead / tbody / tr 层级。', action: '用 data-grid 语义槽位做适配。' },
  { key: 'scroll-y', topic: 'scroll.y', boundary: '不支持 antd number/string max-height 语义。', action: '改成 `scroll={{ y: true }}`，表格占满父容器可用空间（详见 #/docs/scroll-y）。' },
  { key: 'rtl', topic: 'RTL', boundary: '尚未系统处理方向、fixed、sticky 和拖拽方向。', action: '需要独立设计和回归范围。' },
]

export function renderKnownLimitations({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection id="boundaries" title="架构边界和兼容缺口">
        <DocsDataGrid<GapRow>
          columns={[
            { title: '主题', dataIndex: 'topic', key: 'topic', width: '22%' },
            { title: '边界', dataIndex: 'boundary', key: 'boundary', width: '42%' },
            { title: '处理方式', dataIndex: 'action', key: 'action', width: '36%' },
          ]}
          dataSource={limitationRows}
          rowKey="key"
        />
        <DocsNote title="本页与兼容矩阵 / 过时成员页的分工">
          本页回答「data-grid 在架构层有哪些边界与 backlog」——DOM 形态、ARIA、RTL、scroll.y 数字语义、components 替换范围等。想看某个 API 领域整体兼容到什么程度，去兼容矩阵；想看具体某个过时成员怎么改，去过时成员页。
        </DocsNote>
      </DocSection>
      <DocSection id="backlog" title="可实施兼容项">
        <ul className="docs-bullet-list">
          <li><Text code>expandable.columnTitle</Text>、<Text code>expandable.fixed</Text></li>
          <li><Text code>column.filtered</Text>、<Text code>column.sortIcon</Text>、<Text code>column.filterResetToDefaultFilteredValue</Text></li>
          <li><Text code>filterDropdownProps</Text> 更完整透传。</li>
          <li><Text code>dataIndex</Text> 的 DeepNamePath 类型增强。</li>
          <li><Text code>sticky.offsetSummary</Text></li>
        </ul>
      </DocSection>
      <DocSection id="related" title="相关边界细节页">
        <DocsActionList
          actions={[
            { label: 'scroll.y 语义', kind: 'doc', value: 'scroll-y' },
            { label: 'Semantic DOM 槽位落点', kind: 'doc', value: 'semantic-dom' },
            { label: '兼容矩阵', kind: 'doc', value: 'compat-matrix' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}
