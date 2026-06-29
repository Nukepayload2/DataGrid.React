/**
 * size demo 的 antd 段（右栏）。忠实复刻 antd size demo 的表格（同样的 size prop 驱动 antd 内置尺寸）。
 */
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { data, rawColumns, type RecordType } from './_compare/size.shared'

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = rawColumns.map(
  (c) => ({ ...c }),
)

type SharedSize = 'large' | 'medium' | 'small'

export default function SizeAntd({
  size = 'medium',
  virtual = false,
}: {
  size?: SharedSize
  virtual?: boolean
} = {}) {
  return (
    <AntdTable<RecordType>
      columns={antdColumns}
      dataSource={data}
      size={size}
      virtual={virtual}
      scroll={virtual ? { y: 280 } : undefined}
    />
  )
}
