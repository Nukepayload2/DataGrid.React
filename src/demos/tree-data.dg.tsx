/**
 * tree-data demo 的 data-grid 段（左栏），从 tree-data.tsx 拆出。
 *
 * === 状态提升说明 ===
 * `checkStrictly` 是共享控制条（父级 DemoToolbar Switch）直接读写的 state，必须留父并 prop
 * 传子（同一 state 驱动两侧同步 diff）。rowSelection 的 onChange console.log 各侧独立
 * （非共享选中态——本 demo 仅演示 checkStrictly 联动行为对照）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - checkStrictly=false（对齐 antd tree-data demo 默认：父子联动；§9 S13 引擎默认 true，
 *   此处显式 false 覆盖演示意图）。
 * - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
 * 编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll} 不含 checkStrictly，子组件用 false
 * 默认值兜底 → 父子联动模式（合理有效初值），无需额外 state 兜底。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/tree-data.shared'`），源码可原样展示无需路径改写。
 */
import { Table } from '../table'
import type { ColumnType, TableProps } from '../table'
import { data, type RecordType } from './_compare/tree-data.shared'

type TableRowSelection<T extends object = object> = TableProps<T>['rowSelection']

// ---------------------------------------------------------------------------
// 列定义 —— Name/Age/Address 纯文本，无 render（首列缩进 + 展开图标由引擎渲染）
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age', width: '12%' },
  { title: 'Address', dataIndex: 'address', key: 'address', width: '30%' },
]

// ---------------------------------------------------------------------------
// rowSelection —— onChange console.log（各侧独立，非跨栏同步选中态）
// 注：antd demo 含 onSelect（单行勾选回调）console.log；data-grid TableRowSelection
// 尚未声明 onSelect（决策 3 第二步补齐），这里仅保留 onChange（功能等价：onChange 在每次
// 勾选时触发，可在其中观察 selectedRowKeys 变化）。
// ---------------------------------------------------------------------------

const dgRowSelectionBase: TableRowSelection<RecordType> = {
  onChange: (selectedRowKeys, selectedRows, info) => {
    // eslint-disable-next-line no-console
    console.log(
      `[data-grid] selectedRowKeys: ${selectedRowKeys}`,
      'selectedRows: ',
      selectedRows,
      'info',
      info,
    )
  },
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

export default function TreeDataDg({
  checkStrictly = false,
  virtual = false,
}: {
  checkStrictly: boolean
  virtual: boolean
}) {
  return (
    // ★ 翻页器对齐（任务 G）：
    // antd tree-data demo 不传 pagination → antd 默认 pagination 开启
    // （defaultPageSize=10 / defaultCurrent=1 / placement=bottomEnd，antd Table 默认）。
    // data-grid 默认不分页（§9 S11：pagination 默认 undefined=全显），故**左栏需显式
    // 传 pagination={{}}** 复刻 antd 默认分页行为（启用 + antd Pagination 默认配置）。
    // 本 demo 顶层仅 2 行（John Brown sr. + Joe Black，分页基于**顶层记录**而非展开后总数），
    // pageSize=10 → 单页即可容纳，但翻页器**会渲染**（total=2，single page）——与 antd 一致。
    <Table<RecordType>
      columns={dgColumns}
      rowSelection={{ ...dgRowSelectionBase, checkStrictly }}
      dataSource={data}
      pagination={{}}
      // 虚拟化（决策 7）：ON→virtual+scroll.y=true（CSS 自适应高度，SplitDemo 限高 pane body 提供可滚动区域）；OFF→不传，非虚拟全量 DOM（零回归）。
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
