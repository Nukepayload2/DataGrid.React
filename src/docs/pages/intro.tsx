import { Typography } from 'antd'
import {
  DocSection,
  DocsActionList,
  DocsCode,
} from '../components'
import { GLOSSARY } from '../glossary'
import { docsScope } from '../liveScope'
import type { DocsPageContext } from '../types'
import { QUICK_START_MINIMAL } from './shared'

const { Text } = Typography

export function renderIntro({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection
        id="what-is"
        title="用 CSS Grid 重做的 React 表格组件"
        description="data-grid 面向复杂业务表格：保留接近 antd Table 的 React API，同时补齐大数据量虚拟滚动、列宽拖拽、行/列拖拽排序、多级表头、合并单元格和固定列等常用组合能力。"
      >
        <p>
          <Text strong>适合</Text>：多级表头 + 合并 + 固定列组合、万行级数据、动态行高、列宽拖拽、行/列拖拽排序等业务表格场景。
        </p>
        <p>
          <Text strong>不追求</Text>：完整复刻 antd Table 全量历史 API；兼容依赖原生 table 结构的第三方插件或样式选择器；系统性 RTL 支持。
        </p>
        <p>
          如果你已熟悉 antd Table，多数顶层 props 和 Column 字段可以平滑迁移（详见 <a href="#/docs/migrate-from-antd">如何从 antd Table 迁移</a>）；如果你是新接入，从下面的最小例子开始即可。
        </p>
      </DocSection>

      <DocSection
        id="minimal"
        title="一段代码跑通最小表格"
        description="columns + dataSource + 稳定 rowKey 三件套就能跑通；下方代码可直接编辑，活预览实时反映修改。"
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
        id="paths"
        title="选一条主路径继续"
        description="两条路径覆盖最常见的两种使用场景；按当前需要选一条即可。"
      >
        <DocsActionList
          actions={[
            { label: '快速用（5 分钟跑通基础）', kind: 'doc', value: 'quick-start' },
            { label: '如何从 antd Table 迁移', kind: 'doc', value: 'migrate-from-antd' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>

      <DocSection
        id="glossary"
        title="术语速查"
        description="本站用到的关键术语统一写法；遇到同物异名时以这里为准。"
      >
        <ul className="docs-bullet-list">
          <li>
            <Text strong>{GLOSSARY.dataAreaMode.canonical}</Text>：{GLOSSARY.dataAreaMode.summary}
          </li>
          <li>
            <Text strong>{GLOSSARY.slot.canonical}</Text>：{GLOSSARY.slot.summary}
          </li>
          <li>
            <Text strong>{GLOSSARY.deprecatedMember.canonical}</Text>：{GLOSSARY.deprecatedMember.summary}
          </li>
          <li>
            <Text strong>{GLOSSARY.compatApi.canonical}</Text>：{GLOSSARY.compatApi.summary}
          </li>
          <li>
            <Text strong>{GLOSSARY.sentinelColumn.canonical}</Text>：{GLOSSARY.sentinelColumn.summary}
          </li>
          <li>
            <Text strong>{GLOSSARY.configProviderToken.canonical}</Text>：{GLOSSARY.configProviderToken.summary}
          </li>
          <li>
            <Text strong>{GLOSSARY.renderedCell.canonical}</Text>：{GLOSSARY.renderedCell.summary}
          </li>
          <li>
            <Text strong>{GLOSSARY.summaryThreePart.canonical}</Text>：{GLOSSARY.summaryThreePart.summary}
          </li>
        </ul>
      </DocSection>
    </>
  )
}
