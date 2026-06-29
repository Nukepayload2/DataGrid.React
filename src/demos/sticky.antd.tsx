/**
 * sticky demo 的 antd 段（右栏）。
 *
 * props 驱动 `{ summaryFixed, onSummaryFixedChange }`（与左栏 dg 子组件同款，由父组件传）。
 * 自包含：含 `antdColumns`（Full Name/Age fixed start + Column 1..8 + Action fixed end）+
 * `<AntdTable>` JSX + summary（fixed top/bottom 切换）。
 * 忠实复刻 antd 官方 sticky demo 的列结构与 summary（同列结构 + summary fixed top/bottom
 * Switch + 100 行），用 `scroll={{ x: 1500, y: 400 }}`（antd 接受数字 y，max-height 语义）。
 *
 * 容器内固定表头 — 详见 docs/design-notes/sticky.md
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
    /* noop：父组件未传回调时的兜底，避免 summary 内 Switch 点击报错。 */
  },
}: StickyAntdProps) {
  return (
    // antd 官方 sticky demo 列结构忠实复刻：
    // Full Name/Age fixed start + Column 1..8 + Action fixed end +
    // scroll x 1500 / y 400 + summary fixed top/bottom Switch + 100 行。
    // 省略原版 sticky prop（页面级 sticky 在 app-shell 下失效），改用 scroll.y 容器内固定表头。
    //
    // 与左栏差异：antd 接受数字 `y: 400`（max-height 语义，rc-table 直接给表体容器设 max-height
    // 限高 + 表头固定），无需父容器明确高度；左栏 data-grid 用 `y: true`（纯 CSS flex，需父容器
    // 高度）。详见 docs/design-notes/sticky.md。
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
