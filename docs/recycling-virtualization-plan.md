# Recycling React slot plan

本文只记录 recycling 模式下一步要补的 React cell 能力：在 native fast path 之外，让少数列可以用 `renderCellReact` 渲染受控 React 内容。

## 目标

给 recycling 模式增加一个面向 React 组件的列级 renderer：

- 大多数列继续走 native HTMLElement fast path。
- 少数需要 React 组件的列使用 `gridColumnOptions.renderCellReact`。
- true recycling 场景下，React 组件按 virtual slot 复用，不随真实 row mount/unmount。
- requested recycling 无法进入 true recycling 时，仍调用 `renderCellReact`，但使用 standard body cell key 和 standard body lifecycle。
- 用户只写一个 `renderCellReact`，不需要判断当前是否降级。

## 非目标

- 不让 `column.render` 参与 recycling 专用语义。
- 不让 `renderCellElement` 在 standard lifecycle 降级路径中执行。
- 不提供 true recycling 内部的 row-key remount 模式。
- 不支持非受控 React 组件作为 true recycling slot。
- 不改变显式 `virtualizationMode: undefined | 'standard'` 的现有行为。
- 不借这个功能实现横向列虚拟化。

## API

新增列级 React renderer：

```ts
interface GridCellRenderParams<RecordType> {
  value: unknown
  record: RecordType
  rowIndex: number
  columnIndex: number
  columnKey: string
  dataIndex?: string | number | Array<string | number>
  rowKey: string | number | undefined
}

interface GridCellReactSlotProps {
  /**
   * 用户返回 React element 时应使用的 key。
   *
   * true recycling slot path:
   *   stable virtual slot key, independent from record / rowIndex.
   *
   * requested recycling degraded to standard body lifecycle:
   *   standard body cell key, identical to the normal body key rule.
   */
  key: string
}

interface GridColumnOptions<RecordType> {
  renderCellReact?: (
    params: GridCellRenderParams<RecordType>,
    slot: GridCellReactSlotProps,
  ) => React.ReactElement | null
}
```

推荐用法：

```tsx
gridColumnOptions: {
  renderCellReact: (params, slot) => (
    <StatusBadge
      key={slot.key}
      value={params.value}
      rowKey={params.rowKey}
    />
  ),
}
```

## Renderer 选择

requested recycling 先判定表体 lifecycle：

- simple body model 满足：进入 true recycling lifecycle。
- simple body model 不满足：进入 standard body lifecycle。

true recycling lifecycle 下列级 renderer 优先级：

1. 有 `renderCellElement`：走 native HTMLElement fast path。
2. 没有 `renderCellElement`，但有 `renderCellReact`：走 true React virtual slot recycling。
3. 两者都没有：走 recycler 的内部默认 element renderer，由 recycler 管理 cell 定位、状态 class 和内容更新。

standard body lifecycle 降级路径下：

- 不调用 `renderCellElement`。
- 有 `renderCellReact` 的列仍调用 `renderCellReact`。
- 没有 `renderCellReact` 的列走现有 standard body 渲染。

显式 `undefined` / `'standard'` 保持现有行为，不调用 `renderCellElement` / `renderCellReact`。这里的“显式 standard”不同于“requested recycling 后因能力不满足而降级到 standard body lifecycle”。

## Key 语义

`slot.key` 是用户唯一需要使用的 key。

true React virtual slot recycling：

- `slot.key` 是 virtual slot key。
- key 不随 `record` / `rowIndex` / `rowKey` 改变。
- 同一个 React 组件实例会在滚动后收到新的 `params`。
- 组件必须完全由 props 驱动。

requested recycling 降级到 standard body lifecycle：

- 仍调用 `renderCellReact`。
- `slot.key` 是 standard body cell key。
- key 规则必须与普通 body cell 一致，不能由 virtual slot key 派生；row / column 缺少显式 key 时使用现有 standard body 的 identity fallback。
- React lifecycle 与 standard body 一致。

这样用户不用写：

```ts
if (isDegraded) {
  // ...
}
```

用户只读取 `slot.key`；表格根据实际 lifecycle 给出正确 key。

## 受控约束

true React virtual slot recycling 下，React 组件实例绑定 virtual slot，不绑定真实 row。

因此：

- `params.record` / `params.value` / `params.rowIndex` / `params.rowKey` 会随滚动更新。
- 行相关状态必须按 `rowKey` 或业务 key 外置管理，并通过 props 传入。
- 非受控 input、内部缓存 record、mount 时读取一次 record 后不响应 props 的组件不适合 true recycling slot。
- 依赖 mount/unmount 表示“行进入/离开”的组件不适合 true recycling slot。

如果某列必须依赖普通 React key 生命周期，该列不适合 true React virtual slot recycling。可选路径是放弃 recycling 专用 renderer，改用显式 standard virtualization 下的现有 React 渲染能力；或者在 requested recycling 已因表体能力降级时继续使用 `renderCellReact`，此时它会拿到 standard body cell key。不要把降级当作单列级受控开关。

## 降级规则

requested recycling 但无法满足 simple body model 时，进入 standard body lifecycle。

降级时：

- 不调用 `renderCellElement`。
- 若列提供 `renderCellReact`，仍调用 `renderCellReact`。
- `slot.key` 使用 standard body cell key。
- standard body 负责 React mount/unmount、merge、expand、tree、components body 等兼容行为。

需要降级的能力包括：

- sticky 禁用虚拟化。
- tree data。
- expandable / expanded row content。
- rowSpan / colSpan / `onCell` merge。
- `components.body.row`。
- `components.body.cell`。
- 其它破坏普通 `rowIndex x leafColumn` 映射的 body 能力。

## 实现建议

新增或调整模块：

- `src/table/engine/recyclingCellTypes.ts`
- `src/table/engine/RecyclingBodyGrid.tsx`
- `src/table/engine/useRecyclingReactSlots.tsx`
- `src/table/engine/recyclingIdentity.ts`

true recycling path：

- recycler 继续管理 outer cell 和 `.dg-cell-inner`。
- React slot 内容挂入 `.dg-cell-inner`。
- React element key 使用 `slot.key`，此时它是 virtual slot key。
- 对同一 slot 更新 params 时保持组件实例。
- slot root 只在列移除、renderer identity 变化、模式切换、pool discard、表格卸载时 unmount。
- 不把 A 列 React slot 复用于 B 列。

degraded standard lifecycle：

- 不进入 React slot pool。
- 不创建 virtual slot root。
- 由 standard body 渲染 cell。
- 调用 `renderCellReact(params, slot)` 生成内容。
- `slot.key` 来自 standard body cell key。

## Demo

更新 recycling demo：

- 保留 `standard` / `recycling` 对比开关。
- 增加一两个 `renderCellReact` 列。
- 大多数列仍使用 native renderer。
- React slot demo 使用受控组件。
- `renderCellReact` demo 优先展示单根元素用法，并只使用 `slot.key` 作为 React key。
- 纯文本展示继续使用 recycler 的内部默认 element renderer 或 `renderCellElement`，不使用 `renderCellReact` 返回裸 string / number。
- 控制台日志默认关闭。
- 计数面板区分 native create/reuse/render 和 React slot mount/render。
- requested recycling 降级场景可单独加一个小开关或独立 demo，展示用户代码不需要判断降级。

### 操作列 demo 计划

目标 demo：`http://localhost:5173/#/demos/virtual-list-recycling`。

在现有 recycling demo 上追加一个受控开关，用于展示少量 React 渲染列和大量 native renderer 列混合时的行为：

- 工具栏增加“显示操作列”开关，默认关闭，避免影响当前 native recycling 计数基线。
- 开关打开后，在列尾追加 `操作` 列；关闭后移除该列，用于验证 React slot 列加入/移除时的清理逻辑。
- `操作` 列使用 `gridColumnOptions.renderCellReact`，不配置 `renderCellElement`，确保它走 React slot 路径；其它文本列继续使用 native renderer。
- `操作` 列宽度固定，单元格渲染一个单根 React 元素。
- 根元素内使用 antd link buttons：`详情` / `删除`。
- 点击 `详情` 或 `删除` 时弹出 antd Modal。
- Modal 标题固定为 `这只是个演示`。
- Modal 内容第一行固定为 `不支持指定的方法。`。
- Modal 内容第二行展示当前行数据转换为 JSON 字符串后的结果。
- 按钮点击只触发 Modal，不修改行数据，保持 React slot demo 为完全受控展示。
- `standard` / `recycling` 对比开关保留；显式 `standard` 下该列走普通 React body 生命周期，requested `recycling` 且 simple body model 满足时走 React virtual slot recycling。
- 计数面板后续可增加 React slot mount/render 计数，用来观察打开操作列后 React slot 实例数量是否接近可见槽位数。
- 浏览器 smoke 需要覆盖：打开操作列、点击 `详情`、点击 `删除`、确认 Modal 标题、提示内容和当前行 JSON 字符串、切换 standard/recycling 后按钮仍可用、关闭操作列后无 console error / warn。

## 测试

优先补 Vitest：

- 显式 `undefined` / `'standard'` 不调用 `renderCellReact`。
- requested recycling + simple body model + `renderCellReact` 创建 virtual slot key。
- true recycling 滚动后同一 virtual slot key 复用 React 组件实例，并收到新 params。
- true recycling 下 `slot.key` 不使用 `rowKey`。
- true recycling 下 React slot 不跨列复用。
- true recycling 下 hover / selection / sorted outer patch 默认不触发 React slot rerender。
- renderer identity 变化时清理对应 React slot。
- 列移除、模式切换、unmount 时清理 React slot。
- requested recycling + merge/tree/expand/components body 等降级时仍调用 `renderCellReact`。
- 降级时 `slot.key` 等于 standard body cell key。
- 降级时不调用 `renderCellElement`。
- 用户代码使用 `key={slot.key}`，true recycling 和降级路径都能渲染。
- `renderCellReact` 返回裸 string / number 时有类型或运行时约束；文本内容应走 recycler 的内部默认 element renderer，或由用户包成 React element。

必要时补浏览器 smoke：

- 打开 mixed recycling demo。
- 滚动后 native 列复用计数增长。
- React slot 列组件实例数接近可见槽位数。
- 降级 demo 中 `renderCellReact` 仍显示正确内容。
- console 无 error / warn。

## 风险

- true React slot recycling 与非受控业务状态天然冲突。文档和 demo 必须避免暗示非受控可用。
- 降级路径仍调用 `renderCellReact`，需要保证它与 standard body 的 merge / expand / components body 行为组合正确。
- `slot.key` 在两种 lifecycle 下含义不同，但用户不应读取其结构，只应传给 React。
- React slot root 与 imperative DOM 的边界必须清晰，避免 React 删除 recycler 管理的 outer cell。
- 如果未来允许把 hover / selection / sorted 作为 React slot props，会引入额外 rerender 成本，必须单独设计为 opt-in。

## 验收标准

- `renderCellReact` 在 true recycling 下使用 virtual slot key。
- `renderCellReact` 在 requested recycling 降级时使用 standard body cell key。
- 用户不需要判断当前是否降级。
- 显式 `standard` / `undefined` 不调用 recycling 专用 renderer。
- 降级 path 不调用 native `renderCellElement`。
- true recycling path 中 React slot 滚动复用组件实例。
- 降级 path 中 React lifecycle 与 standard body 一致。
- 受控 React 组件在两条路径都显示正确数据。
- `pnpm run tsc`、`pnpm run lint`、`pnpm run test`、`pnpm run build` 通过。
