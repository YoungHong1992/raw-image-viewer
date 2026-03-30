import * as assert from 'assert';
import { renderRawImage } from '../../shared/imageProcessing';

function packSamplesMsbFirst(samples: number[], bitsPerPixel: number): Uint8Array {
  const totalBits = samples.length * bitsPerPixel;
  const bytes = new Uint8Array(Math.ceil(totalBits / 8));
  let cursor = 0;

  for (const sample of samples) {
    for (let shift = bitsPerPixel - 1; shift >= 0; shift -= 1) {
      const bit = (sample >> shift) & 1;
      const byteIndex = Math.floor(cursor / 8);
      const bitIndex = 7 - (cursor % 8);
      bytes[byteIndex] |= bit << bitIndex;
      cursor += 1;
    }
  }

  return bytes;
}

function packWord16MsbAligned(samples: number[], bitsPerPixel: number): Uint8Array {
  const bytes = new Uint8Array(samples.length * 2);

  samples.forEach((sample, index) => {
    const shifted = bitsPerPixel >= 16 ? sample : sample << (16 - bitsPerPixel);
    bytes[index * 2] = shifted & 0xff;
    bytes[index * 2 + 1] = (shifted >> 8) & 0xff;
  });

  return bytes;
}

function readPixel(pixels: Uint8ClampedArray, width: number, x: number, y: number): [number, number, number, number] {
  const index = (y * width + x) * 4;
  return [
    pixels[index],
    pixels[index + 1],
    pixels[index + 2],
    pixels[index + 3]
  ];
}

suite('Image Processing', () => {
  test('renderRawImage decodes packed 10-bit grayscale samples', () => {
    const data = packSamplesMsbFirst([0, 1023, 512, 256], 10);
    const pixels = renderRawImage(data, {
      width: 2,
      height: 2,
      bitsPerPixel: 10,
      pixelFormat: 'grayscale',
      storageMode: 'packed'
    });

    assert.deepStrictEqual(readPixel(pixels, 2, 0, 0), [0, 0, 0, 255]);
    assert.deepStrictEqual(readPixel(pixels, 2, 1, 0), [255, 255, 255, 255]);
    assert.deepStrictEqual(readPixel(pixels, 2, 0, 1), [127, 127, 127, 255]);
    assert.deepStrictEqual(readPixel(pixels, 2, 1, 1), [63, 63, 63, 255]);
  });

  test('renderRawImage decodes 10-bit samples from a 16-bit container', () => {
    const data = packWord16MsbAligned([0, 1023], 10);
    const pixels = renderRawImage(data, {
      width: 2,
      height: 1,
      bitsPerPixel: 10,
      pixelFormat: 'grayscale',
      storageMode: 'word16'
    });

    assert.deepStrictEqual(readPixel(pixels, 2, 0, 0), [0, 0, 0, 255]);
    assert.deepStrictEqual(readPixel(pixels, 2, 1, 0), [255, 255, 255, 255]);
  });

  test('renderRawImage maps the RGGB Bayer center pixel correctly', () => {
    const data = new Uint8Array([
      200, 50, 220, 40,
      60, 10, 70, 20,
      240, 80, 230, 90,
      30, 15, 35, 25
    ]);

    const pixels = renderRawImage(data, {
      width: 4,
      height: 4,
      bitsPerPixel: 8,
      pixelFormat: 'rggb',
      storageMode: 'packed'
    });

    assert.deepStrictEqual(readPixel(pixels, 4, 1, 1), [223, 65, 10, 255]);
  });

  test('renderRawImage maps the GRBG Bayer center pixel correctly', () => {
    const data = new Uint8Array([
      40, 200, 50, 210,
      10, 60, 20, 65,
      70, 220, 80, 230,
      15, 75, 25, 85
    ]);

    const pixels = renderRawImage(data, {
      width: 4,
      height: 4,
      bitsPerPixel: 8,
      pixelFormat: 'grbg',
      storageMode: 'packed'
    });

    assert.deepStrictEqual(readPixel(pixels, 4, 1, 1), [210, 60, 15, 255]);
  });
});
