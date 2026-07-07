/**
 * 引擎层语义化样式类型。
 *
 * 从 engineTypes.ts 拆出（档二·纯类型）。适配层 Table.tsx 求值后的对象，由引擎只读消费。
 * 引擎只消费 grid 内部位（root/title/footer/pagination.* 由适配层直接消费）。
 */

/**
 * 引擎层语义化样式（已求值的对象，由适配层 Table.tsx 传入）。
 *
 * 引擎只消费**grid 内**部位（root/title/footer/pagination.* 由适配层直接消费）：
 *   - `section`：grid 外的包装容器（`.dg-section`，含滚动容器）。
 *   - `content`：grid 根容器（`.dg-content`/`.dg-grid`）。
 *   - `header.{wrapper,row,cell}`：表头容器/表头行/表头格。
 *   - `body.{wrapper,row,cell}`：表体容器/表体行/表体格。
 *
 * 与对外 `TableSemanticClassNames/Styles`（types.ts）字段一一对应，仅取引擎消费的子集。
 */
export interface EngineSemanticSection {
  wrapper?: string
  cell?: string
  row?: string
}
export interface EngineSemanticSectionStyles {
  wrapper?: import('react').CSSProperties
  cell?: import('react').CSSProperties
  row?: import('react').CSSProperties
}
export interface EngineSemantic {
  section?: { className?: string; style?: import('react').CSSProperties }
  content?: { className?: string; style?: import('react').CSSProperties }
  header?: {
    className?: EngineSemanticSection
    style?: EngineSemanticSectionStyles
  }
  body?: {
    className?: EngineSemanticSection
    style?: EngineSemanticSectionStyles
  }
}
