# Remote File Browser

The Remote File Browser allows users to browse and open files directly from the server filesystem, replacing local file selection with server-side file management.

## Features

### 🗂️ Server-Side File Browsing
- Browse directories on the server filesystem
- Navigate up/down directory hierarchy
- Path input for direct navigation
- Refresh current directory

### 📂 File Type Filtering
- **Default supported types**: `.log`, `.txt`, `syslog`
- **Customizable extensions**: Add your own file types
- **Pattern matching**: Supports both extensions (`.log`) and patterns (`syslog`)
- **Visual filter tags**: See active filters with easy removal

### 🔍 Sorting and Display
- **Sort options**: Name, Size, Modified date
- **Sort order**: Ascending/Descending
- **Hidden files**: Toggle visibility of hidden files
- **File metadata**: Size, modification date, file type icons

### 🎨 User Interface
- **Dual-panel support**: Separate file browsers for left/right panels
- **Responsive design**: Adapts to different screen sizes
- **File icons**: Different icons for different file types
- **Selection feedback**: Visual selection and file info display

## Usage

### Opening Files
1. Click the **"Open"** button in either panel
2. Browse server directories using the file browser
3. Double-click directories to navigate
4. Single-click files to select
5. Click **"Open File"** to load the selected file

### Navigation
- **Up Directory** (↑): Navigate to parent directory
- **Path Input**: Type path directly and press Enter
- **Refresh** (🔄): Reload current directory
- **Double-click**: Navigate into directories or open files

### File Type Management
- **View current types**: See active filter tags
- **Add types**: Click "+ Add Type" button
- **Remove types**: Click "×" on any filter tag
- **Settings**: Use ⚙ button for advanced options

### Sorting
- **Sort by**: Select Name, Size, or Modified from dropdown
- **Sort order**: Click ↑/↓ button to toggle ascending/descending
- **Directories first**: Directories always appear before files

## Server Configuration

### Supported File Types
Default configuration includes:
```python
allowed_extensions = ['.log', '.txt', '.syslog', '.out', '.err']
```

### Security Features
- **Path validation**: Ensures valid and accessible paths
- **Permission checking**: Verifies read access before listing
- **Hidden file protection**: Option to show/hide system files
- **Item limit**: Prevents overwhelming responses (max 1000 items)

### Default Browse Paths
The system provides platform-appropriate default paths:

**Windows:**
- Desktop
- Documents  
- C:\logs
- C:\temp
- Server directory

**Unix/Linux:**
- Home directory
- /var/log
- /tmp
- /logs
- Server directory

## API Endpoints

### WebSocket Messages

#### Browse Files
```javascript
{
  "type": "browse_files",
  "path": "/var/log",           // Optional: directory path
  "fileTypes": [".log", ".txt"], // Optional: file type filters
  "showHidden": false,          // Optional: show hidden files
  "sortBy": "name",            // Optional: name|size|modified
  "sortOrder": "asc"           // Optional: asc|desc
}
```

#### Response
```javascript
{
  "type": "browse_files_result",
  "success": true,
  "path": "/var/log",
  "parentPath": "/var",
  "items": [
    {
      "name": "system.log",
      "path": "/var/log/system.log",
      "isDirectory": false,
      "size": 1024000,
      "modified": "2024-01-15T10:30:00.000Z",
      "extension": ".log"
    }
  ]
}
```

#### File Type Settings
```javascript
// Get current settings
{"type": "get_file_types"}

// Update settings  
{
  "type": "update_file_types",
  "extensions": [".log", ".txt", ".custom"]
}

// Validate file path
{
  "type": "validate_file", 
  "filePath": "/path/to/file.log"
}
```

## Integration

### Frontend Integration
```javascript
// Open file browser for left panel
window.RemoteFileBrowser.show('left');

// Open file browser for right panel  
window.RemoteFileBrowser.show('right');

// Listen for file selection events
window.CLogApp.utils.on('fileLoaded', (event) => {
  console.log('File loaded:', event.detail);
});
```

### Backend Integration
The file browser integrates with existing file management:
- Uses same `load_file` WebSocket message for file loading
- Maintains compatibility with existing file handling
- Preserves file metadata and caching systems

## Customization

### File Type Extensions
Add custom file types through the UI or via API:
```javascript
// Add custom extensions
await window.ApiClient.updateFileTypeSettings('left', [
  '.log', '.txt', '.custom', '.trace'
]);
```

### Styling
File browser styles are defined in `styles.css` under:
- `.file-browser-modal-content`
- `.file-list-container` 
- `.file-item`
- `.file-type-tag`

## Error Handling

The file browser includes comprehensive error handling:
- **Connection errors**: Graceful fallback when server unavailable
- **Permission errors**: Clear messaging for access denied
- **Path errors**: Validation for invalid or non-existent paths
- **Loading states**: Visual feedback during operations

## Performance

### Optimizations
- **Server-side sorting**: Reduces client-side processing
- **Item limits**: Prevents overwhelming large directories
- **Caching**: WebSocket connection reuse for multiple operations
- **Lazy loading**: Only loads directories when accessed

### Scalability
- **Pagination**: Ready for large directory support
- **Filtering**: Server-side file type filtering reduces data transfer
- **Compression**: WebSocket message compression for large file lists

## Backwards Compatibility

The remote file browser maintains compatibility with existing systems:
- **Same file loading API**: Uses existing `load_file` messages
- **Panel integration**: Works with left/right panel architecture  
- **Settings integration**: Leverages existing settings management
- **Event system**: Emits standard file loading events