// Quick validation test for the import JSON
const fs = require('fs');

// Read the JSON file
const data = JSON.parse(fs.readFileSync('./packages/api/twitter-bookmarks-2025-11-14.json', 'utf8'));

console.log('Platform:', data.platform);
console.log('Total bookmarks:', data.bookmarks?.length);

// Check first bookmark structure
if (data.bookmarks && data.bookmarks.length > 0) {
  const first = data.bookmarks[0];
  console.log('\nFirst bookmark structure:');
  console.log('- postId:', first.postId ? '✓' : '✗');
  console.log('- postUrl:', first.postUrl ? '✓' : '✗');
  console.log('- content:', first.content ? '✓' : '✗');
  console.log('- author.name:', first.author?.name ? '✓' : '✗');
  console.log('- author.username:', first.author?.username ? '✓' : '✗');
  console.log('- author.profileUrl:', first.author?.profileUrl ? '✓' : '✗');
  console.log('- timestamp:', first.timestamp ? '✓' : '✗');
  console.log('- media:', first.media?.length || 0, 'items');
  
  if (first.media && first.media.length > 0) {
    console.log('\nFirst media item:');
    console.log('- type:', first.media[0].type);
    console.log('- url:', first.media[0].url ? '✓' : '✗');
  }
}

// Check for any missing required fields
let issues = [];
data.bookmarks.forEach((bookmark, index) => {
  if (!bookmark.postId) issues.push(`Bookmark ${index}: missing postId`);
  if (!bookmark.postUrl) issues.push(`Bookmark ${index}: missing postUrl`);
  if (!bookmark.content) issues.push(`Bookmark ${index}: missing content`);
  if (!bookmark.author?.name) issues.push(`Bookmark ${index}: missing author.name`);
  if (!bookmark.author?.username) issues.push(`Bookmark ${index}: missing author.username`);
  if (!bookmark.author?.profileUrl) issues.push(`Bookmark ${index}: missing author.profileUrl`);
  if (!bookmark.timestamp) issues.push(`Bookmark ${index}: missing timestamp`);
});

if (issues.length > 0) {
  console.log('\n❌ Issues found:');
  issues.forEach(issue => console.log('  -', issue));
} else {
  console.log('\n✅ All required fields present!');
}
