// Barrel module for docs pages. Re-exports the 16 render functions used by
// docRegistry.tsx. `'./pages'` resolves to this file (pages/index.ts).
// Keep the list in docRegistry import order for easy cross-reference.

export { renderQuickStart } from './quick-start'
export { renderWhenToMigrate } from './when-to-migrate'
export { renderMigration } from './migrate-from-antd'
export { renderArchitecture } from './architecture-overview'
export { renderRenderingModel } from './rendering-model'
export { renderApiNamespace } from './api-namespace'
export { renderFeatures } from './features'
export { renderScrolling } from './scrolling'
export { renderStyling } from './styling-and-theme'
export { renderSemanticDom } from './semantic-dom'
export { renderPublicApi } from './public-api'
export { renderTableApi } from './table-api'
export { renderColumnApi } from './column-api'
export { renderCompatMatrix } from './compat-matrix'
export { renderKnownLimitations } from './known-limitations'
export { renderGridOptions } from './grid-options'
