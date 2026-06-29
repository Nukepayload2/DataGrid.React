/**
 * size demo 的 antd 段（右栏），从 size.tsx 拆出。
 *
 * - props 驱动 `{ size, virtual }`（由 size.tsx 父组件传）：
 *   * size：'large' | 'medium' | 'small'，由控制条 Segmented 切换（真理源在父）。
 *   * virtual：全局虚拟化开关。
 * - 自包含：含 `antdColumns`（基于 rawColumns 加 antd TableProps['columns'] 类型）+ `<AntdTable>` JSX。
 * - 忠实复刻 antd size demo 的表格（同样的 size prop 驱动 antd 内置尺寸）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - size='medium'（合理初值：antd v6 兼容 'medium'='middle' 别名，中等行高。
 *   父文件默认模式传真实 size（父 state 初值 'medium'），编辑模式 propsFor 超集
 *   {bordered,virtual,size,autoScroll} 中 size 固定 'medium'，与此默认值一致）。
 * - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
 * - 示例数据用 shared 初始数据（非空，3 行）。
 *
 * === ★ size 提升父（决策）===
 * size 是 DemoToolbar 的 Segmented size 控制条直接操作的开关，必须留父（父渲染控制条需直接
 * 读写它），同一 state 同时驱动两侧表格。
 *
 * === 两侧保留的差异（搬入子文件后维持）===
 * - data-grid `medium` = antd `middle`（antd v6 规范值为 'middle'，data-grid 用 'medium' 别名
 *   等价 'middle'，视觉一致）。两侧均接受 'medium' 别名。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/size.shared'`）。
 */
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { data, rawColumns, type RecordType } from './_compare/size.shared'

// 右栏 antd 列定义（基于 shared rawColumns 加类型）。
const antdColumns: NonNullable<TableProps<RecordType>['columns']> = rawColumns.map(
  (c) => ({ ...c }),
)

// 共享 size 类型：antd v6 TableProps['size'] = 'default' | 'middle' | 'small'，但 antd demo
// 用 'medium'/'small'（antd v6 兼容 'medium'='middle'）。两侧共享用字符串字面量。
type SharedSize = 'large' | 'medium' | 'small'

export default function SizeAntd({
  size = 'medium',
  virtual = false,
}: {
  size?: SharedSize
  virtual?: boolean
} = {}) {
  return (
    <AntdTable<RecordType>
      columns={antdColumns}
      dataSource={data}
      size={size}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:280（antd 不认 true，且两侧均有
         分页条，需扣除表头~55 与分页条~64 → 约 280 才能塞进 ~400px pane；OFF 时回 undefined，
         行为与改造前一致）。 */
      virtual={virtual}
      scroll={virtual ? { y: 280 } : undefined}
    />
  )
}
