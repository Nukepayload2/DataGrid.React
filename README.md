# @nukepayload2/data-grid

> **Drop-in replacement for antd Table — same API, same look, fixes the bugs antd can't. CSS Grid under the hood.**

`data-grid` is a React 19 + Ant Design v6 compatible data grid that drops into any existing antd Table codebase with a one-line import change. It keeps the `Table` props, the antd look, and the antd token system — but rebuilds the table engine on CSS Grid so the column-width model, virtualization, and scrolling behavior are finally correct.

## Why teams switch

antd Table's hardest bugs ([#45524](https://github.com/ant-design/ant-design/issues/45524), [#47184](https://github.com/ant-design/ant-design/issues/47184), [#48152](https://github.com/ant-design/ant-design/discussions/48152), [#56151](https://github.com/ant-design/ant-design/issues/56151), [#56356](https://github.com/ant-design/ant-design/issues/56356), [#46467](https://github.com/ant-design/ant-design/issues/46467) …) all trace back to one architectural root: a dual-`<table>` layout with `colgroup` + placeholder `<th>` + `rc-virtual-list`'s hand-rolled scrollbar. Six years of patches haven't fixed it because the architecture can't move. `data-grid` replaces that architecture instead of patching it.

### Four moats

| Moat | What it means for you |
|---|---|
| **Drop-in compatible with antd v6 API** | Migrate by changing one import. `TableProps`, columns, dataSource, rowSelection, pagination, summary — all the antd surface you already use keeps working. New differentiation lives in `gridOptions` / `gridColumnOptions` and never pollutes the antd-compatible surface. |
| **Reuses antd non-table widgets** | Pagination, Spin, Tooltip, Dropdown, Empty, tokens — all genuine antd. Your users and your boss can't tell the table was swapped out. No design-system drift, no second source of truth for theming. |
| **Token-aligned to antd v6** | Every `--ant-*` token flows into the grid through the standard antd injection chain. Light/dark themes, custom brand palettes, and ConfigProvider overrides just work. |
| **CSS Grid column-width single source of truth** | `grid-template-columns` is the one and only column-width truth. No second cache, no desync between header / body / scrollbar / summary, no jitter on empty data or dynamic columns. This is the physical root of every win below. |

## See the moats in action — five "antd can't" demos

Each demo is a side-by-side comparison: antd Table on the left showing the real bug, `data-grid` on the right showing the fix.

| Demo | What it proves |
|---|---|
| **`resizable-columns`** | Drag-to-resize columns with min/max constraints, correct behavior alongside fixed columns — the AG-Grid-paid-tier feel, free and open source. antd has had an open RFC for two years ([#48152](https://github.com/ant-design/ant-design/discussions/48152), [#56356](https://github.com/ant-design/ant-design/issues/56356)). |
| **`virtual-summary`** | Virtualized scrolling with a real summary row rendered at the same time. antd's maintainer has explicitly conceded "summary only works with `fixed`" under virtualization ([#47184](https://github.com/ant-design/ant-design/issues/47184)). `data-grid` treats summary as an independent grid item outside the virtual window. |
| **`clickable-scrollbar`** | An 8px-wide hit area horizontal scrollbar with a component-level `scrollBarFoldMode` collapse strategy — addressing antd's thin, uncollapsible scrollbar ([#53813](https://github.com/ant-design/ant-design/issues/53813), [#44972](https://github.com/ant-design/ant-design/issues/44972)). |
| **`stable-empty-width`** | Column widths stay rock-stable when data goes empty, columns are added/removed, or the dataset reshapes — killing the long-running misalignment / width-jump family ([#56151](https://github.com/ant-design/ant-design/issues/56151), [#56713](https://github.com/ant-design/ant-design/issues/56713), [#55717](https://github.com/ant-design/ant-design/discussions/55717)). |
| **`scrollto-scoped`** | `scrollTo(row)` moves the table body without scrolling the outer page container. antd's team has confirmed the outer-scroll contamination as a bug ([#46467](https://github.com/ant-design/ant-design/issues/46467)). |

Run the demo portal locally to see all five side-by-side:

```bash
pnpm install
pnpm dev
```

## Install

```bash
pnpm add @nukepayload2/data-grid antd@^6 react@^19 react-dom@^19
```

`antd`, `react`, and `react-dom` are peer dependencies — `data-grid` is a drop-in, not a fork.

## Migrate from antd Table

Change one import. Everything else — columns, dataSource, rowSelection, pagination, summary, scroll — stays as-is.

```diff
- import { Table } from 'antd';
+ import { Table } from '@nukepayload2/data-grid';
```

```tsx
import { Table } from '@nukepayload2/data-grid';
import type { ColumnsType } from '@nukepayload2/data-grid';

const columns: ColumnsType<Record<string, any>> = [
  { title: 'Name', dataIndex: 'name', width: 200 },
  { title: 'Age', dataIndex: 'age', width: 100 },
];

export default function App() {
  return (
    <Table
      rowKey="name"
      columns={columns}
      dataSource={[{ name: 'Alice', age: 28 }, { name: 'Bob', age: 34 }]}
      pagination={{ pageSize: 10 }}
    />
  );
}
```

For the full compatibility matrix and known limitations, see the docs site.

## License

MIT — pure open source, no Pro tier, no paywall. Every feature, including resizable columns, virtual + summary, and the upcoming row grouping / edit mode, ships free.
