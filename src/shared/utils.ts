import { ImageParams } from './types';

/**
 * 计算给定参数所需的字节数
 */
export function calculateRequiredBytes(params: ImageParams): number {
  const bytesPerPixel = Math.ceil(params.bitsPerPixel / 8);
  const channelCount = params.pixelFormat === 'rgb' ? 3 : 1;
  return params.width * params.height * bytesPerPixel * channelCount;
}

/**
 * 验证图像参数是否有效
 */
export function validateImageParams(params: ImageParams, fileSize: number): { valid: boolean; error?: string } {
  // 基本参数验证
  if (!params.width || params.width <= 0 || params.width > 32768) {
    return { valid: false, error: '图像宽度无效 (1-32768)' };
  }
  
  if (!params.height || params.height <= 0 || params.height > 32768) {
    return { valid: false, error: '图像高度无效 (1-32768)' };
  }
  
  if (!params.bitsPerPixel || ![8, 10, 12, 14, 16].includes(params.bitsPerPixel)) {
    return { valid: false, error: '位深度无效，支持: 8, 10, 12, 14, 16' };
  }

  if (!params.pixelFormat || !['grayscale', 'rgb', 'rggb', 'grbg', 'gbrg', 'bggr'].includes(params.pixelFormat)) {
    return { valid: false, error: '像素格式无效' };
  }

  // 计算所需字节数
  const requiredBytes = calculateRequiredBytes(params);

  // 检查文件大小
  if (fileSize < requiredBytes) {
    return { valid: false, error: `文件大小不足: 需要 ${requiredBytes} 字节, 实际 ${fileSize} 字节` };
  }

  // 检查是否超出合理范围（允许一定冗余）
  const maxAllowedBytes = requiredBytes * 1.5; // 允许50%冗余
  if (fileSize > maxAllowedBytes) {
    return { valid: false, error: `文件大小异常: 预期约 ${requiredBytes} 字节, 实际 ${fileSize} 字节` };
  }

  return { valid: true };
}