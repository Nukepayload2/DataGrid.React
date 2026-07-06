/**
 * 行高系统 hook — 详见 docs/design-notes/virtualization.md 与 row-height.md。
 *
 * 集中行高派生 + 行级 callback，对齐 react-virtuoso 的动态行高模型（AATree/offsetTree + gridOptions
 * 的 min/max 有界约束）。从 GridTable.tsx 抽出，仅搬位置不改逻辑（铁律：先移动不重写）。
 *
 * 由于依赖顺序为 `getRowHeight → virtualState → effectiveRowHeight`（useVirtualList 消费
 * getRowHeight，effectiveRowHeight 消费 virtualState.sizeOf），逻辑拆为两个 hook：
 *
 * 1. **`useRowHeightSystem`**（virtualState 之前调用）：派生 + `getRowHeight`。
 *    - `gridRowHeightOpt`：gridOptions.rowHeight 原值（number | function | undefined）。
 *    - `minRowHeightRaw` / `maxRowHeightRaw`：gridOptions.minRowHeight / maxRowHeight 原值。
 *    - `resolvedRowHeight`：`gridRowHeightOpt ?? (virtualEnabled ? 56 : undefined)`
 *      （虚拟默认 56，对齐 antd virtual-list 表观行高）。
 *    - `boundedRowHeight`：min/max **同时**为正数且 min ≤ max 时启用「有界行高模型」。
 *    - `minRowHeight` / `maxRowHeight`：有界时为对应数值，否则 undefined。
 *    - `getRowHeight(index)`：useVirtualList 算 offset/totalSize 的唯一行高来源（每行调用，热路径）。
 *      有界模式回退用 minRowHeight（保证 track=auto + 行容器 min-height 下虚拟窗口初始 offset 与
 *      首屏一致，首测后由 sizeOf 实测接管）；固定模式取 resolvedRowHeight 数值化。
 *
 * 2. **`useEffectiveRowHeight`**（virtualState 之后调用）：`effectiveRowHeight(i)` body track 行高取值。
 *    有界模型实测优先（sizeOf 闭环），未测回退 getRowHeight，clamp 到 [min,max]；
 *    固定模型直接取 getRowHeight(i)。
 *
 * 行高是虚拟滚动核心，本模块只搬编排不重写不优化；callback 引用必须稳定（useCallback 包）。
 */
import { useCallback } from 'react'
import type { EngineTableProps } from './engineTypes'
import { clampSize, resolveNumericRowHeight } from './cellRenderUtils'

/** virtualState 的最小依赖形状（仅 sizeOf；来自 useVirtualList，避免引入完整类型）。 */
export interface RowHeightVirtualStateLike {
  sizeOf: (index: number) => number
}

/** useRowHeightSystem 入参。 */
export interface UseRowHeightSystemOptions<RecordType> {
  /** gridOptions 原值（仅读取 rowHeight/minRowHeight/maxRowHeight）。 */
  gridOptions: EngineTableProps<RecordType>['gridOptions']
  /** 数据源（行高函数 / index 访问用）。 */
  dataSource: Array<RecordType>
  /** 虚拟滚动是否启用（驱动 resolvedRowHeight 默认 56）。 */
  virtualEnabled: boolean
}

/** useRowHeightSystem 返回值。 */
export interface UseRowHeightSystemResult {
  /** gridOptions.rowHeight 原值（number | function | undefined）。 */
  gridRowHeightOpt: NonNullable<NonNullable<EngineTableProps['gridOptions']>['rowHeight']> | undefined
  /** 有界模型下解析出的 minRowHeight（数值 or undefined）。 */
  minRowHeight: number | undefined
  /** 有界模型下解析出的 maxRowHeight（数值 or undefined）。 */
  maxRowHeight: number | undefined
  /** rowHeight 解析后的"约定行高"（缺省时虚拟默认 56，非虚拟 undefined）。 */
  resolvedRowHeight: NonNullable<NonNullable<EngineTableProps['gridOptions']>['rowHeight']> | undefined
  /** 有界模型是否启用（min/max 同时为正且 min ≤ max）。 */
  boundedRowHeight: boolean
  /** 行级 callback（useVirtualList 行高来源；热路径）。引用稳定。 */
  getRowHeight: (index: number) => number
}

/**
 * 行高系统阶段 1：派生 + getRowHeight。
 *
 * 铁律：派生 + getRowHeight callback 字节级对齐原 GridTable.tsx 内联块（先移动不重写）。
 */
export function useRowHeightSystem<RecordType>(
  options: UseRowHeightSystemOptions<RecordType>,
): UseRowHeightSystemResult {
  const { gridOptions, dataSource, virtualEnabled } = options

  // === 虚拟滚动：约定行高 + 有界行高模型 — 详见 docs/design-notes/virtualization.md 与 row-height.md ===
  // getRowHeight 是 useVirtualList 算 offset/totalSize 的唯一行高来源。
  // 此处只用"收起态"约定行高，不感知展开态（详见 useVirtualList 注释 + docs/design-notes/virtualization.md）。
  //
  // rowHeight 仅来自 `gridOptions.rowHeight`。优先级：`gridOptions.rowHeight` > 虚拟默认 56
  //   （对齐 antd virtual-list 表观行高，antd large ≈ 55）。
  // boundedRowHeight：minRowHeight 与 maxRowHeight **同时**为正数时启用「有界行高模型」
  //   （行随内容在 [min,max] 变高，body track=auto + 行容器 min/max-height 约束）。
  //   仅设其一或都未设 → 固定行高模型（body track = `${effectiveRowHeight}px`）。
  const gridRowHeightOpt = gridOptions?.rowHeight
  const minRowHeightRaw = gridOptions?.minRowHeight
  const maxRowHeightRaw = gridOptions?.maxRowHeight
  const resolvedRowHeight = gridRowHeightOpt ?? (virtualEnabled ? 56 : undefined)
  const boundedRowHeight =
    typeof minRowHeightRaw === 'number' &&
    minRowHeightRaw > 0 &&
    typeof maxRowHeightRaw === 'number' &&
    maxRowHeightRaw > 0 &&
    minRowHeightRaw <= maxRowHeightRaw
  const minRowHeight = boundedRowHeight ? (minRowHeightRaw as number) : undefined
  const maxRowHeight = boundedRowHeight ? (maxRowHeightRaw as number) : undefined
  const getRowHeight = useCallback(
    (index: number) => {
      // 有界模式下，未测行回退用 minRowHeight（而非 rowHeight），保证 track=auto + 行容器 min-height
      // 时虚拟窗口初始 offset 与首屏一致（首测后由 sizeOf 实测接管）。
      if (boundedRowHeight) {
        const rec = dataSource[index]
        const declared =
          typeof gridRowHeightOpt === 'function'
            ? resolveNumericRowHeight(gridRowHeightOpt, rec, index)
            : typeof gridRowHeightOpt === 'number'
              ? gridRowHeightOpt
              : minRowHeightRaw
        return clampSize(declared, minRowHeightRaw, maxRowHeightRaw)
      }
      return resolvedRowHeight === undefined
        ? 0
        : resolveNumericRowHeight(resolvedRowHeight, dataSource[index], index)
    },
    [
      boundedRowHeight,
      gridRowHeightOpt,
      minRowHeight,
      maxRowHeight,
      dataSource,
      resolvedRowHeight,
    ],
  )

  return {
    gridRowHeightOpt,
    minRowHeight,
    maxRowHeight,
    resolvedRowHeight,
    boundedRowHeight,
    getRowHeight,
  }
}

/** useEffectiveRowHeight 入参。 */
export interface UseEffectiveRowHeightOptions {
  /** 有界模型是否启用。 */
  boundedRowHeight: boolean
  /** 虚拟滚动是否启用。 */
  virtualEnabled: boolean
  /** 虚拟状态（仅消费 sizeOf）。 */
  virtualState: RowHeightVirtualStateLike
  /** 阶段 1 计算的 getRowHeight（未测行回退用）。 */
  getRowHeight: (index: number) => number
  /** 有界模型 min（数值 or undefined）。 */
  minRowHeight: number | undefined
  /** 有界模型 max（数值 or undefined）。 */
  maxRowHeight: number | undefined
}

/**
 * 行高系统阶段 2：effectiveRowHeight（body track 行高取值）。
 *
 * 铁律：effectiveRowHeight callback 字节级对齐原 GridTable.tsx 内联块（先移动不重写）。
 * 须在 useVirtualList 之后调用（依赖 virtualState.sizeOf）。
 *
 * 行为：有界模型实测优先（sizeOf 闭环），未测回退 getRowHeight，clamp 到 [min,max]；
 *      固定模型直接取 getRowHeight(i)。
 */
export function useEffectiveRowHeight(options: UseEffectiveRowHeightOptions): (i: number) => number {
  const {
    boundedRowHeight,
    virtualEnabled,
    virtualState,
    getRowHeight,
    minRowHeight,
    maxRowHeight,
  } = options

  // === effectiveRowHeight：body track 行高取值 — 详见 docs/design-notes/virtualization.md ===
  //   - 有界模型（minRowHeight/maxRowHeight 均设）：实测优先（sizeOf 闭环），未测回退 getRowHeight；
  //     clamp 到 [min,max]；body track 取该值（min-height/max-height 同样约束行容器，二者一致保对齐）。
  //   - 固定模型（默认）：取 getRowHeight(i)（= resolvedRowHeight 数值化）。
  // 该值同时回填到每行 cell 的 `data-known-size`（实测闭环，避免 useRowMeasurements 死循环）。
  const effectiveRowHeight = useCallback(
    (i: number): number => {
      if (boundedRowHeight) {
        const measured = virtualEnabled ? virtualState.sizeOf(i) : 0
        const base = measured > 0 ? measured : getRowHeight(i)
        return clampSize(base, minRowHeight, maxRowHeight)
      }
      return getRowHeight(i)
    },
    [boundedRowHeight, virtualEnabled, virtualState, getRowHeight, minRowHeight, maxRowHeight],
  )

  return effectiveRowHeight
}
