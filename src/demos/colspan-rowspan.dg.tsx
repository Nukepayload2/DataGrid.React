/**
 * colspan-rowspan demo 的 data-grid 段（左栏），从 colspan-rowspan.tsx 拆出。
 *
 * - props 驱动 `{ bordered, virtual }`（由 colspan-rowspan.tsx 父组件传）。
 * - 自包含：含 `dgColumns`（表头列合并 column.colSpan + 单元格行/列合并 onCell，含 =0 不渲染）
 *   + `<Table>` JSX。
 * - 行为与改造前一致：M3 已实现合并（columnTree.applyHeaderColSpan 表头合并 +
 *   cellMerge.computeCellMergePlan 单元格合并）；rowScope='row' 视觉对齐 antd `<th scope="row">`。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/colspan-rowspan.shared'`），源码可原样展示无需路径改写。
 */
import { Table } from '../table'
import type { ColumnType } from '../table'
import { data, sharedOnCell, type DataType } from './_compare/colspan-rowspan.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义
//
// 列定义逐字搬自改造前 colspan-rowspan.tsx（与 antd 官方 demo 同结构）：
//   - RowHead (key)       rowScope='row'        —— 行标题列（视觉加粗 + 灰底）。
//   - Name (name)         onCell: index===1 → colSpan:5（第 2 行向右合并 5 列）。
//   - Age (age)           onCell: sharedOnCell（index===1 → colSpan:0 被覆盖）。
//   - Home phone (tel)    表头 colSpan:2 + onCell：index===3→rowSpan:2、index===4→rowSpan:0、
//                                            index===1→colSpan:0。
//   - Phone (phone)       表头 colSpan:0（被 Home phone 覆盖，不渲染表头格）+ onCell sharedOnCell。
//   - Address (address)   onCell sharedOnCell。
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<DataType>[] = [
  {
    title: 'RowHead',
    dataIndex: 'key',
    rowScope: 'row',
  },
  {
    title: 'Name',
    dataIndex: 'name',
    render: (text) => <a>{text}</a>,
    onCell: (_record, index) => ({
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
    onCell: (_record, index) => {
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

export default function ColspanRowspanDg({
  bordered = true,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  return (
    <Table<DataType>
      columns={dgColumns}
      dataSource={data}
      bordered={bordered}
      /* pagination={{}}：对齐 antd 默认分页条（antd 6.4.4 即便 5 行也渲染 disabled 态分页条）。
         data-grid 不传=不渲染，故补齐使两侧分页器存在性一致。 */
      pagination={{}}
      /* 全局虚拟化开关接入：ON 时叠加 virtual=true + scroll:{y:true}（data-grid 数据区域模式，
         CSS 自适应填满 SplitDemo 给的 400px 限高，虚拟窗口才有滚动区；本 demo 仅 5 行故实际
         不滚动，但 prop 接入保持开关语义完整）。
         ★ 合并单元格 × 虚拟：M3×M4 组合，跨虚拟窗口边界的合并（rowSpan 跨越可见区裁剪边界）
         是已知 §9 简化，本 demo 仅 5 行不触发，正常接入。
         OFF 时 scroll=undefined，行为与改造前一致。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
