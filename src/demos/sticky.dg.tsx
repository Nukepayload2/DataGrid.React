/**
 * sticky demo 的 data-grid 段（左栏），从 sticky.tsx 拆出。
 *
 * - props 驱动 `{ summaryFixed, onSummaryFixedChange }`（由 sticky.tsx 父组件传，父控制条 Switch
 *   + summary 内 Switch 都操作同一共享 state；受控模式，onChange 回调上报）。
 * - 自包含：含 `dgColumns`（Full Name/Age fixed start + Column 1..8 + Action fixed end）+
 *   `<Table>` JSX + summary（fixed on/off）。
 * - 行为与改造前一致——M8 容器内固定表头（决策 7：scroll.y 仅支持 `true`，纯 CSS flex 自适应，
 *   需父容器明确高度——故外包 `<div style={{ height: 500 }}>`；表体在表格容器内部滚动、表头
 *   钉在表格容器顶部）+ fixed 列 + summary fixed（Switch on/off）。
 *
 * === ★ columns 配置搬入子组件（task S34→M8 live 编辑接入）===
 * 原父文件的 `dgColumns` 全部搬入本子组件。无内联 SVG / 无第三方依赖（Action 用 `<a>action</a>`）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * summaryFixed 默认 false（对齐改造前父级初值；data-grid S22 summary 的 fixed 简化为 boolean，
 * 仅 sticky bottom，不支持 'top'，Switch 切换 on/off）。onSummaryFixedChange 默认 noop（编辑模式
 * 单侧渲染父不传回调时，summary 内 Switch 点击无副作用但不崩——仍能完整演示 100 行 + summary 布局）。
 * 编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll} 不含 summaryFixed，靠默认值兜底——
 * 子组件单侧渲染完整演示一张 100 行 + 11 列 + fixed start/end + scroll.x:1500 + summary 的表格
 * （合理有效初值）。
 *
 * === ★ M8 容器内固定表头 + 父容器高度（原样搬入子组件，不改逻辑）===
 * data-grid scroll.y 仅支持 `true`（非数字），需父容器明确高度——原父组件已用
 * `<div style={{ height: 500 }}>` 包裹提供父容器高度。拆分时原样搬到本子组件，保持 M8 容器内
 * 固定 + 父容器高度处理，不改逻辑。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'../table'` / `'./_compare/sticky.shared'`），源码可原样展示无需路径改写。
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
    /* noop：编辑模式单侧渲染父不传回调时，summary 内 Switch 点击无副作用但不崩。 */
  },
}: StickyDgProps) {
  return (
    // ★ M8 容器内固定表头 + 父容器高度（原样搬入子组件，不改逻辑）：
    //   决策 7：data-grid 的 scroll.y 刻意**仅支持 `true`**（纯 CSS flex 自适应高度，不用 JS 算
    //   数字 max-height），GridTable.tsx 用 `scrollY === true` 判定；数字 400 被判 false → M8 容器
    //   内固定不启用 → 表头不固定、表体不滚。故 data-grid 用 `y: true`（不是 y:400）。
    //   `y: true` 要求**父容器有明确 height**（决策 7），否则 .dg-wrapper.dg-data-area 的
    //   height:100% 无依托——故此处外包 `<div style={{ height: 500 }}>` 提供明确高度（演示用固定
    //   值，可按需改 calc()/vh/其它）。
    //   进入数据区域模式后：表体在该高度内 flex 限高内滚 + 表头 sticky 钉在容器顶；
    //   scroll.x:1500 横向滚动走 `.dg-scroll`（数据区域模式双向滚动）。无 sticky prop。
    <div style={{ height: 500 }}>
      <Table<DataType>
        columns={dgColumns}
        dataSource={dataSource}
        scroll={{ x: 1500, y: true }}
        /* ★ 对齐右栏 antd 默认分页（校准事实 1：antd 对任意行数都渲染 .ant-pagination
           disabled 态分页条；data-grid omit=不渲染）。补 pagination={{}} 启用默认分页器，
           两侧分页条存在性一致。 */
        pagination={{}}
        summary={() => (
          <Table.Summary fixed={summaryFixed}>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <Switch
                  checkedChildren="Summary Fixed"
                  unCheckedChildren="Summary Fixed"
                  checked={summaryFixed}
                  /* 受控：onChange 上报父级（与父控制条 Switch 同步操作同一共享 state）。 */
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
