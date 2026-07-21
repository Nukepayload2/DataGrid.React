import { useMemo } from 'react'
import { Typography } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import type { RecordType } from './_compare/virtual-list.shared'

const { Text } = Typography

// 4 列：ID / FirstName / LastName / Age。汇总行计算「共 N 行」+「均龄」。
const dgColumns: ColumnType<RecordType>[] = [
  { title: 'ID', dataIndex: 'id', width: 100 },
  { title: 'FirstName', dataIndex: 'firstName', width: 150 },
  { title: 'LastName', dataIndex: 'lastName', width: 150 },
  { title: 'Age', dataIndex: 'age', width: 100 },
]

export interface VirtualSummaryDgProps {
  /** 行数据（父组件 useMemo(getData(count)) 下发）。 */
  data: RecordType[]
}

/**
 * data-grid 侧：virtual + Table.Summary 共存。
 *
 * 关键机制（源码 `src/table/engine/Summary.tsx`）：
 *   - summary 的每个 Cell 作为独立 grid item 渲染到 grid 末尾，
 *     与表体共享滚动容器，但**不进虚拟窗口**（虚拟窗口只覆盖表体行）。
 *   - `<Table.Summary fixed>` 让 Cell `position: sticky; bottom: 0`，
 *     滚动表体时汇总行始终钉在视口底部。
 *
 * 这与 antd 在 virtual 下 summary 失效（#47184）形成对照。
 */
export default function VirtualSummaryDg({ data }: VirtualSummaryDgProps) {
  // 预计算汇总值——闭包绑定原始 data，不依赖 summary 回调的 pageData
  //   （虚拟模式下 pageData 语义不稳定，直接用全量数据更可靠）。
  const { total, avgAge } = useMemo(() => {
    let sumAge = 0
    for (const r of data) sumAge += r.age
    return {
      total: data.length,
      avgAge: data.length ? sumAge / data.length : 0,
    }
  }, [data])

  return (
    /* 父容器 height:440 对齐右栏 antd scroll.y:400 表体区——
       整表 = 表头(~40) + 表体(虚拟滚动) + summary(~40)。
       summary 作为独立 grid item 渲染到 grid 末尾，fixed sticky bottom 钉底。 */
    <div style={{ height: 440 }}>
      <Table<RecordType>
        bordered
        virtual
        columns={dgColumns}
        dataSource={data}
        rowKey="id"
        scroll={{ y: true }}
        pagination={false}
        gridOptions={{ rowHeight: 40, headerHeight: 40 }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>总计</Table.Summary.Cell>
              <Table.Summary.Cell index={1} colSpan={2}>
                共 <Text type="danger">{total.toLocaleString()}</Text> 行
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3}>
                均龄 <Text type="danger">{avgAge.toFixed(1)}</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </div>
  )
}
