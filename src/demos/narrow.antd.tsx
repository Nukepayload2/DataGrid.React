/**
 * narrow demo 的 antd 段（右栏）。
 *
 * 忠实复刻 antd narrow demo：300px 窄容器 + 200 行 + size="small" + 分页 defaultCurrent:13。
 * props `{ paginated, defaultCurrent, virtual }` 由父组件传入。
 */
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { dataSource, rawColumns, type RecordType } from './_compare/narrow.shared'

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
