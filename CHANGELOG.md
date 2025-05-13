# Change Log

All notable changes to the "raw-image-viewer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

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