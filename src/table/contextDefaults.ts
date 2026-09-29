/**
 * ConfigProvider `table` 上下文的**唯一**归一点（BAT-29 第 3 片 / 29-A）。
 *
 * 参照 = **已安装的 antd 6.4.4**（`node_modules/antd/es/table/InternalTable.js`），本轮逐行实读：
 * - `:83-86` `const { locale: contextLocale = defaultLocale, table } = React.useContext(ConfigContext)`
 *   ⇒ `table` 段直接挂在 ConfigContext 上（不是 `${prefix}-table` 键；`:96` 的
 *   `useComponentConfig('table')` 只取 `className/style/classNames/styles` 四件，与本模块无关）。
 * - `:136-139` 展开图标（**嵌套**路径，不是顶层 `table.expandIcon`）：
 *   `mergedExpandable = { childrenColumnName, expandIconColumnIndex, ...expandable,
 *   expandIcon: expandable?.expandIcon ?? table?.expandable?.expandIcon }`
 * - `:165` 行键：`const rowKey = customizeRowKey || table?.rowKey || 'key'` ⇒ props > 上下文 > 内置（`||` 语义）。
 * - `:167` 滚动：`const mergedScroll = scroll ?? table?.scroll` ⇒ **整对象** `??`
 *   （props 只要给了 `scroll` 对象，上下文里的其余子字段一概不再参与）。
 * - **实读否证两条**（与上游提示词的字面锚点冲突，已在日志按 P-089 记「以实测为准」）：
 *   本版本 `InternalTable.js` 里 `grep -n "expandRowByClick\|needExpandColumn"` **零命中**
 *   ⇒ 参照**没有** `table?.expandRowByClick` 兜底、也**没有** `needExpandColumn = !!table?.expandIcon || …` 判据；
 *   同样**没有**顶层 `table?.expandIcon`（只有 `table?.expandable?.expandIcon`）。
 *   ⇒ 本模块**不实现**这三条参照里不存在的字段（"参照没有的，我们不造"）。
 *
 * 本仓此前完全没有消费 `table` 上下文（`Table.tsx` 的 `rowKey = 'key'` 只是 props 默认值）
 * ⇒ 用户写 `<ConfigProvider table={{ rowKey: 'id' }}>` 时我们回退 `'key'`，记录里没有 `key` 字段
 * ⇒ 行标识变 `undefined` ⇒ 选择 / 展开 / 虚拟化的键全撞（实测读数见
 * `tmp/56-vitest-probe2.log`：修前 dg 勾选一行 → `keys: [null]`，修后 → `["a"]`）。
 *
 * 判据只写一次（本文件）：`Table.tsx` 只消费返回值，渲染处不再各写一份 `?? table?.xxx`。
 * 上下文值由 `Table.tsx` **既有的那一份** `useContext(ConfigContext)` 传入（不新开 context 面）。
 */
import type { Expandable, TableProps } from './types'

/**
 * 上下文字段的类型**直接转引本仓公开 props 的同名字段类型**
 * （手写一份更宽的形状会把下游 `scroll?.x` / `rowKey` 消费点撑出类型错——本轮实测踩过）。
 * 参照 antd 6.4.4 `config-provider/context.d.ts:160-167` 的 `TableConfig` 也是同形转引
 * （`rowKey?: TableProps['rowKey']`、`scroll?: TableProps['scroll']`）。
 */
export interface TableComponentConfig {
  rowKey?: TableProps<any>['rowKey']
  scroll?: TableProps<any>['scroll']
  expandable?: { expandIcon?: Expandable['expandIcon'] }
}

/** 归一结果：三项都已按参照优先级合并完毕，消费点直接用。 */
export interface MergedTableContextDefaults {
  /**
   * 完整三档链 `props.rowKey || table?.rowKey || 'key'`（参照 `:165` 逐字同形，含终端缺省）。
   *
   * ⚠️ 终端 `'key'` **必须**留在本层（不放回 `Table.tsx`）：验收判据是「props → 上下文 → 缺省」
   * 这条回落链在归一层**只有一份**。消费点只做类型收窄，不得再写一次 `?? 'key'`。
   */
  rowKey: NonNullable<TableComponentConfig['rowKey']>
  /** `props.scroll ?? table.scroll`（整对象 `??`，与参照 `:167` 同形）。 */
  scroll: TableComponentConfig['scroll']
  /**
   * 参照 `:136-139` 的 `mergedExpandable`：props 未给 `expandIcon` 时注入
   * `table.expandable.expandIcon`（**嵌套**路径，参照没有顶层 `table.expandIcon`）。
   *
   * 与参照的一处**有意差异**：参照无条件造对象（`{ childrenColumnName, expandIconColumnIndex, ...expandable }`），
   * 我们只在**确实要注入上下文图标**时才造对象，否则原样返回 props 引用（含 `undefined`）。
   *
   * 理由（本棒实测校订——原文写的是"本仓以 `expandable !== undefined` 判是否出展开列，
   * 凭空造空对象会让现有 demo 多出展开列"，**那句不成立**，按 P-087 手工改）：
   * 出展开列的真判据是 `engine/useRowExpand.ts:47`
   * （`if (!expandable || typeof expandable.expandedRowRender !== 'function') return out`
   * → `expandEnabled = expandableKeySet.size > 0`），空对象过不了第二道子句。
   * 实测：把本行改成"无条件造对象"的变异体，`Table.context.test.tsx` **16/16 仍全绿**
   * （含钉 DOM 零增量的 V10）⇒ "多出展开列/新增 DOM"是假话。
   * 保留惰性形状的真实理由有两条，都不是行为差异：
   * ① `expandable` 引用身份稳定 ⇒ 下游以它为依赖的 `useMemo`（`engineExpandState` 等）不每帧重算；
   * ② 没有上下文可注入时不去无端替换调用方传来的对象。
   */
  expandable: Expandable | undefined
}

/**
 * 归一 ConfigProvider `table` 上下文的三项（rowKey / scroll / expandable.expandIcon）。
 *
 * 纯函数（不碰 hook / context），故 `Table.tsx` 里既有的那一份 `useContext(ConfigContext)` 直接喂它。
 *
 * @param props 同名表级 props（**props 赢**，与参照一致）
 * @param table ConfigProvider 的 `table` 段（可缺省）
 */
export function normalizeTableContextDefaults(
  props: {
    rowKey?: TableComponentConfig['rowKey']
    scroll?: TableComponentConfig['scroll']
    expandable?: Expandable
  },
  table: TableComponentConfig | undefined,
): MergedTableContextDefaults {
  const contextExpandIcon = table?.expandable?.expandIcon
  const { expandable } = props
  return {
    // 参照 `:165` 是 `||`：空串这类假值不当作"已给"，继续往上下文落；
    // 三档全缺 ⇒ 终端缺省 `'key'` 也在本层收尾（消费点不再补写）。
    rowKey: props.rowKey || table?.rowKey || 'key',
    // 参照 `:167` 是整对象 `??`。
    scroll: props.scroll ?? table?.scroll,
    // 参照 `:138` 是 `expandable?.expandIcon ?? table?.expandable?.expandIcon`。
    expandable:
      contextExpandIcon !== undefined && expandable?.expandIcon === undefined
        ? { ...expandable, expandIcon: contextExpandIcon }
        : expandable,
  }
}
