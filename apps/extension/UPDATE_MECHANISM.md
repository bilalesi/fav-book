# Extension Update Mechanism

This document describes how the Social Bookmarks Manager extension handles updates across Chrome and Firefox.

## Automatic Updates

Both Chrome Web Store and Firefox Add-ons provide automatic update mechanisms. No additional code is required in the extension itself.

### Chrome Web Store

**Update Frequency:**

- Chrome checks for updates every few hours (approximately every 5 hours)
- Updates are downloaded and installed automatically in the background
- Extension is reloaded with the new version

**User Control:**

- Users can manually trigger updates via `chrome://extensions/`
- Click "Update" button to check for updates immediately
- Extensions update silently without user intervention

**Update Process:**

1. Chrome checks the Web Store for new versions
2. If a new version is available, it's downloaded
3. Extension is updated when browser restarts or extension reloads
4. Service worker is restarted with new code

### Firefox Add-ons

**Update Frequency:**

- Firefox checks for updates once per day by default
- Updates are downloaded and installed automatically
- Extension is reloaded with the new version

**User Control:**

- Users can manually check for updates via `about:addons`
- Click the gear icon → "Check for Updates"
- Updates install automatically after download

**Update Process:**

1. Firefox checks Add-ons site for new versions
2. If a new version is available, it's downloaded
3. Extension is updated and reloaded automatically
4. Background scripts restart with new code

## Version Management

### Semantic Versioning

We use semantic versioning (semver) for all releases:

```
MAJOR.MINOR.PATCH

Examples:
1.0.0 - Initial release
1.0.1 - Bug fix
1.1.0 - New feature (backward compatible)
2.0.0 - Breaking change
```

**Version Guidelines:**

- **MAJOR (X.0.0):** Breaking changes, major rewrites, API changes
- **MINOR (1.X.0):** New features, enhancements, backward compatible
- **PATCH (1.0.X):** Bug fixes, security patches, minor improvements

### Updating Version Number

Before each release, update `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Social Bookmarks Manager",
  "version": "1.0.1",  // Update this
  ...
}
```

**Important:** Both stores use this version number to determine if an update is available.

## Release Process

### 1. Prepare Release

```bash
# Update version in manifest.json
# Update CHANGELOG.md with changes
# Test thoroughly
bun run build
bun run test:install
```

### 2. Create Release Package

```bash
# Build and package
bun run package

# This creates: social-bookmarks-manager-1.0.1.zip
```

### 3. Submit to Chrome Web Store

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Select your extension
3. Click "Package" tab
4. Click "Upload new package"
5. Upload the zip file
6. Fill out "What's new in this version" (changelog)
7. Click "Submit for review"

**Review Time:** 1-3 business days

### 4. Submit to Firefox Add-ons

1. Go to [Firefox Add-ons Developer Hub](https://addons.mozilla.org/developers/)
2. Select your extension
3. Click "Upload New Version"
4. Upload the zip file
5. Fill out "Release notes" (changelog)
6. Click "Submit Version"

**Review Time:** Automated review (minutes) or manual review (1-2 weeks)

## Changelog Management

Maintain a `CHANGELOG.md` file in the extension directory:

```markdown
# Changelog

All notable changes to the Social Bookmarks Manager extension will be documented in this file.

## [1.0.1] - 2024-01-15

### Fixed

- Fixed save button not appearing on some LinkedIn posts
- Improved error handling for network failures

### Changed

- Updated popup UI for better readability

## [1.0.0] - 2024-01-01

### Added

- Initial release
- One-click saving for X (Twitter) and LinkedIn
- Extension popup with recent saves
- Authentication with Social Bookmarks Manager account
```

## Update Notifications

### Chrome

Chrome does not provide built-in update notifications. Users see the new version silently.

**Optional: Add Update Detection**

You can detect updates in your service worker:

```typescript
// background/service-worker.ts

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "update") {
    const previousVersion = details.previousVersion;
    const currentVersion = chrome.runtime.getManifest().version;

    console.log(`Updated from ${previousVersion} to ${currentVersion}`);

    // Optional: Show notification or open changelog
    // chrome.notifications.create({ ... });
  }
});
```

### Firefox

Firefox shows a notification when extensions are updated.

**Optional: Add Update Detection**

```typescript
// background/service-worker.ts

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "update") {
    const previousVersion = details.previousVersion;
    const currentVersion = browser.runtime.getManifest().version;

    console.log(`Updated from ${previousVersion} to ${currentVersion}`);
  }
});
```

## Breaking Changes

If you need to make breaking changes:

### 1. Data Migration

If storage schema changes:

```typescript
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "update") {
    const version = chrome.runtime.getManifest().version;

    // Migrate data if needed
    if (needsMigration(details.previousVersion, version)) {
      await migrateData(details.previousVersion, version);
    }
  }
});

async function migrateData(from: string, to: string) {
  // Example: Migrate from v1 to v2 storage format
  const oldData = await chrome.storage.local.get("bookmarks");
  const newData = transformData(oldData);
  await chrome.storage.local.set({ bookmarks: newData });
}
```

### 2. API Compatibility

If backend API changes:

```typescript
// Check API version compatibility
async function checkAPICompatibility() {
  const response = await fetch(`${API_URL}/version`);
  const { version } = await response.json();

  const extensionVersion = chrome.runtime.getManifest().version;

  if (!isCompatible(extensionVersion, version)) {
    // Show update required message
    showUpdateRequiredNotification();
  }
}
```

### 3. Minimum Version Requirements

Document minimum versions in README:

```markdown
## Requirements

- Chrome 88+ or Firefox 78+
- Social Bookmarks Manager account
- Backend API v1.0.0+
```

## Rollback Strategy

If an update causes issues:

### Chrome Web Store

1. Go to Developer Dashboard
2. Select your extension
3. Click "Package" tab
4. Click "Revert to previous version"
5. Select the previous version
6. Submit for review

**Note:** Rollback requires review, not instant.

### Firefox Add-ons

1. Go to Developer Hub
2. Select your extension
3. Go to "Manage Status & Versions"
4. Find the previous version
5. Click "Re-enable" if it was disabled

**Note:** You can have multiple versions active.

## Testing Updates

### Before Release

1. **Test Update Path:**

   - Install previous version
   - Install new version over it
   - Verify data persists
   - Test all features work

2. **Test Fresh Install:**

   - Install new version fresh
   - Verify all features work
   - Test authentication flow

3. **Test on Both Browsers:**
   - Chrome/Edge
   - Firefox

### Beta Testing

**Chrome:**

- Use "Trusted Testers" feature
- Share unlisted extension link
- Get feedback before public release

**Firefox:**

- Upload as "Unlisted" version
- Share direct download link
- Get feedback before listed release

## Update Best Practices

### 1. Gradual Rollout

**Chrome Web Store:**

- Use "Percentage rollout" feature
- Start with 10% of users
- Monitor for issues
- Increase to 100% if stable

**Firefox Add-ons:**

- No built-in gradual rollout
- Consider using unlisted version first

### 2. Monitor After Release

- Check error reports in browser consoles
- Monitor user reviews
- Watch for support emails
- Check analytics for usage drops

### 3. Communicate Changes

- Update store listing with "What's new"
- Post on social media
- Email users (if you have list)
- Update website changelog

### 4. Version Support

- Support at least 2 previous major versions
- Provide migration path for old versions
- Document breaking changes clearly

## Emergency Updates

For critical security fixes:

1. **Immediate Release:**

   - Bump PATCH version
   - Fix the security issue
   - Submit immediately to both stores

2. **Expedited Review:**

   - Chrome: Request expedited review in submission notes
   - Firefox: Mark as security update

3. **User Communication:**
   - Post security advisory
   - Recommend immediate update
   - Provide workaround if possible

## Automated Release Process

### GitHub Actions (Optional)

Create `.github/workflows/release.yml`:

```yaml
name: Release Extension

on:
  push:
    tags:
      - "v*"

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install
        working-directory: apps/extension

      - name: Build extension
        run: bun run build
        working-directory: apps/extension

      - name: Package extension
        run: bun run package
        working-directory: apps/extension

      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
          prerelease: false

      - name: Upload Release Asset
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ steps.create_release.outputs.upload_url }}
          asset_path: ./apps/extension/social-bookmarks-manager-*.zip
          asset_name: social-bookmarks-manager.zip
          asset_content_type: application/zip
```

## Version Compatibility Matrix

| Extension Version | Backend API Version | Chrome Version | Firefox Version |
| ----------------- | ------------------- | -------------- | --------------- |
| 1.0.0             | 1.0.0+              | 88+            | 78+             |
| 1.1.0             | 1.0.0+              | 88+            | 78+             |
| 2.0.0             | 2.0.0+              | 90+            | 80+             |

## Resources

- [Chrome Extension Update Documentation](https://developer.chrome.com/docs/extensions/mv3/hosting/)
- [Firefox Extension Updates](https://extensionworkshop.com/documentation/manage/updating-your-extension/)
- [Semantic Versioning](https://semver.org/)
