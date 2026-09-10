# Raw Image Viewer

A Visual Studio Code extension for inspecting raw image buffers with adjustable resolution, bit depth, storage layout, and Bayer decoding.

## Features

- Supports `.raw` files and optional `.bin` files
- Pixel formats: `grayscale`, `rgb`, `rggb`, `grbg`, `gbrg`, `bggr`
- Bit depths: `8`, `10`, `12`, `14`, `16`
- Storage layouts:
  - `packed bitstream`
  - `16-bit container` (little-endian, high-bit aligned)
- Shared size validation and resolution recommendation logic across UI, validation, and rendering
- File-name based parameter hints for common naming patterns such as `3840x2160_14_RGGB.raw`, `w2688_h1520_10bit_RGGB.raw`, and `w2688_h1520_16bit_10msb_RGGB.raw`
- Canvas-based zoom, pan, and pixel inspection

## Supported Data Layouts

The viewer distinguishes between two on-disk layouts:

1. `packed bitstream`: samples are stored back-to-back using the selected bit depth.
2. `16-bit container`: each sample occupies 2 bytes and is interpreted as little-endian with the meaningful bits stored in the high bits.

The extension does not currently provide selectable byte-order modes. The `16-bit container` path always uses the interpretation above.

The initially selected layout follows the bit depth: `8 bpp` files default to `packed bitstream`, while `10/12/14/16 bpp` files default to `16-bit container`, matching the historical behaviour of the viewer. Both layouts remain freely selectable for any bit depth.

## Usage

1. Open a `.raw` file in VS Code.
2. Adjust:
   - image width and height
   - bit depth
   - sample storage layout
   - pixel format
3. Apply the settings to render the frame.

If the file name contains width, height, bit depth, or Bayer pattern hints, the viewer will use them to prefill the controls when possible.

## Development

- `npm run compile`: compile the extension TypeScript
- `npm run build:webview`: build the Vue webview
- `npm run build`: build both extension and webview
- `npm run test`: run compile, lint, and unit tests

### Testing

The project has four test layers:

| Layer | Command | What it covers |
|-------|---------|----------------|
| Unit | `npm run test:unit` | Pure logic: size validation, resolution recommendation, sample decoding |
| Webview E2E | `npm run test:e2e:webview` | Playwright drives the built webview in a real browser (boot, zoom, every pixel format) |
| VS Code E2E | `npm run test:e2e:vscode` | `vscode-extension-tester` launches a real VS Code window and asserts on the custom editor webview |
| Host integration | `npm run test:integration` | Activation and configuration inside the VS Code test host |

`npm run test:e2e:webview` needs the webview to be built first (`npm run build:webview`); on a headless machine prefix it with `xvfb-run -a`.
`npm run test:e2e:vscode` is a local-only check: it packages the extension, installs it into `.test-resources/`, and downloads VS Code on first run.

## License

MIT

---

**Extension ID**: `raw-image-viewer`  
**Publisher**: `YoungHong1992`  
**Version**: `0.0.6`
