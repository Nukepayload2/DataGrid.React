import { defineConfig } from 'vite'
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

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: true,
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
