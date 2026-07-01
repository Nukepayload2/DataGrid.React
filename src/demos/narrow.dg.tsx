import { Table } from '../table'
import type { ColumnType, TablePaginationConfig } from '../table'
import { dataSource, rawColumns, type RecordType } from './_compare/narrow.shared'

const dgColumns: ColumnType<RecordType>[] = rawColumns.map((c) => ({ ...c }))

export default function NarrowDg({
  paginated = true,
  defaultCurrent = 13,
  virtual = false,
}: {
  paginated: boolean
  defaultCurrent: number
  virtual: boolean
}) {
  const dgPagination: TablePaginationConfig | false = paginated
    ? { defaultCurrent }
    : false

  return (
    <div
      style={
        virtual
          ? { width: 300, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }
          : { width: 300 }
      }
    >
      <Table<RecordType>
        columns={dgColumns}
        dataSource={dataSource}
        size="small"
        pagination={dgPagination}
        virtual={virtual}
        scroll={virtual ? { y: true } : undefined}
      />
    </div>
  )
}
