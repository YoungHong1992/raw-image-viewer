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
        <canvas ref="canvas" class="raw-image-canvas"
                @mousemove="handleMouseMove"
                @mouseout="handleMouseOut"
                @mousedown="handleMouseDown"
                @mouseup="handleMouseUp"
                @wheel="handleWheel"></canvas>
        <div v-if="!ready && rawData" class="loading-overlay">
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

// 拖拽相关状态
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const imageOffset = ref({ x: 0, y: 0 });
const lastImageOffset = ref({ x: 0, y: 0 });

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

const zoomLevel = ref(1);
let minZoom = 0.1; // 动态计算的最小缩放
const maxZoom = 32;

// 存储原始图像数据用于缩放
let originalImageData = null;

// 改进的透明格子背景绘制函数，类似Photoshop
const drawCheckerboard = (ctx, width, height, cellSize = 16) => {
  ctx.save();
  // 使用更接近Photoshop的颜色
  const lightColor = '#ffffff';
  const darkColor = '#cccccc';

  for (let y = 0; y < height; y += cellSize) {
    for (let x = 0; x < width; x += cellSize) {
      const isLight = ((Math.floor(x / cellSize) + Math.floor(y / cellSize)) % 2 === 0);
      ctx.fillStyle = isLight ? lightColor : darkColor;
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }
  ctx.restore();
};

const displayRawImage = async (data, imgWidth, imgHeight, bpp, format = 'grayscale') => {
  if (!canvas.value) return;
  ready.value = false;

  // 使用setTimeout让UI有机会更新loading状态
  setTimeout(() => {
    try {
      ctx = canvas.value.getContext('2d');
      // 设置canvas实际像素尺寸
      canvas.value.width = imgWidth;
      canvas.value.height = imgHeight;
      canvasWidth.value = imgWidth;
      canvasHeight.value = imgHeight;
      // 绘制透明格子背景
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

      // 保存原始图像数据用于鼠标坐标计算
      originalImageData = imageData;

      ctx.putImageData(imageData, 0, 0);
      ready.value = true;

      // 初始化时计算合适的最小缩放值
      setTimeout(() => {
        fitToWindow();
      }, 100);

      drawZoomed();
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
      pixels[outputIndex] = normalizedValue;     // R
      pixels[outputIndex + 1] = normalizedValue; // G
      pixels[outputIndex + 2] = normalizedValue; // B
      pixels[outputIndex + 3] = 255;             // A
    }
  }
};

// 处理RGB图像
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
      pixels[outputIndex + 3] = 255; // A
    }
  }
};

// 处理Bayer图像（简单去马赛克）
const processBayerImage = (data, pixels, imgWidth, imgHeight, bpp, bytesPerPixelVal, maxValue, format) => {
  // 首先处理为灰度图像
  processGrayscaleImage(data, pixels, imgWidth, imgHeight, bpp, bytesPerPixelVal, maxValue);

  // 简单的Bayer去马赛克算法
  const tempPixels = new Uint8ClampedArray(pixels);

  for (let y = 1; y < imgHeight - 1; y++) {
    for (let x = 1; x < imgWidth - 1; x++) {
      const outputIndex = (y * imgWidth + x) * 4;
      let r = 0, g = 0, b = 0;

      // 根据Bayer模式确定当前像素的颜色
      const isEvenRow = y % 2 === 0;
      const isEvenCol = x % 2 === 0;

      if (format === 'rggb') {
        if (isEvenRow && isEvenCol) { // R
          r = tempPixels[outputIndex];
          g = (tempPixels[((y-1) * imgWidth + x) * 4] + tempPixels[((y+1) * imgWidth + x) * 4] +
               tempPixels[(y * imgWidth + (x-1)) * 4] + tempPixels[(y * imgWidth + (x+1)) * 4]) / 4;
          b = (tempPixels[((y-1) * imgWidth + (x-1)) * 4] + tempPixels[((y-1) * imgWidth + (x+1)) * 4] +
               tempPixels[((y+1) * imgWidth + (x-1)) * 4] + tempPixels[((y+1) * imgWidth + (x+1)) * 4]) / 4;
        } else if (isEvenRow && !isEvenCol) { // G
          g = tempPixels[outputIndex];
          r = (tempPixels[(y * imgWidth + (x-1)) * 4] + tempPixels[(y * imgWidth + (x+1)) * 4]) / 2;
          b = (tempPixels[((y-1) * imgWidth + x) * 4] + tempPixels[((y+1) * imgWidth + x) * 4]) / 2;
        } else if (!isEvenRow && isEvenCol) { // G
          g = tempPixels[outputIndex];
          r = (tempPixels[((y-1) * imgWidth + x) * 4] + tempPixels[((y+1) * imgWidth + x) * 4]) / 2;
          b = (tempPixels[(y * imgWidth + (x-1)) * 4] + tempPixels[(y * imgWidth + (x+1)) * 4]) / 2;
        } else { // B
          b = tempPixels[outputIndex];
          g = (tempPixels[((y-1) * imgWidth + x) * 4] + tempPixels[((y+1) * imgWidth + x) * 4] +
               tempPixels[(y * imgWidth + (x-1)) * 4] + tempPixels[(y * imgWidth + (x+1)) * 4]) / 4;
          r = (tempPixels[((y-1) * imgWidth + (x-1)) * 4] + tempPixels[((y-1) * imgWidth + (x+1)) * 4] +
               tempPixels[((y+1) * imgWidth + (x-1)) * 4] + tempPixels[((y+1) * imgWidth + (x+1)) * 4]) / 4;
        }
      }
      // 可以添加其他Bayer模式的处理...

      pixels[outputIndex] = Math.min(255, Math.max(0, r));
      pixels[outputIndex + 1] = Math.min(255, Math.max(0, g));
      pixels[outputIndex + 2] = Math.min(255, Math.max(0, b));
      pixels[outputIndex + 3] = 255;
    }
  }
};

// 更新图像位置
const updateImagePosition = () => {
  if (!canvas.value) return;

  canvas.value.style.transform = `translate(${imageOffset.value.x}px, ${imageOffset.value.y}px)`;
};

const drawZoomed = () => {
  if (!canvas.value || !ctx) return;
  const displayWidth = canvasWidth.value * zoomLevel.value;
  const displayHeight = canvasHeight.value * zoomLevel.value;
  canvas.value.style.width = displayWidth + 'px';
  canvas.value.style.height = displayHeight + 'px';

  // 确保像素级渲染
  canvas.value.style.imageRendering = 'pixelated';
  canvas.value.style.imageRendering = '-moz-crisp-edges';
  canvas.value.style.imageRendering = 'crisp-edges';

  // 更新鼠标样式
  canvas.value.style.cursor = zoomLevel.value > 1 ? 'grab' : 'default';

  // 更新图像位置
  updateImagePosition();
};

// 应用参数函数
const applyParams = () => {
  if (rawData.value && rawData.value.length > 0) {
    displayRawImage(rawData.value, width.value, height.value, bitsPerPixel.value, pixelFormat.value);
  }
};

// 鼠标移动处理
const handleMouseMove = (event) => {
  if (!canvas.value || !ready.value) return;

  // 处理拖拽
  if (isDragging.value) {
    handleDragMove(event);
    return;
  }

  const rect = canvas.value.getBoundingClientRect();
  const scaleX = canvasWidth.value / rect.width;
  const scaleY = canvasHeight.value / rect.height;

  // 计算在原始图像中的坐标，考虑图像偏移
  const canvasX = (event.clientX - rect.left) * scaleX;
  const canvasY = (event.clientY - rect.top) * scaleY;

  // 考虑图像偏移计算实际像素坐标
  const x = Math.floor(canvasX - imageOffset.value.x / zoomLevel.value);
  const y = Math.floor(canvasY - imageOffset.value.y / zoomLevel.value);

  cursorX.value = x;
  cursorY.value = y;

  // 获取像素值
  if (x >= 0 && x < canvasWidth.value && y >= 0 && y < canvasHeight.value && originalImageData) {
    const pixelIndex = (y * canvasWidth.value + x) * 4;
    pixelR.value = originalImageData.data[pixelIndex];
    pixelG.value = originalImageData.data[pixelIndex + 1];
    pixelB.value = originalImageData.data[pixelIndex + 2];
  }
};

// 鼠标离开处理
const handleMouseOut = () => {
  cursorX.value = -1;
  cursorY.value = -1;
  pixelR.value = 0;
  pixelG.value = 0;
  pixelB.value = 0;
  // 停止拖拽
  isDragging.value = false;
};

// 鼠标按下开始拖拽
const handleMouseDown = (event) => {
  if (event.button === 0 && zoomLevel.value > 1) { // 只在左键且放大时启用拖拽
    isDragging.value = true;
    dragStart.value = {
      x: event.clientX,
      y: event.clientY
    };
    lastImageOffset.value = { ...imageOffset.value };

    // 改变鼠标样式
    if (canvas.value) {
      canvas.value.style.cursor = 'grabbing';
    }

    event.preventDefault();
  }
};

// 鼠标抬起结束拖拽
const handleMouseUp = () => {
  if (isDragging.value) {
    isDragging.value = false;

    // 恢复鼠标样式
    if (canvas.value) {
      canvas.value.style.cursor = zoomLevel.value > 1 ? 'grab' : 'default';
    }
  }
};

// 限制图像拖拽范围
const constrainImageOffset = (offset) => {
  if (!canvas.value) return offset;

  const container = canvas.value.parentElement;
  if (!container) return offset;

  const containerRect = container.getBoundingClientRect();
  const imageWidth = canvasWidth.value * zoomLevel.value;
  const imageHeight = canvasHeight.value * zoomLevel.value;

  // 计算允许的最大偏移量
  const maxOffsetX = Math.max(0, (imageWidth - containerRect.width) / 2);
  const maxOffsetY = Math.max(0, (imageHeight - containerRect.height) / 2);

  return {
    x: Math.max(-maxOffsetX, Math.min(maxOffsetX, offset.x)),
    y: Math.max(-maxOffsetY, Math.min(maxOffsetY, offset.y))
  };
};

// 拖拽移动处理
const handleDragMove = (event) => {
  if (!isDragging.value) return;

  const deltaX = event.clientX - dragStart.value.x;
  const deltaY = event.clientY - dragStart.value.y;

  const newOffset = {
    x: lastImageOffset.value.x + deltaX,
    y: lastImageOffset.value.y + deltaY
  };

  // 限制拖拽范围
  imageOffset.value = constrainImageOffset(newOffset);

  updateImagePosition();
  event.preventDefault();
};

const zoomIn = () => {
  if (zoomLevel.value < maxZoom) {
    zoomLevel.value = Math.min(maxZoom, zoomLevel.value * 2);
    drawZoomed();
  }
};

const zoomOut = () => {
  if (zoomLevel.value > minZoom) {
    zoomLevel.value = Math.max(minZoom, zoomLevel.value / 2);
    drawZoomed();
  }
};

const resetZoom = () => {
  zoomLevel.value = 1;
  // 重置图像位置
  imageOffset.value = { x: 0, y: 0 };
  drawZoomed();
};

const fitToWindow = () => {
  if (!canvas.value) return;
  const container = canvas.value.parentElement;
  if (!container) return;

  const containerRect = container.getBoundingClientRect();
  const scaleX = (containerRect.width - 40) / canvasWidth.value;
  const scaleY = (containerRect.height - 40) / canvasHeight.value;
  const fitScale = Math.min(scaleX, scaleY, 1);

  // 更新最小缩放为适应窗口的50%
  minZoom = Math.max(0.05, fitScale * 0.5);

  zoomLevel.value = Math.max(minZoom, Math.min(maxZoom, fitScale));
  // 重置图像位置
  imageOffset.value = { x: 0, y: 0 };
  drawZoomed();
};

// 滚轮缩放支持
const handleWheel = (event) => {
  if (!event.ctrlKey) return;

  event.preventDefault();
  const delta = event.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = zoomLevel.value * delta;

  if (newZoom >= minZoom && newZoom <= maxZoom) {
    zoomLevel.value = newZoom;
    drawZoomed();
  }
};

watch(zoomLevel, () => {
  drawZoomed();
});

onMounted(() => {
  ctx = canvas.value.getContext('2d');
  drawZoomed();

  // 添加全局鼠标事件监听器，处理拖拽
  window.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('mousemove', (e) => {
    if (isDragging.value) {
      handleDragMove(e);
    }
  });

  // 添加键盘快捷键支持
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey) {
      switch (e.key) {
        case '=':
        case '+':
          e.preventDefault();
          zoomIn();
          break;
        case '-':
          e.preventDefault();
          zoomOut();
          break;
        case '0':
          e.preventDefault();
          resetZoom();
          break;
      }
    }
  });

  // 监听窗口大小变化，动态调整最小缩放值
  window.addEventListener('resize', () => {
    if (canvasWidth.value > 0 && canvasHeight.value > 0) {
      setTimeout(() => {
        const container = canvas.value?.parentElement;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const scaleX = (containerRect.width - 40) / canvasWidth.value;
          const scaleY = (containerRect.height - 40) / canvasHeight.value;
          const fitScale = Math.min(scaleX, scaleY, 1);
          minZoom = Math.max(0.05, fitScale * 0.5);

          // 如果当前缩放小于新的最小值，调整到最小值
          if (zoomLevel.value < minZoom) {
            zoomLevel.value = minZoom;
            drawZoomed();
          }
        }
      }, 100);
    }
  });

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
  overflow: hidden; /* 防止整体滚动 */
}

.raw-image-container {
  display: flex;
  flex-direction: row;
  flex: 1;
  min-height: 0; /* 重要：允许flex子项收缩 */
  padding: 10px;
  padding-bottom: 0; /* 为状态栏留出空间 */
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
  flex-shrink: 0; /* 防止收缩 */
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
  min-height: 30px; /* 确保最小高度 */
  background-color: var(--vscode-statusBar-background);
  color: var(--vscode-statusBar-foreground);
  width: 100%;
  display: flex;
  align-items: center;
  padding: 0 10px;
  gap: 20px;
  font-size: 12px;
  flex-shrink: 0; /* 防止状态栏被压缩 */
  border-top: 1px solid var(--vscode-statusBar-border, var(--vscode-sideBar-border));
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
  flex: 1;
  min-height: 0; /* 重要：允许flex子项收缩 */
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto;
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-editorWidget-border);
  border-radius: 4px;
  position: relative;
}

.raw-image-canvas {
  max-width: none;
  max-height: none;
  object-fit: contain;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
  border-radius: 2px;
  /* 透明背景格子，类似Photoshop */
  background-image:
    linear-gradient(45deg, #ffffff 25%, transparent 25%),
    linear-gradient(-45deg, #ffffff 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ffffff 75%),
    linear-gradient(-45deg, transparent 75%, #ffffff 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
  background-color: #cccccc;
  /* 拖拽相关样式 */
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  transition: cursor 0.1s ease;
}
.zoom-controls {
  position: absolute;
  right: 20px;
  top: 20px;
  background: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-sideBar-border);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
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

.status-bar-item {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
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