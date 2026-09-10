import * as assert from 'assert';
import { MAX_FILE_SIZE_SLACK, calculateRequiredBytes, defaultStorageModeForBitDepth, findRecommendedResolution, isFileSizeCompatible, validateImageParams } from '../../shared/utils';

suite('Shared Utils', () => {
  test('validateImageParams accepts 10-bit samples stored in a 16-bit container', () => {
    const params = {
      width: 2688,
      height: 1520,
      bitsPerPixel: 10,
      pixelFormat: 'rggb' as const,
      storageMode: 'word16' as const
    };

    const result = validateImageParams(params, 8171520, 'en');

    assert.strictEqual(result.valid, true);
  });

  test('validateImageParams rejects packed 10-bit settings for a 16-bit-container file', () => {
    const params = {
      width: 2688,
      height: 1520,
      bitsPerPixel: 10,
      pixelFormat: 'rggb' as const,
      storageMode: 'packed' as const
    };

    const result = validateImageParams(params, 8171520, 'en');

    assert.strictEqual(result.valid, false);
    assert.match(result.error ?? '', /expected 5107200-7660800 bytes/i);
  });

  test('validateImageParams accepts every documented pixel format', () => {
    const formats = ['grayscale', 'rgb', 'rggb', 'grbg', 'gbrg', 'bggr'] as const;

    for (const pixelFormat of formats) {
      const params = {
        width: 64,
        height: 48,
        bitsPerPixel: 8,
        pixelFormat,
        storageMode: 'packed' as const
      };

      const result = validateImageParams(params, calculateRequiredBytes(params), 'en');

      assert.strictEqual(result.valid, true, `${pixelFormat} should be accepted`);
    }
  });

  test('isFileSizeCompatible tolerates trailing padding like the legacy viewer', () => {
    const params = {
      width: 640,
      height: 480,
      bitsPerPixel: 8,
      pixelFormat: 'grayscale' as const,
      storageMode: 'packed' as const
    };
    const requiredBytes = calculateRequiredBytes(params);

    assert.strictEqual(isFileSizeCompatible(params, requiredBytes), true);
    assert.strictEqual(isFileSizeCompatible(params, Math.floor(requiredBytes * (1 + MAX_FILE_SIZE_SLACK))), true);
    assert.strictEqual(isFileSizeCompatible(params, requiredBytes - 1), false);
    assert.strictEqual(isFileSizeCompatible(params, Math.floor(requiredBytes * (1 + MAX_FILE_SIZE_SLACK)) + 1), false);
  });

  test('validateImageParams accepts a padded frame but rejects an oversized one', () => {
    const params = {
      width: 640,
      height: 480,
      bitsPerPixel: 8,
      pixelFormat: 'grayscale' as const,
      storageMode: 'packed' as const
    };
    const padded = calculateRequiredBytes(params) + 1024;

    assert.strictEqual(validateImageParams(params, padded, 'en').valid, true);
    assert.strictEqual(validateImageParams(params, calculateRequiredBytes(params) * 2, 'en').valid, false);
  });

  test('defaultStorageModeForBitDepth mirrors the legacy byte layout', () => {
    assert.strictEqual(defaultStorageModeForBitDepth(8), 'packed');
    assert.strictEqual(defaultStorageModeForBitDepth(10), 'word16');
    assert.strictEqual(defaultStorageModeForBitDepth(12), 'word16');
    assert.strictEqual(defaultStorageModeForBitDepth(14), 'word16');
    assert.strictEqual(defaultStorageModeForBitDepth(16), 'word16');
  });

  test('calculateRequiredBytes includes RGB channel count', () => {
    const bytes = calculateRequiredBytes({
      width: 640,
      height: 480,
      bitsPerPixel: 10,
      pixelFormat: 'rgb',
      storageMode: 'packed'
    });

    assert.strictEqual(bytes, 1152000);
  });

  test('findRecommendedResolution prefers IMX464 for a known 10-bit container sample', () => {
    const resolution = findRecommendedResolution(8171520, 10, 'rggb', 'word16');

    assert.ok(resolution);
    assert.strictEqual(resolution?.width, 2688);
    assert.strictEqual(resolution?.height, 1520);
    assert.strictEqual(resolution?.name, 'IMX464');
  });

  test('findRecommendedResolution matches VGA for a 10-bit container frame', () => {
    const resolution = findRecommendedResolution(614400, 10, 'rggb', 'word16');

    assert.ok(resolution);
    assert.strictEqual(resolution?.width, 640);
    assert.strictEqual(resolution?.height, 480);
    assert.strictEqual(resolution?.name, 'VGA');
  });
});
