/**
 * fixed-header demo 的 data-grid 段（左栏），从 fixed-header.tsx 拆出。
 *
 * - props 驱动 `{ bordered, virtual }`（由 fixed-header.tsx 父组件传）。
 * - 自包含：含 `dgColumns`（Name/Age/Address 3 列）+ `<Table>` JSX + 父容器 height:394 wrapper。
 * - 行为与改造前一致：保留原 bordered/scroll.y:true/pagination:{pageSize:50}/virtual 配置。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/fixed-header.shared'`），源码可原样展示无需路径改写。
 */
import { Table } from '../table'
import type { ColumnType } from '../table'
import { dataSource, type DataType } from './_compare/fixed-header.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— 与 antd demo 列结构逐字一致
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<DataType>[] = [
  { title: 'Name', dataIndex: 'name', width: 150 },
  { title: 'Age', dataIndex: 'age', width: 150 },
  { title: 'Address', dataIndex: 'address' },
]

export default function FixedHeaderDg({
  bordered = false,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  return (
    /* 决策 7 父容器需有明确 height（394，实测换算见原 demo 文件头：stickyHeader 54.8 +
       表体可见 275.2（对齐 antd y:55*5=275，显 6 行）+ 分页条区 64）。
       scroll.y:true 数据区域模式，表体 flex:1 填满 wrapper 扣除表头与分页条后的剩余空间。
       ★ 分页条(.dg-pagination)是 .dg-wrapper.dg-data-area flex column 末尾 flex item（在 .dg-scroll
       之外、wrapper 之内），占用 wrapper 垂直空间 → wrapper 必须把分页条区(64)算进去，否则表体
       flex:1 被挤、可见行少于右栏（380 → 左 5 行/右 6 行；394 后对齐 6=6）。
       pagination={{ pageSize: 50 }}：对齐 antd 官方 demo 同款分页。 */
    <div style={{ height: 394 }}>
      <Table<DataType>
        columns={dgColumns}
        dataSource={dataSource}
        bordered={bordered}
        scroll={{ y: true }}
        pagination={{ pageSize: 50 }}
        /* 全局虚拟化开关接入：本 demo 已自带限高 div(394) + scroll.y:true（M8 数据区域模式），
           开关 ON 时叠加 virtual=true，从 M8 切到 M4 虚拟；OFF 时不传 virtual，行为与改造前
           完全一致（scroll.y 原值保留，与开关无关）。 */
        virtual={virtual}
      />
    </div>
  )
}
