/**
 * tree-table-preserveSelectedRowKeys demo 的 antd 段（右栏），从
 * tree-table-preserveSelectedRowKeys.tsx 拆出。
 *
 * - props 驱动 `{ checkStrictly, preserveSelectedRowKeys, virtual }`（由父组件传；
 *   前两个由共享 DemoToolbar Switch 控制，virtual 由全局虚拟化开关控制）。
 * - 自包含：含 `antdColumns`（Name/Age/Address 纯文本）+ `<AntdTable>` JSX + 本侧 rowSelection
 *   的 `onChange` + `onSelect`（控制台日志，各侧独立，忠实复刻 antd demo 含 onSelect）。
 * - 忠实复刻 antd tree-table-preserveSelectedRowKeys demo：树形 × 分页（defaultPageSize:5）×
 *   checkStrictly × preserveSelectedRowKeys（issue #50621）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - checkStrictly=false（对齐 antd demo 初值：父子联动）。
 * - preserveSelectedRowKeys=true（对齐 antd demo 初值：翻页/折叠保留 key）。
 * - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/tree-table-preserveSelectedRowKeys.shared'`）。
 */
import { Table as AntdTable } from 'antd'
import type { TableColumnsType, TableProps as AntdTableProps } from 'antd'
import { dataSource, type RecordType } from './_compare/tree-table-preserveSelectedRowKeys.shared'

// ---------------------------------------------------------------------------
// 列定义 —— Name/Age/Address 纯文本，无 render（两侧同款）。
// ---------------------------------------------------------------------------

const antdColumns: TableColumnsType<RecordType> = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age', width: '12%' },
  { title: 'Address', dataIndex: 'address', key: 'address', width: '30%' },
]

// ---------------------------------------------------------------------------
// rowSelection —— onChange + onSelect 控制台日志（各侧独立）；checkStrictly + preserve 由 props 注入。
// 注：antd demo 含 onSelect（单行勾选回调）；data-grid 仅 onChange（功能等价，决策 3 第二步补齐）。
// ---------------------------------------------------------------------------

const antdRowSelectionBase: AntdTableProps<RecordType>['rowSelection'] = {
  onChange: (selectedRowKeys, selectedRows, info) => {
    // eslint-disable-next-line no-console
    console.log(
      `[antd] selectedRowKeys: ${selectedRowKeys}`,
      'selectedRows: ',
      selectedRows,
      'info',
      info,
    )
  },
  onSelect: (record, selected, selectedRows) => {
    // eslint-disable-next-line no-console
    console.log('[antd] onSelect:', record, selected, selectedRows)
  },
}

export default function TreeTablePreserveSelectedRowKeysAntd({
  checkStrictly = false,
  preserveSelectedRowKeys = true,
  virtual = false,
}: {
  checkStrictly: boolean
  preserveSelectedRowKeys: boolean
  virtual: boolean
}) {
  return (
    <AntdTable<RecordType>
      columns={antdColumns}
      rowSelection={{
        ...antdRowSelectionBase,
        checkStrictly,
        preserveSelectedRowKeys,
      }}
      dataSource={dataSource}
      pagination={{ defaultPageSize: 5 }}
      /* 虚拟化（决策 7）：ON→virtual+scroll.y=300（有分页，antd scroll.y 须数字）；
         OFF→不传，非虚拟（零回归）。 */
      virtual={virtual}
      scroll={virtual ? { y: 300 } : undefined}
    />
  )
}
