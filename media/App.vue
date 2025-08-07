<template>
  <div class="app-main-layout">
    <div class="raw-image-container">
      <ControlsPanel @applyParams="applyParams" />
      <ImageContainer ref="imageContainer" />
    </div>
    <StatusBar />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useImageStore } from './stores/image';
import ControlsPanel from './components/ControlsPanel.vue';
import ImageContainer from './components/ImageContainer.vue';
import StatusBar from './components/StatusBar.vue';

const props = defineProps({
  vscode: Object
});

const imageContainer = ref(null);
const store = useImageStore();

// 应用参数函数
const applyParams = () => {
  if (store.validateParams()) {
    if (store.rawData && store.rawData.length > 0 && imageContainer.value) {
      imageContainer.value.displayRawImage(store.rawData, store.width, store.height, store.bitsPerPixel, store.pixelFormat);
    }
  }
};

onMounted(() => {
  window.addEventListener('message', async e => {
    const { type, body } = e.data;
    switch (type) {
      case 'init': {
        if (body.value) {
          const rawData = new Uint8Array(body.value);
          store.setRawData(rawData);

          // 如果有推荐的设置，自动应用第一个推荐
          if (imageContainer.value && store.rawData && store.rawData.length > 0) {
            applyParams();
          }
        }
        break;
      }
      case 'getFileData': {
        const data = store.rawData || new Uint8Array(0);
        // Send the underlying ArrayBuffer for efficiency
        props.vscode.postMessage({ type: 'response', requestId: e.data.requestId, body: data.buffer }, [data.buffer]);
        break;
      }
    }
  });

  props.vscode.postMessage({ type: 'ready' });
});
</script>

<style>
/* 全局样式 */
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  /* Prevent scrollbars on the body */
  background-color: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
  font-family: var(--vscode-font-family);
  font-weight: var(--vscode-font-weight);
  font-size: var(--vscode-font-size);
}

.app-main-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  /* 防止整体滚动 */
}

.raw-image-container {
  display: flex;
  flex-direction: row;
  flex: 1;
  min-height: 0;
  /* 重要：允许flex子项收缩 */
  padding: 10px;
  padding-bottom: 0;
  /* 为状态栏留出空间 */
  box-sizing: border-box;
  gap: 15px;
}
</style>
