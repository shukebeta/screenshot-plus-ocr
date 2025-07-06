/**
 * OCR Service Module
 * Handles communication with OpenRouter API for text extraction
 */

class OCRService {
    constructor() {
        this.baseURL = 'https://openrouter.ai/api/v1/chat/completions';
        this.defaultModel = 'openai/gpt-4o';
        this.maxTokens = 4000;
        this.timeout = 30000; // 30 seconds
    }

    /**
     * Extract text from image using OCR
     * @param {string} imageData - Base64 image data
     * @param {string} apiKey - OpenRouter API key
     * @param {string} model - Model to use for OCR
     * @param {string} prompt - Custom prompt (optional)
     * @returns {Promise<string>} Extracted text
     */
    async extractText(imageData, apiKey, model = this.defaultModel, prompt = null) {
        if (!imageData) {
            throw new Error('No image data provided');
        }

        if (!apiKey || !apiKey.trim()) {
            throw new Error('API key is required');
        }

        console.log('OCRService: Starting text extraction with model:', model);

        const requestBody = {
            model: model,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: prompt || 'Please extract all text from this image. Return only the text content, no additional formatting or explanation.'
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageData
                            }
                        }
                    ]
                }
            ],
            max_tokens: this.maxTokens
        };

        try {
            console.log('OCRService: Sending request to OpenRouter API');
            const response = await this.makeRequest(apiKey, requestBody);
            
            console.log('OCRService: Received response from API');
            const extractedText = this.parseResponse(response);
            
            console.log('OCRService: Text extraction completed successfully');
            return extractedText;
            
        } catch (error) {
            console.error('OCRService: Text extraction failed:', error);
            throw new Error(`OCR failed: ${error.message}`);
        }
    }

    /**
     * Make HTTP request to OpenRouter API
     * @param {string} apiKey - API key
     * @param {Object} requestBody - Request payload
     * @returns {Promise<Object>} API response
     */
    async makeRequest(apiKey, requestBody) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://github.com/screenshot-ocr-extension',
                    'X-Title': 'Screenshot Plus OCR Extension'
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('OCRService: API error response:', response.status, errorText);
                
                // Parse error for better user feedback
                let errorMessage = `API Error ${response.status}`;
                try {
                    const errorData = JSON.parse(errorText);
                    if (errorData.error && errorData.error.message) {
                        errorMessage = errorData.error.message;
                    }
                } catch (e) {
                    // Use status text if can't parse error
                    errorMessage = `${errorMessage}: ${response.statusText}`;
                }
                
                throw new Error(errorMessage);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please try again.');
            }
            
            throw error;
        }
    }

    /**
     * Parse API response and extract text
     * @param {Object} response - API response object
     * @returns {string} Extracted text
     */
    parseResponse(response) {
        if (!response) {
            throw new Error('Empty response from API');
        }

        if (response.error) {
            throw new Error(response.error.message || 'API returned an error');
        }

        if (!response.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
            throw new Error('Invalid API response format: missing choices');
        }

        const choice = response.choices[0];
        if (!choice.message || !choice.message.content) {
            throw new Error('Invalid API response format: missing message content');
        }

        return choice.message.content.trim();
    }

    /**
     * Validate model name
     * @param {string} model - Model name to validate
     * @returns {boolean} Whether model is supported
     */
    isValidModel(model) {
        const supportedModels = [
            'openai/gpt-4o',
            'openai/gpt-4o-mini',
            'anthropic/claude-3-sonnet',
            'anthropic/claude-3-haiku',
            'google/gemini-pro-vision',
            'google/gemini-flash-1.5'
        ];
        
        return supportedModels.includes(model);
    }

    /**
     * Get list of supported models
     * @returns {Array} Array of model objects
     */
    getSupportedModels() {
        return [
            { value: 'openai/gpt-4o', label: 'OpenAI GPT-4o (Vision)', recommended: true },
            { value: 'openai/gpt-4o-mini', label: 'OpenAI GPT-4o Mini' },
            { value: 'anthropic/claude-3-sonnet', label: 'Claude 3 Sonnet' },
            { value: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku' },
            { value: 'google/gemini-pro-vision', label: 'Gemini Pro Vision' },
            { value: 'google/gemini-flash-1.5', label: 'Gemini Flash 1.5' }
        ];
    }

    /**
     * Estimate cost for OCR operation
     * @param {string} model - Model name
     * @param {string} imageData - Base64 image data
     * @returns {Object} Cost estimation
     */
    estimateCost(model, imageData) {
        // Rough cost estimation based on model and image size
        const imageSizeKB = imageData.length * 0.75 / 1024; // Base64 to bytes
        
        const costPerMB = {
            'openai/gpt-4o': 0.01,
            'openai/gpt-4o-mini': 0.002,
            'anthropic/claude-3-sonnet': 0.008,
            'anthropic/claude-3-haiku': 0.003,
            'google/gemini-pro-vision': 0.005,
            'google/gemini-flash-1.5': 0.001
        };

        const baseCost = costPerMB[model] || 0.005;
        const estimatedCost = (imageSizeKB / 1024) * baseCost;

        return {
            model,
            imageSizeKB: Math.round(imageSizeKB),
            estimatedCostUSD: Math.max(0.001, estimatedCost).toFixed(4)
        };
    }
}

// Export for use in other modules
window.OCRService = OCRService;