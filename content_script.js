// Content script for Shorts Blocker extension
// Handles detection and blocking of YouTube Shorts and Instagram Reels

// Global settings
let settings = {
  blockYouTubeShorts: true,
  blockInstagramReels: true,
  blockInstagramCompletely: false
};

// Load settings from storage
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
      if (response) {
        settings = response;
      }
      resolve();
    });
  });
}

// Listen for settings changes
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'settingsChanged') {
    if (request.changes.blockYouTubeShorts) {
      settings.blockYouTubeShorts = request.changes.blockYouTubeShorts.newValue;
    }
    if (request.changes.blockInstagramReels) {
      settings.blockInstagramReels = request.changes.blockInstagramReels.newValue;
    }
    if (request.changes.blockInstagramCompletely) {
      settings.blockInstagramCompletely = request.changes.blockInstagramCompletely.newValue;
    }
    // Re-run blocking logic
    initBlocking();
  }
});

// Helper functions
function removeIfMatches(el, test) {
  try {
    if (test(el)) el.remove();
  } catch (e) {}
}

function isYouTubeShortsURL(url) {
  return url.includes('/shorts/') || url.includes('shorts?');
}

function isInstagramReelURL(url) {
  return url.includes('/reel/') || url.includes('/reels/');
}

// Heuristics for detecting short-form content
function looksLikeShortVideo(el) {
  if (!el) return false;
  
  const hostname = window.location.hostname;
  
  // YouTube specific blocking
  if (hostname.includes('youtube.com') && settings.blockYouTubeShorts) {
    // Shorts tab in sidebar - block the entire guide entry
    if (el.tagName === 'YTD-GUIDE-ENTRY-RENDERER' && el.querySelector('a[href="/shorts"]')) {
      return true;
    }
    
    // Shorts shelf on homepage - block the entire shelf
    if (el.tagName === 'YTD-RICH-SHELF-RENDERER' && el.hasAttribute('is-shorts')) {
      return true;
    }
    
    // Individual Shorts videos in feed/search - be more specific
    if (el.tagName === 'YTD-VIDEO-RENDERER' || el.tagName === 'YTD-COMPACT-VIDEO-RENDERER') {
      const shortsLink = el.querySelector('a[href*="/shorts/"]');
      if (shortsLink) return true;
    }
    
    // Shorts in grid view
    if (el.tagName === 'YTD-GRID-VIDEO-RENDERER' && el.querySelector('a[href*="/shorts/"]')) {
      return true;
    }
  }
  
  // Instagram specific blocking
  if (hostname.includes('instagram.com')) {
    // Complete Instagram blocking
    if (settings.blockInstagramCompletely) {
      // Block the main content area but keep navigation
      if (el.tagName === 'MAIN' || (el.getAttribute && el.getAttribute('role') === 'main')) {
        return true;
      }
    }
    
    // Reels-only blocking
    if (settings.blockInstagramReels) {
      // Reels tab in navigation
      if (el.querySelector && el.querySelector('a[href="/reels/"]')) {
        const navItem = el.closest('[role="menuitem"]') || el.closest('div[class*="nav"]');
        return navItem === el;
      }
      
      // Reels in feed - look for article containers with reel links
      if (el.tagName === 'ARTICLE' && el.querySelector('a[href*="/reel/"]')) {
        return true;
      }
      
      // Reels stories section
      if (el.querySelector && el.querySelector('[data-testid*="reel"]')) {
        return true;
      }
    }
  }
  
  return false;
}

// Remove matches in subtree
function sweep(root = document) {
  if (!root || !root.querySelectorAll) return;
  
  const hostname = window.location.hostname;
  
  // Skip if all blocking is disabled for this site
  if (hostname.includes('youtube.com') && !settings.blockYouTubeShorts) return;
  if (hostname.includes('instagram.com') && !settings.blockInstagramReels && !settings.blockInstagramCompletely) return;
  
  // YouTube specific selectors
  if (hostname.includes('youtube.com')) {
    const ytElements = root.querySelectorAll('ytd-guide-entry-renderer, ytd-rich-shelf-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer');
    for (const el of ytElements) {
      removeIfMatches(el, looksLikeShortVideo);
    }
  }
  
  // Instagram specific selectors
  if (hostname.includes('instagram.com')) {
    const instaElements = root.querySelectorAll('main, article, div[role="menuitem"], section');
    for (const el of instaElements) {
      removeIfMatches(el, looksLikeShortVideo);
    }
  }
}

// Show blocked message for direct URLs
function showBlockedMessage(contentType, redirectUrl) {
  document.body.innerHTML = '';
  
  const blockedDiv = document.createElement('div');
  blockedDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: white;
    z-index: 10000;
  `;

  blockedDiv.innerHTML = `
    <div style="font-size: 80px; margin-bottom: 20px;">🚫</div>
    <h1 style="font-size: 36px; margin: 0 0 10px 0; font-weight: 300;">${contentType} Blocked</h1>
    <p style="font-size: 18px; margin: 0 0 20px 0; opacity: 0.9;">This ${contentType.toLowerCase()} has been blocked by Shorts Blocker extension.</p>
    <p id="countdown" style="font-size: 16px; margin: 0; opacity: 0.7;">Redirecting to homepage in 5 seconds...</p>
  `;

  document.body.appendChild(blockedDiv);

  // Countdown and redirect
  let seconds = 5;
  const countdownEl = document.getElementById('countdown');
  const countdownInterval = setInterval(() => {
    seconds--;
    countdownEl.textContent = `Redirecting to homepage in ${seconds} seconds...`;
    
    if (seconds <= 0) {
      clearInterval(countdownInterval);
      window.location.href = redirectUrl;
    }
  }, 1000);
}

// Main blocking logic
function initBlocking() {
  const hostname = window.location.hostname;
  
  // Handle direct URL redirects for YouTube Shorts
  if (hostname.includes('youtube.com') && settings.blockYouTubeShorts && isYouTubeShortsURL(location.href)) {
    showBlockedMessage('YouTube Shorts', 'https://www.youtube.com');
    return;
  }
  
  // Handle direct URL redirects for Instagram Reels
  if (hostname.includes('instagram.com') && settings.blockInstagramReels && isInstagramReelURL(location.href)) {
    showBlockedMessage('Instagram Reels', 'https://www.instagram.com');
    return;
  }
  
  // Handle complete Instagram blocking
  if (hostname.includes('instagram.com') && settings.blockInstagramCompletely) {
    showBlockedMessage('Instagram', 'https://www.google.com');
    return;
  }
  
  // Initial sweep
  sweep(document);
  
  // Observe dynamic changes
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length > 0) {
        for (const node of m.addedNodes) {
          if (node.querySelector) {
            sweep(node);
          }
        }
      }
    }
  });
  
  // Start observing if body exists
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

// Initialize when ready
async function init() {
  await loadSettings();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBlocking);
  } else {
    initBlocking();
  }
}

init();
