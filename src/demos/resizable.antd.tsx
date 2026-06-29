/**
 * resizable demo 的 antd 段（右栏），从 resizable.tsx 拆出。
 *
 * === 特例：右栏不是 antd 同名 demo ===
 *
 * antd 6.4.4 Table **无原生列宽拖拽（resizable）能力** → 右栏不渲染 antd 同名 demo，而是
 * **一个说明区 + 一张静态 antd `<Table>` 作基线参照**（同数据/同列，无拖拽手柄）。
 * 列宽拖拽为 data-grid 增强（M7），仅左栏演示。
 *
 * - props 驱动 `{ virtual }`（由 resizable.tsx 父组件传）：
 *   * virtual：全局虚拟化开关（右栏 antd 静态基线 Table 也接入虚拟化，便于视觉对照）。
 * - 自包含：含 `antdColumns`（Name/Age 固定 width + Address/Tags/Description）+ 说明区 JSX +
 *   `<AntdTable>` JSX。说明区用 theme token（colorWarningBg/colorWarningBorder/colorText）自适应主题。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/resizable.shared'`）。
 */
import { Flex, Table as AntdTable, Tag, theme } from 'antd'
import type { TableProps } from 'antd'
import { data, type RecordType } from './_compare/resizable.shared'

// ---------------------------------------------------------------------------
// 右栏（antd 静态基线）列定义 —— 无 resizable，仅视觉对照基准
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    width: 150,
    render: (text) => <a>{text}</a>,
  },
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
    width: 80,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address',
  },
  {
    title: 'Tags',
    key: 'tags',
    dataIndex: 'tags',
    render: (_, { tags }) => (
      <Flex gap="small" align="center" wrap>
        {tags.map((tag) => (
          <Tag color="blue" key={tag}>
            {tag.toUpperCase()}
          </Tag>
        ))}
      </Flex>
    ),
  },
  {
    title: 'Description',
    dataIndex: 'description',
    key: 'description',
  },
]

export default function ResizableAntd({
  virtual = false,
}: {
  virtual: boolean
}) {
  const { token } = theme.useToken()

  return (
    <>
      {/* 说明区：antd 6.4.4 Table 无原生列宽拖拽（resizable）能力，右栏仅作静态基线参照。
          token 化（colorWarningBg/colorWarningBorder/colorText）自适应 light/dark/自定义主题。 */}
      <div
        style={{
          padding: 12,
          background: token.colorWarningBg,
          border: `1px solid ${token.colorWarningBorder}`,
          borderRadius: 6,
          marginBottom: 12,
          fontSize: 12,
          color: token.colorText,
          lineHeight: 1.7,
        }}
      >
        <strong>antd 6.4.4 Table 无原生列宽拖拽（resizable）能力。</strong>
        右栏仅 data-grid 演示；此处放一张静态 antd Table 作基线参照（同数据/同列，
        无拖拽手柄）。如需在 antd 下做列宽拖拽，社区常用 <code>react-resizable</code>
        等第三方 wrapper（非 antd 原生，本 demo 不复刻）。
      </div>
      <AntdTable<RecordType>
        columns={antdColumns}
        dataSource={data}
        /* 全局虚拟化开关接入：ON 时叠加 virtual=true + scroll:{y:340}（本右栏 antd 显式
           pagination={false} 无分页条，扣除表头~55 → 约 340 塞进 split pane 限高）；
           OFF 时 scroll=undefined，行为与改造前一致。 */
        virtual={virtual}
        scroll={virtual ? { y: 340 } : undefined}
        pagination={false}
      />
    </>
  )
}
