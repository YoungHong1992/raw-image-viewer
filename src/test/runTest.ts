import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    // 扩展的根目录
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    // 测试入口点
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    // 运行测试
    await runTests({ 
      extensionDevelopmentPath, 
      extensionTestsPath 
    });
  } catch (err) {
    console.error('Failed to run tests', err);
    process.exit(1);
  }
}

main();