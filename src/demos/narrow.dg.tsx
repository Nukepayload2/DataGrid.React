/**
 * narrow demo 的 data-grid 段（左栏）。
 *
 * 300px 窄容器 + 200 行 + size="small" + 分页 defaultCurrent:13。
 * props `{ paginated, defaultCurrent, virtual }` 由父组件传入。
 */
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
    /* virtual flex 链 — 详见 docs/design-notes/virtualization.md
       scroll.y:true 用 CSS 自适应高度（依赖父链有界），narrow 内层 div 原本只有 width:300
       无 height → virtual ON 时加 flex 链把 SplitDemo pane 的有界高透传给虚拟窗口。 */
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
