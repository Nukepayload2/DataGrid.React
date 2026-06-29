/**
 * sticky demo 的 antd 段（右栏），从 sticky.tsx 拆出。
 *
 * - props 驱动 `{ summaryFixed, onSummaryFixedChange }`（与左栏 dg 子组件同款，由父组件传）。
 * - 自包含：含 `antdColumns`（Full Name/Age fixed start + Column 1..8 + Action fixed end）+
 *   `<AntdTable>` JSX + summary（fixed top/bottom 切换）。
 * - 忠实复刻 antd 官方 sticky demo 的列结构与 summary（同列结构 + summary fixed top/bottom
 *   Switch + 100 行），用 `scroll={{ x: 1500, y: 400 }}`（antd 接受数字 y，max-height 语义）
 *   容器内固定表头。
 *
 * === ★ columns 配置搬入子组件（task S34→M8 live 编辑接入）===
 * 原父文件的 `antdColumns` 全部搬入本子组件。无内联 SVG / 无第三方依赖。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * summaryFixed 默认 false（对齐改造前父级初值；antd 用 `fixed: fixedTop ? 'top' : 'bottom'`
 * 切换 summary 顶/底 sticky，false→bottom）。onSummaryFixedChange 默认 noop（编辑模式单侧渲染
 * 父不传回调时，summary 内 Switch 点击无副作用但不崩——仍能完整演示 100 行 + summary 布局）。
 *
 * === ★ 容器内固定表头（M8）+ 与左栏差异如实保留 ===
 * 与左栏差异：antd 接受**数字 `y: 400`**（max-height 语义，rc-table 直接给表体容器设
 * max-height:400px 限高 + 表头固定），无需父容器明确高度；左栏 data-grid 用 `y: true`
 * （决策 7，纯 CSS flex，需父容器高度，故外包 height:500 div）。两侧实现路径不同但视觉
 * 对齐（均为 M8 容器内固定表头：表头钉容器顶 + 表体内部滚动）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/sticky.shared'`）。
 */
import type { TableColumnsType } from 'antd'
import { Switch, Table as AntdTable } from 'antd'
import { dataSource, type DataType } from './_compare/sticky.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 两侧字段（title/dataIndex/key/width/fixed/render）逐字一致
// ---------------------------------------------------------------------------

const antdColumns: TableColumnsType<DataType> = [
  { title: 'Full Name', width: 100, dataIndex: 'name', key: 'name', fixed: 'start' },
  { title: 'Age', width: 100, dataIndex: 'age', key: 'age', fixed: 'start' },
  { title: 'Column 1', dataIndex: 'address', key: '1', width: 150 },
  { title: 'Column 2', dataIndex: 'address', key: '2', width: 150 },
  { title: 'Column 3', dataIndex: 'address', key: '3', width: 150 },
  { title: 'Column 4', dataIndex: 'address', key: '4', width: 150 },
  { title: 'Column 5', dataIndex: 'address', key: '5', width: 150 },
  { title: 'Column 6', dataIndex: 'address', key: '6', width: 150 },
  { title: 'Column 7', dataIndex: 'address', key: '7', width: 150 },
  { title: 'Column 8', dataIndex: 'address', key: '8' },
  {
    title: 'Action',
    key: 'operation',
    fixed: 'end',
    width: 100,
    render: () => <a>action</a>,
  },
]

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

export interface StickyAntdProps {
  summaryFixed: boolean
  onSummaryFixedChange: (value: boolean) => void
}

export default function StickyAntd({
  summaryFixed = false,
  onSummaryFixedChange = () => {
    /* noop：编辑模式单侧渲染父不传回调时，summary 内 Switch 点击无副作用但不崩。 */
  },
}: StickyAntdProps) {
  return (
    // antd 官方 sticky demo 列结构忠实复刻：
    // Full Name/Age fixed start + Column 1..8 + Action fixed end +
    // scroll x 1500 / y 400 + summary fixed top/bottom Switch + 100 行。
    // （原版 sticky prop 省略——改用 scroll.y 容器内固定表头，适配 app-shell。）
    //
    // ★ 与左栏差异：antd 接受**数字 `y: 400`**（max-height 语义，rc-table 直接给表体容器设
    //   max-height:400px 限高 + 表头固定），无需父容器明确高度；左栏 data-grid 用 `y: true`
    //   （决策 7，纯 CSS flex，需父容器高度，故外包 height:500 div）。两侧实现路径不同但视觉
    //   对齐（均为 M8 容器内固定表头：表头钉容器顶 + 表体内部滚动）。
    <AntdTable<DataType>
      columns={antdColumns}
      dataSource={dataSource}
      scroll={{ x: 1500, y: 400 }}
      summary={() => (
        <AntdTable.Summary fixed={summaryFixed ? 'top' : 'bottom'}>
          <AntdTable.Summary.Row>
            <AntdTable.Summary.Cell index={0} colSpan={2}>
              <Switch
                checkedChildren="Fixed Top"
                unCheckedChildren="Fixed Top"
                checked={summaryFixed}
                /* 受控：onChange 上报父级（与父控制条 Switch 同步操作同一共享 state）。 */
                onChange={(checked) => onSummaryFixedChange(checked)}
              />
            </AntdTable.Summary.Cell>
            <AntdTable.Summary.Cell index={2} colSpan={8}>
              Scroll Context
            </AntdTable.Summary.Cell>
            <AntdTable.Summary.Cell index={10}>Fix Right</AntdTable.Summary.Cell>
          </AntdTable.Summary.Row>
        </AntdTable.Summary>
      )}
    />
  )
}
