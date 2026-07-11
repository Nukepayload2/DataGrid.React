/**
 * 语义化 classNames/styles（按业务域从 compatTypes.ts 拆出）。
 *
 * 对齐 antd v6 `ComponentsSemanticClassNames` / `ComponentsSemanticStyles` /
 * `TableSemanticType['classNames']` / `TableSemanticType['styles']`，
 * 见 `components/table/InternalTable.tsx:90-112`。
 */

import type { SizeType } from './size'
import type { TablePaginationConfig } from './pagination'

/**
 * 语义化样式：内层 wrapper / cell / row 三部位（header 与 body 共用同结构）。
 * 对齐 antd v6 `ComponentsSemanticClassNames` / `ComponentsSemanticStyles`
 * （`components/table/InternalTable.tsx:90-100`）。
 *
 * - `wrapper`：header / body 的容器层（data-grid 中对应滚动容器/分组的根容器）。
 * - `row`：行（表头行 / 表体行）。
 * - `cell`：单元格（表头格 / 表体格）。
 *
 * 对应 data-grid DOM 注入点：
 *   - `header.wrapper`：表头区根容器（渲染层无独立 DOM 时注入到 grid）。
 *   - `header.row`：表头行。
 *   - `header.cell`：`.dg-cell-header`。
 *   - `body.wrapper`：表体区根容器。
 *   - `body.row`：表体行（`.dg-row`，data-grid 因 grid 布局无单一 `<tr>`，row class 透传到该行单元格）。
 *   - `body.cell`：`.dg-cell-body`。
 */
export interface ComponentsSemanticClassNames {
  wrapper?: string
  cell?: string
  row?: string
}
export interface ComponentsSemanticStyles {
  wrapper?: import('react').CSSProperties
  cell?: import('react').CSSProperties
  row?: import('react').CSSProperties
}

/**
 * 分页器语义化样式（对齐 antd v6 `PaginationSemanticType`）。
 * - `root`：分页根容器（`.dg-pagination`）。
 * - `item`：分页单项（透传到 antd Pagination 的 item 项——本引擎透传到外层 `.dg-pagination` 子层）。
 */
export interface PaginationSemanticClassNames {
  root?: string
  item?: string
}
export interface PaginationSemanticStyles {
  root?: import('react').CSSProperties
  item?: import('react').CSSProperties
}

/**
 * 语义化 classNames 结构（对齐 antd v6 `TableSemanticType['classNames']`，
 * 见 `components/table/InternalTable.tsx:102-112`）。
 *
 * 嵌套部位：
 *   - `root`：根元素 `.dg-wrapper`。
 *   - `section`：包装容器元素（`.dg-section`，data-grid 在 grid 外包一层 section 容器承载）。
 *   - `content`：内容元素（`.dg-content`，title/footer 之间的表格内容区）。
 *   - `title`：标题 `.dg-title`。
 *   - `footer`：脚注 `.dg-footer`。
 *   - `header`：表头 `{ wrapper, row, cell }`。
 *   - `body`：表体 `{ wrapper, row, cell }`。
 *   - `pagination`：分页 `{ root, item }`。
 *
 * 字段语义对照 antd `_semantic.tsx`（root / title / content / section / header.{wrapper,row,cell} /
 * body.{wrapper,row,cell} / footer / pagination.{root,item}）。
 */
export interface TableSemanticClassNames {
  root?: string
  section?: string
  title?: string
  footer?: string
  content?: string
  header?: ComponentsSemanticClassNames
  body?: ComponentsSemanticClassNames
  pagination?: PaginationSemanticClassNames
}

/**
 * 语义化 styles 结构（对齐 antd v6 `TableSemanticType['styles']`）。结构与 `TableSemanticClassNames`
 * 同构，值为 `CSSProperties`。
 */
export interface TableSemanticStyles {
  root?: import('react').CSSProperties
  section?: import('react').CSSProperties
  title?: import('react').CSSProperties
  footer?: import('react').CSSProperties
  content?: import('react').CSSProperties
  header?: ComponentsSemanticStyles
  body?: ComponentsSemanticStyles
  pagination?: PaginationSemanticStyles
}

/**
 * 函数式 classNames/styles 求值时收到的 info（对齐 antd v6 `(info: { props }) => ...`）。
 *
 * `props` 为 Table 当前生效的关键 props 子集（用于按 size/bordered/virtual 等条件返回不同样式）。
 * 与 antd 一致：`info.props` 是 Table props 本身（data-grid 提供**部分字段**子集，避免暴露内部细节）。
 *
 * 泛型 `RecordType` 仅为类型签名对齐 antd `TableProps<RecordType>`（demo 可用
 * `TableSemanticInfo<DataType>` 拷贝），运行时不携带 record 数据。
 */
export interface TableSemanticInfo<RecordType = any> {
  props: {
    size?: SizeType
    bordered?: boolean
    virtual?: boolean
    scroll?: { x?: true | number | string; y?: true }
    pagination?: false | TablePaginationConfig
  }
  /**
   * 类型签名占位（对齐 antd `GenerateSemantic<..., Props>` 的 Props 泛型参数）。
   * 运行时不传值；仅供 TypeScript 把 `RecordType` 纳入类型签名，避免泛型未用告警。
   */
  readonly _recordType?: RecordType
}

/**
 * classNames：支持对象（静态）或函数 `(info) => 对象`（动态，按 info.props 求值）。
 * 对齐 antd v6 `TableProps.classNames`（`GenerateSemantic<...>['classNamesAndFn']`）。
 */
export type TableClassNames<RecordType = any> =
  | TableSemanticClassNames
  | ((info: TableSemanticInfo<RecordType>) => TableSemanticClassNames)

/**
 * styles：支持对象（静态）或函数 `(info) => 对象`（动态）。
 * 对齐 antd v6 `TableProps.styles`（`GenerateSemantic<...>['stylesAndFn']`）。
 */
export type TableStyles<RecordType = any> =
  | TableSemanticStyles
  | ((info: TableSemanticInfo<RecordType>) => TableSemanticStyles)
