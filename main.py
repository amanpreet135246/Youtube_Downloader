#!/usr/bin/env python3
"""
YouTube Downloader GUI Application
A standalone desktop application for downloading YouTube videos and audio.
"""

import sys
import os
import subprocess
import threading
import json
from pathlib import Path
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QPushButton, QComboBox, QTextEdit, QProgressBar,
    QFileDialog, QGroupBox, QFormLayout, QMessageBox, QStatusBar,
    QMenuBar, QMenu, QDialog, QDialogButtonBox, QTabWidget
)
from PySide6.QtCore import QThread, Signal, QSettings, Qt
from PySide6.QtGui import QFont, QIcon, QAction
import yt_dlp


class DownloadWorker(QThread):
    """Worker thread for downloading videos without blocking the UI"""
    progress = Signal(str)
    finished = Signal(bool, str)
    
    def __init__(self, url, option, output_path):
        super().__init__()
        self.url = url
        self.option = option
        self.output_path = output_path
        
    def run(self):
        try:
            self.progress.emit("Starting download...")
            
            # Configure yt-dlp options based on user choice
            if self.option == "v":
                # Single video with best quality
                ydl_opts = {
                    'format': 'bestvideo+bestaudio/best',
                    'merge_output_format': 'mp4',
                    'outtmpl': os.path.join(self.output_path, 'Videos', '%(title)s.%(ext)s'),
                    'noplaylist': True,
                }
            elif self.option == "m":
                # Single audio (MP3)
                ydl_opts = {
                    'format': 'bestaudio/best',
                    'postprocessors': [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': 'mp3',
                        'preferredquality': '192',
                    }],
                    'outtmpl': os.path.join(self.output_path, 'Music', '%(title)s.%(ext)s'),
                    'noplaylist': True,
                }
            elif self.option == "vp":
                # Playlist videos
                ydl_opts = {
                    'format': 'bestvideo+bestaudio/best',
                    'merge_output_format': 'mp4',
                    'outtmpl': os.path.join(self.output_path, 'Videos', '%(playlist_index)s - %(title)s.%(ext)s'),
                }
            elif self.option == "mp":
                # Playlist audio (MP3)
                ydl_opts = {
                    'format': 'bestaudio/best',
                    'postprocessors': [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': 'mp3',
                        'preferredquality': '192',
                    }],
                    'outtmpl': os.path.join(self.output_path, 'Music', '%(playlist_index)s - %(title)s.%(ext)s'),
                }
            else:
                self.finished.emit(False, "Invalid download option")
                return
            
            # Add progress hook
            def progress_hook(d):
                if d['status'] == 'downloading':
                    percent = d.get('_percent_str', 'N/A')
                    speed = d.get('_speed_str', 'N/A')
                    self.progress.emit(f"Downloading... {percent} at {speed}")
                elif d['status'] == 'finished':
                    self.progress.emit("Processing...")
            
            ydl_opts['progress_hooks'] = [progress_hook]
            
            # Create output directories
            os.makedirs(os.path.join(self.output_path, 'Videos'), exist_ok=True)
            os.makedirs(os.path.join(self.output_path, 'Music'), exist_ok=True)
            
            # Download using yt-dlp
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([self.url])
            
            self.finished.emit(True, "Download completed successfully!")
            
        except Exception as e:
            self.finished.emit(False, f"Download failed: {str(e)}")


class SettingsDialog(QDialog):
    """Settings dialog for configuring download paths"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Settings")
        self.setModal(True)
        self.resize(500, 300)
        
        self.settings = QSettings()
        self.setup_ui()
        self.load_settings()
    
    def setup_ui(self):
        layout = QVBoxLayout()
        
        # Download paths group
        paths_group = QGroupBox("Download Paths")
        paths_layout = QFormLayout()
        
        # Output directory
        self.output_path_edit = QLineEdit()
        output_path_layout = QHBoxLayout()
        output_path_layout.addWidget(self.output_path_edit)
        
        browse_btn = QPushButton("Browse")
        browse_btn.clicked.connect(self.browse_output_path)
        output_path_layout.addWidget(browse_btn)
        
        output_path_widget = QWidget()
        output_path_widget.setLayout(output_path_layout)
        paths_layout.addRow("Output Directory:", output_path_widget)
        
        paths_group.setLayout(paths_layout)
        layout.addWidget(paths_group)
        
        # Buttons
        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)
        
        self.setLayout(layout)
    
    def browse_output_path(self):
        path = QFileDialog.getExistingDirectory(self, "Select Output Directory")
        if path:
            self.output_path_edit.setText(path)
    
    def load_settings(self):
        # Load saved settings
        output_path = self.settings.value("output_path", str(Path.home() / "Downloads"))
        self.output_path_edit.setText(output_path)
    
    def accept(self):
        # Save settings
        self.settings.setValue("output_path", self.output_path_edit.text())
        super().accept()
    
    def get_output_path(self):
        return self.output_path_edit.text()


class YouTubeDownloaderGUI(QMainWindow):
    """Main application window"""
    
    def __init__(self):
        super().__init__()
        self.settings = QSettings()
        self.download_worker = None
        self.setup_ui()
        self.load_settings()
    
    def setup_ui(self):
        self.setWindowTitle("YouTube Downloader")
        self.setGeometry(100, 100, 800, 600)
        
        # Create menu bar
        self.create_menu_bar()
        
        # Central widget
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # Main layout
        main_layout = QVBoxLayout()
        central_widget.setLayout(main_layout)
        
        # Title
        title_label = QLabel("YouTube Downloader")
        title_font = QFont()
        title_font.setPointSize(18)
        title_font.setBold(True)
        title_label.setFont(title_font)
        title_label.setAlignment(Qt.AlignCenter)
        main_layout.addWidget(title_label)
        
        # URL input group
        url_group = QGroupBox("YouTube URL")
        url_layout = QVBoxLayout()
        
        self.url_input = QLineEdit()
        self.url_input.setPlaceholderText("Paste YouTube link here...")
        self.url_input.returnPressed.connect(self.download)
        url_layout.addWidget(self.url_input)
        
        url_group.setLayout(url_layout)
        main_layout.addWidget(url_group)
        
        # Options group
        options_group = QGroupBox("Download Options")
        options_layout = QFormLayout()
        
        self.option_combo = QComboBox()
        self.option_combo.addItems([
            "v - Download video (single video)",
            "m - Download audio only MP3 (single video)",
            "vp - Download playlist videos",
            "mp - Download playlist audios (MP3)"
        ])
        options_layout.addRow("Option:", self.option_combo)
        
        options_group.setLayout(options_layout)
        main_layout.addWidget(options_group)
        
        # Download button
        self.download_btn = QPushButton("Download")
        self.download_btn.setStyleSheet("""
            QPushButton {
                background-color: #4CAF50;
                color: white;
                border: none;
                padding: 10px;
                font-size: 14px;
                font-weight: bold;
                border-radius: 5px;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
            QPushButton:disabled {
                background-color: #cccccc;
            }
        """)
        self.download_btn.clicked.connect(self.download)
        main_layout.addWidget(self.download_btn)
        
        # Progress bar
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        main_layout.addWidget(self.progress_bar)
        
        # Log output
        log_group = QGroupBox("Download Log")
        log_layout = QVBoxLayout()
        
        self.log_output = QTextEdit()
        self.log_output.setReadOnly(True)
        self.log_output.setMaximumHeight(200)
        log_layout.addWidget(self.log_output)
        
        log_group.setLayout(log_layout)
        main_layout.addWidget(log_group)
        
        # Status bar
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self.status_bar.showMessage("Ready")
        
        # Add some spacing
        main_layout.addStretch()
    
    def create_menu_bar(self):
        menubar = self.menuBar()
        
        # File menu
        file_menu = menubar.addMenu('File')
        
        settings_action = QAction('Settings', self)
        settings_action.triggered.connect(self.open_settings)
        file_menu.addAction(settings_action)
        
        file_menu.addSeparator()
        
        exit_action = QAction('Exit', self)
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # Help menu
        help_menu = menubar.addMenu('Help')
        
        about_action = QAction('About', self)
        about_action.triggered.connect(self.show_about)
        help_menu.addAction(about_action)
    
    def open_settings(self):
        dialog = SettingsDialog(self)
        if dialog.exec() == QDialog.Accepted:
            self.load_settings()
    
    def show_about(self):
        QMessageBox.about(self, "About", 
                         "YouTube Downloader GUI\n\n"
                         "A simple application for downloading YouTube videos and audio.\n"
                         "Built with PySide6 and yt-dlp.")
    
    def load_settings(self):
        # Load output path setting
        self.output_path = self.settings.value("output_path", str(Path.home() / "Downloads"))
        self.status_bar.showMessage(f"Output directory: {self.output_path}")
    
    def log_message(self, message):
        """Add a message to the log output"""
        self.log_output.append(f"[{threading.current_thread().name}] {message}")
        
        # Auto-scroll to bottom
        scrollbar = self.log_output.verticalScrollBar()
        scrollbar.setValue(scrollbar.maximum())
    
    def download(self):
        url = self.url_input.text().strip()
        if not url:
            QMessageBox.warning(self, "Warning", "Please enter a YouTube URL")
            return
        
        # Get selected option
        option_text = self.option_combo.currentText()
        option = option_text.split(" - ")[0]
        
        # Disable download button
        self.download_btn.setEnabled(False)
        self.download_btn.setText("Downloading...")
        
        # Show progress bar
        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0, 0)  # Indeterminate progress
        
        # Clear log
        self.log_output.clear()
        
        self.log_message(f"Starting download: {url}")
        self.log_message(f"Option: {option_text}")
        self.log_message(f"Output directory: {self.output_path}")
        
        # Start download in worker thread
        self.download_worker = DownloadWorker(url, option, self.output_path)
        self.download_worker.progress.connect(self.on_download_progress)
        self.download_worker.finished.connect(self.on_download_finished)
        self.download_worker.start()
    
    def on_download_progress(self, message):
        """Handle download progress updates"""
        self.log_message(message)
        self.status_bar.showMessage(message)
    
    def on_download_finished(self, success, message):
        """Handle download completion"""
        self.log_message(message)
        
        # Re-enable download button
        self.download_btn.setEnabled(True)
        self.download_btn.setText("Download")
        
        # Hide progress bar
        self.progress_bar.setVisible(False)
        
        if success:
            self.status_bar.showMessage("Download completed successfully!")
            QMessageBox.information(self, "Success", message)
        else:
            self.status_bar.showMessage("Download failed!")
            QMessageBox.critical(self, "Error", message)
        
        # Clear URL input on successful download
        if success:
            self.url_input.clear()


def main():
    app = QApplication(sys.argv)
    
    # Set application properties
    app.setApplicationName("YouTube Downloader")
    app.setApplicationVersion("1.0.0")
    app.setOrganizationName("YT-Downloader")
    
    # Create and show main window
    window = YouTubeDownloaderGUI()
    window.show()
    
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
