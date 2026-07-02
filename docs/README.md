# Docs Overview

`docs/` is organized by document role rather than by workstream.

## Directories

- [`design-notes/`](design-notes) - Long-lived design notes about the table engine, layout model, and compatibility decisions. These are topic-oriented references that should stay useful after a task is over.
- [`tasks/`](tasks) - Working documents for planning, alignment, cleanup passes, and next-session handoff. These are process documents and may become stale as execution moves on.
- [`migration-log/comment-migration/`](migration-log/comment-migration) - Audit-style notes produced while moving long source comments into docs. These preserve migration context but are not meant to be the primary reading path.
- [`reference/`](reference) - Reference material, compatibility matrices, namespace strategy notes, and external capability comparisons.

## Entry Points

- [`tasks/task-plan.md`](tasks/task-plan.md) - Main project task ledger and historical execution record.
- [`tasks/next-session-alignment.md`](tasks/next-session-alignment.md) - Current handoff note for the next deep alignment pass.
- [`design-notes/summary.md`](design-notes/summary.md) - One design-note entry point when browsing engine topics.
- [`reference/compat-matrix.md`](reference/compat-matrix.md) - API compatibility audit against antd Table.
- [`reference/grid-options-namespace.md`](reference/grid-options-namespace.md) - Namespace policy for data-grid-specific APIs.
- [`reference/semantic-dom-compat.md`](reference/semantic-dom-compat.md) - Semantic DOM compatibility analysis against antd Table.
- [`migration-log/comment-migration/table-live-root.md`](migration-log/comment-migration/table-live-root.md) - Main audit entry for source-comment migration into docs.

## Classification Notes

- `design-notes` stays intentionally granular. Topic files were kept separate instead of being merged into a larger handbook.
- `migration-log/comment-migration` is retained as historical audit output because it explains where migrated source comments landed, but it is not treated as canonical long-term design documentation.
- Some historical documents still mention repo-root-style `docs/...` paths in code spans. These point at current locations or archived artifact paths, not signs that files still belong at the old paths.
