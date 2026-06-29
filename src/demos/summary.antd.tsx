/**
 * summary demo 的 antd 段（右栏），忠实复刻 antd summary demo。
 *
 * 两个示例各自导出命名组件：
 *   - `SummaryTotalAntd`：示例1（计算总计）。
 *   - `SummaryFixedAntd`：示例2（Table.Summary fixed sticky bottom，scroll.y:500 忠实官方）。
 * - 默认导出 `SummaryAntd`：Flex vertical 堆叠两个示例。
 *
 * 示例2 的 `Table.Summary fixed` 是 summary 节点属性，留在子组件内固定为 true。
 */
import { Flex, Table as AntdTable, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
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

const antdColumns: TableColumnsType<DataType> = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Borrow', dataIndex: 'borrow' },
  { title: 'Repayment', dataIndex: 'repayment' },
]

// ---------------------------------------------------------------------------
// 示例 2（fixed sticky bottom）列定义（Name fixed width:100 + Description）。
// ---------------------------------------------------------------------------

const antdFixedColumns: TableColumnsType<FixedDataType> = [
  { title: 'Name', dataIndex: 'name', fixed: true, width: 100 },
  { title: 'Description', dataIndex: 'description' },
]

// ---------------------------------------------------------------------------
// 示例 1：summary 函数计算总计（Total + Balance colSpan=2）
// ---------------------------------------------------------------------------

export function SummaryTotalAntd({ virtual = false }: { virtual?: boolean } = {}) {
  return (
    <AntdTable<DataType>
      bordered
      columns={antdColumns}
      dataSource={dataSource}
      pagination={false}
      /* ON 时 virtual=true + scroll.y:340（pagination={false} 无分页条，扣表头~55 → 约 340 塞进 pane）。 */
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

// ---------------------------------------------------------------------------
// 示例 2：Table.Summary fixed sticky bottom（滚动固定底部）
// antd scroll.y:500（忠实官方数字），与开关无关（fixed sticky bottom 仍生效）。
// ---------------------------------------------------------------------------

export function SummaryFixedAntd({ virtual = false }: { virtual?: boolean } = {}) {
  return (
    <AntdTable<FixedDataType>
      columns={antdFixedColumns}
      dataSource={fixedDataSource}
      pagination={false}
      scroll={{ x: 2000, y: 500 }}
      bordered
      /* 已自带 scroll.y:500，ON 时叠加 virtual=true 切到虚拟；OFF 时不传 virtual，scroll.y 原值保留。 */
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

// ---------------------------------------------------------------------------
// 默认导出：Flex vertical 堆叠两个示例。
// ---------------------------------------------------------------------------

export default function SummaryAntd({ virtual = false }: { virtual?: boolean } = {}) {
  return (
    <Flex vertical gap="middle">
      <SummaryTotalAntd virtual={virtual} />
      <SummaryFixedAntd virtual={virtual} />
    </Flex>
  )
}
