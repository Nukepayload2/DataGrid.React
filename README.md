# @nukepayload2/data-grid

<!-- npmjs badge placeholder -->
<!-- GitHub Pages badge placeholder -->

面向 React 19 与 Ant Design v6 的表格组件。它保留 antd Table 的主要 API、视觉语言与主题令牌，同时以 CSS Grid 重新实现列宽、滚动和虚拟化基础设施，用于解决传统 `<table>` 布局在复杂数据表场景下长期存在的宽度同步、虚拟滚动、汇总行和滚动定位问题。

`data-grid` 的定位不是另起一套设计系统，也不是替代整个 antd。它只聚焦在数据表格这一个高密度、高交互、易受布局细节影响的组件上：让现有 antd Table 代码可以低成本迁移，并在需要更稳定表格引擎的场景中获得更可控的行为。

## 当前状态

| 项目 | 状态 |
| --- | --- |
| npmjs | 待发布 |
| GitHub Pages | 待发布 |
| 许可协议 | Apache-2.0 |
| 目标环境 | React 19、React DOM 19、Ant Design v6 |

## 适用场景

- 已经使用 antd Table，希望通过较小改动改善列宽、滚动和虚拟化体验。
- 需要可调整列宽，并希望列宽在表头、表体、固定列、汇总行和空数据状态下保持一致。
- 需要虚拟滚动与汇总行共存，而不是在功能之间做取舍。
- 需要表格内部 `scrollTo` 行为限定在组件作用域内，避免带动页面外层容器滚动。
- 希望继续使用 antd 的分页、空状态、加载状态、图标、令牌和 `ConfigProvider` 主题能力。

## 设计原则

### 兼容优先

迁移路径以 antd Table 为基准。`columns`、`dataSource`、`rowSelection`、`pagination`、`summary`、`scroll` 等常用入口沿用 antd 风格；新增能力放在 `gridOptions` 与 `gridColumnOptions` 中，避免污染 antd 兼容面。

### 单一列宽来源

表格使用 `grid-template-columns` 作为列宽的唯一事实来源。表头、表体、汇总行、固定列与滚动区域共享同一套列宽计算结果，减少多套布局缓存带来的错位、抖动和边界状态回退。

### 主题随 antd

组件消费 antd v6 的令牌体系，并复用 antd 的非表格部件。对使用者来说，它应当像一张更稳定的 antd Table，而不是一套新的视觉资产。

### 增强能力隔离

列拖拽、列宽约束、滚动条折叠、动态行高测量等增强能力进入独立命名空间。这样既能保持迁移代码清晰，也便于团队逐项启用、评估和回滚。

## 主要能力

| 能力 | 说明 |
| --- | --- |
| antd Table 风格 API | 支持常用表格属性、列定义、分页、选择、排序筛选、展开、汇总和语义样式入口。 |
| CSS Grid 布局引擎 | 用网格轨道管理列宽，避免双表布局、`colgroup` 与占位单元格之间的同步问题。 |
| 可调整列宽 | 支持拖拽调整列宽，并可结合最小宽度、最大宽度和固定列使用。 |
| 虚拟滚动与汇总行共存 | 虚拟窗口负责数据行，汇总区域独立参与布局，不再互相排斥。 |
| 稳定空数据宽度 | 数据为空、列变化或数据结构变化时，列宽模型仍保持可预测。 |
| 组件级滚动定位 | `scrollTo` 面向表格内部滚动容器，降低对页面外层滚动的影响。 |
| antd 令牌对齐 | 支持通过 `ConfigProvider`、明暗主题和自定义品牌令牌驱动视觉样式。 |

## 安装

发布到 npmjs 后，可按以下方式安装：

```bash
pnpm add @nukepayload2/data-grid antd@^6 react@^19 react-dom@^19
```

`antd`、`react` 与 `react-dom` 是 peer dependencies。`data-grid` 依赖它们完成主题、运行时和设计系统对齐。

## 从 antd Table 迁移

多数情况下只需要替换导入来源：

```diff
- import { Table } from 'antd';
+ import { Table } from '@nukepayload2/data-grid';
```

示例：

```tsx
import { Table } from '@nukepayload2/data-grid';
import type { ColumnsType } from '@nukepayload2/data-grid';

type User = {
  name: string;
  age: number;
};

const columns: ColumnsType<User> = [
  { title: '姓名', dataIndex: 'name', width: 200 },
  { title: '年龄', dataIndex: 'age', width: 100 },
];

export default function App() {
  return (
    <Table
      rowKey="name"
      columns={columns}
      dataSource={[
        { name: 'Alice', age: 28 },
        { name: 'Bob', age: 34 },
      ]}
      pagination={{ pageSize: 10 }}
    />
  );
}
```

## 本地开发

```bash
pnpm install
pnpm dev
```

常用命令：

| 命令 | 用途 |
| --- | --- |
| `pnpm build` | 构建库产物与类型声明。 |
| `pnpm test` | 运行单元测试与 CSS 兼容性检查。 |
| `pnpm test:e2e` | 运行 Playwright 端到端测试。 |
| `pnpm lint` | 运行 oxlint。 |
| `pnpm build:docs` | 构建文档站点产物。 |

## 参考与致谢

`data-grid` 在 API 兼容、交互行为、虚拟化测量和表格工程实践上参考了多个优秀项目。感谢这些项目长期投入的开源工作：

| 项目 | 参考内容 | License |
| --- | --- | --- |
| Ant Design | Table API、设计令牌、组件视觉与生态集成方式。 | [LICENSE](https://github.com/ant-design/ant-design/blob/master/LICENSE) |
| AG Grid Community | 数据表格交互、拖拽行为与复杂表格能力边界；仅参考 Community 版许可范围内的实现。 | [LICENSE](https://github.com/ag-grid/ag-grid/blob/latest/LICENSE.txt) |
| React Virtuoso | 动态行高测量、虚拟窗口与滚动定位思路。 | [LICENSE](https://github.com/petyosi/react-virtuoso/blob/master/LICENSE) |
| Lun | 基础 CSS Grid 表格实现与 sticky 列偏移思路。 | [LICENSE](https://github.com/lejunyang/lun/blob/main/LICENSE) |

## 许可协议

Apache License 2.0。当前项目为开放源码项目，没有 Pro 版本分层，也没有付费功能门槛。
