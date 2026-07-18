import tokensCss from './tokens.css?inline'
import tableCss from './table.css?inline'
import './tokens.css'
import './table.css'

const DATA_GRID_STYLE_ID = 'nukepayload2-data-grid-style'

export function ensureDataGridStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById(DATA_GRID_STYLE_ID)) return

  const style = document.createElement('style')
  style.id = DATA_GRID_STYLE_ID
  style.textContent = `${tokensCss}\n${tableCss}`
  document.head.appendChild(style)
}
