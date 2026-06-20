/**
 * 复刻 antd custom-empty demo：`G:\Projects\ant-design\components\table\demo\custom-empty.tsx`。
 *
 * === antd demo 要素（S23 自定义空状态）===
 *
 * - `handleToggle`：切换 dataSource（空 ↔ 有数据）。
 *   有数据时随机生成 1-10 行；空时 dataSource = []。
 * - `columns`：Name / Age / Address。
 *   Age 的 filters 随 dataSource 变化：有数据时 [{text:'>=35',value:'gte35'},{text:'<18',value:'lt18'}]，
 *   空时为 []（与 antd demo 一致：空数据态 filters 为空数组）。
 * - `locale.emptyText`：Table 级**表体空状态**文案 `<Empty description="No Data">{toggleButton}</Empty>`
 *   （含 toggle 按钮子节点——antd 同款）。**空数据与筛选无结果共用**（对齐 antd
 *   InternalTable.tsx:714-717：表体 empty 不区分两种场景，统一 locale.emptyText）。
 * - `<ConfigProvider renderEmpty={renderEmpty}>`：renderEmpty 仅处理 'Table.filter' →
 *   `<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No Filter(Custom)" />`。
 *   ★ 'Table.filter' 是 **filter 下拉面板内** filters 为空时的占位（对齐 antd
 *   FilterDropdown.tsx:395,410），**不是**表体筛选无结果。
 * - `bordered`。
 *
 * === 'Table.filter' 真实语义（经 antd 6.4.4 源码核实）===
 *
 * 'Table.filter' = **filter 下拉内** `column.filters` 为空数组时的占位（默认 Empty SIMPLE +
 * locale.filterEmptyText）。消费点：FilterDropdown.tsx:395,410（`(column.filters||[]).length===0`
 * 时渲染）。本 demo 中，空数据态 Age 列 filters=[] → 点 Age 漏斗 → 下拉显示 "No Filter(Custom)"
 * （renderEmpty('Table.filter') 占位）。
 *
 * 表体筛选无结果（如 Age 选 '<18' 但所有行 age >= 32 无匹配）显示 "No Data"
 * （locale.emptyText 共用，对齐 antd——antd 表体 empty 不区分空数据 vs 筛选无结果）。
 *
 * === data-grid 实现（S23）要点 ===
 *
 * - `locale.emptyText`：Table 级表体空状态文案。data-grid 适配层（Table.tsx）解析优先级
 *   （对齐 antd InternalTable.tsx:706-718）：
 *     1. locale.emptyText（最高）。
 *     2. ConfigProvider.renderEmpty('Table')（表体 empty 统一用 'Table'，不区分）。
 *     3. 默认 antd Empty。
 * - `ConfigProvider.renderEmpty('Table.filter')`：由 FilterDropdown 消费（filter 下拉内
 *   filters 空时占位）；表体 empty 不消费此 key。
 * - 引擎（GridTable）在 pagedDataSource 空时渲染跨所有列的 empty 区（`grid-column: 1 / -1`，
 *   居中），内容 = emptyText。
 *
 * === 验证点（S23）===
 *
 * 1. 空数据：初始 dataSource=[]，表体显示 "No Data" + toggleButton（Table 级 locale.emptyText 生效）。
 * 2. 空数据 + filter 下拉占位：空数据态 Age 列 filters=[]，点 Age 漏斗 → 下拉显示
 *    "No Filter(Custom)"（ConfigProvider.renderEmpty('Table.filter') 生效，SIMPLE 图标）。
 * 3. 有数据：点 toggleButton → 显示 1-10 行数据；Age 列漏斗可点（filters 有值）。
 * 4. 筛选无结果：有数据时点 Age 漏斗选 '<18'（但所有行 age >= 32，无匹配）→ 表体显示
 *    "No Data"（locale.emptyText 共用，对齐 antd 表体 empty 不区分）。
 * 5. bordered：表格有外边框。
 * 6. 回归：非空 demo（basic/head 等有数据）不渲染 empty 区。
 */

import { useState } from 'react'
import type { GetProp } from 'antd'
import { Button, ConfigProvider, Empty } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'

interface DataType {
  key: number
  name: string
  age: number
  address: string
}

const genFakeData = (count = 5): DataType[] =>
  Array.from({ length: count }).map<DataType>((_, index) => ({
    key: index,
    name: `Edward King ${index}`,
    age: 32 + index,
    address: `London, Park Lane no. ${index}`,
  }))

// ConfigProvider.renderEmpty：仅处理 'Table.filter'（filter 下拉内 filters 空时的占位），
// 返回自定义 Empty（SIMPLE 图标）。表体空状态（'Table'）不处理——走 Table 级 locale.emptyText。
const renderEmpty: GetProp<typeof ConfigProvider, 'renderEmpty'> = (componentName) => {
  if (componentName === 'Table.filter') {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No Filter(Custom)" />
  }
  return undefined
}

export default function App() {
  const [dataSource, setDataSource] = useState<DataType[]>([])

  const handleToggle = () => {
    setDataSource(dataSource.length ? [] : genFakeData(Math.floor(Math.random() * 10)))
  }

  const columns: ColumnType<DataType>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age',
      // 有数据时提供 filters（>=35 / <18），空时为 []。
      // 对齐 antd demo：空数据态 filters=[] → 点 Age 漏斗显示 'Table.filter' 占位（"No Filter(Custom)"）。
      // 注：空数据态漏斗仍可点（filterable 判定基于 onFilter 存在，对齐 antd useFilter/index.tsx:38）。
      filters: dataSource.length
        ? [
            { text: '>=35', value: 'gte35' },
            { text: '<18', value: 'lt18' },
          ]
        : [],
      // onFilter：前端筛选（age >= 35 / age < 18）。
      onFilter: (value, record) => {
        if (value === 'gte35') return record.age >= 35
        if (value === 'lt18') return record.age < 18
        return false
      },
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
    },
  ]

  const toggleButton = (
    <Button type="primary" onClick={handleToggle}>
      Toggle Data
    </Button>
  )

  return (
    <ConfigProvider renderEmpty={renderEmpty}>
      {dataSource.length ? toggleButton : null}
      <div style={{ marginBlock: 8 }} />
      <Table<DataType>
        bordered
        dataSource={dataSource}
        columns={columns}
        locale={{ emptyText: <Empty description="No Data">{toggleButton}</Empty> }}
      />
    </ConfigProvider>
  )
}
