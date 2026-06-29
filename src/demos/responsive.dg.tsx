/**
 * responsive demo 的 data-grid 段（左栏），从 responsive.tsx 拆出。
 *
 * - props 驱动 `{ bordered, virtual }`（由 responsive.tsx 父组件传）。
 * - 自包含：含 `dgColumns`（Name 无 responsive 始终显示 + Age responsive:['md'] + Address
 *   responsive:['lg']）+ `<Table>` JSX。
 * - 行为与改造前一致：column.responsive 字段 + 引擎内部 needResponsive 订阅 antd
 *   Grid.useBreakpoint（Table.tsx:1297，决策 6：响应式检测用 antd）+ visibleColumns 过滤。
 *
 * === ★ 断点检测位置说明 ===
 * data-grid Table 引擎**内部**已调用 `Grid.useBreakpoint()`（Table.tsx:1297）按视口订阅
 * responsiveObserver，无需子组件或父组件显式传入 screens。子组件只需声明 column.responsive
 * 字段，引擎自动按断点显隐（与 antd Table 内部机制对齐，两侧同步）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - bordered=false（原 demo 默认无边框）。
 * - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
 * 编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll} 已覆盖 bordered/virtual。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/responsive.shared'`），源码可原样展示无需路径改写。
 */
import { Table } from '../table'
import type { ColumnType } from '../table'
import { data, type RecordType } from './_compare/responsive.shared'

// 左栏 data-grid 列定义 —— 行为与改造前一致。
// Name 无 responsive → 所有视口始终显示；Age responsive:['md'] → md+ 显示；Address responsive:['lg'] → lg+ 显示。
const dgColumns: ColumnType<RecordType>[] = [
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

export default function ResponsiveDg({
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
      // ★ 对齐右栏 antd 默认分页（antd 对任意行数都渲染 .ant-pagination disabled 态分页条；
      //   data-grid omit=不渲染）。补 pagination={{}} 启用默认分页器，两侧分页条存在性一致。
      pagination={{}}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
         pane 限高，虚拟窗口才有滚动区）；OFF 时回 undefined（原 responsive demo 无 scroll），零回归。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
