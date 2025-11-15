# Requirements Document

## Introduction

The Social Bookmarks Manager is a full-stack web application that enables users to save, organize, search, and manage their bookmarks from social media platforms (X/Twitter and LinkedIn). The system provides a centralized, searchable database of bookmarked posts with rich metadata, advanced filtering capabilities, collection management, and browser extension support for seamless bookmark capture.

## Glossary

- **Social Bookmarks Manager (SBM)**: The complete web application system for managing social media bookmarks
- **Bookmark Post**: A saved social media post (tweet or LinkedIn post) with all associated metadata
- **Collection**: A user-defined group of related Bookmark Posts
- **Browser Extension**: A browser plugin that captures and saves posts from social platforms
- **Crawler Script**: A browser-executable script that extracts bookmark data from social platforms
- **User**: An authenticated person using the Social Bookmarks Manager
- **Social Account**: A user's X (Twitter) or LinkedIn account used for authentication
- **Magic Link**: A passwordless authentication method that sends a login link to the user's email
- **Post Metadata**: Structured data including text, images, videos, links, author, timestamp, and engagement metrics
- **Search Index**: The searchable database of Bookmark Posts and their metadata
- **Dashboard**: The main interface showing bookmark statistics and insights
- **Filter Criteria**: User-defined parameters for narrowing down bookmark search results

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user, I want to sign in using my X or LinkedIn account or via magic link, so that I can securely access my private bookmarks.

#### Acceptance Criteria

1. WHEN a user navigates to the login page, THE SBM SHALL display authentication options for X OAuth, LinkedIn OAuth, and magic link email using better-auth library
2. WHEN a user selects a social account provider and completes OAuth flow, THE SBM SHALL create or retrieve the user's account and establish an authenticated session using better-auth
3. WHEN a user enters their email for magic link authentication, THE SBM SHALL send a login link via Resend API using React Email templates
4. WHEN a user clicks the magic link in their email, THE SBM SHALL authenticate the user and establish a session using better-auth
5. WHEN a user completes authentication, THE SBM SHALL redirect the user to the dashboard page
6. WHEN an unauthenticated user attempts to access protected routes, THE SBM SHALL redirect the user to the login page
7. WHEN an authenticated user clicks logout, THE SBM SHALL terminate the session and redirect to the home page

### Requirement 2: Bookmark Data Storage

**User Story:** As a user, I want all my bookmark details stored in a private database, so that I can access complete post information including text, images, videos, and links.

#### Acceptance Criteria

1. THE SBM SHALL store Bookmark Posts with text content, author information, publication timestamp, and engagement metrics in the Postgres database
2. THE SBM SHALL store media attachments including images, videos, and embedded links associated with each Bookmark Post
3. THE SBM SHALL associate each Bookmark Post with the User who saved it
4. THE SBM SHALL store the original social platform URL for each Bookmark Post
5. THE SBM SHALL maintain referential integrity between Users, Bookmark Posts, Collections, and media attachments

### Requirement 3: Browser Extension for Bookmark Capture

**User Story:** As a user, I want to install a browser extension, so that I can quickly save posts from X or LinkedIn to my private database.

#### Acceptance Criteria

1. THE SBM SHALL provide a browser extension that can be installed in Chromium-based browsers
2. WHEN a user views a post on X or LinkedIn, THE browser extension SHALL display a save button or icon
3. WHEN a user clicks the save button, THE browser extension SHALL extract post metadata and send it to the SBM server API
4. WHEN the server receives bookmark data from the extension, THE SBM SHALL validate and store the Bookmark Post in the database
5. WHEN a bookmark is successfully saved, THE browser extension SHALL display a confirmation message to the user

### Requirement 4: Crawler Script for Bulk Import

**User Story:** As a user, I want to run a script in my browser to extract all my existing bookmarks, so that I can import them into the system in bulk.

#### Acceptance Criteria

1. THE SBM SHALL provide a browser-executable crawler script for X that extracts bookmark data
2. THE SBM SHALL provide a browser-executable crawler script for LinkedIn that extracts bookmark data
3. WHEN the crawler script executes, THE script SHALL extract post metadata including text, media URLs, author, and timestamp
4. WHEN the crawler completes extraction, THE script SHALL generate a structured JSON file containing all extracted Bookmark Posts
5. THE SBM SHALL provide a server endpoint that accepts the JSON file and imports Bookmark Posts into the database

### Requirement 5: Dashboard Analytics

**User Story:** As a user, I want to see a dashboard with statistics about my bookmarks, so that I can understand my bookmark usage patterns.

#### Acceptance Criteria

1. WHEN a user navigates to the dashboard, THE SBM SHALL display the total count of Bookmark Posts per social platform
2. THE SBM SHALL display the most recently saved Bookmark Posts on the dashboard
3. THE SBM SHALL display the most frequently viewed Bookmark Posts on the dashboard
4. THE SBM SHALL display identified topics or categories from the user's Bookmark Posts
5. THE SBM SHALL update dashboard statistics in real-time when new bookmarks are added

### Requirement 6: Bookmark Search and Filtering

**User Story:** As a user, I want to search and filter my bookmarks using multiple criteria, so that I can quickly find relevant posts.

#### Acceptance Criteria

1. WHEN a user enters a search query, THE SBM SHALL return Bookmark Posts matching the text content, author, or metadata
2. THE SBM SHALL provide filter controls for date range, social platform, media type, and engagement metrics
3. WHEN a user applies filters, THE SBM SHALL display only Bookmark Posts matching all selected Filter Criteria
4. THE SBM SHALL rank search results by relevance score based on query match quality
5. THE SBM SHALL display search results in both card view and table view formats

### Requirement 7: Collection Management

**User Story:** As a user, I want to organize bookmarks into collections, so that I can group related posts together.

#### Acceptance Criteria

1. WHEN a user creates a collection, THE SBM SHALL store the collection name and associate it with the User
2. WHEN a user adds a Bookmark Post to a collection, THE SBM SHALL create the association in the database
3. WHEN a user views a collection, THE SBM SHALL display all Bookmark Posts within that collection
4. WHEN a user deletes a collection, THE SBM SHALL remove the collection but preserve the Bookmark Posts
5. THE SBM SHALL allow a single Bookmark Post to belong to multiple Collections

### Requirement 8: Bookmark Listing and Display

**User Story:** As a user, I want to view my bookmarks as cards or in a table, so that I can browse my saved content in my preferred format.

#### Acceptance Criteria

1. WHEN a user navigates to the listing page, THE SBM SHALL display Bookmark Posts in card view by default
2. WHEN a user switches to table view, THE SBM SHALL display Bookmark Posts with columns for title, author, date, platform, and actions
3. THE SBM SHALL display post text, author avatar, media thumbnails, and engagement metrics in card view
4. THE SBM SHALL provide pagination controls when Bookmark Posts exceed 50 items per page
5. WHEN a user clicks on a Bookmark Post, THE SBM SHALL display the full post details including all media and metadata

### Requirement 9: Bookmark Management Actions

**User Story:** As a user, I want to delete bookmarks and manage my saved content, so that I can keep my collection organized.

#### Acceptance Criteria

1. WHEN a user selects a Bookmark Post and clicks delete, THE SBM SHALL remove the Bookmark Post from the database
2. WHEN a user deletes a Bookmark Post, THE SBM SHALL remove all associations with Collections
3. THE SBM SHALL provide bulk selection for deleting multiple Bookmark Posts simultaneously
4. WHEN a user edits a Bookmark Post, THE SBM SHALL allow updating custom notes or tags
5. THE SBM SHALL provide an undo option within 5 seconds after deletion

### Requirement 10: Database Schema Design

**User Story:** As a developer, I want a well-designed extensible database schema, so that the system can accommodate future features and AI integration.

#### Acceptance Criteria

1. THE SBM SHALL implement a normalized database schema using Prisma ORM with Postgres
2. THE SBM SHALL include tables for Users, Bookmark Posts, Collections, Media Attachments, and Tags
3. THE SBM SHALL use appropriate indexes on frequently queried fields including user_id, created_at, and search text
4. THE SBM SHALL include timestamp fields for created_at and updated_at on all primary tables
5. THE SBM SHALL design the schema to support future AI-generated summaries and conclusions as additional fields

### Requirement 11: API Architecture

**User Story:** As a developer, I want a well-structured API using oRPC, so that the frontend and browser extension can reliably communicate with the backend.

#### Acceptance Criteria

1. THE SBM SHALL implement API endpoints using oRPC with Elysia backend
2. THE SBM SHALL provide endpoints for authentication, bookmark CRUD operations, search, collections, and bulk import
3. WHEN an API request is received, THE SBM SHALL validate authentication tokens and user permissions
4. WHEN an API error occurs, THE SBM SHALL return structured error responses with appropriate HTTP status codes
5. THE SBM SHALL implement rate limiting on API endpoints to prevent abuse

### Requirement 12: Frontend User Interface

**User Story:** As a user, I want a modern, responsive interface built with reui.io components, so that I can efficiently manage my bookmarks across devices.

#### Acceptance Criteria

1. THE SBM SHALL implement the frontend using TanStack Start with reui.io components
2. THE SBM SHALL provide a home page with feature overview and call-to-action for authentication
3. THE SBM SHALL implement responsive layouts that adapt to mobile, tablet, and desktop screen sizes
4. THE SBM SHALL use reui.io filter components for the bookmark filtering interface
5. THE SBM SHALL provide loading states and error messages for all asynchronous operations
