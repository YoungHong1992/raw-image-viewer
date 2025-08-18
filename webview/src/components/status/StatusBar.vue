<template>
  <div class="status-bar">
    <div v-if="store.error" class="status-bar-item error-message">{{ store.error }}</div>
    <template v-else>
      <div class="status-bar-item" id="image-size">图像尺寸: {{ canvasWidth }}×{{ canvasHeight }}</div>
      <div class="status-bar-item" id="pixel-info">像素: ({{ pixelR }}, {{ pixelG }}, {{ pixelB }})</div>
      <div class="status-bar-item" id="cursor-pos">坐标: ({{ cursorX }}, {{ cursorY }})</div>
      <div class="status-bar-item" id="file-info">文件: {{ formatFileSize(fileSize) }}</div>
    </template>
  </div>
</template>

<script setup>
import { useImageStore } from '../../stores/image';
import { storeToRefs } from 'pinia';

const store = useImageStore();
const { canvasWidth, canvasHeight, pixelR, pixelG, pixelB, cursorX, cursorY, fileSize } = storeToRefs(store);

// 格式化文件大小显示
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
</script>

<style scoped>
.status-bar {
  height: 30px;
  min-height: 30px;
  /* 确保最小高度 */
  background-color: var(--vscode-statusBar-background);
  color: var(--vscode-statusBar-foreground);
  width: 100%;
  display: flex;
  align-items: center;
  padding: 0 10px;
  gap: 20px;
  font-size: 12px;
  flex-shrink: 0;
  /* 防止状态栏被压缩 */
  border-top: 1px solid var(--vscode-statusBar-border, var(--vscode-sideBar-border));
}

.status-bar-item {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.error-message {
  color: var(--vscode-errorForeground);
  font-weight: bold;
}
</style>
