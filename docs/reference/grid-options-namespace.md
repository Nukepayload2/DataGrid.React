# gridOptions / gridColumnOptions 命名空间策略

> **★ T8 状态（2026-06）：表级硬迁移已完成** —— 顶层 `rowHeight`/`headerHeight`/`resizable`/
> `resizableMinWidth`/`resizableMaxWidth` **全部删除**（无 alias、无向后兼容），统一迁入
> `gridOptions`（`types.ts` + `engine/types.ts` 同步）。引擎从 `gridOptions` 解构读取，
> 适配层 `Table.tsx` 直接透传 `gridOptions`。Demo：`resizable.tsx` / `virtual-list.tsx`
> 已改写为 `gridOptions={{ ... }}` 形式。列级 `gridColumnOptions` 已建最小 scaffolding
> （`dragColumnLock`，T10 填充）。**列级 `resizable` 不存在**（无现成列级
> 拖拽开关字段；M7 拖拽由表级 `gridOptions.resizable` 统一控制，列级无需独立开关）。

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

## 已迁字段（硬迁移：删顶层 + 更新 demo）

下列字段历史版本位于 `TableProps` 顶层，正在**硬迁移**到 `gridOptions`（删顶层字段、更新所有用到顶层字段的 demo）。核查 antd v6 真相源确认 antd Table **均无**这些字段。

| 字段 | 原位置 | 迁入 | antd 有无 | 证据 |
|------|--------|------|-----------|------|
| `rowHeight` | `TableProps.rowHeight`（顶层） | `gridOptions.rowHeight` | 无（antd 行高随内容） | antd `interface.ts` 全文 + rc-table `interface.d.ts`：无 `rowHeight`；dg 顶层 `types.ts:1327`（顶层 `rowHeight?`，注释明示「与 antd 不兼容」），`gridOptions.rowHeight` 见 `types.ts:1342-1343` |
| `headerHeight` | `TableProps.headerHeight`（顶层） | `gridOptions.headerHeight` | 无 | antd 无；dg 顶层 `types.ts:1348` |
| `resizable` | `TableProps.resizable`（顶层） | `gridOptions.resizable` | 无（**antd v6 核查无 `resizable`**） | antd `interface.ts:151-195`（ColumnType 无 resizable）+ rc-table 无；dg 顶层 `types.ts:1404` |
| `resizableMinWidth` | `TableProps.resizableMinWidth`（顶层） | `gridOptions.resizableMinWidth` | 无 | dg 顶层 `types.ts:1409` |
| `resizableMaxWidth` | `TableProps.resizableMaxWidth`（顶层） | `gridOptions.resizableMaxWidth` | 无 | dg 顶层 `types.ts:1414` |

### 与现有 `gridOptions.rowHeight` 的合并

> 注：`gridOptions.{rowHeight,minRowHeight,maxRowHeight}` 命名**已存在**（虚拟化模块用，见 `types.ts:1342-1343` 及虚拟化引擎）。
> 本策略把**顶层 `rowHeight` 合并到 `gridOptions.rowHeight`**（同一字段、同一语义），而非新增并行字段。
> 合并后：
> - 调用方写 `gridOptions={{ rowHeight: 56 }}`（或函数 `(record, index) => number`）。
> - 顶层 `rowHeight` 删除；过渡期可保留顶层做向后兼容（顶层优先级**低于** `gridOptions.rowHeight`，见 `types.ts:1332-1333`），最终移除。

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
  /** 单元格作为 HTML5 拖拽源（拖到外部应用，dataTransfer JSON）。借鉴 ag-grid dndSource（后续批次）。 */
  cellDragSource?: boolean | ((record: RecordType, index: number) => RecordType | string)
  // …后续列级专属选项
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

## 硬迁移注意事项

删顶层字段后，必须**同步更新所有用到顶层字段的 demo**，否则 TS 编译断、运行时取不到值。

迁移清单（针对本轮 5 个字段）：

1. **`rowHeight`**：
   - 删 `TableProps.rowHeight`（顶层）。
   - 全仓 Grep `rowHeight=`（顶层用法）→ 改写为 `gridOptions={{ rowHeight: … }}`。
   - 已用 `gridOptions.rowHeight` 的不动。
   - 注意虚拟化模块已消费 `gridOptions.rowHeight/minRowHeight/maxRowHeight`，合并后无需改引擎。
2. **`headerHeight`**：
   - 删 `TableProps.headerHeight`（顶层）。
   - Grep `headerHeight=` → 改 `gridOptions={{ headerHeight: … }}`。
3. **`resizable` / `resizableMinWidth` / `resizableMaxWidth`**：
   - 删三个顶层字段。
   - Grep `<Table … resizable` / `resizableMinWidth=` / `resizableMaxWidth=` → 集中改写为 `gridOptions={{ resizable: true, resizableMinWidth: …, resizableMaxWidth: … }}`。
   - 三个字段通常一起出现（拖拽调宽场景），合并到一个 `gridOptions` 对象更清晰。

迁移验证：
- 删字段后跑 `tsgo` / `oxlint`，确保无类型残留引用。
- demo 全量回归（basic / fixed / virtual / col-span / drag-column-sorting 等用到这些字段的 demo）。
- 兼容层（`TableProps`/`ColumnType`）与 antd v6 `interface.ts` 重新 diff，确认顶层字段集与 antd 一致（dg 专属已全部进命名空间）。

---

## 与其它文档的关系

- [compat-matrix.md](compat-matrix.md)：判定每个字段属于「antd 兼容」还是「dg 专属」。dg 专属字段在矩阵末尾「data-grid 专属 → gridOptions/gridColumnOptions」一节列出，本文档是其命名空间归属的策略依据。
- [ag-grid-drag-candidates.md](ag-grid-drag-candidates.md)：拖拽增强的中性建议名最终落点为 `gridOptions.*` / `gridColumnOptions.*`（本批次选定 `autoScrollOnDrag`/`columnReorder`/列级 `dragColumnLock`/`multiRowReorder`），本文档定义其挂载结构。
