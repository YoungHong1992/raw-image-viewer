<template>
  <div class="image-container">
    <canvas
      ref="canvas"
      class="raw-image-canvas"
      @mousemove="handleMouseMove"
      @mouseout="handleMouseOut"
      @mousedown="handleMouseDown"
      @mouseup="handleMouseUp"
      @wheel.prevent="handleWheel"
    ></canvas>
    <div v-if="!ready && store.rawData" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div>{{ t('viewer.processing') }}</div>
    </div>
    <div class="zoom-controls">
      <button @click="zoomOut" :title="t('viewer.zoomOut')">-</button>
      <span>{{ Math.round(zoomLevel * 100) }}%</span>
      <button @click="zoomIn" :title="t('viewer.zoomIn')">+</button>
      <button @click="resetZoom" :title="t('viewer.resetZoom')">1:1</button>
      <button @click="fitToWindow" :title="t('viewer.fitToWindow')">{{ t('viewer.fit') }}</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useImageStore } from '../../stores/image';
import { renderRawImage } from '../../../../src/shared/imageProcessing';

const store = useImageStore();
const {
  width,
  height,
  rawData,
  ready,
  cursorX,
  cursorY,
  pixelR,
  pixelG,
  pixelB,
  canvasWidth,
  canvasHeight
} = storeToRefs(store);

const t = (key, params) => store.t(key, params);

const canvas = ref(null);
let ctx = null;

const zoomLevel = ref(1);
let minZoom = 0.1;
const maxZoom = 32;

const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const imageOffset = ref({ x: 0, y: 0 });
const lastImageOffset = ref({ x: 0, y: 0 });

let renderedPixels = null;
let handleGlobalMouseMove = null;
let handleGlobalKeyDown = null;
let handleGlobalResize = null;

const updateImagePosition = () => {
  if (!canvas.value) return;
  canvas.value.style.transform = `translate(${imageOffset.value.x}px, ${imageOffset.value.y}px) scale(${zoomLevel.value})`;
};

const displayRawImage = async (data, imgWidth, imgHeight, bitsPerPixel, pixelFormat, storageMode) => {
  if (!canvas.value) return;
  ready.value = false;
  renderedPixels = null;

  setTimeout(() => {
    try {
      if (!data || imgWidth <= 0 || imgHeight <= 0 || bitsPerPixel <= 0) {
        throw new Error(t('viewer.errors.invalidImageParams'));
      }

      const maxPixels = 50 * 1024 * 1024;
      if (imgWidth * imgHeight > maxPixels) {
        throw new Error(t('viewer.errors.imageTooLarge', { width: imgWidth, height: imgHeight }));
      }

      ctx = canvas.value.getContext('2d');
      canvas.value.width = imgWidth;
      canvas.value.height = imgHeight;
      canvasWidth.value = imgWidth;
      canvasHeight.value = imgHeight;

      const imageData = ctx.createImageData(imgWidth, imgHeight);
      renderedPixels = renderRawImage(data, {
        width: imgWidth,
        height: imgHeight,
        bitsPerPixel,
        pixelFormat,
        storageMode
      });

      imageData.data.set(renderedPixels);
      ctx.putImageData(imageData, 0, 0);
      ready.value = true;

      setTimeout(() => {
        fitToWindow();
      }, 10);
    } catch (error) {
      console.error(t('viewer.errors.processingError'), error);
      pixelR.value = 0;
      pixelG.value = 0;
      pixelB.value = 0;
      ready.value = true;
    }
  }, 10);
};

const handleMouseMove = (event) => {
  if (!canvas.value || !ready.value) return;

  if (isDragging.value) {
    handleDragMove(event);
    return;
  }

  const rect = canvas.value.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) / zoomLevel.value);
  const y = Math.floor((event.clientY - rect.top) / zoomLevel.value);

  cursorX.value = x;
  cursorY.value = y;

  if (x >= 0 && x < width.value && y >= 0 && y < height.value && renderedPixels) {
    const pixelIndex = (y * width.value + x) * 4;
    pixelR.value = renderedPixels[pixelIndex];
    pixelG.value = renderedPixels[pixelIndex + 1];
    pixelB.value = renderedPixels[pixelIndex + 2];
  }
};

const handleMouseOut = () => {
  cursorX.value = -1;
  cursorY.value = -1;
  pixelR.value = 0;
  pixelG.value = 0;
  pixelB.value = 0;
};

const handleMouseDown = (event) => {
  if (event.button !== 0) {
    return;
  }

  isDragging.value = true;
  dragStart.value = { x: event.clientX, y: event.clientY };
  lastImageOffset.value = { ...imageOffset.value };

  if (canvas.value) {
    canvas.value.style.cursor = 'grabbing';
  }

  event.preventDefault();
};

const handleMouseUp = () => {
  if (!isDragging.value) {
    return;
  }

  isDragging.value = false;
  if (canvas.value) {
    canvas.value.style.cursor = 'grab';
  }
};

const handleDragMove = (event) => {
  if (!isDragging.value) return;

  const deltaX = event.clientX - dragStart.value.x;
  const deltaY = event.clientY - dragStart.value.y;

  imageOffset.value = {
    x: lastImageOffset.value.x + deltaX,
    y: lastImageOffset.value.y + deltaY
  };
  updateImagePosition();
  event.preventDefault();
};

const zoom = (factor) => {
  const oldZoom = zoomLevel.value;
  const newZoom = Math.max(minZoom, Math.min(maxZoom, oldZoom * factor));
  if (newZoom === oldZoom || !canvas.value) return;

  const container = canvas.value.parentElement;
  const centerX = container.clientWidth / 2;
  const centerY = container.clientHeight / 2;

  imageOffset.value = {
    x: imageOffset.value.x - (centerX / oldZoom - centerX / newZoom) * newZoom,
    y: imageOffset.value.y - (centerY / oldZoom - centerY / newZoom) * newZoom
  };
  zoomLevel.value = newZoom;
  updateImagePosition();
};

const zoomIn = () => zoom(1.5);
const zoomOut = () => zoom(0.75);

const centerImage = () => {
  if (!canvas.value || !width.value || !height.value) return;
  const container = canvas.value.parentElement;
  if (!container) return;

  const containerRect = container.getBoundingClientRect();
  imageOffset.value = {
    x: (containerRect.width - width.value * zoomLevel.value) / 2,
    y: (containerRect.height - height.value * zoomLevel.value) / 2
  };
  updateImagePosition();
};

const resetZoom = () => {
  zoomLevel.value = 1;
  centerImage();
};

const fitToWindow = () => {
  if (!canvas.value || !width.value || !height.value) return;
  const container = canvas.value.parentElement;
  if (!container) return;

  const containerRect = container.getBoundingClientRect();
  const scaleX = containerRect.width / width.value;
  const scaleY = containerRect.height / height.value;
  const fitScale = Math.min(scaleX, scaleY) * 0.95;

  // The zoom range must always contain 1:1, otherwise "1:1" gets clamped back
  // to fitScale for very small images.
  minZoom = Math.max(0.05, Math.min(1, fitScale * 0.5));
  zoomLevel.value = Math.max(minZoom, Math.min(maxZoom, fitScale));
  centerImage();
};

const handleWheel = (event) => {
  if (!canvas.value) return;

  const oldZoom = zoomLevel.value;
  const newZoom = Math.max(minZoom, Math.min(maxZoom, oldZoom * (event.deltaY < 0 ? 1.2 : 0.8)));
  if (newZoom === oldZoom) return;

  const rect = canvas.value.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  imageOffset.value = {
    x: imageOffset.value.x - (mouseX / oldZoom - mouseX / newZoom) * newZoom,
    y: imageOffset.value.y - (mouseY / oldZoom - mouseY / newZoom) * newZoom
  };
  zoomLevel.value = newZoom;
  updateImagePosition();
};

onMounted(() => {
  ctx = canvas.value.getContext('2d');
  canvas.value.style.transformOrigin = 'top left';

  window.addEventListener('mouseup', handleMouseUp);
  handleGlobalMouseMove = event => isDragging.value && handleDragMove(event);
  window.addEventListener('mousemove', handleGlobalMouseMove);

  handleGlobalKeyDown = (event) => {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    switch (event.key) {
      case '=':
      case '+':
        event.preventDefault();
        zoomIn();
        break;
      case '-':
        event.preventDefault();
        zoomOut();
        break;
      case '0':
        event.preventDefault();
        resetZoom();
        break;
    }
  };
  window.addEventListener('keydown', handleGlobalKeyDown);

  handleGlobalResize = () => {
    if (canvas.value && width.value > 0 && height.value > 0) {
      setTimeout(() => fitToWindow(), 100);
    }
  };
  window.addEventListener('resize', handleGlobalResize);
});

onUnmounted(() => {
  window.removeEventListener('mouseup', handleMouseUp);
  if (handleGlobalMouseMove) {
    window.removeEventListener('mousemove', handleGlobalMouseMove);
  }
  if (handleGlobalKeyDown) {
    window.removeEventListener('keydown', handleGlobalKeyDown);
  }
  if (handleGlobalResize) {
    window.removeEventListener('resize', handleGlobalResize);
  }

  renderedPixels = null;

  if (ctx && canvas.value) {
    ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);
    ctx = null;
  }
});

defineExpose({ displayRawImage });
</script>

<style scoped>
.image-container {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-editorWidget-border);
  border-radius: 4px;
  position: relative;
}

.raw-image-canvas {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
  user-select: none;
  -webkit-user-select: none;
  transition: cursor 0.1s ease;
  position: absolute;
}

.zoom-controls {
  position: absolute;
  right: 20px;
  top: 20px;
  background: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-sideBar-border);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  z-index: 20;
  font-size: 12px;
  color: var(--vscode-foreground);
}

.zoom-controls button {
  min-width: 28px;
  height: 24px;
  font-size: 12px;
  border: 1px solid var(--vscode-button-border);
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.2s;
  padding: 2px 6px;
}

.zoom-controls button:hover {
  background: var(--vscode-button-secondaryHoverBackground);
}

.zoom-controls span {
  min-width: 40px;
  text-align: center;
  font-weight: 500;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  z-index: 10;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
