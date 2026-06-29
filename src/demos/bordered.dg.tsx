/**
 * bordered demo 的 data-grid 段（左栏），从 bordered.tsx 拆出。
 *
 * - 两个示例各自导出命名组件，由 bordered.tsx 父组件分别放进两个 SplitDemo（每示例一对左右栏）：
 *     * `BorderedTitleFooterDg`：示例1（bordered + title/footer，复刻 antd 官方 bordered demo）。
 *     * `BorderedFixedDg`：示例2（bordered + fixed 组合，验证固定列边框完整）。
 * - 默认导出 `BorderedDg`：在 div gap 里渲染两个示例（live 编辑模式 SplitDemoPreview 用，
 *   仅展示左栏 dg 侧两示例堆叠，不对照；默认模式不走这里）。
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
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/bordered.shared'`），源码可原样展示无需路径改写。
 */
import { Table } from '../table'
import type { ColumnType } from '../table'
import {
  data,
  fixedData,
  type FixedRow,
  type RowType,
} from './_compare/bordered.shared'

// ---------------------------------------------------------------------------
// 示例 1 列定义（Name render <a> / Cash Assets align end + className 'column-money'
//                / Address，3 列 + title/footer，复刻 antd 官方 bordered demo）。
// ---------------------------------------------------------------------------

const dgColumnsExample1: ColumnType<RowType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    render: (text) => <a>{text}</a>,
  },
  {
    title: 'Cash Assets',
    // 注：antd demo 此列带 className:'column-money'（demo 自定义 placeholder，非 antd 内置 CSS）。
    // ★ §9 B4 更正：antd Table 未定义 .column-money CSS 规则（全仓搜仅命中 demo 源码 + snapshot），
    //   该 className 是演示 column.className 透传的 placeholder，antd 自身不消费——两栏均无视觉高亮。
    // data-grid 接口全兼容阶段已支持 column.className 透传（数据格 + 表头格），此处透传与 antd 等价。
    className: 'column-money',
    dataIndex: 'money',
    // 注：antd demo 此处为 align:'right'；data-grid 用逻辑属性 'end'（等价 right，RTL 自动适配）。
    align: 'end',
  },
  {
    title: 'Address',
    dataIndex: 'address',
  },
]

// ---------------------------------------------------------------------------
// 示例 2 列定义（bordered + fixed 组合：Full Name+Age 左固定、Column 1..5 中间、Action 右固定）。
// fixed 用逻辑属性 'start'/'end'（等价 antd 'left'/'right'）。
// ---------------------------------------------------------------------------

const dgColumnsExample2: ColumnType<FixedRow>[] = [
  {
    title: 'Full Name',
    dataIndex: 'name',
    width: 120,
    fixed: 'start',
  },
  { title: 'Age', dataIndex: 'age', width: 100, fixed: 'start' },
  { title: 'Column 1', dataIndex: 'address', key: '1' },
  { title: 'Column 2', dataIndex: 'address', key: '2' },
  { title: 'Column 3', dataIndex: 'address', key: '3' },
  { title: 'Column 4', dataIndex: 'address', key: '4' },
  { title: 'Column 5', dataIndex: 'address', key: '5' },
  {
    title: 'Action',
    key: 'operation',
    width: 100,
    fixed: 'end',
    render: () => <a>action</a>,
  },
]

// ---------------------------------------------------------------------------
// 示例 1：bordered + title/footer（复刻 antd 官方 bordered demo）
// ---------------------------------------------------------------------------

export function BorderedTitleFooterDg({
  bordered = true,
  virtual = false,
}: {
  bordered?: boolean
  virtual?: boolean
} = {}) {
  return (
    <Table<RowType>
      columns={dgColumnsExample1}
      dataSource={data}
      bordered={bordered}
      title={() => 'Header'}
      footer={() => 'Footer'}
      // ★ 对齐右栏 antd 默认分页（校准事实 1：antd 对任意行数都渲染 .ant-pagination
      //   disabled 态分页条；data-grid omit=不渲染）。补 pagination={{}} 启用默认分页器，
      //   两侧分页条存在性一致（disabled 态在 ≤pageSize 行时无视觉可点页码）。
      pagination={{}}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
         给的 400px 限高，虚拟窗口才有滚动区）；OFF 时回 undefined，行为与改造前一致。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}

// ---------------------------------------------------------------------------
// 示例 2：bordered + fixed 组合（验证固定列边框完整）
// ---------------------------------------------------------------------------

export function BorderedFixedDg({
  bordered = true,
  virtual = false,
}: {
  bordered?: boolean
  virtual?: boolean
} = {}) {
  return (
    <Table<FixedRow>
      columns={dgColumnsExample2}
      dataSource={fixedData}
      bordered={bordered}
      /* 全局虚拟化开关接入：ON 时在原 scroll.x 基础上叠加 virtual=true + scroll.y:true
         （CSS 自适应，填满 SplitDemo 给的 400px 限高，虚拟窗口才有滚动区）；
         OFF 时仅保留原 scroll.x:'max-content'，行为与改造前一致。 */
      virtual={virtual}
      scroll={virtual ? { x: 'max-content', y: true } : { x: 'max-content' }}
      // ★ 对齐右栏 antd 默认分页（同示例 1：antd 默认渲染分页条，data-grid omit=无）。
      pagination={{}}
    />
  )
}

// ---------------------------------------------------------------------------
// 默认导出（live 编辑用）：div gap 堆叠两个示例。
// 默认模式 SplitDemoPreview 默认模式不走这里（走父文件真实 SplitDemo 双栏）。
// ---------------------------------------------------------------------------

export default function BorderedDg({
  bordered = true,
  virtual = false,
}: {
  bordered?: boolean
  virtual?: boolean
} = {}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <BorderedTitleFooterDg bordered={bordered} virtual={virtual} />
      <BorderedFixedDg bordered={bordered} virtual={virtual} />
    </div>
  )
}
