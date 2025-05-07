# Raw Image Viewer

A Visual Studio Code extension for viewing RAW image files directly in the editor.

[English](#english) | [中文](#chinese)

<a id="english"></a>

## English

### Features

- View RAW image files (*.raw) directly in VS Code
- Customize image parameters:
  - Width
  - Height
  - Bits per pixel (1-16 bit)
- Real-time parameter adjustment
- Grayscale visualization of RAW data

### Usage

1. Open any `.raw` file in VS Code
2. The Raw Image Viewer will automatically open
3. Adjust the parameters as needed:
   - Width: Set the image width in pixels
   - Height: Set the image height in pixels
   - Bits per pixel: Set the bit depth (1-16)
4. Click "Apply Parameters" to update the view

### Requirements

- Visual Studio Code 1.91.0 or higher

### Example Files

The extension includes several example RAW files in the `exampleFiles` folder that you can use to test the viewer.

### Known Issues

- Currently only supports grayscale RAW images
- Assumes little-endian byte order for multi-byte pixels

### Release Notes

#### 0.0.1

- Initial release
- Basic RAW image viewing functionality
- Customizable width, height, and bit depth

---

<a id="chinese"></a>

## 中文

### 功能特点

- 直接在VS Code中查看RAW图像文件（*.raw）
- 自定义图像参数：
  - 宽度
  - 高度
  - 每像素位数（1-16位）
- 实时参数调整
- RAW数据的灰度可视化

### 使用方法

1. 在VS Code中打开任意`.raw`文件
2. Raw Image Viewer将自动打开
3. 根据需要调整参数：
   - 宽度：设置图像宽度（像素）
   - 高度：设置图像高度（像素）
   - 每像素位数：设置位深度（1-16）
4. 点击"应用参数"更新视图

### 系统要求

- Visual Studio Code 1.91.0 或更高版本

### 示例文件

扩展包含`exampleFiles`文件夹中的几个示例RAW文件，您可以用它们来测试查看器。

### 已知问题

- 目前仅支持灰度RAW图像
- 对于多字节像素，假定为小端字节序

### 发布说明

#### 0.0.1

- 初始版本
- 基本的RAW图像查看功能
- 可自定义宽度、高度和位深度
