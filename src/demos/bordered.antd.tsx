/**
 * bordered demo 的 antd 段（右栏），从 bordered.tsx 拆出。
 *
 * - 两个示例各自导出命名组件，由 bordered.tsx 父组件分别放进两个 SplitDemo（每示例一对左右栏）：
 *     * `BorderedTitleFooterAntd`：示例1（bordered + title/footer，忠实复刻 antd 官方 bordered demo）。
 *     * `BorderedFixedAntd`：示例2（bordered + fixed 组合，fixed:'left'/'right'，对齐左栏对照）。
 * - 默认导出 `BorderedAntd`：在 div gap 里渲染两个示例（live 编辑模式 SplitDemoPreview 用，
 *   仅展示右栏 antd 侧两示例堆叠，不对照；默认模式不走这里）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - bordered=true（对齐 antd 官方 bordered demo 初值；编辑模式 SplitDemoPreview 的 propsFor 超集
 *   {bordered,virtual,size,autoScroll} 中 bordered 固定 false，会覆盖此默认值——但父文件默认模式
 *   传真实 bordered=true，默认模式才是主用场景）。
 * - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
 * - 示例数据用 shared 初始数据（非空，3 行）。
 *
 * === ★ bordered 提升父（决策）===
 * bordered 是 DemoToolbar 的 Switch Bordered 控制条直接操作的开关，必须留父（父渲染控制条需直接
 * 读写它），同一 state 同时驱动两示例 + 两侧表格。
 *
 * === 两侧保留的差异（搬入子文件后维持）===
 * 1. 示例1 Cash Assets 列 align：antd 'right'（左栏 data-grid 'end' 逻辑属性等价）。
 * 2. 示例2 fixed：antd 'left'/'right'（左栏 data-grid 'start'/'end' 逻辑属性等价）。
 * 3. 示例2 scroll.x：virtual ON 时 antd 要求数字（'max-content' 会抛 "scroll.x must be number"），
 *    改传 2000；OFF 回 'max-content'。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/bordered.shared'`）。
 */
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import {
  data,
  fixedData,
  type FixedRow,
  type RowType,
} from './_compare/bordered.shared'

// ---------------------------------------------------------------------------
// 示例 1 列定义（Name render <a> / Cash Assets align right + className 'column-money'
//                / Address，3 列 + title/footer，忠实复刻 antd 官方 bordered demo）。
// ---------------------------------------------------------------------------

const antdColumnsExample1: NonNullable<TableProps<RowType>['columns']> = [
  {
    title: 'Name',
    dataIndex: 'name',
    render: (text) => <a>{text}</a>,
  },
  {
    title: 'Cash Assets',
    className: 'column-money',
    dataIndex: 'money',
    align: 'right',
  },
  {
    title: 'Address',
    dataIndex: 'address',
  },
]

// ---------------------------------------------------------------------------
// 示例 2 列定义（bordered + fixed 组合：Full Name+Age 左固定、Column 1..5 中间、Action 右固定）。
// fixed 用 'left'/'right'（antd 原生）。
// ---------------------------------------------------------------------------

const antdColumnsExample2: NonNullable<TableProps<FixedRow>['columns']> = [
  {
    title: 'Full Name',
    dataIndex: 'name',
    width: 120,
    fixed: 'left',
  },
  { title: 'Age', dataIndex: 'age', width: 100, fixed: 'left' },
  { title: 'Column 1', dataIndex: 'address', key: '1' },
  { title: 'Column 2', dataIndex: 'address', key: '2' },
  { title: 'Column 3', dataIndex: 'address', key: '3' },
  { title: 'Column 4', dataIndex: 'address', key: '4' },
  { title: 'Column 5', dataIndex: 'address', key: '5' },
  {
    title: 'Action',
    key: 'operation',
    width: 100,
    fixed: 'right',
    render: () => <a>action</a>,
  },
]

// ---------------------------------------------------------------------------
// 示例 1：bordered + title/footer（忠实复刻 antd 官方 bordered demo）
// ---------------------------------------------------------------------------

export function BorderedTitleFooterAntd({
  bordered = true,
  virtual = false,
}: {
  bordered?: boolean
  virtual?: boolean
} = {}) {
  return (
    <AntdTable<RowType>
      columns={antdColumnsExample1}
      dataSource={data}
      bordered={bordered}
      title={() => 'Header'}
      footer={() => 'Footer'}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:280（antd 不认 true，且两侧均有
         分页条，需扣除表头~55 与分页条~64 → 约 280 才能塞进 ~400px pane；OFF 时回 undefined，
         行为与改造前一致）。 */
      virtual={virtual}
      scroll={virtual ? { y: 280 } : undefined}
    />
  )
}

// ---------------------------------------------------------------------------
// 示例 2：bordered + fixed 组合（验证固定列边框完整）
// ---------------------------------------------------------------------------

export function BorderedFixedAntd({
  bordered = true,
  virtual = false,
}: {
  bordered?: boolean
  virtual?: boolean
} = {}) {
  return (
    <AntdTable<FixedRow>
      columns={antdColumnsExample2}
      dataSource={fixedData}
      bordered={bordered}
      /* 全局虚拟化开关接入：ON 时在原 scroll.x 基础上叠加 virtual=true + scroll.y:280
         （antd 不认 true；本示例两侧均有分页条，需扣除表头~55 与分页条~64 → 约 280 才能
         塞进 ~400px pane）。
         ★ antd virtual 要求 scroll.x 必须为数字（字符串 'max-content' 会抛
         "scroll.x must be number" error），故 ON 时改传数字 2000（按列宽估算：
         2×120 fixed + 5×~120 普通列 + 1×100 Action ≈ 940，取保险值 2000 足够触发横滚）；
         OFF 时回原 'max-content'，行为与改造前一致。data-grid 左栏不受此限（保持 'max-content'）。 */
      virtual={virtual}
      scroll={virtual ? { x: 2000, y: 280 } : { x: 'max-content' }}
    />
  )
}

// ---------------------------------------------------------------------------
// 默认导出（live 编辑用）：div gap 堆叠两个示例。
// 默认模式 SplitDemoPreview 默认模式不走这里（走父文件真实 SplitDemo 双栏）。
// ---------------------------------------------------------------------------

export default function BorderedAntd({
  bordered = true,
  virtual = false,
}: {
  bordered?: boolean
  virtual?: boolean
} = {}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <BorderedTitleFooterAntd bordered={bordered} virtual={virtual} />
      <BorderedFixedAntd bordered={bordered} virtual={virtual} />
    </div>
  )
}
