// Popup script for ytdl-core approach
console.log('🎬 Popup script loaded');

let currentVideoInfo = null;
let availableFormats = { video: [], audio: [] };

// DOM elements
const videoInfoDiv = document.getElementById('videoInfo');
const downloadSection = document.getElementById('downloadSection');
const statusDiv = document.getElementById('status');
const videoSelect = document.getElementById('videoQuality');
const audioSelect = document.getElementById('audioQuality');
const downloadVideoBtn = document.getElementById('downloadVideo');
const downloadAudioBtn = document.getElementById('downloadAudio');

// Update UI with video info
function updateVideoInfo(videoInfo) {
  if (!videoInfo) {
    videoInfoDiv.innerHTML = '<p>No video detected. Please navigate to a YouTube video.</p>';
    downloadSection.style.display = 'none';
    return;
  }

  currentVideoInfo = videoInfo;
  
  videoInfoDiv.innerHTML = `
    <div class="video-details">
      ${videoInfo.thumbnail ? `<img src="${videoInfo.thumbnail}" alt="Thumbnail" style="width: 100px; height: 56px; object-fit: cover; border-radius: 4px;">` : ''}
      <div>
        <h3>${videoInfo.title}</h3>
        <p><strong>Channel:</strong> ${videoInfo.author || 'Unknown'}</p>
        ${videoInfo.duration ? `<p><strong>Duration:</strong> ${Math.floor(videoInfo.duration / 60)}:${(videoInfo.duration % 60).toString().padStart(2, '0')}</p>` : ''}
      </div>
    </div>
  `;
  
  downloadSection.style.display = 'block';
}

// Update format options
function updateFormatOptions(formats) {
  availableFormats = formats;
  
  // Update video options
  videoSelect.innerHTML = '<option value="">Select video quality...</option>';
  if (formats.video && formats.video.length > 0) {
    formats.video.forEach(format => {
      const option = document.createElement('option');
      option.value = format.itag;
      const sizeInfo = format.size ? ` (${Math.round(format.size / (1024*1024))}MB)` : '';
      const fpsInfo = format.fps ? ` ${format.fps}fps` : '';
      option.textContent = `${format.quality}${fpsInfo} - ${format.format}${sizeInfo}`;
      videoSelect.appendChild(option);
    });
    downloadVideoBtn.disabled = false;
  } else {
    videoSelect.innerHTML = '<option value="">No video formats available</option>';
    downloadVideoBtn.disabled = true;
  }
  
  // Update audio options
  audioSelect.innerHTML = '<option value="">Select audio quality...</option>';
  if (formats.audio && formats.audio.length > 0) {
    formats.audio.forEach(format => {
      const option = document.createElement('option');
      option.value = format.itag;
      const sizeInfo = format.size ? ` (${Math.round(format.size / (1024*1024))}MB)` : '';
      const bitrateInfo = format.bitrate ? ` ${Math.round(format.bitrate/1000)}kbps` : '';
      option.textContent = `${format.quality}${bitrateInfo} - ${format.format}${sizeInfo}`;
      audioSelect.appendChild(option);
    });
    downloadAudioBtn.disabled = false;
  } else {
    audioSelect.innerHTML = '<option value="">No audio formats available</option>';
    downloadAudioBtn.disabled = true;
  }
  
  // Update status
  if (formats.video.length === 0 && formats.audio.length === 0) {
    showStatus('No download formats available. Try refreshing the page and playing the video.', 'warning');
  } else {
    showStatus(`Found ${formats.video.length} video and ${formats.audio.length} audio formats`, 'success');
  }
}

// Show status message
function showStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }
}

// Download handlers
downloadVideoBtn.addEventListener('click', async () => {
  const selectedItag = videoSelect.value;
  if (!selectedItag) {
    showStatus('Please select a video quality first', 'warning');
    return;
  }
  
  showStatus('Starting download...', 'info');
  downloadVideoBtn.disabled = true;
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'downloadVideo',
      itag: selectedItag
    });
    
    if (response.success) {
      showStatus('Download started successfully!', 'success');
    } else {
      showStatus(`Download failed: ${response.error}`, 'error');
    }
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    downloadVideoBtn.disabled = false;
  }
});

downloadAudioBtn.addEventListener('click', async () => {
  const selectedItag = audioSelect.value;
  if (!selectedItag) {
    showStatus('Please select an audio quality first', 'warning');
    return;
  }
  
  showStatus('Starting download...', 'info');
  downloadAudioBtn.disabled = true;
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'downloadAudio',
      itag: selectedItag
    });
    
    if (response.success) {
      showStatus('Download started successfully!', 'success');
    } else {
      showStatus(`Download failed: ${response.error}`, 'error');
    }
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    downloadAudioBtn.disabled = true;
  }
});

// Get current video info when popup opens
async function loadVideoInfo() {
  try {
    showStatus('Loading video information...', 'info');
    
    const response = await chrome.runtime.sendMessage({
      action: 'getCurrentVideoInfo'
    });
    
    if (response.success) {
      updateVideoInfo(response.videoInfo);
      updateFormatOptions(response.formats);
    } else {
      showStatus('Failed to load video info', 'error');
    }
  } catch (error) {
    console.error('Error loading video info:', error);
    showStatus('Error loading video information', 'error');
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadVideoInfo();
});

console.log('✅ Popup script initialized');
