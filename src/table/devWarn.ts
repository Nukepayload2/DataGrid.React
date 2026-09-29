/**
 * `[data-grid]` 开发态告警的**唯一出口**：环境门、前缀、去重三件事只在这一个文件里判一次。
 *
 * ## 为什么要有它（现值，非历史）
 * 本包 5 处开发态提示（重复 `SELECTION_COLUMN` / 重复 `EXPAND_COLUMN` / `EXPAND_COLUMN` 无展开列／
 * 分页 async 可疑配置 ／ 函数式 `column.title`）此前是 5 处**裸** `console.warn('[data-grid] …')`，
 * 没有任何环境判断 ⇒ 生产构建里照发。这里收口成一份带环境门的出口，调用点只写正文。
 *
 * ## 环境门为什么写成裸 `process.env.NODE_ENV`（与参照同形，实测裁定）
 * 参照 `antd 6.4.4 es/_util/warning.js:13-15` 就是 `if (process.env.NODE_ENV !== 'production')`，
 * 其发布的 ES 产物里保留**裸引用**（实测 `antd/es/table/InternalTable.js:168`），由**消费者的打包器**
 * 决定折量：消费者 dev ⇒ 发，消费者 production ⇒ 折成假并整条 DCE。
 * 我方实测（`tmp/72-probe/`，Vite 8.1.4）：
 * - **库构建**（`build:lib` 档位）同样保留裸引用 ⇒ 与参照同契约，dev 消费者的告警不丢；
 * - **应用构建**（`build:docs` 档位）会把它折成 `"production"` 并**整条 DCE** ⇒ 生产包里确实不发。
 * 换成 `typeof process !== 'undefined' && …` 这类守卫写法会被实测**挡住 DCE**（守卫本身不可静态求值），
 * 结果是生产浏览器包里仍然打印告警 ⇒ 待修缺陷原样保留，只是形态从"炸"变成"吼"，故不采用。
 * 代价（如实登记在 `docs/reference/known-limitations.md`）：**不经任何打包器**直接跑 `dist/` 时，
 * 告警调用点会抛 `ReferenceError: process is not defined`；这个代价参照自己也付（同款裸引用）。
 *
 * ## 判据在调用期读，而非模块顶层捕获
 * 顶层 `const isProd = …` 会把结论固化在模块初始化那一刻，测试里无法按用例切换档位；
 * 调用期读让 `NODE_ENV` 的取值跟着当前环境走（vitest 走 Vite 的 server consumer，不做替换 ⇒ 活读）。
 *
 * ## 去重两层，但**只有这一份**判据（本仓硬规矩：不许留两处相似特例）
 * 一张 `Set`、一处 `has/add`，键用前缀分两档：
 * - `m:<消息正文>`＝**消息级**（防刷屏）：与参照同形——`@rc-component/util 1.11.1 es/warning.js:45-50`
 *   的 `call()` 按消息去重、`:42-44` 的 `resetWarned()` 复位，而 antd 在 `NODE_ENV === 'test'` 时
 *   每条告警后立刻复位（`antd 6.4.4 es/_util/warning.js:17-19`）。**这一档在测试态不复位就写不进表**，
 *   否则同一文案只有第一条用例能命中、其余全是空断言。
 * - `k:<调用方给的键>`＝**语义级**"每个 X 只说一次"（如函数式 title 按列键去重）。
 *   这一档测试态**照样去重**：它是产品语义（同一列只吼一次），不是控制台防刷屏，用例正是在钉它。
 *
 * ## 生产路径不引入状态
 * 生产档位在 `has/add` **之前**就返回 ⇒ 去重表在生产里既不被读也不被写。
 * 顶层那张空 `Set` 的分配与参照同形（`@rc-component/util 1.11.1 es/warning.js:2` 的 `let warned = {}`）。
 */

/** 通道前缀：正文由调用点给，前缀与分隔空格统一在这里拼（用户与测试都按它过滤）。 */
const CHANNEL_PREFIX = '[data-grid]'

/** 消息级去重键的命名空间前缀（与语义级键区分开，测试态只复位消息级那一档）。 */
const MESSAGE_KEY = 'm:'

/** 语义级去重键的命名空间前缀（`onceKey` 由调用方给，形如 `column-title-function:<列键>`）。 */
const SCOPE_KEY = 'k:'

/**
 * `process` 的类型面兜底（**不发射任何代码**，TS 整条擦掉 ⇒ 产物里仍是裸引用，
 * 消费者的打包器照常折量＋DCE；实测见「为什么写成裸 `process.env.NODE_ENV`」一节）。
 * 本仓 `tsconfig.lib.json` 的 `types` 只有 `vite/client`、刻意不引 `@types/node`
 * （库源码不依赖 Node 类型面，同 `vite.config.ts` 里"经 globalThis 取值以免依赖 @types/node"的取舍），
 * 而这里的判据必须写成**可用的裸表达式**才能被折量 ⇒ 就地声明用到的那一格，不动 tsconfig。
 */
declare const process: { env: { NODE_ENV?: string } }

/** 已经发过的去重键。模块级 ⇒ 跨 Table 实例只说一次（开发诊断取"宁可少说也不刷屏"）。 */
const warnedKeys = new Set<string>()

/**
 * 发一条 `[data-grid]` 开发态告警：生产档位不发，其余档位按去重键至多发一次。
 *
 * 两条环境判据都**内联在本函数体内**、不抽 `isProduction()` 之类的间接层：实测
 * （`tmp/72-evidence-probe-real-helper.txt`）抽出函数后，应用构建只会把函数体折成 `return true`、
 * 调用体的 `console.warn` 仍留在包里；写成内联裸判据才折成常量并整条 DCE。
 *
 * @param message 告警正文（**不要**自带 `[data-grid]` 前缀，前缀由本函数统一拼）。
 * @param onceKey 可选的语义级去重键。省略＝按消息正文去重（防刷屏）；传入＝按这个键去重
 *                （"每个 X 只说一次"，测试态也不复位）。
 */
export function devWarnOnce(message: string, onceKey?: string): void {
  // 生产门（参照同形：`antd 6.4.4 es/_util/warning.js:13-15`）。生产档位在此就返回 ⇒ 不读也不写去重表。
  if (process.env.NODE_ENV === 'production') return

  // 消息级去重在测试态复位（参照 `resetWarned()`）；语义级去重始终生效。
  const messageDedupeDisabled = onceKey === undefined && process.env.NODE_ENV === 'test'
  if (!messageDedupeDisabled) {
    const key = onceKey === undefined ? `${MESSAGE_KEY}${message}` : `${SCOPE_KEY}${onceKey}`
    if (warnedKeys.has(key)) return
    warnedKeys.add(key)
  }

  // eslint-disable-next-line no-console
  console.warn(`${CHANNEL_PREFIX} ${message}`)
}
