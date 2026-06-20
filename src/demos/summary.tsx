/**
 * 复刻 antd summary demo：`G:\Projects\ant-design\components\table\demo\summary.tsx`。
 *
 * === antd demo 要素（S22 汇总 summary）===
 *
 * 示例 1（计算总计）：
 * - bordered + pagination:false。
 * - 3 列：Name / Borrow / Repayment。
 * - 4 行数据（John Brown 10/33、Jim Green 100/0、Joe Black 10/10、Jim Red 75/45）。
 * - `summary={(pageData) => ...}`：函数接收当前页数据，计算 totalBorrow / totalRepayment，
 *   返回两行 summary：
 *     * Total 行：Name=Total，Borrow=<Text type="danger">{totalBorrow}</Text>，
 *       Repayment=<Text>{totalRepayment}</Text>。
 *     * Balance 行：Name=Balance，Borrow colSpan=2 = <Text type="danger">{totalBorrow - totalRepayment}</Text>。
 *
 * 示例 2（fixed sticky bottom）：
 * - bordered + scroll:{x:2000, y:true}（决策 7 CSS 自动适应高度）+ pagination:false。
 * - 2 列：Name（fixed, width:100）/ Description。
 * - 20 行数据（Light/Bamboo/Little 循环 + 固定 description）。
 * - `summary={() => <Table.Summary fixed>...}`：fixed sticky bottom，单行 Summary。
 *
 * === data-grid 实现（S22）要点 ===
 *
 * - `summary` prop：函数（接收 pagedDataSource 当前页数据）/ ReactNode。
 * - `Table.Summary`（容器，`fixed` 可选）/ `Table.Summary.Row`（行）/ `Table.Summary.Cell`
 *   （`index` 列索引 0-based + `colSpan` 跨列）。
 * - data-grid 用 CSS Grid 渲染：summary Cell 作为 grid item，按 `index`+`colSpan` 定位
 *   （`gridColumn: <index+1> / span <colSpan>`，`gridRow` 由引擎注入）。
 * - `fixed` sticky bottom：summary cell `position: sticky; bottom: 0`（配合 scroll.y）。
 *
 * === 与 antd 的差异 ===
 *
 * - antd summary 是 `<tfoot><tr><td colspan>`；data-grid 是 div + CSS Grid（无 tfoot）。
 * - 视觉等价：summary 在表体底部，Cell 按 index+colSpan 定位，fixed sticky bottom。
 *
 * === 验证点（S22）===
 *
 * 1. 示例 1：Total 行 + Balance 行渲染在表体底部；totalBorrow=195、totalRepayment=88、Balance=107。
 * 2. 示例 1：Balance 行 Borrow 列 colSpan=2（横跨 Borrow+Repayment 两列）。
 * 3. 示例 2：summary fixed sticky bottom——表体纵向滚动时 summary 固定在底部。
 * 4. 示例 2：scroll.x=2000 横向滚动，summary 与表体同步。
 * 5. 回归：无 summary prop 的 demo（basic/head/...）不渲染 summary 行。
 */

import { Flex, Typography } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'

const { Text } = Typography

interface DataType {
  key: string
  name: string
  borrow: number
  repayment: number
}

interface FixedDataType {
  key: React.Key
  name: string
  description: string
}

const columns: ColumnType<DataType>[] = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Borrow', dataIndex: 'borrow' },
  { title: 'Repayment', dataIndex: 'repayment' },
]

const dataSource: DataType[] = [
  { key: '1', name: 'John Brown', borrow: 10, repayment: 33 },
  { key: '2', name: 'Jim Green', borrow: 100, repayment: 0 },
  { key: '3', name: 'Joe Black', borrow: 10, repayment: 10 },
  { key: '4', name: 'Jim Red', borrow: 75, repayment: 45 },
]

const fixedColumns: ColumnType<FixedDataType>[] = [
  { title: 'Name', dataIndex: 'name', fixed: true, width: 100 },
  { title: 'Description', dataIndex: 'description' },
]

const fixedDataSource: FixedDataType[] = Array.from({ length: 20 }).map((_, i) => ({
  key: i,
  name: ['Light', 'Bamboo', 'Little'][i % 3],
  description: 'Everything that has a beginning, has an end.',
}))

export default function SummaryDemo() {
  return (
    <Flex vertical gap="small">
      {/* 示例 1：计算总计（ bordered + pagination:false + 函数 summary 接收 pageData） */}
      <Table<DataType>
        bordered
        columns={columns}
        dataSource={dataSource}
        pagination={false}
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

      {/* 示例 2：fixed sticky bottom + scroll（决策 7：横向 2000 + 纵向 true CSS 自动适应）。
          ★ 父容器需有明确 height（这里固定 300px，约等价 antd y:500 视觉）。 */}
      <div style={{ height: 300 }}>
        <Table<FixedDataType>
          columns={fixedColumns}
          dataSource={fixedDataSource}
          pagination={false}
          scroll={{ x: 2000, y: true }}
          bordered
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

      {/* 说明区（外壳仿现有 demo） */}
      <div
        style={{
          padding: 12,
          background: '#fafafa',
          borderRadius: 8,
          color: 'rgba(0,0,0,0.65)',
          fontSize: 12,
          lineHeight: 1.8,
        }}
      >
        <p style={{ margin: '0 0 4px' }}>
          <b>S22 汇总 summary</b>（对齐 antd summary demo）：
        </p>
        <p style={{ margin: 0 }}>
          - 示例 1：<code>summary=&#123;(pageData) =&gt; ...&#125;</code> 计算总计——
          Total 行（Borrow=<Text type="danger">195</Text> / Repayment=<Text>88</Text>）+
          Balance 行（colSpan=2 = <Text type="danger">107</Text>）。
        </p>
        <p style={{ margin: 0 }}>
          - 示例 2：<code>&lt;Table.Summary fixed&gt;</code> sticky bottom——表体纵向滚动时 summary
          固定底部；<code>scroll=&#123;&#123; x: 2000, y: true &#125;&#125;</code> 横纵向滚动（决策 7 CSS 自动适应高度）。
        </p>
        <p style={{ margin: 0 }}>
          - <code>Table.Summary.Cell</code>：<code>index</code>（列索引 0-based）+ <code>colSpan</code>（跨列）。
        </p>
        <p style={{ margin: 0 }}>
          - 回归：无 summary prop 的 demo 不渲染 summary 行。
        </p>
      </div>
    </Flex>
  )
}
