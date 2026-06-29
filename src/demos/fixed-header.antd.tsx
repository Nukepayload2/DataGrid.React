/**
 * fixed-header demo 的 antd 段（右栏），从 fixed-header.tsx 拆出。
 *
 * - props 驱动 `{ bordered, virtual }`（由 fixed-header.tsx 父组件传）。
 * - 自包含：含 `antdColumns`（Name/Age/Address 3 列）+ `<AntdTable>` JSX。
 * - 忠实复刻 antd 官方 fixed-header demo：scroll y 55*5 + pagination pageSize 50 + 100 行。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/fixed-header.shared'`）。
 */
import { Table as AntdTable } from 'antd'
import type { TableColumnsType } from 'antd'
import { dataSource, type DataType } from './_compare/fixed-header.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd 官方 fixed-header demo
// ---------------------------------------------------------------------------

const antdColumns: TableColumnsType<DataType> = [
  { title: 'Name', dataIndex: 'name', width: 150 },
  { title: 'Age', dataIndex: 'age', width: 150 },
  { title: 'Address', dataIndex: 'address' },
]

export default function FixedHeaderAntd({
  bordered = false,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  return (
    <AntdTable<DataType>
      columns={antdColumns}
      dataSource={dataSource}
      bordered={bordered}
      pagination={{ pageSize: 50 }}
      scroll={{ y: 55 * 5 }}
      /* 全局虚拟化开关接入：本 demo 已自带 scroll.y:55*5（M8 模式），开关 ON 时叠加 virtual=true
         切到 M4 虚拟；OFF 时不传 virtual，scroll.y 原值保留，行为与改造前一致。 */
      virtual={virtual}
    />
  )
}
