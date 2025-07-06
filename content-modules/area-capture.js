/**
 * Area Capture Module
 * Handles area selection overlay and user interaction for screenshot capture
 */

class AreaCapture {
    constructor(documentRef = null) {
        this.isActive = false;
        this.isDrawing = false;
        this.overlay = null;
        this.selectionBox = null;
        this.startX = 0;
        this.startY = 0;
        this.endX = 0;
        this.endY = 0;
        this.onCompleteCallback = null;
        this.onCancelCallback = null;
        
        // Allow dependency injection for testing
        this.doc = documentRef || document;
        
        // Bind methods to maintain context
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    /**
     * Start area selection process
     * @param {Function} onComplete - Callback when area is selected
     * @param {Function} onCancel - Callback when selection is cancelled
     */
    start(onComplete, onCancel) {
        if (this.isActive) {
            throw new Error('Area capture is already active');
        }

        this.onCompleteCallback = onComplete;
        this.onCancelCallback = onCancel;
        this.isActive = true;

        this.createOverlay();
        this.attachEventListeners();
    }

    /**
     * Stop area selection and cleanup
     */
    stop() {
        if (!this.isActive) {
            return;
        }

        this.detachEventListeners();
        this.removeOverlay();
        this.reset();
    }

    /**
     * Cancel the current selection
     */
    cancel() {
        const callback = this.onCancelCallback;
        this.stop();
        if (callback) {
            callback();
        }
    }

    /**
     * Create the overlay elements
     */
    createOverlay() {
        // Create main overlay
        this.overlay = this.doc.createElement('div');
        this.overlay.id = 'screenshot-ocr-overlay';
        this.setOverlayStyles();

        // Create selection box
        this.selectionBox = this.doc.createElement('div');
        this.selectionBox.id = 'screenshot-ocr-selection';
        this.setSelectionBoxStyles();
        this.selectionBox.style.display = 'none';

        // Create instructions
        const instructions = this.doc.createElement('div');
        instructions.id = 'screenshot-ocr-instructions';
        instructions.textContent = 'Click and drag to select an area. Press ESC to cancel.';
        this.setInstructionsStyles(instructions);

        this.overlay.appendChild(this.selectionBox);
        this.overlay.appendChild(instructions);
        this.doc.body.appendChild(this.overlay);

        // Hide scrollbars during capture
        this.doc.body.style.overflow = 'hidden';
    }

    /**
     * Remove overlay elements
     */
    removeOverlay() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        this.selectionBox = null;

        // Restore scrollbars
        this.doc.body.style.overflow = '';
    }

    /**
     * Set overlay styles
     */
    setOverlayStyles() {
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(0, 0, 0, 0.3);
            z-index: 999999;
            cursor: crosshair;
        `;
    }

    /**
     * Set selection box styles
     */
    setSelectionBoxStyles() {
        this.selectionBox.style.cssText = `
            position: absolute;
            border: 2px solid #007acc;
            background-color: rgba(0, 122, 204, 0.1);
            box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5);
            pointer-events: none;
        `;
    }

    /**
     * Set instructions styles
     */
    setInstructionsStyles(element) {
        element.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 1000000;
            pointer-events: none;
        `;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        this.overlay.addEventListener('mousedown', this.handleMouseDown);
        this.doc.addEventListener('mousemove', this.handleMouseMove);
        this.doc.addEventListener('mouseup', this.handleMouseUp);
        this.doc.addEventListener('keydown', this.handleKeyDown);
        
        // Make overlay focusable for keyboard events
        this.overlay.setAttribute('tabindex', '0');
        this.overlay.focus();
    }

    /**
     * Detach event listeners
     */
    detachEventListeners() {
        if (this.overlay) {
            this.overlay.removeEventListener('mousedown', this.handleMouseDown);
        }
        this.doc.removeEventListener('mousemove', this.handleMouseMove);
        this.doc.removeEventListener('mouseup', this.handleMouseUp);
        this.doc.removeEventListener('keydown', this.handleKeyDown);
    }

    /**
     * Handle mouse down event
     */
    handleMouseDown(event) {
        if (!this.isActive) return;
        
        event.preventDefault();
        this.isDrawing = true;
        
        this.startX = event.clientX;
        this.startY = event.clientY;
        this.endX = event.clientX;
        this.endY = event.clientY;
        
        this.updateSelectionBox();
        this.selectionBox.style.display = 'block';
    }

    /**
     * Handle mouse move event
     */
    handleMouseMove(event) {
        if (!this.isActive || !this.isDrawing) return;
        
        this.endX = event.clientX;
        this.endY = event.clientY;
        
        this.updateSelectionBox();
    }

    /**
     * Handle mouse up event
     */
    handleMouseUp(event) {
        if (!this.isActive || !this.isDrawing) return;
        
        this.isDrawing = false;
        
        const area = this.getSelectedArea();
        
        // Validate selection size
        if (area.width < 10 || area.height < 10) {
            this.showError('Selection too small. Please select a larger area.');
            this.selectionBox.style.display = 'none';
            return;
        }
        
        this.completeSelection(area);
    }

    /**
     * Handle keyboard events
     */
    handleKeyDown(event) {
        if (!this.isActive) return;
        
        if (event.key === 'Escape') {
            event.preventDefault();
            this.cancel();
        }
    }

    /**
     * Update selection box position and size
     */
    updateSelectionBox() {
        if (!this.selectionBox) return;
        
        const left = Math.min(this.startX, this.endX);
        const top = Math.min(this.startY, this.endY);
        const width = Math.abs(this.endX - this.startX);
        const height = Math.abs(this.endY - this.startY);
        
        this.selectionBox.style.left = `${left}px`;
        this.selectionBox.style.top = `${top}px`;
        this.selectionBox.style.width = `${width}px`;
        this.selectionBox.style.height = `${height}px`;
    }

    /**
     * Get the selected area coordinates
     * @returns {Object} Area coordinates and dimensions
     */
    getSelectedArea() {
        const left = Math.min(this.startX, this.endX);
        const top = Math.min(this.startY, this.endY);
        const width = Math.abs(this.endX - this.startX);
        const height = Math.abs(this.endY - this.startY);
        
        return {
            x: left,
            y: top,
            width,
            height
        };
    }

    /**
     * Complete the selection process
     * @param {Object} area - Selected area coordinates
     */
    completeSelection(area) {
        const callback = this.onCompleteCallback;
        this.stop();
        if (callback) {
            callback(area);
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #ff4444;
            color: white;
            padding: 15px 25px;
            border-radius: 5px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 1000001;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        errorDiv.textContent = message;
        
        this.doc.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 3000);
    }

    /**
     * Reset internal state
     */
    reset() {
        this.isActive = false;
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.endX = 0;
        this.endY = 0;
        this.onCompleteCallback = null;
        this.onCancelCallback = null;
    }

    /**
     * Get current state for debugging
     */
    getState() {
        return {
            isActive: this.isActive,
            isDrawing: this.isDrawing,
            hasOverlay: !!this.overlay,
            hasSelectionBox: !!this.selectionBox,
            coordinates: {
                startX: this.startX,
                startY: this.startY,
                endX: this.endX,
                endY: this.endY
            }
        };
    }
}

// Export for use in content script and tests
window.AreaCapture = AreaCapture;