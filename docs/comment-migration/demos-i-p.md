# Demos i-p Comment Migration

This file records substantive source comments migrated out of the `src/demos` i-p ownership slice. Source behavior was kept unchanged; only explanatory comments were moved or shortened.

## Scope and takeover status

- Worker scope: direct child files under `src/demos` whose basename starts with `i` through `p`.
- Excluded by assignment: `src/demos/_compare`.
- Takeover status: I did not find an existing `docs/comment-migration/demos-i-p.md`, so this pass started from an empty docs file rather than extending a prior half-finished draft.

## `src/demos/index.ts`

Source: `src/demos/index.ts`

- The registry file is the central demo route list consumed by the portal.
- `theme-editor` is intentionally no longer registered as a demo route.
- The current entry point for theme editing is the top-bar modal in `src/ThemeEditorModal.tsx`; `src/demos/theme-editor.tsx` remains as the panel implementation.

## `jsx` demo family

Sources:

- `src/demos/jsx.tsx`
- `src/demos/jsx.dg.tsx`
- `src/demos/jsx.antd.tsx`

Migrated notes:

- This demo mirrors the antd `jsx` table example in a split comparison: data-grid on the left and antd on the right.
- Both sides declare columns through JSX children rather than a `columns` prop, using `<Table.Column>` and `<Table.ColumnGroup>`.
- The shared `bordered` switch in the parent drives both tables at once.
- The left data-grid table explicitly passes `pagination={{}}` to match antd behavior where the pagination bar still renders in a disabled state even when the row count does not exceed the page size.
- Virtualization is attached at the table level, not on JSX column children. The data-grid side uses `scroll.y: true` so height is inherited from the bounded split pane; the antd side uses a numeric `scroll.y` because antd does not accept `true` there.
- In the action column, data-grid uses `Space size="middle"` while the mirrored antd demo keeps `size="medium"`. In this setup they are treated as equivalent visual sizes.
- `SplitDemo` uses `minPaneWidth={480}` so the two panes stay side by side on typical laptop widths and stack on narrower screens.

## `multiple-sorter` demo family

Sources:

- `src/demos/multiple-sorter.tsx`
- `src/demos/multiple-sorter.dg.tsx`
- `src/demos/multiple-sorter.antd.tsx`

Migrated notes:

- The demo mirrors antd multiple-sorter behavior with three sortable score columns and a shared toolbar.
- Sort priority is encoded with `sorter.multiple`: Chinese = 3, Math = 2, English = 1. Higher `multiple` means higher precedence in the combined sort.
- Sorting is intentionally left uncontrolled on both sides. The `Reset` button increments a React key so both tables remount and clear their active sorter state without introducing controlled sorting semantics.
- Both sides log the same `onChange` payload shape for comparison.
- The data-grid side uses `scroll.y: true` under virtualization; the antd side uses a numeric height because its virtual table needs a fixed pixel value inside the same split pane.
- Observed product differences documented by the demo UI:
  - data-grid renders a visible sorter-priority badge beside sort carets when multiple columns are active; antd does not.
  - The `sorter` array emitted from `onChange` contains the same active sorters on both sides but may differ in ordering: antd follows column declaration order, while data-grid emits by ascending `multiple`.
- `SplitDemo` again uses `minPaneWidth={480}` to keep this narrow four-column table side by side on standard desktop widths.

## `narrow` demo family

Sources:

- `src/demos/narrow.tsx`
- `src/demos/narrow.dg.tsx`
- `src/demos/narrow.antd.tsx`

Migrated notes:

- This demo mirrors the antd narrow-container example with a `300px` wide container, `200` rows, `size="small"`, and optional pagination seeded from `defaultCurrent`.
- The toolbar controls two things across both sides: whether pagination is enabled at all, and which `defaultCurrent` value is supplied at mount time.
- The `defaultCurrent` segmented control does not actively jump the current page after mount. It only changes the uncontrolled initial value passed to each table; a controlled `current` plus `onChange` would be required for live page jumps.
- The main comparison point is width behavior in a narrow container:
  - data-grid naturally sizes tracks from content, so the table can overflow horizontally and show a horizontal scrollbar.
  - antd fills the `300px` container with `table-layout: fixed` semantics, so columns compress into the available width.
- On the data-grid side, virtualization required a flex-column wrapper with bounded height propagation so `scroll.y: true` has a real vertical space to inherit from the split pane.

## `nest-table-border-debug` demo family

Sources:

- `src/demos/nest-table-border-debug.tsx`
- `src/demos/nest-table-border-debug.dg.tsx`
- `src/demos/nest-table-border-debug.antd.tsx`

Migrated notes:

- This demo mirrors the antd nested-table border case with a root table and an expanded child table.
- `rootTableBordered` and `childTableBordered` are controlled independently in the parent and applied to both implementations, allowing comparison of parent/child border isolation.
- The intended behavior is that parent and child `bordered` props remain independent because each nested table is a distinct table instance.
- The data-grid side renders the expanded content as a separate nested data-grid table returned from `expandedRowRender`; the antd side uses a nested antd table.
- Both sides inline a small down-arrow SVG for the dropdown trigger to avoid taking a direct `@ant-design/icons` dependency in this demo slice.
- On the data-grid side, the `expandedRowRender` closure captures `childTableBordered`, so toggling the child switch causes the nested table to re-render with the new border state.

## `nested-table` demo family

Sources:

- `src/demos/nested-table.tsx`
- `src/demos/nested-table.dg.tsx`
- `src/demos/nested-table.antd.tsx`

Migrated notes:

- This demo adapts the antd nested-table example into a split comparison with one table per side plus a shared size switcher.
- The original antd demo presents three static size variants; this adaptation uses a shared segmented control so both sides can be compared at the same size in one viewport.
- Both tables start with `defaultExpandedRowKeys: ['0']`, relying on the usual uncontrolled "initial expanded rows" semantics.
- The nested child table is intentionally a separate table instance on both sides, produced by `expandedRowRender`.
- The shared size union uses `'large' | 'medium' | 'small'`. Here `medium` is treated as the middle size on both sides.
- Virtualization is applied only to the outer/root table. The expanded child table remains non-virtual content.

## `order-column` demo family

Sources:

- `src/demos/order-column.tsx`
- `src/demos/order-column.dg.tsx`
- `src/demos/order-column.antd.tsx`

Migrated notes:

- This demo mirrors antd column-ordering with `EXPAND_COLUMN` and `SELECTION_COLUMN` sentinels placed directly in the columns array.
- The intended column order on both sides is `Name -> expand -> Age -> selection -> Address`.
- The left data-grid side controls `selectedRowKeys` so the parent page can render a visible `selectedKeys` readout below the split comparison.
- The right antd side deliberately keeps `rowSelection={{}}` uncontrolled to stay faithful to the original demo.
- This means the comparison intentionally mixes one controlled selection implementation on the left and one uncontrolled implementation on the right, but only for demo observability. The sentinel-column positioning behavior remains the thing being compared.
- Under virtualization, the data-grid side uses inherited-height scrolling (`scroll.y: true`) while the antd side uses a fixed numeric `scroll.y`.
- The split pane uses `minPaneWidth={480}` so the five-column layout stays side by side at standard desktop widths.

## `pagination` demo family

Sources:

- `src/demos/pagination.tsx`
- `src/demos/pagination.dg.tsx`
- `src/demos/pagination.antd.tsx`

Migrated notes:

- This demo compares pagination placement by driving both tables from one shared `Radio.Group`.
- `placement` is passed as a one-element array, matching the v6 array-shaped placement API where a single entry means "render one paginator at this position".
- The demo includes `none` as a UI option to suppress pagination rendering from the shared control state.
- The main product-default difference is important:
  - data-grid does not paginate unless a `pagination` prop is explicitly provided.
  - antd tables paginate by default, including a default placement of `bottomEnd`.
- The left demo therefore passes an explicit `pagination` object to align with the right-side default behavior and make placement differences visible.
- Both sides still render a paginator even though the sample only has three rows and `defaultPageSize` is effectively ten; this is intentional so placement changes remain visible.
- Under virtualization, the data-grid side keeps the scrolling region height adaptive with `scroll.y: true`, while the antd side reserves a fixed pixel height because its paginator sits outside the virtual scroll area.
