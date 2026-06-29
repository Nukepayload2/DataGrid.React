/**
 * grouping-columns demo 的 data-grid 段（左栏），从 grouping-columns.tsx 拆出。
 *
 * - props 驱动 `{ bordered, size, virtual, data }`（由 grouping-columns.tsx 父组件传）。
 * - 自包含：含 `dgColumns`（多级表头任意深度嵌套 children + Name fixed 'start' + filters/onFilter +
 *   Age sorter + Gender fixed 'end'）+ `<Table>` JSX。
 * - 行为与改造前一致：grid-column span N / grid-row span N 实现多级表头；保留原 473px 父高 wrapper
 *   （表头 4 行 ~188 + 表体 ~235 + 分页条 ~50，对齐 antd scroll.y:47*5=235）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/grouping-columns.shared'`），源码可原样展示无需路径改写。
 */
import { Table } from '../table'
import type { ColumnType } from '../table'
import { type DataType, initialData } from './_compare/grouping-columns.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义
// ---------------------------------------------------------------------------

// 多级表头列定义（任意深度嵌套 children）+ 固定列 + filters/sorter。
// 与 antd 官方 demo 的列结构逐字一致（title/dataIndex/key/width/children 嵌套，
// 含 Name filters/onFilter、Age sorter）。
// fixed 用 data-grid 逻辑属性 'start'/'end'（等价 antd 'left'/'right'，RTL 自动适配）。
const dgColumns: ColumnType<DataType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    width: 100,
    fixed: 'start',
    filters: [
      {
        text: 'Joe',
        value: 'Joe',
      },
      {
        text: 'John',
        value: 'John',
      },
    ],
    onFilter: (value, record) => record.name.indexOf(value as string) === 0,
  },
  {
    title: 'Other',
    children: [
      {
        title: 'Age',
        dataIndex: 'age',
        key: 'age',
        width: 150,
        sorter: (a, b) => a.age - b.age,
      },
      {
        title: 'Address',
        children: [
          {
            title: 'Street',
            dataIndex: 'street',
            key: 'street',
            width: 150,
          },
          {
            title: 'Block',
            children: [
              {
                title: 'Building',
                dataIndex: 'building',
                key: 'building',
                width: 100,
              },
              {
                title: 'Door No.',
                dataIndex: 'number',
                key: 'number',
                width: 100,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Company',
    children: [
      {
        title: 'Company Address',
        dataIndex: 'companyAddress',
        key: 'companyAddress',
        width: 200,
      },
      {
        title: 'Company Name',
        dataIndex: 'companyName',
        key: 'companyName',
      },
    ],
  },
  {
    title: 'Gender',
    dataIndex: 'gender',
    key: 'gender',
    width: 80,
    fixed: 'end',
  },
]

export default function GroupingColumnsDg({
  bordered = true,
  size = 'medium',
  virtual = false,
  data = initialData,
}: {
  bordered: boolean
  size: 'medium' | 'large'
  virtual: boolean
  data: DataType[]
}) {
  return (
    /* ★★★ 任务 S（数据区域高度返工，第三次 — 补 pagination 后再加 50）：
       **问题历史**：
         - 原始：`height: 240` → wrapper 仅 240px，扣多级表头 4 行(~188px)后表体仅 ~52px(1 行)。
         - 第一次返工：改 `height: '100%'` 期望填满 SplitDemo body。但 `.dg-compare__body`
           (`compare.css:64-71`) 是 `flex:1; min-height:0; overflow:auto; display:flex;
           flex-direction:column`——它的高度依赖父链 `.dg-compare__pane → .dg-compare` 的
           显式高度，而 demo 在文档流里无视口约束（.dg-compare 无固定高）→ height:100% 解析成
           内容自然高(100 行全展开 4869px)，外溢无滚动条。用户："数据区非常高，全 100 行"。
         - 第二次返工：固定像素 `423px`（= 表头 188 + 表体 235），表体精确对齐 antd y:235(5 行)。
         - 第三次返工（本轮）：补 `pagination={{}}` 对齐 antd 默认分页条后，分页条(.dg-pagination)
           作为 `.dg-wrapper.dg-data-area` flex column 末尾 flex item（在 .dg-scroll 之外、wrapper
           之内）占用 wrapper 垂直空间(~50px)，挤占表体 flex:1 → 可见行从 5 掉到 4（左 4 / 右 5）。
           故 wrapper 再 +50 → 473。
       **目标**：表体 ~235px（对齐 antd `scroll.y:47*5=235`，5 行可见），且分页条可见不挤表体。
       **修复**：固定像素高 `473px` = 表头 4 行 medium(~47×4 ≈ 188) + 表体 235 + 分页条 ~50。
         `.dg-wrapper.dg-data-area` (`table.css:86-89` height:100% + flex column) 解析成 473，
         内部 flex 链：wrapper 473 → .dg-pagination(bottom,~50) + `.dg-scroll-wrap` flex:1 →
         `.dg-scroll` flex:1 + overflow-y:auto，表头 sticky 钉顶(188)后表体可见区 =
         473 − 188 − 50 = 235px ≈ 5 行，精确对齐 antd。
       **为何不用 height:100%**：SplitDemo body 无视口约束 → 100% 无限高(4869)。
       **为何不用 height:240/423**：240 表头占 188 后表体仅 52(1 行)；423 在有分页条时表体被挤
         到 ~185(4 行)。
       **fragility 说明**：表头高随 size 变（large 更高），medium 下 4 行 ≈ 188 是经验值。
         若切 large 需重测（large 表头更高，wrapper 应相应加大）。当前 demo 默认 medium，
         473 精确对齐 antd medium 下 y:235 表体 + 分页条。 */
    <div style={{ height: '473px' }}>
      <Table<DataType>
        columns={dgColumns}
        dataSource={data}
        bordered={bordered}
        size={size === 'medium' ? 'middle' : 'large'}
        /* 全局虚拟化开关接入：ON 时叠加 virtual=true；scroll 保持原 {x:'calc(700px+50%)', y:true}
           （data-grid 接受字符串 x + y:true 数据区域模式，已有 473px 父高限高，虚拟滚动区生效）；
           OFF 时回原值（原本就是 y:true，行为与改造前一致）。 */
        virtual={virtual}
        scroll={{ x: 'calc(700px + 50%)', y: true }}
        /* pagination={{}}：对齐 antd 默认分页条（antd 6.4.4 对任意行数都渲染 .ant-pagination）。
           两侧分页器存在性对齐，便于对照。 */
        pagination={{}}
      />
    </div>
  )
}
