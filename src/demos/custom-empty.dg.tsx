/**
 * custom-empty demo 的 data-grid 段（左栏），从 custom-empty.tsx 拆出。
 *
 * - props 驱动 `{ bordered, dataSource, emptyText, virtual }`（由 custom-empty.tsx 父组件传）。
 *   * `dataSource`：共享数据（父控制条 Toggle 切换，空 ↔ 有数据），用 shared 初值合理兜底。
 *   * `emptyText`：两侧共用 locale.emptyText（含 Toggle Data 按钮），父构建传入。
 *   * `bordered`：父控制条 Switch 驱动。
 *   * `virtual`：全局虚拟化开关。
 * - 自包含：含 `dgColumns`（Age filters 随 dataSource 变化）+ `<ConfigProvider renderEmpty>`
 *   包 `<Table locale.emptyText>`。
 *
 * === ★ ConfigProvider.renderEmpty 用 antd（scope 内）===
 * `ConfigProvider` + `Empty` + `GetProp` 均来自 'antd'（scope 内）。`renderEmpty` 仅处理
 * 'Table.filter'（filter 下拉内 filters 空时占位），返回 `<Empty PRESENTED_IMAGE_SIMPLE>`。
 * 表体空状态（'Table'）走 Table 级 `locale.emptyText`（父传 prop）。
 *
 * === ★ dataSource/bordered 提升父（控制条直接操作）===
 * Toggle Data 按钮在父控制条 + 空状态文案中均出现，且同一 state 驱动两侧 → 提升父；bordered 同
 * 控制条 Switch 驱动两侧 → 提升父。子组件仅接收 prop 渲染（不自管）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - bordered=true（改造前初值，合理有效）。
 * - dataSource=[]（shared 空初值，data-grid 改造前行为；显示数据 prop 用空合理——空态是本 demo
 *   的核心演示场景，非崩溃态，ConfigProvider.renderEmpty + locale.emptyText 正常渲染）。
 * - emptyText=默认 Empty「No Data」（父未传时的合理兜底；父传时用含 Toggle Data 按钮的版本）。
 * - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
 * 编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll} 不含 dataSource/emptyText，靠默认值兜底
 * （编辑态仍能渲染空态 Empty + ConfigProvider.renderEmpty，演示 'Table'/'Table.filter' 语义）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'../table'` / `'./_compare/custom-empty.shared'`），源码可原样展示无需路径改写。
 */
import type { GetProp } from 'antd'
import { ConfigProvider, Empty } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { type RecordType } from './_compare/custom-empty.shared'

// ConfigProvider.renderEmpty：仅处理 'Table.filter'（filter 下拉内 filters 空时的占位），
// 返回自定义 Empty（SIMPLE 图标）。表体空状态（'Table'）不处理——走 Table 级 locale.emptyText。
const renderEmpty: GetProp<typeof ConfigProvider, 'renderEmpty'> = (componentName) => {
  if (componentName === 'Table.filter') {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No Filter(Custom)" />
  }
  return undefined
}

/**
 * 左栏 data-grid 子组件。
 * 自包含 ConfigProvider（renderEmpty 处理 'Table.filter'）+ Table（locale.emptyText 表体空态）。
 */
export default function CustomEmptyDg({
  bordered = true,
  dataSource = [],
  emptyText = <Empty description="No Data" />,
  virtual = false,
}: {
  bordered?: boolean
  dataSource?: RecordType[]
  emptyText?: import('react').ReactNode
  virtual?: boolean
}) {
  // ★ Age 列只 filters 无 onFilter（对齐 antd 官方 custom-empty.tsx——官方 demo 原样只有 filters）。
  // 有数据时提供 filters（>=35 / <18），空时为 []。
  // 空数据态 filters=[] → 点 Age 漏斗显示 'Table.filter' 占位（"No Filter(Custom)"）。
  const dgColumns: ColumnType<RecordType>[] = [
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

  return (
    <ConfigProvider renderEmpty={renderEmpty}>
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
    </ConfigProvider>
  )
}
