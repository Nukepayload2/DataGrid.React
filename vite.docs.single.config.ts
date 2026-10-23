/**
 * docs 站点构建（离线单文件档）：`viteSingleFile()` 把 JS/CSS 全部内联成一个 HTML。
 *
 * 用途：整包分发、`file://` 双击打开、给评审者发一个文件。
 * 代价：无缓存、无分包、必须先下完 4.8 MB 内联脚本才开始解析 —— **不要**用它发公网站点。
 */
import { createDocsConfig, envVar } from './vite.docs.shared'

export default createDocsConfig({
  outDir: 'dist-docs-single',
  singleFile: true,
  base: envVar('DOCS_BASE'),
})
