// Shorts Blocker v2.0.0 - Clean & Simple
let settings = { blockYouTubeShorts: true };

// Load settings from storage
chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
  if (response) settings = response;
});

// Listen for settings changes
chrome.runtime.onMessage.addListener((req) => {
  if (req.action === 'settingsChanged') {
    settings.blockYouTubeShorts = req.changes.blockYouTubeShorts?.newValue ?? settings.blockYouTubeShorts;
  }
});

// === Helper: Pause & cleanup any media inside element ===
function pauseMediaInside(el) {
  try {
    if (!el) return;
    const media = el.querySelectorAll('video, audio');
    media.forEach(m => {
      try {
        m.pause();
        m.src = '';        // 🚫 Strip source
        m.removeAttribute('src');
        m.load();          // Force reload so it stops completely
      } catch (e) {}
    });
  } catch (e) {}
}

// === Shorts detection ===
function looksLikeShortVideo(el) {
  if (!el || !el.tagName || !location.hostname.includes('youtube.com') || !settings.blockYouTubeShorts) return false;

  const tag = el.tagName.toUpperCase();

  // ✅ Sidebar "Shorts" button
  if (tag === 'YTD-GUIDE-ENTRY-RENDERER') {
    const link = el.querySelector('a[href^="/shorts"]');
    const title = el.querySelector('yt-formatted-string.title');
    if (link) return true;
    if (title && title.textContent.trim().toLowerCase() === "shorts") return true;
  }

  // ✅ Shorts shelf on homepage or explore
  if ((tag === 'YTD-RICH-SHELF-RENDERER' || tag === 'YTD-REEL-SHELF-RENDERER') &&
      (el.hasAttribute('is-shorts') || el.querySelector('a[href^="/shorts"]'))) {
    return true;
  }

  // ✅ Shorts inside feed/search/grid
  if (['YTD-VIDEO-RENDERER','YTD-COMPACT-VIDEO-RENDERER','YTD-GRID-VIDEO-RENDERER'].includes(tag)) {
    if (el.querySelector('a[href^="/shorts"]')) return true;
    const v = el.querySelector('video');
    if (v && v.videoHeight > v.videoWidth * 1.1) return true; // vertical = Shorts
  }
  
  return false;
}

// === Remove element if Shorts ===
function removeIfMatches(el) {
  if (looksLikeShortVideo(el)) {
    pauseMediaInside(el);
    el.remove();
    console.debug("🚫 Removed Shorts element:", el.tagName);
  }
}

// === Initial cleanup ===
function cleanAllShorts() {
  document.querySelectorAll('ytd-guide-entry-renderer, ytd-rich-shelf-renderer, ytd-reel-shelf-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer')
    .forEach(el => removeIfMatches(el));
}

// === Live observer to block dynamically loaded Shorts ===
const observer = new MutationObserver(mutations => {
  mutations.forEach(m => {
    m.addedNodes.forEach(node => {
      if (node.nodeType === 1) { // element
        removeIfMatches(node);
        node.querySelectorAll && node.querySelectorAll('*').forEach(child => removeIfMatches(child));
      }
    });
  });
});

// Start observing
observer.observe(document.body, { childList: true, subtree: true });

// Run once on page load
cleanAllShorts();