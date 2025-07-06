/**
 * Storage Manager Module
 * Handles Chrome storage operations for settings and screenshots
 */

class StorageManager {
    constructor() {
        this.syncKeys = ['apiKey', 'selectedModel'];
        this.localKeys = ['latestScreenshot', 'screenshotTimestamp'];
        this.screenshotExpiryTime = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Initialize storage manager and setup listeners
     */
    initialize() {
        console.log('StorageManager: Initializing');
        this.setupStorageListener();
    }

    /**
     * Setup storage change listener
     */
    setupStorageListener() {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            console.log('StorageManager: Storage changed:', changes, namespace);
            
            if (namespace === 'local' && changes.latestScreenshot) {
                this.handleScreenshotUpdate(changes.latestScreenshot.newValue);
            }
            
            if (namespace === 'sync') {
                this.handleSettingsUpdate(changes);
            }
        });
    }

    /**
     * Handle screenshot storage update
     * @param {string} imageData - New screenshot data
     */
    handleScreenshotUpdate(imageData) {
        console.log('StorageManager: Screenshot updated');
        // Emit event for other modules to handle
        window.dispatchEvent(new CustomEvent('screenshotUpdated', {
            detail: {imageData}
        }));
    }

    /**
     * Handle settings update
     * @param {Object} changes - Changed settings
     */
    handleSettingsUpdate(changes) {
        console.log('StorageManager: Settings updated');
        // Emit event for other modules to handle
        window.dispatchEvent(new CustomEvent('settingsUpdated', {
            detail: {changes}
        }));
    }

    /**
     * Save API key
     * @param {string} apiKey - API key to save
     * @returns {Promise<void>}
     */
    async saveAPIKey(apiKey) {
        try {
            await chrome.storage.sync.set({apiKey: apiKey});
            console.log('StorageManager: API key saved');
        } catch (error) {
            console.error('StorageManager: Failed to save API key:', error);
            throw new Error('Failed to save API key');
        }
    }

    /**
     * Get API key
     * @returns {Promise<string>} API key
     */
    async getAPIKey() {
        try {
            const result = await chrome.storage.sync.get(['apiKey']);
            return result.apiKey || '';
        } catch (error) {
            console.error('StorageManager: Failed to get API key:', error);
            return '';
        }
    }

    /**
     * Save selected model
     * @param {string} model - Model to save
     * @returns {Promise<void>}
     */
    async saveSelectedModel(model) {
        try {
            await chrome.storage.sync.set({selectedModel: model});
            console.log('StorageManager: Selected model saved:', model);
        } catch (error) {
            console.error('StorageManager: Failed to save model:', error);
            throw new Error('Failed to save selected model');
        }
    }

    /**
     * Get selected model
     * @returns {Promise<string>} Selected model
     */
    async getSelectedModel() {
        try {
            const result = await chrome.storage.sync.get(['selectedModel']);
            return result.selectedModel || 'openai/gpt-4o';
        } catch (error) {
            console.error('StorageManager: Failed to get model:', error);
            return 'openai/gpt-4o';
        }
    }

    /**
     * Save screenshot
     * @param {string} imageData - Base64 image data
     * @returns {Promise<void>}
     */
    async saveScreenshot(imageData) {
        try {
            const timestamp = Date.now();
            await chrome.storage.local.set({
                latestScreenshot: imageData,
                screenshotTimestamp: timestamp
            });
            console.log('StorageManager: Screenshot saved');
        } catch (error) {
            console.error('StorageManager: Failed to save screenshot:', error);
            throw new Error('Failed to save screenshot');
        }
    }

    /**
     * Get latest screenshot
     * @returns {Promise<Object|null>} Screenshot data with timestamp
     */
    async getLatestScreenshot() {
        try {
            const result = await chrome.storage.local.get(['latestScreenshot', 'screenshotTimestamp']);
            
            if (!result.latestScreenshot || !result.screenshotTimestamp) {
                return null;
            }

            // Check if screenshot is expired
            const now = Date.now();
            const age = now - result.screenshotTimestamp;
            
            if (age > this.screenshotExpiryTime) {
                console.log('StorageManager: Screenshot expired, removing');
                await this.clearScreenshot();
                return null;
            }

            return {
                imageData: result.latestScreenshot,
                timestamp: result.screenshotTimestamp,
                ageMs: age
            };
        } catch (error) {
            console.error('StorageManager: Failed to get screenshot:', error);
            return null;
        }
    }

    /**
     * Clear stored screenshot
     * @returns {Promise<void>}
     */
    async clearScreenshot() {
        try {
            await chrome.storage.local.remove(['latestScreenshot', 'screenshotTimestamp']);
            console.log('StorageManager: Screenshot cleared');
        } catch (error) {
            console.error('StorageManager: Failed to clear screenshot:', error);
            throw new Error('Failed to clear screenshot');
        }
    }

    /**
     * Get all settings
     * @returns {Promise<Object>} All settings
     */
    async getAllSettings() {
        try {
            const syncData = await chrome.storage.sync.get(this.syncKeys);
            const localData = await chrome.storage.local.get(this.localKeys);
            
            return {
                ...syncData,
                ...localData
            };
        } catch (error) {
            console.error('StorageManager: Failed to get all settings:', error);
            return {};
        }
    }

    /**
     * Clear all storage
     * @returns {Promise<void>}
     */
    async clearAll() {
        try {
            await Promise.all([
                chrome.storage.sync.clear(),
                chrome.storage.local.clear()
            ]);
            console.log('StorageManager: All storage cleared');
        } catch (error) {
            console.error('StorageManager: Failed to clear storage:', error);
            throw new Error('Failed to clear storage');
        }
    }

    /**
     * Get storage usage information
     * @returns {Promise<Object>} Storage usage stats
     */
    async getStorageUsage() {
        try {
            const [syncUsage, localUsage] = await Promise.all([
                chrome.storage.sync.getBytesInUse(),
                chrome.storage.local.getBytesInUse()
            ]);

            return {
                sync: {
                    bytesInUse: syncUsage,
                    quotaBytes: chrome.storage.sync.QUOTA_BYTES || 102400, // 100KB
                    usagePercent: Math.round((syncUsage / 102400) * 100)
                },
                local: {
                    bytesInUse: localUsage,
                    quotaBytes: chrome.storage.local.QUOTA_BYTES || 10485760, // 10MB
                    usagePercent: Math.round((localUsage / 10485760) * 100)
                }
            };
        } catch (error) {
            console.error('StorageManager: Failed to get storage usage:', error);
            return null;
        }
    }

    /**
     * Export settings
     * @returns {Promise<Object>} Exported settings
     */
    async exportSettings() {
        try {
            const settings = await this.getAllSettings();
            // Remove screenshot data from export (too large)
            delete settings.latestScreenshot;
            delete settings.screenshotTimestamp;
            
            return {
                exportDate: new Date().toISOString(),
                version: '1.0.0',
                settings
            };
        } catch (error) {
            console.error('StorageManager: Failed to export settings:', error);
            throw new Error('Failed to export settings');
        }
    }

    /**
     * Import settings
     * @param {Object} importData - Settings to import
     * @returns {Promise<void>}
     */
    async importSettings(importData) {
        try {
            if (!importData || !importData.settings) {
                throw new Error('Invalid import data');
            }

            const settings = importData.settings;
            
            // Only import known settings
            const filteredSettings = {};
            [...this.syncKeys].forEach(key => {
                if (settings[key] !== undefined) {
                    filteredSettings[key] = settings[key];
                }
            });

            if (Object.keys(filteredSettings).length > 0) {
                await chrome.storage.sync.set(filteredSettings);
                console.log('StorageManager: Settings imported:', filteredSettings);
            }
        } catch (error) {
            console.error('StorageManager: Failed to import settings:', error);
            throw new Error('Failed to import settings');
        }
    }
}

// Export for use in other modules
window.StorageManager = StorageManager;