/**
 * size demo 的 data-grid 段（左栏），从 size.tsx 拆出。
 *
 * - props 驱动 `{ size, virtual }`（由 size.tsx 父组件传）：
 *   * size：'large' | 'medium' | 'small'，由控制条 Segmented 切换（真理源在父）。
 *   * virtual：全局虚拟化开关。
 * - 自包含：含 `dgColumns`（基于 rawColumns 加 data-grid ColumnType 类型）+ `<Table>` JSX。
 * - 行为与改造前一致：size prop 驱动 dg-size-* 类。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - size='medium'（合理初值：antd v6 中等行高；data-grid SizeType 接受 'medium' 别名 = 'middle'。
 *   父文件默认模式传真实 size（父 state 初值 'medium'），编辑模式 propsFor 超集
 *   {bordered,virtual,size,autoScroll} 中 size 固定 'medium'，与此默认值一致）。
 * - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
 * - 示例数据用 shared 初始数据（非空，3 行）。
 *
 * === ★ size 提升父（决策）===
 * size 是 DemoToolbar 的 Segmented size 控制条直接操作的开关，必须留父（父渲染控制条需直接
 * 读写它），同一 state 同时驱动两侧表格。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/size.shared'`），源码可原样展示无需路径改写。
 */
import { Table } from '../table'
import type { ColumnType, SizeType } from '../table'
import { data, rawColumns, type RecordType } from './_compare/size.shared'

// 左栏 data-grid 列定义（基于 shared rawColumns 加类型）。
const dgColumns: ColumnType<RecordType>[] = rawColumns.map((c) => ({ ...c }))

// 共享 size 类型：'large' / 'medium' / 'small' 在 data-grid SizeType 中均被接受。
type SharedSize = 'large' | 'medium' | 'small'

export default function SizeDg({
  size = 'medium',
  virtual = false,
}: {
  size?: SharedSize
  virtual?: boolean
} = {}) {
  return (
    <Table<RecordType>
      columns={dgColumns}
      dataSource={data}
      size={size as SizeType}
      // ★ 对齐右栏 antd 默认分页（校准事实 1：antd 对任意行数都渲染 .ant-pagination
      //   disabled 态分页条；data-grid omit=不渲染）。补 pagination={{}} 启用默认分页器，
      //   两侧分页条存在性一致。
      pagination={{}}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
         给的 400px 限高，虚拟窗口才有滚动区）；OFF 时回 undefined，行为与改造前一致。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
