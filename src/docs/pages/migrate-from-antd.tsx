import { Table as AntdTable, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { Table as GridTable } from '../../table'
import type { ColumnType } from '../../table'
import { SplitDemo } from '../../demos/_compare/SplitDemo'
import {
  DocSection,
  DocsCode,
  DocsNote,
} from '../components'
import type { DocsPageContext } from '../types'

const { Text } = Typography

const MIGRATION_IMPORTS = `// before
import { Table } from 'antd'
import type { TableProps, ColumnsType } from 'antd'

// after
import { Table } from '@nukepayload2/data-grid'
import type { TableProps, ColumnsType } from '@nukepayload2/data-grid'`

const MIGRATION_SCROLL = `// before
const tableRef = useRef(null) // 名字只是演示，重点是必须先用 JS 算出高度
const { scrollY } = useTableBodyHeight(parentRef, tableRef) // 名字只是演示，重点是必须先用 JS 算出高度
<Table ref={tableRef} columns={columns} dataSource={rows} scroll={{ y: scrollY }} />

// after
{/* 表格会占满父容器提供的可用空间；scroll.y 只负责打开数据区域模式。 */}
<Table columns={columns} dataSource={rows} scroll={{ y: true }} />`

// 复制给 AI 的迁移提示词模板：先让它读当前文件，再按 antd Table 迁移规则改写。
const MIGRATION_PROMPT = `# 任务
请把当前文件中的 antd Table 用法迁移到 @nukepayload2/data-grid，并尽量保持现有业务行为、变量命名和组件结构不变。

我会在同一轮对话中提供待迁移的 TSX/TS 文件内容。请先识别其中与 antd Table 相关的 import、类型、columns、rowSelection、expandable、pagination、scroll、components、render、onCell 等用法，再按下面规则改写。

# 迁移规则
1. 顶层 import 与类型 import 改为 @nukepayload2/data-grid：
   - \`import { Table } from '@nukepayload2/data-grid'\`
   - \`import type { TableProps, ColumnsType, ColumnType } from '@nukepayload2/data-grid'\`
2. \`scroll={{ y: <number|string> }}\` 改为 \`scroll={{ y: true }}\`。data-grid 的 \`scroll.y\` 表示数据区域模式，不再接收高度数字。
   表格高度应由父容器通过布局或尺寸约束提供，只要能形成稳定的可用高度即可，不要让内容把容器自然撑开。如果原代码通过 resize 监听手算 \`scroll.y\`，请删除这条计算链路，并把高度约束移到容器样式中。
3. 如果 \`column.render\` 返回 \`{ children, props }\` 旧对象形态，请改为直接返回 ReactNode；单元格属性、合并单元格等逻辑改用 \`column.onCell\`。
4. 如果样式依赖 \`<table>\` / \`<thead>\` / \`<tbody>\` / \`<tr>\` / \`<td>\` 选择器，请改用 \`classNames\` / \`styles\` 的 Semantic DOM 槽位，或通过 \`components.body.cell\` / \`components.body.row\` 注入。
5. data-grid 专属能力应放入命名空间，不要混入 antd 顶层 props：
   - 列宽拖拽：\`gridOptions.resizable\` + \`gridOptions.columnResizeMode\`
   - 行高模型：\`gridOptions.rowHeight\` / \`minRowHeight\` / \`maxRowHeight\` / \`headerHeight\`
   - 行 / 列拖拽排序：\`gridOptions.rowDragSort\` / \`columnDragSort\`
   - recycling 虚拟化：\`gridOptions.virtualizationMode: 'recycling'\`
   - 悬浮滚动条策略：\`gridOptions.scrollBarFoldMode\` / \`scrollbar.visibility\`

# 兼容边界
- data-grid 不复刻原生 \`<table>\` / \`<thead>\` / \`<tbody>\` / \`<tr>\` DOM，也不提供完整 ARIA table / row / rowgroup role 树。
- \`scroll.y\` 不支持 antd 的 number / string 滚动高度语义。
- \`components\` 目前仅暴露 \`body.cell\` / \`body.row\`，不提供 \`header.cell\` / \`wrapper\` / \`table\`。
- RTL 尚未系统支持。
- 已过时（deprecated）的 antd 字段不必保留，例如 \`column.filterDropdownOpen\` / \`column.onFilterDropdownOpenChange\`。

# 工作方式
1. 先阅读待迁移文件，列出当前 antd Table 的使用点：import、类型、columns、rowSelection、expandable、pagination、scroll、components、render、onCell、相关样式选择器等。
2. 先给出迁移计划，不要立即改文件。计划需要说明：
   - 哪些代码可以直接替换；
   - 哪些地方需要调整写法；
   - 哪些地方可能受 data-grid 兼容边界影响；
   - 预计会修改哪些文件。
3. 等我明确同意计划后，再实际修改文件。
4. 修改时保持业务行为、变量命名和组件结构稳定；不新增业务功能，不做与 Table 迁移无关的重构。
5. 修改完成后，输出变更摘要，并说明是否还有需要业务方确认的事项。`

// --- 迁移活对照：scroll.y 语义差异 ----------------------------------------
// 在 docs 内容区直接渲染两张真实表格，让读者一眼看清 antd 固定滚动高度
// 语义与 data-grid 数据区域模式（父容器高度驱动）的差别。
// 复用示例区 SplitDemo 布局（pure CSS flex-wrap，docs 窄列自动竖排）。

interface MigrationRow {
  key: string | number
  name: string
  age: number
  address: string
}

const migrationCompareRows: MigrationRow[] = Array.from({ length: 50 }).map((_, i) => ({
  key: i,
  name: `Edward King ${i}`,
  age: 32,
  address: `London, Park Lane no. ${i}`,
}))

const migrationCompareColumns: ColumnType<MigrationRow>[] = [
  { title: 'Name', dataIndex: 'name', width: 140 },
  { title: 'Age', dataIndex: 'age', width: 70 },
  { title: 'Address', dataIndex: 'address' },
]

const migrationCompareAntdColumns: TableColumnsType<MigrationRow> = [
  { title: 'Name', dataIndex: 'name', width: 140 },
  { title: 'Age', dataIndex: 'age', width: 70 },
  { title: 'Address', dataIndex: 'address' },
]

/**
 * 迁移活对照：左侧 data-grid 用 `scroll={{ y: true }}` + 固定高度父容器；
 * 右侧 antd 用 `scroll={{ y: 280 }}` 固定滚动高度。两侧同数据同列，
 * 视觉与代码差异同时可见。
 */
function MigrationScrollCompare() {
  return (
    <SplitDemo
      minPaneWidth={360}
      minPaneHeight={0}
      // 静态插图：两侧高度都由组件自身决定（左 data-grid 父容器固定 320px、
      // 右 antd scroll.y: 280），不应随顶栏全局 Virtual 开关改变可用高度。
      virtualizable={false}
      leftTitle="data-grid：scroll={{ y: true }}"
      rightTitle="antd：scroll={{ y: 280 }}"
      left={
        // data-grid 数据区域模式：父容器分配 320px，表格填满；scroll.y 只是开关。
        <div style={{ height: 320 }}>
          <GridTable<MigrationRow>
            columns={migrationCompareColumns}
            dataSource={migrationCompareRows}
            rowKey="key"
            scroll={{ y: true }}
            pagination={false}
            size="small"
            bordered
          />
        </div>
      }
      right={
        // antd 固定滚动高度：表体高度为 280px；父容器无需约束。
        <AntdTable<MigrationRow>
          columns={migrationCompareAntdColumns}
          dataSource={migrationCompareRows}
          rowKey="key"
          scroll={{ y: 280 }}
          pagination={false}
          size="small"
          bordered
        />
      }
    >
      <strong>差异要点：</strong>
      左侧 <Text code>{'scroll={{ y: true }}'}</Text> 是数据区域模式开关，高度由父容器
      <Text code>{'style={{ height: 320 }}'}</Text> 决定，表格填满；右侧 antd
      <Text code>{'scroll={{ y: 280 }}'}</Text> 是固定滚动高度，与父容器无关。迁移时记得一起调整父容器布局。
    </SplitDemo>
  )
}

export function renderMigration(_ctx: DocsPageContext) {
  return (
    <>
      <DocSection
        id="step-1"
        title="先接入 data-grid"
        description="把 antd Table 的 import 和类型 import 切到 data-grid；多数 ColumnsType、Table.Column 和 Table.ColumnGroup 写法可直接保留，列对齐值按 data-grid 类型调整。"
      >
        <DocsCode code={MIGRATION_IMPORTS} height="auto" ariaLabel="迁移 import 代码" />
      </DocSection>

      <DocSection
        id="step-2"
        title="改滚动高度"
        description="把 antd 的 scroll.y 数字或字符串改成 data-grid 的 y:true；表格会占满父容器提供的可用空间，不再传高度值。"
      >
        <DocsCode code={MIGRATION_SCROLL} height="auto" ariaLabel="迁移 scroll.y 代码" />
        <div style={{ margin: '20px 0' }}>
          <div style={{ marginBottom: 10, fontSize: 13, fontWeight: 600, color: 'var(--docs-text-secondary)' }}>
            对照示意
          </div>
          <MigrationScrollCompare />
        </div>
        <DocsNote title="父容器要先给出受限高度">
          <Text code>{'scroll={{ y: true }}'}</Text> 只打开数据区域模式；父容器需要先提供受限的可用高度，否则表格会继续被内容撑开，不会出现内部滚动。常见做法是给父级
          <Text code>flex: 1</Text> + <Text code>min-height: 0</Text>，或者直接固定高度。
        </DocsNote>
      </DocSection>

      <DocSection
        id="prompt"
        title="复制给 AI 的迁移提示词"
        description="这段提示词可以直接复制给 AI，用来批量处理同类文件。"
      >
        <DocsCode code={MIGRATION_PROMPT} height="auto" maxHeight={520} ariaLabel="迁移提示词模板" />
        <DocsNote title="用法">
          1) 复制上方整段提示词；2) 在同一轮对话中附上待迁移文件内容或文件路径；3) 先审查 AI 给出的迁移计划；4) 同意计划后再让它修改文件并检查变更摘要。
        </DocsNote>
        <p style={{ margin: 0, lineHeight: 1.8 }}>
          这段提示词已经可以直接使用；需要确认某一条规则时，再对照相关文档即可。
        </p>
      </DocSection>

      <DocSection
        id="deprecated-members"
        title="核对过时 antd Table 成员"
        description="迁移前先检查业务代码是否依赖 antd 已标记过时的成员。data-grid 对这类入口只保留迁移兼容，不作为新代码推荐写法。"
      >
        <DocsNote title="重点">
          <Text code>render</Text> 返回 <Text code>{'{ children, props }'}</Text> 时，data-grid 只消费
          <Text code>children</Text>；<Text code>props</Text> 不会合并到单元格。合并格和 cell props
          改用 <Text code>column.onCell</Text>。
        </DocsNote>
        <p style={{ margin: 0, lineHeight: 1.8 }}>
          这里已经把迁移时最容易踩的地方说清了；需要核对完整兼容情况时，再看{' '}
          <a href="#/docs/compat-matrix">兼容矩阵</a>。
        </p>
      </DocSection>
    </>
  )
}
