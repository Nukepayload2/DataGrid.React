import { useMemo } from 'react'
import { Table as AntdTable, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import type { RecordType } from './_compare/virtual-list.shared'

const { Text } = Typography

const antdColumns: TableColumnsType<RecordType> = [
  { title: 'ID', dataIndex: 'id', width: 100 },
  { title: 'FirstName', dataIndex: 'firstName', width: 150 },
  { title: 'LastName', dataIndex: 'lastName', width: 150 },
  { title: 'Age', dataIndex: 'age', width: 100 },
]

export interface VirtualSummaryAntdProps {
  /** 行数据（父组件 useMemo(getData(count)) 下发）。 */
  data: RecordType[]
  /**
   * antd#47184 的唯一官方 workaround：`<Table.Summary fixed>` 钉底。
   *
   * - **false（默认）**：virtual 下 summary 不带 fixed —— 如实呈现 #47184 的失效
   *   （summary 渲染异常 / 不可见 / 错位）。**禁止造假**：不要假装 summary 正常。
   * - **true**：启用 fixed —— 维护者确认的「虚拟下 summary 只能 fixed」workaround。
   */
  fixedSummary: boolean
}

/**
 * antd 侧：virtual + summary —— 如实呈现 #47184 失效。
 *
 * 维护者在 https://github.com/ant-design/ant-design/issues/47184 中确认：
 *   「虚拟下 summary 只能 fixed」——rc-table VirtualTable 用 rc-virtual-list
 *   自管表体滚动容器，`<tfoot>` 被甩到虚拟视口之外，非 fixed 的 summary 无法正常呈现。
 *
 * 本组件默认 `fixedSummary=false`（失效态），用户可在顶栏切换至 true 对照 workaround。
 */
export default function VirtualSummaryAntd({ data, fixedSummary }: VirtualSummaryAntdProps) {
  const { total, avgAge } = useMemo(() => {
    let sumAge = 0
    for (const r of data) sumAge += r.age
    return {
      total: data.length,
      avgAge: data.length ? sumAge / data.length : 0,
    }
  }, [data])

  const summaryContent = (
    <AntdTable.Summary.Row>
      <AntdTable.Summary.Cell index={0}>总计</AntdTable.Summary.Cell>
      <AntdTable.Summary.Cell index={1} colSpan={2}>
        共 <Text type="danger">{total.toLocaleString()}</Text> 行
      </AntdTable.Summary.Cell>
      <AntdTable.Summary.Cell index={3}>
        均龄 <Text type="danger">{avgAge.toFixed(1)}</Text>
      </AntdTable.Summary.Cell>
    </AntdTable.Summary.Row>
  )

  return (
    <AntdTable<RecordType>
      virtual
      columns={antdColumns}
      dataSource={data}
      rowKey="id"
      scroll={{ y: 400 }}
      pagination={false}
      summary={() =>
        fixedSummary ? (
          <AntdTable.Summary fixed>{summaryContent}</AntdTable.Summary>
        ) : (
          summaryContent
        )
      }
    />
  )
}
