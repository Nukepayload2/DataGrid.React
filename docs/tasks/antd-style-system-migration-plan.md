# antd Style System Migration Plan

> Compact/resume rule: after any context compaction or session resume, read this file first, then read `docs/tasks/antd-style-system-migration-progress.md` before editing code.

## Goal

Make data-grid use antd's style system wherever concepts fully overlap with antd Table, while keeping data-grid-owned styling only for structural differences and native data-grid behavior.

## Design Rule

- Use antd-compatible APIs, classes, component tokens, and CSS variables for shared Table concepts.
- Keep `dg` classes and CSS variables for data-grid-specific structure: CSS Grid layout, virtual/recycling rendering, bounded row height, floating scrollbars, drag affordances, measurement, and DOM differences from native table.
- Do not expose `--dg-*` as a replacement theme API when an antd token or CSS variable already represents the same concept.
- Do not add `.ant-table-*` classes that imply a native `table/thead/tbody/tr/td` hierarchy when data-grid does not have that structure.

## Required Workflow

1. Investigate before implementation.
   - Measure file/search scope before scanning.
   - Produce a concrete inventory of variables, selectors, docs, demos, and tests affected.
   - Classify every item before touching runtime code.
2. Implement and verify in small batches.
   - For each batch: implement, run targeted tests/typecheck, update progress.
   - Do not batch unrelated styling, DOM alias, docs, and tests into one unverified change.
3. Keep progress current.
   - Update `docs/tasks/antd-style-system-migration-progress.md` after every meaningful implementation or verification step.
   - Record commands run and remaining risks.
4. Finalize only after implementation and validation agree.
   - Runtime CSS/token behavior is the source of truth.
   - Docs and demos are updated last to describe the final contract.

## Investigation Inventory

Create and maintain this classification before code changes:

| Area | Examples | Expected Direction |
|---|---|---|
| antd Table component vars | `--ant-table-header-bg`, `--ant-table-row-hover-bg`, `--ant-table-cell-padding-block` | Public theme surface. data-grid should consume these directly when semantics match. |
| antd alias vars | `--ant-color-bg-container`, `--ant-color-primary`, `--ant-line-width` | Public theme surface. Used directly for shared alias concepts and Table write-back tokens. |
| data-grid internal vars | `--dg-row-min-h`, `--dg-row-max-h`, floating scrollbar internal vars | Keep only for data-grid-specific mechanics. |
| data-grid classes | `.dg-grid`, `.dg-scroll`, `.dg-cell-*` | Keep for engine styling and structural implementation. |
| antd class aliases | `.ant-table-wrapper`, `.ant-table-cell`, `.ant-table-title`, etc. | Add only where there is a stable one-to-one data-grid node. |
| structural antd selectors | `.ant-table-thead`, `.ant-table-tbody`, `.ant-table-row`, `table > tr > td` | Do not fake. Document as migration-required if used. |

## Implementation Phases

### Phase 1: Inventory And Contract

- List all runtime `--dg-*` definitions and consumers.
- Classify each as:
  - replace with antd var,
  - keep as data-grid internal,
  - remove as unused,
  - defer because behavior is unclear.
- List all `.ant-table-*` aliases currently emitted.
- List relevant tests and demos that assert or explain theme behavior.

### Phase 2: Runtime Token Consumption

- Replace duplicated `--dg-*` bridge variables with direct antd var consumption where semantics match.
- Preserve internal `--dg-*` variables only for data-grid mechanics.
- Ensure `ConfigProvider theme.components.Table` affects data-grid through antd CSS vars, especially component tokens and alias write-back such as `colorBgContainer`.

### Phase 3: Class Alias Compatibility

- Confirm `.ant-table-*` aliases cover stable equivalent nodes.
- Remove or avoid aliases that imply unsupported native table structure.
- Add focused tests for emitted aliases.

### Phase 4: Theme Verification

- Add or update tests for:
  - `theme.components.Table.headerBg`,
  - `rowHoverBg`,
  - `cellPaddingBlock/cellPaddingInline`,
  - `colorBgContainer` write-back to `--ant-color-bg-container`,
  - dark algorithm/default token behavior where practical.
- Run targeted Vitest suites and `pnpm tsc -b --pretty false`.
- Use Chrome DevTools for docs/demo visual sanity where needed.

### Phase 5: Docs And Demos

- Update migration docs to state:
  - antd theme system is the public styling contract,
  - data-grid-specific styles cover only structural differences,
  - only structural DOM selectors require migration.
- Update theme docs and demo text after runtime behavior is verified.

## Completion Criteria

- Runtime styling follows antd vars for shared concepts.
- Data-grid-specific vars are documented as internal mechanics, not theme API.
- Focused tests cover theme var injection and class aliases.
- TypeScript and targeted tests pass.
- Docs and demos describe the verified behavior.
