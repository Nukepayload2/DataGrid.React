/**
 * 复刻 antd pagination demo：`G:\Projects\ant-design\components\table\demo\pagination.tsx`。
 *
 * === antd demo 要素（S11 分页集成与位置）===
 *
 * - columns：Name（render `<a>`）/ Age / Address / Tags（Tag 渲染，颜色按 tag 长度/kawaii 区分）/
 *   Action（Invite/Delete 链接）。
 * - 3 行数据（John Brown / Jim Green / Joe Black）。
 * - 顶部两个 `Radio.Group`：
 *     * topOptions：topStart / topCenter / topEnd / none（控制顶部 pagination 位置 + 对齐）。
 *     * bottomOptions：bottomStart / bottomCenter / bottomEnd / none（控制底部）。
 * - `pagination={{ placement: [top, bottom] }}`：v6 数组语义（placement[0]=顶部、placement[1]=底部）。
 *
 * === data-grid 实现（S11）要点 ===
 *
 * - 分页器用 antd `<Pagination>`（决策 6：非核心控件用 antd）。
 * - **★ data-grid 默认不分页**：本 demo 显式传 `pagination` 对象才启用（与 antd 默认开启分页不同）。
 *   其它现有 demo（basic/head/...）均未传 pagination → 全显，零回归。
 * - placement（v6 数组，以 antd 6.4.4 实测为准）：
 *     * 数组元素 ∈ 'topStart'|'topCenter'|'topEnd'|'bottomStart'|'bottomCenter'|'bottomEnd'|'none'。
 *     * 取"含 'top' 的首个元素"→顶部 + 对齐；"含 'bottom' 的首个元素"→底部 + 对齐。
 *     * 'none' 不含 top/bottom → 该侧不显示。默认 ['bottomEnd']。
 *     * 对齐映射：含 'center'→居中；含 'start'/'left'→左；否则→右（flex justifyContent）。
 * - demo 仅 3 行，pageSize 默认 10 → 1 页（分页器仍渲染以演示 placement）。
 *
 * === 与 antd 的差异 ===
 *
 * - 无差异（demo 1:1 复刻）。data-grid `pagination` prop 签名对齐 antd v6 TablePaginationConfig。
 *
 * === 验证点（S11）===
 *
 * 1. 默认 top=topStart, bottom=bottomEnd → 顶部左对齐 + 底部右对齐各一个分页器。
 * 2. 切 top → topCenter → 顶部分页器居中。
 * 3. 切 top → none → 顶部不显示分页器（仅底部）。
 * 4. 切 bottom → bottomCenter/bottomEnd/none 同理。
 * 5. 分页器显示当前数据信息（3 行，1 页）。
 * 6. 回归：basic/head 等未传 pagination 的 demo 仍全显无分页器。
 */

import { useState } from 'react'
import { Flex, Radio, Space, Tag } from 'antd'
import { Table } from '../table'
import type {
  ColumnType,
  TablePaginationPlacement,
} from '../table'

interface DataType {
  key: string
  name: string
  age: number
  address: string
  tags: string[]
}

const topOptions: Array<{ label: string; value: TablePaginationPlacement }> = [
  { label: 'topStart', value: 'topStart' },
  { label: 'topCenter', value: 'topCenter' },
  { label: 'topEnd', value: 'topEnd' },
  { label: 'none', value: 'none' },
]

const bottomOptions: Array<{ label: string; value: TablePaginationPlacement }> = [
  { label: 'bottomStart', value: 'bottomStart' },
  { label: 'bottomCenter', value: 'bottomCenter' },
  { label: 'bottomEnd', value: 'bottomEnd' },
  { label: 'none', value: 'none' },
]

const columns: ColumnType<DataType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <a>{text}</a>,
  },
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address',
  },
  {
    title: 'Tags',
    key: 'tags',
    dataIndex: 'tags',
    render: (tags: string[]) => (
      <Flex gap="small" align="center" wrap>
        {tags.map((tag) => {
          let color = tag.length > 5 ? 'geekblue' : 'green'
          if (tag === 'kawaii') {
            color = 'volcano'
          }
          return (
            <Tag color={color} key={tag}>
              {tag.toUpperCase()}
            </Tag>
          )
        })}
      </Flex>
    ),
  },
  {
    title: 'Action',
    key: 'action',
    render: (_, record) => (
      <Space size="middle">
        <a>Invite {record.name}</a>
        <a>Delete</a>
      </Space>
    ),
  },
]

const data: DataType[] = [
  {
    key: '1',
    name: 'John Brown',
    age: 32,
    address: 'New York No. 1 Lake Park',
    tags: ['nice', 'developer'],
  },
  {
    key: '2',
    name: 'Jim Green',
    age: 42,
    address: 'London No. 1 Lake Park',
    tags: ['kawaii'],
  },
  {
    key: '3',
    name: 'Joe Black',
    age: 32,
    address: 'Sydney No. 1 Lake Park',
    tags: ['cool', 'teacher'],
  },
]

const App: React.FC = () => {
  const [top, setTop] = useState<TablePaginationPlacement>('topStart')
  const [bottom, setBottom] = useState<TablePaginationPlacement>('bottomEnd')
  return (
    <div>
      <div>
        <Radio.Group
          style={{ marginBottom: 10 }}
          options={topOptions}
          value={top}
          onChange={(e) => {
            setTop(e.target.value)
          }}
        />
      </div>
      <Radio.Group
        style={{ marginBottom: 10 }}
        options={bottomOptions}
        value={bottom}
        onChange={(e) => {
          setBottom(e.target.value)
        }}
      />
      <Table<DataType>
        columns={columns}
        pagination={{ placement: [top, bottom] }}
        dataSource={data}
      />
    </div>
  )
}

export default App
