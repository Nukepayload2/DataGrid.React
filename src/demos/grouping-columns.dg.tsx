import { Table } from '../table'
import type { ColumnType } from '../table'
import { type DataType, initialData } from './_compare/grouping-columns.shared'

// 左栏（data-grid）列定义

const dgColumns: ColumnType<DataType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    width: 100,
    fixed: 'start',
    filters: [
      {
        text: 'Joe',
        value: 'Joe',
      },
      {
        text: 'John',
        value: 'John',
      },
    ],
    onFilter: (value, record) => record.name.indexOf(value as string) === 0,
  },
  {
    title: 'Other',
    children: [
      {
        title: 'Age',
        dataIndex: 'age',
        key: 'age',
        width: 150,
        sorter: (a, b) => a.age - b.age,
      },
      {
        title: 'Address',
        children: [
          {
            title: 'Street',
            dataIndex: 'street',
            key: 'street',
            width: 150,
          },
          {
            title: 'Block',
            children: [
              {
                title: 'Building',
                dataIndex: 'building',
                key: 'building',
                width: 100,
              },
              {
                title: 'Door No.',
                dataIndex: 'number',
                key: 'number',
                width: 100,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Company',
    children: [
      {
        title: 'Company Address',
        dataIndex: 'companyAddress',
        key: 'companyAddress',
        width: 200,
      },
      {
        title: 'Company Name',
        dataIndex: 'companyName',
        key: 'companyName',
      },
    ],
  },
  {
    title: 'Gender',
    dataIndex: 'gender',
    key: 'gender',
    width: 80,
    fixed: 'end',
  },
]

export default function GroupingColumnsDg({
  bordered = true,
  size = 'medium',
  virtual = false,
  data = initialData,
}: {
  bordered: boolean
  size: 'medium' | 'large'
  virtual: boolean
  data: DataType[]
}) {
  return (
    /* 父容器固定像素高 473px — 详见 docs/design-notes/layout.md
       = 表头 4 行 medium(~47×4 ≈ 188) + 表体 235 + 分页条 ~50，对齐 antd scroll.y:47*5=235。
       须用固定像素而非 height:100%（SplitDemo body 无视口约束会无限高）。表头高随 size 变，
       切 large 需重测。 */
    <div style={{ height: '473px' }}>
      <Table<DataType>
        columns={dgColumns}
        dataSource={data}
        bordered={bordered}
        size={size === 'medium' ? 'middle' : 'large'}
        /* 虚拟化开关接入：ON 时叠加 virtual=true；scroll 保持 {x:'calc(700px+50%)', y:true}
           （data-grid 接受字符串 x + y:true 数据区域模式，已有 473px 父高限高，虚拟滚动区生效）。 */
        virtual={virtual}
        scroll={{ x: 'calc(700px + 50%)', y: true }}
        /* 显式采用默认分页配置；不传 pagination 时也会按 antd 默认开启。 */
        pagination={{}}
      />
    </div>
  )
}

