import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  root: resolve(__dirname),
  base: './',
  build: {
    outDir: resolve(__dirname, '../dist/webview'),
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        // CI环境兼容性优化
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2
      },
      mangle: {
        safari10: true
      }
    },
    rollupOptions: {
      input: resolve(__dirname, 'index.html')
    },
    // 生成 source map 会增加体积，生产环境不需要
    sourcemap: false,
    // CI环境优化
    chunkSizeWarningLimit: 1000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, '../src/shared')
    }
  },
  server: {
    port: 3000
  }
});