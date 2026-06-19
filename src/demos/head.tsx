/**
 * 复刻 antd head demo（排序 + 筛选）：`G:\Projects\ant-design\components\table\demo\head.tsx`。
 *
 * === antd demo 要素（排序 + 筛选共存）===
 *
 * - Name 列：`sorter: (a,b) => a.name.length - b.name.length`（按名字字符串长度排序），
 *   `sortDirections: ['descend']`（点击循环：descend → null，不经过 ascend），
 *   `showSorterTooltip: { target: 'full-header' }`（hover 整表头格提示）。
 *   同时带 `filters`（Joe/Jim/Submenu→Green/Black）+ `onFilter`（按名字起始匹配）——
 *   排序 + 筛选共存（S1 + S3 组合，head demo 核心场景）。
 * - Age 列：`sorter: (a,b) => a.age - b.age`（数值排序），`defaultSortOrder: 'descend'`（初始降序）。
 *   无筛选。
 * - Address 列：带 `filters`（London/New York）+ `onFilter`（按地址起始匹配），无 sorter。
 *   `filterMultiple: false` 演示**单选筛选**（Radio）——与 Name 列的默认多选（Checkbox）对比。
 * - Table 级 `showSorterTooltip: { target: 'sorter-icon' }`（默认 tooltip 绑定到排序图标）。
 * - `onChange(pagination, filters, sorter, extra)`：点击排序/应用筛选触发，console.log 各参数。
 *
 * === S3 新增演示点 ===
 *
 * 1. 筛选漏斗图标：可筛选列表头格右侧渲染 FilterOutlined（灰）/ FilterFilled（激活高亮）。
 * 2. 筛选下拉（antd 组件）：点漏斗 → antd Dropdown 弹出，内含 Checkbox.Group（默认多选）或
 *    Radio.Group（filterMultiple=false 单选）+ 确定/重置 Button。
 * 3. filterMultiple：Name 列默认 true（Checkbox 多选，命中任一保留）；Address 列 false（Radio 单选）。
 * 4. filterOnClose：默认 true（关闭下拉即应用）；演示"点外部/ESC 关闭即应用筛选"。
 * 5. 排序 + 筛选叠加：antd 顺序 raw → sort → filter（先排序后过滤）；筛选结果基于排序后数据。
 * 6. onChange filters 形态：`{ [columnKey/dataIndex]: filteredValue[] | null }`——
 *    无激活筛选的列值为 null。
 *
 * === 简化说明 ===
 *
 * - showSorterTooltip 本阶段实现为简单 title 提示（hover 显示"点击排序"文案），非 antd 完整 Tooltip；
 *   target 区分（full-header / sorter-icon）记录但不做视觉区分（S1 非阻塞）。
 * - antd demo Name 列 filters 含 `Submenu`（children 二级菜单）——属 S7 树形筛选，本阶段扁平化为
 *   顶层项参与勾选（不做二级菜单 UI）。即 Green/Black 会作为顶层项出现在下拉里（与 antd 默认 menu
 *   模式下点开 Submenu 二级菜单的视觉不同，但筛选语义一致——这是 S3 已知简化，S7 落地二级菜单）。
 *
 * === 验证点（S1 + S3）===
 *
 * 【S1 排序】
 * 1. Age 列初始降序（defaultSortOrder: 'descend'）。
 * 2. 点击 Age 列表头循环排序（ascend→descend→null…）；从 descend 出发即 descend→null→ascend→descend。
 * 3. 点击 Name 列表头：sortDirections=['descend']，循环为 null→descend→null。
 * 4. 单列语义：点击新列清空旧列排序。
 * 5. 排序图标三态；当前排序列表头/表体淡灰底（dg-column-sort）。
 *
 * 【S3 筛选】
 * 6. Name 列漏斗：默认 FilterOutlined 灰；勾选 Joe+Jim 后变 FilterFilled 高亮，表格只剩名字以 Joe/Jim
 *    开头的行（命中任一保留，OR）。
 * 7. Address 列漏斗（单选 Radio）：选 London → 只剩 London 起始地址行；切换 New York → 单选互斥。
 * 8. filterOnClose=true（默认）：勾选后点外部/ESC 关闭下拉即应用（漏斗立即变 Filled）。
 * 9. 确定按钮：点 OK 也应用；重置按钮：清空当前勾选（草稿），需再关闭/确定才生效。
 * 10. onChange 回调：console.log filters（{ name: [...], address: [...] | null }），extra.action='filter'。
 * 11. 排序 + 筛选叠加：先按 Age 排序，再筛选 Name——筛选结果保持排序顺序（raw → sort → filter）。
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
    showSorterTooltip: { target: 'full-header' },
    // S3：筛选（与排序共存）。filters 含 children（Submenu）——S7 树形筛选，本阶段扁平化为顶层项。
    filters: [
      { text: 'Joe', value: 'Joe' },
      { text: 'Jim', value: 'Jim' },
      {
        text: 'Submenu',
        value: 'Submenu',
        children: [
          { text: 'Green', value: 'Green' },
          { text: 'Black', value: 'Black' },
        ],
      },
    ],
    // 筛选判定：名字以 value 开头（与 antd demo 一致）。
    onFilter: (value, record) => record.name.indexOf(value as string) === 0,
    sorter: (a, b) => a.name.length - b.name.length,
    sortDirections: ['descend'],
  },
  {
    title: 'Age',
    dataIndex: 'age',
    defaultSortOrder: 'descend',
    sorter: (a, b) => a.age - b.age,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    // S3：筛选 + filterMultiple=false（单选 Radio 演示）。
    filters: [
      { text: 'London', value: 'London' },
      { text: 'New York', value: 'New York' },
    ],
    onFilter: (value, record) => record.address.indexOf(value as string) === 0,
    filterMultiple: false,
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
  console.log('head demo onChange params:', { pagination, filters, sorter, extra })
}

export default function HeadDemo() {
  return (
    <div style={{ padding: 24 }}>
      <Table<DataType>
        columns={columns}
        dataSource={data}
        onChange={onChange}
        showSorterTooltip={{ target: 'sorter-icon' }}
      />
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
          <b>S1 单列排序 + S3 基础筛选</b>（排序+筛选共存）：
        </p>
        <p style={{ margin: 0 }}>
          - <code>Name</code>：<code>sorter</code> 按名字长度 + <code>sortDirections: ['descend']</code>；
          同时带 <code>filters</code>（Joe/Jim/Submenu→Green/Black，多选 Checkbox）+ <code>onFilter</code>。
        </p>
        <p style={{ margin: 0 }}>
          - <code>Age</code>：<code>sorter</code> 数值，<code>defaultSortOrder: 'descend'</code>（初始降序）。
        </p>
        <p style={{ margin: 0 }}>
          - <code>Address</code>：<code>filters</code>（London/New York）+ <code>filterMultiple: false</code>
          （单选 Radio）+ <code>onFilter</code>。
        </p>
        <p style={{ margin: 0 }}>
          - 点漏斗打开筛选下拉（antd 组件）：Checkbox 多选 / Radio 单选 + 确定/重置；filterOnClose=true（默认）
          关闭即应用。漏斗激活态（FilterFilled 高亮）反映当前筛选。
        </p>
        <p style={{ margin: 0 }}>
          - 排序+筛选叠加顺序：raw → sort → filter（与 antd 一致）。打开 console 查看 onChange 参数
          （filters 形态 <code>{'{ [key]: value[] | null }'}</code>，extra.action='filter'）。
        </p>
      </div>
    </div>
  )
}
