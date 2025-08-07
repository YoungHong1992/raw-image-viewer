<template>
  <div class="controls-panel">
    <!-- 预设分辨率选择 -->
    <div class="preset-section">
      <h3>常用分辨率预设</h3>
      <div class="preset-buttons">
        <button v-for="preset in commonResolutions" :key="`${preset.width}x${preset.height}`"
          @click="applyPreset(preset)" class="preset-btn"
          :class="{ active: width === preset.width && height === preset.height }">
          {{ preset.name }} ({{ preset.width }}×{{ preset.height }})
        </button>
      </div>
    </div>

    <!-- 智能推荐 -->
    <div class="recommendation-section" v-if="fileSize > 0">
      <h3>智能推荐 (文件大小: {{ formatFileSize(fileSize) }})</h3>
      <div class="recommendation-list">
        <div v-for="rec in recommendations" :key="`${rec.width}x${rec.height}x${rec.bits}`"
          @click="applyRecommendation(rec)" class="recommendation-item"
          :class="{ active: width === rec.width && height === rec.height && bitsPerPixel === rec.bits }">
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
</template>

<script setup>
import { computed } from 'vue';
import { useImageStore } from '../stores/image';
import { storeToRefs } from 'pinia';

const store = useImageStore();
const {
  width,
  height,
  bitsPerPixel,
  pixelFormat,
  fileSize,
  commonResolutions,
  availableBits
} = storeToRefs(store);

const emit = defineEmits(['applyParams']);

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
  emit('applyParams');
};

// 应用推荐设置
const applyRecommendation = (rec) => {
  width.value = rec.width;
  height.value = rec.height;
  bitsPerPixel.value = rec.bits;
  emit('applyParams');
};

// 应用参数函数
const applyParams = () => {
  emit('applyParams');
};
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
  /* 防止收缩 */
}

.controls-panel h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-foreground);
  border-bottom: 1px solid var(--vscode-sideBar-border);
  padding-bottom: 5px;
}

.preset-section,
.recommendation-section,
.manual-params-section {
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

.form-group input[type="number"],
.form-group select {
  padding: 6px 8px;
  border: 1px solid var(--vscode-input-border);
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border-radius: 3px;
  font-size: 12px;
}

.form-group input[type="number"]:focus,
.form-group select:focus {
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
</style>
