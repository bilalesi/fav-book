# Bookmark Crawler Scripts

These scripts allow you to extract your existing bookmarks from X (Twitter) and LinkedIn for bulk import into the Social Bookmarks Manager.

## Overview

The crawler scripts are vanilla JavaScript files that run directly in your browser console. They automatically scroll through your bookmarks, extract all post data, and generate a JSON file that can be imported into the application.

## Features

- ✅ Automatic scrolling to load all bookmarks
- ✅ Progress indicator showing extraction status
- ✅ Duplicate detection
- ✅ Complete metadata extraction (text, images, videos, links, author info)
- ✅ Error handling and recovery
- ✅ Automatic JSON file download

## Usage

### X (Twitter) Bookmarks

1. **Navigate to your Twitter bookmarks:**

   - Go to https://twitter.com/i/bookmarks
   - Make sure you're logged in

2. **Open the browser console:**

   - **Chrome/Edge:** Press `F12` or `Ctrl+Shift+J` (Windows) / `Cmd+Option+J` (Mac)
   - **Firefox:** Press `F12` or `Ctrl+Shift+K` (Windows) / `Cmd+Option+K` (Mac)
   - **Safari:** Enable Developer menu in Preferences, then press `Cmd+Option+C`

3. **Run the script:**

   - Open the file `twitter-crawler.js`
   - Copy the entire contents
   - Paste into the console
   - Press `Enter`

4. **Wait for completion:**

   - Keep the browser tab active
   - The script will automatically scroll and extract bookmarks
   - A progress indicator will appear in the top-right corner
   - When complete, a JSON file will download automatically

5. **Import the file:**
   - Go to the Social Bookmarks Manager
   - Navigate to the Import page
   - Upload the downloaded JSON file

### LinkedIn Saved Posts

1. **Navigate to your LinkedIn saved posts:**

   - Go to https://www.linkedin.com/my-items/saved-posts/
   - Make sure you're logged in

2. **Open the browser console:**

   - Same as above (F12 or Cmd+Option+J)

3. **Run the script:**

   - Open the file `linkedin-crawler.js`
   - Copy the entire contents
   - Paste into the console
   - Press `Enter`

4. **Wait for completion:**

   - Keep the browser tab active
   - The script will automatically scroll and extract posts
   - A progress indicator will appear in the top-right corner
   - When complete, a JSON file will download automatically

5. **Import the file:**
   - Go to the Social Bookmarks Manager
   - Navigate to the Import page
   - Upload the downloaded JSON file

## Output Format

Both scripts generate JSON files with the following structure:

```json
{
  "platform": "twitter" | "linkedin",
  "exportDate": "2024-01-15T10:30:00.000Z",
  "totalCount": 150,
  "bookmarks": [
    {
      "postId": "1234567890",
      "postUrl": "https://twitter.com/user/status/1234567890",
      "content": "Post text content...",
      "author": {
        "name": "Display Name",
        "username": "username",
        "profileUrl": "https://twitter.com/username"
      },
      "media": [
        {
          "type": "image",
          "url": "https://...",
          "thumbnailUrl": "https://..."
        }
      ],
      "timestamp": "2024-01-15T10:00:00.000Z",
      "metadata": {
        "likeCount": "42",
        "retweetCount": "10",
        "extractedAt": "2024-01-15T10:30:00.000Z"
      }
    }
  ]
}
```

## Configuration

You can modify the configuration at the top o
f each script to adjust behavior:

```javascript
const CONFIG = {
  scrollDelay: 2000, // Delay between scrolls (ms) - increase for slower connections
  maxScrollAttempts: 50, // Maximum number of scroll attempts - increase for large collections
  noNewContentLimit: 5, // Stop after this many scrolls with no new content
  extractDelay: 500, // Delay before extracting data (ms)
};
```

## Troubleshooting

### Script doesn't start

- Make sure you're on the correct page (bookmarks page for Twitter, saved posts for LinkedIn)
- Check that you're logged in
- Try refreshing the page and running the script again

### Script stops early

- The script stops when no new content is loaded after 5 consecutive scroll attempts
- If you have many bookmarks, increase `maxScrollAttempts` in the CONFIG
- Make sure your internet connection is stable

### Missing bookmarks

- Some bookmarks may be from deleted accounts or removed posts
- The script can only extract visible content
- Try scrolling manually first to ensure all content loads

### Console warnings

- Browser consoles may show warnings about pasting code
- Type "allow pasting" if prompted (Chrome/Edge)
- These warnings are normal security features

### Extraction errors

- If specific posts fail to extract, they'll be logged in the console
- The script will continue with other posts
- Check the console for detailed error messages

## Data Privacy

- These scripts run entirely in your browser
- No data is sent to external servers
- The JSON file is created and downloaded locally
- Only you have access to the extracted data

## Limitations

- Scripts can only extract visible content from the DOM
- Some media URLs may expire over time
- Engagement metrics are approximate
- Private or restricted content may not be fully accessible

## Tips

- Run the scripts during off-peak hours for better performance
- Close other tabs to free up browser resources
- Don't switch tabs while the script is running
- For very large collections (1000+ bookmarks), consider running in batches

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify you're on the correct page
3. Try refreshing and running again
4. Check your internet connection
5. Ensure your browser is up to date

## Technical Details

### Twitter Crawler

- Targets: `article[data-testid="tweet"]` elements
- Extracts: Text, images, videos, links, author info, engagement metrics
- Scroll strategy: Scroll to bottom, wait for load, extract new content

### LinkedIn Crawler

- Targets: `.feed-shared-update-v2`, `.occludable-update` elements
- Extracts: Text, images, videos, articles, author info, company info
- Scroll strategy: Scroll to bottom, wait for load, extract new content

Both scripts use:

- Map data structure for duplicate prevention
- Progressive extraction during scrolling
- Automatic retry logic
- Error recovery mechanisms
