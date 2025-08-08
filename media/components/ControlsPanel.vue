<template>
  <div class="controls-panel">
    <!-- 文件信息 -->
    <div class="section">
      <h3>文件信息</h3>
      <div class="form-group">
        <label>文件字节数:</label>
        <input type="text" :value="formatFileSize(fileSize)" readonly class="readonly-input" />
      </div>
    </div>

    <!-- 分辨率设置 -->
    <div class="section">
      <h3>分辨率设置</h3>
      
      <!-- 常见尺寸 -->
      <div class="form-group">
        <label>常见尺寸:</label>
        <div class="size-buttons">
          <button 
            v-for="size in validSizes" 
            :key="`${size.width}x${size.height}`"
            @click="selectSize(size)"
            class="size-btn"
            :class="{ 'active': localWidth === size.width && localHeight === size.height }"
          >
            {{ size.width }}×{{ size.height }}<br>
            <small>({{ size.ratio }})</small>
          </button>
        </div>
      </div>

      <!-- 手动输入 -->
      <div class="form-group">
        <label>宽度:</label>
        <div class="input-group">
          <input 
            type="number" 
            v-model.number="localWidth" 
            @input="onWidthChange"
            min="1"
            :class="{ 'invalid': !canApply }"
          />
          <button @click="swapDimensions" class="swap-button" title="交换宽高">⇄</button>
        </div>
      </div>

      <div class="form-group">
        <label>高度:</label>
        <div class="input-group">
          <input 
            type="number" 
            v-model.number="localHeight" 
            @input="onHeightChange"
            min="1"
            :class="{ 'invalid': !canApply }"
          />
        </div>
      </div>
    </div>

    <!-- 位深度设置 -->
    <div class="section">
      <h3>位深度</h3>
      <div class="bits-grid">
        <button 
          v-for="bits in availableBits" 
          :key="bits"
          @click="selectBitsPerPixel(bits)"
          class="bits-btn"
          :class="{ 'active': bitsPerPixel === bits }"
        >
          {{ bits }}位
        </button>
      </div>
    </div>

    <!-- 像素格式 -->
    <div class="section">
      <h3>像素格式</h3>
      <div class="form-group">
        <select v-model="pixelFormat" @change="updateStoreValues">
          <option value="grayscale">灰度</option>
          <option value="rgb">RGB</option>
          <option value="rggb">RGGB (Bayer)</option>
          <option value="grbg">GRBG (Bayer)</option>
          <option value="gbrg">GBRG (Bayer)</option>
          <option value="bggr">BGGR (Bayer)</option>
        </select>
      </div>
    </div>

    <!-- 应用按钮 -->
    <button 
      @click="applySettings" 
      :disabled="!canApply" 
      class="apply-button"
      :class="{ 'disabled': !canApply }"
    >
      应用设置
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useImageStore } from '../stores/image';
import { storeToRefs } from 'pinia';

const store = useImageStore();
const { width, height, bitsPerPixel, pixelFormat, fileSize, availableBits } = storeToRefs(store);

const emit = defineEmits(['applyParams']);

// 本地状态
const localWidth = ref(width.value);
const localHeight = ref(height.value);
const isManualInput = ref(false);

// 定义宽高比
const aspectRatios = [
  { ratio: '1:1', w: 1, h: 1 },
  { ratio: '5:4', w: 5, h: 4 },
  { ratio: '4:3', w: 4, h: 3 },
  { ratio: '3:2', w: 3, h: 2 },
  { ratio: '16:10', w: 16, h: 10 },
  { ratio: '16:9', w: 16, h: 9 },
  { ratio: '2:1', w: 2, h: 1 },
  { ratio: '21:9', w: 21, h: 9 }
];

// 计算有效尺寸
const validSizes = computed(() => {
  if (fileSize.value === 0) return [];
  
  const sizes = [];
  const fileBits = fileSize.value * 8;
  const currentBits = bitsPerPixel.value;
  
  // 对每个宽高比计算可能的尺寸
  for (const ar of aspectRatios) {
    // 计算基础尺寸
    const totalPixels = fileBits / currentBits;
    const baseSize = Math.sqrt(totalPixels / (ar.w * ar.h));
    
    // 尝试不同的整数倍数
    for (let multiplier = 1; multiplier <= 100; multiplier++) {
      const width = Math.round(baseSize * ar.w * multiplier);
      const height = Math.round(baseSize * ar.h * multiplier);
      
      // 验证是否精确匹配
      if (width * height * currentBits === fileBits) {
        sizes.push({
          width,
          height,
          ratio: ar.ratio
        });
      }
    }
  }
  
  // 去重并排序
  const uniqueSizes = sizes.filter((size, index, self) => 
    index === self.findIndex(s => s.width === size.width && s.height === size.height)
  );
  
  return uniqueSizes.sort((a, b) => a.width * a.height - b.width * b.height);
});

// 验证参数是否有效
const canApply = computed(() => {
  if (!localWidth.value || !localHeight.value || localWidth.value <= 0 || localHeight.value <= 0) {
    return false;
  }
  
  const fileBits = fileSize.value * 8;
  const requiredBits = localWidth.value * localHeight.value * bitsPerPixel.value;
  
  return fileBits === requiredBits;
});

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const formatted = parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  return `${formatted} (${bytes} bytes)`;
};

// 选择尺寸
const selectSize = (size) => {
  localWidth.value = size.width;
  localHeight.value = size.height;
  isManualInput.value = false;
  updateStoreValues();
  // 自动应用
  if (canApply.value) {
    emit('applyParams');
  }
};

// 选择位深度
const selectBitsPerPixel = (bits) => {
  bitsPerPixel.value = bits;
  updateStoreValues();
};

// 交换宽高
const swapDimensions = () => {
  const tempWidth = localWidth.value;
  localWidth.value = localHeight.value;
  localHeight.value = tempWidth;
  isManualInput.value = true;
  updateStoreValues();
};

// 宽度变化处理
const onWidthChange = () => {
  if (isManualInput.value && localWidth.value > 0 && fileSize.value > 0) {
    const fileBits = fileSize.value * 8;
    const calculatedHeight = Math.round(fileBits / (localWidth.value * bitsPerPixel.value));
    if (calculatedHeight > 0) {
      localHeight.value = calculatedHeight;
    }
  }
  isManualInput.value = true;
  updateStoreValues();
};

// 高度变化处理
const onHeightChange = () => {
  if (isManualInput.value && localHeight.value > 0 && fileSize.value > 0) {
    const fileBits = fileSize.value * 8;
    const calculatedWidth = Math.round(fileBits / (localHeight.value * bitsPerPixel.value));
    if (calculatedWidth > 0) {
      localWidth.value = calculatedWidth;
    }
  }
  isManualInput.value = true;
  updateStoreValues();
};

// 更新store值
const updateStoreValues = () => {
  width.value = localWidth.value;
  height.value = localHeight.value;
};

// 应用设置
const applySettings = () => {
  if (canApply.value) {
    updateStoreValues();
    emit('applyParams');
  }
};

// 按位深度从大到小查找合法参数并加载
const findAndLoadValidParams = () => {
  if (fileSize.value === 0) return;
  
  const fileBits = fileSize.value * 8;
  const bitsToTry = [16, 14, 12, 10, 8];
  
  // 按宽高比从大到小排序
  const sortedAspectRatios = [...aspectRatios].sort((a, b) => (b.w / b.h) - (a.w / a.h));
  
  for (const bits of bitsToTry) {
    // 对每个宽高比计算可能的尺寸（按宽高比从大到小）
    for (const ar of sortedAspectRatios) {
      const totalPixels = fileBits / bits;
      const baseSize = Math.sqrt(totalPixels / (ar.w * ar.h));
      
      // 尝试不同的整数倍数
      for (let multiplier = 1; multiplier <= 100; multiplier++) {
        const width = Math.round(baseSize * ar.w * multiplier);
        const height = Math.round(baseSize * ar.h * multiplier);
        
        // 验证是否精确匹配
        if (width * height * bits === fileBits) {
          // 找到合法参数，直接加载
          bitsPerPixel.value = bits;
          localWidth.value = width;
          localHeight.value = height;
          isManualInput.value = false;
          updateStoreValues();
          // 自动应用
          setTimeout(() => {
            emit('applyParams');
          }, 100);
          return;
        }
      }
    }
  }
  
  // 所有位深度都没有合法参数，等待用户手动输入
  console.log('未找到合法的预设参数，等待用户手动输入');
};

// 监听文件大小变化，按位深度从大到小查找合法参数
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

.bits-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.bits-btn {
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

.bits-btn:hover {
  background-color: var(--vscode-button-secondaryHoverBackground);
}

.bits-btn.active {
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