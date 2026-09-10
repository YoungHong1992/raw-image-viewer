<template>
  <div class="controls-panel">
    <div class="section">
      <h3>{{ t('controls.fileInfo') }}</h3>
      <div class="form-group">
        <label>{{ t('controls.fileBytes') }}</label>
        <input type="text" :value="formatFileSize(fileSize)" readonly class="readonly-input" />
      </div>
    </div>

    <div class="section">
      <h3>{{ t('controls.resolution') }}</h3>

      <div class="form-group">
        <label>{{ t('controls.commonSizes') }}</label>
        <div class="size-buttons">
          <button
            v-for="size in validSizes"
            :key="`${size.width}x${size.height}`"
            @click="selectSize(size)"
            class="size-btn"
            :class="{ active: localWidth === size.width && localHeight === size.height }"
          >
            {{ size.width }}×{{ size.height }}<br>
            <small>({{ size.name ? `${size.name}, ${size.ratio}` : size.ratio }})</small>
          </button>
        </div>
      </div>

      <div class="form-group">
        <label>{{ t('controls.width') }}</label>
        <div class="input-group">
          <input
            type="number"
            v-model.number="localWidth"
            @input="onWidthChange"
            min="1"
            :class="{ invalid: !canApply }"
          />
          <button @click="swapDimensions" class="swap-button" :title="t('controls.swapDimensions')">⇄</button>
        </div>
      </div>

      <div class="form-group">
        <label>{{ t('controls.height') }}</label>
        <div class="input-group">
          <input
            type="number"
            v-model.number="localHeight"
            @input="onHeightChange"
            min="1"
            :class="{ invalid: !canApply }"
          />
        </div>
      </div>
    </div>

    <div class="section">
      <h3>{{ t('controls.bitDepth') }}</h3>
      <div class="bits-grid">
        <button
          v-for="bits in availableBits"
          :key="bits"
          @click="selectBitsPerPixel(bits)"
          class="bits-btn"
          :class="{ active: bitsPerPixel === bits }"
        >
          {{ bits }}
        </button>
      </div>
    </div>

    <div class="section">
      <h3>{{ t('controls.storageMode') }}</h3>
      <div class="storage-grid">
        <button
          v-for="mode in availableStorageModes"
          :key="mode"
          @click="selectStorageMode(mode)"
          class="storage-btn"
          :class="{ active: storageMode === mode }"
        >
          {{ t(`storageMode.${mode}`) }}
        </button>
      </div>
    </div>

    <div class="section">
      <h3>{{ t('controls.pixelFormat') }}</h3>
      <div class="form-group">
        <select v-model="pixelFormat" @change="handlePixelFormatChange">
          <option value="grayscale">{{ t('pixelFormat.grayscale') }}</option>
          <option value="rgb">{{ t('pixelFormat.rgb') }}</option>
          <option value="rggb">{{ t('pixelFormat.rggb') }}</option>
          <option value="grbg">{{ t('pixelFormat.grbg') }}</option>
          <option value="gbrg">{{ t('pixelFormat.gbrg') }}</option>
          <option value="bggr">{{ t('pixelFormat.bggr') }}</option>
        </select>
      </div>
    </div>

    <button
      @click="applySettings"
      :disabled="!canApply"
      class="apply-button"
      :class="{ disabled: !canApply }"
    >
      {{ t('controls.apply') }}
    </button>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useImageStore } from '../../stores/image';
import { calculateTotalPixels, defaultStorageModeForBitDepth, findMatchingResolutions, findRecommendedResolution, isFileSizeCompatible, matchesFileSize } from '../../../../src/shared/utils';

const store = useImageStore();
const {
  fileName,
  fileSize,
  width,
  height,
  bitsPerPixel,
  storageMode,
  pixelFormat,
  availableBits,
  availableStorageModes
} = storeToRefs(store);

const t = (key, params) => store.t(key, params);
const emit = defineEmits(['applyParams']);

const localWidth = ref(width.value);
const localHeight = ref(height.value);
const isManualInput = ref(false);

const validSizes = computed(() => {
  return findMatchingResolutions(
    fileSize.value,
    bitsPerPixel.value,
    pixelFormat.value,
    storageMode.value
  );
});

const canApply = computed(() => {
  if (!fileSize.value || !localWidth.value || !localHeight.value || localWidth.value <= 0 || localHeight.value <= 0) {
    return false;
  }

  return isFileSizeCompatible({
    width: localWidth.value,
    height: localHeight.value,
    bitsPerPixel: bitsPerPixel.value,
    pixelFormat: pixelFormat.value,
    storageMode: storageMode.value
  }, fileSize.value);
});

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const formatted = parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  return `${formatted} (${t('units.bytesSuffix', { bytes })})`;
};

const updateStoreValues = () => {
  width.value = localWidth.value;
  height.value = localHeight.value;
};

const emitApplyIfPossible = () => {
  updateStoreValues();
  if (canApply.value) {
    setTimeout(() => emit('applyParams'), 0);
  }
};

const applyRecommendedResolution = (autoApply = false) => {
  const candidate = findRecommendedResolution(
    fileSize.value,
    bitsPerPixel.value,
    pixelFormat.value,
    storageMode.value
  );

  if (!candidate) {
    return false;
  }

  localWidth.value = candidate.width;
  localHeight.value = candidate.height;
  isManualInput.value = false;
  updateStoreValues();

  if (autoApply && canApply.value) {
    setTimeout(() => emit('applyParams'), 0);
  }

  return true;
};

const parseFileNameHints = (name) => {
  if (!name) {
    return null;
  }

  const normalized = name.toLowerCase();

  const resolutionMatch =
    normalized.match(/(?:^|[_-])(\d{2,5})[xX](\d{2,5})(?:[_\-.]|$)/i) ||
    normalized.match(/w(\d{2,5}).*?h(\d{2,5})/i);

  const payloadBitsMatch = normalized.match(/(\d{1,2})(?:msb|lsb)/i);
  const bitsMatch =
    payloadBitsMatch ||
    normalized.match(/(?:^|[_-])(8|10|12|14|16)(?=bit(?:[_\-.]|$)|[_\-.]|$)/i) ||
    normalized.match(/(\d{1,2})bit/i);

  const formatMatch = normalized.match(/(?:^|[_-])(rggb|grbg|gbrg|bggr|rgb|grayscale|gray|grey)(?:[_\-.]|$)/i);

  let inferredStorageMode = null;
  if (/(?:^|[_-])(packed|mipi)(?:[_\-.]|$)/i.test(normalized)) {
    inferredStorageMode = 'packed';
  } else if (/(?:^|[_-])(16bit|word16|msb)(?:[_\-.]|$)/i.test(normalized)) {
    inferredStorageMode = 'word16';
  }

  return {
    width: resolutionMatch ? Number.parseInt(resolutionMatch[1], 10) : null,
    height: resolutionMatch ? Number.parseInt(resolutionMatch[2], 10) : null,
    bitsPerPixel: bitsMatch ? Number.parseInt(bitsMatch[1], 10) : null,
    pixelFormat: formatMatch
      ? ({
          gray: 'grayscale',
          grey: 'grayscale',
          grayscale: 'grayscale',
          rgb: 'rgb',
          rggb: 'rggb',
          grbg: 'grbg',
          gbrg: 'gbrg',
          bggr: 'bggr'
        }[formatMatch[1]])
      : null,
    storageMode: inferredStorageMode
  };
};

const applyHintsFromFileName = () => {
  const hints = parseFileNameHints(fileName.value);
  if (!hints?.width || !hints?.height || !hints?.bitsPerPixel) {
    return false;
  }

  const hintedPixelFormat = hints.pixelFormat || pixelFormat.value;
  const storageCandidates = hints.storageMode ? [hints.storageMode] : ['packed', 'word16'];
  const matchedStorage = storageCandidates.find(mode => {
    return matchesFileSize({
      width: hints.width,
      height: hints.height,
      bitsPerPixel: hints.bitsPerPixel,
      pixelFormat: hintedPixelFormat,
      storageMode: mode
    }, fileSize.value);
  });

  if (!matchedStorage) {
    return false;
  }

  bitsPerPixel.value = hints.bitsPerPixel;
  pixelFormat.value = hintedPixelFormat;
  storageMode.value = matchedStorage;
  localWidth.value = hints.width;
  localHeight.value = hints.height;
  isManualInput.value = false;
  updateStoreValues();
  emitApplyIfPossible();
  return true;
};

const findAndLoadValidParams = () => {
  if (fileSize.value === 0) return;

  if (applyHintsFromFileName()) {
    return;
  }

  const searchOrder = [
    { bits: 8, storage: 'packed' },
    { bits: bitsPerPixel.value, storage: storageMode.value },
    { bits: 10, storage: 'word16' },
    { bits: 12, storage: 'word16' },
    { bits: 14, storage: 'word16' },
    { bits: 16, storage: 'word16' },
    { bits: 10, storage: 'packed' },
    { bits: 12, storage: 'packed' },
    { bits: 14, storage: 'packed' },
    { bits: 16, storage: 'packed' }
  ];

  const seen = new Set();

  for (const candidate of searchOrder) {
    const key = `${candidate.bits}:${candidate.storage}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    const resolution = findRecommendedResolution(
      fileSize.value,
      candidate.bits,
      pixelFormat.value,
      candidate.storage
    );

    if (!resolution) {
      continue;
    }

    bitsPerPixel.value = candidate.bits;
    storageMode.value = candidate.storage;
    localWidth.value = resolution.width;
    localHeight.value = resolution.height;
    isManualInput.value = false;
    updateStoreValues();
    emitApplyIfPossible();
    return;
  }

  console.log(t('controls.noPresetFound'));
};

const updateCompanionDimension = (axis) => {
  const totalPixels = calculateTotalPixels(
    fileSize.value,
    bitsPerPixel.value,
    pixelFormat.value,
    storageMode.value
  );

  if (!totalPixels) {
    return;
  }

  if (axis === 'height' && localWidth.value > 0) {
    localHeight.value = Math.max(1, Math.round(totalPixels / localWidth.value));
  }

  if (axis === 'width' && localHeight.value > 0) {
    localWidth.value = Math.max(1, Math.round(totalPixels / localHeight.value));
  }
};

const selectSize = (size) => {
  localWidth.value = size.width;
  localHeight.value = size.height;
  isManualInput.value = false;
  emitApplyIfPossible();
};

const selectBitsPerPixel = (bits) => {
  const previousDefault = defaultStorageModeForBitDepth(bitsPerPixel.value);
  bitsPerPixel.value = bits;

  // 跟随位深切换到兼容旧版本的布局，除非用户已手动选择了存储方式
  if (storageMode.value === previousDefault) {
    storageMode.value = defaultStorageModeForBitDepth(bits);
  }

  if (!applyRecommendedResolution(true)) {
    emitApplyIfPossible();
  }
};

const selectStorageMode = (mode) => {
  storageMode.value = mode;
  if (!applyRecommendedResolution(true)) {
    emitApplyIfPossible();
  }
};

const handlePixelFormatChange = () => {
  if (!applyRecommendedResolution(true)) {
    emitApplyIfPossible();
  }
};

const swapDimensions = () => {
  const nextWidth = localHeight.value;
  const nextHeight = localWidth.value;
  localWidth.value = nextWidth;
  localHeight.value = nextHeight;
  isManualInput.value = true;
  updateStoreValues();
};

const onWidthChange = () => {
  isManualInput.value = true;
  updateCompanionDimension('height');
  updateStoreValues();
};

const onHeightChange = () => {
  isManualInput.value = true;
  updateCompanionDimension('width');
  updateStoreValues();
};

const applySettings = () => {
  if (canApply.value) {
    updateStoreValues();
    emit('applyParams');
  }
};

watch(fileSize, (newSize) => {
  if (newSize > 0) {
    findAndLoadValidParams();
  }
});
</script>

<style scoped>
.controls-panel {
  width: 350px;
  min-width: 350px;
  background-color: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-sideBar-border);
  border-radius: 4px;
  padding: 15px;
  overflow-y: auto;
  flex-shrink: 0;
}

.section {
  margin-bottom: 20px;
  padding: 12px;
  border: 1px solid var(--vscode-sideBar-border);
  border-radius: 4px;
  background-color: var(--vscode-sideBar-background);
}

.section h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-foreground);
  border-bottom: 1px solid var(--vscode-sideBar-border);
  padding-bottom: 6px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--vscode-foreground);
  margin-bottom: 4px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--vscode-input-border);
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border-radius: 3px;
  font-size: 12px;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--vscode-focusBorder);
}

.readonly-input {
  background-color: var(--vscode-input-background) !important;
  color: var(--vscode-descriptionForeground) !important;
  cursor: not-allowed;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-group input {
  flex: 1;
}

.swap-button {
  padding: 6px 8px;
  background-color: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: 1px solid var(--vscode-button-border);
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  min-width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.swap-button:hover {
  background-color: var(--vscode-button-secondaryHoverBackground);
}

.size-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.size-btn {
  padding: 6px 8px;
  font-size: 10px;
  background-color: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: 1px solid var(--vscode-button-border);
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.2s;
  text-align: center;
  line-height: 1.2;
}

.size-btn:hover {
  background-color: var(--vscode-button-secondaryHoverBackground);
}

.size-btn.active {
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  font-weight: bold;
}

.size-btn small {
  font-size: 8px;
  opacity: 0.8;
}

.bits-grid,
.storage-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.bits-grid {
  grid-template-columns: repeat(3, 1fr);
}

.bits-btn,
.storage-btn {
  padding: 8px 4px;
  font-size: 11px;
  background-color: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: 1px solid var(--vscode-button-border);
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.2s;
  text-align: center;
}

.bits-btn:hover,
.storage-btn:hover {
  background-color: var(--vscode-button-secondaryHoverBackground);
}

.bits-btn.active,
.storage-btn.active {
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  font-weight: bold;
}

.apply-button {
  width: 100%;
  padding: 10px 16px;
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: 1px solid var(--vscode-button-border, transparent);
  border-radius: 3px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.apply-button:hover:not(.disabled) {
  background-color: var(--vscode-button-hoverBackground);
}

.apply-button.disabled {
  background-color: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  cursor: not-allowed;
  opacity: 0.6;
}

.invalid {
  border-color: var(--vscode-inputValidation-errorBorder) !important;
  background-color: var(--vscode-inputValidation-errorBackground) !important;
}
</style>
