/**
 * ellipsis demo 的 data-grid 段（左栏），从 ellipsis.tsx 拆出。
 *
 * - props 驱动 `{ bordered, virtual }`（由 ellipsis.tsx 父组件传）。
 * - 自包含：含 `dgColumns` + `<Table>` JSX。
 * - 行为与改造前一致：`column.ellipsis: true` → data-grid ellipsis CSS 类
 *   （`overflow:hidden + white-space:nowrap + text-overflow:ellipsis + word-break:keep-all`）
 *   + 默认 native title 提示（S20 实现，对齐 antd `genEllipsisStyle`）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/ellipsis.shared'`），源码可原样展示无需路径改写。
 */
import { Table } from '../table'
import type { ColumnType } from '../table'
import { data, type RecordType } from './_compare/ellipsis.shared'

const dgColumns: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <a>{text}</a>,
    width: 150,
  },
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
    width: 80,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address 1',
    ellipsis: true,
  },
  {
    title: 'Long Column Long Column Long Column',
    dataIndex: 'address',
    key: 'address 2',
    ellipsis: true,
  },
  {
    title: 'Long Column Long Column',
    dataIndex: 'address',
    key: 'address 3',
    ellipsis: true,
  },
  {
    title: 'Long Column',
    dataIndex: 'address',
    key: 'address 4',
    ellipsis: true,
  },
]

export default function EllipsisDg({
  bordered = false,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  return (
    <Table<RecordType>
      columns={dgColumns}
      dataSource={data}
      bordered={bordered}
      /* pagination={{}}：对齐 antd 默认分页条（antd 对任意行数都渲染 .ant-pagination）。 */
      pagination={{}}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll:{y:true}（data-grid 数据区域模式，
         CSS 自适应填满 SplitDemo 给的 400px 限高，虚拟窗口才有滚动区）；
         OFF 时 scroll=undefined，行为与改造前一致。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
