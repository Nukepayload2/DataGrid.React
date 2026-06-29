/**
 * fixed-gapped-columns demo 的 antd 段（右栏），从 fixed-gapped-columns.tsx 拆出。
 *
 * - props 驱动 `{ bordered, size, virtual }`（由 fixed-gapped-columns.tsx 父组件传）。
 * - 自包含：含 `antdColumns`（分散固定列堆叠：start 侧 FullName + Column1 不相邻、end 侧 Action1 +
 *   Action3 不相邻）+ `<AntdTable>` JSX。
 * - 忠实复刻 antd 官方 fixed-gapped-columns demo：分散固定列堆叠 + bordered + scroll x max-content +
 *   pagination false。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/fixed-gapped-columns.shared'`）。
 */
import { Table as AntdTable } from 'antd'
import type { TableColumnsType } from 'antd'
import { dataSource, type DataType } from './_compare/fixed-gapped-columns.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd 官方 fixed-gapped-columns demo
// ---------------------------------------------------------------------------

const antdColumns: TableColumnsType<DataType> = [
  {
    title: 'Full Name',
    width: 100,
    dataIndex: 'name',
    fixed: 'start',
  },
  {
    title: 'Age',
    width: 100,
    dataIndex: 'age',
  },
  { title: 'Column 1', dataIndex: 'address', key: '1', fixed: 'start' },
  { title: 'Column 2', dataIndex: 'address', key: '2' },
  { title: 'Column 3', dataIndex: 'address', key: '3' },
  { title: 'Column 4', dataIndex: 'address', key: '4' },
  { title: 'Column 5', dataIndex: 'address', key: '5' },
  { title: 'Column 6', dataIndex: 'address', key: '6' },
  { title: 'Column 7', dataIndex: 'address', key: '7' },
  { title: 'Column 8', dataIndex: 'address', key: '8' },
  { title: 'Column 9', dataIndex: 'address', key: '9' },
  { title: 'Column 10', dataIndex: 'address', key: '10' },
  { title: 'Column 11', dataIndex: 'address', key: '11' },
  { title: 'Column 12', dataIndex: 'address', key: '12' },
  { title: 'Column 13', dataIndex: 'address', key: '13' },
  { title: 'Column 14', dataIndex: 'address', key: '14' },
  { title: 'Column 15', dataIndex: 'address', key: '15' },
  { title: 'Column 16', dataIndex: 'address', key: '16' },
  { title: 'Column 17', dataIndex: 'address', key: '17' },
  { title: 'Column 18', dataIndex: 'address', key: '18' },
  { title: 'Column 19', dataIndex: 'address', key: '19' },
  { title: 'Column 20', dataIndex: 'address', key: '20' },
  {
    title: 'Action 1',
    fixed: 'end',
    width: 90,
    render: () => <a>action</a>,
  },
  {
    title: 'Action 2',
    width: 90,
    render: () => <a>action</a>,
  },
  {
    title: 'Action 3',
    fixed: 'end',
    width: 90,
    render: () => <a>action</a>,
  },
]

export default function FixedGappedColumnsAntd({
  bordered = true,
  size = 'medium',
  virtual = false,
}: {
  bordered: boolean
  size: 'medium' | 'large'
  virtual: boolean
}) {
  return (
    <AntdTable<DataType>
      bordered={bordered}
      columns={antdColumns}
      dataSource={dataSource}
      size={size}
      // ★ 虚拟化透传；ON 时 scroll.x 'max-content' 转数字 2000 + y:300（antd virtual 需数字 y）；
      // OFF 回退原 max-content（零回归）。
      virtual={virtual}
      scroll={virtual ? { x: 2000, y: 300 } : { x: 'max-content' }}
      pagination={false}
    />
  )
}
