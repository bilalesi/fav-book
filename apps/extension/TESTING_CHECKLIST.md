# Extension Installation Testing Checklist

This checklist ensures the Social Bookmarks Manager extension is fully tested before submission to browser stores.

## Pre-Installation Testing

### Build Verification

- [ ] Clean build completes without errors
  ```bash
  bun run build:clean
  bun run build
  ```
- [ ] All files present in `dist/` directory
- [ ] Manifest.json copied correctly
- [ ] Icons present in all required sizes (16, 32, 48, 128)
- [ ] Content scripts bundled correctly
- [ ] Background service worker bundled correctly
- [ ] Popup files present and bundled

### Package Creation

- [ ] Zip file created successfully
  ```bash
  bun run package
  ```
- [ ] Zip file size is reasonable (< 5MB)
- [ ] Zip contains all necessary files
- [ ] No unnecessary files included (node_modules, .env, etc.)

## Chrome Installation Testing

### Manual Installation

- [ ] Navigate to `chrome://extensions/`
- [ ] Enable "Developer mode"
- [ ] Click "Load unpacked"
- [ ] Select the `dist` directory
- [ ] Extension loads without errors
- [ ] Extension icon appears in toolbar
- [ ] No console errors in extension pages

### Extension Functionality

**Popup:**

- [ ] Click extension icon opens popup
- [ ] Popup displays correctly
- [ ] Login button works
- [ ] "Go to Dashboard" link works
- [ ] Recent saves display (after saving bookmarks)
- [ ] Collections list displays
- [ ] No console errors in popup

**Authentication:**

- [ ] Can log in with magic link
- [ ] Can log in with OAuth (if implemented)
- [ ] Authentication state persists after browser restart
- [ ] Can log out successfully
- [ ] Logged-out state displays correctly

**X (Twitter) Integration:**

- [ ] Navigate to twitter.com or x.com
- [ ] Save button appears on tweets
- [ ] Save button positioned correctly
- [ ] Hover state works
- [ ] Click save button saves tweet
- [ ] Success notification appears
- [ ] Tweet appears in dashboard
- [ ] Images saved correctly
- [ ] Videos saved correctly
- [ ] Links preserved
- [ ] Author information captured
- [ ] Timestamp captured
- [ ] Works on timeline tweets
- [ ] Works on profile tweets
- [ ] Works on tweet detail pages
- [ ] No console errors

**LinkedIn Integration:**

- [ ] Navigate to linkedin.com
- [ ] Save button appears on posts
- [ ] Save button positioned correctly
- [ ] Hover state works
- [ ] Click save button saves post
- [ ] Success notification appears
- [ ] Post appears in dashboard
- [ ] Images saved correctly
- [ ] Videos saved correctly
- [ ] Links preserved
- [ ] Author information captured
- [ ] Timestamp captured
- [ ] Works on feed posts
- [ ] Works on profile posts
- [ ] Works on article posts
- [ ] No console errors

**Error Handling:**

- [ ] Network error handled gracefully
- [ ] Invalid authentication handled
- [ ] API errors display user-friendly messages
- [ ] Duplicate saves handled correctly
- [ ] Rate limiting handled (if applicable)

### Performance

- [ ] Extension doesn't slow down page loading
- [ ] Save action completes quickly (< 2 seconds)
- [ ] No memory leaks after extended use
- [ ] CPU usage is reasonable
- [ ] Network requests are optimized

### Permissions

- [ ] Only requested permissions are used
- [ ] Permission warnings are acceptable
- [ ] No unnecessary permissions requested

## Firefox Installation Testing

### Manual Installation

- [ ] Navigate to `about:debugging#/runtime/this-firefox`
- [ ] Click "Load Temporary Add-on"
- [ ] Select `dist/manifest.json`
- [ ] Extension loads without errors
- [ ] Extension icon appears in toolbar
- [ ] No console errors in extension pages

### Extension Functionality

**Popup:**

- [ ] Click extension icon opens popup
- [ ] Popup displays correctly
- [ ] Login button works
- [ ] "Go to Dashboard" link works
- [ ] Recent saves display (after saving bookmarks)
- [ ] Collections list displays
- [ ] No console errors in popup

**Authentication:**

- [ ] Can log in with magic link
- [ ] Can log in with OAuth (if implemented)
- [ ] Authentication state persists after browser restart
- [ ] Can log out successfully
- [ ] Logged-out state displays correctly

**X (Twitter) Integration:**

- [ ] Navigate to twitter.com or x.com
- [ ] Save button appears on tweets
- [ ] Save button positioned correctly
- [ ] Hover state works
- [ ] Click save button saves tweet
- [ ] Success notification appears
- [ ] Tweet appears in dashboard
- [ ] Images saved correctly
- [ ] Videos saved correctly
- [ ] Links preserved
- [ ] Author information captured
- [ ] Timestamp captured
- [ ] Works on timeline tweets
- [ ] Works on profile tweets
- [ ] Works on tweet detail pages
- [ ] No console errors

**LinkedIn Integration:**

- [ ] Navigate to linkedin.com
- [ ] Save button appears on posts
- [ ] Save button positioned correctly
- [ ] Hover state works
- [ ] Click save button saves post
- [ ] Success notification appears
- [ ] Post appears in dashboard
- [ ] Images saved correctly
- [ ] Videos saved correctly
- [ ] Links preserved
- [ ] Author information captured
- [ ] Timestamp captured
- [ ] Works on feed posts
- [ ] Works on profile posts
- [ ] Works on article posts
- [ ] No console errors

**Error Handling:**

- [ ] Network error handled gracefully
- [ ] Invalid authentication handled
- [ ] API errors display user-friendly messages
- [ ] Duplicate saves handled correctly
- [ ] Rate limiting handled (if applicable)

### Performance

- [ ] Extension doesn't slow down page loading
- [ ] Save action completes quickly (< 2 seconds)
- [ ] No memory leaks after extended use
- [ ] CPU usage is reasonable
- [ ] Network requests are optimized

### Permissions

- [ ] Only requested permissions are used
- [ ] Permission warnings are acceptable
- [ ] No unnecessary permissions requested

## Cross-Browser Compatibility

- [ ] Extension works identically in Chrome and Firefox
- [ ] UI renders correctly in both browsers
- [ ] All features work in both browsers
- [ ] No browser-specific bugs

## Edge Cases

### Network Conditions

- [ ] Works on slow network
- [ ] Handles offline gracefully
- [ ] Handles intermittent connectivity
- [ ] Timeout errors handled

### Content Variations

- [ ] Handles tweets with only text
- [ ] Handles tweets with images
- [ ] Handles tweets with videos
- [ ] Handles tweets with polls
- [ ] Handles tweets with quotes
- [ ] Handles retweets
- [ ] Handles LinkedIn posts with articles
- [ ] Handles LinkedIn posts with documents
- [ ] Handles very long posts
- [ ] Handles posts with special characters
- [ ] Handles posts with emojis
- [ ] Handles posts with multiple images

### User States

- [ ] Works for new users
- [ ] Works for users with many bookmarks
- [ ] Works for users with no collections
- [ ] Works for users with many collections
- [ ] Handles expired authentication
- [ ] Handles deleted account

### Page States

- [ ] Works on initial page load
- [ ] Works after scrolling
- [ ] Works after infinite scroll loads more content
- [ ] Works on dynamically loaded content
- [ ] Handles page navigation (SPA routing)
- [ ] Handles browser back/forward

## Security Testing

- [ ] Authentication tokens stored securely
- [ ] No sensitive data in console logs
- [ ] HTTPS-only communication
- [ ] Content Security Policy enforced
- [ ] No XSS vulnerabilities
- [ ] No CSRF vulnerabilities
- [ ] Input validation works correctly
- [ ] API keys not exposed in code

## Accessibility

- [ ] Save button has proper ARIA labels
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Sufficient color contrast
- [ ] Focus indicators visible

## Documentation

- [ ] README.md is accurate
- [ ] INSTALLATION.md is accurate
- [ ] All links work
- [ ] Screenshots are current
- [ ] Version number is correct

## Store Listing Preparation

- [ ] Store listing text reviewed
- [ ] Screenshots created
- [ ] Promotional images created (if needed)
- [ ] Privacy policy published
- [ ] Support page published
- [ ] All links in manifest are correct

## Final Checks

- [ ] Version number updated in manifest.json
- [ ] CHANGELOG.md updated
- [ ] No TODO or FIXME comments in code
- [ ] No debug console.log statements
- [ ] Code is minified/optimized
- [ ] All dependencies are up to date
- [ ] No security vulnerabilities in dependencies
- [ ] License information is correct

## Post-Installation Verification

### After Installing from Zip

- [ ] Install from zip file (not unpacked)
- [ ] Extension installs without errors
- [ ] All functionality works
- [ ] No permission errors
- [ ] Icons display correctly

### Update Testing

- [ ] Install previous version
- [ ] Install new version over it
- [ ] Data persists after update
- [ ] No errors during update
- [ ] All features still work

## User Acceptance Testing

### Test with Real Users

- [ ] At least 3 users test the extension
- [ ] Users can complete common tasks
- [ ] Users understand the UI
- [ ] Users report no major issues
- [ ] Collect and address feedback

### Common User Flows

- [ ] New user: Install → Sign up → Save first bookmark
- [ ] Returning user: Open extension → View recent saves
- [ ] Power user: Save multiple bookmarks → Organize into collections
- [ ] Mobile user: Test on mobile browser (if supported)

## Automated Testing (Optional)

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass (if implemented)
- [ ] No linting errors
- [ ] No type errors

## Performance Benchmarks

- [ ] Extension size < 5MB
- [ ] Popup opens in < 500ms
- [ ] Save action completes in < 2s
- [ ] Content script injection < 100ms
- [ ] Memory usage < 50MB
- [ ] No memory leaks over 1 hour

## Browser Compatibility Matrix

| Feature              | Chrome | Firefox | Edge | Notes |
| -------------------- | ------ | ------- | ---- | ----- |
| Installation         | ✓      | ✓       | ✓    |       |
| Popup                | ✓      | ✓       | ✓    |       |
| X Integration        | ✓      | ✓       | ✓    |       |
| LinkedIn Integration | ✓      | ✓       | ✓    |       |
| Authentication       | ✓      | ✓       | ✓    |       |
| Error Handling       | ✓      | ✓       | ✓    |       |

## Known Issues

Document any known issues that won't be fixed before release:

- Issue 1: [Description]
- Issue 2: [Description]

## Sign-Off

- [ ] Developer tested and approved
- [ ] QA tested and approved (if applicable)
- [ ] Product owner approved (if applicable)
- [ ] Ready for submission to stores

## Submission Checklist

- [ ] Chrome Web Store submission complete
- [ ] Firefox Add-ons submission complete
- [ ] Submission confirmation emails received
- [ ] Review status monitored
- [ ] Launch announcement prepared

---

## Testing Notes

Use this section to document any issues found during testing:

### Date: [DATE]

**Tester:** [NAME]
**Browser:** [Chrome/Firefox]
**Issue:** [Description]
**Status:** [Fixed/Won't Fix/Deferred]

---

## Quick Test Script

For rapid testing, run through this minimal flow:

1. **Install:** Load extension in browser
2. **Login:** Authenticate with test account
3. **Save Tweet:** Go to X, save a tweet
4. **Save LinkedIn Post:** Go to LinkedIn, save a post
5. **Verify:** Check dashboard shows both bookmarks
6. **Logout:** Log out and verify logged-out state

If all 6 steps pass, the extension is likely working correctly.
