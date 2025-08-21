/**
 * Simplified Background Script - Uses YouTube's embed URLs instead of stream capture
 */

console.log('🚀 Simple Background script starting...');

// Keep track of current video information
let currentVideoInfo = null;

// Test basic functionality
try {
  console.log('🧪 Testing Chrome APIs...');
  console.log('- chrome.runtime:', !!chrome.runtime);
  console.log('- chrome.downloads:', !!chrome.downloads);
  console.log('- chrome.storage:', !!chrome.storage);
  console.log('✅ Basic APIs available');
} catch (error) {
  console.error('❌ Error testing Chrome APIs:', error);
}

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Background received message:', message.action);
  
  // Handle video info from content script
  if (message.action === 'videoInfo') {
    currentVideoInfo = message.data;
    console.log('📹 Video info received:', currentVideoInfo.title);
    // Cache the video info
    chrome.storage.local.set({ currentVideoInfo: message.data });
    sendResponse({ success: true });
  }
  
  // Handle download requests from popup
  else if (message.action === 'downloadVideo') {
    console.log('📥 Download video requested, quality:', message.quality);
    
    if (currentVideoInfo) {
      initiateVideoDownload(currentVideoInfo, message.quality);
      sendResponse({ success: true });
    } else {
      const errorMsg = 'No video information available. Please make sure you\'re on a YouTube video page.';
      console.error('❌', errorMsg);
      sendResponse({ success: false, error: errorMsg });
    }
  }
  
  else if (message.action === 'downloadAudio') {
    console.log('📥 Download audio requested');
    
    if (currentVideoInfo) {
      initiateAudioDownload(currentVideoInfo);
      sendResponse({ success: true });
    } else {
      const errorMsg = 'No video information available. Please make sure you\'re on a YouTube video page.';
      console.error('❌', errorMsg);
      sendResponse({ success: false, error: errorMsg });
    }
  }
  
  // Request for current video info from popup
  else if (message.action === 'getCurrentVideoInfo') {
    console.log('📱 Popup requesting video info');
    
    // First try to get from memory
    if (currentVideoInfo) {
      console.log('📊 Returning video info from memory');
      sendResponse({ 
        success: true, 
        videoInfo: currentVideoInfo,
        availableStreams: { video: ['best'], audio: ['mp3'] }
      });
    } 
    // Then try to get from storage
    else {
      chrome.storage.local.get(['currentVideoInfo'], (result) => {
        if (result.currentVideoInfo) {
          currentVideoInfo = result.currentVideoInfo;
          console.log('📊 Returning video info from storage');
          sendResponse({ 
            success: true, 
            videoInfo: currentVideoInfo,
            availableStreams: { video: ['best'], audio: ['mp3'] }
          });
        } else {
          console.log('❌ No video information available');
          sendResponse({ success: false, error: 'No video information available' });
        }
      });
      return true; // Required for async response
    }
  }
  
  return true; // Required for async response
});

/**
 * Initiate video download using YouTube video URL
 * This creates a downloadable link that users can use with external tools
 */
function initiateVideoDownload(videoInfo, quality) {
  console.log('🎬 Starting video download for:', videoInfo.title);
  
  // Create a simple text file with the video information and instructions
  const downloadInfo = `YouTube Video Download Information
===========================================

Video Title: ${videoInfo.title}
Channel: ${videoInfo.author}
Video URL: ${videoInfo.url}
Video ID: ${videoInfo.videoId}

Instructions:
1. Copy the Video URL above
2. Use a tool like yt-dlp, youtube-dl, or an online converter
3. Paste the URL into your preferred download tool

For yt-dlp command line:
yt-dlp "${videoInfo.url}"

For audio only:
yt-dlp -x --audio-format mp3 "${videoInfo.url}"

Generated on: ${new Date().toLocaleString()}
`;

  // Create a blob with the download information
  const blob = new Blob([downloadInfo], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const filename = sanitizeFilename(videoInfo.title) + '_download_info.txt';
  console.log('📁 Creating download info file:', filename);
  
  chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: false
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('❌ Download failed:', chrome.runtime.lastError.message);
    } else {
      console.log('✅ Download info file created with ID:', downloadId);
      // Clean up the blob URL
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      // Notify popup of successful download start
      notifyDownloadStarted('video', filename);
    }
  });
}

/**
 * Initiate audio download information
 */
function initiateAudioDownload(videoInfo) {
  console.log('🎵 Starting audio download for:', videoInfo.title);
  
  // Create audio download information
  const downloadInfo = `YouTube Audio Download Information
==========================================

Video Title: ${videoInfo.title}
Channel: ${videoInfo.author}
Video URL: ${videoInfo.url}
Video ID: ${videoInfo.videoId}

Instructions for Audio Download:
1. Copy the Video URL above
2. Use yt-dlp or similar tool to extract audio
3. Command: yt-dlp -x --audio-format mp3 "${videoInfo.url}"

Alternative online tools:
- Use any YouTube to MP3 converter
- Paste the URL above into the converter

Generated on: ${new Date().toLocaleString()}
`;

  const blob = new Blob([downloadInfo], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const filename = sanitizeFilename(videoInfo.title) + '_audio_download_info.txt';
  console.log('📁 Creating audio download info file:', filename);
  
  chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: false
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('❌ Audio download failed:', chrome.runtime.lastError.message);
    } else {
      console.log('✅ Audio download info file created with ID:', downloadId);
      // Clean up the blob URL
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      // Notify popup of successful download start
      notifyDownloadStarted('audio', filename);
    }
  });
}

/**
 * Notify popup about download start
 */
function notifyDownloadStarted(type, filename) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'downloadStarted',
        type: type,
        filename: filename
      }).catch(() => {
        // Ignore errors if content script isn't available
        console.log('Note: Could not notify content script (this is normal)');
      });
    }
  });
}

/**
 * Helper function to sanitize filenames
 */
function sanitizeFilename(name) {
  return name.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
}

console.log('✅ Simple background script loaded successfully');
