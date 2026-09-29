import { Table as AntdTable } from 'antd'
import type { TableColumnsType } from 'antd'
import { type DataType, initialData } from './_compare/grouped-header.shared'

// 右栏（antd）列定义 —— 忠实复刻 antd 官方 grouping-columns demo

const antdColumns: TableColumnsType<DataType> = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    width: 100,
    fixed: 'left',
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
    fixed: 'right',
  },
]

export default function GroupingColumnsAntd({
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
    <AntdTable<DataType>
      columns={antdColumns}
      dataSource={data}
      bordered={bordered}
      size={size}
      /* 虚拟化开关接入：ON 时 virtual=true + scroll.y:300（antd 默认渲染分页条，扣除表头~55 +
         分页条~50 塞进 split pane 限高）。
         antd virtual 要求 scroll.x 必须为数字（calc 字符串会抛 "scroll.x must be number"），
         故 ON 时 x 改传数字 2000（按列宽估算取保险值足够触发横滚）；
         OFF 时回原 {x:'calc(700px+50%)', y:47*5}。详见 docs/features/scrolling/virtualization.md */
      virtual={virtual}
      scroll={virtual ? { x: 2000, y: 300 } : { x: 'calc(700px + 50%)', y: 47 * 5 }}
    />
  )
}

