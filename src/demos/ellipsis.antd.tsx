/**
 * ellipsis demo 的 antd 段（右栏），从 ellipsis.tsx 拆出。
 *
 * - props 驱动 `{ bordered, virtual }`（由 ellipsis.tsx 父组件传）。
 * - 自包含：含 `antdColumns` + `<AntdTable>` JSX。
 * - 忠实复刻 antd ellipsis demo：antd 原生 `column.ellipsis: true` + antd 默认 title 提示。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/ellipsis.shared'`）。
 */
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { data, type RecordType } from './_compare/ellipsis.shared'

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
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

export default function EllipsisAntd({
  bordered = false,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  return (
    <AntdTable<RecordType>
      columns={antdColumns}
      dataSource={data}
      bordered={bordered}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll:{y:300}（antd 默认渲染分页条，
         扣除表头~55 + 分页条~50 → 约 300 塞进 split pane 限高）；
         OFF 时 scroll=undefined，行为与改造前一致。 */
      virtual={virtual}
      scroll={virtual ? { y: 300 } : undefined}
    />
  )
}
