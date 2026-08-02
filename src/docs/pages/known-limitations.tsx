import {
  DocSection,
  DocsActionList,
  DocsDataGrid,
} from '../components'
import type { DocsPageContext } from '../types'

interface GapRow {
  key: string
  topic: string
  boundary: string
  action: string
}

const limitationRows: GapRow[] = [
  { key: 'semantic-dom', topic: 'semantic DOM', boundary: '不能完整复刻 thead / tbody / tr 层级。', action: '改用 data-grid 支持的组件替换位置和样式入口。' },
  { key: 'scroll-y', topic: 'scroll.y', boundary: '不支持 antd number/string 滚动区域高度语义。', action: '改成 `scroll={{ y: true }}`，表格占满父容器可用空间（详见 #/docs/scroll-y）。' },
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
      </DocSection>
      <DocSection id="related" title="相关边界细节页">
        <DocsActionList
          actions={[
            { label: 'scroll.y 语义', kind: 'doc', value: 'scroll-y' },
            { label: 'Semantic DOM 说明', kind: 'doc', value: 'semantic-dom' },
            { label: '兼容矩阵', kind: 'doc', value: 'compat-matrix' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}
