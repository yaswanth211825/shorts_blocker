// content_script.js — repaired version for Shorts Blocker
// Preserves original variable names & messaging shape (settings, loadSettings, initBlocking, sweep, looksLikeShortVideo, etc.)

'use strict';

// Global settings (kept as you had them)
let settings = {
  blockYouTubeShorts: true,
  blockInstagramReels: true,
  blockInstagramCompletely: false
};

// --- Messaging / settings loader (keeps your original channel) ---
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

// Listen for settings changes (same action name you used)
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
    // Apply new settings without re-initializing observers multiple times
    applySettings();
  }
});

// --- Utilities to stop audio/video safely ---
function pauseMediaInside(el) {
  try {
    const media = el.querySelectorAll && el.querySelectorAll('video, audio');
    if (media && media.length) {
      media.forEach(m => {
        try {
          m.pause();
          m.muted = true;
          m.currentTime = 0;
          // avoid permanently breaking other pages: only clear src in try/catch
          try { m.src && (m.src = ''); } catch (e) {}
        } catch (e) {}
      });
    }
  } catch (e) {}
}

function pauseAllMedia() {
  try {
    document.querySelectorAll('video, audio').forEach(m => {
      try {
        m.pause();
        m.muted = true;
        m.currentTime = 0;
        try { m.src && (m.src = ''); } catch(e){}
      } catch (e) {}
    });
  } catch (e) {}
}

// --- URL helpers (more robust for SPA) ---
function isYouTubeShortsURL(url) {
  try {
    const u = new URL(url, location.origin);
    // Detect /shorts/ path segments or query param variants
    return /(^|\/)shorts(\/|$)/.test(u.pathname) || u.search.includes('shorts');
  } catch (e) { return false; }
}

function isInstagramReelURL(url) {
  try {
    const u = new URL(url, location.origin);
    return /\/reel(s)?(\/|$)/.test(u.pathname) || u.search.includes('reel');
  } catch (e) { return false; }
}

// --- Visual block message (keeps your original UX but called only after pausing media) ---
function showBlockedMessage(contentType, redirectUrl) {
  // pause audio/video to avoid any sound before we clear the page
  pauseAllMedia();

  // Lightweight overlay so we don't destroy the page environment too aggressively
  // (we don't set document.body.innerHTML = '' to avoid breaking SPA scripts)
  const blockedDiv = document.createElement('div');
  blockedDiv.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    background: linear-gradient(135deg,#667eea 0%, #764ba2 100%);
    color:white; z-index:2147483647; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;
  blockedDiv.id = 'shorts-blocker-overlay';

  blockedDiv.innerHTML = `
    <div style="font-size:72px;margin-bottom:10px">🚫</div>
    <h1 style="margin:0;font-weight:400"> ${contentType} Blocked </h1>
    <p style="opacity:0.9;margin-top:6px">You were prevented from opening ${contentType.toLowerCase()}.</p>
    <p id="shorts-block-countdown" style="opacity:0.85;margin-top:8px">Redirecting shortly…</p>
    <button id="shorts-block-stay" style="margin-top:16px;padding:8px 12px;border-radius:6px;border:none;cursor:pointer">
      Stay on this page
    </button>
  `;

  document.documentElement.appendChild(blockedDiv);

  // If user clicks "Stay on this page", remove overlay and do nothing
  document.getElementById('shorts-block-stay').addEventListener('click', () => {
    try { blockedDiv.remove(); } catch (e) {}
  });

  // Countdown then redirect (short delay to keep UX smooth)
  let seconds = 2;
  const countdownEl = document.getElementById('shorts-block-countdown');
  const interval = setInterval(() => {
    seconds--;
    countdownEl.textContent = `Redirecting in ${seconds}...`;
    if (seconds <= 0) {
      clearInterval(interval);
      try {
        // Use replace to avoid polluting history
        window.location.replace(redirectUrl);
      } catch (e) {
        // as fallback try setting href
        window.location.href = redirectUrl;
      }
    }
  }, 1000);
}

// --- More conservative element-matching (prev code removed too much) ---
function looksLikeShortVideo(el) {
  if (!el || !el.tagName) return false;
  const hostname = window.location.hostname;

  // ------- YouTube logic (only remove when we see real Shorts links/attributes) -------
  if (hostname.includes('youtube.com') && settings.blockYouTubeShorts) {
    const tag = el.tagName.toUpperCase();

    // Sidebar "Shorts" guide item (very specific)
    if (tag === 'YTD-GUIDE-ENTRY-RENDERER') {
      const a = el.querySelector && (el.querySelector('a[href="/shorts"]') || el.querySelector('a[href*="/shorts"]'));
      if (a) return true;
    }

    // Shorts shelf / reel-shelf: specific renderer with attribute or anchor inside
    if (tag === 'YTD-RICH-SHELF-RENDERER' || tag === 'YTD-REEL-SHELF-RENDERER') {
      // Some variants use attributes like is-shorts or contain a link to /shorts
      if (el.hasAttribute && el.hasAttribute('is-shorts')) return true;
      if (el.querySelector && el.querySelector('a[href*="/shorts/"], a[href^="/shorts"]')) return true;
    }

    // Individual entry (compact/video/grid) — only when the anchor clearly points to /shorts/
    const compactTags = ['YTD-VIDEO-RENDERER', 'YTD-COMPACT-VIDEO-RENDERER', 'YTD-GRID-VIDEO-RENDERER'];
    if (compactTags.includes(tag)) {
      const link = el.querySelector && (el.querySelector('a[href*="/shorts/"]') || el.querySelector('a[href^="/shorts"]'));
      if (link) return true;

      // fallback: a contained <video> element with tall aspect ratio (likely a short)
      try {
        const v = el.querySelector && el.querySelector('video');
        if (v && v.videoWidth && v.videoHeight && v.videoHeight > v.videoWidth * 1.1) return true;
      } catch (e) {}
    }
  }

  // ------- Instagram logic (again: specific and conservative) -------
  if (hostname.includes('instagram.com')) {
    const tag = el.tagName.toUpperCase();

    if (settings.blockInstagramCompletely) {
      // if user asked for complete block — block only the main role
      if (tag === 'MAIN' || (el.getAttribute && el.getAttribute('role') === 'main')) return true;
    }

    if (settings.blockInstagramReels) {
      // Reels tab / nav entry (look for link to /reel or /reels)
      if (el.querySelector && (el.querySelector('a[href*="/reel/"]') || el.querySelector('a[href*="/reels/"]'))) {
        // ensure we are removing the specific menu item, not whole nav
        return true;
      }

      // feed article that contains an explicit reel link
      if (tag === 'ARTICLE' && el.querySelector && el.querySelector('a[href*="/reel/"]')) return true;
    }
  }

  return false;
}

// Remove an element but be cautious: pause its media first
function removeIfMatches(el, test) {
  try {
    if (test(el)) {
      pauseMediaInside(el);
      el.remove();
    }
  } catch (e) {}
}

// Targeted sweep (only specific known selectors) - avoids full-site destructive removals
function sweep(root = document) {
  if (!root || !root.querySelectorAll) return;
  const hostname = window.location.hostname;

  if (hostname.includes('youtube.com')) {
    if (!settings.blockYouTubeShorts) return;
    // Only query the likely nodes; this reduces risk of deleting unrelated UI
    const ytSelectors = [
      'ytd-guide-entry-renderer',       // sidebar entries
      'ytd-reel-shelf-renderer',
      'ytd-rich-shelf-renderer',
      'ytd-video-renderer',
      'ytd-compact-video-renderer',
      'ytd-grid-video-renderer'
    ];
    for (const sel of ytSelectors) {
      const nodes = root.querySelectorAll(sel);
      for (const n of nodes) removeIfMatches(n, looksLikeShortVideo);
    }
  }

  if (hostname.includes('instagram.com')) {
    if (!settings.blockInstagramReels && !settings.blockInstagramCompletely) return;
    const instaSelectors = ['main', 'article', 'section', 'div[role="menuitem"]', 'div', 'section'];
    for (const sel of instaSelectors) {
      const nodes = root.querySelectorAll(sel);
      for (const n of nodes) removeIfMatches(n, looksLikeShortVideo);
    }
  }
}

// --- Handle direct navigation to Shorts/Reels (SPA-aware) ---
function handleDirectShortsReelsNavigation() {
  const url = location.href;
  const hostname = window.location.hostname;

  if (hostname.includes('youtube.com') && settings.blockYouTubeShorts && isYouTubeShortsURL(url)) {
    // Pause any playing media, show message, then redirect
    pauseAllMedia();
    showBlockedMessage('YouTube Shorts', 'https://www.youtube.com/');
    return true;
  }

  if (hostname.includes('instagram.com') && (settings.blockInstagramReels || settings.blockInstagramCompletely) && isInstagramReelURL(url)) {
    pauseAllMedia();
    showBlockedMessage('Instagram Reels', 'https://www.instagram.com/');
    return true;
  }

  return false;
}

// --- SPA navigation detection (fires 'locationchange' on history changes) ---
let urlObserverInitialized = false;
function observeUrlChanges() {
  if (urlObserverInitialized) return;
  urlObserverInitialized = true;

  // patch history methods to dispatch a custom event
  (function(history){
    const originalPush = history.pushState;
    history.pushState = function(){
      const result = originalPush.apply(this, arguments);
      window.dispatchEvent(new Event('locationchange'));
      return result;
    };
    const originalReplace = history.replaceState;
    history.replaceState = function(){
      const result = originalReplace.apply(this, arguments);
      window.dispatchEvent(new Event('locationchange'));
      return result;
    };
  })(window.history);

  window.addEventListener('popstate', () => window.dispatchEvent(new Event('locationchange')));

  // also watch DOM mutations to catch frameworks that don't call pushState/replaceState
  const bodyObserver = new MutationObserver(() => {
    // compare hrefs to detect SPA-style navigation
    if (observeUrlChanges._lastHref !== location.href) {
      observeUrlChanges._lastHref = location.href;
      window.dispatchEvent(new Event('locationchange'));
    }
  });
  observeUrlChanges._lastHref = location.href;
  bodyObserver.observe(document, { childList: true, subtree: true });

  // On locationchange -> run detection then sweep
  window.addEventListener('locationchange', () => {
    // Immediately handle direct Shorts/Reels navigations (SPA)
    if (handleDirectShortsReelsNavigation()) return;
    // Otherwise re-sweep the document to hide elements on new pages
    sweep(document);
  });
}

// --- MutationObserver for dynamic content (debounced to avoid heavy loops) ---
let dynamicObserver = null;
let dynamicSweepTimeout = null;
function ensureDynamicObserver() {
  if (dynamicObserver) return;
  dynamicObserver = new MutationObserver((mutations) => {
    // Collect newly added nodes and sweep them only (cheap)
    const added = [];
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length) {
        for (const n of m.addedNodes) {
          if (n.querySelectorAll) added.push(n);
        }
      }
    }
    if (added.length === 0) return;
    if (dynamicSweepTimeout) clearTimeout(dynamicSweepTimeout);
    dynamicSweepTimeout = setTimeout(() => {
      for (const n of added) {
        try { sweep(n); } catch (e) {}
      }
      dynamicSweepTimeout = null;
    }, 120); // small debounce
  });
  if (document.body) dynamicObserver.observe(document.body, { childList: true, subtree: true });
}

// --- Apply settings without re-creating observers ---
function applySettings() {
  // If current URL is a direct Shorts/Reels, handle right away
  if (handleDirectShortsReelsNavigation()) return;
  // Otherwise run a sweep now and ensure the observer is active
  sweep(document);
}

// --- Main blocking init (keeps your function name) ---
function initBlocking() {
  observeUrlChanges();
  ensureDynamicObserver();

  // First chance to block direct URL
  if (handleDirectShortsReelsNavigation()) return;

  // Initial sweep of the document
  sweep(document);
}

// --- Init flow (keeps your original init name) ---
async function init() {
  await loadSettings();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBlocking);
  } else {
    initBlocking();
  }
}

init();
