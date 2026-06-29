/**
 * size demo 的 data-grid 段（左栏）。size prop 驱动 dg-size-* 类。
 */
import { Table } from '../table'
import type { ColumnType, SizeType } from '../table'
import { data, rawColumns, type RecordType } from './_compare/size.shared'

const dgColumns: ColumnType<RecordType>[] = rawColumns.map((c) => ({ ...c }))

type SharedSize = 'large' | 'medium' | 'small'

export default function SizeDg({
  size = 'medium',
  virtual = false,
}: {
  size?: SharedSize
  virtual?: boolean
} = {}) {
  return (
    <Table<RecordType>
      columns={dgColumns}
      dataSource={data}
      size={size as SizeType}
      pagination={{}}
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
