/**
 * ellipsis-custom-tooltip demo 的 antd 段（右栏），从 ellipsis-custom-tooltip.tsx 拆出。
 *
 * - props 驱动 `{ bordered, virtual }`（由 ellipsis-custom-tooltip.tsx 父组件传）。
 * - 自包含：含 `antdColumns`（带 `<Tooltip>` render）+ `<AntdTable>` JSX。
 * - 忠实复刻 antd ellipsis-custom-tooltip demo：antd 原生
 *   `ellipsis: { showTitle: false }` + antd `<Tooltip>` render。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/ellipsis-custom-tooltip.shared'`）。
 */
import { Table as AntdTable, Tooltip } from 'antd'
import type { TableProps } from 'antd'
import { data, type RecordType } from './_compare/ellipsis-custom-tooltip.shared'

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
    ellipsis: {
      showTitle: false,
    },
    render: (address) => (
      <Tooltip placement="topLeft" title={address}>
        {address}
      </Tooltip>
    ),
  },
  {
    title: 'Long Column Long Column Long Column',
    dataIndex: 'address',
    key: 'address 2',
    ellipsis: {
      showTitle: false,
    },
    render: (address) => (
      <Tooltip placement="topLeft" title={address}>
        {address}
      </Tooltip>
    ),
  },
  {
    title: 'Long Column Long Column',
    dataIndex: 'address',
    key: 'address 3',
    ellipsis: {
      showTitle: false,
    },
    render: (address) => (
      <Tooltip placement="topLeft" title={address}>
        {address}
      </Tooltip>
    ),
  },
  {
    title: 'Long Column',
    dataIndex: 'address',
    key: 'address 4',
    ellipsis: {
      showTitle: false,
    },
    render: (address) => (
      <Tooltip placement="topLeft" title={address}>
        {address}
      </Tooltip>
    ),
  },
]

export default function EllipsisCustomTooltipAntd({
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
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:280（antd 不认 true，且两侧均有
         分页条，需扣除表头~55 与分页条~64 → 约 280 才能塞进 ~400px pane；OFF 时回 undefined，
         行为与改造前一致）。 */
      virtual={virtual}
      scroll={virtual ? { y: 280 } : undefined}
    />
  )
}
