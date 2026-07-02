# gridOptions / gridColumnOptions 命名空间策略

data-grid 把“与 antd Table 不同语义或完全不存在”的表格能力统一收纳到 `gridOptions`（表级）和 `gridColumnOptions`（列级），避免污染顶层兼容 API。

> **目的**：把 data-grid 中「**与 antd 不兼容 / data-grid 专属**」的 API 从主接口剥离，收进 `gridOptions`（表级）/ `gridColumnOptions`（列级）命名空间，与 antd 兼容 API **物理分离**。
>
> 原则：
> - 顶层 `TableProps` / `ColumnType` **只保留**与 antd 同名同义的字段（兼容层）。
> - data-grid 专属能力（CSS Grid 架构引入 / 增强引入）**一律入命名空间**，不污染兼容层。
>
> 好处：
> - 兼容层可独立对齐 antd（甚至未来机械生成 diff），不被 dg 专属字段干扰。
> - 用户一眼可辨「这部分换 antd Table 会丢 / 这部分是 dg 独有增强」。
> - 命名空间内可自由命名（含借鉴 ag-grid 的中性名），无品牌风险。

---

## 当前表级命名空间字段

下列字段属于 data-grid 专属表级选项。核查 antd v6 真相源确认 antd Table **均无**这些字段，因此统一放入 `gridOptions`。

| 字段 | 原位置 | 迁入 | antd 有无 | 证据 |
|------|--------|------|-----------|------|
| `rowHeight` | `TableProps.rowHeight`（顶层） | `gridOptions.rowHeight` | 无（antd 行高随内容） | antd `interface.ts` 全文 + rc-table `interface.d.ts`：无 `rowHeight`；dg 顶层 `types.ts:1327`（顶层 `rowHeight?`，注释明示「与 antd 不兼容」），`gridOptions.rowHeight` 见 `types.ts:1342-1343` |
| `headerHeight` | `TableProps.headerHeight`（顶层） | `gridOptions.headerHeight` | 无 | antd 无；dg 顶层 `types.ts:1348` |
| `resizable` | `TableProps.resizable`（顶层） | `gridOptions.resizable` | 无（**antd v6 核查无 `resizable`**） | antd `interface.ts:151-195`（ColumnType 无 resizable）+ rc-table 无；dg 顶层 `types.ts:1404` |
| `resizableMinWidth` | `TableProps.resizableMinWidth`（顶层） | `gridOptions.resizableMinWidth` | 无 | dg 顶层 `types.ts:1409` |
| `resizableMaxWidth` | `TableProps.resizableMaxWidth`（顶层） | `gridOptions.resizableMaxWidth` | 无 | dg 顶层 `types.ts:1414` |
| `selection` | 无 | `gridOptions.selection` | 无 | antd 只有 `rowSelection` 兼容层；`gridOptions.selection` 承载 data-grid 原生 `selectionMode/showSelectionColumn/selectedValues` |

### 与现有 `gridOptions.rowHeight` 的合并

> 注：`gridOptions.{rowHeight,minRowHeight,maxRowHeight}` 命名**已存在**（虚拟化模块用，见 `types.ts:1342-1343` 及虚拟化引擎）。
> 本策略把**顶层 `rowHeight` 合并到 `gridOptions.rowHeight`**（同一字段、同一语义），而非新增并行字段。
> 当前调用方式：
> - 调用方写 `gridOptions={{ rowHeight: 56 }}`（或函数 `(record, index) => number`）。
> - 顶层 `rowHeight` 不再作为兼容 API 保留。

---

## gridColumnOptions（列级，新建）

收纳**列级** data-grid 专属选项。结构挂在 `column.gridColumnOptions`：

```ts
interface ColumnType<RecordType> {
  // …antd 兼容字段（title/dataIndex/render/width/align/fixed/ellipsis/onCell/onHeaderCell/…）
  gridColumnOptions?: GridColumnOptions<RecordType>
}

interface GridColumnOptions<RecordType> {
  /** 列拖拽锁定：undefined=不锁定；lockDrag=不可发起拖；lockPosition=不可发起拖且 index 恒定。 */
  dragColumnLock?: 'lockDrag' | 'lockPosition'
  /** 单元格作为 HTML5 拖拽源（拖到外部应用，dataTransfer JSON）。 */
  cellDragSource?: boolean | ((record: RecordType, index: number) => RecordType | string)
  // …其它列级专属选项
}
```

> 命名约束：`gridColumnOptions` 内字段名沿用「中性动词短语」风格（见 [ag-grid-drag-candidates.md](ag-grid-drag-candidates.md)），**不照抄 ag-grid**。列拖拽锁定统一收敛为 `dragColumnLock` 三态字段，不保留旧布尔拆分字段。

---

## 兼容 API 分离原则

1. **同名同义留在顶层**：字段名、语义、取值范围与 antd v6 一致的，留 `TableProps`/`ColumnType`（如 `dataSource/columns/rowKey/bordered/size/loading/title/footer/onRow/scroll/pagination/rowSelection/expandable/components/sticky/...`）。
2. **名兼义异的留在顶层但文档标注**：如 `components.body.cell`（dg 替换内容 vs antd 替换整个 td）、`column.className`（合并到 dg-cell div vs td/th）。留顶层是因为**字段名相同、迁移时无需改名**，差异在文档/类型注释里说明。详见 [compat-matrix.md](compat-matrix.md) 的「名兼义异」分组。
3. **antd 没有的进命名空间**：凡 antd v6 + rc-table 都没有的字段（CSS Grid 引入的行高/表头高/列宽拖拽/拖拽增强/虚拟化细调等），一律 `gridOptions`/`gridColumnOptions`。
4. **借鉴第三方（ag-grid 等）的命名一律进命名空间**：绝不放顶层（避免被误认为 antd 兼容字段），且命名中性化。

---

## 调用约定

- 表级专属能力统一写成 `gridOptions={{ ... }}`。
- 原生选择写成 `gridOptions={{ selection: { ... } }}`；`rowSelection` 继续作为 antd 兼容层保留。
- 列级专属能力统一写成 `column.gridColumnOptions={{ ... }}`。
- 列宽拖拽当前只提供表级 `gridOptions.resizable` / `resizableMinWidth` / `resizableMaxWidth`，不再引入列级 `resizable`。
- 需要判断某字段是否应留在顶层时，先对照 ADR [`../decisions/0008-api-namespace-separation.md`](../decisions/0008-api-namespace-separation.md)。

## 与其它文档的关系

- [compat-matrix.md](compat-matrix.md)：判定每个字段属于「antd 兼容」还是「dg 专属」。dg 专属字段在矩阵末尾「data-grid 专属 → gridOptions/gridColumnOptions」一节列出，本文档是其命名空间归属的策略依据。
- [ag-grid-drag-candidates.md](ag-grid-drag-candidates.md)：整理外部拖拽能力的参考行为、命名约束和当前采用的中性字段名。
