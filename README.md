# Screenshot Plus OCR Chrome Extension

A Chrome extension that captures screenshot areas and extracts text using AI OCR via OpenRouter API.

## Features

- **Area Screenshot Selection**: Drag-to-select specific areas of web pages
- **Automatic Clipboard Copy**: Screenshots are automatically copied to clipboard
- **AI OCR Processing**: Extract text from screenshots using OpenRouter API
- **Modular Architecture**: Clean, testable code with dependency injection
- **Comprehensive Testing**: Unit tests with 100% pass rate

## Architecture

### Core Modules (`/modules/`)
- **StorageManager**: Chrome storage API wrapper with expiry logic
- **ClipboardManager**: Image and text clipboard operations
- **OCRService**: OpenRouter API integration for text extraction
- **ScreenshotCapture**: Screenshot capture coordination
- **UIManager**: Popup UI state management with event system

### Content Script Modules (`/content-modules/`)
- **AreaCapture**: Drag-to-select overlay with user interaction
- **ImageCropper**: Canvas-based image cropping operations

### Core Files
- **manifest.json**: Chrome extension configuration (Manifest V3)
- **popup.html/js**: Extension popup interface
- **content.js**: Content script with modular architecture
- **background.js**: Service worker for screenshot capture

### Testing (`/tests/`)
- **test-runner.html**: Comprehensive unit test suite (40+ tests)
- **integration-test.html**: Integration testing interface

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the project directory

## Usage

1. Click the extension icon in the Chrome toolbar
2. Configure your OpenRouter API key in the popup
3. Click "Capture Area" to start area selection
4. Drag to select the area you want to capture
5. The screenshot will be automatically copied to your clipboard
6. Use "Extract Text" to get OCR results from the captured image

## API Configuration

Set your OpenRouter API key in the extension popup. Supported models:
- GPT-4o Vision
- Claude 3.5 Sonnet
- Gemini 1.5 Pro Vision

## Development

### Running Tests
Open `tests/test-runner.html` in a web browser to run the unit test suite.

### Integration Testing
Open `integration-test.html` to test component integration.

### File Structure
```
screenshot-ocr/
├── manifest.json
├── popup.html
├── popup.js
├── content.js
├── background.js
├── modules/
│   ├── storage-manager.js
│   ├── clipboard-manager.js
│   ├── ocr-service.js
│   ├── screenshot-capture.js
│   └── ui-manager.js
├── content-modules/
│   ├── area-capture.js
│   └── image-cropper.js
└── tests/
    └── test-runner.html
```

## Technical Implementation

### Design Patterns
- **Modular Architecture**: Separation of concerns with clear module boundaries
- **Dependency Injection**: Testable design with mock support
- **Event-Driven Architecture**: Loose coupling between components
- **Promise-Based APIs**: Async operations with proper error handling

### Key Features
- **Manifest V3 Compatibility**: Uses service workers and modern Chrome APIs
- **Canvas-Based Cropping**: High-quality image processing in content script
- **Chrome Storage Integration**: Persistent settings and screenshot history
- **Error Handling**: Comprehensive error handling and user feedback

### Testing Strategy
- **Unit Tests**: 40+ tests covering all modules
- **Mock Framework**: DOM and Canvas API mocking for testing
- **Integration Tests**: Component interaction validation
- **Manual Testing**: User workflow verification

## Browser Compatibility

- Chrome 88+ (Manifest V3 support)
- Chromium-based browsers (Edge, Brave, etc.)

## Security

- No sensitive data stored in extension
- API keys stored in Chrome sync storage
- Content Security Policy compliant
- No external script injection

## Performance

- Modular loading reduces memory footprint
- Efficient image processing with Canvas API
- Minimal DOM manipulation
- Optimized event handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: Open `tests/test-runner.html`
4. Submit a pull request

## License

This project is open source and available under the MIT License.