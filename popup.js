// Quick and dirty popup implementation - will refactor later
let currentScreenshot = null;

document.addEventListener('DOMContentLoaded', function() {
    const captureBtn = document.getElementById('captureBtn');
    const captureFullBtn = document.getElementById('captureFullBtn');
    const ocrBtn = document.getElementById('ocrBtn');
    const apiKeyInput = document.getElementById('apiKey');
    const modelSelect = document.getElementById('modelSelect');
    const resultDiv = document.getElementById('result');
    const resultText = document.getElementById('resultText');
    const loading = document.getElementById('loading');

    // Load saved API key and model selection
    chrome.storage.sync.get(['apiKey', 'selectedModel'], function(result) {
        if (result.apiKey) {
            apiKeyInput.value = result.apiKey;
        }
        if (result.selectedModel) {
            modelSelect.value = result.selectedModel;
        }
    });
    
    // Check for recent screenshots
    chrome.storage.local.get(['latestScreenshot', 'screenshotTimestamp'], function(result) {
        if (result.latestScreenshot && result.screenshotTimestamp) {
            // Show OCR button if screenshot is recent (within 5 minutes)
            const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
            if (result.screenshotTimestamp > fiveMinutesAgo) {
                currentScreenshot = result.latestScreenshot;
                ocrBtn.classList.remove('hidden');
            }
        }
    });

    // Save API key and model on change
    apiKeyInput.addEventListener('change', function() {
        chrome.storage.sync.set({apiKey: apiKeyInput.value});
    });
    
    modelSelect.addEventListener('change', function() {
        chrome.storage.sync.set({selectedModel: modelSelect.value});
    });

    captureBtn.addEventListener('click', function() {
        console.log('Capture button clicked');
        
        // Send message to content script to start capture
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            console.log('Active tab:', tabs[0]);
            
            // First try to inject content script if it's not already loaded
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['content.js']
            }, function() {
                if (chrome.runtime.lastError) {
                    console.log('Script injection failed (might already be loaded):', chrome.runtime.lastError);
                }
                
                // Now try to send message
                chrome.tabs.sendMessage(tabs[0].id, {action: 'startCapture'}, function(response) {
                    console.log('Content script response:', response);
                    if (chrome.runtime.lastError) {
                        console.error('Error sending message:', chrome.runtime.lastError);
                        alert('Error: Cannot start capture on this page. Try a different page or reload the page and try again.');
                    } else {
                        // Close popup so overlay is visible
                        window.close();
                    }
                });
            });
        });
    });

    captureFullBtn.addEventListener('click', function() {
        console.log('Full page capture button clicked');
        
        // Test if chrome.runtime.sendMessage is working
        if (!chrome.runtime.sendMessage) {
            alert('Error: chrome.runtime.sendMessage is not available');
            return;
        }
        
        // Send message to background script to capture full page
        chrome.runtime.sendMessage({action: 'captureFullPage'}, function(response) {
            console.log('Background script response:', response);
            if (chrome.runtime.lastError) {
                console.error('Error:', chrome.runtime.lastError);
                alert('Error: ' + chrome.runtime.lastError.message);
            } else if (response && response.error) {
                console.error('Capture error:', response.error);
                alert('Capture failed: ' + response.error);
            } else if (response && response.imageData) {
                // Store the screenshot
                chrome.storage.local.set({
                    latestScreenshot: response.imageData,
                    screenshotTimestamp: Date.now()
                });
                
                currentScreenshot = response.imageData;
                ocrBtn.classList.remove('hidden');
                
                // Copy to clipboard
                copyImageToClipboard(response.imageData);
                
                alert('Full page screenshot captured and copied to clipboard!');
            } else {
                console.error('Unexpected response:', response);
                alert('Failed to capture screenshot - unexpected response');
            }
        });
    });

    ocrBtn.addEventListener('click', async function() {
        if (!currentScreenshot) {
            alert('No screenshot available');
            return;
        }

        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            alert('Please enter your OpenRouter API key');
            return;
        }

        showLoading(true);
        
        try {
            const selectedModel = modelSelect.value;
            const text = await performOCR(currentScreenshot, apiKey, selectedModel);
            showResult(text);
        } catch (error) {
            showResult(`Error: ${error.message}`);
        } finally {
            showLoading(false);
        }
    });

    // Storage listener for screenshot updates
    chrome.storage.onChanged.addListener(function(changes, namespace) {
        if (namespace === 'local' && changes.latestScreenshot) {
            currentScreenshot = changes.latestScreenshot.newValue;
            ocrBtn.classList.remove('hidden');
        }
    });

    function showLoading(show) {
        loading.classList.toggle('hidden', !show);
        ocrBtn.disabled = show;
    }

    function showResult(text) {
        resultText.textContent = text;
        resultDiv.classList.remove('hidden');
    }

    async function performOCR(imageData, apiKey, model) {
        console.log('Starting OCR with model:', model);
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://github.com/screenshot-ocr-extension',
                'X-Title': 'Screenshot OCR Extension'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Please extract all text from this image. Return only the text content, no additional formatting or explanation.'
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
                max_tokens: 4000
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', response.status, errorText);
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('OCR API Response:', data);
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid API response format');
        }
        
        return data.choices[0].message.content;
    }
    
    function copyImageToClipboard(imageData) {
        // Convert base64 to blob
        const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {type: 'image/png'});
        
        // Copy to clipboard
        navigator.clipboard.write([
            new ClipboardItem({
                'image/png': blob
            })
        ]).then(() => {
            console.log('Image copied to clipboard');
        }).catch(err => {
            console.error('Failed to copy image: ', err);
        });
    }
});