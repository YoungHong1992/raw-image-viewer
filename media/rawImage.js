// @ts-check

// This script is run within the webview itself
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    class RawImageViewer {
        constructor(/** @type {HTMLElement} */ parent) {
            this.ready = false;
            this.rawData = null; // 存储原始数据
            this._initElements(parent);
            this._setupEventListeners();
        }

        _initElements(/** @type {HTMLElement} */ parent) {
            this.canvas = /** @type {HTMLCanvasElement} */ (document.querySelector('.raw-image-canvas'));
            this.ctx = this.canvas.getContext('2d');
            
            // 获取参数输入元素
            this.widthInput = document.getElementById('image-width');
            this.heightInput = document.getElementById('image-height');
            this.bitsPerPixelInput = document.getElementById('bits-per-pixel');
            this.applyButton = document.getElementById('apply-params-btn');
        }
        
        _setupEventListeners() {
            // 添加应用参数按钮的点击事件
            this.applyButton.addEventListener('click', () => {
                if (this.rawData) {
                    const width = parseInt(this.widthInput.value, 10);
                    const height = parseInt(this.heightInput.value, 10);
                    const bitsPerPixel = parseInt(this.bitsPerPixelInput.value, 10);
                    
                    // 使用用户输入的参数重新渲染图像
                    this.displayRawImage(this.rawData, width, height, bitsPerPixel);
                }
            });
        }

        /**
         * @param {Uint8Array} data 
         * @param {number} width 
         * @param {number} height 
         * @param {number} bitsPerPixel 
         */
        async displayRawImage(data, width = 2688, height = 1520, bitsPerPixel = 10) {
            // 存储原始数据以便重新渲染
            this.rawData = data;
            
            // 设置画布尺寸
            this.canvas.width = width;
            this.canvas.height = height;

            // 创建 ImageData 对象
            const imageData = this.ctx.createImageData(width, height);
            const pixels = imageData.data;

            // 计算每个像素的字节数
            const bytesPerPixel = Math.ceil(bitsPerPixel / 8);
            const maxValue = Math.pow(2, bitsPerPixel) - 1;

            // 处理 RAW 数据
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const pixelIndex = (y * width + x) * bytesPerPixel;
                    const outputIndex = (y * width + x) * 4;

                    // 从 RAW 数据中读取像素值
                    let pixelValue = 0;
                    if (bitsPerPixel <= 8) {
                        pixelValue = data[pixelIndex];
                    } else {
                        pixelValue = (data[pixelIndex] << 8) | data[pixelIndex + 1];
                    }

                    // 归一化像素值到 0-255 范围
                    const normalizedValue = Math.floor((pixelValue / maxValue) * 255);

                    // 设置 RGB 值（灰度图像）
                    pixels[outputIndex] = normalizedValue;     // R
                    pixels[outputIndex + 1] = normalizedValue; // G
                    pixels[outputIndex + 2] = normalizedValue; // B
                    pixels[outputIndex + 3] = 255;            // A
                }
            }

            // 将图像数据绘制到画布上
            this.ctx.putImageData(imageData, 0, 0);
            this.ready = true;
        }

        /**
         * @param {Uint8Array} data 
         */
        async reset(data) {
            // 只保存原始数据，不立即显示图像
            this.rawData = data;
        }
    }

    // 创建并初始化查看器
    const viewer = new RawImageViewer(document.querySelector('.raw-image-container'));

    // 处理来自扩展的消息
    window.addEventListener('message', async e => {
        const { type, body } = e.data;

        switch (type) {
            case 'init': {
                if (body.value) {
                    // 只保存原始数据，不立即显示图像
                    viewer.rawData = new Uint8Array(body.value);
                }
                break;
            }
            case 'getFileData': {
                // 获取当前显示的图像数据
                const data = viewer.rawData || new Uint8Array(0);
                vscode.postMessage({ type: 'response', requestId: e.data.requestId, body: Array.from(data) });
                break;
            }
        }
    });

    // 通知扩展 webview 已准备就绪
    vscode.postMessage({ type: 'ready' });
}());