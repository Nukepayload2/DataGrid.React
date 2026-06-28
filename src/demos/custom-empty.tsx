/**
 * 复刻 antd custom-empty demo：`G:\Projects\ant-design\components\table\demo\custom-empty.tsx`。
 *
 * === antd demo 要素（S23 自定义空状态）===
 *
 * - `handleToggle`：切换 dataSource（空 ↔ 有数据）。有数据时随机 1-10 行；空时 dataSource = []。
 * - `columns`：Name / Age / Address。Age filters 随 dataSource 变化：有数据时 [{text:'>=35'},
 *   {text:'<18'}]，空时为 []（空数据态 filters 空 → 点 Age 漏斗显示 'Table.filter' 占位）。
 * - `locale.emptyText`：Table 级表体空状态文案 `<Empty description="No Data">{toggleButton}</Empty>`
 *   （含 toggle 按钮子节点——antd 同款）。空数据与筛选无结果共用。
 * - `<ConfigProvider renderEmpty={renderEmpty}>`：renderEmpty 仅处理 'Table.filter' →
 *   `<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No Filter(Custom)" />`。
 * - `bordered`。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（ConfigProvider.renderEmpty + locale.emptyText
 *   + 'Table'/'Table.filter' 语义，对齐 antd InternalTable.tsx:706-718 + FilterDropdown.tsx:395,410）。
 * - **右栏（antd Table）**：忠实复刻 antd custom-empty demo（antd 原生 ConfigProvider.renderEmpty
 *   + locale.emptyText）。
 * - **共享控制条**：共享 `dataSource` 状态（同一 toggle 同时驱动两侧）+ `Bordered` 开关。
 *   ★ 与 antd demo 差异：antd demo 初值 `useState(genFakeData)`（有数据）；data-grid 改造前初值
 *   `useState<DataType[]>([])`（空数据）。决策 9 共享状态下取空初值（data-grid 改造前行为），
 *   antd demo 「初值有数据」作为说明项登记（对照点：点 toggle 切换到有数据态对照）。
 * - **共享数据**：`RecordType` + `genFakeData` 见 `_compare/custom-empty.shared.ts`。
 *
 * === 'Table' vs 'Table.filter' 语义（memory antd-table-filter-empty-semantics）===
 *
 * - 'Table' = 表体 empty（空数据 + 筛选无结果，不区分）→ locale.emptyText。
 * - 'Table.filter' = filter 下拉内 filters 空时占位 → ConfigProvider.renderEmpty('Table.filter')。
 * 两侧语义一致（data-grid 已对齐 antd 源码），右栏 antd 天然正确，左栏 data-grid 已正确。
 */

import { useState } from 'react'
import type { GetProp } from 'antd'
import { Button, ConfigProvider, Empty, Space, Switch, Table as AntdTable, theme } from 'antd'
import type { TableProps } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { genFakeData, type RecordType } from './_compare/custom-empty.shared'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（split pane 自动限高）
import { useVirtualization } from './VirtualizationContext'

// ConfigProvider.renderEmpty：仅处理 'Table.filter'（filter 下拉内 filters 空时的占位），
// 返回自定义 Empty（SIMPLE 图标）。表体空状态（'Table'）不处理——走 Table 级 locale.emptyText。
const renderEmpty: GetProp<typeof ConfigProvider, 'renderEmpty'> = (componentName) => {
  if (componentName === 'Table.filter') {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No Filter(Custom)" />
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function App() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  // 初值空（data-grid 改造前行为）；antd demo 原本初值有数据（genFakeData），此处取空作为对照基线。
  const [dataSource, setDataSource] = useState<RecordType[]>([])
  const [bordered, setBordered] = useState(true)
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y（空数据时虚拟化无可见效果
  // 但不报错；有数据切换后正常虚拟）。
  const { virtual } = useVirtualization()
  // 控制条 chrome 文字色 token 化（colorTextSecondary≈rgba(0,0,0,0.65)），暗主题自适应。
  const { token } = theme.useToken()

  const handleToggle = () => {
    setDataSource(dataSource.length ? [] : genFakeData(Math.floor(Math.random() * 10)))
  }

  // ----- 左栏（data-grid）列定义 -----
  // ★ Age 列只 filters 无 onFilter（对齐 antd 官方 custom-empty.tsx:39-49——官方 demo 原样只有 filters）。
  // 改造前左栏多加了 onFilter 致「左可筛右不可筛」不等价，此处删 onFilter 与右栏一致。
  const dgColumns: ColumnType<RecordType>[] = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age',
      // 有数据时提供 filters（>=35 / <18），空时为 []。
      // 空数据态 filters=[] → 点 Age 漏斗显示 'Table.filter' 占位（"No Filter(Custom)"）。
      filters: dataSource.length
        ? [
            { text: '>=35', value: 'gte35' },
            { text: '<18', value: 'lt18' },
          ]
        : [],
    },
    { title: 'Address', dataIndex: 'address', key: 'address' },
  ]

  // ----- 右栏（antd）列定义（忠实 antd custom-empty demo，无 onFilter——antd demo 原样）-----
  const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age',
      filters: dataSource.length
        ? [
            { text: '>=35', value: 'gte35' },
            { text: '<18', value: 'lt18' },
          ]
        : [],
    },
    { title: 'Address', dataIndex: 'address', key: 'address' },
  ]

  const toggleButton = (
    <Button type="primary" onClick={handleToggle}>
      Toggle Data
    </Button>
  )

  // 两侧共用的 locale.emptyText（含 toggleButton 子节点——antd 同款）。
  const emptyText = <Empty description="No Data">{toggleButton}</Empty>

  return (
    <ConfigProvider renderEmpty={renderEmpty}>
      <div style={{ padding: 24 }}>
        {/* ★ 共享控制条：全宽，在 SplitDemo 上方。
            DemoToolbar 用 useToken（light≈#fff/#f0f0f0、dark/自定义 token 自适应），替代硬编码底/边色。 */}
        <DemoToolbar>
          <Space wrap>
            {dataSource.length ? toggleButton : null}
            <Switch
              checked={bordered}
              onChange={setBordered}
              checkedChildren="Bordered"
              unCheckedChildren="Bordered"
            />
            <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>
              当前：{dataSource.length ? `${dataSource.length} 行数据` : '空数据'}
              （空数据态点 Age 漏斗看 'Table.filter' 占位）
            </span>
          </Space>
        </DemoToolbar>

        {/*
          minPaneWidth=480（窄表，3 列，无 scroll.x）→ 横排阈值 ≈ 976。
          常规笔记本视口（≥1024）即可横排。
        */}
        <SplitDemo
          minPaneWidth={480}
          left={
            <Table<RecordType>
              bordered={bordered}
              dataSource={dataSource}
              columns={dgColumns}
              locale={{ emptyText }}
              // pagination={{}} 对齐右栏 antd 默认分页（antd 对任意数据都渲染 .ant-pagination）。
              pagination={{}}
              /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
                 限高）；OFF 时回 undefined，行为与改造前一致。空数据态虚拟化无可见效果但不报错。 */
              virtual={virtual}
              scroll={virtual ? { y: true } : undefined}
            />
          }
          right={
            /* 忠实复刻 antd custom-empty demo：antd Table + ConfigProvider.renderEmpty（外层已包）
               + locale.emptyText（含 toggleButton 子节点）。 */
            <AntdTable<RecordType>
              bordered={bordered}
              dataSource={dataSource}
              columns={antdColumns}
              locale={{ emptyText }}
              /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:280（antd 默认分页条画在 scroll.y
                 之外，需扣除表头~55 与分页条~64 → 约 280 才能塞进 ~400px pane；OFF 时回 undefined）。 */
              virtual={virtual}
              scroll={virtual ? { y: 280 } : undefined}
            />
          }
        >
          <div>
            <strong>对照说明（决策 9 T1）：</strong>左右并排呈现 data-grid 与 antd custom-empty demo。
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              <li>
                <strong>'Table' 表体 empty</strong>：两侧 locale.emptyText = <code>&lt;Empty description="No Data"&gt;</code>
                （含 Toggle Data 按钮）。空数据态两栏均显示「No Data」。
              </li>
              <li>
                <strong>'Table.filter' filter 下拉占位</strong>：空数据态点 Age 漏斗 → 两栏下拉均显示
                「No Filter(Custom)」（ConfigProvider.renderEmpty('Table.filter')，SIMPLE 图标）。
              </li>
              <li>
                <strong>Toggle Data</strong>：共享 dataSource 状态，同一按钮同时切换两栏。
                有数据时 Age filters 恢复（&gt;=35 / &lt;18），筛选无结果显示「No Data」（共用 emptyText）。
              </li>
              <li>
                <strong>初值差异</strong>：antd demo 原本初值有数据；此处取空初值（data-grid 改造前行为）
                作为对照基线。
              </li>
            </ul>
          </div>
        </SplitDemo>
      </div>
    </ConfigProvider>
  )
}
