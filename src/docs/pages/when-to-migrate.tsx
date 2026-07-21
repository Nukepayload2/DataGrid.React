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

// 复用模板：贴进 Claude / Copilot 即可自动改 antd → data-grid。不做 codemod；
// 只把迁移规约和已知限制一次性交给 model，让它逐文件改。
const MIGRATION_PROMPT = `# 任务
把下面这段 antd Table 代码迁移到 @nukepayload2/data-grid，保持业务行为等价。

# 必须改的写法
1. 顶层 import 与类型 import 切到 @nukepayload2/data-grid：
   - \`import { Table } from '@nukepayload2/data-grid'\`
   - \`import type { TableProps, ColumnsType, ColumnType } from '@nukepayload2/data-grid'\`
2. \`scroll={{ y: <number|string> }}\` 改成 \`scroll={{ y: true }}\`（数据区域模式）。
   父容器必须给出高度：\`flex: 1; min-height: 0\` 或固定 height。
3. \`column.render\` 返回 \`{ children, props }\` 的旧对象形态，改成直接返回 ReactNode；
   单元格 props / 合并格改用 \`column.onCell\`。
4. 不要依赖原生 \`<table>\` / \`<thead>\` / \`<tbody>\` / \`<tr>\` / \`<td>\` 选择器；
   样式通过 \`classNames\` / \`styles\` 的 Semantic DOM 槽位或 \`components.body.cell\` / \`body.row\` 注入。
5. data-grid 专属能力进命名空间，不要塞回顶层 props：
   - 列宽拖拽：\`gridOptions.resizable\` + \`gridOptions.columnResizeMode\`
   - 行高模型：\`gridOptions.rowHeight\` / \`minRowHeight\` / \`maxRowHeight\` / \`headerHeight\`
   - 行 / 列拖拽排序：\`gridOptions.rowDragSort\` / \`columnDragSort\`
   - recycling 虚拟化：\`gridOptions.virtualizationMode: 'recycling'\`
   - 悬浮滚动条策略：\`gridOptions.scrollBarFoldMode\` / \`scrollbar.visibility\`

# 已知限制（不要试图复刻 antd 行为）
- 不输出原生 \`<table>\` / \`<thead>\` / \`<tbody>\` / \`<tr>\` DOM；不伪造完整 ARIA table / row / rowgroup role 树。
- \`scroll.y\` 不接受 number / string max-height 语义。
- \`components\` 仅暴露 \`body.cell\` / \`body.row\`（无 header.cell / wrapper / table）。
- RTL 未系统支持。
- 部分已 deprecated 的 antd 字段不暴露（如 column.filterDropdownOpen / onFilterDropdownOpenChange）。

# 输出要求
- 只输出迁移后的代码 + 一段变更说明（列出改了哪些点、哪些点因已知限制需要业务方确认）。
- 不要新加业务功能，不要重命名业务变量。

# 待迁移代码
\`\`\`tsx
<PASTE_YOUR_ANTD_TABLE_FILE_HERE>
\`\`\``

// 12 类病灶浓缩表（源自 feedbacks/README.md 蛇打七寸）。
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
    key: 'dynamic-row-height',
    category: '3. 动态行高 / 数据前插未锚定',
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
    category: '4. summary / 分组行塞进虚拟容器',
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
        <Text code>scrollTo(&#123; index?, key?, left?, top?, behavior? &#125;)</Text> 直接赋 scrollTop（基于 offsetTree 计算 targetTop），禁用 scrollIntoView；虚拟 / 非虚拟同实现。
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
    category: '7. 可伸缩列长期空缺',
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
    category: '8. 合并单元格坐标系错位',
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
    category: '9. 空数据 / 动态列 MeasureRow 震荡',
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
  {
    key: 'naming-debt',
    category: '10. 命名 / 语义 / token 历史债',
    painQuestion: 'API 命名混乱，主题做不出层次',
    humanSummary: '同一个意思的 API 名字到处不一样；想做主题也找不到合适的颜色变量来分层。',
    antdPain: (
      <>
        <Text code>position</Text> / <Text code>placement</Text> 全库混用；<Text code>size</Text> 取值不统一；bg token 只有 3 级无梯度，做不出强辨识度主题。证据：{discLink(54068)}{' '}
        {discLink(54633)} {discLink(53112)}
      </>
    ),
    dataGridCure: (
      <>
        v1 直接立稳 RFC：<Text code>pagination.placement</Text>、<Text code>size: medium | small | large</Text>、位置用 <Text code>start | end</Text>（RTL 友好）；多级 bg token（<Text code>--dg-color-bg-container</Text> / <Text code>-secondary</Text> / <Text code>-tertiary</Text>）。
      </>
    ),
    demo: <>—</>,
  },
  {
    key: 'edit-ellipsis-pagination-semantic',
    category: '11. 编辑 / ellipsis / 分页 / 树形 API 语义混乱',
    painQuestion: '编辑、省略号、分页、树形总有反直觉的坑',
    humanSummary: '这些常用功能在 antd 里有不少反直觉的默认行为：编辑不刷新、省略号把内容吃掉、分页改了不通知。',
    antdPain: (
      <>
        <Text code>shouldCellUpdate</Text> 返回 true 仍不重渲染；ProTable <Text code>ellipsis: true</Text> 清空 render 元素 inline style；分页 clamp 静默不触发 onChange；列隐藏丢 filter 状态；树形 <Text code>rowExpandable</Text> 失效。证据：{issueLink(37995)}{' '}
        {issueLink(50965)} {discLink(55876)} {issueLink(37823)} {issueLink(32154)} {discLink(54459)}
      </>
    ),
    dataGridCure: (
      <>
        API 语义清晰：ellipsis 作用于单元格层不重新包装 render 返回元素；列状态机单一真理源（visibility / filter / sorter / width 各自独立字段）；<Text code>expandable.rowExpandable</Text> 对树形生效。
      </>
    ),
    demo: <>—</>,
  },
  {
    key: 'long-tail-api',
    category: '12. 固定表体高度 / 动画 / iPad / 嵌套边框长尾',
    painQuestion: '固定表体高度、iPad 滚动条、嵌套边框等长尾问题',
    humanSummary: '一些零散但确实影响体验的问题：没法让表体固定高度、iPad 上滚动条被遮挡、嵌套表格边框少一截。',
    antdPain: (
      <>
        无 API 让表体固定高度（<Text code>scroll.y</Text> 仅 max-height）；Popover 动画无法组件级关闭；iPad fixed 列遮滚动条；嵌套表 <Text code>bordered</Text> 缺上边框；expand / selection 顺序锁死。证据：{issueLink(49445)}{' '}
        {issueLink(56334)} {issueLink(46640)} {issueLink(58744)} {issueLink(48385)} {issueLink(53918)}
      </>
    ),
    dataGridCure: (
      <>
        <Text code>bodyHeight</Text> 一等公民 API；<Text code>scrollbar.visibility</Text> 组件级控制；motion 下沉单元格级；嵌套边框用兄弟选择器而非 <Text code>:first-child</Text>；前置特殊列顺序可配（<Text code>leadingColumns</Text>）。
      </>
    ),
    demo: <>—</>,
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
        title="antd Table 常被吐槽的 12 类问题，data-grid 怎么解"
        description="下面 12 条是 antd Table 用户反复反馈的真实痛点，每条展开后能看到 antd 的具体表现（附 GitHub 链接）、data-grid 的做法，以及可以直接打开的对照 demo。先扫一眼标题清单，对哪条感兴趣就点开哪条。"
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
          这 12 类问题的根子其实是同一件事：antd Table 用两个独立的表格拼出布局，列宽信息散落在多个地方（表头一个表、表体一个表、再补一层占位列），只要其中一处对不上，整张表就会错位、跳动、卡顿。data-grid 用一张 CSS Grid 同时承载表头和表体，列宽只在一处声明（<Text code>grid-template-columns</Text>），从根上避免了对不齐的可能——所以这些坑不是逐个打补丁修掉的，而是被同一套布局模型一起解决了。
        </DocsNote>
      </DocSection>

      <DocSection
        id="cost"
        eyebrow="迁移成本"
        title="一行 import drop-in，但请先看诚实限制"
        description="多数顶层 props（columns / dataSource / rowKey / rowSelection / expandable / pagination / sticky / bordered / size）同名同义可直接复用；但 data-grid 不追求逐字复刻 antd 全量行为，下面这些限制会影响是否需要额外改业务代码。"
      >
        <DocsNote title="drop-in 部分（一行 import 即可）">
          顶层 import 与类型 import 切到 <Text code>@nukepayload2/data-grid</Text> 后，基础表格、列定义、选择、展开、分页、排序、筛选、sticky、多级表头、合并单元格的 API 形态都保持兼容。详见{' '}
          <a href="#/docs/compat-matrix">兼容矩阵</a>。
        </DocsNote>
        <DocsNote title="必须改写的部分（务必让业务方确认）">
          <ul className="docs-bullet-list">
            <li>
              <Text code>scroll.&#123;y: number|string&#125;</Text> 改成 <Text code>scroll=&#123;&#123; y: true &#125;&#125;</Text>，父容器必须给 <Text code>flex: 1; min-height: 0</Text> 或固定 height（详见 <a href="#/docs/scroll-y">scroll.y 语义</a>）。
            </li>
            <li>
              <Text code>render</Text> 返回 <Text code>&#123; children, props &#125;</Text> 旧对象只消费 <Text code>children</Text>；合并格 / cell props 改用 <Text code>column.onCell</Text>（详见 <a href="#/docs/deprecated-antd-members">过时成员</a>）。
            </li>
            <li>
              依赖 <Text code>tbody &gt; tr &gt; td</Text> 选择器的样式要改用 <Text code>classNames</Text> / <Text code>styles</Text> 的 Semantic DOM 槽位（详见 <a href="#/docs/semantic-dom">Semantic DOM</a>）。
            </li>
          </ul>
        </DocsNote>
        <DocsNote title="data-grid 明确不做（迁移前请确认业务方能否接受）">
          <ul className="docs-bullet-list">
            <li>不复刻原生 <Text code>{'<table>'}</Text> / <Text code>{'<thead>'}</Text> / <Text code>{'<tbody>'}</Text> / <Text code>{'<tr>'}</Text> DOM；不伪造完整 ARIA table / row / rowgroup role 树。</li>
            <li><Text code>scroll.y</Text> 不接受 antd 的 number / string max-height 语义。</li>
            <li><Text code>components</Text> 仅暴露 <Text code>body.cell</Text> / <Text code>body.row</Text>（无 <Text code>header.cell</Text> / <Text code>wrapper</Text> / <Text code>table</Text>）。</li>
            <li>RTL 未系统支持；详见 <a href="#/docs/known-limitations">已知限制</a>。</li>
          </ul>
        </DocsNote>
      </DocSection>

      <DocSection
        id="prompt"
        eyebrow="AI 辅助"
        title="一段提示词让 Claude / Copilot 自动改 antd → data-grid"
        description="不做 codemod。把下面这段模板复制到 Claude Code / GitHub Copilot Chat / Cursor，再贴上待迁移的 antd 文件即可。模板已内置迁移规约与已知限制，model 只需逐文件应用——而不是每次都从头解释 data-grid 的取舍。"
      >
        <DocsCode code={MIGRATION_PROMPT} height={420} ariaLabel="迁移提示词模板" />
        <DocsNote title="用法">
          1) 复制上方整段提示词；2) 把 <Text code>{'<PASTE_YOUR_ANTD_TABLE_FILE_HERE>'}</Text> 替换成实际 antd 代码；3) 贴进 Claude / Copilot；4) model 输出迁移代码 + 变更说明，业务方按变更说明确认已知限制是否影响当前业务。
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
