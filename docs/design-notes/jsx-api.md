# JSX 风格 API（jsx-api）

`<Table>` 支持用 JSX 子元素（`<Table.Column>` / `<Table.ColumnGroup>`）声明列，作为 `columns` prop 的语法糖，对齐 antd v6 `Table.Column` / `Table.ColumnGroup`。本文说明识别机制、children → columns 转换、与 antd 的对齐方式。

## 列子组件（不渲染 DOM）

`<Table.Column>` 与 `<Table.ColumnGroup>` 本身**不渲染 DOM**（渲染 null），仅作 `<Table>` JSX 子元素声明一列（或一个分组列）的数据载体。Table 适配层（`convertChildrenToColumns`）遍历 JSX 子元素时取出其 props 转换为 `ColumnType`。

- `TableColumn`：叶子列，props = `ColumnType` 全部字段（title/dataIndex/key/render/width/align/fixed/...），`children` 字段禁止（用 ColumnGroup 表达多级表头）。与 antd v6 `ColumnProps` 一致。
- `TableColumnGroup`：分组列，props 含 `title`（分组列表头）+ `children`（Column / ColumnGroup 的 ReactElement 数组，任意深度嵌套）。

实现上用类型断言 `as unknown as (props: ColumnProps<RecordType>) => null` 绕过 TS 对泛型箭头函数的限制（与 antd `<RecordType extends AnyObject>(_: ColumnProps<RecordType>) => null` 同款），同时挂 `displayName`（`Table.Column` / `Table.ColumnGroup`）与运行时标记 `__isDgColumn` / `__isDgColumnGroup` 供 `convertChildrenToColumns` 防御性识别。

## children → columns 转换（`convertChildrenToColumns`）

对齐 antd rc-table `convertChildrenToColumns`（`react-component/table/src/hooks/useColumns/index.tsx:18-37`）。用 `React.Children` 遍历 `<Table>` 的 JSX 子元素：

- 跳过非 ReactElement 子节点（文本/null/boolean 等，与 antd `toArray().filter(isValidElement)` 一致）。
- **Column（叶子列）**：取 props（除 children）+ React key（`key !== undefined` 时写入 `ColumnType.key` 作为稳定 key，对齐 antd `convertChildrenToColumns` 把 `node.key` 并入 column）。
- **ColumnGroup（分组列）**：同上取 props，并把其 JSX children **递归**转换（任意深度），写入 `ColumnType.children`（复用多级表头渲染）。
- **既非 Column 也非 ColumnGroup 的元素**：按 antd 行为兼容处理（当普通列对象取 props）。data-grid 仅官方支持 Column/ColumnGroup，此处保守地透传 props（与 antd rc-table 通用 `convertChildrenToColumns` 不区分 type 的行为一致）。

识别机制：antd 依赖 React `type` 引用相等（`node.type === Column`）区分；data-grid 同款实现（Column 与 ColumnGroup 是模块内唯一函数引用，children 解析时用 `===` 比对），同时挂 `__isDgColumn`/`__isDgColumnGroup` 布尔标记作为防御性识别（避免混淆/打包重命名导致引用失配）。

## columns 或 children 二选一

与 antd `columns || convertChildrenToColumns(children)`（`InternalTable.tsx:231`）逐字对齐：

- 传 `columns` prop（含显式 `[]`）→ 走 columns 路径（所有现有 demo，零回归），JSX children 忽略。
- 未传 `columns` prop（undefined）但传 JSX children → 走解析路径。
- 两者都未传 → `columns=[]` 空表（无列）。

**关键**：Table 适配层用 `props.columns === undefined` 区分"未传"与"显式传 `[]`"（解构默认值无法区分，故不从解构取 columns）。仅当 columns 未传时才解析 children，保证传 columns 的所有现有 demo 零回归（visibleColumns/columnTree 等下游 useMemo 依赖项不变）。

## 与 antd 差异

| | data-grid | antd |
|---|---|---|
| Column/ColumnGroup 渲染 | null（数据载体） | null（同款） |
| children 转 columns | `convertChildrenToColumns` 逐行对齐 rc-table | rc-table 原生 |
| type 识别 | `node.type === Column` + `__isDgColumn` 防御标记 | `node.type === Column` |

## 关联源码

- [`src/table/Table.tsx`](../../src/table/Table.tsx) — `TableColumn` / `TableColumnGroup`（含 displayName + 运行时标记）、`convertChildrenToColumns`、`columns || convertChildrenToColumns(children)` 入口。
- [`src/table/types.ts`](../../src/table/types.ts) — `ColumnProps` / `ColumnGroupProps` 接口。
