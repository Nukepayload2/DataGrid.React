# Task Status

Date: 2026-07-05

## Mode

- Long-running task.
- Continue implementing and validating until all remaining work is complete.
- Intermediate progress may remain unattended for a long time.
- Final human review will happen after implementation is finished.

## Completed

- Stage 0: done
- Stage 1: done
- Stage 2: done through `paginationAdapter.tsx`
- Stage 3a: exploration done
- Stage 3b: `cellRenderUtils.tsx` extracted and tested
- Stage 3b follow-up: `gridScrollUtils.ts` extracted and reviewed
- Stage 3b follow-up: `expandLayoutUtils.ts` extracted and reviewed
- Stage 3b follow-up: `expandLayerUtils.tsx` extracted and reviewed
- Stage 3b follow-up: `SummaryLayer.tsx` extracted and awaiting reviewer confirmation
- Stage 3b follow-up: `hoverController.ts` extracted and reviewed with cumulative-diff caution
- Stage 3b follow-up: `HeaderGrid.tsx` extracted and reviewed with cumulative-diff caution
- Stage 3b follow-up: `resizeColumnUtils.ts` extracted and reviewed with cumulative-diff caution
- Stage 3b follow-up: `treeIndentRenderer.tsx` extracted and reviewed with cumulative-diff caution
- Stage 3b follow-up: `bodyCellUtils.ts` extracted and reviewed with cumulative-diff caution
- Stage 3b follow-up: `gridTemplateColumnsUtils.ts` extracted and reviewed
- Stage 3b follow-up: `headerHeightUtils.ts` extracted and reviewed
- Stage 3b follow-up: `treeColumnUtils.ts` extracted and reviewed with cumulative-diff caution
- Stage 3b follow-up: `resolveBodyCellEllipsisTitle` dedup-extracted into cellRenderUtils.tsx and reviewed with cumulative-diff caution
- Stage 3 coarse split (2026-07-05): GridTable.tsx split into 4 component modules + thin orchestration layer (2681 → ~1114 lines); 178 unit tests added; all gates green
  - modules: `StickyScrollBar.tsx`, `HeaderCell.tsx` (+ColumnResizer), `BodyGrid.tsx` (renderBodyCells + internal BodyCell), `FlatColumnCells.tsx` (ColumnCells)
  - decision: `useGridLayout.ts` / `useGridScrollSync.ts` NOT extracted (negative-ROI — gridTemplate useMemo + scroll sync tightly coupled to GridTableInner orchestration)

## Remaining TODO

### Stage 3 — complete (2026-07-05)

- GridTable.tsx split into component modules (`StickyScrollBar` / `HeaderCell` / `BodyGrid` / `FlatColumnCells`) + ~1114-line orchestration layer. See "Stage 3 coarse split" under Completed.
- `useGridLayout.ts` / `useGridScrollSync.ts`: evaluated, NOT extracted — gridTemplate useMemo and scroll sync are tightly coupled into GridTableInner's orchestration (depend on ~20 locals, would need to pass ~6 values back). Revisit only if that coupling is first broken another way.
- `ScrollContainer.tsx`: not separately extracted — sticky / FloatingScrollBar container routing remains in GridTableInner as part of the orchestration layer.
- Hot-path optimizations (BodyCell memo, onCell cache, drag/resize) deferred to Stage 5 (after measurement).
- Working tree carries all Stage 3 extractions uncommitted (user commits manually at end).

### Stage 4

- Split type boundaries:
  - `publicTypes.ts`
  - `nativeOptions.ts`
  - `engineTypes.ts`
  - `compatTypes.ts`
- Preserve existing import surface through re-exports where needed.

### Stage 5

- Establish performance baselines.
- Optimize only after measurement:
  - hover path
  - cell memo path
  - `onCell` cache path
  - drag path
  - resize path

### Stage 6

- Evaluate `react-doctor` in advisory mode.
- Keep it non-blocking until the signal is stable.

### Stage 7

- Document and isolate live editor risk.
- Clarify sandbox boundaries for untrusted input.

## Verification Standard

- Run `pnpm run tsc`
- Run `pnpm run lint`
- Run `pnpm run test`
- Run `pnpm run build`
- Add focused tests for each extracted helper or changed behavior
- Reviewer agent must check for scope drift after each meaningful step

## Notes

- Keep changes small and behavior-preserving.
- Do not widen into layout-sensitive or hot-path refactors without a dedicated test or validation plan.
- Stage 3 complete (2026-07-05); next is Stage 4 (type boundaries). Working tree uncommitted — human commits at end.
