/**
 * narrow demo 的 antd 段（右栏），从 narrow.tsx 拆出。
 *
 * - props 驱动 `{ paginated, defaultCurrent, virtual }`（由 narrow.tsx 父组件传），默认值同 dg。
 * - 自包含：含 `antdColumns` + `<AntdTable>` JSX + 包裹的 300px 窄容器 div。
 * - 忠实复刻 antd narrow demo：300px 窄容器 + 200 行 + size="small" + 分页 defaultCurrent:13。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/narrow.shared'`）。
 */
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { dataSource, rawColumns, type RecordType } from './_compare/narrow.shared'

// 右栏 antd 列定义。
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
  // pagination 配置：开 = { defaultCurrent }，关 = false（全显）。
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
        /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:280（antd 不认 true，且表头/分页画在
           scroll.y 之外，扣除后约 280 塞进 pane 限高）；OFF 时回 undefined（原 narrow demo 无 scroll），零回归。 */
        virtual={virtual}
        scroll={virtual ? { y: 280 } : undefined}
      />
    </div>
  )
}
