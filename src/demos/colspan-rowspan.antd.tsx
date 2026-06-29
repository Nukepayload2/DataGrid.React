/**
 * colspan-rowspan demo 的 antd 段（右栏）。
 *
 * props：`{ bordered, virtual }`（与左栏 dg 子组件同款）。忠实复刻 antd 官方 colspan-rowspan demo
 * （同列定义、同 onCell、同 5 行数据、bordered）。
 */
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { data, sharedOnCell, type DataType } from './_compare/colspan-rowspan.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd 官方 colspan-rowspan demo
//（与左栏 data-grid 同结构，仅类型为 antd TableProps['columns']）。
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
      /* 虚拟化开关接入：ON 时 virtual=true + scroll:{y:300}（antd 默认渲染分页条，扣除表头~55 +
         分页条~50 塞进 split pane 限高）。详见 docs/design-notes/virtualization.md */
      virtual={virtual}
      scroll={virtual ? { y: 300 } : undefined}
    />
  )
}
