/**
 * custom-empty demo 的 antd 段（右栏），忠实复刻 antd custom-empty demo。
 *
 * props：`{ bordered, dataSource, emptyText, virtual }`（由父组件传）。
 * 自包含 `<ConfigProvider renderEmpty>` 包 `<AntdTable locale.emptyText>`。
 */
import type { GetProp, TableProps } from 'antd'
import { ConfigProvider, Empty, Table as AntdTable } from 'antd'
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
 * 右栏 antd 子组件。
 */
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
  // Age 列只有 filters（无 onFilter）。
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
        /* ON 时 virtual=true + scroll.y:280（antd 默认分页条画在 scroll.y 之外，
           需扣除表头~55 与分页条~64 → 约 280 塞进 ~400px pane）。 */
        virtual={virtual}
        scroll={virtual ? { y: 280 } : undefined}
      />
    </ConfigProvider>
  )
}
