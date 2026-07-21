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
        eyebrow="data-grid 是什么"
        title="用 CSS Grid 重做的 React 表格组件"
        description="data-grid 把表格布局交给 CSS Grid——不再输出原生 table / thead / tbody / tr 结构，让多级表头、合并单元格、固定列、动态行高这些原本要互相迁就的能力可以在同一套布局下共存，并原生支持大数据量虚拟滚动、列宽拖拽、行/列拖拽排序。"
      >
        <p>
          <Text strong>适合</Text>：多级表头 + 合并 + 固定列组合、超大数据量（万行级）、动态行高、列宽拖拽、行/列拖拽排序等真实业务常见但原 React 表格库难处理的场景。
        </p>
        <p>
          <Text strong>不追求</Text>：完整复刻 antd Table 全量历史 API；输出原生 <Text code>{'<table>'}</Text> / <Text code>{'<thead>'}</Text> / <Text code>{'<tbody>'}</Text> / <Text code>{'<tr>'}</Text> DOM（爬虫、第三方表格插件按 <Text code>tbody tr td</Text> 写的样式选择器会失效）；伪造完整 ARIA table / row / rowgroup role 树；RTL 系统支持。
        </p>
        <p>
          如果你已熟悉 antd Table，多数顶层 props 和 Column 字段可以平滑迁移（详见 <a href="#/docs/migrate-from-antd">从 antd 迁移</a>）；如果你是新接入，从下面的最小例子开始即可。
        </p>
      </DocSection>

      <DocSection
        id="minimal"
        eyebrow="最小例子"
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
        eyebrow="下一步"
        title="选一条主路径继续"
        description="两条路径覆盖最常见的两种使用场景；按当前需要选一条即可。"
      >
        <DocsActionList
          actions={[
            { label: '快速用（5 分钟跑通基础）', kind: 'doc', value: 'quick-start' },
            { label: '从 antd Table 迁移', kind: 'doc', value: 'migrate-from-antd' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>

      <DocSection
        id="glossary"
        eyebrow="术语"
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
            <Text strong>{GLOSSARY.escapeHatch.canonical}</Text>：{GLOSSARY.escapeHatch.summary}
          </li>
          <li>
            <Text strong>{GLOSSARY.compatApi.canonical}</Text>：{GLOSSARY.compatApi.summary}
          </li>
          <li>
            <Text strong>{GLOSSARY.rcTable.canonical}</Text>：{GLOSSARY.rcTable.summary}
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
