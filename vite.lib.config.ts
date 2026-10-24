import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const externalPackages = [
  'react',
  'react-dom',
  'antd',
  '@ant-design/cssinjs',
  '@ant-design/fast-color',
  '@ant-design/icons',
]

function isExternal(id: string) {
  return externalPackages.some((pkg) => id === pkg || id.startsWith(`${pkg}/`))
}

/**
 * CJS 产物把 antd / cssinjs 的 `es/` 深路径改写成 `lib/` CJS 入口。
 *
 * ## 为什么
 * 源码里的深路径（`antd/es/locale/en_US`、`antd/es/grid`、`antd/es/menu/OverrideContext`、
 * `@ant-design/cssinjs/es/util/css-variables`）对打包器无害，但直接进 CJS 产物后有两处坏：
 * 1. CJS 产物 require 的是 antd 的 ESM 树，Node 下 `require('antd/es/...')` 走通后，
 *    antd ESM 文件内部的相对引用省略扩展名，最终 `ERR_MODULE_NOT_FOUND`；
 * 2. antd 的 CJS 对照物就在 `lib/`，同名同语义（`lib/locale/en_US.js`、`lib/grid/index.js`、
 *    `lib/menu/OverrideContext.js`、`lib/util/css-variables.js`）。
 * 所以只在 CJS 产物上把前缀换成 `lib/`，ESM 产物保持 `es/`（打包器按条件字段各自解析）。
 *
 * 只看 `require(...)` 字面量：产物里没有别的 `antd/es/` 字符串用途，改动面可控。
 */
function cjsAntdLibRewrite(): Plugin {
  return {
    name: 'dg-cjs-antd-lib',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const [fileName, output] of Object.entries(bundle)) {
        if (output.type !== 'chunk' || !fileName.endsWith('.cjs')) continue
        output.code = output.code.replace(
          /require\((["'])((?:antd|@ant-design\/cssinjs))\/es\//g,
          'require($1$2/lib/',
        )
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), cjsAntdLibRewrite()],
  build: {
    target: 'es2020',
    // 关闭 sourcemap：地图约占发布包解包体积的 70%（111 个 .map / 约 2.6 MB）。
    sourcemap: false,
    lib: {
      entry: './src/table/index.ts',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
      cssFileName: 'style',
    },
    rollupOptions: {
      external: isExternal,
    },
  },
})
