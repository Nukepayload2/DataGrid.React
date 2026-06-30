/**
 * semantic-dom demo 的 antd 段（右栏）。
 *
 * 列定义（Personal Info 分组表头 + Name rowScope + Age sorter）+ 13 槽位 classNames/styles 染色
 * （与 dg 子组件逐字同款）。antd 有 thead/tbody/tr 真实容器，header.wrapper/body.wrapper/
 * header.row/body.row 全部染色成功（与 dg 形成对照）。内部 sortOrder 态显示在表格下方。
 */
import { useState } from 'react'
import type { CSSProperties } from 'react'
import type {
  TableProps as AntdTableProps,
  TableColumnsType,
} from 'antd'
import { Table as AntdTable } from 'antd'
import { semanticData, type SemanticRecord } from './_compare/semantic-dom.shared'

// 13 槽位 classNames（逐字与 dg 同款）。antd 有 thead/tbody/tr 真实容器故全部染色成功。
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

// 每槽一种霓虹色 outline（与 dg 子组件逐字同款）。
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

// Age 可排序（aria-sort 专项）+ Name rowScope（行表头语义演示）。
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
  // sortOrder 态由子组件内部自管（非受控），onChange 回写显示在表格下方便于 devtools 对照 aria-sort。
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
