/**
 * multiple-sorter demo 的 data-grid 段（左栏）。
 *
 * props 驱动 `{ bordered, virtual, remountKey }`（由 multiple-sorter.tsx 父组件传）：
 * - bordered：表格边框开关（控制条驱动）。
 * - virtual：全局虚拟化开关。
 * - remountKey：Reset 按钮递增的 key，应用到内部 `<Table key=...>` 强制 remount 清空所有
 *   排序激活态（多列排序非受控，不能通过受控 setState 重置）。
 *
 * 自包含：含 `dgColumns`（Chinese multiple:3 / Math multiple:2 / English multiple:1 / Name 不可排序）
 * + `<Table>` JSX + 共用 `onChange` console.log。多列排序瞬时态由 Table 内部自管（非受控）。
 */
import { Table } from '../table'
import type { ColumnType, TableProps as DgTableProps } from '../table'
import { data, type RecordType } from './_compare/multiple-sorter.shared'

// ---------------------------------------------------------------------------
// 列定义
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
  },
  {
    title: 'Chinese Score',
    dataIndex: 'chinese',
    sorter: {
      compare: (a, b) => a.chinese - b.chinese,
      multiple: 3,
    },
  },
  {
    title: 'Math Score',
    dataIndex: 'math',
    sorter: {
      compare: (a, b) => a.math - b.math,
      multiple: 2,
    },
  },
  {
    title: 'English Score',
    dataIndex: 'english',
    sorter: {
      compare: (a, b) => a.english - b.english,
      multiple: 1,
    },
  },
]

// ---------------------------------------------------------------------------
// onChange（console.log 各参数）
// ---------------------------------------------------------------------------

const onChange: DgTableProps<RecordType>['onChange'] = (
  pagination,
  filters,
  sorter,
  extra,
) => {
  // eslint-disable-next-line no-console
  console.log('multiple-sorter demo onChange params:', { pagination, filters, sorter, extra })
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

// props 默认值：bordered=false / virtual=false（OFF 回 undefined scroll）/ remountKey=0（初始 key，
// 未传时 Table 用此 key 正常挂载）。多列排序非受控，由 Table 内部管理。
export default function MultipleSorterDg({
  bordered = false,
  virtual = false,
  remountKey = 0,
}: {
  bordered: boolean
  virtual: boolean
  remountKey: number
}) {
  return (
    <Table<RecordType>
      key={`dg-${remountKey}`}
      columns={dgColumns}
      dataSource={data}
      onChange={onChange}
      bordered={bordered}
      pagination={{}}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
         pane 限高，虚拟窗口才有滚动区）；OFF 时回 undefined，无 scroll。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
