/**
 * 语义化样式 classNames/styles 求值 hook（对齐 antd v6 `TableSemanticType`）。
 *
 * 把 `classNames` / `styles` props（支持对象或函数 `(info) => 对象`）归一为
 * `TableSemanticClassNames` / `TableSemanticStyles` 静态对象，并组装引擎消费子集
 * `EngineSemantic`（仅取 section/content/header/body，root/title/footer/pagination.*
 * 由适配层直接消费，不进引擎）。
 *
 * 二态归一规则：
 * - `undefined`：归一结果 `undefined`（所有部位走默认 class/style，零回归）。
 * - 对象：直接返回（静态）。
 * - 函数：调用 `(info) => 对象`，`info.props` 含 size/bordered/virtual/scroll/pagination 子集
 *   （与 antd 一致：暴露当前生效 props 子集，避免暴露内部细节）。
 *
 * 引擎消费子集构造（逐部位合并 className/style，任一存在即写入）：
 *   - section / content / header / body 任一部位 `classNamesResolved?.X` 或 `stylesResolved?.X`
 *     非空 → `engineSemantic.X = { className, style }`。
 *
 * 行为零差异（先移动不重写）：从 `Table.tsx` L833-891 字节级搬位置，逻辑保持。
 */

import { useMemo } from 'react'
import type {
  TableSemanticClassNames,
  TableSemanticStyles,
  TableSemanticInfo,
  TablePaginationConfig,
  SizeType,
} from './types'
import type { EngineSemantic } from './engine/types'

/**
 * 归一化语义化 classNames/styles 并构造引擎消费子集。
 *
 * @param classNames   `TableProps.classNames`（对象 | 函数 | undefined）
 * @param styles       `TableProps.styles`（对象 | 函数 | undefined）
 * @param size         当前生效 `size` props
 * @param bordered     当前生效 `bordered` props
 * @param virtual      当前生效 `virtual` props
 * @param scroll       当前生效 `scroll` props
 * @param pagination   当前生效 `pagination` props
 * @returns `{ classNamesResolved, stylesResolved, engineSemantic }`；均未提供时三者 `undefined`。
 */
export function useSemanticClassNames(
  classNames: TableSemanticClassNames | ((info: TableSemanticInfo) => TableSemanticClassNames) | undefined,
  styles: TableSemanticStyles | ((info: TableSemanticInfo) => TableSemanticStyles) | undefined,
  size: SizeType | undefined,
  bordered: boolean | undefined,
  virtual: boolean | undefined,
  scroll: { x?: true | number | string; y?: true } | undefined,
  pagination: false | TablePaginationConfig | undefined,
): {
  classNamesResolved: TableSemanticClassNames | undefined
  stylesResolved: TableSemanticStyles | undefined
  engineSemantic: EngineSemantic | undefined
} {
  // info.props 为 Table 当前生效的关键 props 子集（用于按 size/bordered/virtual 等条件返回不同样式）。
  // 与 antd 一致：`info.props` 是 Table props 本身（data-grid 提供部分字段子集，避免暴露内部细节）。
  const semanticInfo: TableSemanticInfo = {
    props: {
      size,
      bordered,
      virtual,
      scroll,
      pagination,
    },
  }

  const classNamesResolved: TableSemanticClassNames | undefined = useMemo(() => {
    if (classNames === undefined) return undefined
    if (typeof classNames === 'function') return classNames(semanticInfo)
    return classNames
    // eslint-disable-next-line react-doctor/exhaustive-deps
  }, [classNames, size, bordered, virtual, scroll, pagination])

  const stylesResolved: TableSemanticStyles | undefined = useMemo(() => {
    if (styles === undefined) return undefined
    if (typeof styles === 'function') return styles(semanticInfo)
    return styles
    // eslint-disable-next-line react-doctor/exhaustive-deps
  }, [styles, size, bordered, virtual, scroll, pagination])

  // 引擎消费子集（section/content/header/body）。
  const engineSemantic: EngineSemantic | undefined = useMemo(() => {
    if (!classNamesResolved && !stylesResolved) return undefined
    const sem: EngineSemantic = {}
    if (classNamesResolved?.section || stylesResolved?.section) {
      sem.section = {
        className: classNamesResolved?.section,
        style: stylesResolved?.section,
      }
    }
    if (classNamesResolved?.content || stylesResolved?.content) {
      sem.content = {
        className: classNamesResolved?.content,
        style: stylesResolved?.content,
      }
    }
    if (classNamesResolved?.header || stylesResolved?.header) {
      sem.header = {
        className: classNamesResolved?.header,
        style: stylesResolved?.header,
      }
    }
    if (classNamesResolved?.body || stylesResolved?.body) {
      sem.body = {
        className: classNamesResolved?.body,
        style: stylesResolved?.body,
      }
    }
    return sem
  }, [classNamesResolved, stylesResolved])

  return { classNamesResolved, stylesResolved, engineSemantic }
}
