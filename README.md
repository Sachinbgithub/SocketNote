# Office Notes Sharing App

A full-stack local network notes sharing application with folder management, rich text editing, file attachments, and backup functionality.

## Features

### 📁 Folder Management
- Create, rename, and delete folders
- Nested folder structure support
- Visual folder tree navigation
- Drag and drop notes between folders

### 📝 Notes Features
- Create, edit, delete notes within folders
- Rich text editor with Markdown support
- Code syntax highlighting with multiple languages
- Auto-save functionality
- Timestamp tracking (created/modified)
- Word and character count statistics

### 📎 File Attachments
- Image upload support (JPG, PNG, GIF, WebP)
- Drag & drop file upload interface
- Image preview in notes
- File size limit: 10MB per file
- Organized file storage

### 🔍 Search Functionality
- Global search across all notes and folders
- Search by note title, content, and folder names
- Highlight search results
- Search suggestions and autocomplete
- Recent search history

### 💾 Data Persistence & Backup
- SQLite database for reliable data storage
- JSON export/import functionality
- Backup history management
- Automatic data persistence on server restart

### 🌐 Network Access
- Accessible from any device on the local network
- CORS enabled for cross-origin requests
- Static file serving for uploaded images
- Real-time server status display

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **SQLite** - Database with better-sqlite3
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing
- **Helmet** - Security middleware

### Frontend
- **React** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling framework
- **React Syntax Highlighter** - Code highlighting
- **React Markdown** - Markdown rendering
- **React Dropzone** - File upload interface
- **Axios** - HTTP client
- **Lucide React** - Icons

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Quick Start

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd office-notes-sharing-app
   ```

2. **Install all dependencies**
   ```bash
   npm run install-all
   ```

3. **Initialize the database**
   ```bash
   cd server
   npm run init-db
   ```

4. **Start the development servers**
   ```bash
   npm run dev
   ```

### Manual Installation

If you prefer to install dependencies manually:

1. **Install root dependencies**
   ```bash
   npm install
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   npm run init-db
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Start the servers**
   ```bash
   # Terminal 1 - Start server
   cd server
   npm run dev
   
   # Terminal 2 - Start client
   cd client
   npm run dev
   ```

## Usage

### Starting the Application

1. **Development mode** (recommended for testing)
   ```bash
   npm run dev
   ```
   This starts both the backend server (port 3000) and frontend client (port 5173).

2. **Production mode**
   ```bash
   npm run build
   npm start
   ```

### Accessing the Application

Once started, you'll see output similar to:
```
🚀 Office Notes Sharing App Server Started!
============================================
📱 Local: http://localhost:3000
🌐 Network Access:
   http://192.168.1.100:3000
   http://10.0.0.50:3000
============================================
```

- **Local access**: Open `http://localhost:3000` in your browser
- **Network access**: Other devices on your network can access using the displayed IP addresses

### Basic Usage

1. **Create Folders**: Click "New Folder" to create organizational folders
2. **Create Notes**: Select a folder and click "New Note" to create notes
3. **Edit Notes**: Click on any note to open the rich text editor
4. **Upload Files**: Use the upload button in the note editor to attach images
5. **Search**: Use the search bar to find notes and folders
6. **Backup**: Use the backup manager (database icon) to export/import data

### Markdown Support

The note editor supports Markdown formatting:
- **Bold**: `**text**`
- **Italic**: `*text*`
- **Headers**: `# H1`, `## H2`, etc.
- **Lists**: `- item` or `1. item`
- **Code**: `` `code` `` for inline, ``` ``` ``` for blocks
- **Links**: `[text](url)`
- **Images**: `![alt](image-url)`

### Code Syntax Highlighting

The editor automatically detects and highlights code in various languages:
- JavaScript, Python, HTML, CSS, SQL
- And many more supported by Prism.js

## Configuration

### Environment Variables

Create a `.env` file in the server directory:

```env
PORT=3000
NODE_ENV=development
```

### Database Configuration

The SQLite database is automatically created at `server/database.sqlite`. The database includes:
- Folders table with nested structure
- Notes table with content and metadata
- Attachments table for file references

### File Storage

Uploaded files are stored in `server/uploads/` with unique filenames to prevent conflicts.

## API Endpoints

### Folders
- `GET /api/folders` - Get all folders
- `POST /api/folders` - Create folder
- `PUT /api/folders/:id` - Update folder
- `DELETE /api/folders/:id` - Delete folder

### Notes
- `GET /api/notes` - Get all notes
- `GET /api/notes/folder/:folderId` - Get notes by folder
- `POST /api/notes` - Create note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note
- `PATCH /api/notes/:id/autosave` - Auto-save note content

### Upload
- `POST /api/upload/single` - Upload single file
- `POST /api/upload/multiple` - Upload multiple files
- `DELETE /api/upload/:id` - Delete attachment

### Search
- `GET /api/search` - Global search
- `GET /api/search/advanced` - Advanced search with filters
- `GET /api/search/suggestions` - Search suggestions

### Backup
- `POST /api/backup/export` - Export data
- `POST /api/backup/import` - Import data
- `GET /api/backup/history` - Get backup history

## Security Features

- File type validation for uploads
- File size limits (10MB per file)
- Path traversal protection
- Input sanitization
- Rate limiting for API requests
- CORS configuration for network access

## Troubleshooting

### Common Issues

1. **Port already in use**
   - Change the port in the `.env` file or kill the process using the port

2. **Database errors**
   - Delete `server/database.sqlite` and run `npm run init-db` again

3. **File upload fails**
   - Check that the `server/uploads/` directory exists and is writable
   - Verify file size is under 10MB
   - Ensure file type is supported (JPG, PNG, GIF, WebP)

4. **Network access issues**
   - Check firewall settings
   - Ensure devices are on the same network
   - Verify the server IP address is correct

### Development Tips

- Use browser developer tools to check for console errors
- Check server logs for backend errors
- Use the network tab to debug API requests
- Clear browser cache if UI changes don't appear

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Create an issue in the repository

---

**Note**: This application is designed for local network use. For production deployment, consider additional security measures and proper hosting infrastructure. 