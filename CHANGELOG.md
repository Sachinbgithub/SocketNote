# Changelog

All notable changes to SocketNote will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-01-03

### Added
- **File Upload Size Configuration**: Users can now customize upload limits through a settings panel
- **Settings Modal**: New settings interface accessible from the header
- **Upload Presets**: Four predefined configurations (Office, High-Res Images, Large Files, Maximum)
- **Custom Size Override**: Ability to set custom file size limits (1-500MB)
- **Settings Persistence**: Upload configuration is saved and remembered between sessions
- **Real-time Configuration Display**: Current limits are shown in the upload interface
- **Settings API**: New server endpoints for upload configuration management

### Changed
- **Enhanced FileUpload Component**: Now uses dynamic size limits based on user settings
- **Improved Error Messages**: Upload errors now show current configured limits
- **Updated Package Names**: Changed from "office-notes-sharing-app" to "socketnote" for consistency

### Technical Details
- Added `/api/settings/upload-config` endpoints (GET/POST)
- Enhanced FileUpload component with configuration awareness
- Added Settings component with preset selection and custom size options
- Implemented localStorage for settings persistence
- Updated all package.json files to version 1.1.0

## [1.0.0] - 2025-01-03

### Added
- Initial release of SocketNote
- Local network notes sharing application
- Folder management with drag & drop support
- Rich text editor with Markdown support
- File upload functionality (images, PDFs, Office documents, archives)
- Global search functionality
- SQLite database with backup/restore
- Network accessibility for team collaboration
- Responsive design for mobile and desktop
- Comprehensive error handling and validation 