import { Table as AntdTable, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { Table as GridTable } from '../../table'
import type { ColumnType } from '../../table'
import { SplitDemo } from '../../demos/_compare/SplitDemo'
import {
  DocSection,
  DocsActionList,
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
<Table columns={columns} dataSource={rows} scroll={{ y: 400, x: 1200 }} />

// after
{/* 表格会占满父容器提供的可用空间；scroll.y 只负责打开数据区域模式。 */}
<Table columns={columns} dataSource={rows} scroll={{ y: true, x: 1200 }} />`

// --- 迁移活对照：scroll.y 语义差异 ----------------------------------------
// 在 docs 内容区直接渲染两张真实表格，让读者一眼看清 antd 数字 max-height
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
 * 右侧 antd 用 `scroll={{ y: 280 }}` 数字 max-height。两侧同数据同列，
 * 视觉与代码差异同时可见。
 */
function MigrationScrollCompare() {
  return (
    <SplitDemo
      minPaneWidth={360}
      // 静态插图：两侧高度都由组件自身决定（左 data-grid 父容器固定 320px、
      // 右 antd scroll.y: 280），不应随顶栏全局 Virtual 开关改变可用高度。
      virtualizable={false}
      leftTitle="data-grid：y: true + 父容器高度"
      rightTitle="antd：y: 280（max-height）"
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
        // antd 数字 max-height：表体最高 280px；父容器无需约束。
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
      <Text code>{'scroll={{ y: 280 }}'}</Text> 是表体 max-height，与父容器无关。迁移时必须同时调整父容器布局。
    </SplitDemo>
  )
}

export function renderMigration({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection
        id="step-1"
        eyebrow="步骤 1"
        title="先接入 data-grid"
        description="把 antd Table 的 import 和类型 import 切到 data-grid；多数 ColumnsType、Table.Column 和 Table.ColumnGroup 写法可直接保留，列对齐值按 data-grid 类型调整。"
      >
        <DocsCode code={MIGRATION_IMPORTS} height={240} ariaLabel="迁移 import 代码" />
      </DocSection>

      <DocSection
        id="step-2"
        eyebrow="步骤 2"
        title="改滚动高度"
        description="把 antd 的 scroll.y 数字或字符串改成 data-grid 的 y:true；表格会占满父容器提供的可用空间，不再传高度值。"
      >
        <DocsCode code={MIGRATION_SCROLL} height={220} ariaLabel="迁移 scroll.y 代码" />
        <div style={{ margin: '20px 0' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              marginBottom: 10,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--docs-primary-text, #fff)',
              background: 'var(--docs-primary)',
              borderRadius: 3,
            }}
          >
            活对照
          </div>
          <MigrationScrollCompare />
        </div>
        <DocsNote title="父容器必须先有高度">
          <Text code>{'scroll={{ y: true }}'}</Text> 只打开数据区域模式，高度由父容器决定。如果父容器没有约束高度，表格会随内容无限撑高，看上去“没生效”。常见做法：给父级
          <Text code>flex: 1</Text> + <Text code>min-height: 0</Text>，或直接固定高度。
        </DocsNote>
      </DocSection>

      <DocSection
        id="deprecated-members"
        eyebrow="迁移前检查"
        title="核对过时 antd Table 成员"
        description="迁移前先检查业务代码是否依赖 antd/rc-table 已标记过时的成员。data-grid 对这类入口只保留迁移兼容，不作为新代码推荐写法。"
      >
        <DocsNote title="重点">
          <Text code>render</Text> 返回 <Text code>{'{ children, props }'}</Text> 时，data-grid 只消费
          <Text code>children</Text>；<Text code>props</Text> 不会合并到单元格。合并格和 cell props
          改用 <Text code>column.onCell</Text>。
        </DocsNote>
        <DocsActionList
          actions={[
            { label: '动手前先看选型页', kind: 'doc', value: 'when-to-migrate' },
            { label: '查看过时成员说明', kind: 'doc', value: 'deprecated-antd-members' },
            { label: '查看兼容矩阵', kind: 'doc', value: 'compat-matrix' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}
