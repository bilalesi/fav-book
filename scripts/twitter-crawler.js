/**
 * X (Twitter) Bookmarks Crawler Script
 * 
 * This script extracts all your bookmarked tweets from X (Twitter) and generates
 * a JSON file that can be imported into the Social Bookmarks Manager.
 * 
 * USAGE:
 * 1. Navigate to https://twitter.com/i/bookmarks in your browser
 * 2. Open the browser console (F12 or Cmd+Option+J on Mac)
 * 3. Copy and paste this entire script into the console
 * 4. Press Enter to run the script
 * 5. Wait for the script to complete (it will scroll automatically)
 * 6. A JSON file will be downloaded automatically when complete
 * 
 * IMPORTANT: Keep the browser tab active while the script runs.
 */

(async function () {
  'use strict';

  // Configuration
  const CONFIG = {
    scrollDelay: 2000,        // Delay between scrolls (ms)
    maxScrollAttempts: 2000,    // Maximum number of scroll attempts
    noNewContentLimit: 15,     // Stop after this many scrolls with no new content
    extractDelay: 500,        // Delay before extracting data (ms)
  };

  // State
  let extractedTweets = new Map(); // Use Map to avoid duplicates
  let scrollAttempts = 0;
  let noNewContentCount = 0;
  let isRunning = true;

  // Create progress indicator
  const progressDiv = document.createElement('div');
  progressDiv.id = 'twitter-crawler-progress';
  progressDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1DA1F2;
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
        🐦 Twitter Crawler
      </div>
      <div style="margin-bottom: 5px;">Status: ${status}</div>
      <div style="margin-bottom: 5px;">Tweets Found: ${count}</div>
      <div style="margin-bottom: 5px;">Scroll Attempts: ${scrollAttempts}</div>
      ${errors > 0 ? `<div style="color: #FFD700;">Errors: ${errors}</div>` : ''}
      ${!isRunning ? '<div style="margin-top: 10px; font-weight: bold;">✓ Complete!</div>' : ''}
    `;
  }

  function extractTweetId(element) {
    // Try to find tweet ID from links
    const links = element.querySelectorAll('a[href*="/status/"]');
    for (const link of links) {
      const match = link.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    return null;
  }

  function extractTweetData(article) {
    try {
      const tweetId = extractTweetId(article);
      if (!tweetId) return null;

      // Skip if already extracted
      if (extractedTweets.has(tweetId)) return null;

      // Extract author information
      const authorLink = article.querySelector('a[href^="/"][role="link"]');
      const authorName = article.querySelector('[data-testid="User-Name"] span')?.textContent || '';
      const authorUsername = authorLink?.href.split('/').pop() || '';
      const authorProfileUrl = authorLink?.href || '';

      // Extract tweet text
      const tweetTextElement = article.querySelector('[data-testid="tweetText"]');
      let content = tweetTextElement?.textContent || '';
      const lang = tweetTextElement?.getAttribute('lang') || '';

      // Extract timestamp
      const timeElement = article.querySelector('time');
      const timestamp = timeElement?.getAttribute('datetime') || new Date().toISOString();

      // Extract media (images and videos)
      const media = [];

      // Images
      const images = article.querySelectorAll('[data-testid="tweetPhoto"] img');
      images.forEach(img => {
        const url = img.src;
        if (url && !url.includes('profile_images')) {
          media.push({
            type: 'IMAGE',
            url: url.split('?')[0], // Remove query params
            thumbnailUrl: url
          });
        }
      });

      // Videos
      const videos = article.querySelectorAll('video');
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

      // Extract links from tweet text
      const links = [];
      const linkElements = article.querySelectorAll('[data-testid="tweetText"] a[href^="http"]');
      linkElements.forEach(link => {
        const url = link.href;
        if (url && !url.includes('twitter.com') && !url.includes('x.com')) {
          links.push(url);
        }
      });

      // Extract link cards (OG cards) - tweets with just a link preview
      const cardElements = article.querySelectorAll('[data-testid="card.wrapper"]');
      cardElements.forEach(card => {
        // Get the link from the card
        const cardLink = card.querySelector('a[href^="http"]');
        const cardUrl = cardLink?.href;

        if (cardUrl && !cardUrl.includes('twitter.com') && !cardUrl.includes('x.com')) {
          // Get the card image
          const cardImage = card.querySelector('img');
          const cardImageUrl = cardImage?.src;

          // Get the card title and description
          const cardTitle = card.querySelector('[dir="ltr"]')?.textContent || '';
          const cardDescription = card.querySelector('[data-testid="card.layoutLarge.detail"] > div:last-child')?.textContent || '';

          media.push({
            type: 'LINK',
            url: cardUrl,
            thumbnailUrl: cardImageUrl ? cardImageUrl.split('?')[0] : undefined,
            metadata: {
              title: cardTitle,
              description: cardDescription
            }
          });

          // If content is empty, use the card URL as content
          if (!content.trim()) {
            content = cardUrl;
          }
        }
      });

      // Add text links as media items (if not already captured as cards)
      links.forEach(url => {
        // Check if this URL is already in media as a card
        const alreadyExists = media.some(m => m.url === url);
        if (!alreadyExists) {
          media.push({
            type: 'LINK',
            url: url
          });
        }

        // If content is empty (and we haven't filled it with a card URL yet), use this link
        if (!content.trim()) {
          content = url;
        }
      });

      // Construct tweet URL
      const postUrl = `https://x.com/${authorUsername}/status/${tweetId}`;

      // Extract engagement metrics (optional metadata)
      const replyCount = article.querySelector('[data-testid="reply"]')?.getAttribute('aria-label') || '0';
      const retweetCount = article.querySelector('[data-testid="retweet"]')?.getAttribute('aria-label') || '0';
      const likeCount = article.querySelector('[data-testid="like"]')?.getAttribute('aria-label') || '0';

      // Extract view count (analytics)
      // View count is often in a link with href ending in /analytics
      const analyticsLink = article.querySelector('a[href$="/analytics"]');
      let viewCount = '0';
      if (analyticsLink) {
        // Try to get the text content or aria-label
        viewCount = analyticsLink.getAttribute('aria-label') || analyticsLink.textContent || '0';
      }

      // Extract mentions and hashtags from content
      const mentions = (content.match(/@\w+/g) || []).map(m => m.substring(1));
      const hashtags = (content.match(/#\w+/g) || []).map(h => h.substring(1));

      const tweetData = {
        postId: tweetId,
        postUrl: postUrl,
        content: content,
        author: {
          name: authorName,
          username: authorUsername,
          profileUrl: authorProfileUrl
        },
        media: media,
        timestamp: timestamp,
        metadata: {
          replyCount: replyCount,
          retweetCount: retweetCount,
          likeCount: likeCount,
          viewCount: viewCount,
          lang: lang,
          mentions: mentions,
          hashtags: hashtags,
          extractedAt: new Date().toISOString()
        }
      };

      return tweetData;
    } catch (error) {
      console.error('Error extracting tweet:', error);
      return null;
    }
  }

  function extractAllVisibleTweets() {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    let newCount = 0;

    articles.forEach(article => {
      const tweetData = extractTweetData(article);
      if (tweetData && !extractedTweets.has(tweetData.postId)) {
        extractedTweets.set(tweetData.postId, tweetData);
        newCount++;
      }
    });

    return newCount;
  }

  async function scrollToLoadMore() {
    const previousCount = extractedTweets.size;

    // Scroll to bottom
    window.scrollTo(0, document.body.scrollHeight);

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, CONFIG.scrollDelay));

    // Extract newly loaded tweets
    await new Promise(resolve => setTimeout(resolve, CONFIG.extractDelay));
    const newTweets = extractAllVisibleTweets();

    const currentCount = extractedTweets.size;

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
    const bookmarks = Array.from(extractedTweets.values());

    return {
      platform: 'twitter',
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
    a.download = `twitter-bookmarks-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Main execution
  console.log('🐦 Twitter Bookmarks Crawler Started');
  console.log('Keep this tab active and wait for completion...');

  updateProgress('Initializing...', 0);

  try {
    // Initial extraction
    await new Promise(resolve => setTimeout(resolve, CONFIG.extractDelay));
    extractAllVisibleTweets();
    updateProgress('Extracting...', extractedTweets.size);

    // Scroll and extract loop
    let shouldContinue = true;
    while (shouldContinue && isRunning) {
      shouldContinue = await scrollToLoadMore();
    }

    // Final extraction
    extractAllVisibleTweets();

    isRunning = false;
    updateProgress('Complete!', extractedTweets.size);

    // Generate and download JSON
    const jsonData = generateJSON();
    downloadJSON(jsonData);

    console.log('✓ Extraction complete!');
    console.log('Total tweets extracted:', extractedTweets.size);
    console.log('JSON file downloaded successfully');

    // Show completion message
    setTimeout(() => {
      progressDiv.innerHTML += `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.3);">
          <div style="font-size: 14px;">File downloaded! You can now close this tab.</div>
          <button onclick="this.parentElement.parentElement.remove()" 
                  style="margin-top: 10px; padding: 8px 16px; background: white; color: #1DA1F2; 
                         border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
            Close
          </button>
        </div>
      `;
    }, 1000);

  } catch (error) {
    console.error('Error during extraction:', error);
    isRunning = false;
    updateProgress('Error occurred', extractedTweets.size, 1);
    progressDiv.style.background = '#E0245E';
    progressDiv.innerHTML += `
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.3);">
        <div style="font-size: 14px;">Error: ${error.message}</div>
        <div style="font-size: 12px; margin-top: 5px;">Check console for details</div>
      </div>
    `;
  }

})();
