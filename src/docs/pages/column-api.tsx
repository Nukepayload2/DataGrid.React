import {
  ApiRefTable,
  DocSection,
  getApiMembers,
} from '../components'
import type { DocsPageContext } from '../types'

export function renderColumnApi({ onOpen }: DocsPageContext) {
  return (
    <DocSection
      id="column-props"
      eyebrow="列"
      title="Column props"
      description="本页列出 ColumnType 可用字段。data-grid 专属列级能力归入 gridColumnOptions，参考 gridOptions 页。"
    >
      <ApiRefTable
        members={getApiMembers('column')}
        anchorPrefix="column-prop"
        onOpenDoc={(slug) => onOpen({ kind: 'doc', value: slug, label: slug })}
        description="data-grid ColumnType（兼容 antd v6 列定义）。"
      />
    </DocSection>
  )
}
