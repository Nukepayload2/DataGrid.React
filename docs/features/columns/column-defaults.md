# 列默认值

`column-defaults` demo 记录的是“表级默认列配置如何下沉到每一列”，不是新的列布局机制。

## 默认值来源

- 表级默认值统一从 `Table` 层传入。
- 列级声明仍然可以覆盖默认值。
- 当前 demo 主要覆盖 `align` 和 `ellipsis` 两类默认值。

## demo 里的对照点

- 左右两栏共用一个 `ellipsis` 开关。
- 两侧都继承表级 `align: 'center'` 和 `ellipsis`。
- `Address` 列保留自己的对齐覆盖，用来验证“列级配置高于默认值”。

## 与其它列能力的关系

- 默认值不会替代显式宽度、fixed 或 responsive 规则。
- `ellipsis` 只是默认开启方式之一，真实省略样式仍看 [`../display/ellipsis.md`](../display/ellipsis.md)。
- 对齐、宽度和轨道仍由列定义和布局模型共同决定，见 [`column-width.md`](column-width.md)。
