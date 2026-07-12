import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Table } from '../table'
import type {
  ColumnType,
  TableClassNames,
  TableStyles,
} from '../table'
import { semanticData, type SemanticRecord } from './_compare/semantic-dom-slots.shared'

const dgClassNames: TableClassNames<SemanticRecord> = {
  root: 'dg-semi-slot-root',
  section: 'dg-semi-slot-section',
  content: 'dg-semi-slot-content',
  title: 'dg-semi-slot-title',
  footer: 'dg-semi-slot-footer',
  header: {
    wrapper: 'dg-semi-slot-header-wrapper',
    row: 'dg-semi-slot-header-row',
    cell: 'dg-semi-slot-header-cell',
  },
  body: {
    wrapper: 'dg-semi-slot-body-wrapper',
    row: 'dg-semi-slot-body-row',
    cell: 'dg-semi-slot-body-cell',
  },
  pagination: {
    root: 'dg-semi-slot-pagination-root',
    item: 'dg-semi-slot-pagination-item',
  },
}

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
