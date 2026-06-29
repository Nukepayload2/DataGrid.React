/**
 * sticky demo 的 data-grid 段（左栏）。
 *
 * props 驱动 `{ summaryFixed, onSummaryFixedChange }`（由 sticky.tsx 父组件传，父控制条 Switch
 * + summary 内 Switch 都操作同一共享 state；受控模式，onChange 回调上报）。
 * 自包含：含 `dgColumns`（Full Name/Age fixed start + Column 1..8 + Action fixed end）+
 * `<Table>` JSX + summary（fixed on/off）。
 *
 * 容器内固定表头 + 父容器高度 — 详见 docs/design-notes/sticky.md
 */
import { Switch } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { dataSource, type DataType } from './_compare/sticky.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— 两侧字段（title/dataIndex/key/width/fixed/render）逐字一致
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<DataType>[] = [
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

export interface StickyDgProps {
  summaryFixed: boolean
  onSummaryFixedChange: (value: boolean) => void
}

export default function StickyDg({
  summaryFixed = false,
  onSummaryFixedChange = () => {
    /* noop：父组件未传回调时的兜底，避免 summary 内 Switch 点击报错。 */
  },
}: StickyDgProps) {
  return (
    // 容器内固定表头 — 详见 docs/design-notes/sticky.md
    //   data-grid 的 scroll.y 仅支持 `true`（纯 CSS flex 自适应高度，非数字 max-height）；
    //   `y: true` 要求父容器有明确 height，故外包 height:500 div。进入数据区域模式后表体在该高度内
    //   flex 限高内滚 + 表头 sticky 钉在容器顶；scroll.x:1500 横向滚动走 `.dg-scroll`。
    <div style={{ height: 500 }}>
      <Table<DataType>
        columns={dgColumns}
        dataSource={dataSource}
        scroll={{ x: 1500, y: true }}
        /* pagination={{}}：对齐右栏 antd 默认分页条（antd 对任意行数都渲染 .ant-pagination）。 */
        pagination={{}}
        summary={() => (
          <Table.Summary fixed={summaryFixed}>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <Switch
                  checkedChildren="Summary Fixed"
                  unCheckedChildren="Summary Fixed"
                  checked={summaryFixed}
                  onChange={(checked) => onSummaryFixedChange(checked)}
                />
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} colSpan={8}>
                Scroll Context
              </Table.Summary.Cell>
              <Table.Summary.Cell index={10}>Fix Right</Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </div>
  )
}
