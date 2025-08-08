# 自动化发布指南

本项目已配置GitHub Actions自动化工作流，支持自动版本管理、打包和发布到VS Code插件市场。

## 🚀 发布流程

### 方式一：使用发布脚本（推荐）

1. **安装依赖**
   ```bash
   npm install
   ```

2. **运行发布脚本**
   ```bash
   # 补丁版本更新 (0.0.3 -> 0.0.4)
   node scripts/release.js patch
   
   # 次要版本更新 (0.0.3 -> 0.1.0)
   node scripts/release.js minor
   
   # 主要版本更新 (0.0.3 -> 1.0.0)
   node scripts/release.js major
   ```

3. **推送到远程仓库**
   ```bash
   git push origin main
   git push origin v<新版本号>
   ```

### 方式二：手动创建标签

1. **更新版本号**
   ```bash
   npm version patch  # 或 minor/major
   ```

2. **推送标签**
   ```bash
   git push origin main
   git push origin v<版本号>
   ```

## 🔧 配置要求

### GitHub Secrets 设置

在GitHub仓库的 Settings > Secrets and variables > Actions 中添加：

1. **VSCE_PAT** (必需)
   - 用于发布到VS Code插件市场的Personal Access Token
   - 获取方式：
     1. 访问 [Azure DevOps](https://dev.azure.com/)
     2. 创建Personal Access Token
     3. 权限选择：Marketplace > Manage
   - 设置方法：
     ```
     Name: VSCE_PAT
     Value: <你的PAT令牌>
     ```

2. **GITHUB_TOKEN** (自动提供)
   - GitHub自动提供，无需手动设置
   - 用于创建GitHub Release

### 工作流文件说明

- **`.github/workflows/publish.yml`** - 标签触发的发布流程（推荐）
- **`.github/workflows/release.yml`** - 主分支推送触发的完整流程

## 📦 自动化功能

### 当推送标签时会自动执行：

1. ✅ **代码检查和构建**
   - 安装依赖
   - 构建webview
   - 编译扩展

2. ✅ **版本管理**
   - 从Git标签获取版本号
   - 更新package.json版本

3. ✅ **打包发布**
   - 使用vsce打包扩展
   - 创建GitHub Release
   - 上传.vsix文件到Release
   - 发布到VS Code插件市场

## 🎯 发布检查清单

发布前请确认：

- [ ] 代码已提交到main分支
- [ ] 功能测试通过
- [ ] 版本号符合语义化版本规范
- [ ] VSCE_PAT令牌有效且权限正确
- [ ] package.json中的publisher信息正确

## 📋 版本规范

遵循[语义化版本](https://semver.org/lang/zh-CN/)规范：

- **MAJOR版本**：不兼容的API修改
- **MINOR版本**：向下兼容的功能性新增
- **PATCH版本**：向下兼容的问题修正

## 🔍 故障排除

### 常见问题

1. **发布失败：VSCE_PAT无效**
   - 检查PAT令牌是否过期
   - 确认权限包含Marketplace > Manage

2. **构建失败**
   - 检查代码是否有语法错误
   - 确认所有依赖都已正确安装

3. **版本冲突**
   - 确保标签版本号唯一
   - 检查VS Code市场是否已存在该版本

### 查看日志

在GitHub仓库的Actions标签页可以查看详细的构建和发布日志。

## 📞 支持

如有问题，请在GitHub Issues中反馈。