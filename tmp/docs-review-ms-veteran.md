## 一、总评

data-grid 文档站的三栏骨架（左侧目录 / 中正文 / 右本文目录）方向正确，且以组件自身渲染参考表格、以左右双栏对照展示迁移差异，体现了对产品的信心。但文档区被当作次于示例区的对象：示例区顶栏功能完整，文档区切过去后搜索、主题编辑器、虚拟化开关全部消失。整体上，该站点把"组件库文档"做成了"产品落地页 + 迁移备忘录"，尚未成为一份可供 API 查询的参考型文档。对照 antd（其迁移源与母体）与 Microsoft Learn（其架构范式参照），在信息架构、外壳完整度、API 参考深度、代码可交互性、封装边界与中文写作六个层面存在系统性差距。

## 二、评审范围与方法

**评审对象**：主页、文档区（22 篇文档）、示例区（含左右对照框架），以及对应源码（`src/docs/*`、`src/App.tsx`、`src/DocsPage.tsx`、`src/HomePage.tsx`、`src/demos/*`）。

**证据来源**：

- 源码静态分析，关键结论标注文件与行号；
- 真浏览器渲染核对（chrome-devtools，覆盖主页、文档页、示例页）；
- 对照基准站结构核对：Microsoft Learn Fluent UI Web Components 经真浏览器验证；Ant Design 文档特征基于其长期稳定的公开范式。

**信息来源层级**：data-grid 侧结论均有源码或渲染实证；对照基准侧，Learn 部分经真浏览器验证，antd 部分为公知范式（未逐一抓取，如需严格对标可另行验证）。

## 三、值得肯定之处

1. **三栏布局符合 Microsoft Learn 经典范式**。`DocsPage` 采用左侧目录（`DocsToc`）+ 中正文 + 右本文目录（`ArticleToc`）的三栏结构，方向正确。
2. **以组件自身渲染参考表格（dogfooding）**。`DocsDataGrid` 直接调用 `GridTable` 渲染文档内的 API 表，表明对自身组件的信心。
3. **示例区对照说明质量高**。`#/demos/virtual-list` 等页底部以"差异行为 / 触发条件 / 差异原因"三栏对照 data-grid 与 antd，并深链到 `docs/design-notes/*`，是全站信息密度最高的部分，亦为 antd 文档所不具备。

## 四、问题发现

### 4.1 信息架构

**存在内容完全相同的重复页面**。`docRegistry.tsx:206-215` 定义的"Table API 摘要"（slug `api-summary`），其描述原文为"旧入口保留，内容等同 Table API"，`render` 指向与"Table API"相同的 `renderTableApi`，`sections` 亦一致；且"Table API"页底部的"下一篇"按钮（`components.tsx:73-79`）直接指向该重复页，使导航流主动进入内容相同的页面。

**分组重叠，同一主题散落多处**。"参考"组内含"公开 API / Table API / Table API 摘要 / Column API / gridOptions"五个 API 切面；"核心概念"中的"API 命名空间"又讲 gridOptions 与 Table props 的分工；"兼容矩阵"与"过时 antd Table 成员"高度重叠。同一问题（如 `rowSelection` 的支持程度）需在四页之间查找。

**"功能指南"为模板化薄页**。`pages.tsx:654-729` 的 `renderFeaturePage` 工厂生成 columns / layout / scrolling / interaction / styling / api 六篇，每篇基本只有一段概述加一组示例跳转按钮，缺乏实质操作指引。

**文档首页为索引表而非入门**。`pages.tsx:428-475` 的"阅读路径"是一张九行表格（范围 / 说明 / 入口），与左侧目录重复；且"入口"列词性混用（动作"API 参考"与名词"兼容矩阵"并存）。

### 4.2 外壳与导航

**文档区顶栏被掏空**。`App.tsx:362-408` 中，搜索框、主题编辑器、虚拟化开关均以 `isDemoArea` 为条件渲染；切至文档区后顶栏仅余 logo 与 Light/Dark 切换。文档区无搜索功能（`src/docs/` 内对"搜索"零命中）。

**左侧目录为死平铺**。22 篇文档全展开、不可折叠、无过滤搜索。

**面包屑半残**。`DocsPage.tsx:120-134` 的面包屑仅第一级"Docs"为链接，分组与标题为静态文本，且无 `aria-label="breadcrumb"` 语义。

**全站无版本号**。顶栏、页脚、文档元信息均无 `@nukepayload2/data-grid` 的版本号；对照之下，示例区右栏却标注了 `antd 6.4.4`（`SplitDemo.tsx:63-65`）。仅 `intro` 一篇带手写"更新于 2026-07-12"，其余 21 篇无任何更新信息。

### 4.3 API 参考

**API 表为手写概要，非完整 Properties 参考**。`table-api` 页（`pages.tsx:249-262`）仅"属性 / 用途 / 说明"三列、12 行，由作者主观挑选，无类型签名、默认值、版本、必填、deprecated 标记；`rowClassName`、`onChange`、`loading`、`bordered`、`size` 等常用项缺失。`gridOptions` 页（`pages.tsx:274-291`）虽有五列，仍为手写、易与源码漂移。

**未从类型自动生成**。站点已具备 `TableProps`、`ColumnType`、`gridOptions` 的 TypeScript 类型，却以人工誊写表格，未接 typedoc 之类的类型导出工具——手抄自身类型系统，属自废武功。

### 4.4 代码示例

**全站只读**。`DocsCode` → `CodeView` → `CodeMirrorEditor readOnly`（`CodeView.tsx:12-30`），props 仅 `code / height / maxHeight / ariaLabel`，无复制按钮、无语言切换、无 CodeSandbox / StackBlitz 导出、不可编辑。示例区的 `LiveEditor`（`live/LiveEditor.tsx`）已具备可编辑能力，却仅限示例区，文档区无法享用。

**文档与示例割裂**。文档页为只读代码加"优先查看的 demo"跳转按钮，可交互示例位于独立的 `#/demos`；读者需在两区之间切换。

### 4.5 封装边界

文档多处向使用者暴露内部实现细节：

- **内部函数名**：`pages.tsx:346` 直接写出运行时内部函数 `normalizeRenderedCell`。
- **内部数据结构与 DOM 机制**：`pages.tsx:587` 提及内部数据结构"列树"；`pages.tsx:404 / 407` 使用内部概念"逻辑行"；Semantic DOM 页通篇披露内部 DOM 组织（无 thead / tbody / tr、"一行由多个 grid cell 直接铺开"）。
- **无障碍缺陷的根因外泄**：`pages.tsx:414-426` 的 a11y 矩阵每行"结论"列说明根因（"CSS Grid 路径没有 thead / tbody 容器""没有可承载 role=row 的行容器"），既暴露架构短板，亦将内部 DOM 结构固定为事实契约。使用者只需知道"哪些 ARIA 已支持 / 未支持"。
- **escape-hatch 与常规选项混排**：`pages.tsx:309-311` 的 `renderCellElement` / `renderCellReact` / `disposeCellElement`（HTMLElement 级低层 hook）与 `dragColumnLock` 等常规选项同列展示。
- **"公开声明不公开"反模式**：`pages.tsx:864-871` 以专门一节声明"拖拽 hooks 不作为公开 API"，反而坐实了内部 hook 的存在。

> 甄别：`virtualizationMode: 'standard' | 'recycling'` 对齐 WPF `System.Windows.Controls.VirtualizationMode` 枚举，属正统命名，不构成封装问题。

### 4.6 中文说明文写作

**翻译腔**：`pages.tsx:916`"会按迁移价值选择保留、降级或不暴露"为英文 "depending on…, choose to retain, downgrade, or not expose" 的逐词直译；`pages.tsx:919-921`"引导到当前 API"= "guide to"。

**长定语与多分句堆叠**：`pages.tsx:738` 一句含三个分句、三个主语（data-grid / CSS Grid 渲染路径 / 未消费槽位）；`pages.tsx:757`"可在不破坏 ARIA 父子层级的前提下补齐的属性"为 18 字前置定语。

**卡片化、缺连贯**：每节为 eyebrow + title + 孤立定义句，章节间无过渡；lede 多为名词短语（`pages.tsx:198`"常用 Table props 和 Table 静态属性。"）而非完整导语。

**模板句**：`renderFeaturePage` 六篇正文句式雷同（"…都以 ColumnType 为中心组织""…都落在 CSS Grid 布局模型上"），名词串加空泛动词，信息量低。

**主语跳跃**：`pages.tsx:600` 一段内主语在 data-grid / 表格 / 能力之间切换。

**术语漂移**：同物异名——"过时成员"（标题）与"deprecated 成员"（正文）；"槽位"与"slot"；scroll.y 的"数据区滚动模式 / 数据区模式 / 纵向滚动模式"。

**eyebrow 冗余**：`pages.tsx:480-499` 的 quick-start 四节，eyebrow 与 title 信息重叠（"JSX" / "JSX 列声明"、"继续" / "下一步"）。

### 4.7 对标分析

**对照 Microsoft Learn Fluent UI Web Components**（经真浏览器验证）：

- Learn 控件页仅 3–5 个固定板块（描述 + Setup + Example iframe + Additional Resources），**无** Attributes / Properties / Methods / Events / Slots 表，button 页正文仅 59 词——属"demo gallery + setup snippet"，并非 API 参考站。因此**富 API 表不应以 Learn 为范本**，应超越之（对齐 antd / FAST / Material UI）。
- 可向 Learn 学习的是：左侧 TOC 可折叠树 + 全局搜索、breadcrumb 每级可点、概念页主题句先行的写作风格、严格两层的浅 IA（6 桶：Overview / Getting started / Components / Integrations / Design System / Other Info）。
- Learn 该套页面自身亦无版本切换器、无 "Edit this page"（"More actions" 菜单仅 Reading mode / Copy Markdown / Print），反馈控件禁用（`feedback_system: None`）。

**对照 Ant Design 文档**（基于公开范式）：

- antd 组件页内嵌可交互 demo（配可展开代码 + 一键 CodeSandbox）；data-grid 将文档与示例分置两区。
- antd 每组件开头有"何时使用"及选型指引；data-grid 缺设计层"为何用、何时迁移、何时不应迁移"。
- antd API 表属性名可点击、deprecated 醒目标注、附版本；data-grid 的 `DocsDataGrid` 纯文本、不可点、不带 deprecated。
- antd demo 标配 CodeSandbox；data-grid 仅 LiveEditor 本地编辑，无可分享沙箱。
- antd 每组件可锚 changelog；data-grid 仅 intro 一篇手写日期。

**关键反讽**：data-grid 独有的 SplitDemo + 差异矩阵是 antd 文档所不具备的迁移杀手锏，却仅存于示例区，文档区几乎不引用——作为"antd 迁移目标"，文档既未达到 antd 的成熟度，亦未将自身差异化优势呈现出来。
