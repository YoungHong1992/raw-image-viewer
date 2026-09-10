# Change Log

All notable changes to the "raw-image-viewer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Added
- **Selectable storage layouts**: `packed bitstream` and `16-bit container` (little-endian, high-bit aligned) instead of a single fixed byte layout
- **Shared decoding module**: size validation, resolution recommendation, and rendering now live in `src/shared/` and are reused by the extension and the webview
- **Unit test suite** (`npm run test:unit`) covering validation, resolution recommendation, and sample decoding
- **Webview end-to-end suite** (`npm run test:e2e:webview`): Playwright drives the production webview build in a real browser, covering boot, message protocol, zoom, and every pixel format
- **VS Code end-to-end suite** (`npm run test:e2e:vscode`): `vscode-extension-tester` launches a real VS Code window, opens a `.raw` file in the custom editor, and asserts on the rendered webview

### Fixed
- **GBRG and BGGR Bayer patterns now render correctly**: both formats were selectable but produced black pixels; all four Bayer patterns share a single demosaic lookup table
- **Default storage layout aligned with previous releases**: 10/12/14/16 bpp files open as `16-bit container` again, so existing files render as before
- **File size validation restored to a tolerant range**: files up to 50% larger than the exact frame size are accepted again, covering line padding and appended metadata
- **`1:1` zoom did nothing**: the reset handler set the zoom to 100% and then immediately overrode it with the fit-to-window scale, so the button appeared dead
- **Fit-to-window could clamp below 100%**: the zoom range is now always guaranteed to contain `1:1`, so tiny images no longer get stuck at a fractional scale

### Changed
- File size mismatch errors now report the accepted range instead of a single exact size
- `npm test` runs compile, lint, and unit tests; the VS Code host integration tests are available via `npm run test:integration`
- CI and the release workflow also run the webview end-to-end suite on a virtual display

## [0.0.3] - 2025-01-27

### Added
- **Photoshop-like Transparent Background**: Added checkerboard pattern background similar to Photoshop to clearly distinguish image from background
- **Pixel-Perfect Zoom**: Implemented pixel-level zoom functionality (0.1x to 32x) without smoothing, allowing users to see individual pixels clearly
- **Image Dragging**: Added drag functionality for panning around zoomed images using mouse
- **Enhanced Zoom Controls**:
  - Zoom in/out buttons with tooltips
  - 1:1 reset zoom button
  - Fit to window button
  - Ctrl+Mouse wheel zoom support
  - Keyboard shortcuts (Ctrl+Plus, Ctrl+Minus, Ctrl+0)
- **Accurate Mouse Coordinates**: Precise pixel coordinate tracking that works correctly at all zoom levels
- **Smart Minimum Zoom**: Dynamic minimum zoom calculation (50% of fit-to-window scale)

### Enhanced
- **Improved Status Bar**: Fixed status bar to always remain visible and not be affected by other controls
- **Better Image Processing**: Complete implementation of grayscale, RGB, and Bayer image processing functions
- **Responsive Layout**: Fixed layout issues to prevent status bar from being pushed off screen
- **User Experience**: Added proper cursor styles (grab/grabbing) and drag constraints

### Fixed
- Status bar disappearing when image is zoomed in
- Mouse coordinate calculation accuracy at different zoom levels
- Layout stability with proper flex box implementation
- Image positioning and offset calculations

### Technical Improvements
- Complete Vue.js component implementation with all missing functions
- Proper event handling for mouse interactions
- Optimized rendering with pixel-perfect display
- Better memory management for image data

## [0.0.2] - 2025-06-11

### Added
- **Smart Resolution Recommendations**: Automatically analyzes file size and suggests the most likely resolution and bit depth combinations
- **Common Resolution Presets**: Quick access to standard resolutions including:
  - Standard resolutions (VGA, HD, Full HD, 4K UHD, 8K UHD)
  - Camera resolutions (5MP, 8MP, 12MP, 16MP, 20MP)
  - Industrial camera resolutions (IMX290, IMX385, IMX462, IMX464, IMX678)
- **Multiple Pixel Format Support**:
  - Grayscale images
  - RGB images
  - Bayer pattern images (RGGB, GRBG, GBRG, BGGR) with basic demosaicing
- **Enhanced User Interface**:
  - Organized control panels with sections for presets, recommendations, and manual settings
  - Loading indicators during image processing
  - Better visual feedback and hover states
- **File Size Analysis**: Display file size information and use it for intelligent recommendations
- **Improved Error Handling**: Better error messages and user feedback

### Changed
- Completely redesigned user interface with better organization
- Improved image processing with support for different pixel formats
- Enhanced status bar with more information
- Better responsive design for different screen sizes

### Fixed
- Better error handling for insufficient data
- Improved performance for large images
- More accurate bit depth handling

## [0.0.1]

### Added
- Initial release
- Basic RAW image viewing functionality
- Customizable width, height, and bit depth
- Grayscale visualization of RAW data