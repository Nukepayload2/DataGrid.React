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
- Stage 4 (2026-07-05): type boundaries split into `publicTypes.ts` / `nativeOptions.ts` / `compatTypes.ts` / `engine/engineTypes.ts`; `types.ts` + `engine/types.ts` → pure barrels (explicit `export type` + value re-export of `TABLE_LOCALE_DEFAULT`/`EXPAND_COLUMN`/`SELECTION_COLUMN`); zero consumer changes; all gates green (287 tests pass)
- Stage 5 (2026-07-05): baselines established (5 hot paths; only virtual vertical scroll slower than antd, 1.7x); shipped #1+#4+#2 (onScroll RAF-throttle + geometry cache, recompute setState → refs/DOM-writes, flush batch/skip) + #25 (measureHeaderHeight cached behind a dedicated header RO); fixed a positioning regression those introduced (h-scrollbar at top → NaN-sentinel ref init + CSS bottom/top fallback); dg-vs-antd **1.7x → 0.89x** (dg now ≤ antd; onScroll + measureHeaderHeight ForcedReflow both eliminated); behavior verified via chrome-devtools; 287 tests green
- Stage 6 (2026-07-05): `react-doctor` v0.7.1 adopted **advisory** (`blocking: none`, `--no-telemetry`, non-gate) via `doctor.config.ts` + `pnpm run doctor`; complements tsgo/oxlint/vitest (hooks/effects/render-perf/a11y/security/correctness). First scan 206 → suppressed 10 noise rules + fixed 8 A-class findings → **95 findings**; behavior verified via chrome-devtools (sticky columns, multi-level headers, scrollbar sync, virtual-scroll perf all intact); 287 tests green

## Remaining TODO

### Stage 3 — complete (2026-07-05)

- GridTable.tsx split into component modules (`StickyScrollBar` / `HeaderCell` / `BodyGrid` / `FlatColumnCells`) + ~1114-line orchestration layer. See "Stage 3 coarse split" under Completed.
- `useGridLayout.ts` / `useGridScrollSync.ts`: evaluated, NOT extracted — gridTemplate useMemo and scroll sync are tightly coupled into GridTableInner's orchestration (depend on ~20 locals, would need to pass ~6 values back). Revisit only if that coupling is first broken another way.
- `ScrollContainer.tsx`: not separately extracted — sticky / FloatingScrollBar container routing remains in GridTableInner as part of the orchestration layer.
- Hot-path optimizations (BodyCell memo, onCell cache, drag/resize) deferred to Stage 5 (after measurement).
- Working tree carries all Stage 3 extractions uncommitted (user commits manually at end).

### Stage 4 — complete (2026-07-05)

- Types split into `publicTypes.ts` / `nativeOptions.ts` / `compatTypes.ts` / `engine/engineTypes.ts`. `types.ts` and `engine/types.ts` are now pure barrels — all existing imports resolve unchanged. Zero consumer changes; import surface + public type set intact. All gates green (tsc 0, lint 0, 287 tests pass, build OK).
- Categorization: atomic + data-grid-native options → `nativeOptions` (no imports); antd-bridging → `compatTypes` (+ 3 value consts + `ColumnOrSentinel`); public API → `publicTypes`; engine-internal → `engineTypes`. Acyclic dependency graph.

### Stage 5 — complete (2026-07-05)

- Baselines established for all 5 hot paths. User-confirmed: only **virtual vertical scroll** felt slower than antd (1.7x); hover / cell-memo / onCell / drag all fine (0 long tasks / 0 forced reflow).
- Optimizations shipped (#1+#4+#2 in `FloatingScrollBar.tsx` + `useRowMeasurements.ts`): onScroll RAF-throttle + geometry cache (ref, RO-refreshed) eliminated the 46ms forced reflow; recompute `setState` → refs/DOM-writes removed FloatingScrollBar's scroll-time React re-renders; flush uses `offsetHeight` + children-signature short-circuit. dg-vs-antd **1.7x → 1.06x** (avg/p50 at parity). 287 tests green; behavior spot-checks pass.
- **Residual done (#25)**: `measureHeaderHeight` now cached behind a dedicated header ResizeObserver — only re-measures on header change, not every scroll RO. dg engine ForcedReflow during scroll now ~0.3ms (FloatingScrollBar.doSync) vs antd's ~45ms internal; dg ≤ antd (0.89x).
- **Regression fixed**: #1/#4's "skip if unchanged" guard skipped the first inline position write when `summaryH=0`, so the h-scrollbar fell back to CSS and jumped to the top. Fixed via NaN-sentinel ref init (forces first write) + CSS bottom/top fallback. Verified via chrome-devtools across scroll-x demos.
- **Deferred (high risk)**: #3 — `useVirtualList` start/end useMemo dependency refactor + offsetTree structural sharing. Touches virtualization core; not worth it while avg/p50 are at parity.
- Untouched by design: `flushSync` (useVirtualList L309), offsetTree/AATree, smooth RAF easing, sticky/horizontal sync.

### Stage 6 — complete (2026-07-05)

- `react-doctor` v0.7.1 adopted as **advisory** (`blocking: none`, `--no-telemetry`, non-gate) via `doctor.config.ts` + `pnpm run doctor` script. Complements tsgo/oxlint/vitest (hooks/effects, render perf, a11y, security, React correctness); does NOT replace them.
- First scan: 206 findings. C-class noise suppressed (10 rules: `anchor-is-valid`, grid-cell a11y, `no-array-index-as-key`, etc.). 8 A-class findings fixed (prism jsx-key ×4, FloatingScrollBar `useEffectEvent`→ref-as-latest, StickyScrollBar `will-change`→hover-scoped, `useStickyColumns`/`useHeaderRowHeights` derived-state→merged-into-measure, `useSplitDemoSource` reducer). **Post-fix: 95 findings** (54% reduction); behavior verified via chrome-devtools.
- **Known false positives (do NOT re-fix)**: `jsx-key` on `BodyGrid:139` / `FlatColumnCells:416` (key stable after spread) + `drag-virtual-list:127` (single element); `exhaustive-deps` where refs don't enter deps (React convention); `unused-export` on demo default exports (consumed via `import.meta.glob`).
- **Wontfix**: `no-eval` (live editor → Stage 7); `no-flush-sync` (virtuoso-aligned); React 19 `forwardRef`/`useContext` deprecations (migration backlog).
- Report: `docs/react-doctor-report-stage6.{txt,json}` + `docs/react-doctor-dump/`.

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
- Stages 3, 4, 5 & 6 complete (2026-07-05); next is Stage 7 (live-editor sandbox). Working tree carries Stage 4 + Stage 5 + Stage 6 changes uncommitted — human commits at end.
