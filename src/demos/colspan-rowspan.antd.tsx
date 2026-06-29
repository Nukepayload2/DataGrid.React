/**
 * colspan-rowspan demo 的 antd 段（右栏），从 colspan-rowspan.tsx 拆出。
 *
 * - props 驱动 `{ bordered, virtual }`（由 colspan-rowspan.tsx 父组件传）。
 * - 自包含：含 `antdColumns`（表头 colSpan + 单元格 onCell rowSpan/colSpan，含 =0 不渲染）
 *   + `<AntdTable>` JSX。
 * - 忠实复刻 antd 官方 colspan-rowspan demo（同列定义、同 onCell、同 5 行数据、bordered）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/colspan-rowspan.shared'`）。
 */
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { data, sharedOnCell, type DataType } from './_compare/colspan-rowspan.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd 官方 colspan-rowspan demo
//
// 列定义与改造前一致（与左栏 data-grid 同结构，仅类型为 antd TableProps['columns']）：
//   - RowHead (key)       rowScope='row'。
//   - Name (name)         onCell: index===1 → colSpan:5。
//   - Age (age)           onCell: sharedOnCell。
//   - Home phone (tel)    表头 colSpan:2 + onCell rowSpan/colSpan 逻辑。
//   - Phone (phone)       表头 colSpan:0 + onCell sharedOnCell。
//   - Address (address)   onCell sharedOnCell。
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<DataType>['columns']> = [
  {
    title: 'RowHead',
    dataIndex: 'key',
    rowScope: 'row',
  },
  {
    title: 'Name',
    dataIndex: 'name',
    render: (text) => <a>{text}</a>,
    onCell: (_, index) => ({
      colSpan: index === 1 ? 5 : 1,
    }),
  },
  {
    title: 'Age',
    dataIndex: 'age',
    onCell: sharedOnCell,
  },
  {
    title: 'Home phone',
    colSpan: 2,
    dataIndex: 'tel',
    onCell: (_, index) => {
      if (index === 3) {
        return { rowSpan: 2 }
      }
      // These two are merged into above cell
      if (index === 4) {
        return { rowSpan: 0 }
      }
      if (index === 1) {
        return { colSpan: 0 }
      }

      return {}
    },
  },
  {
    title: 'Phone',
    colSpan: 0,
    dataIndex: 'phone',
    onCell: sharedOnCell,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    onCell: sharedOnCell,
  },
]

export default function ColspanRowspanAntd({
  bordered = true,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  return (
    <AntdTable<DataType>
      columns={antdColumns}
      dataSource={data}
      bordered={bordered}
      /* 全局虚拟化开关接入：ON 时叠加 virtual=true + scroll:{y:300}（antd 默认渲染分页条，
         扣除表头~55 + 分页条~50 → 约 300 塞进 split pane 限高）；
         OFF 时 scroll=undefined，行为与改造前一致。 */
      virtual={virtual}
      scroll={virtual ? { y: 300 } : undefined}
    />
  )
}
