import * as assert from 'assert';
import { calculateRequiredBytes, findRecommendedResolution, validateImageParams } from '../../shared/utils';

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
    assert.match(result.error ?? '', /expected 5107200 bytes/i);
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
