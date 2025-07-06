/**
 * Main Popup Controller
 * Coordinates between modules for the extension popup
 */

class ScreenshotOCRPopup {
    constructor() {
        this.modules = {};
        this.currentScreenshot = null;
    }

    /**
     * Initialize the popup application
     */
    async initialize() {
        console.log('ScreenshotOCRPopup: Initializing');
        
        try {
            // Initialize modules
            this.initializeModules();
            
            // Setup module event handlers
            this.setupModuleHandlers();
            
            // Load saved settings and check for screenshots
            await this.loadInitialState();
            
            console.log('ScreenshotOCRPopup: Initialization complete');
        } catch (error) {
            console.error('ScreenshotOCRPopup: Initialization failed:', error);
            this.modules.ui?.showError('Failed to initialize extension');
        }
    }

    /**
     * Initialize all modules
     */
    initializeModules() {
        this.modules = {
            storage: new StorageManager(),
            clipboard: new ClipboardManager(),
            ocr: new OCRService(),
            screenshot: new ScreenshotCapture(),
            ui: new UIManager()
        };

        // Initialize modules that need setup
        this.modules.storage.initialize();
        this.modules.ui.initialize();
        
        // Populate UI with supported models
        const models = this.modules.ocr.getSupportedModels();
        this.modules.ui.populateModels(models);
    }

    /**
     * Setup event handlers between modules
     */
    setupModuleHandlers() {
        // UI event handlers
        this.modules.ui.on('areaCapture', () => this.handleAreaCapture());
        this.modules.ui.on('fullPageCapture', () => this.handleFullPageCapture());
        this.modules.ui.on('ocr', (data) => this.handleOCR(data));
        this.modules.ui.on('apiKeyChange', (apiKey) => this.handleAPIKeyChange(apiKey));
        this.modules.ui.on('modelChange', (model) => this.handleModelChange(model));

        // Storage event handlers (screenshot updates)
        window.addEventListener('screenshotUpdated', (event) => {
            this.handleScreenshotUpdate(event.detail.imageData);
        });

        // Settings update handler
        window.addEventListener('settingsUpdated', (event) => {
            this.handleSettingsUpdate(event.detail.changes);
        });
    }

    /**
     * Load initial state from storage
     */
    async loadInitialState() {
        try {
            // Load API key and model
            const [apiKey, model] = await Promise.all([
                this.modules.storage.getAPIKey(),
                this.modules.storage.getSelectedModel()
            ]);

            this.modules.ui.setAPIKey(apiKey);
            this.modules.ui.setSelectedModel(model);

            // Check for recent screenshots
            const screenshot = await this.modules.storage.getLatestScreenshot();
            if (screenshot) {
                this.currentScreenshot = screenshot.imageData;
                this.modules.ui.setScreenshotAvailable(true);
                console.log('ScreenshotOCRPopup: Found recent screenshot');
            }
        } catch (error) {
            console.error('ScreenshotOCRPopup: Failed to load initial state:', error);
        }
    }

    /**
     * Handle area capture request
     */
    async handleAreaCapture() {
        try {
            console.log('ScreenshotOCRPopup: Starting area capture');
            
            // Start area capture and close popup
            const imageData = await this.modules.screenshot.captureArea();
            window.close(); // Close popup so overlay is visible
            
        } catch (error) {
            console.error('ScreenshotOCRPopup: Area capture failed:', error);
            this.modules.ui.showError(error.message);
        }
    }

    /**
     * Handle full page capture request
     */
    async handleFullPageCapture() {
        try {
            console.log('ScreenshotOCRPopup: Starting full page capture');
            
            const imageData = await this.modules.screenshot.captureFullPage();
            
            // Save screenshot
            await this.modules.storage.saveScreenshot(imageData);
            
            // Copy to clipboard
            await this.modules.clipboard.copyImageToClipboard(imageData);
            
            // Update UI
            this.currentScreenshot = imageData;
            this.modules.ui.setScreenshotAvailable(true);
            this.modules.ui.showSuccess('Screenshot captured and copied to clipboard!');
            
        } catch (error) {
            console.error('ScreenshotOCRPopup: Full page capture failed:', error);
            this.modules.ui.showError(error.message);
        }
    }

    /**
     * Handle OCR request
     */
    async handleOCR({apiKey, model}) {
        try {
            if (!this.currentScreenshot) {
                throw new Error('No screenshot available');
            }

            console.log('ScreenshotOCRPopup: Starting OCR with model:', model);
            
            const extractedText = await this.modules.ocr.extractText(
                this.currentScreenshot, 
                apiKey, 
                model
            );
            
            // Show result
            this.modules.ui.showResult(extractedText);
            
            // Copy text to clipboard
            await this.modules.clipboard.copyTextToClipboard(extractedText);
            
            console.log('ScreenshotOCRPopup: OCR completed successfully');
            
        } catch (error) {
            console.error('ScreenshotOCRPopup: OCR failed:', error);
            this.modules.ui.showError(error.message);
        }
    }

    /**
     * Handle API key change
     */
    async handleAPIKeyChange(apiKey) {
        try {
            await this.modules.storage.saveAPIKey(apiKey);
            console.log('ScreenshotOCRPopup: API key saved');
        } catch (error) {
            console.error('ScreenshotOCRPopup: Failed to save API key:', error);
        }
    }

    /**
     * Handle model change
     */
    async handleModelChange(model) {
        try {
            await this.modules.storage.saveSelectedModel(model);
            console.log('ScreenshotOCRPopup: Model saved:', model);
        } catch (error) {
            console.error('ScreenshotOCRPopup: Failed to save model:', error);
        }
    }

    /**
     * Handle screenshot update from storage
     */
    handleScreenshotUpdate(imageData) {
        console.log('ScreenshotOCRPopup: Screenshot updated');
        this.currentScreenshot = imageData;
        this.modules.ui.setScreenshotAvailable(true);
    }

    /**
     * Handle settings update from storage
     */
    handleSettingsUpdate(changes) {
        console.log('ScreenshotOCRPopup: Settings updated:', changes);
        
        if (changes.apiKey) {
            this.modules.ui.setAPIKey(changes.apiKey.newValue);
        }
        
        if (changes.selectedModel) {
            this.modules.ui.setSelectedModel(changes.selectedModel.newValue);
        }
    }

    /**
     * Get current state for debugging
     */
    getDebugInfo() {
        return {
            hasScreenshot: !!this.currentScreenshot,
            modules: Object.keys(this.modules),
            uiState: this.modules.ui?.state
        };
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new ScreenshotOCRPopup();
    app.initialize();
    
    // Make available for debugging
    window.screenshotOCRApp = app;
});