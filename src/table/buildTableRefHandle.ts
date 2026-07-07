/**
 * `useImperativeHandle(ref, () => {...})` factory 的纯函数形式（从 Table.tsx 抽出，机械搬运）。
 *
 * 把 `Table.tsx` L918–963 的内联 factory 提为独立纯函数，便于单测 + 解耦。
 *
 * - `scrollTo({ key })`：在适配层根据 `rowKey` 把 key → index，再转给引擎 `scrollTo({ index })`。
 *   引擎层只处理 index/scrollTop（虚拟窗口内逻辑），保持解耦。
 * - 非 virtual 模式下 `scrollTo` 为 no-op（engine 为 null 时直接 return，不报错；与 antd 在
 *   非虚拟下 ref.scrollTo 不可用一致）。
 *
 * 详见 `docs/engineering-refactor-table-hooks.md` §3.2②。
 */
import { getRowKey } from './engine/GridTable'
import type { TableRef } from './types'

/**
 * 引擎对外暴露的句柄子集（仅 scrollTo）。与 `Table.tsx` 内部 `TableEngineHandle` 同构，
 * 这里独立定义避免引擎类型外泄到对外 API 文档。
 */
export interface TableEngineLike {
  scrollTo: (config: {
    index?: number
    scrollTop?: number
    offset?: number
    align?: 'start' | 'center' | 'end' | 'nearest'
    /** 'auto'（默认，瞬时）| 'smooth'（原生平滑动画 + 到达检测）。 */
    behavior?: 'auto' | 'smooth'
  }) => void
}

/**
 * 构建 Table ref 句柄（scrollTo + nativeElement）。
 *
 * @param engine 引擎实例（可能为 null——非虚拟模式或尚未挂载时）。
 * @param nativeElement `.dg-wrapper` DOM（可能为 null）。
 * @param flattenedDataSource 引擎实际渲染的数据源（排序+筛选+树形扁平化后）——key→index 解析依此。
 * @param rowKey 行 key 解析器（string 字段名或函数）。
 */
export function buildTableRefHandle<RecordType>(
  engine: TableEngineLike | null,
  nativeElement: HTMLDivElement | null,
  flattenedDataSource: Array<RecordType>,
  rowKey: string | ((record: RecordType) => string | number),
): TableRef {
  return {
    scrollTo: (config) => {
      if (!engine) return
      // key → index：在适配层根据 rowKey 解析（引擎不感知 key 语义）。
      // 用 flattenedDataSource（引擎实际渲染的数据源顺序——排序+筛选+树形扁平化后），
      //   否则排序/筛选/树形展开后 scrollTo(key) 会滚到错误行。
      if (config.key !== undefined) {
        const key = config.key
        const idx = flattenedDataSource.findIndex(
          (rec) => getRowKey(rec, rowKey) === key,
        )
        if (idx < 0) return
        engine.scrollTo({
          index: idx,
          offset: config.offset,
          align: config.align,
          // data-grid 专属（antd 无），透传平滑行为。
          behavior: config.behavior,
        })
        return
      }
      // antd 同名 top：合并到 scrollTop。
      if (config.scrollTop === undefined && config.top !== undefined) {
        engine.scrollTo({
          scrollTop: config.top,
          offset: config.offset,
          align: config.align,
          behavior: config.behavior,
        })
        return
      }
      engine.scrollTo({
        index: config.index,
        scrollTop: config.scrollTop,
        offset: config.offset,
        align: config.align,
        behavior: config.behavior,
      })
    },
    nativeElement,
  }
}
