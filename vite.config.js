import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  root: 'media', // Set the root to the 'media' directory
  plugins: [vue()],
  build: {
    outDir: '../dist/media', // Adjust outDir relative to the new root ('media' directory)
    rollupOptions: {
      // input: 'main.js', // Entry point relative to the new root, if not index.html
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  },
  base: './' // Ensures relative paths in the built assets, good for webviews
});