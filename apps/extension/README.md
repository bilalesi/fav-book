# Social Bookmarks Manager - Browser Extension

Browser extension for saving bookmarks from X (Twitter) and LinkedIn directly to your Social Bookmarks Manager account.

## Features

- Save tweets and LinkedIn posts with one click
- Automatic extraction of text, images, videos, and metadata
- Works seamlessly on X and LinkedIn
- Secure authentication with your account
- Quick access to recent saves and collections

## Development

### Prerequisites

- Bun runtime installed
- Social Bookmarks Manager backend running

### Setup

```bash
# Install dependencies
bun install

# Build the extension
bun run build

# Watch mode for development
bun run watch
```

### Loading the Extension

#### Chrome/Edge

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` directory

#### Firefox

1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the `manifest.json` file in the `dist` directory

## Project Structure

```
apps/extension/
├── background/          # Background service worker
│   └── service-worker.ts
├── content/            # Content scripts
│   ├── twitter.ts      # X (Twitter) integration
│   ├── linkedin.ts     # LinkedIn integration
│   └── styles.css      # Injected styles
├── popup/              # Extension popup UI
│   ├── popup.html
│   ├── popup.css
│   └── popup.ts
├── icons/              # Extension icons
└── manifest.json       # Extension manifest
```

## Architecture

### Background Service Worker

Handles:

- API communication with backend
- Authentication state management
- Message passing between content scripts and popup
- Cross-origin requests

### Content Scripts

Platform-specific scripts that:

- Detect post elements on the page
- Inject save button overlays
- Extract post metadata
- Send data to background worker

### Popup UI

Provides:

- Recent saves overview
- Quick access to collections
- Extension status and settings
- Login/logout functionality

## Permissions

- `activeTab`: Access current tab for content injection
- `storage`: Store authentication tokens and settings
- Host permissions for `twitter.com`, `x.com`, and `linkedin.com`

## Security

- Authentication tokens stored securely in extension storage
- HTTPS-only API communication
- Content Security Policy enforced
- Minimal permissions requested

## Building for Production

```bash
# Build optimized version
bun run build

# Create distribution package
bun run package

# Test installation
bun run test:install
```

The `package` script creates a zip file ready for submission to browser stores.

## Distribution

See the following guides for distributing the extension:

- **[DISTRIBUTION.md](./DISTRIBUTION.md)** - Complete guide for submitting to Chrome Web Store and Firefox Add-ons
- **[STORE_LISTING.md](./STORE_LISTING.md)** - Store listing text, descriptions, and screenshots guide
- **[TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)** - Comprehensive testing checklist before submission
- **[UPDATE_MECHANISM.md](./UPDATE_MECHANISM.md)** - How extension updates work and release process
- **[SCREENSHOTS.md](./SCREENSHOTS.md)** - Guide for creating professional screenshots
- **[PRIVACY_POLICY_TEMPLATE.md](./PRIVACY_POLICY_TEMPLATE.md)** - Privacy policy template (customize before publishing)

## License

Private - Part of Social Bookmarks Manager
