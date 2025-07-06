// Background service worker for Chrome extension
console.log('Background script loaded');

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Background received message:', request);
    if (request.action === 'captureFullPage') {
        console.log('Attempting to capture full page...');
        
        // Get the current active tab first
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs.length === 0) {
                console.error('No active tab found');
                sendResponse({error: 'No active tab found'});
                return;
            }
            
            const tab = tabs[0];
            console.log('Active tab:', tab.url);
            
            // Check if we can capture this tab
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
                console.error('Cannot capture system pages');
                sendResponse({error: 'Cannot capture system pages (chrome://, extension pages, etc.)'});
                return;
            }
            
            // Capture the visible tab
            chrome.tabs.captureVisibleTab(tab.windowId, {format: 'png'}, function(dataUrl) {
                if (chrome.runtime.lastError) {
                    console.error('Capture failed:', chrome.runtime.lastError);
                    sendResponse({error: chrome.runtime.lastError.message});
                    return;
                }
                
                console.log('Screenshot captured successfully, size:', dataUrl.length);
                sendResponse({imageData: dataUrl});
            });
        });
        return true;
    }
    
    if (request.action === 'captureVisibleTab') {
        // Capture the visible tab
        chrome.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
            if (chrome.runtime.lastError) {
                console.error('Capture failed:', chrome.runtime.lastError);
                sendResponse({error: chrome.runtime.lastError.message});
                return;
            }
            
            // For now, just return the full screenshot
            // Area cropping will be handled in content script
            sendResponse({imageData: dataUrl, area: request.area});
        });
        
        // Return true to indicate we will send a response asynchronously
        return true;
    }
});

// Note: Image cropping moved to content script since Image/Canvas not available in service worker

// Handle extension installation
chrome.runtime.onInstalled.addListener(function() {
    console.log('Screenshot OCR extension installed');
});