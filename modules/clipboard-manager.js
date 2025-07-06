/**
 * Clipboard Manager Module
 * Handles copying images to clipboard
 */

class ClipboardManager {
    constructor() {
        this.isSupported = this.checkClipboardSupport();
    }

    /**
     * Check if clipboard API is supported
     * @returns {boolean} Whether clipboard write is supported
     */
    checkClipboardSupport() {
        return !!(navigator.clipboard && navigator.clipboard.write);
    }

    /**
     * Copy image data to clipboard
     * @param {string} imageData - Base64 image data (data:image/png;base64,...)
     * @returns {Promise<void>}
     */
    async copyImageToClipboard(imageData) {
        if (!this.isSupported) {
            throw new Error('Clipboard API not supported in this browser');
        }

        try {
            console.log('ClipboardManager: Converting image data to blob');
            const blob = this.dataURLToBlob(imageData);
            
            console.log('ClipboardManager: Writing to clipboard');
            await navigator.clipboard.write([
                new ClipboardItem({
                    'image/png': blob
                })
            ]);
            
            console.log('ClipboardManager: Image copied to clipboard successfully');
        } catch (error) {
            console.error('ClipboardManager: Failed to copy image:', error);
            throw new Error(`Failed to copy image to clipboard: ${error.message}`);
        }
    }

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<void>}
     */
    async copyTextToClipboard(text) {
        if (!navigator.clipboard) {
            throw new Error('Clipboard API not supported in this browser');
        }

        try {
            console.log('ClipboardManager: Copying text to clipboard');
            await navigator.clipboard.writeText(text);
            console.log('ClipboardManager: Text copied to clipboard successfully');
        } catch (error) {
            console.error('ClipboardManager: Failed to copy text:', error);
            throw new Error(`Failed to copy text to clipboard: ${error.message}`);
        }
    }

    /**
     * Convert data URL to Blob
     * @param {string} dataURL - Data URL (data:image/png;base64,...)
     * @returns {Blob} Blob object
     */
    dataURLToBlob(dataURL) {
        const base64Data = dataURL.replace(/^data:image\/[a-z]+;base64,/, '');
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], {type: 'image/png'});
    }

    /**
     * Get clipboard permissions status
     * @returns {Promise<string>} Permission status
     */
    async getClipboardPermission() {
        if (!navigator.permissions) {
            return 'unknown';
        }

        try {
            const permission = await navigator.permissions.query({name: 'clipboard-write'});
            return permission.state;
        } catch (error) {
            console.warn('ClipboardManager: Cannot check clipboard permission:', error);
            return 'unknown';
        }
    }

    /**
     * Test clipboard functionality
     * @returns {Promise<boolean>} Whether clipboard is working
     */
    async testClipboard() {
        if (!this.isSupported) {
            return false;
        }

        try {
            // Test with a small 1x1 pixel image
            const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
            await this.copyImageToClipboard(testImageData);
            return true;
        } catch (error) {
            console.error('ClipboardManager: Test failed:', error);
            return false;
        }
    }
}

// Export for use in other modules
window.ClipboardManager = ClipboardManager;