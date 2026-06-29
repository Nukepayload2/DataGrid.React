/**
 * summary demo 的 antd 段（右栏），从 summary.tsx 拆出。
 *
 * - 两个示例各自导出命名组件，由 summary.tsx 父组件分别放进两个 SplitDemo（每示例一对左右栏）：
 *     * `SummaryTotalAntd`：示例1（计算总计，函数 summary 接收 pageData）。
 *     * `SummaryFixedAntd`：示例2（Table.Summary fixed sticky bottom，scroll.y:500 忠实官方）。
 * - 默认导出 `SummaryAntd`：在 Flex vertical 里渲染两个示例（live 编辑模式 SplitDemoPreview 用，
 *   仅展示右栏 antd 侧两示例堆叠，不对照；默认模式不走这里）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - virtual=false（OFF 回 undefined scroll，行为与改造前一致；示例2 已自带 scroll.y:500 保留）。
 * 编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll} 仅含 virtual（两示例均 bordered 固定 true、
 * 无 size/autoScroll 概念），子组件用合理默认值兜底；示例数据用 shared 初始数据（非空）。
 *
 * === ★ 示例2 fixed sticky bottom 不提升父（决策）===
 * 示例2 的 `Table.Summary fixed` 是 summary 节点的属性（非外部控制条开关），嵌在 summary 函数返回的
 * `<AntdTable.Summary fixed>` 中，不是父级控制条直接操作的开关。故 fixed 不提升父，留在子组件内固定为
 * true（对齐改造前行为）。本 demo 无共享控制条（两示例各自独立），virtual 是唯一父传 prop。
 *
 * === 两侧保留的差异（搬入子文件后维持）===
 * 1. scroll.y：示例1 ON 时 antd y:340（pagination={false} 无分页条，仅扣表头~55）；
 *    示例2 antd y:500（忠实官方数字），与开关无关（fixed sticky bottom 仍生效）。
 * 2. antd-style 细滚动条：antd 官方 demo 用 antd-style；项目未装（决策 6），两侧均用默认滚动条。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/summary.shared'`）。
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
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:340（pagination={false} 无分页条，
         仅扣除表头~55 → 约 340 塞进 split pane 限高；OFF 时回 undefined）。 */
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
      /* 全局虚拟化开关接入：本示例已自带 scroll.y:500（M8 模式），开关 ON 时叠加 virtual=true
         切到 M4 虚拟；OFF 时不传 virtual，scroll.y 原值保留，行为与改造前一致。 */
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
// 默认导出（live 编辑用）：Flex vertical 堆叠两个示例。
// 默认模式 SplitDemoPreview 默认模式不走这里（走父文件真实 SplitDemo 双栏）。
// ---------------------------------------------------------------------------

export default function SummaryAntd({ virtual = false }: { virtual?: boolean } = {}) {
  return (
    <Flex vertical gap="middle">
      <SummaryTotalAntd virtual={virtual} />
      <SummaryFixedAntd virtual={virtual} />
    </Flex>
  )
}
