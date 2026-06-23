/**
 * 复刻 antd summary demo：`G:\Projects\ant-design\components\table\demo\summary.tsx`。
 *
 * === 决策 9 双栏对照（S22 汇总 summary）===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致——示例1 计算总计 + 示例2 fixed sticky bottom。
 * - **右栏（antd Table）**：忠实复刻 antd summary demo（antd 原生 `<Table>` + 同 columns/data +
 *   同 summary 函数）。antd 官方 demo 用 `antd-style` createStyles 自定义细滚动条，
 *   data-grid 项目未装 antd-style（决策 6），右栏删除 className（两侧均用浏览器默认滚动条）。
 * - **共享数据**：`DataType` / `FixedDataType` / `dataSource` / `fixedDataSource` 见
 *   `_compare/summary.shared.ts`，两侧复用。
 * - **无共享控制条**：summary demo 的两示例各自独立（示例1 静态 + 示例2 固定开关嵌在 Table.Summary
 *   fixed 属性中），不像 tree-table-ellipsis 有顶部 Switch；为忠实复刻 antd demo 结构，
 *   本 demo 不加控制条（两示例直接并排）。每示例左右各一对（共 4 张表）。
 *
 * === antd demo 要素（两示例，S22 汇总）===
 *
 * 示例 1（计算总计）：
 * - bordered + pagination:false。
 * - 3 列：Name / Borrow / Repayment。4 行数据。
 * - `summary={(pageData) => ...}`：函数接收当前页数据，计算 totalBorrow / totalRepayment，
 *   返回两行 summary：
 *     * Total 行：Name=Total，Borrow=`<Text type="danger">{totalBorrow}</Text>`，
 *       Repayment=`<Text>{totalRepayment}</Text>`。
 *     * Balance 行：Name=Balance，Borrow colSpan=2 = `<Text type="danger">{totalBorrow - totalRepayment}</Text>`。
 *
 * 示例 2（fixed sticky bottom）：
 * - bordered + scroll:{x:2000, y:500}（antd 数字）/ {x:2000, y:true}（data-grid 决策 7 CSS 自适应）+
 *   pagination:false。
 * - 2 列：Name（fixed, width:100）/ Description。20 行数据。
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
 * === 两侧保留的差异 ===
 *
 * 1. **scroll.y**：示例2 左栏 data-grid `scroll.y:true`（决策 7 CSS 自适应高度，父容器 height:550，
 *    对齐右栏 antd scroll.y:500 表体 + 表头 ~50 总高）；右栏 antd 数字 `scroll.y:500`（忠实官方）。
 * 2. **antd-style 细滚动条**：antd 官方 demo 用 antd-style 自定义细滚动条；data-grid 项目未装
 *    antd-style（决策 6），两侧均用浏览器默认（data-grid 侧走 #35 悬浮滚动条）。
 * 3. **DOM 结构**：antd summary 是 `<tfoot><tr><td colspan>`；data-grid 是 div + CSS Grid（无 tfoot）。
 *    视觉等价：summary 在表体底部，Cell 按 index+colSpan 定位，fixed sticky bottom。
 */

import { Flex, Table as AntdTable, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import {
  dataSource,
  fixedDataSource,
  type DataType,
  type FixedDataType,
} from './_compare/summary.shared'

const { Text } = Typography

// ---------------------------------------------------------------------------
// 示例 1（计算总计）列定义 —— 两侧字段逐字一致（Name/Borrow/Repayment）。
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<DataType>[] = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Borrow', dataIndex: 'borrow' },
  { title: 'Repayment', dataIndex: 'repayment' },
]

const antdColumns: TableColumnsType<DataType> = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Borrow', dataIndex: 'borrow' },
  { title: 'Repayment', dataIndex: 'repayment' },
]

// ---------------------------------------------------------------------------
// 示例 2（fixed sticky bottom）列定义 —— Name fixed width:100 + Description。
// ---------------------------------------------------------------------------

const dgFixedColumns: ColumnType<FixedDataType>[] = [
  { title: 'Name', dataIndex: 'name', fixed: true, width: 100 },
  { title: 'Description', dataIndex: 'description' },
]

const antdFixedColumns: TableColumnsType<FixedDataType> = [
  { title: 'Name', dataIndex: 'name', fixed: true, width: 100 },
  { title: 'Description', dataIndex: 'description' },
]

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function SummaryDemo() {
  return (
    <div style={{ padding: 24 }}>
      <Flex vertical gap="middle">
        {/*
          示例 1（计算总计）：两侧并排对照。
          minPaneWidth=600（3 列窄表）→ 横排阈值 ≈ 1216，常规视口（≥1280）横排。
        */}
        <div>
          <div
            style={{
              marginBottom: 8,
              fontWeight: 600,
              color: 'rgba(0,0,0,0.85)',
            }}
          >
            示例 1：summary 函数计算总计（Total + Balance colSpan=2）
          </div>
          <SplitDemo
            minPaneWidth={600}
            left={
              <Table<DataType>
                bordered
                columns={dgColumns}
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
            }
            right={
              <AntdTable<DataType>
                bordered
                columns={antdColumns}
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
            }
          />
        </div>

        {/*
          示例 2（fixed sticky bottom）：两侧并排对照。
          左栏 data-grid scroll.y:true（决策 7 CSS 自适应高度，父容器 height:550，
          对齐右栏 antd scroll.y:500 表体 + 表头 ~50 总高）。
          右栏 antd scroll.y:500（忠实官方数字）。
          minPaneWidth=600（2 列，scroll.x:2000 宽表）→ 横排阈值 ≈ 1216。
        */}
        <div>
          <div
            style={{
              marginBottom: 8,
              fontWeight: 600,
              color: 'rgba(0,0,0,0.85)',
            }}
          >
            示例 2：Table.Summary fixed sticky bottom（滚动固定底部）
          </div>
          <SplitDemo
            minPaneWidth={600}
            left={
              /* 决策 7：父容器需有明确 height。scroll.y:true 数据区域模式，
                 表体 flex:1 填满容器剩余空间。
                 ★ 高度对齐右栏：右栏 antd scroll.y:500（表体 500px）+ 表头 ~50px ≈ 550px 总高。
                   此前左栏 height:300 与右栏 550 视觉不等（表体可滚动区域高度不同），
                   现统一为 550，两侧表体可视行数/滚动条位置一致。 */
              <div style={{ height: 550 }}>
                <Table<FixedDataType>
                  columns={dgFixedColumns}
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
            }
            right={
              <AntdTable<FixedDataType>
                columns={antdFixedColumns}
                dataSource={fixedDataSource}
                pagination={false}
                scroll={{ x: 2000, y: 500 }}
                bordered
                summary={() => (
                  <AntdTable.Summary fixed>
                    <AntdTable.Summary.Row>
                      <AntdTable.Summary.Cell index={0}>Summary</AntdTable.Summary.Cell>
                      <AntdTable.Summary.Cell index={1}>This is a summary content</AntdTable.Summary.Cell>
                    </AntdTable.Summary.Row>
                  </AntdTable.Summary>
                )}
              />
            }
          />
        </div>
      </Flex>

      {/*
        底部说明区（SplitDemo 之外的独立块，两个示例共用一份说明）。
      */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: '#fafafa',
          borderRadius: 8,
          color: 'rgba(0,0,0,0.65)',
          fontSize: 12,
          lineHeight: 1.8,
        }}
      >
        <p style={{ margin: '0 0 4px' }}>
          <b>对照说明（决策 9 B16 / S22 汇总 summary）：</b>
          左右并排呈现 data-grid 与 antd summary demo（示例1 计算总计 + 示例2 fixed sticky bottom）。
        </p>
        <p style={{ margin: 0 }}>
          - 示例 1：<code>summary=&#123;(pageData) =&gt; ...&#125;</code> 计算总计——
          Total 行（Borrow=<Text type="danger">195</Text> / Repayment=<Text>88</Text>）+
          Balance 行（colSpan=2 = <Text type="danger">107</Text>）。
        </p>
        <p style={{ margin: 0 }}>
          - 示例 2：<code>&lt;Table.Summary fixed&gt;</code> sticky bottom——表体纵向滚动时 summary
          固定底部；左 data-grid <code>scroll.y:true</code>（决策 7 CSS 自适应高度，父容器 height:550，
          对齐右栏 antd scroll.y:500 表体 + 表头 ~50 总高）；
          右 antd <code>scroll.y:500</code>（忠实官方数字）。
        </p>
        <p style={{ margin: 0 }}>
          - <code>Table.Summary.Cell</code>：<code>index</code>（列索引 0-based）+ <code>colSpan</code>（跨列）。
        </p>
        <p style={{ margin: 0 }}>
          - antd-style 细滚动条差异：antd 官方 demo 用 antd-style；项目未装（决策 6），两侧均用默认滚动条
          （data-grid 侧走 #35 悬浮滚动条）。
        </p>
      </div>
    </div>
  )
}
