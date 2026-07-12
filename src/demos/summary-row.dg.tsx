import { Flex, Typography } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import {
  dataSource,
  fixedDataSource,
  type DataType,
  type FixedDataType,
} from './_compare/summary-row.shared'

const { Text } = Typography

const dgColumns: ColumnType<DataType>[] = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Borrow', dataIndex: 'borrow' },
  { title: 'Repayment', dataIndex: 'repayment' },
]

const dgFixedColumns: ColumnType<FixedDataType>[] = [
  { title: 'Name', dataIndex: 'name', fixed: true, width: 100 },
  { title: 'Description', dataIndex: 'description' },
]

export function SummaryTotalDg({ virtual = false }: { virtual?: boolean } = {}) {
  return (
    <Table<DataType>
      bordered
      columns={dgColumns}
      dataSource={dataSource}
      pagination={false}
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
      summary={(pageData) => {
        let totalBorrow = 0
        let totalRepayment = 0
        pageData.forEach(({ borrow, repayment }) => {
          totalBorrow += borrow
          totalRepayment += repayment
        })
        return (
          <>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>Total</Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <Text type="danger">{totalBorrow}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2}>
                <Text>{totalRepayment}</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>Balance</Table.Summary.Cell>
              <Table.Summary.Cell index={1} colSpan={2}>
                <Text type="danger">{totalBorrow - totalRepayment}</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </>
        )
      }}
    />
  )
}

export function SummaryFixedDg({ virtual = false }: { virtual?: boolean } = {}) {
  return (
    <div style={{ height: 550 }}>
      <Table<FixedDataType>
        columns={dgFixedColumns}
        dataSource={fixedDataSource}
        pagination={false}
        scroll={{ x: 2000, y: true }}
        bordered
        virtual={virtual}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>Summary</Table.Summary.Cell>
              <Table.Summary.Cell index={1}>This is a summary content</Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </div>
  )
}

export default function SummaryDg({ virtual = false }: { virtual?: boolean } = {}) {
  return (
    <Flex vertical gap="middle">
      <SummaryTotalDg virtual={virtual} />
      <SummaryFixedDg virtual={virtual} />
    </Flex>
  )
}
