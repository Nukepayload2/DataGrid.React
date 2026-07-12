import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { data, type RecordType } from './_compare/reset-sorting-and-filtering.shared'

type OnChange = NonNullable<TableProps<RecordType>['onChange']>
type Filters = Parameters<OnChange>[1]
type GetSingle<T> = T extends (infer U)[] ? U : never
type Sorts = GetSingle<Parameters<OnChange>[2]>

function buildAntdColumns(
  filteredInfo: Filters,
  sortedInfo: Sorts,
): NonNullable<TableProps<RecordType>['columns']> {
  return [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      filters: [
        { text: 'Joe', value: 'Joe' },
        { text: 'Jim', value: 'Jim' },
      ],
      filteredValue: filteredInfo.name || null,
      onFilter: (value, record) => record.name.includes(value as string),
      sorter: (a, b) => a.name.length - b.name.length,
      sortOrder: sortedInfo.columnKey === 'name' ? sortedInfo.order : null,
      ellipsis: true,
    },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age',
      sorter: (a, b) => a.age - b.age,
      sortOrder: sortedInfo.columnKey === 'age' ? sortedInfo.order : null,
      ellipsis: true,
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      filters: [
        { text: 'London', value: 'London' },
        { text: 'New York', value: 'New York' },
      ],
      filteredValue: filteredInfo.address || null,
      onFilter: (value, record) => record.address.includes(value as string),
      sorter: (a, b) => a.address.length - b.address.length,
      sortOrder: sortedInfo.columnKey === 'address' ? sortedInfo.order : null,
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: 'active', value: 'active' },
        { text: 'inactive', value: 'inactive' },
        { text: 'pending', value: 'pending' },
      ],
      filteredValue: filteredInfo.status || null,
      onFilter: (value, record) => record.status === value,
      filterSearch: true,
      ellipsis: true,
    },
    {
      title: 'Tag',
      dataIndex: 'tag',
      key: 'tag',
      filters: [
        { text: 'vip', value: 'vip' },
        { text: 'normal', value: 'normal' },
      ],
      filteredValue: filteredInfo.tag || null,
      onFilter: (value, record) => record.tag === value,
      filterMode: 'tree',
      ellipsis: true,
    },
    {
      title: 'Empty',
      dataIndex: 'empty',
      key: 'empty',
      filters: [],
      filteredValue: filteredInfo.empty || null,
      onFilter: () => false,
      ellipsis: true,
    },
  ]
}

export default function ResetFilterAntd({
  filteredInfo = {},
  sortedInfo = {},
  bordered = false,
  virtual = false,
  onChange,
}: {
  filteredInfo: Filters
  sortedInfo: Sorts
  bordered: boolean
  virtual: boolean
  onChange?: OnChange
}) {
  const antdColumns = buildAntdColumns(filteredInfo, sortedInfo)

  return (
    <AntdTable<RecordType>
      columns={antdColumns}
      dataSource={data}
      onChange={onChange}
      bordered={bordered}
      virtual={virtual}
      scroll={virtual ? { y: 280 } : undefined}
    />
  )
}
