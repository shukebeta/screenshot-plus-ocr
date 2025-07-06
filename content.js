// Quick and dirty screenshot capture implementation - will refactor later
// Prevent double-loading
if (!window.screenshotOCRLoaded) {
    window.screenshotOCRLoaded = true;
    console.log('Screenshot OCR content script loaded');

    // Wrap everything in a conditional block to prevent redeclaration

let isCapturing = false;
let overlay = null;
let selectionBox = null;
let startX = 0;
let startY = 0;
let isDrawing = false;

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Content script received message:', request);
    if (request.action === 'startCapture') {
        console.log('Starting screenshot capture');
        startScreenshotCapture();
        sendResponse({success: true});
    }
});

function startScreenshotCapture() {
    if (isCapturing) return;
    
    isCapturing = true;
    createOverlay();
    
    // Hide scrollbars during capture
    document.body.style.overflow = 'hidden';
}

function createOverlay() {
    // Create overlay
    overlay = document.createElement('div');
    overlay.id = 'screenshot-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.3);
        z-index: 999999;
        cursor: crosshair;
    `;
    
    // Create selection box
    selectionBox = document.createElement('div');
    selectionBox.style.cssText = `
        position: absolute;
        border: 2px solid #ff0000;
        background-color: rgba(255, 0, 0, 0.1);
        display: none;
        pointer-events: none;
    `;
    
    overlay.appendChild(selectionBox);
    document.body.appendChild(overlay);
    
    // Add event listeners
    overlay.addEventListener('mousedown', handleMouseDown);
    overlay.addEventListener('mousemove', handleMouseMove);
    overlay.addEventListener('mouseup', handleMouseUp);
    overlay.addEventListener('keydown', handleKeyDown);
    
    // Make overlay focusable for keyboard events
    overlay.setAttribute('tabindex', '0');
    overlay.focus();
}

function handleMouseDown(e) {
    e.preventDefault();
    isDrawing = true;
    startX = e.clientX;
    startY = e.clientY;
    
    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.display = 'block';
}

function handleMouseMove(e) {
    if (!isDrawing) return;
    
    const currentX = e.clientX;
    const currentY = e.clientY;
    
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const left = Math.min(currentX, startX);
    const top = Math.min(currentY, startY);
    
    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
}

function handleMouseUp(e) {
    if (!isDrawing) return;
    
    isDrawing = false;
    
    const rect = selectionBox.getBoundingClientRect();
    
    // Check if selection is large enough
    if (rect.width < 10 || rect.height < 10) {
        alert('Selection too small. Please select a larger area.');
        return;
    }
    
    captureSelectedArea(rect);
}

function handleKeyDown(e) {
    if (e.key === 'Escape') {
        cancelCapture();
    }
}

function captureSelectedArea(rect) {
    // Remove overlay temporarily to get clean screenshot
    overlay.style.display = 'none';
    
    // Use html2canvas or similar for screenshot
    // For now, use a simple canvas approach
    setTimeout(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size to selection area
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        // For MVP, we'll use Chrome's built-in screenshot API through background script
        // Send message to background script to capture
        chrome.runtime.sendMessage({
            action: 'captureVisibleTab',
            area: {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height
            }
        }, function(response) {
            if (response && response.imageData) {
                // Copy to clipboard
                copyToClipboard(response.imageData);
                
                // Store screenshot data
                chrome.storage.local.set({
                    latestScreenshot: response.imageData,
                    screenshotTimestamp: Date.now()
                });
                
                // Show success message
                showNotification('Screenshot captured and copied to clipboard!');
            } else {
                showNotification('Failed to capture screenshot');
            }
            
            cleanupCapture();
        });
    }, 100);
}

function copyToClipboard(imageData) {
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

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #4CAF50;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 1000000;
        font-family: Arial, sans-serif;
        font-size: 14px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function cancelCapture() {
    cleanupCapture();
}

function cleanupCapture() {
    if (overlay) {
        overlay.remove();
        overlay = null;
    }
    
    selectionBox = null;
    isCapturing = false;
    isDrawing = false;
    
    // Restore scrollbars
    document.body.style.overflow = '';
}

} // End of conditional block to prevent double loading