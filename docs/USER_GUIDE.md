# Social Bookmarks Manager - User Guide

Welcome to the Social Bookmarks Manager! This guide will help you get started with managing your social media bookmarks from X (Twitter) and LinkedIn, as well as saving any URL from across the web.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Saving Bookmarks](#saving-bookmarks)
4. [Saving URL Bookmarks](#saving-url-bookmarks)
5. [Browsing and Searching](#browsing-and-searching)
6. [Collections](#collections)
7. [Categories](#categories)
8. [Bulk Import](#bulk-import)
9. [Settings](#settings)

## Getting Started

### What is Social Bookmarks Manager?

Social Bookmarks Manager is a powerful tool that helps you save, organize, and search through your favorite posts from X (Twitter) and LinkedIn, as well as any URL from across the web. Unlike native bookmarking features, our app:

- **Preserves complete content** - Text, images, videos, and links are saved even if the original post is deleted
- **Universal bookmarking** - Save any web page, not just social media posts
- **Advanced search** - Find bookmarks quickly with full-text search
- **Smart organization** - Group bookmarks into collections and categorize by topic
- **Cross-platform** - Access your bookmarks from any device
- **Privacy-focused** - Your bookmarks are stored securely in your private database

### System Requirements

- Modern web browser (Chrome, Firefox, Edge, or Safari)
- Internet connection
- X (Twitter) or LinkedIn account for authentication

## Authentication

### Signing In

You can sign in to Social Bookmarks Manager using three methods:

#### 1. X (Twitter) Account

1. Click the "Continue with X" button on the login page
2. You'll be redirected to X to authorize the app
3. After authorization, you'll be redirected back and logged in

#### 2. LinkedIn Account

1. Click the "Continue with LinkedIn" button on the login page
2. You'll be redirected to LinkedIn to authorize the app
3. After authorization, you'll be redirected back and logged in

#### 3. Magic Link (Email)

1. Enter your email address in the email field
2. Click "Send Magic Link"
3. Check your email inbox for a message from Social Bookmarks Manager
4. Click the link in the email to sign in
5. You'll be automatically logged in when you click the link

### Security

- Your session is securely encrypted
- Authentication tokens are stored safely
- You can log out at any time from the user menu

## Saving Bookmarks

There are two ways to save bookmarks: using the browser extension or bulk import.

### Using the Browser Extension

The browser extension is the easiest way to save bookmarks as you browse X or LinkedIn.

#### Installation

See the [Extension Installation Guide](../apps/extension/INSTALLATION.md) for detailed instructions.

#### Saving a Post

1. **On X (Twitter):**

   - Browse to any tweet
   - Look for the "Save" button that appears on the tweet
   - Click "Save" to bookmark the tweet
   - You'll see a confirmation message

2. **On LinkedIn:**
   - Browse to any post
   - Look for the "Save" button that appears on the post
   - Click "Save" to bookmark the post
   - You'll see a confirmation message

#### What Gets Saved?

When you save a bookmark, we capture:

- Complete text content
- All images (with full resolution URLs)
- Video links and thumbnails
- External links mentioned in the post
- Author information (name, username, profile)
- Post timestamp
- Platform (X or LinkedIn)

### Bulk Import

For importing existing bookmarks, see the [Bulk Import](#bulk-import) section below.

## Saving URL Bookmarks

In addition to social media posts, you can save any URL from across the web. This feature allows you to bookmark articles, documentation, videos, or any web page you want to save for later.

### Quick Save from Browser Extension

The easiest way to save a URL is using the browser extension's quick save feature.

#### How to Quick Save

1. **Navigate to any web page** you want to bookmark
2. **Click the extension icon** in your browser toolbar
3. The popup will show:
   - Current page URL
   - Page title (automatically detected)
   - Collection selector (optional)
4. **Select collections** (optional) - Choose one or more collections to organize your bookmark
5. **Click "Save"** to bookmark the page
6. You'll see a **confirmation message** within 2 seconds

#### What Gets Saved?

When you save a URL bookmark, the system automatically extracts:

- **Page title** - The title of the web page
- **Description** - Meta description or Open Graph description
- **Favicon** - The site's icon for visual identification
- **Domain name** - For quick reference
- **URL** - The complete web address
- **Timestamp** - When you saved it

**Note:** If metadata extraction fails (e.g., due to network issues), the system will use the domain name as a fallback title and still save your bookmark.

#### Duplicate Detection

The extension is smart about duplicates:

- **When you open the popup** on a page you've already bookmarked, you'll see a visual indicator
- **Already bookmarked pages** show a different state with options to:
  - View the existing bookmark
  - Edit bookmark details
  - Remove the bookmark
- **Attempting to save a duplicate** will show a notification instead of creating a new bookmark

#### Offline Support

The extension works even when you're offline:

- **No internet connection?** Your bookmark is saved locally in a queue
- **Automatic retry** - When connectivity is restored, queued bookmarks are automatically synced
- **Visual feedback** - You'll see "Saved locally, will sync when online" message
- **Exponential backoff** - The extension retries with increasing delays (max 3 attempts)
- **Queue limit** - Up to 50 bookmarks can be queued locally

### Organizing URL Bookmarks

#### Adding to Collections During Save

1. When the extension popup opens, you'll see a **collection selector**
2. **Click the dropdown** to see your collections
3. **Select one or more collections** to organize your bookmark
4. The bookmark will be added to selected collections immediately upon save

#### Adding to Collections After Save

1. Go to the **Bookmarks page** in the web app
2. Find your URL bookmark
3. Click to open the **bookmark details**
4. Click **"Add to Collection"**
5. Select collections and click **"Save"**

### Batch Import URLs

For importing multiple URLs at once, use the batch import feature in the web application.

#### How to Batch Import

1. **Navigate to Import > URLs** in the web app
2. **Prepare your URL list:**
   - One URL per line
   - Must be valid http:// or https:// URLs
   - No blank lines
3. **Paste URLs** into the textarea
4. **Select collections** (optional) - All imported URLs will be added to selected collections
5. **Review validation:**
   - Valid URLs show in green
   - Invalid URLs show in red with error messages
   - URL count is displayed
6. **Click "Import"** to start the process

#### Import Progress

During import, you'll see:

- **Progress bar** showing percentage completed
- **Real-time status updates** (e.g., "Processing 15 of 50...")
- **Processing indicator** while import is running
- **Form is disabled** to prevent accidental changes

#### Import Results

After import completes, you'll see a detailed summary:

- **Success count** - URLs successfully imported
- **Duplicate count** - URLs that were already bookmarked (skipped)
- **Failure count** - URLs that failed to import
- **Error details** - Expandable list showing which URLs failed and why
- **Retry option** - Ability to retry failed URLs
- **View bookmarks link** - Quick link to see your imported bookmarks

#### Import Best Practices

- **Validate URLs first** - Check that all URLs are accessible before importing
- **Batch size** - Recommended maximum of 100 URLs per batch for optimal performance
- **Collection assignment** - Assign to collections during import to save time
- **Review errors** - Check error details for failed imports and fix issues
- **Skip duplicates** - The system automatically skips duplicates by default

#### Common Import Errors

- **Invalid URL format** - URL must start with http:// or https://
- **Metadata extraction timeout** - Page took too long to load (3 second timeout)
- **Network error** - Unable to reach the URL
- **Access denied** - Page requires authentication or blocks automated access

### Viewing URL Bookmarks

URL bookmarks appear alongside your social media bookmarks in the main bookmarks view.

#### Visual Identification

URL bookmarks are displayed with:

- **Favicon** - The site's icon (or a default globe icon)
- **Page title** - The extracted or user-provided title
- **Domain name** - Shown below the title for quick reference
- **Description** - Page description if available
- **Collections** - Any collections the bookmark belongs to
- **Quick actions** - Edit, delete, and open URL buttons

#### Filtering URL Bookmarks

To see only URL bookmarks:

1. Go to the **Bookmarks page**
2. Click **"Filters"**
3. Under **Platform**, select **"URLs"**
4. Only URL bookmarks will be displayed

You can combine this with other filters:

- **Date range** - Find URLs saved in a specific time period
- **Collections** - URLs in specific collections
- **Search** - Search within URL bookmark titles and descriptions

### Editing URL Bookmarks

You can edit URL bookmark details after saving:

1. **Open the bookmark** from the bookmarks page
2. Click **"Edit"**
3. You can modify:
   - **Title** - Change the display title
   - **Description** - Add or edit notes
   - **Collections** - Add or remove collection associations
4. Click **"Save"** to update

**Note:** You cannot edit the URL itself. If you need to save a different URL, create a new bookmark.

### Managing URL Bookmarks

#### Bulk Operations

Select multiple URL bookmarks to perform bulk actions:

1. **Select bookmarks** - Click checkboxes on multiple URL bookmarks
2. **Choose action:**
   - **Add to collections** - Add all selected bookmarks to collections
   - **Delete** - Remove multiple bookmarks at once
3. **Confirm** the action

#### Deleting URL Bookmarks

To delete a single URL bookmark:

1. Open the bookmark details
2. Click **"Delete"**
3. **Confirm deletion** in the dialog
4. The bookmark is permanently removed

### URL Bookmark Tips

#### Organization Tips

- **Use descriptive collections** - Create collections like "Articles to Read", "Documentation", "Tutorials"
- **Tag with categories** - Assign relevant categories for better filtering
- **Add notes** - Edit the description to add your own notes or context
- **Regular cleanup** - Review and remove bookmarks you no longer need

#### Quick Save Tips

- **Keyboard shortcut** - Click the extension icon or use browser shortcut (if configured)
- **Pre-select collections** - The extension remembers your last collection selection
- **Check before saving** - The duplicate indicator helps avoid redundant saves
- **Save early** - Bookmark pages as you find them, organize later

#### Search Tips

- **Search by domain** - Type the domain name to find all bookmarks from that site
- **Search by title** - Use keywords from the page title
- **Combine filters** - Use search + URL platform filter for precise results
- **Use collections** - Organize by topic for easier retrieval

### Troubleshooting URL Bookmarks

#### Extension Issues

**Save button not working:**

- Check that you're logged in to the web app
- Verify internet connection
- Try refreshing the page and reopening the extension
- Check browser console for errors

**Metadata not extracted:**

- Some sites block automated access
- The system will use domain name as fallback
- You can manually edit the title and description after saving

**Duplicate not detected:**

- URL normalization handles most variations
- Slight URL differences (query parameters) may not be detected
- Check your bookmarks manually if unsure

#### Import Issues

**URLs not validating:**

- Ensure URLs start with http:// or https://
- Remove any extra spaces or line breaks
- Check for special characters that might break the URL

**Import taking too long:**

- Large batches (100+ URLs) may take several minutes
- Keep the browser tab active during import
- Consider splitting into smaller batches

**Some URLs failed:**

- Check error details in the import summary
- Common issues: invalid URLs, timeout, access denied
- Retry failed URLs after fixing issues

### URL Bookmarks vs Social Bookmarks

| Feature             | URL Bookmarks                | Social Bookmarks                  |
| ------------------- | ---------------------------- | --------------------------------- |
| **Source**          | Any web page                 | X (Twitter) or LinkedIn posts     |
| **Content Saved**   | Title, description, metadata | Full post content, images, videos |
| **Metadata**        | Extracted from page          | From social platform API          |
| **Author Info**     | Domain name                  | Social profile (name, username)   |
| **Quick Save**      | Extension popup              | Extension content script button   |
| **Batch Import**    | URL list (web app)           | JSON export (crawler scripts)     |
| **Duplicate Check** | By normalized URL            | By platform + post ID             |
| **Offline Support** | Yes (queued locally)         | Yes (queued locally)              |
| **Collections**     | Yes                          | Yes                               |
| **Categories**      | Yes                          | Yes                               |
| **Search**          | Title, description, domain   | Full post content, author, links  |

## Browsing and Searching

### Dashboard

The dashboard is your home page after logging in. It shows:

- **Total bookmarks** by platform (X and LinkedIn)
- **Recent bookmarks** - Your 5 most recently saved posts
- **Most viewed** - Your 5 most frequently accessed bookmarks
- **Topic breakdown** - Distribution of bookmarks by category

Click on any statistic to view filtered results.

### Bookmarks Page

The main bookmarks page displays all your saved bookmarks.

#### View Modes

Toggle between two view modes:

- **Card View** (default) - Visual cards showing post preview, images, and metadata
- **Table View** - Compact table with columns for title, author, date, and source

#### Search

Use the search bar at the top to find bookmarks:

1. Type your search query
2. Results appear as you type (with a short delay)
3. Search looks through:
   - Post text content
   - Author names
   - Links in posts
4. Results are ranked by relevance
5. Matching keywords are highlighted

**Search Tips:**

- Use specific keywords for better results
- Search is case-insensitive
- Partial words are matched
- Combine with filters for precise results

#### Filtering

Apply filters to narrow down your bookmarks:

**Available Filters:**

- **Date Range** - Filter by when you saved the bookmark

  - Last 7 days
  - Last 30 days
  - Last 90 days
  - Custom date range

- **Platform** - Filter by source

  - X (Twitter)
  - LinkedIn
  - URLs (Generic web pages)
  - All platforms

- **Author** - Filter by who posted

  - Type author name or username
  - Shows matching authors

- **Categories** - Filter by topic
  - Select one or multiple categories
  - Only bookmarks with ALL selected categories are shown

**Using Filters:**

1. Click the filter icon or "Filters" button
2. Select your filter criteria
3. Filters apply immediately
4. Multiple filters work together (AND logic)
5. Click "Clear Filters" to reset

**Filter Persistence:**

- Filters are saved in the URL
- Share filtered views by copying the URL
- Filters persist when you navigate away and return

#### Pagination

- Bookmarks load automatically as you scroll (infinite scroll)
- 20 bookmarks load at a time
- Scroll to the bottom to load more

### Bookmark Details

Click on any bookmark to view full details:

- Complete post content
- All media (images, videos) in a gallery
- Author information with profile link
- Original post link
- Save date and view count
- Associated collections
- Assigned categories

**Actions on Detail Page:**

- **Edit** - Modify bookmark metadata
- **Delete** - Remove the bookmark (with confirmation)
- **Add to Collection** - Organize into collections
- **Assign Categories** - Tag with topics
- **View Original** - Open the original post on X or LinkedIn

## Collections

Collections help you organize related bookmarks together.

### Creating a Collection

1. Go to the Collections page
2. Click "Create Collection"
3. Enter a name (required)
4. Add a description (optional)
5. Click "Create"

### Adding Bookmarks to Collections

**From Bookmark Detail Page:**

1. Open a bookmark
2. Click "Add to Collection"
3. Select one or more collections
4. Click "Save"

**From Collection Page:**

1. Open a collection
2. Click "Add Bookmarks"
3. Select bookmarks to add
4. Click "Add"

### Managing Collections

**View Collection:**

- Click on a collection to see all bookmarks in it
- Bookmarks can belong to multiple collections

**Edit Collection:**

- Click the edit icon on a collection
- Update name or description
- Click "Save"

**Delete Collection:**

- Click the delete icon on a collection
- Confirm deletion
- Note: Deleting a collection does NOT delete the bookmarks

### Collection Use Cases

- **Project Research** - Save posts related to a specific project
- **Learning Topics** - Group educational content by subject
- **Inspiration** - Collect design, writing, or creative inspiration
- **Reading List** - Save articles and threads to read later
- **Event Coverage** - Gather posts about a conference or event

## Categories

Categories are tags that help you organize bookmarks by topic.

### System Categories

The app provides predefined categories:

- Technology
- Business
- Design
- Marketing
- Development
- Personal
- News
- Education
- Entertainment
- Other

### Custom Categories

Create your own categories:

1. Go to Settings or use the category manager
2. Click "Create Category"
3. Enter a category name
4. Click "Create"

### Assigning Categories

**From Bookmark Detail Page:**

1. Open a bookmark
2. Click "Manage Categories"
3. Select one or more categories
4. Click "Save"

**Bulk Assignment:**

- Select multiple bookmarks (future feature)
- Assign categories to all at once

### Filtering by Category

1. Go to the Bookmarks page
2. Open the Filters panel
3. Select one or more categories
4. View bookmarks with those categories

## Bulk Import

Import your existing bookmarks from X or LinkedIn using our crawler scripts.

### Step 1: Extract Your Bookmarks

#### For X (Twitter) Bookmarks:

1. Go to https://twitter.com/i/bookmarks
2. Make sure you're logged in
3. Open browser console (F12 or Cmd+Option+J)
4. Copy and paste the contents of `scripts/twitter-crawler.js`
5. Press Enter to run the script
6. Wait for the script to complete (keep the tab active)
7. A JSON file will download automatically

#### For LinkedIn Saved Posts:

1. Go to https://www.linkedin.com/my-items/saved-posts/
2. Make sure you're logged in
3. Open browser console (F12 or Cmd+Option+J)
4. Copy and paste the contents of `scripts/linkedin-crawler.js`
5. Press Enter to run the script
6. Wait for the script to complete (keep the tab active)
7. A JSON file will download automatically

**Important Notes:**

- Keep the browser tab active while the script runs
- Don't close or switch tabs during extraction
- For large collections (500+ bookmarks), this may take several minutes
- The script will show progress in the top-right corner

### Step 2: Import the File

1. Go to the Import page in Social Bookmarks Manager
2. Click "Choose File" or drag and drop your JSON file
3. The file will be validated
4. Click "Import" to start the import process
5. Wait for the import to complete
6. You'll see a summary showing:
   - Total bookmarks in file
   - Successfully imported
   - Duplicates skipped
   - Errors (if any)

### Troubleshooting Import

**File validation failed:**

- Make sure you're uploading the JSON file from the crawler script
- Don't edit the file manually
- Re-run the crawler script if needed

**Some bookmarks failed to import:**

- Check the error details in the import summary
- Common issues:
  - Deleted posts with missing data
  - Invalid URLs
  - Corrupted media links

**Duplicates detected:**

- The system automatically detects existing bookmarks
- Duplicates are skipped to avoid redundancy
- Based on platform + post ID

## Settings

Access settings from the user menu (top right).

### Profile Information

View your account details:

- Name
- Email
- Connected accounts (X, LinkedIn)

### Preferences

Customize your experience:

- **Default View** - Choose card or table view as default
- **Bookmarks Per Page** - Set pagination size
- **Theme** - Light or dark mode (future feature)

### Account Management

- **Change Email** - Update your email address
- **Connected Accounts** - Manage OAuth connections
- **Delete Account** - Permanently delete your account and all data

### Logout

Click "Logout" to sign out of your account.

## Tips and Best Practices

### Organization Tips

1. **Use Collections for Projects** - Create a collection for each project or area of interest
2. **Tag with Categories** - Assign 1-3 relevant categories to each bookmark
3. **Regular Cleanup** - Periodically review and delete bookmarks you no longer need
4. **Descriptive Collection Names** - Use clear names like "React Tutorials" instead of "Stuff"

### Search Tips

1. **Be Specific** - Use specific keywords for better results
2. **Combine Filters** - Use search + filters for precise results
3. **Save Searches** - Bookmark filtered URLs for quick access
4. **Use Author Filter** - Find all posts from a specific person

### Performance Tips

1. **Regular Imports** - Import bookmarks regularly rather than waiting for thousands to accumulate
2. **Archive Old Bookmarks** - Move old bookmarks to archive collections
3. **Limit Media** - Very large images may slow down loading

### Privacy Tips

1. **Review Permissions** - Check what data the extension can access
2. **Logout on Shared Devices** - Always logout when using public computers
3. **Secure Your Email** - Use a strong password for your email account (for magic links)

## Keyboard Shortcuts

(Future feature - coming soon)

- `Ctrl/Cmd + K` - Focus search bar
- `Ctrl/Cmd + N` - New collection
- `Esc` - Close dialogs
- `Arrow Keys` - Navigate bookmarks

## Mobile Access

The web app is fully responsive and works on mobile devices:

- Access from any mobile browser
- Touch-friendly interface
- Swipe gestures for navigation (future feature)
- Mobile-optimized layouts

Note: The browser extension is desktop-only.

## Data and Privacy

### What Data We Store

- Bookmark content (text, media URLs, metadata)
- Your profile information (name, email)
- Collections and categories you create
- Usage statistics (view counts)

### What We Don't Store

- Your social media passwords
- Private messages
- Posts you haven't explicitly saved
- Your browsing history

### Data Security

- All data encrypted in transit (HTTPS)
- Secure database storage
- Regular backups
- No data sharing with third parties

### Data Export

(Future feature)

- Export all your bookmarks as JSON
- Download your complete data
- Portable format for migration

### Data Deletion

To delete your data:

1. Go to Settings
2. Click "Delete Account"
3. Confirm deletion
4. All your data will be permanently deleted

## Troubleshooting

### Can't Log In

**OAuth (X/LinkedIn) not working:**

- Clear browser cookies and cache
- Try a different browser
- Check if X/LinkedIn is accessible
- Verify you're using the correct account

**Magic link not received:**

- Check spam/junk folder
- Wait a few minutes (emails can be delayed)
- Verify email address is correct
- Try requesting a new magic link

### Extension Not Working

**Save button not appearing:**

- Refresh the page
- Check if extension is enabled
- Verify you're logged in to the web app
- Check browser console for errors

**Save fails:**

- Check internet connection
- Verify backend server is running
- Check if you're still logged in
- Try refreshing and saving again

### Search Not Working

**No results found:**

- Check spelling
- Try broader keywords
- Clear filters
- Verify bookmarks exist

**Slow search:**

- Large collections (10,000+) may be slower
- Try adding filters to narrow results
- Check internet connection

### Import Issues

**Script won't run:**

- Make sure you're on the correct page
- Check if you're logged in to X/LinkedIn
- Try refreshing the page
- Type "allow pasting" if prompted (Chrome)

**Import fails:**

- Verify JSON file is valid
- Check file size (very large files may timeout)
- Try importing in smaller batches
- Check error messages for details

## Getting Help

### Documentation

- [Extension Installation Guide](../apps/extension/INSTALLATION.md)
- [Crawler Scripts Guide](../scripts/README.md)
- [FAQ](#frequently-asked-questions)

### Support

If you need help:

1. Check this user guide
2. Review the FAQ below
3. Check the troubleshooting section
4. Contact support (if available)

## Frequently Asked Questions

### General

**Q: Is Social Bookmarks Manager free?**
A: Pricing information is available on the website.

**Q: Can I use it without the browser extension?**
A: Yes, you can use bulk import to add bookmarks, but the extension makes saving much easier.

**Q: Does it work on mobile?**
A: The web app works on mobile browsers, but the extension is desktop-only.

**Q: Can I share my bookmarks with others?**
A: Not in the current version. Sharing features may be added in the future.

### Bookmarks

**Q: What happens if the original post is deleted?**
A: Your bookmark is preserved with all the content we saved (text, images, etc.).

**Q: Can I edit the content of a bookmark?**
A: You can edit metadata (notes, categories) but not the original post content.

**Q: How many bookmarks can I save?**
A: There's no hard limit, but performance is optimized for up to 10,000 bookmarks.

**Q: Can I save private posts?**
A: Only posts you can see on the platform can be saved.

**Q: Can I bookmark any website?**
A: Yes! Use the quick save feature in the extension or batch import URLs in the web app.

**Q: What if a website blocks metadata extraction?**
A: The system will use the domain name as a fallback title. You can manually edit the title and description after saving.

**Q: Can I save the same URL multiple times?**
A: No, the system automatically detects duplicates and prevents saving the same URL twice.

**Q: Do URL bookmarks work offline?**
A: Yes, the extension queues bookmarks locally when offline and syncs them when connectivity is restored.

### Collections and Categories

**Q: What's the difference between collections and categories?**
A: Collections are custom groups you create. Categories are tags for organizing by topic.

**Q: Can a bookmark be in multiple collections?**
A: Yes, bookmarks can belong to multiple collections.

**Q: Can I nest collections?**
A: Not in the current version. Nested collections may be added in the future.

### Import and Export

**Q: Can I import bookmarks from other services?**
A: Currently only X and LinkedIn are supported via crawler scripts.

**Q: Can I export my bookmarks?**
A: Export feature is planned for a future release.

**Q: Will import create duplicates?**
A: No, the system automatically detects and skips duplicates.

### Privacy and Security

**Q: Who can see my bookmarks?**
A: Only you. Bookmarks are private to your account.

**Q: Is my data encrypted?**
A: Yes, data is encrypted in transit and at rest.

**Q: Can I delete my account?**
A: Yes, you can delete your account and all data from Settings.

**Q: Do you sell my data?**
A: No, we never sell or share your data with third parties.

### Technical

**Q: Which browsers are supported?**
A: Chrome, Firefox, Edge, and Safari (latest versions).

**Q: Does it work offline?**
A: No, an internet connection is required.

**Q: Can I self-host it?**
A: The codebase is private, but self-hosting may be available in the future.

**Q: Is there an API?**
A: Not publicly available, but may be added for advanced users.

## Changelog

### Version 1.1.0 (Current)

- **URL Bookmarking** - Save any web page, not just social media posts
- Quick save from browser extension with automatic metadata extraction
- Batch import URLs from the web app
- Duplicate detection for URL bookmarks
- Offline support with local queue and automatic sync
- Collection organization for URL bookmarks
- Platform filter for URLs

### Version 1.0.0

- Initial release
- X (Twitter) and LinkedIn support
- Browser extension for Chrome and Firefox
- Bulk import via crawler scripts
- Full-text search
- Collections and categories
- Responsive web interface

### Upcoming Features

- Dark mode
- Keyboard shortcuts
- Nested collections
- Data export
- Advanced search filters
- Bookmark sharing
- Mobile app
- Additional platforms (Reddit, Instagram)
- AI-powered features (summaries, recommendations)

## Conclusion

Thank you for using Social Bookmarks Manager! We hope this guide helps you get the most out of the app.

For the latest updates and announcements, check the dashboard or follow us on social media.

Happy bookmarking! 🔖
