# Raw Image Viewer - 项目索引

> 本文档为 AI 助手提供项目上下文信息，便于快速理解项目结构和进行代码辅助。

## 📋 项目概述

| 属性 | 值 |
|------|-----|
| 项目名称 | Raw Image Viewer |
| 类型 | VS Code 扩展 |
| 版本 | 0.0.6 |
| 发布者 | YoungHong1992 |
| 仓库 | https://github.com/YoungHong1992/raw-image-viewer |
| VS Code 版本要求 | ^1.91.0 |
| 主入口 | `./out/extension/extension.js` |

### 功能描述
专业的 RAW 图像查看器 VS Code 扩展，支持多种像素格式和智能图像处理：
- 智能 RAW 图像处理，自动检测和处理各种 RAW 图像格式
- 多种像素格式支持：RGGB, BGGR, GRBG, GBRG Bayer 模式
- 智能分辨率推荐
- 实时预览与可调参数
- 支持 `.raw` 和 `.bin` 文件

---

## 🗂️ 目录结构

```
raw-image-viewer/
├── config/                    # 配置文件
│   └── tsconfig.json         # TypeScript 编译配置
├── docs/                      # 文档
│   ├── CHANGELOG.md          # 变更日志
│   ├── README.md             # 详细文档
│   └── RELEASE.md            # 发布指南
├── src/                       # 扩展源代码 (TypeScript)
│   ├── extension/            # VS Code 扩展核心
│   │   ├── extension.ts      # 扩展入口，激活/停用逻辑
│   │   ├── provider.ts       # 自定义编辑器提供者
│   │   └── document.ts       # 文档模型
│   ├── shared/               # 共享模块 (扩展与 Webview 共用)
│   │   ├── constants.ts      # 常量定义
│   │   ├── types.ts          # TypeScript 类型定义
│   │   └── utils.ts          # 工具函数
│   └── test/                 # 测试代码
│       ├── runTest.ts        # 测试运行器
│       └── suite/
│           ├── extension.test.ts  # 扩展测试
│           └── index.ts
├── webview/                   # Webview UI (Vue 3)
│   ├── package.json          # Webview 依赖
│   ├── vite.config.js        # Vite 构建配置
│   ├── index.html            # HTML 入口
│   └── src/
│       ├── App.vue           # 根组件
│       ├── main.js           # Vue 入口
│       ├── stores/
│       │   └── image.js      # Pinia 状态管理
│       └── components/
│           ├── controls/
│           │   └── ControlsPanel.vue   # 控制面板
│           ├── viewer/
│           │   └── ImageContainer.vue  # 图像显示容器
│           └── status/
│               └── StatusBar.vue       # 状态栏
├── tools/                     # 工具脚本
│   ├── release.js            # 版本发布脚本
│   └── mipi10-converter/     # MIPI10 转换工具
├── out/                       # 编译输出 (TypeScript -> JavaScript)
├── dist/                      # 构建产物
│   └── webview/              # Webview 构建输出
├── package.json              # 项目配置
├── AGENTS.md                 # 本文件
└── README.md                 # 项目说明
```

---

## 🏗️ 技术架构

### 技术栈
| 层级 | 技术 |
|------|-----|
| 扩展后端 | TypeScript, VS Code Extension API |
| Webview 前端 | Vue 3, Pinia, Vite |
| 构建工具 | TypeScript Compiler, Vite, Terser |
| 测试框架 | Mocha |

### 架构图
```
┌─────────────────────────────────────────────────────────────┐
│                      VS Code Extension                       │
├─────────────────────────────────────────────────────────────┤
│  extension.ts     │  provider.ts      │  document.ts        │
│  (激活/注册)       │  (编辑器提供者)    │  (文档模型)          │
├─────────────────────────────────────────────────────────────┤
│                    shared/ (共享模块)                         │
│     constants.ts  │  types.ts  │  utils.ts                  │
├─────────────────────────────────────────────────────────────┤
│                     Webview (Vue 3)                          │
├───────────────┬──────────────┬──────────────────────────────┤
│ ControlsPanel │ ImageContainer│ StatusBar                   │
│ (参数控制)     │ (图像渲染)     │ (状态显示)                   │
├───────────────┴──────────────┴──────────────────────────────┤
│                    Pinia Store (image.js)                    │
│                    (状态管理：图像数据/参数)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 核心文件说明

### Extension 层 (`src/extension/`)

#### `extension.ts` - 扩展入口
- **职责**：扩展激活/停用、注册命令和编辑器提供者
- **关键函数**：
  - `activate(context)` - 激活扩展，注册 `.raw` 和 `.bin` 文件处理器
  - `deactivate()` - 停用扩展
- **命令注册**：
  - `raw-image-viewer.helloWorld` - 测试命令
  - `raw-image-viewer.openWithRawViewer` - 用 Raw Viewer 打开文件

#### `provider.ts` - 自定义编辑器提供者
- **类**：`RawImageViewerProvider`
- **职责**：实现 `CustomReadonlyEditorProvider`，管理 Webview 面板和消息通信
- **关键方法**：
  - `register()` - 静态方法，注册编辑器提供者
  - `openCustomDocument()` - 打开文档
  - `resolveCustomEditor()` - 解析编辑器，设置 Webview
  - `getHtmlForWebview()` - 生成 Webview HTML
  - `onMessage()` - 处理 Webview 消息

#### `document.ts` - 文档模型
- **类**：`RawImageDocument`, `Disposable`
- **职责**：表示 RAW 图像文档，管理文件数据
- **关键属性**：
  - `uri` - 文件 URI
  - `documentData` - 文件二进制数据 (Uint8Array)

### Shared 层 (`src/shared/`)

#### `constants.ts` - 常量定义
```typescript
EXTENSION_ID = 'raw-image-viewer'
VIEW_TYPE_RAW = 'raw-image-viewer.rawImage'
VIEW_TYPE_BIN = 'raw-image-viewer.binImage'
CONFIG_KEYS.ENABLE_BIN_SUPPORT = 'raw-image-viewer.enableBinSupport'
SUPPORTED_BITS_PER_PIXEL = [8, 10, 12, 14, 16]
PIXEL_FORMATS = ['grayscale', 'rgb', 'rggb', 'grbg', 'gbrg', 'bggr']
COMMON_RESOLUTIONS = [...] // 常见分辨率预设
```

#### `types.ts` - 类型定义
```typescript
interface WebviewMessage { type, body?, requestId? }
interface InitMessage { type: 'init', body: { value, editable } }
interface ImageParams { width, height, bitsPerPixel, pixelFormat }
interface Resolution { name, width, height }
interface ExtensionConfig { enableBinSupport }
```

#### `utils.ts` - 工具函数
- `calculateRequiredBytes(params)` - 计算图像所需字节数
- `validateImageParams(params, fileSize)` - 验证图像参数

### Webview 层 (`webview/src/`)

#### `App.vue` - 根组件
- **职责**：主布局，协调子组件，处理 VS Code 消息
- **子组件**：`ControlsPanel`, `ImageContainer`, `StatusBar`
- **消息处理**：
  - `init` - 接收图像数据
  - `getFileData` - 返回文件数据

#### `stores/image.js` - Pinia Store
- **状态**：
  - `rawData` - 原始图像数据
  - `width`, `height` - 图像尺寸
  - `bitsPerPixel` - 位深度
  - `pixelFormat` - 像素格式
  - `cursorX`, `cursorY` - 鼠标位置
  - `pixelR`, `pixelG`, `pixelB` - 当前像素颜色
- **方法**：
  - `setRawData(data)` - 设置图像数据
  - `validateParams()` - 验证参数

#### `components/controls/ControlsPanel.vue` - 控制面板
- **功能**：
  - 文件信息显示
  - 分辨率设置（常见尺寸快选、手动输入）
  - 位深度选择 (8/10/12/14/16-bit)
  - 像素格式选择
  - 智能分辨率推荐算法
- **事件**：`@applyParams` - 应用参数

#### `components/viewer/ImageContainer.vue` - 图像容器
- **功能**：
  - Canvas 图像渲染
  - 缩放控制 (滚轮/按钮)
  - 拖拽平移
  - 像素信息采集
- **图像处理函数**：
  - `displayRawImage()` - 主渲染入口
  - `processGrayscaleImage()` - 灰度图像处理
  - `processRGBImage()` - RGB 图像处理
  - `processBayerImage()` - Bayer 图像去马赛克

#### `components/status/StatusBar.vue` - 状态栏
- **显示信息**：图像尺寸、像素颜色、鼠标坐标、文件大小

---

## 🔧 构建与开发

### 命令

| 命令 | 说明 |
|------|-----|
| `npm run compile` | 编译 TypeScript |
| `npm run watch` | 监视模式编译 |
| `npm run build` | 完整构建 (扩展 + Webview) |
| `npm run build:webview` | 仅构建 Webview |
| `npm run dev` | Webview 开发服务器 |
| `npm run test` | 运行测试 |
| `npm run package` | 打包 .vsix |
| `npm run release:patch` | 发布补丁版本 |

### 构建流程
```
1. npm run compile      → src/extension/*.ts → out/extension/*.js
2. npm run build:webview → webview/src/* → dist/webview/*
3. vsce package         → *.vsix
```

### 配置文件

| 文件 | 用途 |
|------|-----|
| `config/tsconfig.json` | TypeScript 编译配置 |
| `webview/vite.config.js` | Vite 构建配置 |
| `package.json` | NPM 配置、VS Code 扩展声明 |

---

## 🔌 VS Code 扩展配置 (package.json)

### 自定义编辑器
```json
{
  "viewType": "raw-image-viewer.rawImage",
  "displayName": "Raw Image Viewer",
  "selector": [{ "filenamePattern": "*.raw" }]
},
{
  "viewType": "raw-image-viewer.binImage", 
  "displayName": "Raw Image Viewer",
  "selector": [{ "filenamePattern": "*.bin" }]
}
```

### 配置项
```json
"raw-image-viewer.enableBinSupport": {
  "type": "boolean",
  "default": true,
  "description": "Enable support for .bin files as raw image files"
}
```

### 右键菜单
- 资源管理器中 `.bin` 文件右键菜单
- 编辑器标题栏菜单

---

## 📨 消息通信协议

### Extension → Webview
| 类型 | 数据 | 说明 |
|------|-----|-----|
| `init` | `{ value: Uint8Array, editable: boolean }` | 初始化图像数据 |

### Webview → Extension
| 类型 | 数据 | 说明 |
|------|-----|-----|
| `ready` | - | Webview 就绪 |
| `response` | `{ requestId, body }` | 响应请求 |

---

## 🖼️ 图像处理

### 支持的格式
| 格式 | 说明 |
|------|-----|
| Grayscale | 灰度图像 |
| RGB | 三通道彩色 |
| RGGB | Bayer 模式 (Red-Green-Green-Blue) |
| GRBG | Bayer 模式 (Green-Red-Blue-Green) |
| GBRG | Bayer 模式 (Green-Blue-Red-Green) |
| BGGR | Bayer 模式 (Blue-Green-Green-Red) |

### 位深度
- 8-bit, 10-bit, 12-bit, 14-bit, 16-bit
- 小端序字节排列

### 分辨率智能推荐
- 基于文件大小自动计算可能的分辨率
- 支持标准宽高比：16:9, 16:10, 4:3, 3:2, 1:1 等
- 预设常见分辨率：VGA, HD, FHD, 4K, 8K 及 IMX 系列传感器

---

## 🧪 测试

### 测试文件
- `src/test/suite/extension.test.ts` - 扩展功能测试

### 测试覆盖
- 配置键定义验证
- 扩展激活验证
- 导出函数验证

---

## 📦 发布

### 自动化发布 (GitHub Actions)
1. 运行 `npm run release:patch|minor|major`
2. 推送标签 `git push origin v<version>`
3. GitHub Actions 自动构建并发布到 VS Code Marketplace

### 手动发布
```bash
npm run package
vsce publish
```

---

## 🔑 关键依赖

### 扩展依赖
| 包 | 版本 | 用途 |
|-----|------|-----|
| typescript | ^5.4.5 | TypeScript 编译器 |
| @types/vscode | ^1.91.0 | VS Code API 类型 |
| @vscode/test-electron | ^2.4.0 | 扩展测试 |

### Webview 依赖
| 包 | 版本 | 用途 |
|-----|------|-----|
| vue | ^3.4.27 | UI 框架 |
| pinia | ^3.0.3 | 状态管理 |
| vite | ^5.4.19 | 构建工具 |

---

## 💡 开发提示

1. **修改 Webview 后**：运行 `npm run build:webview` 重新构建
2. **调试扩展**：按 F5 启动扩展开发主机
3. **查看 Webview 控制台**：在开发主机中按 Ctrl+Shift+I
4. **共享代码**：放在 `src/shared/` 目录，扩展和 Webview 都可引用
5. **添加新像素格式**：修改 `constants.ts` 和 `ImageContainer.vue`

---

*最后更新: 2025-11-29*