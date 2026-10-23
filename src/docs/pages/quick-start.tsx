import { Typography } from 'antd'
import {
  DocSection,
  DocsActionList,
  DocsCode,
} from '../components'
import type { DocsPageContext } from '../types'

const { Text } = Typography

const INSTALL_CODE = `import { Table } from '@nukepayload2/data-grid'
import type { ColumnType } from '@nukepayload2/data-grid'`

const MINIMAL_CODE = `import { Table } from '@nukepayload2/data-grid'
import type { ColumnType } from '@nukepayload2/data-grid'

interface Record {
  key: string
  name: string
  age: number
}

const columns: ColumnType<Record>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age' },
]

const data: Record[] = [
  { key: '1', name: 'Alice', age: 28 },
  { key: '2', name: 'Bob', age: 34 },
]

export default function Demo() {
  return <Table rowKey="key" columns={columns} dataSource={data} />
}`

const JSX_COLUMNS = `<Table dataSource={data}>
  <Table.Column title="Name" dataIndex="name" key="name" />
  <Table.Column title="Age" dataIndex="age" key="age" />
</Table>`

export function renderQuickStart({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection
        id="what-is"
        title="data-grid 是什么"
        description="data-grid 用 CSS Grid 重做 React 表格：保留接近 antd Table 的 React API，并补齐大数据量虚拟滚动、列宽拖拽、行 / 列拖拽排序、多级表头、合并单元格和固定列等常用组合能力。"
      >
        <p>
          <Text strong>不追求</Text>：完整复刻 antd Table 全量历史 API；兼容依赖原生 table 结构的第三方插件或样式选择器；系统性 RTL 支持。
        </p>
      </DocSection>

      <DocSection id="install" title="导入组件">
        <DocsCode code={INSTALL_CODE} height={100} ariaLabel="安装和导入代码" />
      </DocSection>

      <DocSection
        id="minimal"
        title="一段代码跑通最小表格"
        description="columns、dataSource 和稳定 rowKey 三件套就能跑通；下方代码可直接编辑，活预览实时反映修改。"
      >
        <DocsCode
          code={MINIMAL_CODE}
          editable
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

      <DocSection
        id="next"
        title="选一条主路径继续"
        description="已经用 antd Table 的项目走迁移路径；其余能力入口见能力总览与左目录。"
      >
        <DocsActionList
          actions={[
            { label: '打开基础表格 demo', kind: 'path', value: '/demos/basic-table' },
            { label: '何时从 antd Table 迁移', kind: 'doc', value: 'when-to-migrate' },
            { label: '如何从 antd Table 迁移', kind: 'doc', value: 'migrate-from-antd' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}
