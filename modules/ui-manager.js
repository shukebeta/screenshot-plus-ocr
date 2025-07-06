/**
 * UI Manager Module
 * Handles popup UI state management and user interactions
 */

class UIManager {
    constructor() {
        this.elements = {};
        this.state = {
            isCapturing: false,
            hasScreenshot: false,
            isProcessing: false
        };
        this.callbacks = {};
    }

    /**
     * Initialize UI elements and event listeners
     */
    initialize() {
        console.log('UIManager: Initializing');
        this.cacheElements();
        this.setupEventListeners();
        this.updateUI();
    }

    /**
     * Cache DOM elements for faster access
     */
    cacheElements() {
        this.elements = {
            captureBtn: document.getElementById('captureBtn'),
            captureFullBtn: document.getElementById('captureFullBtn'),
            ocrBtn: document.getElementById('ocrBtn'),
            apiKeyInput: document.getElementById('apiKey'),
            modelSelect: document.getElementById('modelSelect'),
            resultDiv: document.getElementById('result'),
            resultText: document.getElementById('resultText'),
            loading: document.getElementById('loading')
        };

        // Validate required elements
        const requiredElements = ['captureBtn', 'captureFullBtn', 'ocrBtn', 'apiKeyInput', 'modelSelect'];
        for (const elementName of requiredElements) {
            if (!this.elements[elementName]) {
                console.error(`UIManager: Required element '${elementName}' not found`);
            }
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Area capture button
        if (this.elements.captureBtn) {
            this.elements.captureBtn.addEventListener('click', () => {
                this.handleAreaCapture();
            });
        }

        // Full page capture button
        if (this.elements.captureFullBtn) {
            this.elements.captureFullBtn.addEventListener('click', () => {
                this.handleFullPageCapture();
            });
        }

        // OCR button
        if (this.elements.ocrBtn) {
            this.elements.ocrBtn.addEventListener('click', () => {
                this.handleOCR();
            });
        }

        // API key change
        if (this.elements.apiKeyInput) {
            this.elements.apiKeyInput.addEventListener('change', () => {
                this.handleAPIKeyChange();
            });
        }

        // Model selection change
        if (this.elements.modelSelect) {
            this.elements.modelSelect.addEventListener('change', () => {
                this.handleModelChange();
            });
        }
    }

    /**
     * Register event callbacks
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    /**
     * Emit event to registered callbacks
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`UIManager: Error in callback for event '${event}':`, error);
                }
            });
        }
    }

    /**
     * Handle area capture button click
     */
    handleAreaCapture() {
        console.log('UIManager: Area capture requested');
        this.setState({isCapturing: true});
        this.emit('areaCapture');
    }

    /**
     * Handle full page capture button click
     */
    handleFullPageCapture() {
        console.log('UIManager: Full page capture requested');
        this.setState({isCapturing: true});
        this.emit('fullPageCapture');
    }

    /**
     * Handle OCR button click
     */
    handleOCR() {
        console.log('UIManager: OCR requested');
        const apiKey = this.getAPIKey();
        const model = this.getSelectedModel();

        if (!apiKey) {
            this.showError('Please enter your OpenRouter API key');
            return;
        }

        this.setState({isProcessing: true});
        this.emit('ocr', {apiKey, model});
    }

    /**
     * Handle API key change
     */
    handleAPIKeyChange() {
        const apiKey = this.elements.apiKeyInput.value.trim();
        console.log('UIManager: API key changed');
        this.emit('apiKeyChange', apiKey);
    }

    /**
     * Handle model selection change
     */
    handleModelChange() {
        const model = this.elements.modelSelect.value;
        console.log('UIManager: Model changed to:', model);
        this.emit('modelChange', model);
    }

    /**
     * Update UI state
     * @param {Object} newState - New state properties
     */
    setState(newState) {
        Object.assign(this.state, newState);
        this.updateUI();
    }

    /**
     * Update UI based on current state
     */
    updateUI() {
        // Update capture buttons
        if (this.elements.captureBtn) {
            this.elements.captureBtn.disabled = this.state.isCapturing || this.state.isProcessing;
            this.elements.captureBtn.textContent = this.state.isCapturing 
                ? 'Capturing...' 
                : 'Capture Screenshot (Area Select)';
        }

        if (this.elements.captureFullBtn) {
            this.elements.captureFullBtn.disabled = this.state.isCapturing || this.state.isProcessing;
            this.elements.captureFullBtn.textContent = this.state.isCapturing 
                ? 'Capturing...' 
                : 'Capture Full Page';
        }

        // Update OCR button
        if (this.elements.ocrBtn) {
            this.elements.ocrBtn.disabled = !this.state.hasScreenshot || this.state.isProcessing;
            this.elements.ocrBtn.textContent = this.state.isProcessing 
                ? 'Processing...' 
                : 'Extract Text (OCR)';
            
            // Show/hide OCR button
            if (this.state.hasScreenshot) {
                this.elements.ocrBtn.classList.remove('hidden');
            } else {
                this.elements.ocrBtn.classList.add('hidden');
            }
        }

        // Update loading indicator
        if (this.elements.loading) {
            if (this.state.isProcessing) {
                this.elements.loading.classList.remove('hidden');
            } else {
                this.elements.loading.classList.add('hidden');
            }
        }
    }

    /**
     * Show result text
     * @param {string} text - Text to display
     */
    showResult(text) {
        if (this.elements.resultText && this.elements.resultDiv) {
            this.elements.resultText.textContent = text;
            this.elements.resultDiv.classList.remove('hidden');
        }
        this.setState({isProcessing: false});
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        console.error('UIManager: Error:', message);
        alert(message); // Simple alert for now, could be improved
        this.setState({isProcessing: false, isCapturing: false});
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        console.log('UIManager: Success:', message);
        alert(message); // Simple alert for now, could be improved
        this.setState({isCapturing: false});
    }

    /**
     * Get API key from input
     * @returns {string} API key
     */
    getAPIKey() {
        return this.elements.apiKeyInput ? this.elements.apiKeyInput.value.trim() : '';
    }

    /**
     * Set API key in input
     * @param {string} apiKey - API key to set
     */
    setAPIKey(apiKey) {
        if (this.elements.apiKeyInput) {
            this.elements.apiKeyInput.value = apiKey || '';
        }
    }

    /**
     * Get selected model
     * @returns {string} Selected model
     */
    getSelectedModel() {
        return this.elements.modelSelect ? this.elements.modelSelect.value : 'openai/gpt-4o';
    }

    /**
     * Set selected model
     * @param {string} model - Model to select
     */
    setSelectedModel(model) {
        if (this.elements.modelSelect && model) {
            this.elements.modelSelect.value = model;
        }
    }

    /**
     * Populate model dropdown
     * @param {Array} models - Array of model objects
     */
    populateModels(models) {
        if (!this.elements.modelSelect) return;

        this.elements.modelSelect.innerHTML = '';
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.label + (model.recommended ? ' (Recommended)' : '');
            this.elements.modelSelect.appendChild(option);
        });
    }

    /**
     * Set screenshot available state
     * @param {boolean} hasScreenshot - Whether screenshot is available
     */
    setScreenshotAvailable(hasScreenshot) {
        this.setState({hasScreenshot});
    }

    /**
     * Reset UI to initial state
     */
    reset() {
        this.setState({
            isCapturing: false,
            hasScreenshot: false,
            isProcessing: false
        });

        if (this.elements.resultDiv) {
            this.elements.resultDiv.classList.add('hidden');
        }
    }
}

// Export for use in other modules
window.UIManager = UIManager;