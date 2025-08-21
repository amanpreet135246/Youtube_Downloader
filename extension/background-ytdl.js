// YouTube Downloader Extension - ytdl-core approach
// This uses techniques from @distube/ytdl-core but adapted for browser extension

console.log('🚀 Background script starting with ytdl-core approach...');

// Global variables
let currentVideoInfo = null;
let availableFormats = [];

// Initialize
console.log('📋 Initializing variables...');

// Test Chrome APIs
console.log('🧪 Testing Chrome APIs...');
console.log('- chrome.runtime:', !!chrome.runtime);
console.log('- chrome.downloads:', !!chrome.downloads);
console.log('- chrome.storage:', !!chrome.storage);
console.log('- chrome.scripting:', !!chrome.scripting);

// YouTube signature cipher functions (simplified from ytdl-core)
function decipherFormats(playerResponse) {
  try {
    const formats = [];
    
    // Extract from streaming data
    if (playerResponse.streamingData) {
      const streamingData = playerResponse.streamingData;
      
      // Add regular formats
      if (streamingData.formats) {
        formats.push(...streamingData.formats);
      }
      
      // Add adaptive formats (DASH)
      if (streamingData.adaptiveFormats) {
        formats.push(...streamingData.adaptiveFormats);
      }
    }
    
    console.log('📊 Extracted', formats.length, 'formats from playerResponse');
    return formats;
  } catch (error) {
    console.error('❌ Error deciphering formats:', error);
    return [];
  }
}

// Format quality labels
function getQualityLabel(format) {
  if (format.qualityLabel) {
    return format.qualityLabel;
  }
  
  if (format.height) {
    return `${format.height}p`;
  }
  
  if (format.audioQuality) {
    return format.audioQuality.replace('AUDIO_QUALITY_', '').toLowerCase();
  }
  
  return format.quality || 'unknown';
}

// Extract video info using YouTube's internal API (like ytdl-core does)
async function extractVideoInfo(videoId) {
  try {
    console.log('🔍 Extracting video info for:', videoId);
    
    // Inject script to get player response from YouTube page
    const results = await chrome.scripting.executeScript({
      target: { tabId: await getCurrentTabId() },
      func: function() {
        try {
          // Try to get ytInitialPlayerResponse from page
          if (window.ytInitialPlayerResponse) {
            return {
              success: true,
              playerResponse: window.ytInitialPlayerResponse,
              videoDetails: window.ytInitialPlayerResponse.videoDetails
            };
          }
          
          // Fallback: try to find it in script tags
          const scripts = document.querySelectorAll('script');
          for (const script of scripts) {
            const content = script.textContent;
            if (content.includes('ytInitialPlayerResponse')) {
              const match = content.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
              if (match) {
                const playerResponse = JSON.parse(match[1]);
                return {
                  success: true,
                  playerResponse: playerResponse,
                  videoDetails: playerResponse.videoDetails
                };
              }
            }
          }
          
          return { success: false, error: 'Could not find ytInitialPlayerResponse' };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    });
    
    if (results[0]?.result?.success) {
      const { playerResponse, videoDetails } = results[0].result;
      
      console.log('✅ Got player response for:', videoDetails.title);
      
      // Extract formats
      const formats = decipherFormats(playerResponse);
      
      // Categorize formats
      const videoFormats = formats.filter(f => f.height || f.qualityLabel);
      const audioFormats = formats.filter(f => f.audioQuality && !f.height);
      
      console.log('📹 Video formats:', videoFormats.length);
      console.log('🔊 Audio formats:', audioFormats.length);
      
      // Store globally
      availableFormats = formats;
      currentVideoInfo = {
        id: videoId,
        title: videoDetails.title,
        author: videoDetails.author,
        duration: videoDetails.lengthSeconds,
        thumbnail: videoDetails.thumbnail?.thumbnails?.[0]?.url
      };
      
      return {
        success: true,
        videoInfo: currentVideoInfo,
        formats: {
          video: videoFormats.map(f => ({
            itag: f.itag,
            quality: getQualityLabel(f),
            format: f.mimeType,
            url: f.url,
            size: f.contentLength,
            fps: f.fps
          })),
          audio: audioFormats.map(f => ({
            itag: f.itag,
            quality: getQualityLabel(f),
            format: f.mimeType,
            url: f.url,
            size: f.contentLength,
            bitrate: f.averageBitrate
          }))
        }
      };
    } else {
      console.error('❌ Failed to extract video info:', results[0]?.result?.error);
      return { success: false, error: results[0]?.result?.error };
    }
    
  } catch (error) {
    console.error('❌ Error in extractVideoInfo:', error);
    return { success: false, error: error.message };
  }
}

// Get current tab ID
async function getCurrentTabId() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0].id;
}

// Download function
async function downloadFormat(format, isAudio = false) {
  try {
    if (!format.url) {
      throw new Error('No download URL available');
    }
    
    const fileExtension = isAudio ? 'mp4' : 'mp4'; // YouTube mostly uses mp4
    const qualityLabel = format.quality.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${currentVideoInfo.title.replace(/[^a-zA-Z0-9]/g, '_')}_${qualityLabel}.${fileExtension}`;
    
    console.log('📁 Downloading:', fileName);
    
    const downloadId = await chrome.downloads.download({
      url: format.url,
      filename: fileName,
      saveAs: false
    });
    
    console.log('✅ Download started with ID:', downloadId);
    return { success: true, downloadId: downloadId };
    
  } catch (error) {
    console.error('❌ Download failed:', error);
    return { success: false, error: error.message };
  }
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Background received message:', message.action);
  
  if (message.action === 'videoInfo') {
    // Store basic video info from content script
    currentVideoInfo = message.data;
    console.log('📹 Video info received:', currentVideoInfo.title);
    
    // Extract detailed info using ytdl-core approach
    extractVideoInfo(currentVideoInfo.id).then(result => {
      if (result.success) {
        console.log('✅ Successfully extracted formats');
        chrome.storage.local.set({ 
          videoInfo: result.videoInfo,
          formats: result.formats 
        });
      }
    });
    
    sendResponse({ success: true });
  }
  
  else if (message.action === 'getCurrentVideoInfo') {
    console.log('📱 Popup requesting video info');
    
    // Get from storage
    chrome.storage.local.get(['videoInfo', 'formats'], (result) => {
      sendResponse({
        success: true,
        videoInfo: result.videoInfo || currentVideoInfo,
        formats: result.formats || { video: [], audio: [] }
      });
    });
    return true; // Keep channel open for async response
  }
  
  else if (message.action === 'downloadVideo') {
    console.log('📥 Download video requested, itag:', message.itag);
    
    // Find format by itag
    const format = availableFormats.find(f => f.itag.toString() === message.itag.toString());
    if (format) {
      downloadFormat(format, false).then(result => {
        sendResponse(result);
      });
    } else {
      sendResponse({ success: false, error: 'Format not found' });
    }
    return true; // Keep channel open for async response
  }
  
  else if (message.action === 'downloadAudio') {
    console.log('📥 Download audio requested, itag:', message.itag);
    
    // Find format by itag
    const format = availableFormats.find(f => f.itag.toString() === message.itag.toString());
    if (format) {
      downloadFormat(format, true).then(result => {
        sendResponse(result);
      });
    } else {
      sendResponse({ success: false, error: 'Audio format not found' });
    }
    return true; // Keep channel open for async response
  }
});

console.log('🚀 Background script loaded with ytdl-core approach');
