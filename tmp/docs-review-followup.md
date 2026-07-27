# data-grid 文档现状对照报告

- 复核日期：2026-07-26
- 对照基准：`tmp/docs-review-ms-veteran.md`（MS 老兵评审，2026-07-18）
- 复核方法：6 个并行 subagent——1 个 chrome-devtools 真浏览器核对全站外壳/IA/渲染 + 5 个分组读 `src/docs/pages/*.tsx` 源码深挖内容与中文质量。
- 注意：文档已从单文件 `pages.tsx` 拆成 `pages/*.tsx` 多文件，原评审里的 `pages.tsx:行号` 已失效，本文按内容定位。

## 总体

相比原评审，文档站已**系统性好转**——外壳 10 项核对 7 项完全解决、3 项部分，无退步。中文水平**显著好于原评审描述**，**未发现典型机翻长句，也未发现国外 AI 口癖**（无"让我们/值得注意的是/强大的/优雅的"）。残留问题集中在另一类：**开发者黑话外溢**和**术语治理不彻底**。

## 一、好转矩阵

| 章节 | 问题 | 状态 | 证据 |
|---|---|---|---|
| 4.1 | 重复页 api-summary | ✅ | registry 已删，导航流 0 命中 |
| 4.1 | intro 是索引表非入门 | ✅ | 改写为定位句+活预览+术语表 |
| 4.1 | compat-matrix ↔ deprecated 重叠 | ✅ | 双向 DocsNote + 交叉指针 |
| 4.1 | api-namespace 与参考组重叠 | ✅ | 显式声明分工 + 跳转列表 |
| 4.1 | 功能指南模板薄页 | 🟡 | features 合并 5 篇（数量解决）；scrolling 仅 394 字、styling 仍薄（深度未解决） |
| 4.2 | 顶栏被掏空 | 🟡 | 搜索已两区共享；主题编辑器+Virtual 仍仅示例区 |
| 4.2 | 左目录死平铺 | ✅ | 可过滤（实测"API" 19→8 条）+ 可折叠 |
| 4.2 | 面包屑半残 | ✅ | 三级全可点 + `aria-label="breadcrumb"` |
| 4.2 | 全站无版本号 | ✅ | 顶栏全局 `v1.0.0`（intro 仍独享 updated 日期） |
| 4.2 | 文档区无搜索 | ✅ | combobox "搜索文档…" |
| 4.3 | API 表手写/自废武功 | ✅ | public/table/column/grid-options 全从 api.json 自动生成 |
| 4.3 | table-api 缺项（12 行） | ✅ | 35 行，rowClassName/onChange/loading/bordered/size 全在场 + 类型签名列 |
| 4.3 | 属性不可点 | ✅ | 带稳定 id + 深链 |
| 4.3 | 无版本/必填/deprecated 标记 | ❌ | `ApiMember` 定义了 `deprecated/since`，但 api.json 生成器没产出、UI 不渲染；`required` 数据有却被 UI 吞掉 |
| 4.4 | 全站只读 | 🟡 | 复制按钮已加；intro/quick-start 有可编辑 LiveEditor；其余仍 CodeView readOnly；无语言切换/沙箱导出 |
| 4.5 | 内部函数名/数据结构/DOM 机制外泄 | ✅ | `normalizeRenderedCell`/列树/逻辑行/grid cell 铺开/无 thead-tbody-tr 全部清除；rendering-model 重写为迁移建议 |
| 4.5 | a11y 矩阵根因外泄 | ✅ | 收敛为"支持/不支持"+行为说明 |
| 4.5 | escape-hatch 与常规选项混排 | 🟡 | api.json 已打 `advanced:true`，但渲染器没消费，dragColumnLock 与 3 个 HTMLElement hook 仍同列扁平 |
| 4.6 | 术语漂移（数据区域模式） | ✅ | 新增 `glossary.ts`（canonical + avoid），全 docs 统一 |
| 4.6 | eyebrow/title 冗余（quick-start） | ❌ | 原评审点名的 `JSX/JSX列声明`、`继续/下一步` 逐字未动 |
| 4.6 | 卡片化缺连贯 | 🟡 | rendering-model/scroll-y 的第二节"只有一句 DocsNote、无正文段落" |
| 4.7 | 缺"何时用/何时迁移"设计层 | ✅ | when-to-migrate（9 条痛点→解药带 issue 链）+ migrate-from-antd（SplitDemo 活对照）两篇新增厚页 |

## 二、仍存在的系统性问题（按优先级）

### P0 — 术语治理有机制但执行不彻底（违反自定 glossary）
- `deprecated-antd-members` 内"过时成员/deprecated 成员/旧成员/旧入口/旧写法"五词并用；`when-to-migrate` 用"deprecated 成员"而 `migrate-from-antd` 用"过时成员"（canonical 是"过时成员（deprecated）"）。
- `styling-and-theme` 一句内 token / 设计令牌 / design token / 令牌四种写法并存。
- `quick-start` eyebrow 冗余逐字未动（`JSX/JSX列声明`、`继续/下一步`）。

### P0 — API 表缺 deprecated/since/required 呈现
- 数据层（api.json）和接口层（`ApiMember`）都备好了 `deprecated/since/required`，唯独生成器不产出 + UI 不渲染。把已做好的 80% 卡在最后一步。

### P1 — escape-hatch 分级做了一半
- `advanced` 字段已存在于 api.json，`RefTable` 渲染器没消费。要么渲染时分组/标灰/折进"高级"，要么明确接受现状并在文档说明。

### P1 — 功能指南仍是浅页
- scrolling 仅 394 字、0 代码块；styling 只有 1 段 token 例子；features 合并了 5 篇但仍是导航页。

### P2 — 残留 CSS Grid 实现术语
- architecture-overview / rendering-model 两处"列轨道/行轨道"（=grid track）；semantic-dom 全页"落点/透传/未消费/伪造"。建议改"列宽/行高""对应 DOM 节点/应用/不可用"。

## 三、中文水平专项

**好消息**：无机翻味、无国外 AI 口气；`glossary.ts` 把术语统一做成了可执行机制；v1 的"会按…选择…""引导到"已清零。

**四类残留**（都不是机翻，是中国技术文档通病）：

1. **开发者黑话外溢**（最显眼）：落点 / 透传 / 未消费 / 伪造 / 视觉模块 / 逃逸舱 / 走…路径 / 切换 API 面 / API 表面。
2. **翻译腔单点**（零星可定向清理）：
   - `api-namespace` "API 表面"（=API surface）
   - `scroll-y` "自适应剩余空间的布局"（长定语前置）
   - `architecture-overview` "并保持…尽量可迁移"（keep migratable）
   - `when-to-migrate` "做了取舍的继任者"（a successor that made trade-offs）
   - `table-api` "调用为 no-op" / "暴露根节点"
   - `grid-options` "进入 gridOptions" / "普通业务"
   - `compat-matrix` "存在适配差异" / "不是当前公开能力"
3. **结构性模板雷同**：scrolling / styling 共用 `eyebrow="对照" title="优先查看的 demo"`；多页"优先查看的 demo + 相关文档"组合复用。
4. **卡片化缺连贯**：rendering-model / scroll-y / architecture-overview 的第二节只有一句 DocsNote 或孤立 bullet，章节间无过渡。

## 四、翻译腔/黑话具体清单（供修复定位）

### 开始组
- intro:27 "不追求：兼容依赖原生 table 结构的第三方插件" — 语义相撞（兼容被误读为正向动词）
- intro:53 "覆盖最常见的两种使用场景" — 模板腔
- quick-start:41 `eyebrow="JSX" title="JSX 列声明"` / :49 `eyebrow="继续" title="下一步"` — 冗余未动
- when-to-migrate:274 "做了取舍的继任者" — 长定语前置
- when-to-migrate:313 "迁移收益更直接、业务方更容易感知的…痛点" — 长定语前置
- when-to-migrate:335 "对…的逐字复刻" — 轻度翻译腔
- when-to-migrate:372-380 "deprecated 成员" — 术语漂移（应"过时成员（deprecated）"）
- when-to-migrate 两节共用 eyebrow="迁移成本"
- migrate-from-antd:194 冗余收尾句

### 核心概念组
- architecture-overview:14 "并保持…尽量可迁移"（keep migratable）
- architecture-overview:23 / rendering-model:13 "列轨道/行轨道"（CSS Grid track 实现术语）
- scroll-y:34 "自适应剩余空间的布局"（长定语前置）
- api-namespace:20 "API 表面"（=API surface 硬翻，最刺眼）
- rendering-model / scroll-y 第二节只有一句 DocsNote

### 功能指南组
- features:17 "收敛到…上配置" / "切换 API 面"（API surface）/ "逃逸舱回调" / "互相拆台"
- features:63 `eyebrow="demo"` 裸英文小写（其余 eyebrow 中文）
- scrolling:15 "走 DOM 复用路径"
- styling:35 "走 antd ConfigProvider" / "视觉模块" / "顶栏 Modal" / "token 改动"
- styling:45 一句内 token/设计令牌/design token/令牌四写法
- semantic-dom 通篇"落点/透传/未消费/伪造"
- semantic-dom:31 "sticky 模式使用 sticky viewport"（同义反复+未译）
- semantic-dom:83 "可在不破坏 ARIA 父子层级的前提下补齐的属性直接输出"（长定语前置）

### 参考组
- public-api:127 "统一进入 gridOptions"（enter into）
- table-api:19 "深指"（生造）/ :31 "暴露根节点" / :38 "调用为 no-op"
- compat-matrix:18 "存在适配差异" / :21 "不是当前公开能力" / :17 "维持 antd 使用习惯"
- deprecated-antd-members:86 "会根据迁移价值分别处理" / :92 "会被明确忽略，并指向"（被动+主语缺失）/ :101 同义反复填充句
- grid-options:45 "进入 gridOptions" / :46 "顶层兼容面" / :88 "普通业务" / "优先使用默认"

## 五、结论

架构层（IA、外壳、API 自动生成、封装边界、术语机制）已从"不及格"拉到"达标甚至优秀"。剩下的是文案打磨（开发者黑话、术语统一执行、薄页加深）和两个半成品功能（advanced 分级、deprecated/required 渲染）的收尾。
