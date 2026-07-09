# Recycling virtualization implementation log

Date: 2026-07-09

## Result

Implemented the body-level recycling virtualization path.

Changed areas:

- Added `RecyclingBodyGrid`, an imperative body recycler that manages normal virtual data-area `.dg-cell.dg-cell-body` nodes directly under `.dg-grid`.
- Recycling mode now owns both outer body cell DOM and inner `.dg-cell-inner` HTMLElement content.
- `GridTable` enables recycling only for the supported simple virtual body model:
  - `gridOptions.virtualizationMode === 'recycling'`
  - virtual body enabled
  - sticky disabled
  - no tree
  - no expand
  - no `components.body.row`
  - no `components.body.cell`
  - no `column.onCell` merge path
- Unsupported requested recycling now falls back to the standard React body path and does not call `renderCellElement`.
- `standard` and `undefined` keep the existing React-managed body path.
- Removed the old `BodyGrid` per-cell imperative child mounting path so recycling is no longer implemented inside React-rendered body cells.
- Added focused `RecyclingBodyGrid` tests for:
  - imperative outer cell creation
  - unchanged params not rerunning inner renderers
  - same-column outer and inner reuse
  - hover outer-class patch not rerunning inner renderers
- Kept the demo comparison switch for `standard` / `recycling`; console logging remains off by default.

## Verification

Passed:

- `pnpm run tsc`
- `pnpm run lint`
- `pnpm run test`
- `pnpm run build`
- Browser smoke on `http://localhost:5175/#/demos/virtual-list-recycling`

Browser smoke result:

- Recycling mode rendered visible `.dg-recycling-text` content.
- Idle counters did not grow:
  - before idle: `create 1224 / reuse 0 / render 1224 / recycle 0 / discard 0`
  - after idle: `create 1224 / reuse 0 / render 1224 / recycle 0 / discard 0`
- After programmatic scroll to `scrollTop = 2400`, visible ID cells started at `77`.
- Scroll increased reuse/recycle and then stabilized while idle:
  - after scroll: `create 1394 / reuse 612 / render 2006 / recycle 612 / discard 0`
  - after second idle: `create 1394 / reuse 612 / render 2006 / recycle 612 / discard 0`
- Standard mode rendered the same `.dg-recycling-text` styled content and kept recycling counters at `0`.
- Console had no error or warning messages.

## Pitfalls

- The previous implementation only pooled `.dg-cell-inner` from inside React-rendered `BodyCell`. That did not meet the plan because React still created and reconciled every body cell.
- The first body-level recycler update order acquired new-window cells before releasing old-window cells. A fully disjoint fast scroll would miss same-frame pool reuse. Fixed by computing the target window first, releasing inactive cells, then acquiring cells for the new window.
- Same-key column object reference changes must not unmount inner content. Sorting and column state can produce new column objects; the recycler now only treats renderer/disposer identity changes as active-cell cleanup triggers.
- The recycler is mounted under a parent grid ref. `GridTable` now uses a callback ref plus a ready state so `RecyclingBodyGrid` is only mounted after the `.dg-grid` element exists.
- Dev-mode browser counters showed a doubled initial create count, likely from React dev remount behavior and the grid-ready mount cycle. The important regression checks are that idle counters do not grow and scroll reuses cells, both verified.
- This session did not have an `Agent general-purpose` tool, so I could not literally dispatch the manifest-defined reviewer agent. I used local automated verification and browser smoke instead.

## Dev server

Verified existing dev server:

```text
http://localhost:5175/#/demos/virtual-list-recycling
```
