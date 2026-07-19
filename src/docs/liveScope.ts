/**
 * docs 区代码块可编辑（#20）所需的 require 注入表。
 *
 * 复用示例区 `src/live/scope.ts` 的 baseScope（同样的 React/antd/data-grid/dnd 等
 * 基础依赖），再叠加 docs 特有的别名：
 *
 * - `'@nukepayload2/data-grid'`：文档示例对外用发布包名导入（`import { Table } from
 *   '@nukepayload2/data-grid'`），内部解析到同一份 `../table` 命名空间。
 *
 * scope 的 key 必须字面对齐 docs 代码块里的 import specifier——`evalModule` 的
 * `require(s)` 按 key 查找，找不到就抛"模块未注入到 live scope"。
 */
import { baseScope } from '../live/scope'
import * as dataGrid from '../table'

export const docsScope: Record<string, unknown> = {
  ...baseScope,
  // 对外发布名 → 同一份 data-grid 命名空间（与 '../table' 等价）。
  '@nukepayload2/data-grid': dataGrid,
}
