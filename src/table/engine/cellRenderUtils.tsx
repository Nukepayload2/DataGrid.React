import { isValidElement, type ReactNode } from 'react'
import type { EngineLeafColumn, EngineTableProps, FixedSide } from './types'

export interface RenderedCellLike {
  children?: ReactNode
  props?: Record<string, any>
}

export interface NormalizedRenderedCell {
  children: ReactNode
}

export function isRenderedCellLike(value: unknown): value is RenderedCellLike {
  if (!value || typeof value !== 'object') return false
  if (isValidElement(value)) return false
  return 'children' in value || 'props' in value
}

export function normalizeRenderedCell(rendered: unknown): NormalizedRenderedCell {
  if (!isRenderedCellLike(rendered)) {
    return { children: rendered as ReactNode }
  }
  return {
    children: rendered.children,
  }
}

/**
 * 单元格内容渲染（应用 components.body.cell）。详见 GridTable 文件头 components 机制说明。
 *
 * 提供 components.body.cell 时用它渲染（props 含 children + record + index + dataIndex +
 * onCell 返回值的其余字段 + shouldCellUpdate）；否则直接返回默认内容（rendered）。
 *
 * `onCellProps` 为 column.onCell(record, index) 的完整返回值；仅 colSpan/rowSpan 由 cellMerge 消费，
 * 这里把**完整返回值**透传给 cell 组件（与 antd additionalProps 一致）。
 */
export function renderCellContent({
  components,
  column,
  record,
  index,
  rendered,
  onCellProps,
}: {
  components: EngineTableProps['components']
  column: EngineLeafColumn<any>
  record: any
  index: number
  rendered: ReactNode
  onCellProps: Record<string, any> | undefined
}): ReactNode {
  const CustomCell = components?.body?.cell
  if (!CustomCell) {
    // 默认渲染路径：直接返回 rendered。
    return rendered
  }
  // 透传 props：children + record + index + dataIndex + shouldCellUpdate + onCell 返回值的全部字段。
  // onCellProps 可能含 colSpan/rowSpan（cellMerge 已消费，这里仍透传，cell 组件一般不读）。
  const cellProps: Record<string, any> = {
    children: rendered,
    record,
    index,
    dataIndex: column.dataIndex,
    shouldCellUpdate: column.shouldCellUpdate,
    ...onCellProps,
  }
  return <CustomCell {...cellProps} />
}

/** 数字 → px 字符串；字符串原样返回；null/undefined → undefined。 */
export function toTrack(value: number | string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'number') return `${value}px`
  return value
}

/**
 * ellipsis 默认 title 提示：把单元格/表头内容文本化为 string 供 native `title` 用。详见 docs/design-notes/ellipsis.md。
 *
 * 对齐 antd 默认行为：ellipsis 单元格 hover 显示完整文本（native title）。
 *   - string / number：直接转 string。
 *   - ReactNode（含 JSX / render 返回值）：尝试递归抽取文本（string/number 拼接）；
 *     若含非文本节点（元素/数组等无法可靠文本化）则返回 undefined（与 antd 行为一致：
 *     自定义 render 返回 JSX 时 antd 默认也不显示 title——此时用户应自行包 Tooltip）。
 *   - null/undefined/boolean：返回 undefined（不设 title）。
 *
 * 仅 ellipsis 列调用；非 ellipsis 列不加 title（避免多余 tooltip）。
 */
export function toEllipsisTitle(content: ReactNode): string | undefined {
  if (content === null || content === undefined) return undefined
  if (typeof content === 'string') return content
  if (typeof content === 'number') return String(content)
  if (typeof content === 'boolean') return undefined
  // ReactNode 其它形态（element / array / fragment / portal）：
  // 递归抽取 string/number 文本；遇到非文本（如 element with props 但无 string children 链）
  // 保守返回 undefined（避免给出残缺 title 误导用户）。
  const parts: Array<string> = []
  const walk = (node: ReactNode): boolean => {
    if (node === null || node === undefined || typeof node === 'boolean') return true
    if (typeof node === 'string') {
      parts.push(node)
      return true
    }
    if (typeof node === 'number') {
      parts.push(String(node))
      return true
    }
    // React element：抽 props.children 递归（不抽 element 自身的字符串表示）。
    if (typeof node === 'object' && 'props' in node) {
      const children = (node as { props?: { children?: ReactNode } }).props?.children
      return walk(children)
    }
    // 数组 / iterable：逐项 walk。
    if (Array.isArray(node)) {
      return node.every(walk)
    }
    // 其它形态（Portal / Suspense 等）：不文本化。
    return false
  }
  if (!walk(content)) return undefined
  const joined = parts.join('').trim()
  return joined.length > 0 ? joined : undefined
}

/**
 * 把 `rowHeight`（number 或函数）解析为某行的数值高度（px）。
 * - number：直接返回。
 * - 函数：调用取值；返回 number→原值，返回 string→按 px 数字解析（"40px"→40）；非法→0。
 * - 缺省：返回 0（虚拟滚动要求 rowHeight 必须给数值约定；未给时退化为 0，调用方应避免）。
 *
 * 仅虚拟滚动需要数值化（计算 offset/totalSize 用）；非虚拟路径仍走 `toTrack` 生成 track 字符串。
 * 详见 docs/design-notes/virtualization.md。
 */
export function resolveNumericRowHeight<RecordType>(
  rowHeight: NonNullable<NonNullable<EngineTableProps<RecordType>['gridOptions']>['rowHeight']>,
  record: RecordType,
  index: number,
): number {
  if (typeof rowHeight === 'function') {
    const v = rowHeight(record, index)
    if (typeof v === 'number') return v
    if (typeof v === 'string') {
      // 支持 "40px" / "40" 形式；非纯数字+px 视为 0（约定：虚拟行高必须可数值化）。
      const m = /^([\d.]+)px$/.exec(v.trim())
      if (m) return Number.parseFloat(m[1])
      const asNum = Number.parseFloat(v)
      return Number.isFinite(asNum) ? asNum : 0
    }
    return 0
  }
  if (typeof rowHeight === 'number') return rowHeight
  return 0
}

/**
 * 把 size 限制到 [min, max] 区间（有界行高模型，详见 docs/design-notes/row-height.md）。
 * min/max 任一为 undefined 时不约束该侧；返回取整（与 useRowMeasurements correctRowSize 一致，
 * 避免 sizeTree 写入浮点抖动）。
 */
export function clampSize(size: number, min?: number, max?: number): number {
  let v = size
  if (typeof min === 'number' && v < min) v = min
  if (typeof max === 'number' && v > max) v = max
  return Math.round(v)
}

export function fixedClass(fixed: FixedSide | undefined): string | undefined {
  if (fixed === 'start') return 'dg-cell-fixed-start ant-table-cell-fix-left'
  if (fixed === 'end') return 'dg-cell-fixed-end ant-table-cell-fix-right'
  return undefined
}

/**
 * Body 单元格 ellipsis 列的 native `title` 派生：把原始 dataIndex 值文本化为 string。
 * 详见 docs/design-notes/ellipsis.md。
 *
 * 与 header 端 `toEllipsisTitle`（递归遍历 ReactNode 抽文本）有意区分：Body 这里**只处理
 * 原始 string/number 文本**，对元素/数组/null/undefined/boolean 一律返回 undefined（不强行文本化）。
 *
 * 行为约定（对齐 antd 默认 title 来源）：
 *   - `ellipsis !== true`（false 或 undefined）→ undefined（非 ellipsis 列不加 title，避免多余 tooltip）。
 *   - `showTitle === false` → undefined（让 render 内 antd Tooltip 接管 hover 提示，
 *     与 ellipsis={ showTitle: false } / ellipsis-custom-tooltip demo 兼容）。
 *   - text 是 string → 原字符串。
 *   - text 是 number → `String(number)`（含 `0 → '0'`：用 typeof 严格判定，不用 truthy，避免吞 0）。
 *   - text 其它形态（对象/数组/null/undefined/boolean）→ undefined。
 */
export function resolveBodyCellEllipsisTitle(
  ellipsis: boolean | undefined,
  showTitle: boolean | undefined,
  text: unknown,
): string | undefined {
  if (ellipsis !== true || showTitle === false) return undefined
  if (typeof text === 'string') return text
  if (typeof text === 'number') return String(text)
  return undefined
}

/**
 * 浅拷贝对象并剔除指定 key。
 *
 * 用于 HeaderCell / BodyCell 的事件 props 合并——onClick 等已单独处理（与排序/hover 逻辑合并），
 * 剩余 on* 事件透传到 div 时需剔除已处理的 key，避免重复触发。
 */
export function omitKey<T extends Record<string, unknown>>(obj: T, key: string): Record<string, unknown> {
  if (!obj) return {}
  const { [key]: _omit, ...rest } = obj
  return rest
}

/**
 * 固定列边缘阴影 class。详见 docs/design-notes/fixed-column.md。
 * - 'start' 侧且 isEdge（start 侧最右一列，与普通列交界）→ 'dg-sticky-shadow-start'
 *   （右侧画淡阴影，提示其右还有可滚动内容）。
 * - 'end' 侧且 isEdge（end 侧最左一列）→ 'dg-sticky-shadow-end'
 *   （左侧画淡阴影）。
 *
 * 参数同时兼容 LeafStickyInfo（leafSticky 项）与 headerSticky 的简化对象（{side,isEdge}）。
 */
export function shadowClass(
  info: { side?: FixedSide; isEdge?: boolean } | undefined,
): string | undefined {
  if (!info || !info.side || !info.isEdge) return undefined
  return info.side === 'start' ? 'dg-sticky-shadow-start' : 'dg-sticky-shadow-end'
}
