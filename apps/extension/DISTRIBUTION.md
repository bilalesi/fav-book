# Extension Distribution Guide

This guide covers the complete process for distributing the Social Bookmarks Manager browser extension to Chrome Web Store and Firefox Add-ons.

## Prerequisites

- [ ] Extension fully tested and working
- [ ] Privacy policy published at your domain
- [ ] Support page published at your domain
- [ ] Developer accounts created:
  - Chrome Web Store Developer Account ($5 one-time fee)
  - Firefox Add-ons Developer Account (free)
- [ ] Screenshots and promotional images prepared
- [ ] Extension icons in all required sizes (already included)

## Building for Distribution

### 1. Update Version Number

Before each release, update the version in `manifest.json`:

```json
{
  "version": "1.0.0" // Use semantic versioning: MAJOR.MINOR.PATCH
}
```

### 2. Build Production Version

```bash
cd apps/extension
bun install
bun run build
```

This creates an optimized build in the `dist/` directory.

### 3. Test the Build

Load the extension from the `dist/` directory in both Chrome and Firefox to verify everything works:

**Chrome:**

1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` directory
5. Test all features

**Firefox:**

1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `dist/manifest.json`
4. Test all features

### 4. Create Distribution Package

```bash
# From the extension directory
cd dist
zip -r ../social-bookmarks-manager-v1.0.0.zip .
cd ..
```

This creates a zip file ready for submission.

## Chrome Web Store Submission

### 1. Create Developer Account

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Sign in with your Google account
3. Pay the $5 one-time registration fee
4. Accept the developer agreement

### 2. Create New Item

1. Click "New Item" in the dashboard
2. Upload the zip file (`social-bookmarks-manager-v1.0.0.zip`)
3. Wait for the upload to complete

### 3. Fill Out Store Listing

**Store Listing Tab:**

- **Product name:** Social Bookmarks Manager
- **Summary:** (Copy from STORE_LISTING.md - Short Description)
- **Description:** (Copy from STORE_LISTING.md - Detailed Description)
- **Category:** Productivity
- **Language:** English

**Graphic Assets:**

Upload the following (create these based on screenshots):

- Icon: 128x128 (use `icons/icon-128.png`)
- Screenshots: At least 1, maximum 5 (1280x800 or 640x400)
- Small promotional tile: 440x280 (optional but recommended)
- Large promotional tile: 920x680 (optional)
- Marquee promotional tile: 1400x560 (optional)

**Additional Fields:**

- **Official URL:** https://[your-domain.com]
- **Support URL:** https://[your-domain.com]/support
- **Privacy policy:** https://[your-domain.com]/privacy

### 4. Privacy Practices

Fill out the privacy questionnaire:

- Does the extension handle personal or sensitive user data? **Yes**
- What data does it collect? **Authentication tokens, saved bookmarks**
- Is the data used for purposes unrelated to the extension's functionality? **No**
- Is the data sold to third parties? **No**
- Is the data used for personalization? **No**

### 5. Submit for Review

1. Review all information
2. Click "Submit for review"
3. Wait for review (typically 1-3 business days)
4. Monitor your email for review status

### 6. After Approval

- Extension will be published automatically
- Share the Chrome Web Store link
- Monitor reviews and ratings

## Firefox Add-ons Submission

### 1. Create Developer Account

1. Go to [Firefox Add-ons Developer Hub](https://addons.mozilla.org/developers/)
2. Sign in with your Firefox account (or create one)
3. Accept the developer agreement

### 2. Submit New Add-on

1. Click "Submit a New Add-on"
2. Choose "On this site" (for listed add-ons)
3. Upload the zip file

### 3. Fill Out Add-on Details

**Basic Information:**

- **Name:** Social Bookmarks Manager
- **Add-on URL:** social-bookmarks-manager (slug for the URL)
- **Summary:** (Copy from STORE_LISTING.md - Firefox Summary)
- **Description:** (Copy from STORE_LISTING.md - Firefox Description)

**Categories:**

- Productivity
- Social & Communication

**Tags:**
bookmark, twitter, linkedin, social-media, archive, organization

**License:**

- Choose "All Rights Reserved" or your preferred license

**Privacy Policy:**

- Paste your privacy policy or link to https://[your-domain.com]/privacy

**Support Information:**

- **Support email:** support@[your-domain.com]
- **Support website:** https://[your-domain.com]/support
- **Homepage:** https://[your-domain.com]

### 4. Upload Media

- **Icon:** 128x128 (use `icons/icon-128.png`)
- **Screenshots:** Upload 3-5 screenshots (1280x800 or 1920x1080)

### 5. Technical Details

**Platforms:**

- Select "Firefox for Desktop"
- Optionally select "Firefox for Android" if compatible

**Permissions:**
The review will automatically detect permissions from manifest. Be prepared to justify:

- `activeTab`: Required to inject save buttons on social media pages
- `storage`: Required to store authentication tokens
- Host permissions: Required to access X and LinkedIn pages

### 6. Submit for Review

1. Review all information
2. Click "Submit Version"
3. Automated review will run first
4. Manual review may follow (1-2 weeks)
5. Monitor email for review status

### 7. After Approval

- Add-on will be listed on Firefox Add-ons
- Share the Firefox Add-ons link
- Monitor reviews and ratings

## Update Mechanism

### Automatic Updates

Both Chrome and Firefox handle automatic updates:

**Chrome:**

- Extensions update automatically every few hours
- Users can manually update via chrome://extensions/

**Firefox:**

- Extensions update automatically daily
- Users can manually update via about:addons

### Publishing Updates

1. Update version number in `manifest.json`
2. Build new version
3. Create new zip file
4. Upload to both stores
5. Fill out "What's new" section with changelog
6. Submit for review

### Version Numbering

Use semantic versioning:

- **Major (1.0.0):** Breaking changes or major new features
- **Minor (1.1.0):** New features, backward compatible
- **Patch (1.0.1):** Bug fixes, backward compatible

## Testing Installation Process

### Chrome Installation Test

1. Build and zip the extension
2. Go to Chrome Web Store Developer Dashboard
3. Use "Test" button to get a test link
4. Open test link in Chrome
5. Click "Add to Chrome"
6. Verify installation and functionality
7. Test authentication flow
8. Test saving bookmarks on X and LinkedIn

### Firefox Installation Test

1. Build and zip the extension
2. After submission, use the unlisted version for testing
3. Share the test link with testers
4. Install and verify functionality
5. Test authentication flow
6. Test saving bookmarks on X and LinkedIn

### Manual Installation Test

**Chrome:**

```bash
# Load unpacked extension
1. chrome://extensions/
2. Enable Developer mode
3. Load unpacked -> select dist/
4. Test all features
```

**Firefox:**

```bash
# Load temporary add-on
1. about:debugging#/runtime/this-firefox
2. Load Temporary Add-on
3. Select dist/manifest.json
4. Test all features
```

## Common Issues and Solutions

### Chrome Web Store

**Issue:** "Manifest version not supported"

- **Solution:** Ensure manifest_version is 3

**Issue:** "Permission warnings"

- **Solution:** Justify all permissions in the review notes

**Issue:** "Deceptive installation tactics"

- **Solution:** Ensure description is accurate and doesn't mislead users

**Issue:** "Functionality not working"

- **Solution:** Test thoroughly before submission, ensure backend API is accessible

### Firefox Add-ons

**Issue:** "Add-on doesn't work as described"

- **Solution:** Ensure all features in description are working

**Issue:** "Privacy policy missing or incomplete"

- **Solution:** Provide comprehensive privacy policy covering all data handling

**Issue:** "Permissions not justified"

- **Solution:** Explain why each permission is necessary in the review notes

## Monitoring and Maintenance

### After Launch

1. **Monitor Reviews:**

   - Respond to user reviews promptly
   - Address common issues in updates
   - Thank users for positive feedback

2. **Track Metrics:**

   - Installation count
   - Active users
   - Uninstall rate
   - Review ratings

3. **Regular Updates:**

   - Fix bugs promptly
   - Add requested features
   - Keep dependencies updated
   - Test with browser updates

4. **User Support:**
   - Monitor support email
   - Update FAQ based on common questions
   - Provide clear documentation

## Compliance

### Chrome Web Store Policies

- No deceptive behavior
- No malware or unwanted software
- Respect user privacy
- Single purpose extensions
- No keyword stuffing
- Accurate descriptions

### Firefox Add-ons Policies

- No malicious code
- Respect user privacy
- Clear permission requests
- Accurate descriptions
- No obfuscated code
- Follow security best practices

## Checklist Before Submission

- [ ] Extension fully tested on both platforms
- [ ] Version number updated in manifest.json
- [ ] Production build created and tested
- [ ] Zip file created
- [ ] All screenshots prepared
- [ ] Store listing text ready
- [ ] Privacy policy published
- [ ] Support page published
- [ ] Developer accounts created
- [ ] Payment completed (Chrome)
- [ ] Test installation process
- [ ] Verify authentication works
- [ ] Test on X (Twitter)
- [ ] Test on LinkedIn
- [ ] Check for console errors
- [ ] Verify all links work
- [ ] Review submission forms completed

## Resources

### Chrome Web Store

- [Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Program Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- [Best Practices](https://developer.chrome.com/docs/webstore/best-practices/)

### Firefox Add-ons

- [Developer Hub](https://addons.mozilla.org/developers/)
- [Add-on Policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)
- [Submission Guide](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)

### General

- [Manifest V3 Migration](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Extension Security Best Practices](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Security_best_practices)
