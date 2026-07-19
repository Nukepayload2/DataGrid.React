/**
 * 全站术语真理源（glossary）
 *
 * 设计原则·术语统一（见 docs/tasks/docs-site-reform-plan.md）：
 * 同一概念只用一种写法，避免「数据区滚动模式 / 数据区模式 / 纵向滚动模式」
 * 这类同物异名稀释用户认知。文案层（src/docs/** 的 .tsx / .ts）写作时以本文件
 * 为准；api.json 来自 JSDoc 源端清理（Phase 1），不读这里。
 *
 * 命名约定：
 * - `canonical` 是首选写法（中文 + 英文括注）。
 * - `summary` 是一句话面向用户的说明，可复用到正文 / 导语。
 * - `avoid` 列出已废弃或要避免的变体；用 grep 校验：命中即提示替换为 canonical。
 *
 * 引用方式：
 *   import { GLOSSARY } from './glossary'
 *   GLOSSARY.dataAreaMode.canonical // '数据区域模式'
 *
 * 渲染层（如未来需要术语浮窗 / 索引页）可直接遍历 GLOSSARY；当前作为静态真理源
 * 与 grep 校验基准存在。
 */

export interface GlossaryEntry {
  /** 首选写法（中文 + 英文括注）。 */
  canonical: string
  /** 简短说明（一句话，面向用户）。 */
  summary: string
  /** 已废弃或要避免的变体——grep 时命中即提示替换为 canonical。 */
  avoid?: string[]
}

export const GLOSSARY = {
  /**
   * 已被 antd / rc-table 标记为 deprecated 的成员；data-grid 仅保留迁移兼容。
   * 全站统一写「过时成员（deprecated）」，不再用「废弃成员」「过时 API」等变体。
   */
  deprecatedMember: {
    canonical: '过时成员（deprecated）',
    summary:
      'antd 或 rc-table 已标记 deprecated、data-grid 仅保留迁移兼容的成员；不作为新代码推荐写法。',
    avoid: ['废弃成员', '过时 API', 'deprecated 成员（无括注）'],
  },

  /**
   * classNames / styles 的语义键，对应表格 DOM 中的固定位置。
   * 统一写「槽位（slot）」，不再用「插槽」「位置」。
   */
  slot: {
    canonical: '槽位（slot）',
    summary: 'classNames / styles 的语义键，对应表格 DOM 中的固定位置。',
    avoid: ['插槽'],
  },

  /**
   * scroll.y === true 时启用的渲染模式：表头固定、表体滚动、高度由父容器决定。
   * 消灭「数据区滚动模式 / 数据区模式 / 纵向滚动模式」三种变体。
   */
  dataAreaMode: {
    canonical: '数据区域模式',
    summary:
      'scroll.y === true 时启用：表头固定、表体滚动、高度由父容器决定，不接受 antd 的 number / string max-height 语义。',
    avoid: ['数据区滚动模式', '数据区模式', '纵向滚动模式'],
  },

  /**
   * VirtualizationMode 的两种取值——保留英文枚举名作为标识符，中文说明稳定。
   */
  virtualizationStandard: {
    canonical: 'standard 虚拟化',
    summary: '默认虚拟化模式：React 正常渲染当前窗口。',
    avoid: ['标准虚拟化', '默认虚拟滚动'],
  },
  virtualizationRecycling: {
    canonical: 'recycling 虚拟化',
    summary: 'DOM 复用路径，适合超大数据量和高频滚动。',
    avoid: ['DOM 复用虚拟化', '回收虚拟化', 'DOM 复用模式'],
  },

  /**
   * gridColumnOptions 中的低层渲染 hook（renderCellElement / renderCellReact /
   * disposeCellElement）。统一叫「逃逸舱（escape-hatch）」，不再裸用「低层 hook」。
   */
  escapeHatch: {
    canonical: '逃逸舱（escape-hatch）',
    summary: '面向特定渲染路径开放的低层 hook；常规业务无需触碰。',
    avoid: ['低层 hook（裸用）', '内部 hook', '低层渲染 hook（裸用）'],
  },

  /**
   * data-grid 与 antd v6 同名同义字段所在的 API 面（TableProps / ColumnType 顶层）。
   * 统一叫「兼容 API」，避免「适配层」（适配层暗示内部桥接，不是用户该感知的概念）。
   */
  compatApi: {
    canonical: '兼容 API',
    summary: '与 antd v6 Table 同名同义的字段所在的 API 面（TableProps / ColumnType 顶层）。',
    avoid: ['适配层', '兼容 API 层'],
  },
} as const satisfies Record<string, GlossaryEntry>

export type GlossaryKey = keyof typeof GLOSSARY

/**
 * 把当前 src/docs 文案里仍可能漂移的变体列成扁平数组，便于接入 lint / 测试时遍历。
 * 命中即提示替换为对应 canonical。
 */
export const GLOSSARY_AVOID_LIST: Array<{ avoid: string; canonical: string }> =
  Object.values(GLOSSARY)
    .filter((entry) => Array.isArray(entry.avoid))
    .flatMap((entry) =>
      (entry.avoid ?? []).map((avoid) => ({
        avoid,
        canonical: entry.canonical,
      })),
    )
