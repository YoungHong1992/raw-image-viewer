# Raw Image Viewer

Advanced RAW image viewer for VS Code with smart resolution recommendations and multiple pixel format support.

## 项目结构

经过重构后，项目采用清晰的模块化结构：

```
raw-image-viewer/
├── src/                          # VSCode扩展核心代码
│   ├── extension/                # 扩展主体
│   │   ├── extension.ts         # 扩展入口
│   │   ├── provider.ts          # 自定义编辑器提供者
│   │   └── document.ts          # 文档模型
│   ├── shared/                  # 扩展和webview共享代码
│   │   ├── types.ts            # 类型定义
│   │   ├── constants.ts        # 常量定义
│   │   └── utils.ts            # 工具函数
│   └── test/                   # 测试代码
├── webview/                     # Vue webview应用
│   ├── src/
│   │   ├── components/         # Vue组件
│   │   │   ├── controls/       # 控制面板相关组件
│   │   │   ├── viewer/         # 图像查看器组件
│   │   │   └── status/         # 状态栏组件
│   │   ├── stores/            # Pinia状态管理
│   │   ├── App.vue            # 根组件
│   │   └── main.js            # 入口文件
│   └── public/
│       └── index.html
├── examples/                   # 示例RAW文件
├── tools/                      # 工具脚本
│   ├── mipi10-converter/      # MIPI10转换工具
│   └── release.js             # 发布脚本
├── config/                     # 配置文件
│   ├── .eslintrc.json
│   └── tsconfig.json
└── docs/                      # 文档
    ├── README.md
    ├── CHANGELOG.md
    └── RELEASE.md
```

## 架构设计原则

### 1. 单一职责
- **扩展层** (`src/extension/`): 负责VSCode API集成和文件管理
- **共享层** (`src/shared/`): 定义通用类型和工具函数
- **UI层** (`webview/`): 负责用户界面和图像渲染

### 2. 清晰边界
- 扩展逻辑和UI逻辑完全分离
- 通过消息传递进行通信
- 共享代码避免重复定义

### 3. 零破坏性
- 保持所有现有VSCode API不变
- 向后兼容现有功能
- 文件格式支持不变

## 开发指南

### 构建项目

```bash
# 安装依赖
npm install

# 编译扩展
npm run compile

# 构建webview
npm run build-webview

# 完整构建
npm run vscode:prepublish
```

### 开发模式

```bash
# 监听扩展代码变化
npm run watch-extension

# 开发webview
npm run dev-webview
```

### 测试

```bash
# 运行测试
npm test

# 代码检查
npm run lint
```

## 支持的格式

- **位深度**: 8, 10, 12, 14, 16 bit
- **像素格式**: 
  - Grayscale (灰度)
  - RGB
  - Bayer patterns: RGGB, GRBG, GBRG, BGGR

## 功能特性

- 智能分辨率推荐
- 实时像素值显示
- 多种像素格式支持
- 缩放和平移
- 参数验证和错误提示

## 重构改进

1. **文件组织**: 从混乱的`media/`目录重构为清晰的`webview/`结构
2. **模块化**: 将大文件拆分为职责单一的小模块
3. **类型安全**: 添加完整的TypeScript类型定义
4. **代码复用**: 提取共享逻辑到`src/shared/`
5. **构建优化**: 分离扩展和webview的构建流程

## 许可证

MIT License