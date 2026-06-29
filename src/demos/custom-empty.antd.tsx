/**
 * custom-empty demo 的 antd 段（右栏），从 custom-empty.tsx 拆出。
 *
 * - props 驱动 `{ bordered, dataSource, emptyText, virtual }`（由 custom-empty.tsx 父组件传）。
 *   * `dataSource`：共享数据（父控制条 Toggle 切换，空 ↔ 有数据），用 shared 初值合理兜底。
 *   * `emptyText`：两侧共用 locale.emptyText（含 Toggle Data 按钮），父构建传入。
 *   * `bordered`：父控制条 Switch 驱动。
 *   * `virtual`：全局虚拟化开关。
 * - 自包含：含 `antdColumns`（Age filters 随 dataSource 变化）+ `<ConfigProvider renderEmpty>`
 *   包 `<AntdTable locale.emptyText>`。
 *
 * === ★ ConfigProvider.renderEmpty 用 antd（scope 内）===
 * `ConfigProvider` + `Empty` + `GetProp` 均来自 'antd'（scope 内）。`renderEmpty` 仅处理
 * 'Table.filter'，返回 `<Empty PRESENTED_IMAGE_SIMPLE>`。忠实复刻 antd custom-empty demo。
 *
 * === ★ dataSource/bordered 提升父（控制条直接操作）===
 * Toggle Data 按钮在父控制条 + 空状态文案中均出现，且同一 state 驱动两侧 → 提升父；bordered 同
 * 控制条 Switch 驱动两侧 → 提升父。子组件仅接收 prop 渲染（不自管）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - bordered=true（与左栏一致，改造前初值）。
 * - dataSource=[]（与左栏一致，data-grid 改造前行为；空态是本 demo 核心演示场景，非崩溃态）。
 * - emptyText=默认 Empty「No Data」（父未传时的合理兜底；父传时用含 Toggle Data 按钮的版本）。
 * - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
 * 编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll} 不含 dataSource/emptyText，靠默认值兜底。
 *
 * === 'Table' vs 'Table.filter' 语义（memory antd-table-filter-empty-semantics）===
 * 'Table' = 表体 empty（空数据 + 筛选无结果）→ locale.emptyText；'Table.filter' = filter 下拉内
 * filters 空时占位 → ConfigProvider.renderEmpty('Table.filter')。antd 天然正确。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/custom-empty.shared'`）。
 */
import type { GetProp, TableProps } from 'antd'
import { ConfigProvider, Empty, Table as AntdTable } from 'antd'
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
 * 右栏 antd 子组件（忠实复刻 antd custom-empty demo）。
 * 自包含 ConfigProvider（renderEmpty 处理 'Table.filter'）+ AntdTable（locale.emptyText 表体空态）。
 */
export default function CustomEmptyAntd({
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
  // 忠实复刻 antd custom-empty demo：Age 列只有 filters（无 onFilter——antd demo 原样）。
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

  return (
    <ConfigProvider renderEmpty={renderEmpty}>
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
    </ConfigProvider>
  )
}
