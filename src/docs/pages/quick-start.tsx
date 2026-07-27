import {
  DocSection,
  DocsActionList,
  DocsCode,
} from '../components'
import { docsScope } from '../liveScope'
import type { DocsPageContext } from '../types'
import { QUICK_START_MINIMAL } from './shared'

const QUICK_START_INSTALL = `import { Table } from '@nukepayload2/data-grid'
import type { ColumnType } from '@nukepayload2/data-grid'`

const JSX_COLUMNS = `<Table dataSource={data}>
  <Table.Column title="Name" dataIndex="name" key="name" />
  <Table.Column title="Age" dataIndex="age" key="age" />
</Table>`

export function renderQuickStart({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection id="install" title="导入组件">
        <DocsCode code={QUICK_START_INSTALL} height={100} ariaLabel="安装和导入代码" />
      </DocSection>

      <DocSection
        id="minimal"
        title="最小表格（可编辑）"
        description="先用 columns、dataSource 和稳定 rowKey 跑通最小可用表格。下方代码可直接编辑并应用，活预览会实时反映修改。"
      >
        <DocsCode
          code={QUICK_START_MINIMAL}
          editable
          scope={docsScope}
          height={280}
          ariaLabel="最小表格代码"
        />
      </DocSection>

      <DocSection
        id="jsx"
        title="JSX 列声明"
        description="需要和条件渲染混用时，可以改成 JSX 声明。"
      >
        <DocsCode code={JSX_COLUMNS} height={120} ariaLabel="JSX 列声明代码" />
      </DocSection>

      <DocSection id="next" title="下一步">
        <DocsActionList
          actions={[
            { label: '打开基础表格 demo', kind: 'path', value: '/demos/basic-table' },
            { label: '看迁移指南', kind: 'doc', value: 'migrate-from-antd' },
            { label: '看 Table API', kind: 'doc', value: 'table-api' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}
