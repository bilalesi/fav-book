/**
 * LinkedIn Bookmarks Crawler Script
 * 
 * This script extracts all your saved posts from LinkedIn and generates
 * a JSON file that can be imported into the Social Bookmarks Manager.
 * 
 * USAGE:
 * 1. Navigate to https://www.linkedin.com/my-items/saved-posts/ in your browser
 * 2. Open the browser console (F12 or Cmd+Option+J on Mac)
 * 3. Copy and paste this entire script into the console
 * 4. Press Enter to run the script
 * 5. Wait for the script to complete (it will scroll automatically)
 * 6. A JSON file will be downloaded automatically when complete
 * 
 * IMPORTANT: Keep the browser tab active while the script runs.
 */

(async function() {
  'use strict';

  // Configuration
  const CONFIG = {
    scrollDelay: 2000,        // Delay between scrolls (ms)
    maxScrollAttempts: 50,    // Maximum number of scroll attempts
    noNewContentLimit: 5,     // Stop after this many scrolls with no new content
    extractDelay: 500,        // Delay before extracting data (ms)
  };

  // State
  let extractedPosts = new Map(); // Use Map to avoid duplicates
  let scrollAttempts = 0;
  let noNewContentCount = 0;
  let isRunning = true;

  // Create progress indicator
  const progressDiv = document.createElement('div');
  progressDiv.id = 'linkedin-crawler-progress';
  progressDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #0A66C2;
    color: white;
    padding: 20px;
    border-radius: 12px;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    min-width: 300px;
  `;
  document.body.appendChild(progressDiv);

  function updateProgress(status, count, errors = 0) {
    progressDiv.innerHTML = `
      <div style="font-weight: bold; font-size: 16px; margin-bottom: 10px;">
        💼 LinkedIn Crawler
      </div>
      <div style="margin-bottom: 5px;">Status: ${status}</div>
      <div style="margin-bottom: 5px;">Posts Found: ${count}</div>
      <div style="margin-bottom: 5px;">Scroll Attempts: ${scrollAttempts}</div>
      ${errors > 0 ? `<div style="color: #FFD700;">Errors: ${errors}</div>` : ''}
      ${!isRunning ? '<div style="margin-top: 10px; font-weight: bold;">✓ Complete!</div>' : ''}
    `;
  }

  function extractPostId(element) {
    // Try to find post URN or ID from data attributes
    const urnElement = element.querySelector('[data-urn]');
    if (urnElement) {
      const urn = urnElement.getAttribute('data-urn');
      const match = urn.match(/urn:li:activity:(\d+)/);
      if (match) return match[1];
    }

    // Try to extract from permalink
    const permalink = element.querySelector('a[href*="/posts/"]');
    if (permalink) {
      const match = permalink.href.match(/posts\/[^-]+-(\d+)-/);
      if (match) return match[1];
    }

    // Fallback: generate ID from content hash
    const content = element.textContent.substring(0, 100);
    return btoa(content).substring(0, 20).replace(/[^a-zA-Z0-9]/g, '');
  }

  function extractPostData(postElement) {
    try {
      const postId = extractPostId(postElement);
      if (!postId) return null;

      // Skip if already extracted
      if (extractedPosts.has(postId)) return null;

      // Extract author information
      const authorLink = postElement.querySelector('.update-components-actor__meta a, .feed-shared-actor__meta a');
      const authorName = postElement.querySelector('.update-components-actor__name, .feed-shared-actor__name')?.textContent.trim() || '';
      const authorTitle = postElement.querySelector('.update-components-actor__description, .feed-shared-actor__description')?.textContent.trim() || '';
      const authorProfileUrl = authorLink?.href || '';
      const authorUsername = authorProfileUrl.split('/in/')[1]?.split('/')[0] || '';

      // Extract post content
      const contentElement = postElement.querySelector('.feed-shared-update-v2__description, .update-components-text');
      let content = '';
      if (contentElement) {
        // Get text content, preserving line breaks
        content = contentElement.innerText || contentElement.textContent || '';
        content = content.trim();
      }

      // Extract timestamp
      const timeElement = postElement.querySelector('time, .update-components-actor__sub-description time');
      const timestamp = timeElement?.getAttribute('datetime') || new Date().toISOString();

      // Extract post URL
      const postLink = postElement.querySelector('a[href*="/posts/"], a[href*="/feed/update/"]');
      const postUrl = postLink?.href || '';

      // Extract media (images and videos)
      const media = [];
      
      // Images
      const images = postElement.querySelectorAll('.update-components-image img, .feed-shared-image img');
      images.forEach(img => {
        const url = img.src;
        if (url && !url.includes('profile-displayphoto') && !url.includes('company-logo')) {
          media.push({
            type: 'IMAGE',
            url: url.split('?')[0], // Remove query params
            thumbnailUrl: url
          });
        }
      });

      // Videos
      const videos = postElement.querySelectorAll('video');
      videos.forEach(video => {
        const url = video.src || video.poster;
        if (url) {
          media.push({
            type: 'VIDEO',
            url: url,
            thumbnailUrl: video.poster || url
          });
        }
      });

      // Extract article/document links
      const articleCard = postElement.querySelector('.feed-shared-article, .update-components-article');
      if (articleCard) {
        const articleLink = articleCard.querySelector('a[href]');
        const articleImage = articleCard.querySelector('img');
        if (articleLink) {
          media.push({
            type: 'link',
            url: articleLink.href,
            thumbnailUrl: articleImage?.src || null
          });
        }
      }

      // Extract external links from content
      const linkElements = postElement.querySelectorAll('.feed-shared-external-video__meta a, .feed-shared-link-title a');
      linkElements.forEach(link => {
        const url = link.href;
        if (url && !url.includes('linkedin.com')) {
          media.push({
            type: 'link',
            url: url
          });
        }
      });

      // Extract engagement metrics (optional metadata)
      const likeCount = postElement.querySelector('.social-details-social-counts__reactions-count')?.textContent.trim() || '0';
      const commentCount = postElement.querySelector('.social-details-social-counts__comments')?.textContent.trim() || '0';
      const shareCount = postElement.querySelector('.social-details-social-counts__shares')?.textContent.trim() || '0';

      // Extract company/organization if present
      const companyElement = postElement.querySelector('.update-components-actor__sub-description, .feed-shared-actor__sub-description');
      const company = companyElement?.textContent.trim() || '';

      const postData = {
        postId: postId,
        postUrl: postUrl,
        content: content,
        author: {
          name: authorName,
          username: authorUsername,
          profileUrl: authorProfileUrl,
          title: authorTitle,
          company: company
        },
        media: media,
        timestamp: timestamp,
        metadata: {
          likeCount: likeCount,
          commentCount: commentCount,
          shareCount: shareCount,
          extractedAt: new Date().toISOString()
        }
      };

      return postData;
    } catch (error) {
      console.error('Error extracting post:', error);
      return null;
    }
  }

  function extractAllVisiblePosts() {
    // LinkedIn uses different selectors for posts
    const posts = document.querySelectorAll(
      '.feed-shared-update-v2, ' +
      '.occludable-update, ' +
      'div[data-urn*="activity"]'
    );
    
    let newCount = 0;

    posts.forEach(post => {
      const postData = extractPostData(post);
      if (postData && !extractedPosts.has(postData.postId)) {
        extractedPosts.set(postData.postId, postData);
        newCount++;
      }
    });

    return newCount;
  }

  async function scrollToLoadMore() {
    const previousCount = extractedPosts.size;
    
    // Scroll to bottom
    window.scrollTo(0, document.body.scrollHeight);
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, CONFIG.scrollDelay));
    
    // Extract newly loaded posts
    await new Promise(resolve => setTimeout(resolve, CONFIG.extractDelay));
    const newPosts = extractAllVisiblePosts();
    
    const currentCount = extractedPosts.size;
    
    if (currentCount === previousCount) {
      noNewContentCount++;
    } else {
      noNewContentCount = 0;
    }
    
    scrollAttempts++;
    updateProgress('Scrolling...', currentCount);
    
    // Check stopping conditions
    if (noNewContentCount >= CONFIG.noNewContentLimit) {
      console.log('No new content found after', CONFIG.noNewContentLimit, 'attempts. Stopping.');
      return false;
    }
    
    if (scrollAttempts >= CONFIG.maxScrollAttempts) {
      console.log('Maximum scroll attempts reached. Stopping.');
      return false;
    }
    
    return true;
  }

  function generateJSON() {
    const bookmarks = Array.from(extractedPosts.values());
    
    return {
      platform: 'linkedin',
      exportDate: new Date().toISOString(),
      totalCount: bookmarks.length,
      bookmarks: bookmarks
    };
  }

  function downloadJSON(data) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `linkedin-bookmarks-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Main execution
  console.log('💼 LinkedIn Bookmarks Crawler Started');
  console.log('Keep this tab active and wait for completion...');
  
  updateProgress('Initializing...', 0);

  try {
    // Initial extraction
    await new Promise(resolve => setTimeout(resolve, CONFIG.extractDelay));
    extractAllVisiblePosts();
    updateProgress('Extracting...', extractedPosts.size);

    // Scroll and extract loop
    let shouldContinue = true;
    while (shouldContinue && isRunning) {
      shouldContinue = await scrollToLoadMore();
    }

    // Final extraction
    extractAllVisiblePosts();
    
    isRunning = false;
    updateProgress('Complete!', extractedPosts.size);

    // Generate and download JSON
    const jsonData = generateJSON();
    downloadJSON(jsonData);

    console.log('✓ Extraction complete!');
    console.log('Total posts extracted:', extractedPosts.size);
    console.log('JSON file downloaded successfully');
    
    // Show completion message
    setTimeout(() => {
      progressDiv.innerHTML += `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.3);">
          <div style="font-size: 14px;">File downloaded! You can now close this tab.</div>
          <button onclick="this.parentElement.parentElement.remove()" 
                  style="margin-top: 10px; padding: 8px 16px; background: white; color: #0A66C2; 
                         border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
            Close
          </button>
        </div>
      `;
    }, 1000);

  } catch (error) {
    console.error('Error during extraction:', error);
    isRunning = false;
    updateProgress('Error occurred', extractedPosts.size, 1);
    progressDiv.style.background = '#CC1016';
    progressDiv.innerHTML += `
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.3);">
        <div style="font-size: 14px;">Error: ${error.message}</div>
        <div style="font-size: 12px; margin-top: 5px;">Check console for details</div>
      </div>
    `;
  }

})();
