import { useState } from 'react'
import type { CSSProperties } from 'react'
import type {
  TableProps as AntdTableProps,
  TableColumnsType,
} from 'antd'
import { Table as AntdTable } from 'antd'
import { semanticData, type SemanticRecord } from './_compare/semantic-dom-slots.shared'

const antdClassNames: NonNullable<AntdTableProps<SemanticRecord>['classNames']> = {
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
const antdStyles: NonNullable<AntdTableProps<SemanticRecord>['styles']> = {
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

const antdColumns: TableColumnsType<SemanticRecord> = [
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

export default function SemanticDomAntd({
  bordered = false,
  virtual = false,
}: {
  bordered?: boolean
  virtual?: boolean
}) {
  const [antdSortOrder, setAntdSortOrder] = useState<
    'ascend' | 'descend' | null
  >(null)

  const antdPagination = { pageSize: 3 }

  return (
    <div>
      <AntdTable<SemanticRecord>
        columns={antdColumns}
        dataSource={semanticData}
        classNames={antdClassNames}
        styles={antdStyles}
        title={() => 'antd Title'}
        footer={() => 'antd Footer'}
        size="small"
        bordered={bordered}
        pagination={antdPagination}
        virtual={virtual}
        scroll={virtual ? { y: 280 } : undefined}
        onChange={(_pag, _filters, sorter) => {
          const order = Array.isArray(sorter)
            ? (sorter[0]?.order ?? null)
            : (sorter?.order ?? null)
          setAntdSortOrder(order as 'ascend' | 'descend' | null)
        }}
      />
      <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>
        当前 Age 列 sortOrder = <code>{String(antdSortOrder)}</code>
      </div>
    </div>
  )
}
