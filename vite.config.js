import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  root: resolve(__dirname, 'webview'),
  base: './',
  build: {
    outDir: resolve(__dirname, 'dist/webview'),
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      input: resolve(__dirname, 'webview/index.html')
    },
    // 生成 source map 会增加体积，生产环境不需要
    sourcemap: false
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'webview/src'),
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  server: {
    port: 3000
  }
});
