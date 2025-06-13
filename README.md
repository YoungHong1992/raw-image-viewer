# Raw Image Viewer

A Visual Studio Code extension for viewing RAW image files directly in the editor.

[English](#english) | [中文](#chinese)

<a id="english"></a>

## English

### Features

- View RAW image files (*.raw) directly in VS Code
- **Smart Resolution Recommendations**: Automatically suggests possible resolution and bit depth combinations based on file size
- **Common Resolution Presets**: Quick access to standard resolutions (VGA, HD, 4K, camera resolutions, etc.)
- **Multiple Pixel Formats Support**:
  - Grayscale images
  - RGB images
  - Bayer pattern images (RGGB, GRBG, GBRG, BGGR) with basic demosaicing
- **Advanced Zoom & Pan Features**:
  - Pixel-perfect zoom (0.1x to 32x) without smoothing
  - Photoshop-like transparent checkerboard background
  - Drag to pan around zoomed images
  - Multiple zoom controls (buttons, mouse wheel, keyboard shortcuts)
  - Smart minimum zoom (50% of fit-to-window)
- **Precise Mouse Tracking**: Accurate pixel coordinates and RGB values at all zoom levels
- **Persistent Status Bar**: Always visible status bar with image info, pixel data, and coordinates
- Customize image parameters:
  - Width and Height
  - Bits per pixel (8, 10, 12, 14, 16 bit)
  - Pixel format selection
- Real-time parameter adjustment with loading indicators
- Enhanced user interface with organized control panels
- File size display and analysis

### Usage

1. Open any `.raw` file in VS Code
2. The Raw Image Viewer will automatically open
3. **Smart Recommendations**: The viewer will automatically analyze the file size and suggest the most likely resolution and bit depth combinations
4. **Quick Presets**: Choose from common resolution presets for quick setup
5. **Manual Adjustment**: Fine-tune parameters as needed:
   - Width: Set the image width in pixels
   - Height: Set the image height in pixels
   - Bits per pixel: Select from 8, 10, 12, 14, or 16 bit
   - Pixel format: Choose between grayscale, RGB, or Bayer patterns
6. Click "Apply Parameters" to update the view
7. **Real-time Feedback**: Mouse over the image to see pixel values and coordinates
8. **Zoom & Pan**:
   - Use zoom controls or Ctrl+Mouse wheel to zoom in/out
   - Drag the image to pan when zoomed in
   - Use keyboard shortcuts: Ctrl+Plus (zoom in), Ctrl+Minus (zoom out), Ctrl+0 (reset)

### Requirements

- Visual Studio Code 1.91.0 or higher

### Example Files

The extension includes several example RAW files in the `exampleFiles` folder that you can use to test the viewer.

### Known Issues

- Bayer demosaicing uses a simple algorithm (may not be optimal for all images)
- Assumes little-endian byte order for multi-byte pixels
- Large images may take time to process

### Release Notes

#### 0.0.3 (Latest)

- **NEW**: Photoshop-like transparent checkerboard background
- **NEW**: Pixel-perfect zoom (0.1x to 32x) without smoothing
- **NEW**: Drag functionality for panning around zoomed images
- **NEW**: Enhanced zoom controls with multiple input methods
- **NEW**: Accurate mouse coordinate tracking at all zoom levels
- **NEW**: Smart minimum zoom calculation (50% of fit-to-window)
- **FIXED**: Status bar now always remains visible
- **IMPROVED**: Better layout stability and user experience

#### 0.0.2

- **NEW**: Smart resolution recommendations based on file size
- **NEW**: Common resolution presets (VGA, HD, 4K, camera resolutions)
- **NEW**: Multiple pixel format support (RGB, Bayer patterns)
- **NEW**: Enhanced UI with organized control panels
- **NEW**: Loading indicators and better error handling
- **NEW**: File size analysis and display
- **IMPROVED**: Better user experience with automatic parameter suggestions

#### 0.0.1

- Initial release
- Basic RAW image viewing functionality
- Customizable width, height, and bit depth

---

<a id="chinese"></a>

## 中文

### 功能特点

- 直接在VS Code中查看RAW图像文件（*.raw）
- **智能分辨率推荐**：根据文件大小自动推荐可能的分辨率和位深组合
- **常用分辨率预设**：快速访问标准分辨率（VGA、HD、4K、相机分辨率等）
- **多种像素格式支持**：
  - 灰度图像
  - RGB图像
  - Bayer模式图像（RGGB、GRBG、GBRG、BGGR）带基础去马赛克
- **高级缩放和平移功能**：
  - 像素级缩放（0.1x到32x），无平滑处理
  - 类似Photoshop的透明格子背景
  - 拖拽平移放大后的图像
  - 多种缩放控制方式（按钮、鼠标滚轮、键盘快捷键）
  - 智能最小缩放（适应窗口的50%）
- **精确鼠标追踪**：在所有缩放级别下准确显示像素坐标和RGB值
- **持久状态栏**：始终可见的状态栏，显示图像信息、像素数据和坐标
- 自定义图像参数：
  - 宽度和高度
  - 每像素位数（8、10、12、14、16位）
  - 像素格式选择
- 带加载指示器的实时参数调整
- 增强的用户界面，带有组织化的控制面板
- 文件大小显示和分析

### 使用方法

1. 在VS Code中打开任意`.raw`文件
2. Raw Image Viewer将自动打开
3. **智能推荐**：查看器将自动分析文件大小并推荐最可能的分辨率和位深组合
4. **快速预设**：从常用分辨率预设中选择以快速设置
5. **手动调整**：根据需要微调参数：
   - 宽度：设置图像宽度（像素）
   - 高度：设置图像高度（像素）
   - 每像素位数：从8、10、12、14或16位中选择
   - 像素格式：在灰度、RGB或Bayer模式之间选择
6. 点击"应用参数"更新视图
7. **实时反馈**：将鼠标悬停在图像上查看像素值和坐标
8. **缩放和平移**：
   - 使用缩放控件或Ctrl+鼠标滚轮进行缩放
   - 放大时拖拽图像进行平移
   - 使用键盘快捷键：Ctrl+加号（放大）、Ctrl+减号（缩小）、Ctrl+0（重置）

### 系统要求

- Visual Studio Code 1.91.0 或更高版本

### 示例文件

扩展包含`exampleFiles`文件夹中的几个示例RAW文件，您可以用它们来测试查看器。

### 已知问题

- Bayer去马赛克使用简单算法（可能不适用于所有图像）
- 对于多字节像素，假定为小端字节序
- 大图像可能需要时间处理

### 发布说明

#### 0.0.3（最新版本）

- **新增**：类似Photoshop的透明格子背景
- **新增**：像素级缩放（0.1x到32x），无平滑处理
- **新增**：拖拽功能，可平移放大后的图像
- **新增**：增强的缩放控件，支持多种输入方式
- **新增**：在所有缩放级别下准确的鼠标坐标追踪
- **新增**：智能最小缩放计算（适应窗口的50%）
- **修复**：状态栏现在始终保持可见
- **改进**：更好的布局稳定性和用户体验

#### 0.0.2

- **新增**：基于文件大小的智能分辨率推荐
- **新增**：常用分辨率预设（VGA、HD、4K、相机分辨率）
- **新增**：多种像素格式支持（RGB、Bayer模式）
- **新增**：增强的UI，带有组织化的控制面板
- **新增**：加载指示器和更好的错误处理
- **新增**：文件大小分析和显示
- **改进**：通过自动参数建议提供更好的用户体验

#### 0.0.1

- 初始版本
- 基本的RAW图像查看功能
- 可自定义宽度、高度和位深度
