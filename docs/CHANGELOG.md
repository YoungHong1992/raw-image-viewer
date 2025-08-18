# Change Log

All notable changes to the "raw-image-viewer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

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