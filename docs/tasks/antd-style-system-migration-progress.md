# antd Style System Migration Progress

> Compact/resume rule: after any context compaction or session resume, read `docs/tasks/antd-style-system-migration-plan.md` first, then read this file before editing code.

## Current Status

Status: Completed. Runtime CSS/token behavior, tests, docs, demos, and browser sanity have been reconciled with the antd style-system migration contract.

The user clarified that this was a broad style-system migration and must be planned across turns. The impact inventory was completed before final runtime/docs/demo reconciliation.

## Final Snapshot

The worktree contains the completed migration changes:

- `src/table/style/tokens.css`
- `src/table/style/table.css`
- `src/table/tokenBridge.ts`
- `src/table/useTableThemeVars.ts`
- `src/table/engine/GridTable.tsx`
- `tests/table/hooks/tokenBridge.ts`
- `tests/table/style/styleSystemContract.ts`
- `src/demos/bordered-table.tsx`
- `src/demos/component-theme-tokens.tsx`
- `src/demos/dynamic-table-settings.tsx`
- `src/demos/merged-cells.tsx`
- `src/demos/theme-editor.tsx`
- `docs/features/styling/theme-tokens.md`
- `docs/features/columns/fixed-column.md`
- `docs/features/interaction/expand.md`
- `docs/features/interaction/filter-sorter.md`
- `docs/features/layout/bordered.md`
- `docs/features/layout/header-and-span.md`
- `docs/features/layout/layout.md`
- `docs/features/layout/summary.md`

Final direction:

- Runtime CSS consumers use direct `--ant-*` / `--ant-table-*` variables for overlapping antd Table concepts.
- `--dg-*` remains limited to row-height and floating-scrollbar mechanics.
- Docs and demo text describe antd vars / ConfigProvider `theme.components.Table` as the public theme surface.

## Completed Before This Plan

- Added compatible `.ant-table-*` class aliases for stable equivalent nodes.
- Kept structural native table selectors out of the compatibility surface.
- Updated migration page to say only structure-dependent DOM selectors need migration.
- Verified previously with:
  - `pnpm tsc -b --pretty false`
  - `pnpm vitest run tests/table/api/Table.public-api.tsx tests/table/engine/SortIndicator.tsx tests/table/engine/body/BodyGrid.tsx`
  - Chrome DevTools refresh of `http://localhost:5173/#/docs/migrate-from-antd`

## Phase 1 Inventory

Measured scope:

- `src/table/style`: 2 files / 1107 lines.
- `src/table`: 109 files / 21886 lines.
- `src/demos`: 230 files / 17874 lines.
- `docs/features`: 26 files / 1637 lines.
- `tests/table`: 72 files / 15318 lines.

Runtime `--dg-*` findings after current WIP:

| Variable | Current locations | Classification | Notes |
|---|---|---|---|
| `--dg-row-min-h` / `--dg-row-max-h` | `GridTable.tsx`, `table.css` | keep | Data-grid bounded row-height mechanics, no antd equivalent. |
| `--dg-scrollbar-thumb-active-bg` | `tokens.css`, `table.css` | keep for now | Data-grid floating scrollbar active/hover/dragging visual. Source remains `--ant-table-scroll-thumb-bg-hover`. |
| `--dg-scrollbar-thumb-expanded-opacity` | `tokens.css`, `table.css` | keep | Data-grid floating scrollbar behavior/weight, no antd token. |
| `--dg-row-gap` | `GridTable.tsx` comment only | defer/remove comment if obsolete | No runtime definition found in scanned style files. |

Variables replaced by current WIP:

- `--dg-font-size` -> direct `--ant-table-cell-font-size`.
- `--dg-cell-padding-block/inline` -> direct `--ant-table-cell-padding-block/inline`.
- `--dg-body-bg` -> direct `--ant-color-bg-container`.
- `--dg-header-bg/color/split` -> direct `--ant-table-header-*`.
- `--dg-border` / `--dg-border-color` / `--dg-radius` -> direct antd border/radius vars.
- `--dg-row-hover-bg`, sort backgrounds, header icon colors, primary color -> direct antd vars.

Important implementation risk found:

- Current WIP changed `.dg-size-middle` / `.dg-size-small` to override `--ant-table-cell-padding-*` and `--ant-table-cell-font-size` from CSS.
- This is likely ineffective when `useTableThemeVars` injects the same `--ant-table-*` vars inline on `.dg-wrapper`, because inline custom properties win over stylesheet custom properties.
- Fix direction: do not rely on size classes overriding inline antd vars. Use size-specific selectors that directly consume `--ant-table-cell-padding-block-md/sm`, `--ant-table-cell-padding-inline-md/sm`, and `--ant-table-cell-font-size-md/sm`, or introduce private effective variables explicitly documented as internal implementation details.

`.ant-table-*` alias inventory:

- Emitted stable aliases: `ant-table-wrapper`, `ant-table`, `ant-table-container`, `ant-table-content`, `ant-table-title`, `ant-table-footer`, `ant-table-cell`, `ant-table-cell-fix-left/right`, `ant-table-column-has-sorters`, `ant-table-column-sort`, `ant-table-column-sorters`, `ant-table-column-title`, `ant-table-column-sorter*`, `ant-table-filter-trigger`.
- Intentionally not emitted: `ant-table-thead`, `ant-table-tbody`, `ant-table-row` as native structure aliases.

Theme test inventory:

- Existing `tests/table/hooks/useTableThemeVars.tsx` covers var generation shape and merge order.
- Existing tests do not sufficiently prove runtime CSS consumption of `ConfigProvider theme.components.Table` values.
- Need focused coverage for:
  - generated `--ant-table-header-bg`, `--ant-table-row-hover-bg`, `--ant-table-cell-padding-block`, `--ant-table-cell-padding-inline`;
  - `Table.colorBgContainer` write-back to `--ant-color-bg-container`;
  - size class behavior after removing ineffective same-var CSS overrides;
  - emitted `.ant-table-*` aliases already have partial coverage in `tests/table/api/Table.public-api.tsx`.

## Next Required Step

Reconcile the current WIP with the risk above:

1. Fix size handling so it does not depend on stylesheet overrides of inline `--ant-table-*` vars.
2. Keep runtime CSS direct antd-var consumption where cascade is correct.
3. Add/update focused tests for `useTableThemeVars` and alias/runtime contract where feasible.
4. Run targeted tests and `pnpm tsc -b --pretty false`.

## Verification Log

- No verification has been run after the style-system draft WIP and Phase 1 inventory.

## Implementation Log

### Batch 1: size cascade risk fix

Changed runtime CSS so size handling no longer depends on stylesheet overrides of inline `--ant-table-cell-*` variables.

- Removed `.dg-size-middle/.dg-size-small` custom-property overrides from `tokens.css`.
- Added size-specific selectors in `table.css` that directly consume:
  - `--ant-table-cell-font-size-md/sm`,
  - `--ant-table-cell-padding-block-md/sm`,
  - `--ant-table-cell-padding-inline-md/sm`.
- Added size-specific filter trigger margin rules using MD/SM inline padding vars.

Pending verification:

- TypeScript.
- Existing theme hook tests.
- Table public API / alias tests.

Verification result:

- `pnpm tsc -b --pretty false` passed.
- `pnpm vitest run tests/table/hooks/useTableThemeVars.tsx tests/table/api/Table.public-api.tsx` passed: 2 files / 28 tests.

### Batch 2: comment/reference reconciliation

Changed comments only; no runtime behavior change.

- Replaced stale `docs/design-notes/theme-tokens.md` references with `docs/features/styling/theme-tokens.md`.
- Removed the obsolete `--dg-row-gap` comment from `GridTable.tsx`; current runtime `--dg-*` usage is limited to row-height mechanics and floating scrollbar mechanics.

Pending verification:

- Focused style-system contract tests.
- Focused token bridge/theme hook tests.

Verification result:

- `pnpm vitest run tests/table/style/styleSystemContract.ts tests/table/hooks/tokenBridge.ts tests/table/hooks/useTableThemeVars.tsx` passed: 3 files / 16 tests.

### Batch 3: docs/demo theme contract reconciliation

Changed docs/demo-facing theme contract issues found by the docs/demo audit.

- Corrected `docs/features/styling/theme-tokens.md` to use `--ant-table-cell-padding-block` in the unit example.
- Replaced the demo reference to the non-existent `docs/design-notes/theme-tokens.md` with `docs/features/styling/theme-tokens.md`.
- Removed direct `antd/es/theme/internal` and `antd/es/table/style/index` imports from `src/demos/theme-editor.tsx`.
- Exported `deriveTableComponentTokenDefaults` from `src/table/tokenBridge.ts` so the demo can reuse the project token bridge instead of modeling antd internal imports.
- Added tokenBridge coverage for the exported defaults helper.
- Reworded scroll.y notes in component-theme / dynamic-settings / theme-editor so they say `y:true` opens data-area mode and the Table fills available parent space, without asking users to pass calculated heights to Table.

Pending verification:

- Focused tokenBridge test.
- TypeScript check.

Verification result:

- `pnpm vitest run tests/table/hooks/tokenBridge.ts` passed: 1 file / 4 tests.
- `pnpm tsc -b --pretty false` passed.
- `pnpm vitest run tests/table/style/styleSystemContract.ts tests/table/hooks/tokenBridge.ts tests/table/hooks/useTableThemeVars.tsx tests/table/api/Table.public-api.tsx` passed: 4 files / 35 tests.
- `pnpm tsc -b --pretty false` passed after docs/demo wording cleanup.
- Chrome DevTools sanity passed:
  - `#/docs/migrate-from-antd` renders the migration steps with `scroll.y: true` and structural DOM migration guidance.
  - `#/docs/styling-and-theme` renders ConfigProvider `theme.components.Table` guidance.
  - `#/demos/component-theme-tokens` renders the updated theme-token path and `scroll.y:true` wording.
  - Theme editor modal opens and renders token controls plus data-grid/antd comparison tables.
  - Browser console has no error/warn messages.

## Open Risks

- No known open risks after targeted tests, TypeScript, and Chrome DevTools sanity.
