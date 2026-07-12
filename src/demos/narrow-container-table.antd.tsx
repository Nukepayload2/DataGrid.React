import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { dataSource, rawColumns, type RecordType } from './_compare/narrow-container-table.shared'

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = rawColumns.map(
  (c) => ({ ...c }),
)

export default function NarrowAntd({
  paginated = true,
  defaultCurrent = 13,
  virtual = false,
}: {
  paginated: boolean
  defaultCurrent: number
  virtual: boolean
}) {
  const antdPagination: TableProps<RecordType>['pagination'] = paginated
    ? { defaultCurrent }
    : false

  return (
    <div style={{ width: 300 }}>
      <AntdTable<RecordType>
        columns={antdColumns}
        dataSource={dataSource}
        size="small"
        pagination={antdPagination}
        virtual={virtual}
        scroll={virtual ? { y: 280 } : undefined}
      />
    </div>
  )
}
