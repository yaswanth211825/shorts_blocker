# Shorts Blocker Chrome Extension

A Chrome extension that blocks YouTube Shorts and Instagram Reels with customizable toggle controls.

## Features

- **YouTube Shorts Blocking**: Removes Shorts tab from sidebar, Shorts shelf from homepage, and individual Shorts videos
- **Instagram Reels Blocking**: Removes Reels tab from navigation and Reels from feed
- **Direct URL Blocking**: Shows a block message and redirects when visiting Shorts/Reels URLs directly
- **Toggle Controls**: Easy-to-use popup with individual toggles for each platform
- **Persistent Settings**: Settings are saved using Chrome's storage API
- **Dynamic Content Handling**: Uses MutationObserver to handle dynamically loaded content

## Installation & Testing

### 1. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked" button
4. Select the extension directory: `/Users/yash_2111825/CascadeProjects/extension`
5. The extension should now appear in your extensions list

### 2. Test the Extension

#### YouTube Shorts Testing:
1. Go to `https://youtube.com`
2. Look for the "Shorts" tab in the left sidebar - it should be hidden
3. Check the homepage for any Shorts shelves - they should be removed
4. Try visiting a direct Shorts URL like: `https://youtube.com/shorts/dQw4w9WgXcQ`
5. You should see a block message with 5-second countdown

#### Instagram Reels Testing:
1. Go to `https://instagram.com` (requires login)
2. Look for the "Reels" tab in navigation - it should be hidden
3. Check your feed for any Reels content - it should be removed
4. Try visiting a direct Reels URL like: `https://instagram.com/reels/ABC123`
5. You should see a block message with 5-second countdown

#### Popup Testing:
1. Click the extension icon in Chrome's toolbar
2. Toggle the switches to enable/disable blocking for each platform
3. Settings should persist when you close and reopen the popup
4. Test that toggling off removes the blocking behavior

## File Structure

```
extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for storage and messaging
├── content_script.js      # Main blocking logic
├── popup.html            # Popup interface
├── popup.css             # Popup styling
├── popup.js              # Popup functionality
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md            # This file
```

## How It Works

1. **Content Script**: Runs on YouTube and Instagram pages to detect and remove Shorts/Reels elements
2. **Background Script**: Manages settings storage and communication between components
3. **Popup Interface**: Provides user controls for toggling blocking features
4. **MutationObserver**: Monitors DOM changes to handle dynamically loaded content
5. **URL Detection**: Intercepts direct Shorts/Reels URLs and shows block message

## Troubleshooting

- **Extension not working**: Check that it's enabled in `chrome://extensions/`
- **Popup not opening**: Ensure the extension loaded without errors
- **Content not blocked**: Try refreshing the page after enabling blocking
- **Settings not saving**: Check browser console for storage permission errors

## Development Notes

- Uses Manifest V3 for modern Chrome extension standards
- Implements proper error handling and fallbacks
- Modular code structure for maintainability
- Responsive popup design that works on different screen sizes
- Efficient DOM manipulation to minimize performance impact

## Permissions

- `storage`: To save user preferences
- `activeTab`: To interact with current tab content
- Host permissions for `*.youtube.com` and `*.instagram.com`
