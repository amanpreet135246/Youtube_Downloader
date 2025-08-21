# YouTube Downloader GUI

A standalone desktop application for downloading YouTube videos and audio with a clean, user-friendly interface.

## Features

- **Simple Interface**: Clean GUI with easy-to-use controls
- **Multiple Download Options**:
  - Single video download (best quality with automatic merging)
  - Single audio download (MP3 format)
  - Playlist video downloads
  - Playlist audio downloads (MP3 format)
- **Configurable Settings**: Choose custom download directories
- **Real-time Progress**: See download progress and status updates
- **Error Handling**: Comprehensive error reporting and logging
- **Cross-platform**: Works on Windows, macOS, and Linux

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   uv sync
   ```

## Usage

Run the application:
```bash
uv run python main.py
```

### How to Use

1. **Paste URL**: Enter a YouTube video or playlist URL
2. **Select Option**: Choose your preferred download format
3. **Configure Path**: Use File → Settings to set your download directory
4. **Download**: Click the Download button

### Download Options

- **v - Download video**: Downloads the best quality video with audio merged
- **m - Download audio only MP3**: Extracts audio and converts to MP3
- **vp - Download playlist videos**: Downloads all videos in a playlist
- **mp - Download playlist audios**: Downloads all audios from a playlist as MP3

### Settings

Access settings via File → Settings to configure:
- **Output Directory**: Choose where files are saved
- Videos are saved to: `{output_directory}/Videos/`
- Audio files are saved to: `{output_directory}/Music/`

## Technical Details

- Built with **PySide6** for the GUI framework
- Uses **yt-dlp** for downloading YouTube content
- Implements threaded downloads to keep the UI responsive
- Uses optimal yt-dlp settings (`bestvideo+bestaudio/best`) for automatic merging
- Persistent settings storage using QSettings

## Requirements

- Python 3.8+
- PySide6 (for GUI)
- yt-dlp (for downloading)
- FFmpeg (for audio conversion and video merging)

## Building Standalone Executable

To create a standalone executable:
```bash
uv add --dev pyinstaller
uv run pyinstaller --onefile --windowed main.py
```

## License

This project is open source and available under the MIT License.
