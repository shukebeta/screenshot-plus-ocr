/**
 * Image Cropper Module
 * Handles Canvas-based image cropping operations in content script context
 */

class ImageCropper {
    constructor(documentRef = null, windowRef = null) {
        // Allow dependency injection for testing
        this.doc = documentRef || document;
        this.win = windowRef || window;
    }

    /**
     * Crop image data to specified area
     * @param {string} imageDataUrl - Source image as data URL
     * @param {Object} area - Area to crop {x, y, width, height}
     * @returns {Promise<string>} Cropped image as data URL
     */
    async cropImage(imageDataUrl, area) {
        if (!imageDataUrl) {
            throw new Error('Image data URL is required');
        }

        if (!area || typeof area !== 'object') {
            throw new Error('Area object is required');
        }

        if (!this.isValidArea(area)) {
            throw new Error('Invalid area dimensions');
        }

        try {
            const img = await this.loadImage(imageDataUrl);
            return this.performCrop(img, area);
        } catch (error) {
            throw new Error(`Image cropping failed: ${error.message}`);
        }
    }

    /**
     * Validate area dimensions
     * @param {Object} area - Area object to validate
     * @returns {boolean} Whether area is valid
     */
    isValidArea(area) {
        const required = ['x', 'y', 'width', 'height'];
        
        // Check all required properties exist and are numbers
        for (const prop of required) {
            if (!(prop in area) || typeof area[prop] !== 'number') {
                return false;
            }
        }

        // Check dimensions are positive
        if (area.width <= 0 || area.height <= 0) {
            return false;
        }

        // Check coordinates are not negative
        if (area.x < 0 || area.y < 0) {
            return false;
        }

        return true;
    }

    /**
     * Load image from data URL
     * @param {string} dataUrl - Image data URL
     * @returns {Promise<HTMLImageElement>} Loaded image element
     */
    loadImage(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new this.win.Image();
            
            img.onload = () => {
                resolve(img);
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            
            // Set timeout for loading
            const timeout = setTimeout(() => {
                reject(new Error('Image loading timed out'));
            }, 10000); // 10 second timeout
            
            img.onload = () => {
                clearTimeout(timeout);
                resolve(img);
            };
            
            img.src = dataUrl;
        });
    }

    /**
     * Perform the actual cropping operation
     * @param {HTMLImageElement} img - Source image element
     * @param {Object} area - Area to crop
     * @returns {string} Cropped image as data URL
     */
    performCrop(img, area) {
        // Validate crop area against image dimensions
        if (area.x + area.width > img.width || area.y + area.height > img.height) {
            throw new Error('Crop area extends beyond image boundaries');
        }

        // Create canvas for cropping
        const canvas = this.doc.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('Failed to get 2D canvas context');
        }

        // Set canvas size to crop area
        canvas.width = area.width;
        canvas.height = area.height;

        try {
            // Draw the cropped portion
            ctx.drawImage(
                img,
                area.x, area.y, area.width, area.height,  // source rectangle
                0, 0, area.width, area.height            // destination rectangle
            );

            // Convert to data URL
            return canvas.toDataURL('image/png');
        } catch (error) {
            throw new Error(`Canvas drawing failed: ${error.message}`);
        }
    }

    /**
     * Get image dimensions from data URL
     * @param {string} imageDataUrl - Image data URL
     * @returns {Promise<Object>} Image dimensions {width, height}
     */
    async getImageDimensions(imageDataUrl) {
        try {
            const img = await this.loadImage(imageDataUrl);
            return {
                width: img.width,
                height: img.height
            };
        } catch (error) {
            throw new Error(`Failed to get image dimensions: ${error.message}`);
        }
    }

    /**
     * Validate crop area against image dimensions
     * @param {string} imageDataUrl - Image data URL
     * @param {Object} area - Area to validate
     * @returns {Promise<boolean>} Whether area is valid for the image
     */
    async validateCropArea(imageDataUrl, area) {
        try {
            if (!this.isValidArea(area)) {
                return false;
            }

            const dimensions = await this.getImageDimensions(imageDataUrl);
            
            // Check if crop area fits within image
            return (
                area.x >= 0 &&
                area.y >= 0 &&
                area.x + area.width <= dimensions.width &&
                area.y + area.height <= dimensions.height
            );
        } catch (error) {
            return false;
        }
    }

    /**
     * Create a preview of the crop area (for debugging/testing)
     * @param {string} imageDataUrl - Source image data URL
     * @param {Object} area - Area to highlight
     * @returns {Promise<string>} Preview image with highlighted area
     */
    async createCropPreview(imageDataUrl, area) {
        try {
            const img = await this.loadImage(imageDataUrl);
            
            const canvas = this.doc.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                throw new Error('Failed to get 2D canvas context');
            }

            // Set canvas to image size
            canvas.width = img.width;
            canvas.height = img.height;

            // Draw original image
            ctx.drawImage(img, 0, 0);

            // Draw crop area outline
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.strokeRect(area.x, area.y, area.width, area.height);

            // Add semi-transparent overlay everywhere except crop area
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            
            // Top
            ctx.fillRect(0, 0, img.width, area.y);
            // Bottom
            ctx.fillRect(0, area.y + area.height, img.width, img.height - area.y - area.height);
            // Left
            ctx.fillRect(0, area.y, area.x, area.height);
            // Right
            ctx.fillRect(area.x + area.width, area.y, img.width - area.x - area.width, area.height);

            return canvas.toDataURL('image/png');
        } catch (error) {
            throw new Error(`Failed to create crop preview: ${error.message}`);
        }
    }

    /**
     * Batch crop multiple areas from the same image
     * @param {string} imageDataUrl - Source image data URL
     * @param {Array<Object>} areas - Array of areas to crop
     * @returns {Promise<Array<string>>} Array of cropped image data URLs
     */
    async batchCrop(imageDataUrl, areas) {
        if (!Array.isArray(areas) || areas.length === 0) {
            throw new Error('Areas array is required and must not be empty');
        }

        try {
            const img = await this.loadImage(imageDataUrl);
            const results = [];

            for (const area of areas) {
                if (!this.isValidArea(area)) {
                    throw new Error(`Invalid area: ${JSON.stringify(area)}`);
                }

                const croppedImage = this.performCrop(img, area);
                results.push(croppedImage);
            }

            return results;
        } catch (error) {
            throw new Error(`Batch crop failed: ${error.message}`);
        }
    }

    /**
     * Get supported image formats
     * @returns {Array<string>} Array of supported MIME types
     */
    getSupportedFormats() {
        const canvas = this.doc.createElement('canvas');
        const formats = ['image/png', 'image/jpeg', 'image/webp'];
        
        return formats.filter(format => {
            try {
                // Test if format is supported by trying to convert
                canvas.toDataURL(format);
                return true;
            } catch (error) {
                return false;
            }
        });
    }

    /**
     * Convert image format
     * @param {string} imageDataUrl - Source image data URL
     * @param {string} outputFormat - Target format (e.g., 'image/jpeg')
     * @param {number} quality - Quality for lossy formats (0-1)
     * @returns {Promise<string>} Converted image data URL
     */
    async convertFormat(imageDataUrl, outputFormat = 'image/png', quality = 0.9) {
        try {
            const img = await this.loadImage(imageDataUrl);
            
            const canvas = this.doc.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                throw new Error('Failed to get 2D canvas context');
            }

            canvas.width = img.width;
            canvas.height = img.height;

            ctx.drawImage(img, 0, 0);

            return canvas.toDataURL(outputFormat, quality);
        } catch (error) {
            throw new Error(`Format conversion failed: ${error.message}`);
        }
    }
}

// Export for use in content script and tests
window.ImageCropper = ImageCropper;