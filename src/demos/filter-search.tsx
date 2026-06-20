/**
 * 复刻 antd filter-search demo：`G:\Projects\ant-design\components\table\demo\filter-search.tsx`。
 *
 * === antd demo 要素（S6 筛选项搜索 filterSearch）===
 *
 * - Name 列：`filters`（Joe / Category 1 / Category 2）+ `filterSearch: true` +
 *   `onFilter: (value) => record.name.startsWith(value)` + `width: '30%'`。
 *   ★ antd demo Name 列带 `filterMode: 'tree'`——树形 UI 属 **S7（未实现）**，本 demo 去掉
 *   `filterMode: 'tree'`，用默认 **menu 模式**演示 filterSearch（搜索框过滤 Checkbox 列表）。
 * - Age 列：`sorter: (a, b) => a.age - b.age`（数值排序），无 filterSearch、无筛选。
 * - Address 列：`filters`（London / New York）+ `filterSearch: true` +
 *   `onFilter: (value) => record.address.startsWith(value)` + `width: '40%'`。
 * - `onChange(pagination, filters, sorter, extra)`：点排序/应用筛选触发，console.log 各参数。
 * - data 4 行与 antd 一致（John Brown / Jim Green / Joe Black / Jim Red）。
 *
 * === S6 新增演示点 ===
 *
 * 1. filterSearch: true → 内置 menu 面板顶部渲染 antd `<Input>` 搜索框（放大镜前缀 + placeholder 'Search'）。
 * 2. 输入实时过滤筛选项列表（默认匹配：item.text 转字符串 trim+toLowerCase 后**包含**输入即命中）。
 * 3. 输入为空 → 显示全部筛选项（不过滤）。
 * 4. 关闭下拉时清空搜索值（下次打开为空，对齐 antd）。
 * 5. 搜索框只过滤**显示哪些筛选项**，不影响"已勾选的筛选值"——搜索过滤与勾选状态解耦。
 *
 * === 简化说明 ===
 *
 * - antd demo Name 列为 `filterMode: 'tree'`（树形筛选 UI）。tree 模式属 S7，本阶段未实现树形 UI，
 *   故本 demo 去掉 `filterMode: 'tree'`，按 menu 模式渲染。filterSearch 本身与菜单/树形无关——
 *   搜索框 + 默认 contains 匹配逻辑在 menu 模式下与 antd 一致。
 *
 * === 验证点（S6）===
 *
 * 1. Name 列漏斗：打开下拉 → 顶部有搜索框（放大镜 + 'Search' placeholder）。
 * 2. 输入 'cat' → 只显示 'Category 1' / 'Category 2'（默认 contains，大小写不敏感）。
 * 3. 输入 'joe' → 只显示 'Joe'。
 * 4. 输入空 → 显示全部 3 项。
 * 5. 关闭再打开下拉 → 搜索框为空（关闭清空生效）。
 * 6. Address 列同理（搜索 'lon' → 只显示 'London'）。
 * 7. Age 列无 filterSearch，下拉（其实 Age 无 filters，漏斗不渲染）；排序正常。
 * 8. 勾选 Joe → 表格只剩 name 以 'Joe' 开头的行（Joe Black）。
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
      { text: 'Category 1', value: 'Category 1' },
      { text: 'Category 2', value: 'Category 2' },
    ],
    // S6：筛选项搜索（默认 contains 匹配）。
    // ★ antd demo 此处带 filterMode: 'tree'（树形属 S7 未实现），本 demo 去掉，用默认 menu 模式。
    filterSearch: true,
    onFilter: (value, record) => record.name.startsWith(value as string),
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
  console.log('filter-search demo onChange params:', { pagination, filters, sorter, extra })
}

export default function FilterSearchDemo() {
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
          <b>S6 筛选项搜索 filterSearch</b>（menu 模式）：
        </p>
        <p style={{ margin: 0 }}>
          - <code>Name</code>：<code>filters</code>（Joe/Category 1/Category 2）+
          <code>filterSearch: true</code> + <code>onFilter: name.startsWith</code>。
          ★ antd 原为 <code>filterMode:'tree'</code>，树形属 S7 未实现，本 demo 用默认 menu 演示。
        </p>
        <p style={{ margin: 0 }}>
          - <code>Age</code>：<code>sorter</code>（数值，无 filterSearch）。
        </p>
        <p style={{ margin: 0 }}>
          - <code>Address</code>：<code>filters</code>（London/New York）+
          <code>filterSearch: true</code> + <code>onFilter</code>。
        </p>
        <p style={{ margin: 0 }}>
          - 点漏斗打开下拉：顶部出现搜索框（放大镜 + 'Search' placeholder）。输入实时过滤筛选项列表
          （默认 contains：item.text 转小写包含输入即命中，大小写不敏感）。输入空 → 显示全部。
        </p>
        <p style={{ margin: 0 }}>
          - 关闭下拉时清空搜索值（下次打开为空）。打开 console 查看 onChange 参数（extra.action='filter'）。
        </p>
      </div>
    </div>
  )
}
