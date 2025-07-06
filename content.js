// Content script for Chrome extension - Modular approach
// Prevent double-loading
if (!window.screenshotOCRLoaded) {
    window.screenshotOCRLoaded = true;
    console.log('Screenshot OCR content script loaded');

    // Check if modules are already loaded from previous injection
    if (!window.AreaCapture || !window.ImageCropper) {
        // Include the modules directly since dynamic loading might fail
        
        // AreaCapture class (simplified inline version)
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
                this.doc = documentRef || document;
                this.originalScrollPosition = null;
                this.preventScroll = null;
                
                this.handleMouseDown = this.handleMouseDown.bind(this);
                this.handleMouseMove = this.handleMouseMove.bind(this);
                this.handleMouseUp = this.handleMouseUp.bind(this);
                this.handleKeyDown = this.handleKeyDown.bind(this);
            }

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

            stop() {
                if (!this.isActive) return;
                this.detachEventListeners();
                this.removeOverlay();
                this.reset();
            }

            cancel() {
                const callback = this.onCancelCallback;
                this.stop();
                if (callback) callback();
            }

            createOverlay() {
                this.overlay = this.doc.createElement('div');
                this.overlay.style.cssText = `
                    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                    background-color: rgba(0, 0, 0, 0.3); z-index: 999999; cursor: crosshair;
                `;
                
                this.selectionBox = this.doc.createElement('div');
                this.selectionBox.style.cssText = `
                    position: absolute; border: 2px solid #007acc;
                    background-color: rgba(0, 122, 204, 0.1); pointer-events: none; display: none;
                `;
                
                const instructions = this.doc.createElement('div');
                instructions.textContent = 'Click and drag to select an area. Press ESC to cancel.';
                instructions.style.cssText = `
                    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
                    background-color: rgba(0, 0, 0, 0.8); color: white; padding: 10px 20px;
                    border-radius: 5px; font-family: Arial, sans-serif; font-size: 14px;
                    z-index: 1000000; pointer-events: none;
                `;
                
                this.overlay.appendChild(this.selectionBox);
                this.overlay.appendChild(instructions);
                this.doc.body.appendChild(this.overlay);
                
                // Prevent scrolling without changing overflow (which causes scroll to top)
                this.originalScrollPosition = {
                    x: window.scrollX || window.pageXOffset,
                    y: window.scrollY || window.pageYOffset
                };
                this.preventScroll = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                };
                // Prevent scroll events but don't change overflow
                document.addEventListener('wheel', this.preventScroll, { passive: false });
                document.addEventListener('touchmove', this.preventScroll, { passive: false });
            }

            removeOverlay() {
                if (this.overlay) {
                    this.overlay.remove();
                    this.overlay = null;
                }
                this.selectionBox = null;
                
                // Remove scroll prevention and restore original position
                if (this.preventScroll) {
                    document.removeEventListener('wheel', this.preventScroll);
                    document.removeEventListener('touchmove', this.preventScroll);
                    this.preventScroll = null;
                }
                
                // Restore original scroll position if it was saved
                if (this.originalScrollPosition) {
                    window.scrollTo(this.originalScrollPosition.x, this.originalScrollPosition.y);
                    this.originalScrollPosition = null;
                }
            }

            attachEventListeners() {
                this.overlay.addEventListener('mousedown', this.handleMouseDown);
                this.doc.addEventListener('mousemove', this.handleMouseMove);
                this.doc.addEventListener('mouseup', this.handleMouseUp);
                this.doc.addEventListener('keydown', this.handleKeyDown);
                // Don't focus the overlay to avoid scrolling issues
                this.overlay.setAttribute('tabindex', '0');
            }

            detachEventListeners() {
                if (this.overlay) {
                    this.overlay.removeEventListener('mousedown', this.handleMouseDown);
                }
                this.doc.removeEventListener('mousemove', this.handleMouseMove);
                this.doc.removeEventListener('mouseup', this.handleMouseUp);
                this.doc.removeEventListener('keydown', this.handleKeyDown);
            }

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

            handleMouseMove(event) {
                if (!this.isActive || !this.isDrawing) return;
                this.endX = event.clientX;
                this.endY = event.clientY;
                this.updateSelectionBox();
            }

            handleMouseUp(event) {
                if (!this.isActive || !this.isDrawing) return;
                this.isDrawing = false;
                const area = this.getSelectedArea();
                if (area.width < 10 || area.height < 10) {
                    this.showError('Selection too small. Please select a larger area.');
                    this.selectionBox.style.display = 'none';
                    return;
                }
                this.completeSelection(area);
            }

            handleKeyDown(event) {
                if (!this.isActive) return;
                if (event.key === 'Escape') {
                    event.preventDefault();
                    this.cancel();
                }
            }

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

            getSelectedArea() {
                const left = Math.min(this.startX, this.endX);
                const top = Math.min(this.startY, this.endY);
                const width = Math.abs(this.endX - this.startX);
                const height = Math.abs(this.endY - this.startY);
                return { x: left, y: top, width, height };
            }

            completeSelection(area) {
                const callback = this.onCompleteCallback;
                this.stop();
                if (callback) callback(area);
            }

            showError(message) {
                const errorDiv = this.doc.createElement('div');
                errorDiv.style.cssText = `
                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    background-color: #ff4444; color: white; padding: 15px 25px;
                    border-radius: 5px; font-family: Arial, sans-serif; font-size: 14px;
                    z-index: 1000001; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                `;
                errorDiv.textContent = message;
                this.doc.body.appendChild(errorDiv);
                setTimeout(() => {
                    if (errorDiv.parentNode) errorDiv.remove();
                }, 3000);
            }

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
        }

        // ImageCropper class (simplified inline version)
        class ImageCropper {
            constructor(documentRef = null, windowRef = null) {
                this.doc = documentRef || document;
                this.win = windowRef || window;
            }

            async cropImage(imageDataUrl, area) {
                if (!imageDataUrl) throw new Error('Image data URL is required');
                if (!area || typeof area !== 'object') throw new Error('Area object is required');
                if (!this.isValidArea(area)) throw new Error('Invalid area dimensions');

                try {
                    const img = await this.loadImage(imageDataUrl);
                    return this.performCrop(img, area);
                } catch (error) {
                    throw new Error(`Image cropping failed: ${error.message}`);
                }
            }

            isValidArea(area) {
                const required = ['x', 'y', 'width', 'height'];
                for (const prop of required) {
                    if (!(prop in area) || typeof area[prop] !== 'number') return false;
                }
                return area.width > 0 && area.height > 0 && area.x >= 0 && area.y >= 0;
            }

            loadImage(dataUrl) {
                return new Promise((resolve, reject) => {
                    const img = new this.win.Image();
                    const timeout = setTimeout(() => reject(new Error('Image loading timed out')), 10000);
                    img.onload = () => {
                        clearTimeout(timeout);
                        resolve(img);
                    };
                    img.onerror = () => {
                        clearTimeout(timeout);
                        reject(new Error('Failed to load image'));
                    };
                    img.src = dataUrl;
                });
            }

            performCrop(img, area) {
                if (area.x + area.width > img.width || area.y + area.height > img.height) {
                    throw new Error('Crop area extends beyond image boundaries');
                }

                const canvas = this.doc.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Failed to get 2D canvas context');

                canvas.width = area.width;
                canvas.height = area.height;

                try {
                    ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
                    return canvas.toDataURL('image/png');
                } catch (error) {
                    throw new Error(`Canvas drawing failed: ${error.message}`);
                }
            }
        }

        // Make modules available globally
        window.AreaCapture = AreaCapture;
        window.ImageCropper = ImageCropper;
        console.log('Content modules loaded inline');
    }

    // Content script controller
    class ContentScriptController {
        constructor() {
            this.areaCapture = null;
            this.imageCropper = null;
            this.isCapturing = false;
            this.currentArea = null;
            
            // Initialize modules immediately since they're loaded inline
            this.initializeModules();
        }

        initializeModules() {
            try {
                // Initialize modules (they're already loaded inline above)
                this.areaCapture = new AreaCapture();
                this.imageCropper = new ImageCropper();
                
                console.log('Content script modules initialized');
                return true;
            } catch (error) {
                console.error('Module initialization failed:', error);
                return false;
            }
        }

        /**
         * Start area capture process
         */
        startAreaCapture() {
            if (this.isCapturing) {
                console.log('Already capturing');
                return { success: false, error: 'Already capturing' };
            }

            if (!this.areaCapture) {
                console.error('AreaCapture module not available');
                return { success: false, error: 'Module not available' };
            }

            try {
                console.log('Starting area capture...');
                this.isCapturing = true;

                // Start area selection
                this.areaCapture.start(
                    (area) => this.handleAreaSelected(area),
                    () => this.handleAreaCancelled()
                );

                return { success: true };
            } catch (error) {
                console.error('Failed to start area capture:', error);
                this.isCapturing = false;
                return { success: false, error: error.message };
            }
        }

        /**
         * Handle area selection completion
         */
        async handleAreaSelected(area) {
            console.log('Area selected:', area);
            this.currentArea = area;

            try {
                // Capture screenshot via background script
                const response = await this.captureScreenshot(area);
                
                if (response.success) {
                    // Copy to clipboard and store
                    await this.processScreenshot(response.imageData);
                    this.showNotification('✅ Screenshot captured and copied to clipboard! Click the extension icon to extract text with OCR.', 'success', 8000);
                } else {
                    this.showNotification('Failed to capture screenshot: ' + response.error, 'error');
                }
            } catch (error) {
                console.error('Screenshot processing failed:', error);
                this.showNotification('Failed to process screenshot');
            }

            this.cleanup();
        }


        /**
         * Handle area selection cancellation
         */
        handleAreaCancelled() {
            console.log('Area capture cancelled');
            this.cleanup();
        }

        /**
         * Capture screenshot via background script
         */
        captureScreenshot(area) {
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'captureVisibleTab',
                    area: area
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }

                    if (response && response.imageData) {
                        resolve({ success: true, imageData: response.imageData });
                    } else {
                        resolve({ success: false, error: response?.error || 'Unknown error' });
                    }
                });
            });
        }

        /**
         * Process screenshot - crop and copy to clipboard
         */
        async processScreenshot(fullImageData) {
            try {
                // Crop image to selected area
                const croppedImageData = await this.imageCropper.cropImage(fullImageData, this.currentArea);
                
                // Copy to clipboard
                await this.copyToClipboard(croppedImageData);
                
                // Store in local storage
                await this.storeScreenshot(croppedImageData);
                
                console.log('Screenshot processed successfully');
            } catch (error) {
                console.error('Failed to process screenshot:', error);
                throw error;
            }
        }

        /**
         * Copy image to clipboard
         */
        async copyToClipboard(imageData) {
            try {
                // Convert base64 to blob
                const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'image/png' });
                
                // Copy to clipboard
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'image/png': blob
                    })
                ]);
                
                console.log('Image copied to clipboard');
            } catch (error) {
                console.error('Failed to copy image to clipboard:', error);
                throw error;
            }
        }

        /**
         * Store screenshot in local storage
         */
        async storeScreenshot(imageData) {
            try {
                await chrome.storage.local.set({
                    latestScreenshot: imageData,
                    screenshotTimestamp: Date.now(),
                    screenshotArea: this.currentArea
                });
                
                console.log('Screenshot stored successfully');
            } catch (error) {
                console.error('Failed to store screenshot:', error);
                throw error;
            }
        }

        /**
         * Show notification to user
         */
        showNotification(message, type = 'success', duration = 3000) {
            const notification = document.createElement('div');
            const backgroundColor = type === 'success' ? '#4CAF50' : 
                                  type === 'error' ? '#f44336' : 
                                  '#2196F3'; // info/default
            
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: ${backgroundColor};
                color: white;
                padding: 12px 20px;
                border-radius: 6px;
                z-index: 1000000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                max-width: 320px;
                word-wrap: break-word;
                line-height: 1.4;
            `;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            // Auto-remove after specified duration
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, duration);
        }

        /**
         * Cleanup after capture
         */
        cleanup() {
            this.isCapturing = false;
            this.currentArea = null;
            
            // Stop area capture if active
            if (this.areaCapture && this.areaCapture.isActive) {
                this.areaCapture.stop();
            }
        }

        /**
         * Handle extension messages
         */
        handleMessage(request, sender, sendResponse) {
            console.log('Content script received message:', request);
            
            if (request.action === 'test') {
                console.log('Content script: Test message received');
                sendResponse({ success: true, message: 'Content script is working' });
                return false;
            }
            
            if (request.action === 'startCapture') {
                try {
                    const response = this.startAreaCapture();
                    sendResponse(response);
                } catch (error) {
                    console.error('Start capture failed:', error);
                    sendResponse({ success: false, error: error.message });
                }
                
                // Return false since we're sending response synchronously
                return false;
            }
            
            return false;
        }
    }

    // Initialize controller
    const controller = new ContentScriptController();

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        return controller.handleMessage(request, sender, sendResponse);
    });

    // Export controller for debugging
    window.contentScriptController = controller;

} // End of conditional block to prevent double loading