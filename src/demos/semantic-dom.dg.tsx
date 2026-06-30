/**
 * semantic-dom demo 的 data-grid 段（左栏）。
 *
 * 列定义（Personal Info 分组表头 + Name rowScope + Age sorter）+ 13 槽位 classNames/styles 染色。
 * 内部 sortOrder 态点击 Age 表头排序后显示在表格下方。props `{ bordered, virtual }` 仅作兜底。
 */
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Table } from '../table'
import type {
  ColumnType,
  TableClassNames,
  TableStyles,
} from '../table'
import { semanticData, type SemanticRecord } from './_compare/semantic-dom.shared'

// 13 槽位 classNames（与 antd 子组件逐字同款）。header.wrapper / body.wrapper 在 dg 渲染层
// 无对应 DOM，引擎忽略——这正是要演示的架构限制差异。详见 docs/design-notes/layout.md。
const dgClassNames: TableClassNames<SemanticRecord> = {
  root: 'dg-semi-slot-root',
  section: 'dg-semi-slot-section',
  content: 'dg-semi-slot-content',
  title: 'dg-semi-slot-title',
  footer: 'dg-semi-slot-footer',
  header: {
    wrapper: 'dg-semi-slot-header-wrapper', // dg 无 thead 容器 → 不渲染
    row: 'dg-semi-slot-header-row', // 透传到表头行所有 cell
    cell: 'dg-semi-slot-header-cell',
  },
  body: {
    wrapper: 'dg-semi-slot-body-wrapper', // dg 无 tbody 容器 → 不渲染
    row: 'dg-semi-slot-body-row', // 透传到表体行所有 cell
    cell: 'dg-semi-slot-body-cell',
  },
  pagination: {
    root: 'dg-semi-slot-pagination-root',
    item: 'dg-semi-slot-pagination-item',
  },
}

// 每槽一种霓虹色 outline（用 inline style 确保 demo 自包含，无 CSS 文件依赖）。
const slotOutline = (color: string): CSSProperties => ({
  outline: `2px dashed ${color}`,
  outlineOffset: -2,
})
const dgStyles: TableStyles<SemanticRecord> = {
  root: slotOutline('#ff00ff'),
  section: slotOutline('#00ffff'),
  content: slotOutline('#ffff00'),
  title: slotOutline('#ff5500'),
  footer: slotOutline('#00ff55'),
  header: {
    wrapper: slotOutline('#5500ff'),
    row: slotOutline('#ff0055'),
    cell: slotOutline('#ff5555'),
  },
  body: {
    wrapper: slotOutline('#55ff00'),
    row: slotOutline('#0055ff'),
    cell: slotOutline('#5555ff'),
  },
  pagination: {
    root: slotOutline('#ffaa00'),
    item: slotOutline('#aa00ff'),
  },
}

// Age 可排序（aria-sort 专项）+ Name rowScope（行表头语义演示）。
const dgColumns: ColumnType<SemanticRecord>[] = [
  {
    title: 'Personal Info',
    children: [
      { title: 'Name', dataIndex: 'name', key: 'name', rowScope: 'row' },
      {
        title: 'Age',
        dataIndex: 'age',
        key: 'age',
        sorter: true,
        showSorterTooltip: false,
      },
    ],
  },
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

export default function SemanticDomDg({
  bordered = false,
  virtual = false,
}: {
  bordered?: boolean
  virtual?: boolean
}) {
  // sortOrder 态由子组件内部自管（非受控），onChange 回写显示在表格下方便于 devtools 对照 aria-sort。
  const [dgSortOrder, setDgSortOrder] = useState<'ascend' | 'descend' | null>(
    null,
  )

  const dgPagination = { pageSize: 3 }

  return (
    <div>
      <Table<SemanticRecord>
        columns={dgColumns}
        dataSource={semanticData}
        classNames={dgClassNames}
        styles={dgStyles}
        title={() => 'data-grid Title'}
        footer={() => 'data-grid Footer'}
        size="small"
        bordered={bordered}
        pagination={dgPagination}
        virtual={virtual}
        scroll={virtual ? { y: true } : undefined}
        onChange={(_pag, _filters, sorter) => {
          const order = Array.isArray(sorter)
            ? (sorter[0]?.order ?? null)
            : (sorter?.order ?? null)
          setDgSortOrder(order as 'ascend' | 'descend' | null)
        }}
      />
      <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>
        当前 Age 列 sortOrder = <code>{String(dgSortOrder)}</code>
      </div>
    </div>
  )
}
