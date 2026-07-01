import { Flex, Table as AntdTable, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import {
  dataSource,
  fixedDataSource,
  type DataType,
  type FixedDataType,
} from './_compare/summary.shared'

const { Text } = Typography

const antdColumns: TableColumnsType<DataType> = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Borrow', dataIndex: 'borrow' },
  { title: 'Repayment', dataIndex: 'repayment' },
]

const antdFixedColumns: TableColumnsType<FixedDataType> = [
  { title: 'Name', dataIndex: 'name', fixed: true, width: 100 },
  { title: 'Description', dataIndex: 'description' },
]

export function SummaryTotalAntd({ virtual = false }: { virtual?: boolean } = {}) {
  return (
    <AntdTable<DataType>
      bordered
      columns={antdColumns}
      dataSource={dataSource}
      pagination={false}
      virtual={virtual}
      scroll={virtual ? { y: 340 } : undefined}
      summary={(pageData) => {
        let totalBorrow = 0
        let totalRepayment = 0
        pageData.forEach(({ borrow, repayment }) => {
          totalBorrow += borrow
          totalRepayment += repayment
        })
        return (
          <>
            <AntdTable.Summary.Row>
              <AntdTable.Summary.Cell index={0}>Total</AntdTable.Summary.Cell>
              <AntdTable.Summary.Cell index={1}>
                <Text type="danger">{totalBorrow}</Text>
              </AntdTable.Summary.Cell>
              <AntdTable.Summary.Cell index={2}>
                <Text>{totalRepayment}</Text>
              </AntdTable.Summary.Cell>
            </AntdTable.Summary.Row>
            <AntdTable.Summary.Row>
              <AntdTable.Summary.Cell index={0}>Balance</AntdTable.Summary.Cell>
              <AntdTable.Summary.Cell index={1} colSpan={2}>
                <Text type="danger">{totalBorrow - totalRepayment}</Text>
              </AntdTable.Summary.Cell>
            </AntdTable.Summary.Row>
          </>
        )
      }}
    />
  )
}

export function SummaryFixedAntd({ virtual = false }: { virtual?: boolean } = {}) {
  return (
    <AntdTable<FixedDataType>
      columns={antdFixedColumns}
      dataSource={fixedDataSource}
      pagination={false}
      scroll={{ x: 2000, y: 500 }}
      bordered
      virtual={virtual}
      summary={() => (
        <AntdTable.Summary fixed>
          <AntdTable.Summary.Row>
            <AntdTable.Summary.Cell index={0}>Summary</AntdTable.Summary.Cell>
            <AntdTable.Summary.Cell index={1}>This is a summary content</AntdTable.Summary.Cell>
          </AntdTable.Summary.Row>
        </AntdTable.Summary>
      )}
    />
  )
}

export default function SummaryAntd({ virtual = false }: { virtual?: boolean } = {}) {
  return (
    <Flex vertical gap="middle">
      <SummaryTotalAntd virtual={virtual} />
      <SummaryFixedAntd virtual={virtual} />
    </Flex>
  )
}
