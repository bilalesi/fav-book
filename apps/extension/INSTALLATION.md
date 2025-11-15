# Installation Guide

## Building the Extension

```bash
cd fav-book/apps/extension
bun run build
```

This will create a `dist/` directory with the built extension.

## Loading in Chrome/Edge

1. Open Chrome/Edge and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `fav-book/apps/extension/dist` directory
5. The extension should now appear in your extensions list

## Loading in Firefox

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Navigate to `fav-book/apps/extension/dist`
4. Select the `manifest.json` file
5. The extension will be loaded temporarily (until browser restart)

## Testing the Extension

1. Make sure your backend server is running on `http://localhost:3000`
2. Make sure your web app is running on `http://localhost:3001`
3. Log in to the web app first
4. Visit X (Twitter) or LinkedIn
5. You should see "Save" buttons appear on posts/tweets
6. Click the extension icon to see the popup

## Notes

- The extension currently uses hardcoded localhost URLs
- For production, these would need to be configurable
- Icons are placeholders and should be replaced with proper designs
