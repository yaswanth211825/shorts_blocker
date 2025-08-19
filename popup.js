// popup.js - v2.0.0 YouTube Shorts Only
document.addEventListener('DOMContentLoaded', () => {
  const youtubeToggle = document.getElementById('youtube-toggle');
  
  if (!youtubeToggle) return;

  // Load current settings
  chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
    if (response) {
      youtubeToggle.checked = response.blockYouTubeShorts;
    }
  });

  // Handle toggle changes
  youtubeToggle.addEventListener('change', saveSettings);
  
  // Add click handler to slider for better UX
  const slider = document.querySelector('.slider');
  if (slider) {
    slider.addEventListener('click', () => {
      youtubeToggle.checked = !youtubeToggle.checked;
      saveSettings();
    });
  }

  function saveSettings() {
    const settings = {
      blockYouTubeShorts: youtubeToggle.checked
    };

    chrome.storage.local.set(settings, () => {
      // Visual feedback on save
      youtubeToggle.style.transform = 'scale(0.95)';
      setTimeout(() => {
        youtubeToggle.style.transform = 'scale(1)';
      }, 150);
      
      // Auto-refresh YouTube tabs when settings change
      chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.reload(tab.id);
        });
      });
    });
  }
});