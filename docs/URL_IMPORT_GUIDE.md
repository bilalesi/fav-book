# URL Import Guide

## Overview

The URL Import feature allows you to batch import multiple URLs as bookmarks into your collection. This is useful for quickly adding web pages, articles, or any other URLs you want to save.

## How to Use

### Accessing the URL Import Page

1. Navigate to the Import page from the sidebar
2. Click on "Go to URL Import →" in the URL Bookmarks card
3. Or directly visit `/import/urls`

### Importing URLs

1. **Enter URLs**: Paste your URLs in the text area, one per line

   ```
   https://example.com
   https://another-example.com
   https://third-example.com
   ```

2. **Validation**: The system automatically validates each URL as you type

   - Valid URLs are counted and shown with a green badge
   - Invalid URLs are highlighted with error messages
   - Only HTTP and HTTPS protocols are supported

3. **Assign to Collections (Optional)**:

   - Select one or more collections to organize your bookmarks
   - You can skip this step and organize later

4. **Import**: Click the "Import" button to start the process
   - The system shows a progress bar during import
   - Duplicate URLs are automatically skipped
   - Failed imports are tracked with detailed error messages

### Import Results

After the import completes, you'll see a summary with:

- **Successfully Imported**: Number of URLs successfully added
- **Duplicates Skipped**: URLs that were already in your bookmarks
- **Failed**: URLs that couldn't be imported

#### Handling Errors

If some URLs failed to import:

1. Click "Show Details" to see the error messages
2. Click "Retry Failed URLs" to automatically populate the text area with failed URLs
3. Fix any issues and try importing again

### Features

- **Client-side Validation**: Instant feedback on URL validity
- **Batch Processing**: Import multiple URLs at once
- **Duplicate Detection**: Automatically skips URLs you've already bookmarked
- **Progress Tracking**: Real-time progress updates during import
- **Error Recovery**: Retry failed URLs with one click
- **Collection Assignment**: Organize bookmarks during import

## Metadata Extraction

The system automatically extracts metadata from each URL:

- Page title
- Description
- Favicon
- Open Graph images
- Domain information

If metadata extraction fails, the system uses the domain name as a fallback.

## Best Practices

1. **One URL per line**: Make sure each URL is on its own line
2. **Valid URLs**: Ensure URLs start with `http://` or `https://`
3. **Reasonable batch sizes**: Import up to 100 URLs at a time for best performance
4. **Review results**: Check the import summary for any failed URLs

## Troubleshooting

### Invalid URL Format

**Problem**: URL is marked as invalid

**Solution**:

- Ensure the URL starts with `http://` or `https://`
- Check for typos or malformed URLs
- Remove any extra spaces or special characters

### Duplicate URL

**Problem**: URL is skipped as duplicate

**Solution**:

- This is expected behavior - the URL is already in your bookmarks
- You can view the existing bookmark in your bookmarks list

### Import Failed

**Problem**: Some URLs failed to import

**Solution**:

- Check the error details by clicking "Show Details"
- Common issues include:
  - Network timeouts
  - Invalid URL structure
  - Server errors
- Use "Retry Failed URLs" to try again

## API Endpoint

The URL import feature uses the `batchImportUrls` API endpoint:

```typescript
client.bookmarks.batchImportUrls({
  urls: string[],
  collectionIds?: string[],
  skipDuplicates?: boolean
})
```

## Related Features

- **Social Media Import**: Import bookmarks from X (Twitter) or LinkedIn
- **Collections**: Organize your bookmarks into collections
- **Search**: Find your imported URLs using full-text search
