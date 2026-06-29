/**
 * custom-empty demo 的 data-grid 段（左栏）。
 *
 * props：`{ bordered, dataSource, emptyText, virtual }`（由父组件传）。
 * 自包含 `<ConfigProvider renderEmpty>` 包 `<Table locale.emptyText>`。
 *
 * ConfigProvider.renderEmpty 仅处理 'Table.filter'（filter 下拉内 filters 空时占位），
 * 返回 `<Empty PRESENTED_IMAGE_SIMPLE>`；表体空状态（'Table'）走 Table 级 locale.emptyText。
 */
import type { GetProp } from 'antd'
import { ConfigProvider, Empty } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { type RecordType } from './_compare/custom-empty.shared'

// ConfigProvider.renderEmpty：仅处理 'Table.filter'（filter 下拉内 filters 空时的占位），
// 返回自定义 Empty（SIMPLE 图标）。表体空状态（'Table'）不处理——走 Table 级 locale.emptyText。
const renderEmpty: GetProp<typeof ConfigProvider, 'renderEmpty'> = (componentName) => {
  if (componentName === 'Table.filter') {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No Filter(Custom)" />
  }
  return undefined
}

/**
 * 左栏 data-grid 子组件。
 */
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
  // Age 列只 filters 无 onFilter。空数据态 filters=[] → 点 Age 漏斗显示 'Table.filter' 占位。
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
        // pagination={{}} 对齐右栏 antd 默认分页（antd 对任意数据都渲染 .ant-pagination）。
        pagination={{}}
        /* ON 时 virtual=true + scroll.y:true（CSS 自适应填满 SplitDemo 限高）。
           空数据态虚拟化无可见效果但不报错。 */
        virtual={virtual}
        scroll={virtual ? { y: true } : undefined}
      />
    </ConfigProvider>
  )
}
