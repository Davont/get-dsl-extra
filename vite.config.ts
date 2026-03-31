import { resolve } from 'path'
import { defineConfig } from 'vite'

/**
 * Vite 配置
 * - dev 模式：直接访问 debug.html 调试 popup 逻辑
 * - build 模式：多入口打包，输出 Chrome 插件所需的文件结构
 */
export default defineConfig({
  root: 'src',
  publicDir: resolve(__dirname, 'public'),
  base: './',

  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        'service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'service-worker') {
            return 'background/service-worker.js'
          }
          return 'assets/[name]-[hash].js'
        },
      },
    },
  },

  server: {
    open: '/debug.html',
  },
})
