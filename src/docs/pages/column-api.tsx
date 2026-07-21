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
      description="属性清单由 src/docs/generated/api.json 自动生成（extract-api.mjs 提取 ColumnType 公开成员）。data-grid 专属列级能力（拖拽锁定、recycling cell 回调）归入 gridColumnOptions，参考 gridOptions 页。"
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
