# Bookmark Filtering and View Modes - User Guide

This guide covers the advanced filtering system and flexible view modes available in the Social Bookmarks Manager. These features help you find and organize your bookmarks more efficiently.

## Table of Contents

1. [Overview](#overview)
2. [View Modes](#view-modes)
3. [Advanced Filtering](#advanced-filtering)
4. [Filter Fields and Operators](#filter-fields-and-operators)
5. [Complex Filter Examples](#complex-filter-examples)
6. [URL Persistence and Sharing](#url-persistence-and-sharing)
7. [Table View Features](#table-view-features)
8. [Performance Tips](#performance-tips)
9. [Troubleshooting](#troubleshooting)

## Overview

The bookmark filtering system provides powerful tools to search and organize your bookmarks:

- **Flexible View Modes** - Switch between card and table views
- **Advanced Filters** - Apply multiple filter conditions with various operators
- **URL Persistence** - Share filtered views via URL
- **Bulk Operations** - Select and manage multiple bookmarks in table view
- **Real-time Updates** - Filters apply instantly as you type

## View Modes

### Card View

The default view displays bookmarks as visual cards with rich previews.

**Features:**

- Large thumbnail images
- Full post content preview
- Author information with profile picture
- Platform badges (Twitter, LinkedIn, URL)
- Quick actions (edit, delete, add to collection)
- Responsive grid layout

**Best for:**

- Browsing visually
- Reviewing post content
- Identifying bookmarks by images
- Mobile devices

**How to Use:**

1. Navigate to the Bookmarks page
2. Click the **grid icon** in the toolbar (if not already in card view)
3. Your preference is automatically saved

### Table View

A compact table format for efficient bookmark management.

**Features:**

- Sortable columns (title, author, platform, date)
- Bulk selection with checkboxes
- Inline actions menu
- Virtual scrolling for large datasets
- Compact information display

**Best for:**

- Managing large collections
- Bulk operations
- Sorting by specific criteria
- Desktop workflows

**How to Use:**

1. Navigate to the Bookmarks page
2. Click the **table icon** in the toolbar
3. Your preference is automatically saved

**Table Columns:**

- **Select** - Checkbox for bulk selection
- **Thumbnail** - Small preview image
- **Title** - Bookmark title (clickable to view details)
- **Author** - Post author or domain name
- **Platform** - Twitter, LinkedIn, or URL badge
- **Saved** - Date you saved the bookmark
- **Actions** - Edit, delete, and collection buttons

## Advanced Filtering

### Filter Panel

Access the filter panel from the Bookmarks page:

1. Click the **"Filters"** button in the toolbar
2. The filter panel appears above the bookmark list
3. Click **"Add Filter"** to create a new filter condition
4. Configure field, operator, and value
5. Filters apply immediately

### Adding Filters

**Step-by-step:**

1. Click **"Add Filter"**
2. Select a **field** (platform, author, date, etc.)
3. Choose an **operator** (equals, contains, between, etc.)
4. Enter or select a **value**
5. The filter applies automatically

**Multiple Filters:**

- Add multiple filter conditions
- All conditions are combined with AND logic
- Bookmarks must match ALL filters to appear

### Removing Filters

**Remove Single Filter:**

- Click the **X icon** next to the filter condition

**Clear All Filters:**

- Click **"Clear All"** button
- All filters are removed at once
- Bookmark list resets to show all bookmarks

### Filter Persistence

Filters are automatically saved in the URL:

- Navigate away and return - filters persist
- Refresh the page - filters remain active
- Use browser back/forward - filters update accordingly
- Share the URL - recipients see the same filtered view

## Filter Fields and Operators

### Platform Filter

Filter bookmarks by their source platform.

**Field:** `platform`

**Available Operators:**

- **equals** - Match a single platform
- **in** - Match multiple platforms

**Values:**

- `TWITTER` - X (Twitter) posts
- `LINKEDIN` - LinkedIn posts
- `GENERIC_URL` - Web page bookmarks

**Examples:**

```
Platform equals TWITTER
Platform in [TWITTER, LINKEDIN]
```

**Use Cases:**

- View only Twitter bookmarks
- Exclude URL bookmarks
- Compare content across platforms

### Author Filter

Filter by post author or domain name.

**Field:** `authorUsername`

**Available Operators:**

- **equals** - Exact username match
- **contains** - Partial username match

**Values:**

- Text input (username or name)
- Case-insensitive matching

**Examples:**

```
Author equals @elonmusk
Author contains john
```

**Use Cases:**

- Find all posts from a specific person
- Search for authors with similar names
- Track content from favorite creators

### Date Filters

Filter by when you saved the bookmark or when the post was created.

**Fields:**

- `savedAt` - When you saved the bookmark
- `createdAt` - When the post was originally published

**Available Operators:**

- **equals** - Exact date match
- **greater than** - After a specific date
- **less than** - Before a specific date
- **between** - Date range

**Values:**

- Date picker input
- ISO date format (YYYY-MM-DD)

**Examples:**

```
Saved Date between 2024-01-01 and 2024-12-31
Created Date greater than 2024-06-01
Saved Date equals 2024-11-15
```

**Use Cases:**

- Find bookmarks from a specific time period
- Review recently saved content
- Track trending topics over time
- Archive old bookmarks

### Category Filter

Filter by assigned categories.

**Field:** `categoryIds`

**Available Operators:**

- **in** - Has any of the selected categories
- **not in** - Excludes selected categories

**Values:**

- Multi-select dropdown
- Shows all your categories

**Examples:**

```
Categories in [Technology, Development]
Categories not in [Personal]
```

**Use Cases:**

- View bookmarks by topic
- Exclude certain categories
- Find cross-category content
- Organize research by subject

### Content Search

Full-text search within bookmark content.

**Field:** `content`

**Available Operators:**

- **contains** - Text appears in content
- **not contains** - Text does not appear

**Values:**

- Text input
- Case-insensitive
- Searches title, description, and post content

**Examples:**

```
Content contains "react hooks"
Content contains "machine learning"
Content not contains "sponsored"
```

**Use Cases:**

- Find bookmarks mentioning specific topics
- Search for keywords or phrases
- Exclude promotional content
- Research specific technologies

## Complex Filter Examples

### Example 1: Recent Twitter Posts from Specific Author

**Goal:** Find all Twitter posts from @username saved in the last 30 days

**Filters:**

```
Platform equals TWITTER
Author equals @username
Saved Date greater than 2024-10-15
```

**Use Case:** Track recent content from a favorite creator

### Example 2: Technical Articles Excluding Personal Notes

**Goal:** Find technology-related URL bookmarks, excluding personal category

**Filters:**

```
Platform equals GENERIC_URL
Categories in [Technology, Development]
Categories not in [Personal]
```

**Use Case:** Professional research without personal bookmarks

### Example 3: LinkedIn Posts from Q4 2024

**Goal:** Find all LinkedIn posts created in Q4 2024

**Filters:**

```
Platform equals LINKEDIN
Created Date between 2024-10-01 and 2024-12-31
```

**Use Case:** Review quarterly content trends

### Example 4: Multi-Platform Search for Specific Topic

**Goal:** Find all bookmarks mentioning "AI" from Twitter and LinkedIn

**Filters:**

```
Platform in [TWITTER, LINKEDIN]
Content contains "AI"
```

**Use Case:** Research topic across multiple platforms

### Example 5: Recent Bookmarks from Multiple Authors

**Goal:** Find recent posts from authors with "tech" in their name

**Filters:**

```
Author contains "tech"
Saved Date greater than 2024-11-01
```

**Use Case:** Track content from tech-focused creators

### Example 6: Archived Content Review

**Goal:** Find old bookmarks for cleanup

**Filters:**

```
Saved Date less than 2024-01-01
Categories not in [Archive]
```

**Use Case:** Identify bookmarks to archive or delete

## URL Persistence and Sharing

### How URL Encoding Works

Filters are encoded in the URL query parameters:

**Format:**

```
?filters=field:operator:value,field:operator:value
```

**Example URL:**

```
https://app.example.com/bookmarks?filters=platform:eq:TWITTER,savedAt:gt:2024-11-01
```

### Sharing Filtered Views

**To share a filtered view:**

1. Apply your desired filters
2. Copy the URL from the browser address bar
3. Share the URL via email, chat, or social media
4. Recipients see the same filtered view (if they have access)

**Use Cases:**

- Share research findings with team members
- Bookmark specific filtered views
- Create quick links to common filters
- Document search queries

### Browser History Integration

The filtering system integrates with browser history:

- **Back button** - Returns to previous filter state
- **Forward button** - Moves to next filter state
- **History entries** - Each filter change creates a history entry
- **Bookmarking** - Bookmark filtered views in your browser

### URL Parameter Reference

**Filter Encoding:**

- Fields and operators are abbreviated
- Values are URL-encoded
- Multiple filters separated by commas
- Date ranges use colon separator

**Operator Abbreviations:**

- `eq` - equals
- `neq` - not equals
- `contains` - contains
- `ncontains` - not contains
- `in` - in
- `nin` - not in
- `gt` - greater than
- `lt` - less than
- `between` - between

**Example Breakdown:**

```
?filters=platform:eq:TWITTER,authorUsername:contains:john,savedAt:between:2024-01-01:2024-12-31

Decoded:
- Platform equals TWITTER
- Author contains "john"
- Saved Date between 2024-01-01 and 2024-12-31
```

## Table View Features

### Sorting

Click column headers to sort:

**Sortable Columns:**

- Title (alphabetical)
- Author (alphabetical)
- Platform (alphabetical)
- Saved Date (chronological)

**Sort Behavior:**

- First click: ascending order
- Second click: descending order
- Third click: remove sort (default order)
- Visual indicator shows current sort direction

### Bulk Selection

Select multiple bookmarks for batch operations:

**Selection Methods:**

1. **Individual** - Click checkbox on each row
2. **Select All** - Click checkbox in header row
3. **Range Selection** - Shift+click to select range (future feature)

**Bulk Actions:**

- Add to collections
- Assign categories
- Delete multiple bookmarks
- Export selected (future feature)

**Selection Tips:**

- Selection persists while filtering
- Clear selection when switching views
- Maximum 100 bookmarks per bulk operation

### Row Actions

Each table row has an actions menu:

**Available Actions:**

- **View** - Open bookmark details
- **Edit** - Modify bookmark metadata
- **Delete** - Remove bookmark (with confirmation)
- **Add to Collection** - Organize into collections
- **Copy Link** - Copy original post URL

**Quick Access:**

- Hover over row to reveal actions
- Click three-dot menu for all options
- Keyboard shortcuts (future feature)

### Virtual Scrolling

For large datasets (1000+ bookmarks):

**Features:**

- Only visible rows are rendered
- Smooth scrolling performance
- Maintains 60 FPS
- Automatic memory management

**Benefits:**

- Fast loading times
- Reduced memory usage
- Smooth user experience
- Handles 10,000+ bookmarks

## Performance Tips

### Filter Optimization

**Best Practices:**

1. **Use specific filters** - Narrow results quickly
2. **Combine filters** - Multiple filters are more efficient than broad searches
3. **Date ranges** - Limit date ranges for faster queries
4. **Avoid wildcards** - Use "equals" instead of "contains" when possible

**Debouncing:**

- Text input filters debounce by 300ms
- Reduces server load
- Prevents excessive API calls
- Shows loading indicator during debounce

### View Mode Performance

**Card View:**

- Best for < 500 bookmarks
- Loads images progressively
- Lazy loading for off-screen cards

**Table View:**

- Optimized for 1000+ bookmarks
- Virtual scrolling enabled
- Minimal rendering overhead
- Faster sorting and filtering

### Caching

The system caches filter results:

**Cache Behavior:**

- Results cached for 5 minutes
- Cache invalidated on bookmark changes
- Reduces redundant API calls
- Faster navigation between filters

### Database Indexes

Filtered fields are indexed for performance:

**Indexed Fields:**

- `platform`
- `authorUsername`
- `savedAt`
- `createdAt`
- `categoryIds`

**Query Performance:**

- Most queries complete in < 100ms
- Complex filters may take up to 500ms
- Large datasets (10,000+) may be slower

## Troubleshooting

### Filters Not Working

**Symptoms:**

- Filters don't apply
- No results shown
- Error messages

**Solutions:**

1. **Refresh the page** - Clear any stale state
2. **Check filter values** - Ensure valid inputs
3. **Clear all filters** - Start fresh
4. **Check browser console** - Look for error messages
5. **Try different browser** - Rule out browser issues

### Slow Performance

**Symptoms:**

- Filters take long to apply
- Page becomes unresponsive
- Scrolling is laggy

**Solutions:**

1. **Reduce filter complexity** - Use fewer filters
2. **Switch to table view** - Better for large datasets
3. **Clear browser cache** - Remove old cached data
4. **Limit date ranges** - Narrow time periods
5. **Check internet connection** - Ensure stable connection

### URL Filters Not Loading

**Symptoms:**

- Shared URL doesn't apply filters
- Filters reset on page load
- URL parameters ignored

**Solutions:**

1. **Check URL format** - Ensure proper encoding
2. **Verify permissions** - Recipient must have access
3. **Try copying URL again** - May have been truncated
4. **Check for special characters** - May need encoding
5. **Use "Share" feature** - Generates proper URL

### Table View Issues

**Symptoms:**

- Columns not sorting
- Checkboxes not working
- Actions menu not appearing

**Solutions:**

1. **Refresh the page** - Reload table state
2. **Clear selection** - Reset selection state
3. **Switch views** - Toggle to card and back
4. **Check browser compatibility** - Use latest browser version
5. **Disable extensions** - May interfere with table functionality

### Filter Validation Errors

**Symptoms:**

- "Invalid filter value" error
- Filters won't save
- Red error messages

**Solutions:**

1. **Check date format** - Use YYYY-MM-DD
2. **Verify category exists** - Category may have been deleted
3. **Check username format** - Remove special characters
4. **Use valid operators** - Check operator compatibility
5. **Clear invalid filters** - Remove and re-add

## Advanced Tips

### Power User Workflows

**Research Workflow:**

1. Create filtered view for topic
2. Bookmark the URL
3. Review daily for new content
4. Export findings (future feature)

**Content Curation:**

1. Filter by platform and date
2. Switch to table view
3. Bulk select quality content
4. Add to curated collection

**Archive Management:**

1. Filter old bookmarks (> 1 year)
2. Review in table view
3. Bulk delete or archive
4. Keep collection organized

### Keyboard Shortcuts (Future)

Planned keyboard shortcuts:

- `Ctrl/Cmd + F` - Focus filter panel
- `Ctrl/Cmd + K` - Quick filter search
- `Ctrl/Cmd + A` - Select all (table view)
- `Esc` - Clear filters
- `Tab` - Navigate filter fields

### API Integration (Future)

Planned API features:

- Programmatic filter queries
- Automated bookmark organization
- Custom filter presets
- Integration with other tools

## Conclusion

The advanced filtering system provides powerful tools for managing your bookmark collection. Experiment with different filter combinations to find workflows that suit your needs.

For more information:

- [User Guide](./USER_GUIDE.md) - General usage instructions
- [FAQ](./FAQ.md) - Frequently asked questions
- [API Documentation](./API.md) - API reference

Happy filtering! 🔍
