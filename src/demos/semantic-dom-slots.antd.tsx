import { useState } from 'react'
import type { CSSProperties } from 'react'
import type {
  TableProps as AntdTableProps,
  TableColumnsType,
} from 'antd'
import { Table as AntdTable } from 'antd'
import { semanticData, type SemanticRecord } from './_compare/semantic-dom-slots.shared'

const antdClassNames: NonNullable<AntdTableProps<SemanticRecord>['classNames']> = {
  root: 'semantic-mark-root',
  section: 'semantic-mark-section',
  content: 'semantic-mark-content',
  title: 'semantic-mark-title',
  footer: 'semantic-mark-footer',
  header: {
    wrapper: 'semantic-mark-header-wrapper',
    row: 'semantic-mark-header-row',
    cell: 'semantic-mark-header-cell',
  },
  body: {
    wrapper: 'semantic-mark-body-wrapper',
    row: 'semantic-mark-body-row',
    cell: 'semantic-mark-body-cell',
  },
  pagination: {
    root: 'semantic-mark-pagination-root',
    item: 'semantic-mark-pagination-item',
  },
}

type SemanticSlotKey =
  | 'root'
  | 'section'
  | 'content'
  | 'title'
  | 'footer'
  | 'header.wrapper'
  | 'header.row'
  | 'header.cell'
  | 'body.wrapper'
  | 'body.row'
  | 'body.cell'
  | 'pagination.root'
  | 'pagination.item'

const slotOutline = (
  slot: SemanticSlotKey,
  activeSlot?: string,
): CSSProperties | undefined => {
  if (activeSlot !== slot) return undefined

  return {
    outline: '2px solid #1677ff',
    outlineOffset: -2,
    boxShadow: '0 0 0 2px rgba(22, 119, 255, 0.16)',
  }
}

const createAntdStyles = (
  activeSlot?: string,
): AntdTableProps<SemanticRecord>['styles'] | undefined => {
  if (!activeSlot) return undefined

  return {
    root: slotOutline('root', activeSlot),
    section: slotOutline('section', activeSlot),
    content: slotOutline('content', activeSlot),
    title: slotOutline('title', activeSlot),
    footer: slotOutline('footer', activeSlot),
    header: {
      wrapper: slotOutline('header.wrapper', activeSlot),
      row: slotOutline('header.row', activeSlot),
      cell: slotOutline('header.cell', activeSlot),
    },
    body: {
      wrapper: slotOutline('body.wrapper', activeSlot),
      row: slotOutline('body.row', activeSlot),
      cell: slotOutline('body.cell', activeSlot),
    },
    pagination: {
      root: slotOutline('pagination.root', activeSlot),
      item: slotOutline('pagination.item', activeSlot),
    },
  }
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
  activeSlot,
  bordered = false,
  virtual = false,
}: {
  activeSlot?: string
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
        styles={createAntdStyles(activeSlot)}
        title={() => 'table title'}
        footer={() => 'table footer'}
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
