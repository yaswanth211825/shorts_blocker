// Background service worker for Shorts Blocker extension v2.0.0
// Handles storage initialization and message passing - YouTube Shorts only

// Initialize default settings when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    blockYouTubeShorts: true
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.local.get(['blockYouTubeShorts'], (result) => {
      sendResponse({
        blockYouTubeShorts: result.blockYouTubeShorts ?? true
      });
    });
    return true; // Keep message channel open for async response
  }
});

// Listen for storage changes and notify content scripts
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    // Notify all tabs about setting changes
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url && tab.url.includes('youtube.com')) {
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
