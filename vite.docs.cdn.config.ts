/**
 * docs 站点构建（第三方 CDN 档）：react / react-dom / antd 走 `external` + esm.sh import map。
 *
 * 用法：`pnpm build:docs:cdn`，产物在 `dist-docs-cdn/`。
 *
 * ## 这条档位换来的是什么（读数，别凭感觉）
 * 用户下载的**字节不会变少**，只会变"从更快的 host 来"：
 * - esm.sh 侧：react 3 KB br + react-dom/client 47 KB br + antd 全量 380 KB br ≈ **430 KB br**；
 * - 本地侧：站点壳与业务 chunk 照旧。
 * 对照本仓瘦身后的自托管首屏 ≈280 KB(gzip)：**CDN 档下的 antd 是全量、不 tree-shake**，
 * 所以它只有在"本仓 → 用户"的链路确实比"esm.sh → 用户"慢 3 倍以上"时才划算。
 * 40 KB/s 的 GitHub Pages 正是这种场景，但 esm.sh 在国内的可达性必须实测后再决定默认走哪档。
 *
 * ## 为什么不用 jsDelivr 的 `+esm`
 * 实测：jsDelivr 的 `?external=` 被忽略，依赖被改写成**绝对 URL**，一个 antd 页面会产生
 * 250 个请求、8 份 React（含字面量 `react@>=16.0.0`），直接 `useContext` 崩溃。
 */
import { createDocsConfig, envVar } from './vite.docs.shared'

export default createDocsConfig({
  outDir: 'dist-docs-cdn',
  base: envVar('DOCS_BASE'),
  cdn: 'esmsh',
})
