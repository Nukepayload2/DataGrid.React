/**
 * multiple-sorter demo 的 antd 段（右栏），从 multiple-sorter.tsx 拆出。
 *
 * - props 驱动 `{ bordered, virtual, remountKey }`（与左栏 dg 子组件同款签名）：
 *   * remountKey：Reset 按钮递增的 key，应用到内部 `<AntdTable key=...>` 强制 remount 清空
 *     所有排序激活态（multiple-sorter demo 多列排序非受控，不能通过受控 setState 重置）。
 * - 自包含：含 `antdColumns`（Chinese multiple:3 / Math multiple:2 / English multiple:1 /
 *   Name 不可排序）+ `<AntdTable>` JSX + 共用 `onChange` console.log。
 * - 忠实复刻 antd multiple-sorter demo：antd 原生 sorter.multiple 优先级 + 表头优先级序号 +
 *   onChange 数组。
 *
 * === ★ 多列排序 state 自管（非受控）===
 * 同左栏 dg 子组件：多列排序是 antd 原生非受控语义，状态由 Table 内部管理。Reset 按钮通过
 * React key remount 强制重建（见父文件），子组件不需要排序 state props。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/multiple-sorter.shared'`）。
 */
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { data, type RecordType } from './_compare/multiple-sorter.shared'

// ---------------------------------------------------------------------------
// 列定义 —— 忠实复刻 antd multiple-sorter demo（逐字一致）
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'Name',
    dataIndex: 'name',
  },
  {
    title: 'Chinese Score',
    dataIndex: 'chinese',
    sorter: {
      compare: (a, b) => a.chinese - b.chinese,
      multiple: 3,
    },
  },
  {
    title: 'Math Score',
    dataIndex: 'math',
    sorter: {
      compare: (a, b) => a.math - b.math,
      multiple: 2,
    },
  },
  {
    title: 'English Score',
    dataIndex: 'english',
    sorter: {
      compare: (a, b) => a.english - b.english,
      multiple: 1,
    },
  },
]

// ---------------------------------------------------------------------------
// onChange（与 dg 子组件共用同一个 console.log 形态）
// ---------------------------------------------------------------------------

const onChange: TableProps<RecordType>['onChange'] = (
  pagination,
  filters,
  sorter,
  extra,
) => {
  // eslint-disable-next-line no-console
  console.log('multiple-sorter demo onChange params:', { pagination, filters, sorter, extra })
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

// ★ props 默认值同左栏 dg（合理有效初值，见 dg 子文件注释）。
export default function MultipleSorterAntd({
  bordered = false,
  virtual = false,
  remountKey = 0,
}: {
  bordered: boolean
  virtual: boolean
  remountKey: number
}) {
  return (
    <AntdTable<RecordType>
      key={`antd-${remountKey}`}
      columns={antdColumns}
      dataSource={data}
      onChange={onChange}
      bordered={bordered}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:280（antd 不认 true，且表头/默认
         分页画在 scroll.y 之外，需扣除表头~55 与分页条~64 → 约 280 才能塞进 pane 限高；
         OFF 时回 undefined，行为与改造前一致）。 */
      virtual={virtual}
      scroll={virtual ? { y: 280 } : undefined}
    />
  )
}
