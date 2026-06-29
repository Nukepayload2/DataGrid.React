/**
 * summary demo 的 data-grid 段（左栏），从 summary.tsx 拆出。
 *
 * - 两个示例各自导出命名组件，由 summary.tsx 父组件分别放进两个 SplitDemo（每示例一对左右栏）：
 *     * `SummaryTotalDg`：示例1（计算总计，函数 summary 接收 pageData）。
 *     * `SummaryFixedDg`：示例2（Table.Summary fixed sticky bottom，scroll.y:true 数据区域模式）。
 * - 默认导出 `SummaryDg`：在 Flex vertical 里渲染两个示例（live 编辑模式 SplitDemoPreview 用，
 *   仅展示左栏 dg 侧两示例堆叠，不对照；默认模式不走这里）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - virtual=false（OFF 回 undefined scroll，行为与改造前一致；示例2 已自带 scroll.y:true 保留）。
 * 编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll} 仅含 virtual（两示例均 bordered 固定 true、
 * 无 size/autoScroll 概念），子组件用合理默认值兜底；示例数据用 shared 初始数据（非空）。
 *
 * === ★ 示例2 fixed sticky bottom 不提升父（决策）===
 * 示例2 的 `Table.Summary fixed` 是 summary 节点的属性（非外部控制条开关），嵌在 summary 函数返回的
 * `<Table.Summary fixed>` 中，不是父级控制条直接操作的开关。故 fixed 不提升父，留在子组件内固定为
 * true（对齐改造前行为）。本 demo 无共享控制条（两示例各自独立），virtual 是唯一父传 prop。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/summary.shared'` / `'antd'`），源码可原样展示无需路径改写。
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
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
         限高）；OFF 时回 undefined，行为与改造前一致。 */
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
// 决策 7：父容器需有明确 height。scroll.y:true 数据区域模式，表体 flex:1 填满容器剩余空间。
// 高度 550 对齐右栏 antd scroll.y:500 表体 + 表头 ~50 总高。
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
        /* 全局虚拟化开关接入：本示例已自带限高 div(550) + scroll.y:true（M8 数据区域模式），
           开关 ON 时叠加 virtual=true，从 M8 切到 M4 虚拟；OFF 时不传 virtual，scroll.y 原值
           保留（fixed sticky bottom 仍生效），行为与改造前一致。 */
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
// 默认导出（live 编辑用）：Flex vertical 堆叠两个示例。
// 默认模式 SplitDemoPreview 默认模式不走这里（走父文件真实 SplitDemo 双栏）。
// ---------------------------------------------------------------------------

export default function SummaryDg({ virtual = false }: { virtual?: boolean } = {}) {
  return (
    <Flex vertical gap="middle">
      <SummaryTotalDg virtual={virtual} />
      <SummaryFixedDg virtual={virtual} />
    </Flex>
  )
}
