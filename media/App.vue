<template>
  <div class="raw-image-container">
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
        <input type="number" id="bits-per-pixel" v-model.number="bitsPerPixel" min="1" max="16" />
      </div>
      <button id="apply-params-btn" @click="applyParams">应用参数</button>
    </div>
    <div class="image-container">
      <canvas ref="canvas" class="raw-image-canvas" @mousemove="handleMouseMove" @mouseout="handleMouseOut"></canvas>
    </div>
  </div>
  <div class="status-bar">
    <div class="status-bar-item" id="image-size">图像尺寸: {{ canvasWidth }}×{{ canvasHeight }}</div>
    <div class="status-bar-item" id="pixel-info">像素: ({{ pixelR }}, {{ pixelG }}, {{ pixelB }})</div>
    <div class="status-bar-item" id="cursor-pos">坐标: ({{ cursorX }}, {{ cursorY }})</div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

const props = defineProps({
  vscode: Object
});

const canvas = ref(null);
let ctx = null;
const rawData = ref(null);
const ready = ref(false);

const width = ref(2688);
const height = ref(1520);
const bitsPerPixel = ref(10);

const canvasWidth = ref(0);
const canvasHeight = ref(0);
const pixelR = ref(0);
const pixelG = ref(0);
const pixelB = ref(0);
const cursorX = ref(0);
const cursorY = ref(0);

const displayRawImage = async (data, imgWidth, imgHeight, bpp) => {
  if (!canvas.value) return;
  ctx = canvas.value.getContext('2d');
  rawData.value = data;

  canvas.value.width = imgWidth;
  canvas.value.height = imgHeight;
  canvasWidth.value = imgWidth;
  canvasHeight.value = imgHeight;

  const imageData = ctx.createImageData(imgWidth, imgHeight);
  const pixels = imageData.data;
  const bytesPerPixelVal = Math.ceil(bpp / 8);
  const maxValue = Math.pow(2, bpp) - 1;

  const requiredBytes = imgWidth * imgHeight * bytesPerPixelVal;
  if (data.length < requiredBytes) {
    console.error(`Not enough data. Expected ${requiredBytes} bytes, but got ${data.length} bytes.`);
    // Optionally, clear the canvas or show an error message to the user
    ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);
    pixelR.value = 0;
    pixelG.value = 0;
    pixelB.value = 0;
    return;
  }


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

  ctx.putImageData(imageData, 0, 0);
  ready.value = true;
};

const applyParams = () => {
  if (rawData.value) {
    displayRawImage(rawData.value, width.value, height.value, bitsPerPixel.value);
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
          // Optionally, display image immediately or wait for applyParams
          // For now, let's display with default params if data exists
          if (rawData.value && rawData.value.length > 0) {
             applyParams(); // Display with current form values
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

.raw-image-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 30px); /* Full height minus status bar */
  padding: 10px;
  box-sizing: border-box;
}

.image-params-form {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap; /* Allow wrapping on smaller screens */
}

.form-group {
  margin-right: 15px;
  margin-bottom: 5px; /* Spacing for wrapped items */
  display: flex;
  align-items: center;
}

.form-group label {
  margin-right: 5px;
  font-size: var(--vscode-font-size);
}

.form-group input[type="number"] {
  width: 80px; /* Adjust as needed */
  padding: 4px;
  border: 1px solid var(--vscode-input-border, #ccc);
  background-color: var(--vscode-input-background, #fff);
  color: var(--vscode-input-foreground, #000);
  border-radius: 3px;
}

#apply-params-btn {
  padding: 5px 10px;
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: 1px solid var(--vscode-button-border, transparent);
  border-radius: 3px;
  cursor: pointer;
  font-size: var(--vscode-font-size);
}

#apply-params-btn:hover {
  background-color: var(--vscode-button-hoverBackground);
}

.image-container {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto; /* Add scrollbars if image is larger than container */
  background-color: var(--vscode-editorWidget-background, #252526); /* Darker background for canvas area */
  border: 1px solid var(--vscode-editorWidget-border, #454545);
  min-height: 200px; /* Ensure a minimum height for the canvas area */
}

.raw-image-canvas {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain; /* Scale image down to fit, preserving aspect ratio */
  image-rendering: pixelated; /* For crisp pixels, good for raw images */
}

.status-bar {
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 30px;
  background-color: var(--vscode-statusBar-background, #007acc);
  color: var(--vscode-statusBar-foreground, white);
  padding: 0 10px;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  font-size: var(--vscode-font-size);
  border-top: 1px solid var(--vscode-statusBar-border, transparent);
}

.status-bar-item {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>