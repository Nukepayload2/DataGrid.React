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

## Remaining TODO

### Stage 3

- Split `GridTable.tsx` into remaining low-risk helper / region boundaries.
- Current in progress: paused for machine transfer
- Preferred next candidates:
  - `HeaderGrid.tsx`
  - `BodyGrid.tsx`
  - `ScrollContainer.tsx`
  - `SummaryLayer.tsx`
  - `hoverController.ts`
  - `useGridLayout.ts`
  - `useGridScrollSync.ts`
- Keep `HeaderCell` / `BodyCell` / sticky / virtual / drag / ResizeObserver / pointermove / RAF paths stable unless a later step explicitly isolates them with tests.
- Reviewer note: hover extraction itself is low risk, but the current working tree now contains multiple Stage 3 extractions together, so whole-tree review sees cumulative scope.

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
- Session paused for transfer to another computer; resume from the remaining Stage 3/4 TODOs above.
