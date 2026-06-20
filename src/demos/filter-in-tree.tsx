/**
 * 复刻 antd filter-in-tree demo：`G:\Projects\ant-design\components\table\demo\filter-in-tree.tsx`。
 *
 * === antd demo 要素（S7 树形筛选 filterMode='tree'）===
 *
 * - Name 列：`filterMode: 'tree'` + `filters` 含 `children`（Joe 顶层 + Category 1→[Yellow,Pink]、
 *   Category 2→[Green,Black]）+ `filterSearch: true` + `onFilter: (value,record)=>record.name.includes(value)`
 *   + `width: '30%'`。
 *   ★ 树形下拉：antd `<Tree checkable>` 渲染 filters 的树形结构，勾选父子联动（勾 Category 1 自动勾
 *   Yellow+Pink），选中 value 作为 filteredValue，onFilter 对每个勾选 value 逐一判定（OR）。
 *   ★ filterSearch 在 tree 模式过滤树节点（命中节点 + 保留祖先链维持结构）。
 * - Age 列：`sorter: (a, b) => a.age - b.age`（数值排序），无筛选。
 * - Address 列：`filters`（London / New York，**无 filterMode = menu 模式**）+ `filterSearch: true` +
 *   `onFilter: (value,record)=>record.address.startsWith(value)` + `width: '40%'`。
 *   ★ 验证 tree + menu 共存（Name 走 tree，Address 走 menu，互不影响）。
 * - `onChange(pagination, filters, sorter, extra)`：点排序/应用筛选触发，console.log 各参数。
 * - data 4 行与 antd 一致（John Brown / Jim Green / Joe Black / Jim Red）。
 *
 * === S7 新增演示点 ===
 *
 * 1. `filterMode: 'tree'` → Name 列漏斗打开下拉为 antd Tree（带展开/收起 + checkable）。
 * 2. filters 含 children → 树形结构（Category 1 下挂 Yellow/Pink；Category 2 下挂 Green/Black；Joe 顶层）。
 * 3. 勾选 Category 1 → 自动勾选 Yellow + Pink（父子联动）；勾全部子 → 自动勾父（半选→全选）。
 * 4. 选中值（含各级 value）作为 filteredValue，onFilter 对每个 value 判定 OR（record.name.includes(value)）。
 * 5. filterSearch: true → tree 模式搜索框过滤树节点（输入 'cat' → 只显 Category 1/2 + 其子树）。
 * 6. Address 列无 filterMode → 默认 menu（Checkbox.Group 扁平），验证 tree/menu 共存。
 *
 * === 与 antd 一致性 ===
 *
 * - checkStrictly={!filterMultiple}（filterMultiple 默认 true → 父子联动，对齐 antd）。
 * - 全选 Checkbox（filterMultiple=true 时）：勾全部叶子值。
 * - 关闭下拉即应用（filterOnClose 默认 true）。
 */

import { Table } from '../table'
import type { ColumnType, TableProps } from '../table'

interface DataType {
  key: React.Key
  name: string
  age: number
  address: string
}

const columns: ColumnType<DataType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    filters: [
      { text: 'Joe', value: 'Joe' },
      {
        text: 'Category 1',
        value: 'Category 1',
        children: [
          { text: 'Yellow', value: 'Yellow' },
          { text: 'Pink', value: 'Pink' },
        ],
      },
      {
        text: 'Category 2',
        value: 'Category 2',
        children: [
          { text: 'Green', value: 'Green' },
          { text: 'Black', value: 'Black' },
        ],
      },
    ],
    filterMode: 'tree',
    filterSearch: true,
    onFilter: (value, record) => record.name.includes(value as string),
    width: '30%',
  },
  {
    title: 'Age',
    dataIndex: 'age',
    sorter: (a, b) => a.age - b.age,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    filters: [
      { text: 'London', value: 'London' },
      { text: 'New York', value: 'New York' },
    ],
    onFilter: (value, record) => record.address.startsWith(value as string),
    filterSearch: true,
    width: '40%',
  },
]

const data: DataType[] = [
  { key: '1', name: 'John Brown', age: 32, address: 'New York No. 1 Lake Park' },
  { key: '2', name: 'Jim Green', age: 42, address: 'London No. 1 Lake Park' },
  { key: '3', name: 'Joe Black', age: 32, address: 'Sydney No. 1 Lake Park' },
  { key: '4', name: 'Jim Red', age: 32, address: 'London No. 2 Lake Park' },
]

const onChange: TableProps<DataType>['onChange'] = (pagination, filters, sorter, extra) => {
  // eslint-disable-next-line no-console
  console.log('filter-in-tree demo onChange params:', { pagination, filters, sorter, extra })
}

export default function FilterInTreeDemo() {
  return (
    <div style={{ padding: 24 }}>
      <Table<DataType> columns={columns} dataSource={data} onChange={onChange} />
      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: '#fafafa',
          borderRadius: 8,
          color: 'rgba(0,0,0,0.65)',
          fontSize: 12,
          lineHeight: 1.8,
        }}
      >
        <p style={{ margin: '0 0 4px' }}>
          <b>S7 树形筛选 filterMode='tree'</b>：
        </p>
        <p style={{ margin: 0 }}>
          - <code>Name</code>：<code>filterMode: 'tree'</code> + <code>filters</code> 含 children
          （Joe / Category 1→[Yellow,Pink] / Category 2→[Green,Black]）+ <code>filterSearch: true</code> +
          <code>onFilter: name.includes</code>。
        </p>
        <p style={{ margin: 0 }}>
          - 点 Name 漏斗 → antd <code>&lt;Tree checkable&gt;</code> 树形下拉；勾 Category 1 自动勾
          Yellow + Pink（父子联动）；选中值作 filteredValue，onFilter 对每个 value 判定 OR。
        </p>
        <p style={{ margin: 0 }}>
          - 输入 'cat' → 过滤树节点（只显 Category 1/2 + 子树，保留祖先链）。
        </p>
        <p style={{ margin: 0 }}>
          - <code>Age</code>：<code>sorter</code>（数值，无筛选）。
        </p>
        <p style={{ margin: 0 }}>
          - <code>Address</code>：无 filterMode → 默认 menu（Checkbox.Group 扁平）+ filterSearch。
          验证 tree + menu 共存。
        </p>
        <p style={{ margin: 0 }}>
          - 打开 console 查看 onChange 参数（extra.action='filter'）。
        </p>
      </div>
    </div>
  )
}
