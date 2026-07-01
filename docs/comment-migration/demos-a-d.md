# Demos A-D Comment Migration

This note captures design and compatibility context that was previously stored as long source comments in `src/demos` files whose basename starts with `a`-`d`.

## ajax

Sources:
- `src/demos/ajax.tsx`
- `src/demos/ajax.dg.tsx`
- `src/demos/ajax.antd.tsx`

Notes:
- The pair mirrors the Ant Design `ajax` table demo with local mock data from `_compare/ajax.shared.ts` instead of network requests.
- The left and right panes keep async table state independently so loading, pagination, sorter, and filter interactions can be compared without cross-pane synchronization.
- Both panes normalize sorter output into the shared `TableParams` shape before querying mock data.
- On page-size changes the current page rows are cleared before the next fetch, matching the original demo behavior.
- Virtualization uses pane-specific `scroll.y` handling: data-grid uses `scroll.y: true`; antd uses a numeric height because its pagination bar sits outside the scroll container.
- `SplitDemo` keeps `minPaneWidth={600}` because the ajax examples include a longer email column.

## basic

Sources:
- `src/demos/basic.tsx`
- `src/demos/basic.dg.tsx`
- `src/demos/basic.antd.tsx`

Notes:
- The root demo shares one `bordered` toggle and the global virtualization toggle across both panes.
- The data-grid pane uses a small inline tag implementation instead of importing Ant Design `Tag`, while the antd pane stays close to the official demo.
- The chosen split width (`minPaneWidth={480}`) is for a compact three-to-five-column layout without horizontal scrolling.
- Virtualization is wired into both panes; data-grid uses `scroll.y: true`, antd uses a numeric height.

## bordered

Sources:
- `src/demos/bordered.tsx`
- `src/demos/bordered.dg.tsx`
- `src/demos/bordered.antd.tsx`

Notes:
- The demo contains two subcases: title/footer with bordered tables, and bordered tables with fixed columns.
- `column-money` is kept only as a passthrough class-name parity check from the Ant Design example. It does not have project CSS and is not expected to create a visual difference.
- The data-grid pane uses logical alignment/fixed values (`end`, `start`) where the antd pane uses physical values (`right`, `left`).
- The fixed-column virtualization settings stay asymmetric for the same reason as other demos: data-grid supports `scroll.y: true`; antd requires numeric scroll bounds.

## colspan-rowspan

Sources:
- `src/demos/colspan-rowspan.tsx`
- `src/demos/colspan-rowspan.dg.tsx`
- `src/demos/colspan-rowspan.antd.tsx`

Notes:
- Both panes implement the same merge matrix as the Ant Design example: the second row merges `Name` across five columns; the fourth row merges `Home phone` downward across two rows; covered cells return `0` span and do not render.
- The data-grid pane also maps `rowScope='row'` to preserve the row-header semantics used by the antd pane.
- The demo description in the rendered page remains the user-facing place for expected visual results; the removed source comments only documented the merge plan.

## column-defaults

Sources:
- `src/demos/column-defaults.tsx`
- `src/demos/column-defaults.dg.tsx`
- `src/demos/column-defaults.antd.tsx`

Notes:
- The root demo compares table-level default column settings driven by one shared `ellipsis` toggle.
- The data-grid pane uses logical align values (`start`) while the antd pane uses `left`.
- Both panes inherit table-level `align: 'center'` and `ellipsis` defaults, with the `Address` column overriding alignment.
- Virtualization again diverges only in `scroll.y` shape: boolean for data-grid, numeric for antd.

## component-token

Sources:
- `src/demos/component-token.tsx`
- `src/demos/component-token.dg.tsx`
- `src/demos/component-token.antd.tsx`

Notes:
- This pair mirrors the Ant Design `component-token` demo with one shared `ConfigProvider theme.components.Table` payload driving both panes.
- The antd pane consumes the component tokens through its native css-in-js path; the data-grid pane consumes the same theme through the adapter layer and CSS variables.
- `SharedSize` keeps `medium` as the shared middle size spelling across both panes.
- Virtualization and fixed-header behavior still differ by scroll shape: data-grid uses `scroll.y: true`, antd uses numeric heights.

## custom-empty

Sources:
- `src/demos/custom-empty.tsx`
- `src/demos/custom-empty.dg.tsx`
- `src/demos/custom-empty.antd.tsx`

Notes:
- The demo compares two empty-state channels: table-body empty state through `locale.emptyText`, and filter-dropdown empty state through `ConfigProvider.renderEmpty('Table.filter')`.
- The root demo intentionally starts with an empty data set so both empty states are immediately visible.
- `Toggle Data` drives the same data source on both panes; the filter list on the `Age` column is empty only when there is no data.

## custom-filter-panel

Sources:
- `src/demos/custom-filter-panel.tsx`
- `src/demos/custom-filter-panel.dg.tsx`
- `src/demos/custom-filter-panel.antd.tsx`

Notes:
- Both panes inject the same search UX through a `getColumnSearchProps` factory: filter dropdown, search/reset/filter/close actions, active filter icon, focus-on-open, local search highlighting, and address-column sorting.
- Search text, searched column, and input ref are intentionally local per pane so left/right interactions remain independent for comparison.
- The icon is inlined instead of importing `@ant-design/icons` directly.
- The data-grid pane uses an `HTMLInputElement`-based ref path; the antd pane uses `InputRef`.

## drag-column-sorting

Sources:
- `src/demos/drag-column-sorting.tsx`
- `src/demos/drag-column-sorting.dg.tsx`
- `src/demos/drag-column-sorting.antd.tsx`

Notes:
- The left pane demonstrates the in-repo pointer-based column reorder flow; the right pane mirrors the Ant Design example with `@dnd-kit`.
- `columnReorder` is a left-pane-only global gate. `dragColumnLock: 'lockDrag'` blocks drag initiation, while `dragColumnLock: 'lockPosition'` keeps a column fixed in place during reordering.
- The data-grid pane shows a vertical indicator line and keeps stable keys when columns are reordered.
- The antd pane keeps the official `PointerSensor({ distance: 1 })` activation behavior.

## drag-multi-row-reorder

Sources:
- `src/demos/drag-multi-row-reorder.tsx`

Notes:
- This single-pane demo documents block row moves when the dragged row is already selected.
- With `multiRowReorder` on, all selected rows move together while preserving their relative order.
- If the dragged row is not selected, or the drop target falls inside the selected block, the behavior falls back to the no-op or single-row paths described by the on-screen help.
- The demo uses a fixed-height wrapper only when virtualization is enabled, because it is not rendered inside `SplitDemo`.

## drag-sorting

Sources:
- `src/demos/drag-sorting.tsx`
- `src/demos/drag-sorting.dg.tsx`
- `src/demos/drag-sorting.antd.tsx`

Notes:
- The left pane uses the in-repo row drag sorter; the right pane mirrors the Ant Design `@dnd-kit` sample.
- `autoScrollOnDrag` only affects the data-grid pane and is exposed in the root demo as a comparison toggle.
- The data-grid version keeps a fixed-layout width strategy so the address column absorbs the remaining width instead of creating unwanted horizontal scrolling.

## drag-sorting-handler

Sources:
- `src/demos/drag-sorting-handler.tsx`
- `src/demos/drag-sorting-handler.dg.tsx`
- `src/demos/drag-sorting-handler.antd.tsx`

Notes:
- Both panes restrict row dragging to the handle column.
- The left pane uses `handleSelector: '.dg-drag-handle'`; the right pane mirrors the Ant Design pattern of passing activator refs/listeners through row context.
- Both panes inline the holder icon to avoid a direct dependency on `@ant-design/icons`.

## drag-virtual-list

Sources:
- `src/demos/drag-virtual-list.tsx`

Notes:
- The demo exists to show why `autoScrollOnDrag` matters under virtualization.
- Without auto-scroll, hit testing can stall at the last rendered row because off-screen rows do not have DOM nodes yet.
- With auto-scroll, dragging near the viewport edge scrolls the real `.dg-scroll` container, which causes the virtual window to rerender and gives hit testing new row targets.
- The demo uses `10000` rows with a fixed `440px` virtual viewport and `rowHeight: 40`.

## dynamic-settings

Sources:
- `src/demos/dynamic-settings.tsx`
- `src/demos/dynamic-settings.dg.tsx`
- `src/demos/dynamic-settings.antd.tsx`

Notes:
- This pair mirrors the Ant Design `dynamic-settings` demo with a shared control panel driving both panes.
- Unlike `component-token`, this demo stays on the default theme and does not override component tokens.
- The shared panel covers bordered/loading/title/header/footer/expandable/selection/data/layout/ellipsis/scroll/pagination placement state in one place.
- Horizontal scroll keeps the original `120vw` setting from the Ant Design demo; vertical virtualization still uses boolean `scroll.y` on data-grid and numeric heights on antd.
