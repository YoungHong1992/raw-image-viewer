<template>
  <div class="app-main-layout">
    <div class="raw-image-container">
      <div class="controls-panel">
        <!-- 预设分辨率选择 -->
        <div class="preset-section">
          <h3>常用分辨率预设</h3>
          <div class="preset-buttons">
            <button
              v-for="preset in commonResolutions"
              :key="`${preset.width}x${preset.height}`"
              @click="applyPreset(preset)"
              class="preset-btn"
              :class="{ active: width === preset.width && height === preset.height }"
            >
              {{ preset.name }} ({{ preset.width }}×{{ preset.height }})
            </button>
          </div>
        </div>

        <!-- 智能推荐 -->
        <div class="recommendation-section" v-if="fileSize > 0">
          <h3>智能推荐 (文件大小: {{ formatFileSize(fileSize) }})</h3>
          <div class="recommendation-list">
            <div
              v-for="rec in recommendations"
              :key="`${rec.width}x${rec.height}x${rec.bits}`"
              @click="applyRecommendation(rec)"
              class="recommendation-item"
              :class="{ active: width === rec.width && height === rec.height && bitsPerPixel === rec.bits }"
            >
              <span class="rec-resolution">{{ rec.width }}×{{ rec.height }}</span>
              <span class="rec-bits">{{ rec.bits }}bit</span>
              <span class="rec-match">{{ rec.exactMatch ? '精确匹配' : '近似匹配' }}</span>
            </div>
          </div>
        </div>

        <!-- 手动参数设置 -->
        <div class="manual-params-section">
          <h3>手动设置</h3>
          <div class="image-params-form">
            <div class="form-group">
              <label for="image-width">宽度:</label>
              <input type="number" id="image-width" v-model.number="width" min="1" />
            </div>
            <div class="form-group">
              <label for="image-height">高度:</label>
              <input type="number" id="image-height" v-model.number="height" min="1" />
            </div>
            <div class="form-group">
              <label for="bits-per-pixel">每像素位数:</label>
              <select id="bits-per-pixel" v-model.number="bitsPerPixel">
                <option v-for="bits in availableBits" :key="bits" :value="bits">{{ bits }} bit</option>
              </select>
            </div>
            <div class="form-group">
              <label for="pixel-format">像素格式:</label>
              <select id="pixel-format" v-model="pixelFormat">
                <option value="grayscale">灰度</option>
                <option value="rgb">RGB</option>
                <option value="rggb">RGGB (Bayer)</option>
                <option value="grbg">GRBG (Bayer)</option>
                <option value="gbrg">GBRG (Bayer)</option>
                <option value="bggr">BGGR (Bayer)</option>
              </select>
            </div>
            <button id="apply-params-btn" @click="applyParams">应用参数</button>
          </div>
        </div>
      </div>

      <div class="image-container">
        <canvas ref="canvas" class="raw-image-canvas" @mousemove="handleMouseMove" @mouseout="handleMouseOut"></canvas>
        <div v-if="!ready && rawData" class="loading-overlay">
          <div class="loading-spinner"></div>
          <div>处理图像中...</div>
        </div>
      </div>
    </div>
    <div class="status-bar">
      <div class="status-bar-item" id="image-size">图像尺寸: {{ canvasWidth }}×{{ canvasHeight }}</div>
      <div class="status-bar-item" id="pixel-info">像素: ({{ pixelR }}, {{ pixelG }}, {{ pixelB }})</div>
      <div class="status-bar-item" id="cursor-pos">坐标: ({{ cursorX }}, {{ cursorY }})</div>
      <div class="status-bar-item" id="file-info">文件: {{ formatFileSize(fileSize) }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';

const props = defineProps({
  vscode: Object
});

const canvas = ref(null);
let ctx = null;
const rawData = ref(null);
const ready = ref(false);
const fileSize = ref(0);

const width = ref(2688);
const height = ref(1520);
const bitsPerPixel = ref(10);
const pixelFormat = ref('grayscale');

const canvasWidth = ref(0);
const canvasHeight = ref(0);
const pixelR = ref(0);
const pixelG = ref(0);
const pixelB = ref(0);
const cursorX = ref(0);
const cursorY = ref(0);

// 常用分辨率预设
const commonResolutions = ref([
  { name: 'VGA', width: 640, height: 480 },
  { name: 'HD', width: 1280, height: 720 },
  { name: 'Full HD', width: 1920, height: 1080 },
  { name: '4K UHD', width: 3840, height: 2160 },
  { name: '8K UHD', width: 7680, height: 4320 },
  { name: 'QVGA', width: 320, height: 240 },
  { name: 'SVGA', width: 800, height: 600 },
  { name: 'XGA', width: 1024, height: 768 },
  { name: 'SXGA', width: 1280, height: 1024 },
  { name: 'UXGA', width: 1600, height: 1200 },
  { name: '2K', width: 2048, height: 1080 },
  { name: 'Cinema 4K', width: 4096, height: 2160 },
  // 常见相机分辨率
  { name: '5MP', width: 2592, height: 1944 },
  { name: '8MP', width: 3264, height: 2448 },
  { name: '12MP', width: 4000, height: 3000 },
  { name: '16MP', width: 4920, height: 3264 },
  { name: '20MP', width: 5184, height: 3888 },
  // 常见工业相机分辨率
  { name: 'IMX290', width: 1920, height: 1080 },
  { name: 'IMX385', width: 1920, height: 1080 },
  { name: 'IMX462', width: 1920, height: 1080 },
  { name: 'IMX464', width: 2688, height: 1520 },
  { name: 'IMX678', width: 3840, height: 2160 },
]);

// 可用位深选项
const availableBits = ref([8, 10, 12, 14, 16]);

// 智能推荐计算
const recommendations = computed(() => {
  if (fileSize.value === 0) return [];

  const recs = [];
  const fileSizeBytes = fileSize.value;

  // 遍历常见分辨率和位深组合
  for (const resolution of commonResolutions.value) {
    for (const bits of availableBits.value) {
      const bytesPerPixel = Math.ceil(bits / 8);
      const expectedSize = resolution.width * resolution.height * bytesPerPixel;

      // 检查是否匹配（允许一定误差）
      const tolerance = 0.05; // 5%误差
      const minSize = expectedSize * (1 - tolerance);
      const maxSize = expectedSize * (1 + tolerance);

      if (fileSizeBytes >= minSize && fileSizeBytes <= maxSize) {
        recs.push({
          width: resolution.width,
          height: resolution.height,
          bits: bits,
          name: resolution.name,
          exactMatch: fileSizeBytes === expectedSize,
          sizeDiff: Math.abs(fileSizeBytes - expectedSize)
        });
      }
    }
  }

  // 按匹配度排序（精确匹配优先，然后按大小差异排序）
  return recs.sort((a, b) => {
    if (a.exactMatch && !b.exactMatch) return -1;
    if (!a.exactMatch && b.exactMatch) return 1;
    return a.sizeDiff - b.sizeDiff;
  }).slice(0, 10); // 只显示前10个推荐
});

// 格式化文件大小显示
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 应用预设分辨率
const applyPreset = (preset) => {
  width.value = preset.width;
  height.value = preset.height;
  applyParams();
};

// 应用推荐设置
const applyRecommendation = (rec) => {
  width.value = rec.width;
  height.value = rec.height;
  bitsPerPixel.value = rec.bits;
  applyParams();
};

const displayRawImage = async (data, imgWidth, imgHeight, bpp, format = 'grayscale') => {
  if (!canvas.value) return;
  ready.value = false;

  // 使用setTimeout让UI有机会更新loading状态
  setTimeout(() => {
    try {
      ctx = canvas.value.getContext('2d');

      canvas.value.width = imgWidth;
      canvas.value.height = imgHeight;
      canvasWidth.value = imgWidth;
      canvasHeight.value = imgHeight;

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

        // 显示错误信息
        ctx.fillStyle = '#ff0000';
        ctx.font = '16px Arial';
        ctx.fillText(`数据不足: 需要 ${requiredBytes} 字节, 实际 ${data.length} 字节`, 10, 30);

        pixelR.value = 0;
        pixelG.value = 0;
        pixelB.value = 0;
        ready.value = true;
        return;
      }

      // 根据像素格式处理图像
      if (format === 'rgb') {
        processRGBImage(data, pixels, imgWidth, imgHeight, bpp, bytesPerPixelVal, maxValue);
      } else if (format.includes('rggb') || format.includes('grbg') || format.includes('gbrg') || format.includes('bggr')) {
        processBayerImage(data, pixels, imgWidth, imgHeight, bpp, bytesPerPixelVal, maxValue, format);
      } else {
        processGrayscaleImage(data, pixels, imgWidth, imgHeight, bpp, bytesPerPixelVal, maxValue);
      }

      ctx.putImageData(imageData, 0, 0);
      ready.value = true;
    } catch (error) {
      console.error('Error processing image:', error);
      ready.value = true;
    }
  }, 10);
};

// 处理灰度图像
const processGrayscaleImage = (data, pixels, imgWidth, imgHeight, bpp, bytesPerPixelVal, maxValue) => {
  for (let y = 0; y < imgHeight; y++) {
    for (let x = 0; x < imgWidth; x++) {
      const pixelIndex = (y * imgWidth + x) * bytesPerPixelVal;
      const outputIndex = (y * imgWidth + x) * 4;
      let pixelValue = 0;

      if (bpp <= 8) {
        pixelValue = data[pixelIndex];
      } else if (bpp <= 16) {
        pixelValue = data[pixelIndex] | (data[pixelIndex + 1] << 8);
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

// 处理RGB图像
const processRGBImage = (data, pixels, imgWidth, imgHeight, bpp, bytesPerPixelVal, maxValue) => {
  for (let y = 0; y < imgHeight; y++) {
    for (let x = 0; x < imgWidth; x++) {
      const pixelIndex = (y * imgWidth + x) * bytesPerPixelVal * 3;
      const outputIndex = (y * imgWidth + x) * 4;

      let rValue = 0, gValue = 0, bValue = 0;

      if (bpp <= 8) {
        rValue = data[pixelIndex];
        gValue = data[pixelIndex + bytesPerPixelVal];
        bValue = data[pixelIndex + bytesPerPixelVal * 2];
      } else if (bpp <= 16) {
        rValue = data[pixelIndex] | (data[pixelIndex + 1] << 8);
        gValue = data[pixelIndex + bytesPerPixelVal] | (data[pixelIndex + bytesPerPixelVal + 1] << 8);
        bValue = data[pixelIndex + bytesPerPixelVal * 2] | (data[pixelIndex + bytesPerPixelVal * 2 + 1] << 8);

        const extraBits = 16 - bpp;
        if (extraBits > 0) {
          rValue = rValue >> extraBits;
          gValue = gValue >> extraBits;
          bValue = bValue >> extraBits;
        }
      }

      pixels[outputIndex] = Math.floor((rValue / maxValue) * 255);
      pixels[outputIndex + 1] = Math.floor((gValue / maxValue) * 255);
      pixels[outputIndex + 2] = Math.floor((bValue / maxValue) * 255);
      pixels[outputIndex + 3] = 255;
    }
  }
};

// 处理Bayer图像（简单的去马赛克算法）
const processBayerImage = (data, pixels, imgWidth, imgHeight, bpp, bytesPerPixelVal, maxValue, pattern) => {
  // 简单的双线性插值去马赛克
  const bayerPattern = getBayerPattern(pattern);

  for (let y = 0; y < imgHeight; y++) {
    for (let x = 0; x < imgWidth; x++) {
      const pixelIndex = (y * imgWidth + x) * bytesPerPixelVal;
      const outputIndex = (y * imgWidth + x) * 4;

      let pixelValue = 0;
      if (bpp <= 8) {
        pixelValue = data[pixelIndex];
      } else if (bpp <= 16) {
        pixelValue = data[pixelIndex] | (data[pixelIndex + 1] << 8);
        const extraBits = 16 - bpp;
        if (extraBits > 0) {
          pixelValue = pixelValue >> extraBits;
        }
      }

      const normalizedValue = Math.floor((pixelValue / maxValue) * 255);
      const colorChannel = bayerPattern[y % 2][x % 2];

      // 简单处理：将Bayer值分配到对应颜色通道
      if (colorChannel === 'R') {
        pixels[outputIndex] = normalizedValue;     // R
        pixels[outputIndex + 1] = normalizedValue * 0.5; // G
        pixels[outputIndex + 2] = normalizedValue * 0.3; // B
      } else if (colorChannel === 'G') {
        pixels[outputIndex] = normalizedValue * 0.3;     // R
        pixels[outputIndex + 1] = normalizedValue;       // G
        pixels[outputIndex + 2] = normalizedValue * 0.3; // B
      } else if (colorChannel === 'B') {
        pixels[outputIndex] = normalizedValue * 0.3;     // R
        pixels[outputIndex + 1] = normalizedValue * 0.5; // G
        pixels[outputIndex + 2] = normalizedValue;       // B
      }
      pixels[outputIndex + 3] = 255; // Alpha
    }
  }
};

// 获取Bayer模式
const getBayerPattern = (pattern) => {
  switch (pattern.toLowerCase()) {
    case 'rggb':
      return [['R', 'G'], ['G', 'B']];
    case 'grbg':
      return [['G', 'R'], ['B', 'G']];
    case 'gbrg':
      return [['G', 'B'], ['R', 'G']];
    case 'bggr':
      return [['B', 'G'], ['G', 'R']];
    default:
      return [['R', 'G'], ['G', 'B']]; // 默认RGGB
  }
};

const applyParams = () => {
  if (rawData.value) {
    displayRawImage(rawData.value, width.value, height.value, bitsPerPixel.value, pixelFormat.value);
  }
};

const handleMouseMove = (event) => {
  if (!ready.value || !rawData.value || !canvas.value) return;

  const rect = canvas.value.getBoundingClientRect();
  const scaleX = canvas.value.width / rect.width;
  const scaleY = canvas.value.height / rect.height;

  const x = Math.floor((event.clientX - rect.left) * scaleX);
  const y = Math.floor((event.clientY - rect.top) * scaleY);

  cursorX.value = x;
  cursorY.value = y;

  if (x >= 0 && x < canvas.value.width && y >= 0 && y < canvas.value.height) {
    const pixelData = ctx.getImageData(x, y, 1, 1).data;
    pixelR.value = pixelData[0];
    pixelG.value = pixelData[1];
    pixelB.value = pixelData[2];
  } else {
    pixelR.value = 0;
    pixelG.value = 0;
    pixelB.value = 0;
  }
};

const handleMouseOut = () => {
  cursorX.value = 0;
  cursorY.value = 0;
  pixelR.value = 0;
  pixelG.value = 0;
  pixelB.value = 0;
};

onMounted(() => {
  ctx = canvas.value.getContext('2d');

  window.addEventListener('message', async e => {
    const { type, body } = e.data;
    switch (type) {
      case 'init': {
        if (body.value) {
          rawData.value = new Uint8Array(body.value);
          fileSize.value = rawData.value.length;

          // 如果有推荐的设置，自动应用第一个推荐
          if (recommendations.value.length > 0) {
            const bestRec = recommendations.value[0];
            width.value = bestRec.width;
            height.value = bestRec.height;
            bitsPerPixel.value = bestRec.bits;
          }

          // 显示图像
          if (rawData.value && rawData.value.length > 0) {
             applyParams();
          }
        }
        break;
      }
      case 'getFileData': {
        const data = rawData.value || new Uint8Array(0);
        props.vscode.postMessage({ type: 'response', requestId: e.data.requestId, body: Array.from(data) });
        break;
      }
    }
  });

  props.vscode.postMessage({ type: 'ready' });
});

</script>

<style>
/* Styles from rawImage.css and vscode.css can be scoped here or globally */
body {
  margin: 0;
  padding: 0;
  overflow: hidden; /* Prevent scrollbars on the body */
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
}

.raw-image-container {
  display: flex;
  flex-direction: row;
  flex-grow: 1;
  padding: 10px;
  box-sizing: border-box;
  gap: 15px;
}

.controls-panel {
  width: 350px;
  min-width: 350px;
  background-color: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-sideBar-border);
  border-radius: 4px;
  padding: 15px;
  overflow-y: auto;
  max-height: calc(100vh - 80px);
}

.controls-panel h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-foreground);
  border-bottom: 1px solid var(--vscode-sideBar-border);
  padding-bottom: 5px;
}

.preset-section, .recommendation-section, .manual-params-section {
  margin-bottom: 20px;
}

.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.preset-btn {
  padding: 4px 8px;
  font-size: 11px;
  background-color: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: 1px solid var(--vscode-button-border);
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.preset-btn:hover {
  background-color: var(--vscode-button-secondaryHoverBackground);
}

.preset-btn.active {
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.recommendation-list {
  max-height: 200px;
  overflow-y: auto;
}

.recommendation-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  margin-bottom: 4px;
  background-color: var(--vscode-list-inactiveSelectionBackground);
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
}

.recommendation-item:hover {
  background-color: var(--vscode-list-hoverBackground);
}

.recommendation-item.active {
  background-color: var(--vscode-list-activeSelectionBackground);
  color: var(--vscode-list-activeSelectionForeground);
}

.rec-resolution {
  font-weight: 600;
  min-width: 80px;
}

.rec-bits {
  color: var(--vscode-descriptionForeground);
  min-width: 40px;
}

.rec-match {
  font-size: 10px;
  color: var(--vscode-descriptionForeground);
  font-style: italic;
}

.status-bar {
  height: 30px;
  background-color: var(--vscode-statusBar-background);
  color: var(--vscode-statusBar-foreground);
  width: 100%;
  display: flex;
  align-items: center;
  padding: 0 10px;
  gap: 20px;
  font-size: 12px;
}

.image-params-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 12px;
  font-weight: 500;
  color: var(--vscode-foreground);
}

.form-group input[type="number"], .form-group select {
  padding: 6px 8px;
  border: 1px solid var(--vscode-input-border);
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border-radius: 3px;
  font-size: 12px;
}

.form-group input[type="number"]:focus, .form-group select:focus {
  outline: none;
  border-color: var(--vscode-focusBorder);
}

#apply-params-btn {
  padding: 8px 16px;
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: 1px solid var(--vscode-button-border, transparent);
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  margin-top: 10px;
}

#apply-params-btn:hover {
  background-color: var(--vscode-button-hoverBackground);
}

.image-container {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto;
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-editorWidget-border);
  border-radius: 4px;
  min-height: 200px;
  position: relative;
}

.raw-image-canvas {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
  border-radius: 2px;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: var(--vscode-foreground);
  font-size: 14px;
  z-index: 10;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--vscode-progressBar-background);
  border-top: 3px solid var(--vscode-button-background);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.status-bar-item {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
</style>