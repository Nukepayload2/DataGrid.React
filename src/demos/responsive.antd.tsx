/**
 * responsive demo 的 antd 段（右栏），从 responsive.tsx 拆出。
 *
 * - props 驱动 `{ bordered, virtual }`（由 responsive.tsx 父组件传），默认值同 dg。
 * - 自包含：含 `antdColumns` + `<AntdTable>` JSX。
 * - 忠实复刻 antd responsive demo：antd 原生 column.responsive（Name 无 responsive + Age
 *   responsive:['md'] + Address responsive:['lg']）。断点检测由 antd Table 内部
 *   responsiveObserver 自动订阅，无需子组件显式调用。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/responsive.shared'`）。
 */
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { data, type RecordType } from './_compare/responsive.shared'

// 右栏 antd 列定义 —— 忠实复刻 antd responsive demo。
const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'Name (all screens)',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <a>{text}</a>,
  },
  {
    title: 'Age (medium screen or bigger)',
    dataIndex: 'age',
    key: 'age',
    responsive: ['md'],
  },
  {
    title: 'Address (large screen or bigger)',
    dataIndex: 'address',
    key: 'address',
    responsive: ['lg'],
  },
]

export default function ResponsiveAntd({
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
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:280（antd 不认 true，且表头/默认分页
         画在 scroll.y 之外，扣除后约 280 塞进 pane 限高）；OFF 时回 undefined（原 responsive
         demo 无 scroll），零回归。 */
      virtual={virtual}
      scroll={virtual ? { y: 280 } : undefined}
    />
  )
}
