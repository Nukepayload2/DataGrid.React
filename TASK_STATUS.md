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
- Stage 2 continuation (2026-07-06): `tableLayoutResolver.ts` (resolveTableLayout — antd mergedTableLayout equivalent), `useResponsiveColumns.ts` (antd InternalTable.tsx breakpoint filter), `useSemanticClassNames.ts` (classNames/styles normalize + engineSemantic subset), `useTableThemeVars.ts` (centralize antd internal token + 4 tokenBridge deps; output aliasTokenVars/tableTokenVars/wrapperStyle) all extracted out of `Table.tsx`. `Table.tsx` 1659 → 1426 lines. `refAdapter.ts` / `useTablePipeline.ts` remain inline in `Table.tsx` (deferred — not blocking).
- Stage 0 coverage (2026-07-06): v8 coverage wired into `vite.config.ts` (include `src/table/**`); `package.json` +`test:coverage` script + `@vitest/coverage-v8` dep; `.gitignore` +`coverage/`. Baseline: Lines 50.74% / Statements 49.08% / Branches 49.46% / Functions 57.18%.
- Stage 1 Playwright smoke (2026-07-06): `e2e/` (6 specs — basic / fixed-columns / virtual-list / drag-sorting / tree-data / filter-in-tree) + `playwright.config.ts` (executablePath `G:\Program Files\ChromeCon\chrome.exe`, fullyParallel:false, retries:0, webServer `pnpm dev` port 5173 overridable via `E2E_PORT`) + `.npmrc` (`playwright_skip_browser_download=1`) + `package.json` `test:e2e` script.
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
  - decision (later reversed in 2026-07-06 followup — see below): `useGridLayout.ts` / `useGridScrollSync.ts` initially NOT extracted (negative-ROI — gridTemplate useMemo + scroll sync tightly coupled to GridTableInner orchestration)
- Stage 4 (2026-07-05): type boundaries split into `publicTypes.ts` / `nativeOptions.ts` / `compatTypes.ts` / `engine/engineTypes.ts`; `types.ts` + `engine/types.ts` → pure barrels (explicit `export type` + value re-export of `TABLE_LOCALE_DEFAULT`/`EXPAND_COLUMN`/`SELECTION_COLUMN`); zero consumer changes; all gates green (287 tests pass)
- Stage 5 (2026-07-05): baselines established (5 hot paths; only virtual vertical scroll slower than antd, 1.7x); shipped #1+#4+#2 (onScroll RAF-throttle + geometry cache, recompute setState → refs/DOM-writes, flush batch/skip) + #25 (measureHeaderHeight cached behind a dedicated header RO); fixed a positioning regression those introduced (h-scrollbar at top → NaN-sentinel ref init + CSS bottom/top fallback); dg-vs-antd **1.7x → 0.89x** (dg now ≤ antd; onScroll + measureHeaderHeight ForcedReflow both eliminated); behavior verified via chrome-devtools; 287 tests green
- Stage 6 (2026-07-05): `react-doctor` v0.7.1 adopted **advisory** (`blocking: none`, `--no-telemetry`, non-gate) via `doctor.config.ts` + `pnpm run doctor`; complements tsgo/oxlint/vitest (hooks/effects/render-perf/a11y/security/correctness). First scan 206 → suppressed 10 noise rules + fixed 8 A-class findings → **95 findings**; behavior verified via chrome-devtools (sticky columns, multi-level headers, scrollbar sync, virtual-scroll perf all intact); 287 tests green
- Stage 3 final split (2026-07-06): `useGridScrollSync.ts` extracted from GridTable (task43 / plan G5 — the last split task). `stickyScrollLeft` state + `onStickyViewportWheel` callback + `stickyTranslateStyle` 派生 moved into hook; GridTable imports hook and passes values to ScrollContainer as props. Behavior byte-for-byte preserved (wheel short-circuits, clamp boundaries, getStickyMaxScroll 协同, translateX 派生 all kept). 25 unit tests added (initial state, translateStyle 派生, wheel short-circuits, delta precedence, clamp 边界, callback stability, integration chain). All gates green: tsc 0, lint 0, 469 tests pass (was 444), 4 e2e smoke (basic/virtual-list/fixed-columns/tree-data) all green. GridTable.tsx 821 → 802 lines; Table.tsx 1426 lines.

## Remaining TODO

### Stage 3 — complete (2026-07-05)

- GridTable.tsx split into component modules (`StickyScrollBar` / `HeaderCell` / `BodyGrid` / `FlatColumnCells`) + ~1114-line orchestration layer. See "Stage 3 coarse split" under Completed.
- `useGridLayout.ts` / `useGridScrollSync.ts` / `ScrollContainer.tsx` (+ `useScrollMode.ts`, `useRowHeightSystem.ts`, `useSemanticClassNames.ts`, `useTableThemeVars.ts`): **all subsequently extracted** in the 2026-07-06 followup — the original "tightly coupled, negative-ROI, do not extract" call was reversed via byte-level move (full closure passed as one options object / props). See "Stage 3 final split" + "Follow-up extractions" under Completed. The earlier "NOT extracted" note is superseded.
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

### Stage 7 — not needed (user decision, 2026-07-05)

- Live editor runs the **user's own demo code** in their own dev environment — no multi-user / untrusted-input threat model. Sandbox/isolation not required (user: "用户输入任何内容是用户的问题").
- `react-doctor`'s `no-eval` finding on `live/evalModule.ts:20` (`new Function`) is **wontfix by design** — that eval is the live editor's core mechanism for the user's own code.

## Follow-up extractions (uncommitted — started 2026-07-05, extended 2026-07-06)

Eight extractions from `Table.tsx` + `GridTable.tsx` (4 hooks out of `Table.tsx`; 3 hooks + 1 component out of `GridTable.tsx`) plus the Stage 1 Playwright smoke layer — all uncommitted in the working tree. **Static verification (2026-07-06): byte-level diff vs HEAD by main + an independent verifier subagent — all 8 `PRESERVED`, zero findings, zero dangling references / orphaned imports; test depth uniformly strong.** Two of them (`useGridLayout`, `ScrollContainer`) **reverse** the earlier Stage-3 "do not extract — negative ROI" decision: the coupling concern was sidestepped by passing the full closure as one options object (deps array byte-aligned) rather than by decoupling. **Gates green (2026-07-06)** — see "Stage 3 final split" under Completed (tsc 0, lint 0, 469 tests, 4 e2e smoke); run by the user (`pnpm` was agent-blocked).

- **Stage 2 continuation — `tableLayoutResolver.ts`** (`resolveTableLayout`): antd `mergedTableLayout` clone (rc-table `Table.tsx:613-627`). Wired at `Table.tsx:1003` (`resolveTableLayout(tableLayoutProp, visibleColumns, scroll?.x, scroll?.y, sticky)`). Sentinel columns skipped; explicit prop wins; fixColumn+`max-content` → `auto` short-circuit. Unit tests in `__tests__/tableLayoutResolver.test.ts` (explicit-prop precedence, fixColumn/fixHeader/isSticky/ellipsis escalation, fixColumn×scroll.x matrix, sentinel-skip, combined).
- **Stage 2 continuation — `useResponsiveColumns.ts`** (`useResponsiveColumns` hook): antd `InternalTable.tsx:235-246` breakpoint filter. Wired at `Table.tsx:330`. `needResponsive` short-circuit returns original `columns` reference (no re-render for the ~49 demos without `responsive`); sentinel-always-kept; OR-semantics across breakpoints; `screens ?? {}` defensive branch. Unit tests in `__tests__/useResponsiveColumns.test.ts` (short-circuit ref-stability, breakpoint filter, sentinel+responsive mix, screens=undefined).
- **`useSemanticClassNames.ts`** (`useSemanticClassNames`) — normalize `classNames`/`styles` (object-or-fn `(info) => obj`) to static objects + build `engineSemantic` subset (section/content/header/body). Wired `Table.tsx:834`. Tests `__tests__/useSemanticClassNames.test.ts`.
- **`useTableThemeVars.ts`** (`useTableThemeVars`) — antd internal `useToken` 6-tuple → `realToken`[1]/`cssVar`[4] → alias+table CSS vars via `tokenBridge` → `wrapperStyle` merge (`{...alias, ...table}` then `style` + `stylesResolved.root`). Centralizes all `antd/es/theme/internal` + 4 `tokenBridge` deps out of `Table.tsx`. Wired `Table.tsx:905`. Tests `__tests__/useTableThemeVars.test.tsx`.
- **`engine/useScrollMode.ts`** (`useScrollMode`) — sticky / virtual / container-fixed-header mutual-exclusion derivation (priority sticky > virtual > container-fixed; emits `headerStickyTop` + `stickyHeaderOffset`). Wired `GridTable.tsx:201`. Tests `engine/__tests__/useScrollMode.test.ts`.
- **`engine/useRowHeightSystem.ts`** (`useRowHeightSystem` + `useEffectiveRowHeight`) — row-height derivation + bounded-row-height model + `getRowHeight`/`effectiveRowHeight` callbacks (hot path; stable refs). Two-stage split because `effectiveRowHeight` depends on `virtualState.sizeOf` (getRowHeight before virtualState, effectiveRowHeight after). Wired `GridTable.tsx:365,388`. Tests `engine/__tests__/useRowHeightSystem.test.ts`.
- **`engine/useGridLayout.ts`** (`useGridLayout`) — grid-template-rows/columns/auto-flow `useMemo` (header+body+summary tracks, virtual padding tracks, expand 0fr/1fr interleave, summaryStartLine/paddingTop/BottomLine). **Reverses the Stage-3 "don't extract" call** — full closure passed as one options object; 20-key deps array byte-aligned with the original. Wired `GridTable.tsx:433`. Tests `engine/__tests__/useGridLayout.test.ts`.
- **`engine/ScrollContainer.tsx`** (`ScrollContainer` component) — three-branch scroll-container routing (sticky clip-viewport + StickyScrollBar + extracted summary-grid / unreachable sticky fallback / FloatingScrollBar horizontal). Owns local `mergeSectionClass`/`mergeSectionStyle` equivalent to the old GridTable closure versions (verifier-confirmed identical output for sectionClassName defined/undefined). **Reverses the Stage-3 "don't extract" call.** Wired `GridTable.tsx` return. Tests `engine/__tests__/ScrollContainer.test.tsx`.
- **Stage 1 — Playwright e2e smoke (`e2e/` + `playwright.config.ts` + `.npmrc`)**: 6 specs landing on the plan's smoke candidate list — `basic`, `fixed-columns`, `virtual-list`, `drag-sorting`, `tree-data`, `filter-in-tree`. Config uses the local Chrome (`G:\Program Files\ChromeCon\chrome.exe`), `fullyParallel:false`, `retries:0`, `webServer: pnpm dev` (port 5173, overridable via `E2E_PORT`); `.npmrc` sets `playwright_skip_browser_download=1`. `pnpm run test:e2e` script added. Not yet executed this session.

Net (vs HEAD): `Table.tsx` −251 lines, `GridTable.tsx` −244 lines (inline blocks moved out; call sites + cross-reference comments retained). `package.json` +`test`/`test:watch`/`test:coverage`/`test:e2e`; `vite.config.ts` +vitest jsdom+setup+coverage config.

**Gates green (2026-07-06):** tsc 0, lint 0, 469 tests pass, 4 e2e smoke (basic/virtual-list/fixed-columns/tree-data) all green — run by the user as part of the "Stage 3 final split" entry under Completed (covers these 8 extractions + the `useGridScrollSync` extraction). Static verdict (byte-level diff + independent verifier) was already clean before the gate run.

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
- All stages complete or declined (2026-07-05): 0-2 done earlier; 3 structural split; 4 type boundaries; 5 virtual-scroll perf (dg ≤ antd); 6 react-doctor advisory; 7 declined (no untrusted-input threat model). Plan complete. Working tree carries Stage 4 + Stage 5 + Stage 6 changes uncommitted — human commits + final review.
