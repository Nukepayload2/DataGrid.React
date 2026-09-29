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
  root: 'semantic-mark-root',
  section: 'semantic-mark-section',
  content: 'semantic-mark-content',
  title: 'semantic-mark-title',
  footer: 'semantic-mark-footer',
  // 注：antd 的 header.wrapper / body.wrapper 落在 <thead> / <tbody>，data-grid 无该容器（表头格与
  //   表体格同为 .dg-grid 的直接 grid item）⇒ 类型面不提供 wrapper；选中该槽位时 dg 无染色、antd 有染色。
  header: {
    row: 'semantic-mark-header-row',
    cell: 'semantic-mark-header-cell',
  },
  body: {
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

const createDgStyles = (activeSlot?: string): TableStyles<SemanticRecord> | undefined => {
  if (!activeSlot) return undefined

  return {
    root: slotOutline('root', activeSlot),
    section: slotOutline('section', activeSlot),
    content: slotOutline('content', activeSlot),
    title: slotOutline('title', activeSlot),
    footer: slotOutline('footer', activeSlot),
    header: {
      row: slotOutline('header.row', activeSlot),
      cell: slotOutline('header.cell', activeSlot),
    },
    body: {
      row: slotOutline('body.row', activeSlot),
      cell: slotOutline('body.cell', activeSlot),
    },
    pagination: {
      root: slotOutline('pagination.root', activeSlot),
      item: slotOutline('pagination.item', activeSlot),
    },
  }
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
  activeSlot,
  bordered = false,
  virtual = false,
}: {
  activeSlot?: string
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
        styles={createDgStyles(activeSlot)}
        title={() => 'table title'}
        footer={() => 'table footer'}
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
