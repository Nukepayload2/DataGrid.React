import { Collapse, Typography } from 'antd'
import type { ReactNode } from 'react'
import {
  DocSection,
  DocsActionList,
  DocsCode,
  DocsNote,
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

// 复用模板：把迁移规约和已知限制一次性交给 AI 助手，由它按文件上下文逐项改写。
// 该模板不替代 codemod，也不承诺覆盖所有历史 antd Table 行为。
const MIGRATION_PROMPT = `# 任务
请将当前文件中的 antd Table 用法迁移到 @nukepayload2/data-grid，并尽量保持现有业务行为、变量命名和组件结构不变。

我会在同一轮对话中提供待迁移的 TSX/TS 文件内容。请先识别其中与 antd Table 相关的 import、类型、columns、rowSelection、expandable、pagination、scroll、components、render、onCell 等用法，再按下面规则改写。

# 迁移规则
1. 顶层 import 与类型 import 改为 @nukepayload2/data-grid：
   - \`import { Table } from '@nukepayload2/data-grid'\`
   - \`import type { TableProps, ColumnsType, ColumnType } from '@nukepayload2/data-grid'\`
2. \`scroll={{ y: <number|string> }}\` 改为 \`scroll={{ y: true }}\`。data-grid 的 \`scroll.y\` 表示数据区域模式，不再接收高度数字。
   表格高度应由父容器提供，例如 \`flex: 1; min-height: 0\` 或固定 \`height\`。如果原代码通过 resize 监听手算 \`scroll.y\`，请删除这条计算链路，并把高度约束移到容器样式中。
3. 如果 \`column.render\` 返回 \`{ children, props }\` 旧对象形态，请改为直接返回 ReactNode；单元格属性、合并单元格等逻辑改用 \`column.onCell\`。
4. 如果样式依赖 \`<table>\` / \`<thead>\` / \`<tbody>\` / \`<tr>\` / \`<td>\` 选择器，请改用 \`classNames\` / \`styles\` 的 Semantic DOM 槽位，或通过 \`components.body.cell\` / \`components.body.row\` 注入。
5. data-grid 专属能力应放入命名空间，不要混入 antd 顶层 props：
   - 列宽拖拽：\`gridOptions.resizable\` + \`gridOptions.columnResizeMode\`
   - 行高模型：\`gridOptions.rowHeight\` / \`minRowHeight\` / \`maxRowHeight\` / \`headerHeight\`
   - 行 / 列拖拽排序：\`gridOptions.rowDragSort\` / \`columnDragSort\`
   - recycling 虚拟化：\`gridOptions.virtualizationMode: 'recycling'\`
   - 悬浮滚动条策略：\`gridOptions.scrollBarFoldMode\` / \`scrollbar.visibility\`

# 兼容边界
- data-grid 不复刻原生 \`<table>\` / \`<thead>\` / \`<tbody>\` / \`<tr>\` DOM，也不伪造完整 ARIA table / row / rowgroup role 树。
- \`scroll.y\` 不支持 antd 的 number / string max-height 语义。
- \`components\` 目前仅暴露 \`body.cell\` / \`body.row\`，不提供 \`header.cell\` / \`wrapper\` / \`table\`。
- RTL 尚未系统支持。
- 已 deprecated 的 antd 字段不必保留，例如 \`column.filterDropdownOpen\` / \`column.onFilterDropdownOpenChange\`。

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

// 10 类高频病灶浓缩表（源自 feedbacks/README.md 与用户迁移反馈）。
// 每行：antd 病灶类别 + GitHub issue 链接 + data-grid 一句话解药 + 对照 demo（5 个 drop-in demo 全挂）。
// 没有现成 demo 的类别留 "—" 并在解药列里指引到对应 docs / 相关 demo。
const painToCureRows: PainToCureRow[] = [
  {
    key: 'column-width-source',
    category: '1. 列宽真理源散落',
    painQuestion: '列宽对不齐，空数据时还会跳动',
    humanSummary: '表头和表体的列对不齐；表格没数据时，列宽会突然缩小或来回跳。',
    antdPain: (
      <>
        两个 table + colgroup + 占位 th 拼，表头 / 表体错位、空数据列宽缩减跳动、跨 DPI 滚动条占位不一致。证据：{issueLink(45524)}{' '}
        {issueLink(56151)} {issueLink(56713)} {discLink(56477)} {discLink(56602)}
      </>
    ),
    dataGridCure: (
      <>
        列宽唯一真理源 = <Text code>grid-template-columns</Text>，表头 / 表体共享同一 grid；空数据与动态列无中间态，永不回退 <Text code>table-layout: auto</Text>。
      </>
    ),
    demo: (
      <a href="#/demos/stable-empty-width">空数据列宽稳定 demo</a>
    ),
  },
  {
    key: 'scrollbar-fragmentation',
    category: '2. 自绘滚动条 + wheel 监听',
    painQuestion: '虚拟滚动条点不动，滚轮手感也怪',
    humanSummary: '打开虚拟滚动后，滚动条不能点击拖动，滚轮的速度和手感也跟普通页面不一样。',
    antdPain: (
      <>
        rc-virtual-list 自监听 wheel，步长 / 手感与原生不一致；自绘滚动条不可点击；虚拟 / 非虚拟两套机制形态分裂。证据：{issueLink(44972)}{' '}
        {issueLink(45637)} {issueLink(53813)} {issueLink(56956)} {discLink(50583)}
      </>
    ),
    dataGridCure: (
      <>
        优先浏览器原生滚动容器，横向必须自绘时走 <Text code>FloatingScrollBar</Text>（8px hit 区 + 轨道点击 + 键盘箭头）；<Text code>scrollbar.visibility</Text> 做成 first-class。
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
        <Text code>scroll.y</Text> 是 number / string max-height 语义，没有真正的 fill / auto 模式；社区方案通常是监听 resize、读 <Text code>window.innerHeight</Text> 或容器尺寸、扣掉表头等固定区域后 <Text code>setState</Text>。本仓 antd 对照 demo 也只能用 <Text code>ResizeObserver</Text> 测容器后计算 <Text code>scrollY</Text>，再传给 <Text code>scroll.y</Text>。动态切换 y 还可能触发行高、滚动条占位、MeasureRow 反复重算。证据：{discLink(53395)}{' '}
        {discLink(56465)} {issueLink(49445)}
      </>
    ),
    dataGridCure: (
      <>
        <Text code>scroll.y</Text> 只做数据区域模式开关，真实高度交给父容器的 CSS flex / height 链；表格内部用同一个滚动容器和 grid track 消费可用空间，不要求业务在 resize 时把高度数字塞回 Table。
      </>
    ),
    demo: (
      <>
        见 <a href="#/docs/scroll-y">scroll.y 语义</a>、<a href="#/demos/fixed-header">固定表头 demo</a>、<a href="#/demos/dom-recycled-virtual-list-antd">antd 大量数据对照 demo</a>
      </>
    ),
  },
  {
    key: 'dynamic-row-height',
    category: '4. 动态行高 / 数据前插未锚定',
    painQuestion: '行高变化或插入新行时，滚动位置乱跳',
    humanSummary: '每行高度不一样，或者往表格前面插新行时，你正在看的位置会突然跑到别处。',
    antdPain: (
      <>
        rc-virtual-list 行高变化或头部 unshift 新行时未把增量累加回 scrollTop，视觉位置漂移；虚拟 + 树形 10w 行不兼容。证据：{issueLink(54769)}{' '}
        {issueLink(53932)} {issueLink(48938)} {discLink(36153)}
      </>
    ),
    dataGridCure: (
      <>
        对齐 react-virtuoso 的 AATree / offsetTree 增量高度索引 + ResizeObserver；<Text code>gridOptions</Text> 行高有界（<Text code>minRowHeight</Text> / <Text code>maxRowHeight</Text>，<Text code>rowSpan</Text> 豁免）。
      </>
    ),
    demo: (
      <>
        见 <a href="#/docs/scrolling">滚动和虚拟化</a>
      </>
    ),
  },
  {
    key: 'summary-in-virtual',
    category: '5. summary / 分组行塞进虚拟容器',
    painQuestion: '一开虚拟滚动，表尾汇总就没了',
    humanSummary: '表格底部那行合计 / 小计，打开虚拟滚动之后就不再正常停在表尾了。',
    antdPain: (
      <>
        antd 把 summary 渲染在虚拟列表 scroll 容器内，维护者确认「虚拟下 summary 只能 fixed」；行分组 6 年未内置；嵌套子表头无吸顶。证据：{issueLink(47184)}{' '}
        {issueLink(15630)} {issueLink(36066)}
      </>
    ),
    dataGridCure: (
      <>
        summary / 分组头 / 小计独立于虚拟窗口（独立 <Text code>tfoot</Text> 或 sticky 区，不进入虚拟行容器）。
      </>
    ),
    demo: (
      <a href="#/demos/virtual-summary">虚拟汇总共存 demo</a>
    ),
  },
  {
    key: 'scrollto-pollution',
    category: '6. scrollTo 用 scrollIntoView 连外层一起滚',
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
        <Text code>scrollTo(&#123; index?, key?, left?, top?, behavior? &#125;)</Text> 直接赋 scrollTop（基于 offsetTree 计算 targetTop），禁用 scrollIntoView；虚拟 / 非虚拟同实现。
      </>
    ),
    demo: (
      <a href="#/demos/scrollto-scoped">精准滚动定位 demo</a>
    ),
  },
  {
    key: 'fixed-shadow-sticky',
    category: '7. fixed 列 box-shadow + sticky 双表格',
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
        fixed 边界用 1px border + 渐变 mask 替代 box-shadow；表头粘性用 grid item 的 <Text code>position: sticky</Text>，单一 grid 共享 track。
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
    category: '8. 可伸缩列长期空缺',
    painQuestion: '想要拖拽改列宽——antd 没有原生支持',
    humanSummary: '想用鼠标拖拽改变列宽，antd 自己不带这个能力，得额外接第三方库。',
    antdPain: (
      <>
        react-resizable 多年不维护，mouseup / pointerup 丢失导致拖拽卡死、每帧 setColumns 引发整表重渲染；colgroup 假宽度（设 100 实渲染 400）。证据：{issueLink(56356)}{' '}
        {discLink(48152)}
      </>
    ),
    dataGridCure: (
      <>
        <Text code>gridOptions.resizable</Text> + <Text code>columnResizeMode</Text> 拖拽用 ref + RAF，结束 commit 到 <Text code>grid-template-columns</Text>，浏览器原生处理列宽无需 React 重渲染。
      </>
    ),
    demo: (
      <a href="#/demos/resizable-columns">可伸缩列 demo</a>
    ),
  },
  {
    key: 'merge-cell-coord',
    category: '9. 合并单元格坐标系错位',
    painQuestion: '展开行或树形和合并单元格一起用会错位',
    humanSummary: '把行合并和展开行 / 树形数据一起用，单元格会算错位置，画面直接错乱。',
    antdPain: (
      <>
        rowSpan 声明式（合并 N 个原始数据行）与展开行 / 树形子节点命令式插入的 <Text code>tr</Text> 坐标系不一致；fixed 列 left 偏移未感知 colSpan 渲染结构，<Text code>colSpan:0</Text> 仍污染偏移。证据：{issueLink(53862)}{' '}
        {issueLink(54860)} {issueLink(34129)}
      </>
    ),
    dataGridCure: (
      <>
        用「实际渲染行」坐标系，rowSpan 用 <Text code>grid-row: span N</Text> 表达；计算 fixed 偏移跳过 <Text code>colSpan: 0</Text> 的隐藏单元格。
      </>
    ),
    demo: (
      <>
        见 <a href="#/demos/merged-cells">合并单元格 demo</a>
      </>
    ),
  },
  {
    key: 'measure-row-oscillation',
    category: '10. 空数据 / 动态列 MeasureRow 震荡',
    painQuestion: '增删列或空数据时表格高度抖动',
    humanSummary: '增加或删除列、表格没数据时，表格的宽度高度会反复跳动，肉眼可见的不稳定。',
    antdPain: (
      <>
        MeasureRow + FixedHeader「全或无」策略：任一列 width 为 undefined 整缓存作废，回退 <Text code>table-layout: auto</Text>；裸 <Text code>scroll.x: 'max-content'</Text> 在嵌套布局发散到 1e6px。证据：{discLink(55717)}{' '}
        {issueLink(48715)} {discLink(56115)} {issueLink(56357)}
      </>
    ),
    dataGridCure: (
      <>
        <Text code>grid-template-columns</Text> 声明式无中间态；<Text code>auto</Text> 列用 <Text code>minmax(min-content, 1fr)</Text> 而非裸 max-content；scrollbar 走独立 grid track 而非占位 th。
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

export function renderWhenToMigrate({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection
        id="fit"
        eyebrow="适合迁移"
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
            <Text strong>多级表头 + 合并 + 固定列组合</Text>：CSS Grid 渲染模型让三者能在同一套布局下共存，避免传统 React 表格底层库（如 rc-table）在复杂组合下的对齐漂移。
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
        eyebrow="痛点 → 解药"
        title="antd Table 常被吐槽的 10 类问题，data-grid 怎么解"
        description="下面 10 条是迁移收益更直接、业务方更容易感知的 antd Table 痛点，每条展开后能看到 antd 的具体表现（附 GitHub 链接）、data-grid 的做法，以及可以直接打开的对照 demo。先扫一眼标题清单，对哪条感兴趣就点开哪条。"
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
        <DocsNote title="为什么这些问题都同源">
          这些问题大多不是孤立小 bug，而是表格布局和滚动模型叠出来的副作用：antd Table 用多个 table、colgroup、滚动条占位和 JS 测量拼出最终布局，列宽、高度和滚动状态分散在不同层里。data-grid 用一张 CSS Grid 同时承载表头和表体，列宽只在一处声明（<Text code>grid-template-columns</Text>），高度交给父容器 CSS 链路，减少对 resize 监听、占位列和异步测量的依赖。
        </DocsNote>
      </DocSection>

      <DocSection
        id="cost"
        eyebrow="迁移成本"
        title="迁移成本总体可控，兼容边界需要提前确认"
        description="在常见表格场景中，data-grid 延续了 antd Table 的主要 props 与类型形态；但它不是对 antd 历史行为的逐字复刻。迁移前应先确认以下差异，避免把架构取舍误判为实现缺口。"
      >
        <div style={{ display: 'grid', gap: 18 }}>
          <MigrationCostBlock title="可以直接延续的部分">
            顶层 import 与类型 import 切到 <Text code>@nukepayload2/data-grid</Text> 后，基础表格、列定义、选择、展开、分页、排序、筛选、sticky、多级表头、合并单元格的 API 形态都保持兼容。详见{' '}
            <a href="#/docs/compat-matrix">兼容矩阵</a>。
          </MigrationCostBlock>
          <MigrationCostBlock title="需要同步调整的部分">
            <ul className="docs-bullet-list">
              <li>
                <Text code>scroll.&#123;y: number|string&#125;</Text> 改成 <Text code>scroll=&#123;&#123; y: true &#125;&#125;</Text>，父容器必须给 <Text code>flex: 1; min-height: 0</Text> 或固定 height；原先用 resize 监听手算高度的代码应删掉（详见 <a href="#/docs/scroll-y">scroll.y 语义</a>）。
              </li>
              <li>
                <Text code>render</Text> 返回 <Text code>&#123; children, props &#125;</Text> 旧对象只消费 <Text code>children</Text>；合并格 / cell props 改用 <Text code>column.onCell</Text>（详见 <a href="#/docs/deprecated-antd-members">过时成员</a>）。
              </li>
              <li>
                依赖 <Text code>tbody &gt; tr &gt; td</Text> 选择器的样式要改用 <Text code>classNames</Text> / <Text code>styles</Text> 的 Semantic DOM 槽位（详见 <a href="#/docs/semantic-dom">Semantic DOM</a>）。
              </li>
            </ul>
          </MigrationCostBlock>
          <MigrationCostBlock title="不纳入兼容承诺的部分">
            <ul className="docs-bullet-list">
              <li>不复刻原生 <Text code>{'<table>'}</Text> / <Text code>{'<thead>'}</Text> / <Text code>{'<tbody>'}</Text> / <Text code>{'<tr>'}</Text> DOM；不伪造完整 ARIA table / row / rowgroup role 树。</li>
              <li><Text code>scroll.y</Text> 不接受 antd 的 number / string max-height 语义。</li>
              <li><Text code>components</Text> 仅暴露 <Text code>body.cell</Text> / <Text code>body.row</Text>（无 <Text code>header.cell</Text> / <Text code>wrapper</Text> / <Text code>table</Text>）。</li>
              <li>RTL 未系统支持；详见 <a href="#/docs/known-limitations">已知限制</a>。</li>
            </ul>
          </MigrationCostBlock>
        </div>
      </DocSection>

      <DocSection
        id="prompt"
        eyebrow="AI 辅助"
        title="使用提示词辅助完成 antd Table 迁移"
        description="对于单个业务文件，可以先用提示词统一迁移规则，再把待迁移的 TSX / TS 内容作为同一轮上下文提供给 Claude Code、GitHub Copilot Chat 或 Cursor。coding agent 应先给出迁移计划，确认后再改文件。"
      >
        <DocsCode code={MIGRATION_PROMPT} height={420} ariaLabel="迁移提示词模板" />
        <DocsNote title="用法">
          1) 复制上方整段提示词；2) 在同一轮对话中附上待迁移文件内容或文件路径；3) 先审查 agent 给出的迁移计划；4) 同意计划后再让 agent 修改文件并检查变更摘要。
        </DocsNote>
        <DocsActionList
          actions={[
            { label: '从 antd 迁移', kind: 'doc', value: 'migrate-from-antd' },
            { label: '兼容矩阵', kind: 'doc', value: 'compat-matrix' },
            { label: '已知限制', kind: 'doc', value: 'known-limitations' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>

      <DocSection
        id="avoid"
        eyebrow="先别迁"
        title="这些场景 data-grid 明确不做或未系统支持"
        description="data-grid 有清晰的边界。下面这些场景迁过来会撞墙——要么改业务方预期，要么留到 backlog 解决。"
      >
        <ul className="docs-bullet-list">
          <li>
            <Text strong>架构边界 / 兼容缺口</Text>：data-grid 不复刻原生 table / thead / tbody / tr DOM、不伪造完整 ARIA table / row / rowgroup role 树、
            <Text code>scroll.y</Text> 不接受数字 / 字符串 max-height、RTL 未系统支持、
            <Text code>components</Text> 仅暴露 <Text code>body.cell</Text> / <Text code>body.row</Text>（无 header.cell / wrapper / table）。详见{' '}
            <a href="#/docs/known-limitations">已知限制页</a>。
          </li>
          <li>
            <Text strong>依赖大量 deprecated antd 成员</Text>：例如
            <Text code>column.filterDropdownOpen</Text> / <Text code>column.onFilterDropdownOpenChange</Text> 等已 deprecated 字段未暴露；旧
            <Text code>render</Text> 返回的 <Text code>props</Text> 字段会被忽略。
          </li>
          <li>
            <Text strong>需要逐字对齐 antd 历史所有 API</Text>：data-grid 优先对齐真实业务常用的 antd v6 Table 行为，不追求全量历史兼容 API。
          </li>
        </ul>
      </DocSection>

      <DocSection id="next" eyebrow="继续" title="相关参考">
        <DocsActionList
          actions={[
            { label: '从 antd 迁移', kind: 'doc', value: 'migrate-from-antd' },
            { label: '已知限制', kind: 'doc', value: 'known-limitations' },
            { label: '兼容矩阵', kind: 'doc', value: 'compat-matrix' },
            { label: '过时成员', kind: 'doc', value: 'deprecated-antd-members' },
            { label: 'Semantic DOM', kind: 'doc', value: 'semantic-dom' },
            { label: 'gridOptions 能力清单', kind: 'doc', value: 'grid-options' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}
