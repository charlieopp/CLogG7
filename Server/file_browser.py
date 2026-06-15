# file_browser.py
from fastapi import HTTPException
from pydantic import BaseModel
from typing import List, Optional, Literal
import os
from datetime import datetime
from pathlib import Path
import fnmatch

class FileBrowserRequest(BaseModel):
    path: Optional[str] = None
    fileTypes: Optional[List[str]] = ['.log', '.txt', 'syslog']
    showHidden: Optional[bool] = False
    sortBy: Optional[Literal['name', 'size', 'modified']] = 'name'
    sortOrder: Optional[Literal['asc', 'desc']] = 'asc'

class FileItem(BaseModel):
    name: str
    path: str
    isDirectory: bool
    size: Optional[int] = None
    modified: Optional[str] = None
    extension: Optional[str] = None

class FileBrowserResponse(BaseModel):
    success: bool
    path: str
    parentPath: Optional[str] = None
    items: List[FileItem]
    error: Optional[str] = None

# Global settings for file browsing
file_browser_settings = {
    'allowed_extensions': ['.log', '.txt', '.syslog', '.out', '.err'],
    'custom_extensions': [],
    'max_items': 1000,
    'default_paths': []
}

def get_default_browse_paths():
    """Get default paths to show in file browser"""
    paths = []
    
    # Add common log directories based on OS
    if os.name == 'nt':  # Windows
        paths.extend([
            os.path.expanduser('~\\Desktop'),
            os.path.expanduser('~\\Documents'),
            'C:\\logs',
            'C:\\temp',
            os.path.dirname(os.path.abspath(__file__))  # Server directory
        ])
    else:  # Unix/Linux
        paths.extend([
            os.path.expanduser('~/'),
            '/var/log',
            '/tmp',
            '/logs',
            os.path.dirname(os.path.abspath(__file__))  # Server directory
        ])
    
    # Filter to only existing paths
    return [p for p in paths if os.path.exists(p)]

def get_default_log_directory():
    """Get the directory the file browser should open in by default, based on the server's OS"""
    if os.name == 'nt':  # Windows
        candidates = [
            'C:\\Windows\\Logs',
            'C:\\logs',
            os.path.expanduser('~')
        ]
    else:  # Unix/Linux
        candidates = [
            '/var/log',
            os.path.expanduser('~')
        ]

    for path in candidates:
        if os.path.exists(path):
            return path

    return os.path.expanduser('~')

def is_allowed_file_type(filename: str, allowed_types: List[str]) -> bool:
    """Check if file type is allowed based on extensions"""
    if not allowed_types:
        return True
    
    filename_lower = filename.lower()
    
    for file_type in allowed_types:
        if file_type.startswith('.'):
            # Extension match
            if filename_lower.endswith(file_type.lower()):
                return True
        else:
            # Pattern match (e.g., 'syslog')
            if fnmatch.fnmatch(filename_lower, f"*{file_type.lower()}*"):
                return True
    
    return False

def get_file_info(file_path: str) -> FileItem:
    """Get file information for a given path"""
    try:
        stat_info = os.stat(file_path)
        is_dir = os.path.isdir(file_path)
        name = os.path.basename(file_path)
        
        return FileItem(
            name=name,
            path=file_path,
            isDirectory=is_dir,
            size=None if is_dir else stat_info.st_size,
            modified=datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
            extension=Path(file_path).suffix if not is_dir else None
        )
    except (OSError, PermissionError) as e:
        # Return minimal info if we can't read file stats
        return FileItem(
            name=os.path.basename(file_path),
            path=file_path,
            isDirectory=os.path.isdir(file_path),
            size=None,
            modified=None,
            extension=Path(file_path).suffix if not os.path.isdir(file_path) else None
        )

def sort_file_items(items: List[FileItem], sort_by: str, sort_order: str) -> List[FileItem]:
    """Sort file items by specified criteria"""
    reverse = sort_order == 'desc'
    
    # Always put directories first
    directories = [item for item in items if item.isDirectory]
    files = [item for item in items if not item.isDirectory]
    
    if sort_by == 'name':
        directories.sort(key=lambda x: x.name.lower(), reverse=reverse)
        files.sort(key=lambda x: x.name.lower(), reverse=reverse)
    elif sort_by == 'size':
        files.sort(key=lambda x: x.size or 0, reverse=reverse)
        directories.sort(key=lambda x: x.name.lower(), reverse=reverse)
    elif sort_by == 'modified':
        directories.sort(key=lambda x: x.modified or '', reverse=reverse)
        files.sort(key=lambda x: x.modified or '', reverse=reverse)
    
    return directories + files

async def browse_files(req: FileBrowserRequest) -> FileBrowserResponse:
    """Browse files and directories on the server"""
    try:
        # Determine the path to browse
        if req.path is None:
            # Return default paths
            default_paths = get_default_browse_paths()
            items = []
            
            for path in default_paths:
                try:
                    items.append(get_file_info(path))
                except (OSError, PermissionError):
                    continue
            
            return FileBrowserResponse(
                success=True,
                path="",
                parentPath=None,
                items=sort_file_items(items, req.sortBy, req.sortOrder)
            )
        
        browse_path = req.path
        
        # Security check - ensure path exists and is accessible
        if not os.path.exists(browse_path):
            raise HTTPException(status_code=404, detail=f"Path not found: {browse_path}")
        
        if not os.access(browse_path, os.R_OK):
            raise HTTPException(status_code=403, detail=f"Access denied: {browse_path}")
        
        # Get parent path
        parent_path = os.path.dirname(browse_path) if browse_path != os.path.dirname(browse_path) else None
        
        # List directory contents
        items = []
        try:
            for item_name in os.listdir(browse_path):
                # Skip hidden files unless requested
                if not req.showHidden and item_name.startswith('.'):
                    continue
                
                item_path = os.path.join(browse_path, item_name)
                
                try:
                    # Get file info
                    file_info = get_file_info(item_path)
                    
                    # Filter files by type (directories always included)
                    if file_info.isDirectory or is_allowed_file_type(item_name, req.fileTypes):
                        items.append(file_info)
                        
                        # Limit number of items for performance
                        if len(items) >= file_browser_settings['max_items']:
                            break
                            
                except (OSError, PermissionError):
                    # Skip files we can't access
                    continue
        
        except (OSError, PermissionError) as e:
            raise HTTPException(status_code=403, detail=f"Cannot read directory: {str(e)}")
        
        # Sort items
        sorted_items = sort_file_items(items, req.sortBy, req.sortOrder)
        
        return FileBrowserResponse(
            success=True,
            path=browse_path,
            parentPath=parent_path,
            items=sorted_items
        )
        
    except HTTPException:
        raise
    except Exception as e:
        return FileBrowserResponse(
            success=False,
            path=req.path or "",
            parentPath=None,
            items=[],
            error=str(e)
        )

async def get_file_type_settings() -> dict:
    """Get current file type filter settings"""
    return {
        'allowedExtensions': file_browser_settings['allowed_extensions'],
        'customExtensions': file_browser_settings['custom_extensions'],
        'maxItems': file_browser_settings['max_items']
    }

async def update_file_type_settings(extensions: List[str]) -> dict:
    """Update allowed file extensions"""
    file_browser_settings['custom_extensions'] = extensions
    all_extensions = file_browser_settings['allowed_extensions'] + extensions
    return {
        'success': True,
        'allowedExtensions': file_browser_settings['allowed_extensions'],
        'customExtensions': file_browser_settings['custom_extensions'],
        'allExtensions': all_extensions
    }

async def validate_file_path(file_path: str) -> dict:
    """Validate that a file path exists and is readable"""
    try:
        if not os.path.exists(file_path):
            return {'valid': False, 'error': 'File does not exist'}
        
        if not os.path.isfile(file_path):
            return {'valid': False, 'error': 'Path is not a file'}
        
        if not os.access(file_path, os.R_OK):
            return {'valid': False, 'error': 'File is not readable'}
        
        # Get file info
        file_info = get_file_info(file_path)
        
        return {
            'valid': True,
            'fileInfo': {
                'name': file_info.name,
                'path': file_info.path,
                'size': file_info.size,
                'modified': file_info.modified,
                'extension': file_info.extension
            }
        }
        
    except Exception as e:
        return {'valid': False, 'error': str(e)}