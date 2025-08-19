// Background service worker for Shorts Blocker extension
// Handles storage initialization and message passing

// Initialize default settings when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  // Set default blocking states
  chrome.storage.local.set({
    blockYouTubeShorts: true,
    blockInstagramReels: true,
    blockInstagramCompletely: false
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    // Return current blocking settings
    chrome.storage.local.get(['blockYouTubeShorts', 'blockInstagramReels', 'blockInstagramCompletely'], (result) => {
      sendResponse({
        blockYouTubeShorts: result.blockYouTubeShorts ?? true,
        blockInstagramReels: result.blockInstagramReels ?? true,
        blockInstagramCompletely: result.blockInstagramCompletely ?? false
      });
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'updateSettings') {
    // Update settings in storage
    chrome.storage.local.set(request.settings, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Listen for storage changes and notify content scripts
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    // Notify all tabs about setting changes
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url && (tab.url.includes('youtube.com') || tab.url.includes('instagram.com'))) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'settingsChanged',
            changes: changes
          }).catch(() => {
            // Ignore errors for tabs that don't have content script loaded
          });
        }
      });
    });
  }
});
