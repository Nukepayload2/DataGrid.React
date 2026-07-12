import type { GetProp } from 'antd'
import { ConfigProvider, Empty } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { type RecordType } from './_compare/custom-empty-state.shared'
const renderEmpty: GetProp<typeof ConfigProvider, 'renderEmpty'> = (componentName) => {
  if (componentName === 'Table.filter') {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No Filter(Custom)" />
  }
  return undefined
}
export default function CustomEmptyDg({
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
  const dgColumns: ColumnType<RecordType>[] = [
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
      <Table<RecordType>
        bordered={bordered}
        dataSource={dataSource}
        columns={dgColumns}
        locale={{ emptyText }}
        pagination={{}}
        virtual={virtual}
        scroll={virtual ? { y: true } : undefined}
      />
    </ConfigProvider>
  )
}


