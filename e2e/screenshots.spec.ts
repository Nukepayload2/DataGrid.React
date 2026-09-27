import { test, expect } from '@playwright/test'

import { demos } from '../src/demos/index'

/**
 * demo 截图回归（替代 antd `tests/shared/imageTest` 的 puppeteer 版）。
 *
 * 断言对象：`/#/demos/<name>` 整页（含站点壳与源码面板）。
 *   - 之所以整页而非只截 `.dg-wrapper`：demo 站点的壳、分组标题、源码面板也是交付面，
 *     单截表格子树会漏掉「demo 页面本身渲染坏了」这类回归。
 *   - `toHaveScreenshot` 默认 `animations: 'disabled'`（等 CSS 动画/过渡结束并冻结）+
 *     `caret: 'hide'`（隐藏光标），因此不需要额外注入 `<style>` 关动画。
 *
 * 主题两档：`emulateMedia({ colorScheme })` 驱动 `src/theme/ThemeContext.tsx` 的
 * `(prefers-color-scheme: dark)` 判定；站点壳只有 light/dark 两档（无 compact）。
 *
 * 基线：`e2e/screenshots.spec.ts-snapshots/<theme>-<name>-chromium-win32.png`，首次用
 * `npx playwright test e2e/screenshots.spec.ts --update-snapshots` 生成，之后比对。
 * 文件名是 Playwright 默认模板（`{arg}` 里的 `/` 会被规范化成 `-`，所以主题落在前缀而不是目录）。
 * 浏览器 = `playwright.config.ts` 的系统 Chrome（基线只在同机同浏览器版本下可比）。
 */

/** 纯 antd 对照 demo：页面里没有 `.dg-*` DOM，不属 data-grid 截图断言面。 */
const SKIP_DEMOS = new Set(['dom-recycled-virtual-list-antd'])

const THEMES = ['light', 'dark'] as const

for (const theme of THEMES) {
  test.describe(`screenshots ${theme}`, () => {
    test.use({ colorScheme: theme, viewport: { width: 1280, height: 800 } })

    for (const demo of demos) {
      if (SKIP_DEMOS.has(demo.name)) continue

      test(demo.name, async ({ page }) => {
        await page.goto(`/#/demos/${demo.name}`)

        // 左栏 data-grid 表（compare demo 与单表 demo 都有 .dg-wrapper）。
        await expect(page.locator('.dg-wrapper').first()).toBeVisible()

        // 字体就绪 + 布局收敛：demo 的懒加载模块会触发二次渲染（度量/虚拟窗口），
        // 字体未就绪时截图会得到回退字体的宽度，跨运行不稳定。
        await page.evaluate(async () => {
          await document.fonts.ready
          await new Promise((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve(null)))
          })
        })

        await expect(page).toHaveScreenshot(`${theme}/${demo.name}.png`)
      })
    }
  })
}
