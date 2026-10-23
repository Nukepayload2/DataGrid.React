/**
 * docs 站点构建（默认档）：多文件 + 内容哈希 + 可长缓存。
 *
 * 用法：`pnpm build:docs`（会先跑 `docs:api`）。
 * 发布到 GitHub Pages 项目站点时用环境变量 `DOCS_BASE=/<repo>/` 覆盖 base。
 */
import { createDocsConfig, envVar } from './vite.docs.shared'

export default createDocsConfig({
  outDir: 'dist-docs',
  base: envVar('DOCS_BASE'),
})
