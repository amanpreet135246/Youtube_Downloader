# Video Downloader Chrome Extension

This Chrome extension allows you to download videos and audio from YouTube using real stream capture technology. It's a standalone solution that works directly in your browser without requiring a backend server.

## Features

- **Real Video Downloads**: Captures actual video streams from YouTube
- **Audio Extraction**: Downloads audio streams directly
- **Multiple Quality Options**: Choose from available video qualities
- **Stream Detection**: Automatically detects and captures media streams
- **Standalone Operation**: No external servers or APIs required

## How It Works

This extension uses a **Stream Capture Approach** similar to `ytdl-core` but adapted for browser extensions:

1. **Stream Interception**: Uses Chrome's `webRequest` API to monitor YouTube's media requests
2. **Stream Capture**: Identifies and captures video and audio stream URLs
3. **Real Downloads**: Uses Chrome's download API to save actual media files
4. **Quality Detection**: Automatically detects available video qualities

## Installation Instructions

1. Download or clone this repository to your computer
2. Open Chrome/Brave and go to `chrome://extensions/` or `brave://extensions/`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked" and select the extension folder
5. The Video Downloader extension should now appear in your extensions

## How to Use

1. **Go to YouTube**: Navigate to any YouTube video page
2. **Play the Video**: Start playing the video to allow stream capture
3. **Open Extension**: Click the Video Downloader extension icon
4. **Wait for Streams**: The extension will show available download options once streams are detected
5. **Choose Quality**: Select your preferred video quality from the dropdown
6. **Download**: Click either "Download Video" or "Download Audio"
7. **Check Downloads**: Files will be saved to your browser's default Downloads folder

## Important Notes

### Stream Capture Technology

This extension captures the actual media streams that YouTube uses for playback. This means:

- **You must play the video first** for streams to be captured
- Available qualities depend on what YouTube loads for your connection
- Both video and audio streams are captured separately
- Downloads are the actual media files (MP4 for video, audio streams for audio)

### Limitations

- Requires the video to be played for stream capture to work
- Available qualities depend on YouTube's adaptive streaming
- Some videos may have limited quality options
- Playlist downloads are not currently supported

## File Locations

Downloaded files are saved to your browser's default download location:
- **Windows**: `C:\Users\[YourUsername]\Downloads`
- **macOS**: `/Users/[YourUsername]/Downloads`  
- **Linux**: `/home/[YourUsername]/Downloads`

Files are saved with sanitized names like:
- Videos: `Video_Title_720p.mp4`
- Audio: `Video_Title.mp3`

## Technical Implementation

This extension implements real downloading by:

1. **Monitoring Network Requests**: Using `chrome.webRequest.onBeforeRequest`
2. **Stream URL Extraction**: Identifying `googlevideo.com` URLs with video/audio MIME types
3. **Quality Mapping**: Using YouTube's itag system to determine quality levels
4. **Direct Downloads**: Using `chrome.downloads.download()` with captured stream URLs

## Development

To modify or enhance this extension:

1. Edit the files as needed
2. Go to `chrome://extensions/` and click the refresh icon on the extension
3. Test your changes on YouTube

## Troubleshooting

- **"Play video first" message**: You need to start playing the video for streams to be captured
- **No download options**: Make sure the video is actually playing and try refreshing the extension
- **Download fails**: Check that the video isn't region-restricted or private

## License

This project is for educational purposes only. Always respect YouTube's terms of service and copyright laws when using this extension.
