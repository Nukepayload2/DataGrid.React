import type { GetProp, TableProps } from 'antd'
import { ConfigProvider, Empty, Table as AntdTable } from 'antd'
import { type RecordType } from './_compare/custom-empty-state.shared'
const renderEmpty: GetProp<typeof ConfigProvider, 'renderEmpty'> = (componentName) => {
  if (componentName === 'Table.filter') {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No Filter(Custom)" />
  }
  return undefined
}
export default function CustomEmptyAntd({
  bordered = true,
  dataSource = [],
  emptyText = <Empty description="No Data" />,
  virtual = false,
}: {
  bordered?: boolean
  dataSource?: RecordType[]
  emptyText?: import('react').ReactNode
  virtual?: boolean
}) {
  const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age',
      filters: dataSource.length
        ? [
            { text: '>=35', value: 'gte35' },
            { text: '<18', value: 'lt18' },
          ]
        : [],
    },
    { title: 'Address', dataIndex: 'address', key: 'address' },
  ]

  return (
    <ConfigProvider renderEmpty={renderEmpty}>
      <AntdTable<RecordType>
        bordered={bordered}
        dataSource={dataSource}
        columns={antdColumns}
        locale={{ emptyText }}
        virtual={virtual}
        scroll={virtual ? { y: 280 } : undefined}
      />
    </ConfigProvider>
  )
}


