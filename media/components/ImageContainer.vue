<template>
  <div class="image-container">
    <canvas ref="canvas" class="raw-image-canvas" @mousemove="handleMouseMove" @mouseout="handleMouseOut"
      @mousedown="handleMouseDown" @mouseup="handleMouseUp" @wheel.prevent="handleWheel"></canvas>
    <div v-if="!ready && store.rawData" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div>处理图像中...</div>
    </div>
    <div class="zoom-controls">
      <button @click="zoomOut" title="缩小">-</button>
      <span>{{ Math.round(zoomLevel * 100) }}%</span>
      <button @click="zoomIn" title="放大">+</button>
      <button @click="resetZoom" title="重置缩放">1:1</button>
      <button @click="fitToWindow" title="适应窗口">适应</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useImageStore } from '../stores/image';
import { storeToRefs } from 'pinia';

const store = useImageStore();
const {
  width,
  height,
  bitsPerPixel,
  pixelFormat,
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

const canvas = ref(null);
let ctx = null;

const zoomLevel = ref(1);
let minZoom = 0.1;
const maxZoom = 32;

const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const imageOffset = ref({ x: 0, y: 0 });
const lastImageOffset = ref({ x: 0, y: 0 });

let originalImageData = null;

let handleGlobalMouseMove = null;
let handleGlobalKeyDown = null;
let handleGlobalResize = null;


const drawCheckerboard = (ctx, w, h, cellSize = 16) => {
  ctx.save();
  const lightColor = '#ffffff';
  const darkColor = '#cccccc';

  for (let y = 0; y < h; y += cellSize) {
    for (let x = 0; x < w; x += cellSize) {
      const isLight = ((Math.floor(x / cellSize) + Math.floor(y / cellSize)) % 2 === 0);
      ctx.fillStyle = isLight ? lightColor : darkColor;
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }
  ctx.restore();
};

const displayRawImage = async (data, imgWidth, imgHeight, bpp, format) => {
  if (!canvas.value) return;
  ready.value = false;

  setTimeout(() => {
    try {
      ctx = canvas.value.getContext('2d');
      canvas.value.width = imgWidth;
      canvas.value.height = imgHeight;
      canvasWidth.value = imgWidth;
      canvasHeight.value = imgHeight;

      drawCheckerboard(ctx, imgWidth, imgHeight);
      const imageData = ctx.createImageData(imgWidth, imgHeight);
      const pixels = imageData.data;
      const bytesPerPixelVal = Math.ceil(bpp / 8);
      const maxValue = Math.pow(2, bpp) - 1;
      let requiredBytes;
      if (format === 'rgb') {
        requiredBytes = imgWidth * imgHeight * bytesPerPixelVal * 3;
      } else {
        requiredBytes = imgWidth * imgHeight * bytesPerPixelVal;
      }

      if (data.length < requiredBytes) {
        console.error(`Not enough data. Expected ${requiredBytes} bytes, but got ${data.length} bytes.`);
        ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);
        ctx.fillStyle = '#ff0000';
        ctx.font = '16px Arial';
        ctx.fillText(`数据不足: 需要 ${requiredBytes} 字节, 实际 ${data.length} 字节`, 10, 30);
        pixelR.value = 0;
        pixelG.value = 0;
        pixelB.value = 0;
        ready.value = true;
        return;
      }

      if (format === 'rgb') {
        processRGBImage(data, pixels, imgWidth, imgHeight, bpp, bytesPerPixelVal, maxValue);
      } else if (format.includes('rggb') || format.includes('grbg') || format.includes('gbrg') || format.includes('bggr')) {
        processBayerImage(data, pixels, imgWidth, imgHeight, bpp, bytesPerPixelVal, maxValue, format);
      } else {
        processGrayscaleImage(data, pixels, imgWidth, imgHeight, bpp, bytesPerPixelVal, maxValue);
      }

      originalImageData = imageData;
      ctx.putImageData(imageData, 0, 0);
      ready.value = true;

      setTimeout(() => {
        fitToWindow();
      }, 100);

    } catch (error) {
      console.error('Error processing image:', error);
      ready.value = true;
    }
  }, 10);
};

const processGrayscaleImage = (data, pixels, imgWidth, imgHeight, bpp, bytesPerPixelVal, maxValue) => {
    for (let y = 0; y < imgHeight; y++) {
        for (let x = 0; x < imgWidth; x++) {
        const pixelIndex = (y * imgWidth + x) * bytesPerPixelVal;
        const outputIndex = (y * imgWidth + x) * 4;

        let pixelValue = 0;
        if (bpp <= 8) {
            pixelValue = data[pixelIndex] || 0;
        } else if (bpp <= 16) {
            const byte1 = data[pixelIndex] || 0;
            const byte2 = data[pixelIndex + 1] || 0;
            pixelValue = byte1 | (byte2 << 8);
            const extraBits = 16 - bpp;
            if (extraBits > 0) {
            pixelValue = pixelValue >> extraBits;
            }
        }

        const normalizedValue = Math.floor((pixelValue / maxValue) * 255);
        pixels[outputIndex] = normalizedValue;
        pixels[outputIndex + 1] = normalizedValue;
        pixels[outputIndex + 2] = normalizedValue;
        pixels[outputIndex + 3] = 255;
        }
    }
};

const processRGBImage = (data, pixels, imgWidth, imgHeight, bpp, bytesPerPixelVal, maxValue) => {
    for (let y = 0; y < imgHeight; y++) {
        for (let x = 0; x < imgWidth; x++) {
        const pixelIndex = (y * imgWidth + x) * bytesPerPixelVal * 3;
        const outputIndex = (y * imgWidth + x) * 4;

        for (let c = 0; c < 3; c++) {
            let pixelValue = 0;
            const channelIndex = pixelIndex + c * bytesPerPixelVal;

            if (bpp <= 8) {
            pixelValue = data[channelIndex] || 0;
            } else if (bpp <= 16) {
            const byte1 = data[channelIndex] || 0;
            const byte2 = data[channelIndex + 1] || 0;
            pixelValue = byte1 | (byte2 << 8);
            const extraBits = 16 - bpp;
            if (extraBits > 0) {
                pixelValue = pixelValue >> extraBits;
            }
            }

            const normalizedValue = Math.floor((pixelValue / maxValue) * 255);
            pixels[outputIndex + c] = normalizedValue;
        }
        pixels[outputIndex + 3] = 255;
        }
    }
};

const processBayerImage = (data, pixels, imgWidth, imgHeight, bpp, bytesPerPixelVal, maxValue, format) => {
  processGrayscaleImage(data, pixels, imgWidth, imgHeight, bpp, bytesPerPixelVal, maxValue);
  const tempPixels = new Uint8ClampedArray(pixels);

  for (let y = 1; y < imgHeight - 1; y++) {
    for (let x = 1; x < imgWidth - 1; x++) {
      const outputIndex = (y * imgWidth + x) * 4;
      let r = 0, g = 0, b = 0;
      const isEvenRow = y % 2 === 0;
      const isEvenCol = x % 2 === 0;

      if (format === 'rggb') {
        if (isEvenRow && isEvenCol) { // R
          r = tempPixels[outputIndex];
          g = (tempPixels[((y - 1) * imgWidth + x) * 4] + tempPixels[((y + 1) * imgWidth + x) * 4] + tempPixels[(y * imgWidth + (x - 1)) * 4] + tempPixels[(y * imgWidth + (x + 1)) * 4]) / 4;
          b = (tempPixels[((y - 1) * imgWidth + (x - 1)) * 4] + tempPixels[((y - 1) * imgWidth + (x + 1)) * 4] + tempPixels[((y + 1) * imgWidth + (x - 1)) * 4] + tempPixels[((y + 1) * imgWidth + (x + 1)) * 4]) / 4;
        } else if (isEvenRow && !isEvenCol) { // G
          g = tempPixels[outputIndex];
          r = (tempPixels[(y * imgWidth + (x - 1)) * 4] + tempPixels[(y * imgWidth + (x + 1)) * 4]) / 2;
          b = (tempPixels[((y - 1) * imgWidth + x) * 4] + tempPixels[((y + 1) * imgWidth + x) * 4]) / 2;
        } else if (!isEvenRow && isEvenCol) { // G
          g = tempPixels[outputIndex];
          r = (tempPixels[((y - 1) * imgWidth + x) * 4] + tempPixels[((y + 1) * imgWidth + x) * 4]) / 2;
          b = (tempPixels[(y * imgWidth + (x - 1)) * 4] + tempPixels[(y * imgWidth + (x + 1)) * 4]) / 2;
        } else { // B
          b = tempPixels[outputIndex];
          g = (tempPixels[((y - 1) * imgWidth + x) * 4] + tempPixels[((y + 1) * imgWidth + x) * 4] + tempPixels[(y * imgWidth + (x - 1)) * 4] + tempPixels[(y * imgWidth + (x + 1)) * 4]) / 4;
          r = (tempPixels[((y - 1) * imgWidth + (x - 1)) * 4] + tempPixels[((y - 1) * imgWidth + (x + 1)) * 4] + tempPixels[((y + 1) * imgWidth + (x - 1)) * 4] + tempPixels[((y + 1) * imgWidth + (x + 1)) * 4]) / 4;
        }
      }
      pixels[outputIndex] = Math.min(255, Math.max(0, r));
      pixels[outputIndex + 1] = Math.min(255, Math.max(0, g));
      pixels[outputIndex + 2] = Math.min(255, Math.max(0, b));
      pixels[outputIndex + 3] = 255;
    }
  }

  for (let y = 0; y < imgHeight; y++) {
    for (let x = 0; x < imgWidth; x++) {
      if (x === 0 || y === 0 || x === imgWidth - 1 || y === imgHeight - 1) {
        const outputIndex = (y * imgWidth + x) * 4;
        const nearX = Math.max(1, Math.min(imgWidth - 2, x));
        const nearY = Math.max(1, Math.min(imgHeight - 2, y));
        const nearIndex = (nearY * imgWidth + nearX) * 4;
        
        pixels[outputIndex] = pixels[nearIndex];
        pixels[outputIndex + 1] = pixels[nearIndex + 1];
        pixels[outputIndex + 2] = pixels[nearIndex + 2];
      }
    }
  }
};

const updateImagePosition = () => {
  if (!canvas.value) return;
  // Use transform for panning
  const canvasEl = canvas.value;
  canvasEl.style.transform = `translate(${imageOffset.value.x}px, ${imageOffset.value.y}px) scale(${zoomLevel.value})`;
};

const drawZoomed = () => {
  if (!canvas.value || !ctx) return;
  const canvasEl = canvas.value;
  
  // We now control scale via transform, so canvas width/height is static
  canvasEl.style.width = width.value + 'px';
  canvasEl.style.height = height.value + 'px';
  
  canvasEl.style.imageRendering = 'pixelated';
  canvasEl.style.cursor = zoomLevel.value > 1 ? 'grab' : 'default';
  updateImagePosition();
};


const handleMouseMove = (event) => {
  if (!canvas.value || !ready.value) return;
  if (isDragging.value) {
    handleDragMove(event);
    return;
  }
  
  // Correctly calculate mouse position on the original image
  const rect = canvas.value.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) / zoomLevel.value);
  const y = Math.floor((event.clientY - rect.top) / zoomLevel.value);

  cursorX.value = x;
  cursorY.value = y;

  if (x >= 0 && x < width.value && y >= 0 && y < height.value && originalImageData) {
    const pixelIndex = (y * width.value + x) * 4;
    pixelR.value = originalImageData.data[pixelIndex];
    pixelG.value = originalImageData.data[pixelIndex + 1];
    pixelB.value = originalImageData.data[pixelIndex + 2];
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
  if (event.button === 0) { // Pan with left click
    isDragging.value = true;
    dragStart.value = { x: event.clientX, y: event.clientY };
    lastImageOffset.value = { ...imageOffset.value };
    if (canvas.value) {
      canvas.value.style.cursor = 'grabbing';
    }
    event.preventDefault();
  }
};

const handleMouseUp = () => {
  if (isDragging.value) {
    isDragging.value = false;
    if (canvas.value) {
      canvas.value.style.cursor = 'grab';
    }
  }
};

const constrainImageOffset = (offset) => {
  // This logic might need adjustment depending on desired behavior at edges
  return offset;
};

const handleDragMove = (event) => {
  if (!isDragging.value) return;

  const deltaX = event.clientX - dragStart.value.x;
  const deltaY = event.clientY - dragStart.value.y;
  
  // No need to divide by zoomLevel here as we are moving the canvas itself
  const newOffset = {
    x: lastImageOffset.value.x + deltaX,
    y: lastImageOffset.value.y + deltaY
  };

  imageOffset.value = constrainImageOffset(newOffset);
  updateImagePosition();
  event.preventDefault();
};

const zoom = (factor) => {
  const oldZoom = zoomLevel.value;
  const newZoom = Math.max(minZoom, Math.min(maxZoom, oldZoom * factor));
  if (newZoom === oldZoom) return;

  // Center zoom on the view center for button clicks
  const centerX = canvas.value.parentElement.clientWidth / 2;
  const centerY = canvas.value.parentElement.clientHeight / 2;
  
  const newOffsetX = imageOffset.value.x - (centerX / oldZoom - centerX / newZoom) * newZoom;
  const newOffsetY = imageOffset.value.y - (centerY / oldZoom - centerY / newZoom) * newZoom;

  zoomLevel.value = newZoom;
  imageOffset.value = constrainImageOffset({ x: newOffsetX, y: newOffsetY });
  updateImagePosition();
}

const zoomIn = () => zoom(1.5);
const zoomOut = () => zoom(0.75);


const resetZoom = () => {
  zoomLevel.value = 1;
  imageOffset.value = { x: 0, y: 0 };
  fitToWindow();
};

const fitToWindow = () => {
  if (!canvas.value || !width.value || !height.value) return;
  const container = canvas.value.parentElement;
  if (!container) return;

  const containerRect = container.getBoundingClientRect();
  const scaleX = containerRect.width / width.value;
  const scaleY = containerRect.height / height.value;
  const fitScale = Math.min(scaleX, scaleY) * 0.95; // 5% padding

  minZoom = Math.max(0.05, fitScale * 0.5);
  zoomLevel.value = fitScale;
  
  // Center the image
  const newWidth = width.value * zoomLevel.value;
  const newHeight = height.value * zoomLevel.value;
  imageOffset.value = {
      x: (containerRect.width - newWidth) / 2,
      y: (containerRect.height - newHeight) / 2
  };

  updateImagePosition();
};

const handleWheel = (event) => {
  const oldZoom = zoomLevel.value;
  const newZoom = Math.max(minZoom, Math.min(maxZoom, oldZoom * (event.deltaY < 0 ? 1.2 : 0.8)));
  if (newZoom === oldZoom) return;

  const rect = canvas.value.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  const newOffsetX = imageOffset.value.x - (mouseX / oldZoom - mouseX / newZoom) * newZoom;
  const newOffsetY = imageOffset.value.y - (mouseY / oldZoom - mouseY / newZoom) * newZoom;

  zoomLevel.value = newZoom;
  imageOffset.value = constrainImageOffset({ x: newOffsetX, y: newOffsetY });
  updateImagePosition();
};

onMounted(() => {
  ctx = canvas.value.getContext('2d');
  canvas.value.style.transformOrigin = 'top left';

  window.addEventListener('mouseup', handleMouseUp);
  handleGlobalMouseMove = (e) => isDragging.value && handleDragMove(e);
  window.addEventListener('mousemove', handleGlobalMouseMove);

  handleGlobalKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case '=': case '+': e.preventDefault(); zoomIn(); break;
        case '-': e.preventDefault(); zoomOut(); break;
        case '0': e.preventDefault(); resetZoom(); break;
      }
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
});

defineExpose({ displayRawImage });
</script>

<style scoped>
.image-container {
  flex: 1;
  min-height: 0;
  display: flex;
  /* justify-content and align-items are no longer needed as we control position with transform */
  overflow: hidden;
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-editorWidget-border);
  border-radius: 4px;
  position: relative;
}

.raw-image-canvas {
  /* max-width and max-height are removed */
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
  user-select: none;
  -webkit-user-select: none;
  transition: cursor 0.1s ease;
  /* Position is controlled by transform now */
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
