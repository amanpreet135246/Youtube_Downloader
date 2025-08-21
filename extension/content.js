/**
 * Content script that runs on YouTube pages to detect videos
 */

console.log('🎯 Content script loaded on:', window.location.href);

// Send video information to the extension
function detectVideoInfo() {
  console.log('🔍 Detecting video info...');
  
  // Check if we're on a YouTube watch page
  if (window.location.href.includes('youtube.com/watch')) {
    // Get video ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    
    if (!videoId) {
      console.log('❌ No video ID found in URL');
      return;
    }
    
    console.log('📹 Video ID found:', videoId);
    
    // Extract video information from the page
    let videoTitle = '';
    let videoAuthor = '';
    let videoThumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    
    // Try to get title from different potential elements
    const titleElements = document.querySelectorAll('h1.title, h1[class*="title"], meta[property="og:title"], title');
    if (titleElements.length > 0) {
      for (let element of titleElements) {
        if (element.textContent && element.textContent.trim()) {
          videoTitle = element.textContent.trim();
          break;
        }
        if (element.getAttribute && element.getAttribute('content')) {
          videoTitle = element.getAttribute('content');
          break;
        }
      }
    }
    
    // Fallback for title
    if (!videoTitle) {
      const metaTitle = document.querySelector('meta[property="og:title"]');
      if (metaTitle) {
        videoTitle = metaTitle.getAttribute('content');
      } else {
        videoTitle = document.title.replace(' - YouTube', '');
      }
    }
    
    // Try to get author/channel name
    const authorElement = document.querySelector('[itemprop="author"] [itemprop="name"], #owner-name a, #channel-name a');
    if (authorElement) {
      videoAuthor = authorElement.textContent.trim();
    }
    
    const videoInfo = {
      videoId: videoId,
      title: videoTitle || 'Unknown Title',
      author: videoAuthor || 'Unknown Channel',
      thumbnail: videoThumbnail,
      url: window.location.href
    };
    
    console.log('✅ Video info detected:', videoInfo);
    
    // Send the video info to the popup
    chrome.runtime.sendMessage({
      action: 'videoInfo',
      data: videoInfo
    }, (response) => {
      if (response && response.success) {
        console.log('📤 Video info sent to background successfully');
      } else {
        console.error('❌ Failed to send video info to background');
      }
    });
  } else {
    console.log('❌ Not on a YouTube watch page');
  }
}

// Run detection when the page loads
window.addEventListener('load', detectVideoInfo);

// Also listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getVideoInfo') {
    detectVideoInfo();
    sendResponse({ success: true });
  }
  return true;
});

// Detect URL changes (for single-page applications like YouTube)
let lastUrl = window.location.href;
new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    setTimeout(detectVideoInfo, 1000); // Wait a bit for the page to load
  }
}).observe(document, { subtree: true, childList: true });
