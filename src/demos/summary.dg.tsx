/**
 * summary demo 的 data-grid 段（左栏）。
 *
 * 两个示例各自导出命名组件，由 summary.tsx 父组件分别放进两个 SplitDemo：
 *   - `SummaryTotalDg`：示例1（计算总计，函数 summary 接收 pageData）。
 *   - `SummaryFixedDg`：示例2（Table.Summary fixed sticky bottom，scroll.y:true 数据区域模式）。
 * - 默认导出 `SummaryDg`：Flex vertical 堆叠两个示例。
 *
 * 示例2 的 `Table.Summary fixed` 是 summary 节点属性（非外部控制条开关），
 * 故 fixed 不提升父，留在子组件内固定为 true。
 */
import { Flex, Typography } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import {
  dataSource,
  fixedDataSource,
  type DataType,
  type FixedDataType,
} from './_compare/summary.shared'

const { Text } = Typography

// ---------------------------------------------------------------------------
// 示例 1（计算总计）列定义（Name / Borrow / Repayment）。
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<DataType>[] = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Borrow', dataIndex: 'borrow' },
  { title: 'Repayment', dataIndex: 'repayment' },
]

// ---------------------------------------------------------------------------
// 示例 2（fixed sticky bottom）列定义（Name fixed width:100 + Description）。
// ---------------------------------------------------------------------------

const dgFixedColumns: ColumnType<FixedDataType>[] = [
  { title: 'Name', dataIndex: 'name', fixed: true, width: 100 },
  { title: 'Description', dataIndex: 'description' },
]

// ---------------------------------------------------------------------------
// 示例 1：summary 函数计算总计（Total + Balance colSpan=2）
// ---------------------------------------------------------------------------

export function SummaryTotalDg({ virtual = false }: { virtual?: boolean } = {}) {
  return (
    <Table<DataType>
      bordered
      columns={dgColumns}
      dataSource={dataSource}
      pagination={false}
      /* ON 时 virtual=true + scroll.y:true（CSS 自适应填满 SplitDemo 限高）。 */
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

// ---------------------------------------------------------------------------
// 示例 2：Table.Summary fixed sticky bottom（滚动固定底部）
// 父容器需有明确 height：scroll.y:true 数据区域模式，表体 flex:1 填满容器剩余空间。
// 高度 550 对齐右栏 antd scroll.y:500 表体 + 表头 ~50。
// ---------------------------------------------------------------------------

export function SummaryFixedDg({ virtual = false }: { virtual?: boolean } = {}) {
  return (
    <div style={{ height: 550 }}>
      <Table<FixedDataType>
        columns={dgFixedColumns}
        dataSource={fixedDataSource}
        pagination={false}
        scroll={{ x: 2000, y: true }}
        bordered
        /* 已自带限高 div(550) + scroll.y:true（数据区域模式），ON 时叠加 virtual=true 切到虚拟；
           OFF 时不传 virtual，scroll.y 原值保留（fixed sticky bottom 仍生效）。 */
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

// ---------------------------------------------------------------------------
// 默认导出：Flex vertical 堆叠两个示例。
// ---------------------------------------------------------------------------

export default function SummaryDg({ virtual = false }: { virtual?: boolean } = {}) {
  return (
    <Flex vertical gap="middle">
      <SummaryTotalDg virtual={virtual} />
      <SummaryFixedDg virtual={virtual} />
    </Flex>
  )
}
