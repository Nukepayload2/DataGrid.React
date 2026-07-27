import { Collapse, Typography } from 'antd'
import type { ReactNode } from 'react'
import {
  DocSection,
} from '../components'
import type { DocsPageContext } from '../types'

const { Paragraph, Text } = Typography

// painToCureRows 用的 GitHub issue / discussion 链接 helper（私有于本页）。
const GITHUB_ISSUE = 'https://github.com/ant-design/ant-design/issues/'
const GITHUB_DISC = 'https://github.com/ant-design/ant-design/discussions/'
const issueLink = (n: number) => (
  <a href={`${GITHUB_ISSUE}${n}`} target="_blank" rel="noreferrer">
    #{n}
  </a>
)
const discLink = (n: number) => (
  <a href={`${GITHUB_DISC}${n}`} target="_blank" rel="noreferrer">
    #{n}
  </a>
)

interface PainToCureRow {
  key: string
  category: string
  /** 决策者第一眼看到的人话痛点标题（折叠态 Panel header）。 */
  painQuestion: string
  /** 一句普通用户能懂的痛点说明（展开态首句，禁 issue 号 / 引擎术语）。 */
  humanSummary: string
  antdPain: ReactNode
  dataGridCure: ReactNode
  demo: ReactNode
}

// 高频场景浓缩表（源自 feedbacks/README.md 与用户迁移反馈）。
// 每行：antd 病灶类别 + GitHub issue 链接 + data-grid 一句话解药 + 对照 demo（5 个 drop-in demo 全挂）。
// 没有现成 demo 的类别留 "—" 并在解药列里指引到对应 docs / 相关 demo。
const painToCureRows: PainToCureRow[] = [
  {
    key: 'column-width-source',
    category: '1. 列宽不稳定',
    painQuestion: '列宽对不齐，空数据时还会跳动',
    humanSummary: '表头和表体的列对不齐；表格没数据时，列宽会突然缩小或来回跳。',
    antdPain: (
      <>
        表头 / 表体容易错位，空数据或滚动状态变化时列宽可能缩减或跳动。证据：{issueLink(45524)}{' '}
        {issueLink(56151)} {issueLink(56713)} {discLink(56477)} {discLink(56602)}
      </>
    ),
    dataGridCure: (
      <>
        表头和表体共享同一套列宽计算；空数据、动态列和滚动条变化时仍保持声明列宽稳定。
      </>
    ),
    demo: (
      <a href="#/demos/stable-empty-width">空数据列宽稳定 demo</a>
    ),
  },
  {
    key: 'column-width-bounds',
    category: '列宽约束',
    painQuestion: '最小列宽不是绝对下限',
    humanSummary: 'antd 的 `Column.minWidth` 只在 `tableLayout="auto"` 生效；即便如此，浏览器的表格布局也可能给极窄列留出看不见的下限。',
    antdPain: (
      <>
        官方文档写得很明确：<Text code>minWidth</Text> 只在 <Text code>tableLayout="auto"</Text> 时有效；讨论 {discLink(56602)} 里也说明了，即使把 <Text code>width</Text> / <Text code>minWidth</Text> 设到 10，并把 padding 清零，浏览器的表格布局仍会给单元格留出看不见的下限。
      </>
    ),
    dataGridCure: (
      <>
        data-grid 用 CSS Grid 直接表达列宽范围，<Text code>min-width</Text> / <Text code>width</Text> / <Text code>max-width</Text> 可以按同一套布局规则生效。
      </>
    ),
    demo: (
      <a href="#/demos/column-width-constraints">列宽约束 demo</a>
    ),
  },
  {
    key: 'scrollbar-fragmentation',
    category: '2. 滚动条和滚轮手感不一致',
    painQuestion: '虚拟滚动条点不动，滚轮手感也怪',
    humanSummary: '打开虚拟滚动后，滚动条不能点击拖动，滚轮的速度和手感也跟普通页面不一样。',
    antdPain: (
      <>
        虚拟滚动下滚轮步长和普通页面不一致；部分横向滚动条不易点击或拖动。证据：{issueLink(44972)}{' '}
        {issueLink(45637)} {issueLink(53813)} {issueLink(56956)} {discLink(50583)}
      </>
    ),
    dataGridCure: (
      <>
        纵向滚动保持接近浏览器原生体验；横向滚动条提供更大的可点击区域，并可通过 <Text code>scrollbar.visibility</Text> 控制显示策略。
      </>
    ),
    demo: (
      <a href="#/demos/clickable-scrollbar">可点击滚动条 demo</a>
    ),
  },
  {
    key: 'scroll-y-calculation',
    category: '3. scroll.y 高度手算 / resize 重算',
    painQuestion: 'scroll.y 高度要手算，resize 时还拖性能',
    humanSummary: '中后台页面常要让表格占满剩余高度，但 antd 需要自己减 header、footer、分页条，再监听窗口变化更新 state。页面越复杂，越容易抖动、错位和多次重渲染。',
    antdPain: (
      <>
        <Text code>scroll.y</Text> 是 number / string max-height 语义，没有真正的 fill / auto 模式；业务常要监听容器或窗口尺寸，再把计算出的高度传回表格。证据：{discLink(53395)}{' '}
        {discLink(56465)}
      </>
    ),
    dataGridCure: (
      <>
        <Text code>scroll.y</Text> 只做数据区域模式开关，真实高度交给父容器的 CSS flex / height 链；业务不需要在 resize 时把高度数字塞回 Table。
      </>
    ),
    demo: (
      <>
        见 <a href="#/docs/scroll-y">scroll.y 语义</a>、<a href="#/demos/fixed-header">固定表头 demo</a>、<a href="#/demos/dom-recycled-virtual-list-antd">antd 大量数据对照 demo</a>
      </>
    ),
  },
  {
    key: 'summary-in-virtual',
    category: '4. summary 与虚拟滚动难共存',
    painQuestion: '一开虚拟滚动，表尾汇总就没了',
    humanSummary: '表格底部那行合计 / 小计，打开虚拟滚动之后就不再正常停在表尾了。',
    antdPain: (
      <>
        开启虚拟滚动后，summary 的位置和可见性容易受影响；行分组和嵌套子表头也需要额外处理。证据：{issueLink(47184)}{' '}
        {issueLink(15630)} {issueLink(36066)}
      </>
    ),
    dataGridCure: (
      <>
        summary 和虚拟行窗口分开处理；开启虚拟滚动后，汇总行仍能稳定显示在表格底部或固定位置。
      </>
    ),
    demo: (
      <a href="#/demos/virtual-summary">虚拟汇总共存 demo</a>
    ),
  },
  {
    key: 'scrollto-pollution',
    category: '5. scrollTo 用 scrollIntoView 连外层一起滚',
    painQuestion: '滚到某一行，整个页面跟着滚',
    humanSummary: '想让表格滚到某一行，结果连外层页面也跟着一起滚，定位完全错乱。',
    antdPain: (
      <>
        非虚拟分支用 <Text code>Element.scrollIntoView()</Text>，浏览器规范沿 DOM 树逐层滚所有可滚动祖先；团队确认 bug。证据：{issueLink(46467)}{' '}
        {discLink(51651)}
      </>
    ),
    dataGridCure: (
      <>
        <Text code>scrollTo(&#123; index?, key?, left?, top?, behavior? &#125;)</Text> 只作用于表格滚动区域，虚拟 / 非虚拟场景下行为一致。
      </>
    ),
    demo: (
      <a href="#/demos/scrollto-scoped">精准滚动定位 demo</a>
    ),
  },
  {
    key: 'fixed-shadow-sticky',
    category: '6. fixed 列 box-shadow + sticky 双表格',
    painQuestion: '固定列横滑卡顿，表头列宽对不上',
    humanSummary: '左右固定的列在横向滑动时会卡顿掉帧，固定表头和表体的列宽还经常对不上。',
    antdPain: (
      <>
        fixed 列两侧 box-shadow 每帧重绘横滑掉帧；sticky 表头拆「两个表格」实现，外层 overflow:auto 与 scroll.x 互斥，列头被截断、宽度不对称缩放。证据：{issueLink(35241)}{' '}
        {discLink(55265)} {discLink(54414)}
      </>
    ),
    dataGridCure: (
      <>
        固定列、固定表头和横向滚动使用同一套列宽和位置计算，减少组合场景中的错位与重绘压力。
      </>
    ),
    demo: (
      <>
        见 <a href="#/demos/fixed-columns">固定列 demo</a>、<a href="#/docs/grid-options">gridOptions</a>
      </>
    ),
  },
  {
    key: 'resizable-missing',
    category: '7. 可伸缩列长期空缺',
    painQuestion: '想要拖拽改列宽——antd 没有原生支持',
    humanSummary: '想用鼠标拖拽改变列宽，antd 自己不带这个能力，得额外接第三方库。',
    antdPain: (
      <>
        依赖第三方拖拽方案时，可能出现拖拽卡顿、手柄和鼠标不同步、松开后仍停留在拖拽态等问题。证据：{issueLink(56356)}{' '}
        {discLink(48152)}
      </>
    ),
    dataGridCure: (
      <>
        <Text code>gridOptions.resizable</Text> + <Text code>columnResizeMode</Text> 直接启用列宽拖拽，并支持最小 / 最大宽度约束和相邻列联动模式。
      </>
    ),
    demo: (
      <a href="#/demos/resizable-columns">可伸缩列 demo</a>
    ),
  },
  {
    key: 'merge-cell-coord',
    category: '8. 合并单元格坐标系错位',
    painQuestion: '树形数据和合并单元格一起用会错位',
    humanSummary: '把行合并和树形数据一起用，单元格会算错位置，画面直接错乱。',
    antdPain: (
      <>
        rowSpan 声明式（合并 N 个原始数据行）与树形子节点插入后的可见行坐标不一致；fixed 列 left 偏移未感知 colSpan 渲染结构，<Text code>colSpan:0</Text> 仍污染偏移。证据：{issueLink(53862)}{' '}
        {issueLink(54860)} {issueLink(34129)}
      </>
    ),
    dataGridCure: (
      <>
        合并单元格、树形数据和固定列按同一套可见行列关系计算，减少复杂组合下的错位。
      </>
    ),
    demo: (
      <>
        见 <a href="#/demos/merged-expand-tree">合并与树形数据 demo</a>
      </>
    ),
  },
  {
    key: 'measure-row-oscillation',
    category: '9. 空数据 / 动态列布局抖动',
    painQuestion: '增删列或空数据时表格高度抖动',
    humanSummary: '增加或删除列、表格没数据时，表格的宽度高度会反复跳动，肉眼可见的不稳定。',
    antdPain: (
      <>
        空数据、增删列或横向滚动配置变化时，表格可能重新分配宽度并出现可见抖动。证据：{discLink(55717)}{' '}
        {issueLink(48715)} {discLink(56115)} {issueLink(56357)}
      </>
    ),
    dataGridCure: (
      <>
        声明过宽度的列保持稳定；自动列在可用空间内伸缩，滚动条出现或消失时不挤压已有列宽。
      </>
    ),
    demo: (
      <a href="#/demos/stable-empty-width">空数据列宽稳定 demo</a>
    ),
  },
]

// pain-to-cure Collapse 内每个分块（antd 表现 / data-grid 做法 / 对照 demo）。
// 用 CSS var 对齐 docs site token，避免硬编码颜色。
function PainToCureBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, lineHeight: 1.7 }}>
      <Text strong>{label}</Text>
      <span style={{ display: 'block' }}>{children}</span>
    </div>
  )
}

function MigrationCostBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 6, lineHeight: 1.8 }}>
      <Text strong>{title}</Text>
      <div>{children}</div>
    </div>
  )
}

export function renderWhenToMigrate(_ctx: DocsPageContext) {
  return (
    <>
      <DocSection
        id="fit"
        title="data-grid 能明显赢过 antd Table 的场景"
        description="data-grid 不是 antd Table 的全量替代，而是在特定场景下做了取舍的继任者。下面这些场景是 data-grid 的强项，迁移收益最直接。"
      >
        <ul className="docs-bullet-list">
          <li>
            <Text strong>大数据表格 / 长列表性能</Text>：内置虚拟滚动（
            <Text code>virtual</Text> + <Text code>{'scroll={{ y: true }}'}</Text>），并额外提供
            <Text code>recycling</Text> 虚拟化模式（DOM 复用，适合超大数据量和高频滚动）。
          </li>
          <li>
            <Text strong>自适应表体高度</Text>：<Text code>scroll.y</Text> 不再传手算数字；父容器用 CSS 给出可用高度，表格填满剩余空间，避免 resize 监听 + setState 的重算链路。
          </li>
          <li>
            <Text strong>动态行高</Text>：支持测量行高 + 有界行高（
            <Text code>gridOptions.minRowHeight</Text> / <Text code>maxRowHeight</Text>），并在虚拟滚动下保持一致布局模型。
          </li>
          <li>
            <Text strong>列宽拖拽</Text>：<Text code>gridOptions.resizable</Text> 与
            <Text code>columnResizeMode</Text> 直接可用，无需自行实现 resize 逻辑。
          </li>
          <li>
            <Text strong>行 / 列拖拽排序</Text>：通过
            <Text code>gridOptions.rowDragSort</Text> / <Text code>columnDragSort</Text> 启用，业务侧在
            <Text code>onSort</Text> 内提交新顺序，无需拼装 DnD 库。
          </li>
          <li>
            <Text strong>多级表头 + 合并 + 固定列组合</Text>：三者能在同一套布局下共存，减少复杂组合下的对齐漂移。
          </li>
          <li>
            <Text strong>antd v6 兼容 API + grid 渲染</Text>：希望继续用
            <Text code>TableProps</Text>、<Text code>ColumnType</Text>、<Text code>rowSelection</Text>、
            <Text code>expandable</Text> 等熟悉 props，同时拿到 grid 布局的红利。
          </li>
        </ul>
      </DocSection>

      <DocSection
        id="pain-to-cure"
        title="antd Table 常见痛点，data-grid 怎么解"
        description="这里整理的是迁移收益更直接、业务方更容易感知的 antd Table 痛点。展开后可以看到 antd 的具体表现、data-grid 的做法，以及可以直接打开的对照 demo。"
      >
        <Collapse
          items={painToCureRows.map((row) => ({
            key: row.key,
            label: row.painQuestion,
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Paragraph style={{ margin: 0, lineHeight: 1.7 }}>{row.humanSummary}</Paragraph>
                <PainToCureBlock label="antd 的表现：">{row.antdPain}</PainToCureBlock>
                <PainToCureBlock label="data-grid 的做法：">{row.dataGridCure}</PainToCureBlock>
                <PainToCureBlock label="对照 demo：">{row.demo}</PainToCureBlock>
              </div>
            ),
          }))}
        />
      </DocSection>

      <DocSection
        id="cost"
        title="迁移前先看成本"
        description="在常见表格场景中，data-grid 延续了 antd Table 的主要 props 与类型形态；但它不是对 antd 历史行为的逐字复刻。迁移前应先确认以下差异，避免把架构取舍误判为实现缺口。"
      >
        <div style={{ display: 'grid', gap: 18 }}>
          <MigrationCostBlock title="可以直接延续的部分">
            顶层 import 与类型 import 切到 <Text code>@nukepayload2/data-grid</Text> 后，基础表格、列定义、选择、展开、分页、排序、筛选、sticky、多级表头、合并单元格的 API 形态都保持兼容。详见{' '}
            <a href="#/docs/compat-matrix">兼容矩阵</a>。
          </MigrationCostBlock>
        </div>
      </DocSection>

      <DocSection
        id="adjust"
        title="需要同步调整的部分"
        description="下面这些写法需要一起改，才能把 antd Table 的旧语义完整换成 data-grid 的写法。"
      >
        <ul className="docs-bullet-list">
          <li>
            <Text code>scroll.&#123;y: number|string&#125;</Text> 改成 <Text code>scroll=&#123;&#123; y: true &#125;&#125;</Text>，父容器只要通过布局或尺寸约束提供稳定的可用高度即可，不要让内容把容器撑开；原先用 resize 监听手算高度的代码应删掉（详见 <a href="#/docs/scroll-y">scroll.y 语义</a>）。
          </li>
          <li>
            <Text code>render</Text> 返回 <Text code>&#123; children, props &#125;</Text> 旧对象只消费 <Text code>children</Text>；合并格 / cell props 改用 <Text code>column.onCell</Text>（详见 <a href="#/docs/deprecated-antd-members">过时成员</a>）。
          </li>
          <li>
            依赖 <Text code>tbody &gt; tr &gt; td</Text> 选择器的样式要改用 <Text code>classNames</Text> / <Text code>styles</Text> 的 Semantic DOM 槽位（详见 <a href="#/docs/semantic-dom">Semantic DOM</a>）。
          </li>
        </ul>
      </DocSection>

      <DocSection
        id="avoid"
        title="这些场景 data-grid 明确不做或未系统支持"
        description="data-grid 有清晰的边界。下面这些场景迁过来会撞墙——要么改业务方预期，要么留到 backlog 解决。"
      >
        <ul className="docs-bullet-list">
          <li>
            <Text strong>架构边界 / 兼容缺口</Text>：data-grid 不复刻原生 table / thead / tbody / tr DOM、不提供完整 ARIA table / row / rowgroup role 树、
            <Text code>scroll.y</Text> 不接受数字 / 字符串 max-height、RTL 未系统支持、
            <Text code>components</Text> 仅暴露 <Text code>body.cell</Text> / <Text code>body.row</Text>（无 header.cell / wrapper / table）。详见{' '}
            <a href="#/docs/known-limitations">已知限制页</a>。
          </li>
          <li>
            <Text strong>依赖大量过时成员</Text>：例如
            <Text code>column.filterDropdownOpen</Text> / <Text code>column.onFilterDropdownOpenChange</Text> 等已过时字段未暴露；旧
            <Text code>render</Text> 返回的 <Text code>props</Text> 字段会被忽略。
          </li>
          <li>
            <Text strong>需要逐字对齐 antd 历史所有 API</Text>：data-grid 优先对齐真实业务常用的 antd v6 Table 行为，不追求全量历史兼容 API。
          </li>
        </ul>
      </DocSection>

      <DocSection id="next" title="相关参考">
        <ul className="docs-bullet-list">
          <li>
            如果你已经决定开始迁移，先看 <a href="#/docs/migrate-from-antd">如何从 antd Table 迁移</a>。
          </li>
          <li>
            如果你还想确认兼容边界，先看 <a href="#/docs/compat-matrix">兼容矩阵</a> 和{' '}
            <a href="#/docs/known-limitations">已知限制</a>。
          </li>
        </ul>
      </DocSection>
    </>
  )
}
