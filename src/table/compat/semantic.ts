/**
 * 语义化 classNames/styles。
 *
 * 对齐 antd v6 `ComponentsSemanticClassNames` / `ComponentsSemanticStyles` /
 * `TableSemanticType['classNames']` / `TableSemanticType['styles']`。
 */
// 按业务域从 compatTypes.ts 拆出；字段对照见 antd `components/table/InternalTable.tsx:90-112`。

import type { SizeType } from './size'
import type { TablePaginationConfig } from './pagination'

/**
 * 语义化样式：行 / 格 两部位（header 与 body 共用同结构）。
 * 对齐 antd v6 `ComponentsSemanticClassNames` / `ComponentsSemanticStyles`，但**不含 `wrapper`**：
 *   antd 的 `header.wrapper` / `body.wrapper` 落在 `<thead class="ant-table-thead">` /
 *   `<tbody class="ant-table-tbody">`（`@rc-component/table` `es/Header/Header.js:83-88`、
 *   `es/Body/index.js:110-111`），而 data-grid 的表头格与表体格同为 `.dg-grid` 的直接 grid item、
 *   无 thead/tbody 中间容器（加容器会破坏显式 grid-row/grid-column 定位）⇒ 没有语义正确的宿主，
 *   故该槽位已从公共类型面移除（不保留「已声明但运行时零消费」的公共 API）。
 *
 * - `row`：行（表头行 / 表体行；grid 无 `<tr>`，class/style 分发到该行每个格子）。
 * - `cell`：单元格（表头格 / 表体格）。
 *
 * data-grid 注入点：`header.row` / `header.cell`＝表头行 / 表头格；
 *   `body.row` / `body.cell`＝表体行（透传到该行每个单元格）/ 表体格。
 *
 * 替代写法（antd 里用 wrapper 给「整区」上样式的需求）：表头用 `header.row`、表体用 `body.row`
 *   （逐格下发），容器级用 `section`（滚动容器/视口）或 `content`（`.dg-grid`）槽位。
 *
 * @internal DOM class 对应：`header.cell`→`.dg-cell-header`、`body.cell`→`.dg-cell-body`；
 *   `header.row` / `body.row` 分发到该行每个格子（data-grid 无 `.dg-row` 类名）。
 */
export interface ComponentsSemanticClassNames {
  cell?: string
  row?: string
}
export interface ComponentsSemanticStyles {
  cell?: import('react').CSSProperties
  row?: import('react').CSSProperties
}

/**
 * 分页器语义化样式（对齐 antd v6 `PaginationSemanticType`）。
 * - `root`：分页根容器。
 * - `item`：分页单项（透传到 antd Pagination 的 item 项）。
 *
 * @internal DOM class 对应：`root`→`.dg-pagination`；item 透传到外层 `.dg-pagination` 子层。
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
 * 语义化 classNames 结构（对齐 antd v6 `TableSemanticType['classNames']`）。
 *
 * 嵌套部位：
 *   - `root`：根元素。
 *   - `section`：包装容器元素（data-grid 在 grid 外包一层 section 容器承载）。
 *   - `content`：内容元素（title/footer 之间的表格内容区）。
 *   - `title`：标题。
 *   - `footer`：脚注。
 *   - `header`：表头 `{ row, cell }`（antd 的 `wrapper` 不支持，见上）。
 *   - `body`：表体 `{ row, cell }`（同上）。
 *   - `pagination`：分页 `{ root, item }`。
 *
 * 字段语义对照 antd `_semantic.tsx`（root / title / content / section / header.{wrapper,row,cell} /
 * body.{wrapper,row,cell} / footer / pagination.{root,item}）；**仅 `wrapper` 两处不实现**（无宿主）。
 *
 * @internal DOM class 对应：`root`→`.dg-wrapper`、`section`→`.dg-scroll-wrap`（非 sticky）/
 *   `.dg-sticky-scroll-viewport`（sticky，summary 视口同款）、`content`→`.dg-grid`、`title`→`.dg-title`、
 *   `footer`→`.dg-footer`；字段对照见 antd `components/table/InternalTable.tsx:102-112`。
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
    scroll?: { x?: true | number | string; y?: true; scrollToFirstRowOnChange?: boolean }
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
