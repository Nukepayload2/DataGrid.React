import { Typography } from 'antd'
import {
  DocSection,
  DocsActionList,
  DocsDataGrid,
  DocsNote,
} from '../components'
import type { DocsPageContext } from '../types'

const { Text } = Typography

interface DeprecatedRow {
  key: string
  member: string
  support: string
  behavior: string
  migration: string
}

const deprecatedRows: DeprecatedRow[] = [
  {
    key: 'rendered-cell',
    member: 'column.render 返回 { children, props }',
    support: '部分兼容',
    behavior: '识别 legacy RenderedCell 对象（render 返回的 `{ children, props }` 旧形态），但只消费 children；props 不会合并到单元格。',
    migration: '返回普通 ReactNode；合并格和单元格 props 改用 column.onCell。',
  },
  {
    key: 'rendered-cell-props',
    member: 'RenderedCell.props',
    support: '保留类型但忽略',
    behavior: 'props 字段仍在类型里，但 data-grid 不会合并到单元格。',
    migration: '不要在 render 返回对象中放 colSpan、rowSpan、className、style 或事件。',
  },
  {
    key: 'on-select-multiple',
    member: 'rowSelection.onSelectMultiple',
    support: '兼容触发',
    behavior: 'antd v6 已标记 deprecated；shift range 多选时仍按 (selected, selectedRows, changeRows) 调用。',
    migration: '新逻辑优先用 rowSelection.onChange，并读取 info.type === "multiple"。',
  },
  {
    key: 'expanded-row-offset',
    member: 'expandable.expandedRowOffset',
    support: '兼容支持',
    behavior: '转换为展开内容起始 grid column；非法值、负数和越界值会 clamp。',
    migration: '用 Table.EXPAND_COLUMN 在 columns 中控制展开列位置。',
  },
  {
    key: 'filter-checkall',
    member: 'locale.filterCheckall',
    support: '兼容别名',
    behavior: '读取顺序为 filterCheckall ?? filterCheckAll ?? 默认文案。',
    migration: '改用 locale.filterCheckAll。',
  },
  {
    key: 'fixed-true',
    member: 'column.fixed: true',
    support: '旧写法兼容',
    behavior: '归一化为左固定，即内部 start。',
    migration: '明确写 fixed: "left" / "start" 或 fixed: "right" / "end"。',
  },
  {
    key: 'filter-dropdown-open',
    member: 'column.filterDropdownOpen',
    support: '未暴露',
    behavior: '当前 ColumnType 没有这个 deprecated 字段。',
    migration: '使用 column.filterDropdownProps.open。',
  },
  {
    key: 'filter-dropdown-open-change',
    member: 'column.onFilterDropdownOpenChange',
    support: '未暴露',
    behavior: '当前 ColumnType 没有这个 deprecated 回调字段。',
    migration: '使用 column.filterDropdownProps.onOpenChange。',
  },
]

export function renderDeprecatedAntdMembers({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection
        id="policy"
        title="只为迁移保留，不作为新代码入口"
        description="data-grid 优先兼容 antd v6 当前公共 API。对 antd 已标记为 deprecated 的成员，data-grid 会根据迁移价值分别处理：能继续承接的保留兼容，语义对不上的降级或忽略，并在下方逐条说明。"
      >
        <DocsNote title="本页与兼容矩阵的分工">
          本页逐条列出具体过时成员的支持状态、data-grid 行为和迁移动作——回答「用了 X 该改成什么」。如果想看某个 API 领域整体是「完全 / 部分 / 未暴露」，去兼容矩阵；同一主题不在两页重复展开。
        </DocsNote>
        <DocsNote title="判定方式">
          旧成员如果依赖原生 <Text code>table/tr/td</Text> DOM，data-grid 只保留可表达的语义；
          无法保留的 DOM 细节会被明确忽略，并指向等价的当前 API。
        </DocsNote>
      </DocSection>

      <DocSection
        id="members"
        title="过时成员支持状态"
        description="这里列的是源码当前实际暴露或消费的旧入口。未暴露项不会被业务代码当作 data-grid API 使用。"
      >
        <DocsDataGrid<DeprecatedRow>
          columns={[
            { title: '成员', dataIndex: 'member', key: 'member', width: 280, render: (value) => <Text code>{value}</Text> },
            { title: '支持', dataIndex: 'support', key: 'support', width: 140 },
            { title: 'data-grid 行为', dataIndex: 'behavior', key: 'behavior', width: 440 },
            { title: '迁移建议', dataIndex: 'migration', key: 'migration', width: 420 },
          ]}
          dataSource={deprecatedRows}
          rowKey="key"
          scrollX={1280}
        />
      </DocSection>

      <DocSection
        id="dom"
        title="旧写法常和原生表格 DOM 绑定"
        description="data-grid 的主体是 CSS Grid div 结构，不存在完整 table/tr/td 层级。"
      >
        <ul className="docs-bullet-list">
          <li><Text code>components.body.cell</Text> 替换单元格内容层，不替换整个 <Text code>td</Text>。</li>
          <li><Text code>onRow</Text> / <Text code>onHeaderRow</Text> 表达行级 props 意图，实际会分发到同一行的全部 cells 或行包装层。</li>
          <li><Text code>column.className</Text> / <Text code>column.style</Text> 合并到 data-grid 单元格，不是原生 <Text code>td</Text> / <Text code>th</Text>。</li>
          <li>依赖 <Text code>tbody &gt; tr &gt; td</Text> 的选择器需要改用 <Text code>classNames</Text> / <Text code>styles</Text> 的语义槽位，或迁移到 data-grid 仍输出的 <Text code>.ant-table-*</Text> 别名。</li>
        </ul>
      </DocSection>

      <DocSection id="related" title="继续核对">
        <DocsActionList
          actions={[
            { label: '领域级兼容状态（兼容矩阵）', kind: 'doc', value: 'compat-matrix' },
            { label: 'Table API', kind: 'doc', value: 'table-api' },
            { label: 'Column API', kind: 'doc', value: 'column-api' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}
