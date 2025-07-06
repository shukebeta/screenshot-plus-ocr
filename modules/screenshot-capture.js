/**
 * Screenshot Capture Module
 * Handles both full page and area selection screenshot capture
 */

class ScreenshotCapture {
    constructor() {
        this.isCapturing = false;
        this.currentCallback = null;
    }

    /**
     * Capture full page screenshot
     * @returns {Promise<string>} Base64 image data
     */
    async captureFullPage() {
        return new Promise((resolve, reject) => {
            console.log('ScreenshotCapture: Starting full page capture');
            
            chrome.runtime.sendMessage({action: 'captureFullPage'}, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('ScreenshotCapture: Runtime error:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                
                if (response && response.error) {
                    console.error('ScreenshotCapture: Capture error:', response.error);
                    reject(new Error(response.error));
                    return;
                }
                
                if (response && response.imageData) {
                    console.log('ScreenshotCapture: Full page captured successfully');
                    resolve(response.imageData);
                } else {
                    console.error('ScreenshotCapture: Invalid response:', response);
                    reject(new Error('Invalid response from background script'));
                }
            });
        });
    }

    /**
     * Start area selection capture
     * @returns {Promise<string>} Base64 image data of selected area
     */
    async captureArea() {
        return new Promise((resolve, reject) => {
            if (this.isCapturing) {
                reject(new Error('Already capturing'));
                return;
            }

            console.log('ScreenshotCapture: Starting area capture');
            this.currentCallback = {resolve, reject};
            
            // Send message to content script to start area selection
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs.length === 0) {
                    reject(new Error('No active tab'));
                    return;
                }

                // Try to inject content script if needed
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ['content.js']
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.log('ScreenshotCapture: Content script already loaded or injection failed');
                    }
                    
                    // Send message to start area selection
                    chrome.tabs.sendMessage(tabs[0].id, {action: 'startCapture'}, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error('ScreenshotCapture: Cannot communicate with content script');
                            reject(new Error('Cannot start area capture on this page. Try refreshing the page.'));
                            return;
                        }
                        
                        if (response && response.success) {
                            this.isCapturing = true;
                            console.log('ScreenshotCapture: Area capture started successfully');
                        } else {
                            reject(new Error('Failed to start area capture'));
                        }
                    });
                });
            });
        });
    }

    /**
     * Handle area capture completion (called from storage listener)
     * @param {string} imageData - Base64 image data
     */
    handleAreaCaptureComplete(imageData) {
        console.log('ScreenshotCapture: Area capture completed');
        this.isCapturing = false;
        
        if (this.currentCallback) {
            this.currentCallback.resolve(imageData);
            this.currentCallback = null;
        }
    }

    /**
     * Handle area capture error
     * @param {Error} error - Error object
     */
    handleAreaCaptureError(error) {
        console.error('ScreenshotCapture: Area capture error:', error);
        this.isCapturing = false;
        
        if (this.currentCallback) {
            this.currentCallback.reject(error);
            this.currentCallback = null;
        }
    }

    /**
     * Cancel current capture operation
     */
    cancelCapture() {
        console.log('ScreenshotCapture: Canceling capture');
        this.isCapturing = false;
        
        if (this.currentCallback) {
            this.currentCallback.reject(new Error('Capture cancelled'));
            this.currentCallback = null;
        }
    }
}

// Export for use in other modules
window.ScreenshotCapture = ScreenshotCapture;