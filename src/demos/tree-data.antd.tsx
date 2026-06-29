/**
 * tree-data demo 的 antd 段（右栏），从 tree-data.tsx 拆出。
 *
 * === 状态提升说明 ===
 * `checkStrictly` 由父级 DemoToolbar Switch 驱动，prop 传子（同一 state 驱动两侧同步）。
 * rowSelection 的 onChange/onSelect console.log 各侧独立（非共享选中态）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - checkStrictly=false（对齐 antd tree-data demo 默认：父子联动）。
 * - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
 * 编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll} 不含 checkStrictly，子组件用 false
 * 默认值兜底 → 父子联动模式（合理有效初值）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/tree-data.shared'`）。
 */
import { Table as AntdTable } from 'antd'
import type { TableColumnsType, TableProps as AntdTableProps } from 'antd'
import { data, type RecordType } from './_compare/tree-data.shared'

// ---------------------------------------------------------------------------
// 列定义 —— Name/Age/Address 纯文本，无 render（antd 原生树形展开 + 缩进）
// ---------------------------------------------------------------------------

const antdColumns: TableColumnsType<RecordType> = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age', width: '12%' },
  { title: 'Address', dataIndex: 'address', key: 'address', width: '30%' },
]

// ---------------------------------------------------------------------------
// rowSelection —— onChange + onSelect console.log（忠实复刻 antd demo）
// 注：data-grid TableRowSelection 尚未声明 onSelect（决策 3 第二步补齐），右栏 antd 保留
// onSelect、左栏 data-grid 用 onChange 观察勾选变化（功能等价）。
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

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

export default function TreeDataAntd({
  checkStrictly = false,
  virtual = false,
}: {
  checkStrictly: boolean
  virtual: boolean
}) {
  return (
    // 右栏 antd Table 忠实复刻 antd tree-data demo：不传 pagination → antd 默认开启分页
    // （与左栏 data-grid 显式 pagination={{}} 等价，两侧行为一致）。
    <AntdTable<RecordType>
      columns={antdColumns}
      rowSelection={{ ...antdRowSelectionBase, checkStrictly }}
      dataSource={data}
      // 虚拟化（决策 7）：ON→virtual+scroll.y=300（有分页，antd scroll.y 须数字）；OFF→不传，非虚拟（零回归）。
      virtual={virtual}
      scroll={virtual ? { y: 300 } : undefined}
    />
  )
}
