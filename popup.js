// Popup script for Shorts Blocker extension
// Handles toggle interactions and settings persistence

class PopupController {
  constructor() {
    this.youtubeToggle = document.getElementById('youtube-toggle');
    this.instagramReelsToggle = document.getElementById('instagram-reels-toggle');
    this.instagramCompleteToggle = document.getElementById('instagram-complete-toggle');
    this.status = document.getElementById('status');
    
    this.init();
  }

  async init() {
    // Load current settings
    await this.loadSettings();
    
    // Add event listeners
    this.youtubeToggle.addEventListener('change', () => this.handleToggleChange());
    this.instagramReelsToggle.addEventListener('change', () => this.handleToggleChange());
    this.instagramCompleteToggle.addEventListener('change', () => this.handleInstagramCompleteToggle());
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['blockYouTubeShorts', 'blockInstagramReels', 'blockInstagramCompletely'], (result) => {
        // Set toggle states based on stored settings
        this.youtubeToggle.checked = result.blockYouTubeShorts ?? true;
        this.instagramReelsToggle.checked = result.blockInstagramReels ?? true;
        this.instagramCompleteToggle.checked = result.blockInstagramCompletely ?? false;
        resolve();
      });
    });
  }

  async handleToggleChange() {
    const settings = {
      blockYouTubeShorts: this.youtubeToggle.checked,
      blockInstagramReels: this.instagramReelsToggle.checked,
      blockInstagramCompletely: this.instagramCompleteToggle.checked
    };

    // Save settings to storage
    chrome.storage.local.set(settings, () => {
      this.showStatus('Settings saved');
      
      // Notify background script about the change
      chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: settings
      });
    });
  }

  async handleInstagramCompleteToggle() {
    // If complete blocking is enabled, disable reels-only blocking
    if (this.instagramCompleteToggle.checked) {
      this.instagramReelsToggle.checked = false;
      this.showStatus('Complete Instagram blocking enabled');
    }
    
    this.handleToggleChange();
  }

  showStatus(message) {
    this.status.textContent = message;
    this.status.classList.add('show');
    
    // Hide status after 2 seconds
    setTimeout(() => {
      this.status.classList.remove('show');
    }, 2000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
