#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 读取当前版本
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const currentVersion = packageJson.version;

console.log(`当前版本: ${currentVersion}`);

// 获取版本类型参数
const versionType = process.argv[2] || 'patch';
const validTypes = ['major', 'minor', 'patch'];

if (!validTypes.includes(versionType)) {
  console.error(`无效的版本类型: ${versionType}`);
  console.error(`有效类型: ${validTypes.join(', ')}`);
  process.exit(1);
}

try {
  // 更新版本号
  console.log(`更新版本类型: ${versionType}`);
  execSync(`npm version ${versionType} --no-git-tag-version`, { stdio: 'inherit' });
  
  // 读取新版本
  const updatedPackageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const newVersion = updatedPackageJson.version;
  
  console.log(`新版本: ${newVersion}`);
  
  // 提交更改
  execSync('git add package.json', { stdio: 'inherit' });
  execSync(`git commit -m "Bump version to ${newVersion}"`, { stdio: 'inherit' });
  
  // 创建标签
  execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { stdio: 'inherit' });
  
  console.log(`✅ 版本已更新到 ${newVersion}`);
  console.log(`📝 提交信息: "Bump version to ${newVersion}"`);
  console.log(`🏷️  标签已创建: v${newVersion}`);
  console.log(`\n🚀 推送到远程仓库:`);
  console.log(`   git push origin main`);
  console.log(`   git push origin v${newVersion}`);
  
} catch (error) {
  console.error('❌ 发布失败:', error.message);
  process.exit(1);
}