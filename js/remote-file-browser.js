/**
 * RemoteFileBrowser - Server-side file browser interface
 */

class RemoteFileBrowser {
    constructor() {
        this.isVisible = false;
        this.currentPath = null;
        this.currentPanel = 'left';
        this.fileTypes = ['.log', '.txt', 'syslog'];
        this.sortBy = 'name';
        this.sortOrder = 'asc';
        this.showHidden = false;
        this.items = [];
        this.loading = false;
        
        this.createFileBrowserModal();
        console.log('[RemoteFileBrowser] Initialized');
    }

    /**
     * Create file browser modal HTML
     */
    createFileBrowserModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay file-browser-modal';
        modal.id = 'fileBrowserModal';
        modal.style.display = 'none';
        
        modal.innerHTML = `
            <div class="modal file-browser-modal-content">
                <div class="modal-header">
                    <div class="modal-title">📁 Open Remote File</div>
                    <button class="modal-close" onclick="window.RemoteFileBrowser.hide()">×</button>
                </div>
                
                <div class="file-browser-toolbar">
                    <div class="path-navigation">
                        <button class="nav-btn" id="upDirectoryBtn" title="Up Directory">↑</button>
                        <input type="text" class="path-input" id="currentPathInput" placeholder="Enter path...">
                        <button class="nav-btn" id="refreshBtn" title="Refresh">🔄</button>
                    </div>
                    
                    <div class="browser-controls">
                        <select id="sortBySelect" title="Sort by">
                            <option value="name">Name</option>
                            <option value="modified">Modified</option>
                            <option value="size">Size</option>
                        </select>
                        
                        <button class="toggle-btn" id="sortOrderBtn" title="Sort order">↑</button>
                        <button class="toggle-btn" id="showHiddenBtn" title="Show hidden files">👁</button>
                        <button class="settings-btn" id="fileTypesBtn" title="File type settings">⚙</button>
                    </div>
                </div>
                
                <div class="file-type-filter">
                    <span>File types:</span>
                    <div class="file-type-tags" id="fileTypeTags"></div>
                    <button class="add-type-btn" id="addFileTypeBtn">+ Add Type</button>
                </div>
                
                <div class="file-list-container">
                    <div class="file-list-header">
                        <div class="file-col-name">Name</div>
                        <div class="file-col-size">Size</div>
                        <div class="file-col-modified">Modified</div>
                    </div>
                    
                    <div class="file-list" id="fileList">
                        <div class="loading-indicator" id="loadingIndicator">
                            <div class="spinner"></div>
                            <span>Loading files...</span>
                        </div>
                    </div>
                </div>
                
                <div class="file-browser-footer">
                    <div class="selected-file-info" id="selectedFileInfo">
                        No file selected
                    </div>
                    
                    <div class="modal-buttons">
                        <button class="modal-btn cancel" onclick="window.RemoteFileBrowser.hide()">Cancel</button>
                        <button class="modal-btn primary" id="openFileBtn" disabled onclick="window.RemoteFileBrowser.openSelectedFile()">Open File</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Navigation
        document.getElementById('upDirectoryBtn').addEventListener('click', () => this.navigateUp());
        document.getElementById('currentPathInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.navigateToPath(e.target.value);
            }
        });
        document.getElementById('refreshBtn').addEventListener('click', () => this.refresh());
        
        // Controls
        document.getElementById('sortBySelect').addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.sortAndDisplayItems();
        });
        
        document.getElementById('sortOrderBtn').addEventListener('click', () => {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            this.updateSortOrderButton();
            this.sortAndDisplayItems();
        });
        
        document.getElementById('showHiddenBtn').addEventListener('click', () => {
            this.showHidden = !this.showHidden;
            this.updateShowHiddenButton();
            this.browse();
        });
        
        document.getElementById('fileTypesBtn').addEventListener('click', () => this.showFileTypeSettings());
        document.getElementById('addFileTypeBtn').addEventListener('click', () => this.addFileType());
    }

    /**
     * Show file browser for a specific panel
     */
    async show(panel = 'left') {
        this.currentPanel = panel;
        this.updateModalTitle();
        
        document.getElementById('fileBrowserModal').style.display = 'flex';
        this.isVisible = true;
        
        // Initialize UI
        this.updateFileTypeDisplay();
        this.updateSortOrderButton();
        this.updateShowHiddenButton();
        
        // Resume browsing where the user last left off, if we have a
        // remembered path. Otherwise ask the backend for an OS-appropriate
        // default (e.g. /var/log on Linux, C:\Windows\Logs on Windows).
        const lastPath = localStorage.getItem('clog_lastBrowsePath');
        if (lastPath) {
            await this.browse(lastPath);
            return;
        }

        let defaultPath = '/var/log';
        try {
            const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), 3000));
            const response = await Promise.race([window.ApiClient.getDefaultPath(this.currentPanel), timeout]);
            if (response.success && response.path) {
                defaultPath = response.path;
            }
        } catch (error) {
            console.warn('[RemoteFileBrowser] Failed to get default path from server, falling back:', error);
        }
        await this.browse(defaultPath);
    }

    /**
     * Hide file browser
     */
    hide() {
        document.getElementById('fileBrowserModal').style.display = 'none';
        this.isVisible = false;
        this.clearSelection();
    }

    /**
     * Update modal title with panel info
     */
    updateModalTitle() {
        const title = document.querySelector('.file-browser-modal .modal-title');
        if (title) {
            title.textContent = `📁 Open Remote File (${this.currentPanel.toUpperCase()} Panel)`;
        }
    }

    /**
     * Browse files at specified path
     */
    async browse(path = null) {
        if (this.loading) return;
        
        this.setLoading(true);
        
        try {
            const response = await window.WebSocketManager.send(this.currentPanel, 'browse_files', {
                path: path,
                fileTypes: this.fileTypes,
                showHidden: this.showHidden,
                sortBy: this.sortBy,
                sortOrder: this.sortOrder
            });
            
            if (response.success) {
                this.currentPath = response.path;
                this.items = response.items;
                this.displayItems();
                this.updatePathInput();

                // Remember this folder so the browser reopens here next time
                if (this.currentPath) {
                    localStorage.setItem('clog_lastBrowsePath', this.currentPath);
                }
            } else {
                this.showError(response.error || 'Failed to browse directory');
            }
            
        } catch (error) {
            console.error('File browse error:', error);
            this.showError('Failed to connect to server: ' + error.message);
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Display file items in the list
     */
    displayItems() {
        const fileList = document.getElementById('fileList');
        const loadingIndicator = document.getElementById('loadingIndicator');
        
        // Clear existing items
        fileList.innerHTML = '';
        
        if (this.items.length === 0) {
            fileList.innerHTML = '<div class="empty-message">No files found</div>';
            return;
        }
        
        this.items.forEach(item => {
            const fileItem = this.createFileItemElement(item);
            fileList.appendChild(fileItem);
        });
    }

    /**
     * Create file item element
     */
    createFileItemElement(item) {
        const fileItem = document.createElement('div');
        fileItem.className = `file-item ${item.isDirectory ? 'directory' : 'file'}`;
        fileItem.dataset.path = item.path;
        fileItem.dataset.isDirectory = item.isDirectory;
        
        const icon = item.isDirectory ? '📁' : this.getFileIcon(item.extension);
        const size = item.isDirectory ? '' : this.formatFileSize(item.size);
        const modified = item.modified ? new Date(item.modified).toLocaleString() : '';
        
        fileItem.innerHTML = `
            <div class="file-col-name">
                <span class="file-icon">${icon}</span>
                <span class="file-name">${item.name}</span>
            </div>
            <div class="file-col-size">${size}</div>
            <div class="file-col-modified">${modified}</div>
        `;
        
        // Add click handler
        fileItem.addEventListener('click', () => this.selectItem(item, fileItem));
        fileItem.addEventListener('dblclick', () => this.handleDoubleClick(item));
        
        return fileItem;
    }

    /**
     * Get appropriate icon for file type
     */
    getFileIcon(extension) {
        if (!extension) return '📄';
        
        const ext = extension.toLowerCase();
        if (['.log', '.txt'].includes(ext)) return '📝';
        if (ext.includes('syslog')) return '🖥️';
        if (['.out', '.err'].includes(ext)) return '⚠️';
        return '📄';
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (!bytes) return '';
        
        const sizes = ['B', 'KB', 'MB', 'GB'];
        let i = 0;
        while (bytes >= 1024 && i < sizes.length - 1) {
            bytes /= 1024;
            i++;
        }
        
        return `${bytes.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
    }

    /**
     * Select a file item
     */
    selectItem(item, element) {
        // Clear previous selection
        document.querySelectorAll('.file-item.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Select current item
        element.classList.add('selected');
        this.selectedItem = item;
        
        // Update UI
        this.updateSelectedFileInfo();
        this.updateOpenButton();
    }

    /**
     * Handle double-click on item
     */
    async handleDoubleClick(item) {
        if (item.isDirectory) {
            await this.browse(item.path);
        } else {
            this.openSelectedFile();
        }
    }

    /**
     * Navigate up one directory
     */
    async navigateUp() {
        if (this.currentPath) {
            const parentPath = this.currentPath.split(/[\/\\]/).slice(0, -1).join('/');
            await this.browse(parentPath || null);
        }
    }

    /**
     * Navigate to specific path
     */
    async navigateToPath(path) {
        if (path.trim()) {
            await this.browse(path.trim());
        }
    }

    /**
     * Refresh current directory
     */
    async refresh() {
        await this.browse(this.currentPath);
    }

    /**
     * Update path input field
     */
    updatePathInput() {
        const pathInput = document.getElementById('currentPathInput');
        pathInput.value = this.currentPath || '';
    }

    /**
     * Update selected file info display
     */
    updateSelectedFileInfo() {
        const info = document.getElementById('selectedFileInfo');
        
        if (this.selectedItem && !this.selectedItem.isDirectory) {
            const size = this.formatFileSize(this.selectedItem.size);
            const modified = this.selectedItem.modified ? 
                new Date(this.selectedItem.modified).toLocaleString() : 'Unknown';
            
            info.innerHTML = `
                <strong>${this.selectedItem.name}</strong><br>
                Size: ${size} | Modified: ${modified}
            `;
        } else {
            info.textContent = 'No file selected';
        }
    }

    /**
     * Update open button state
     */
    updateOpenButton() {
        const openBtn = document.getElementById('openFileBtn');
        openBtn.disabled = !this.selectedItem || this.selectedItem.isDirectory;
    }

    /**
     * Open the selected file
     */
    async openSelectedFile() {
        if (!this.selectedItem || this.selectedItem.isDirectory) {
            return;
        }
        
        // Store filename before processing (selectedItem might get cleared)
        const fileName = this.selectedItem.name;
        
        try {
            // Load the file using the existing WebSocket API
            const response = await window.ApiClient.loadFile(
                this.currentPanel, 
                this.selectedItem.path, 
                {}
            );
            
            if (response.success) {
                // Update UI with the loaded file and fetch content
                await this.updatePanelWithLoadedFile(response);
                this.hide();
                this.showSuccess(`File "${fileName}" loaded successfully`);
            } else {
                this.showError('Failed to load file: ' + (response.error || 'Unknown error'));
            }
            
        } catch (error) {
            console.error('File open error:', error);
            this.showError('Failed to open file: ' + error.message);
        }
    }

    /**
     * Update panel UI with loaded file - UPDATED TO FETCH CONTENT
     */
    async updatePanelWithLoadedFile(response) {
        const pathLabelId = `${this.currentPanel}PathLabel`;
        const pathLabel = document.getElementById(pathLabelId);
        
        if (pathLabel) {
            pathLabel.textContent = response.metadata.fileName;
            pathLabel.title = response.metadata.filePath;
        }
        
        try {
            // Show loading feedback
            this.showInfo('Loading file content...');
            
            // Fetch the actual file content using the fileId
            console.log(`[RemoteFileBrowser] Fetching content for fileId: ${response.fileId}`);
            const contentResponse = await window.ApiClient.getContent(
                this.currentPanel,
                response.fileId,
                1,              // startLine
                1000,           // endLine (get first 1000 lines)
                1000            // maxLines
            );
            
            if (contentResponse.success && contentResponse.content) {
                // Convert content to string based on server response format
                let content;
                if (contentResponse.content && contentResponse.content.lines) {
                    // Server returns {lines: Array, totalLines: number, ...}
                    const lines = contentResponse.content.lines;
                    // Check if lines already have newlines
                    const firstLine = lines[0] || '';
                    if (firstLine.endsWith('\n') || firstLine.endsWith('\r\n')) {
                        // Lines already have newlines, just concatenate
                        content = lines.join('');
                    } else {
                        // Lines don't have newlines, add them
                        content = lines.join('\n');
                    }
                } else if (Array.isArray(contentResponse.content)) {
                    // Legacy format: direct array
                    content = contentResponse.content.join('\n');
                } else {
                    // Fallback: treat as string
                    content = String(contentResponse.content);
                }
                
                // Feed the content to CodeMirror via UIManager
                if (window.CLogApp && window.CLogApp.modules && window.CLogApp.modules.uiManager) {
                    window.CLogApp.modules.uiManager.setLogContent(
                        this.currentPanel,
                        content,
                        response.metadata.fileName,
                        response.fileId
                    );
                    
                    console.log(`[RemoteFileBrowser] Content loaded into ${this.currentPanel} panel: ${content.split('\n').length} lines`);

                    if (window.LineRangeManager) {
                        window.LineRangeManager.setFileInfo(
                            this.currentPanel,
                            response.fileId,
                            contentResponse.content.totalLines,
                            contentResponse.content.range
                        );
                    }
                } else {
                    console.warn('[RemoteFileBrowser] UIManager not available for content display');
                }
            } else {
                console.error('[RemoteFileBrowser] Failed to fetch file content:', contentResponse.error);
                this.showError('Failed to load file content: ' + (contentResponse.error || 'Unknown error'));
            }
            
        } catch (error) {
            console.error('[RemoteFileBrowser] Error fetching file content:', error);
            const errorMessage = error && error.message ? error.message : String(error);
            this.showError('Error loading file content: ' + errorMessage);
        }
        
        // Emit event for other components
        window.CLogApp.utils.emit('fileLoaded', {
            panel: this.currentPanel,
            fileId: response.fileId,
            metadata: response.metadata
        });
    }

    /**
     * Set loading state
     */
    setLoading(loading) {
        this.loading = loading;
        const loadingIndicator = document.getElementById('loadingIndicator');
        const fileList = document.getElementById('fileList');
        
        if (loading) {
            fileList.innerHTML = '<div class="loading-indicator"><div class="spinner"></div><span>Loading files...</span></div>';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('[RemoteFileBrowser] Error:', message);
        alert('Error: ' + message);
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        console.log('[RemoteFileBrowser] Success:', message);
        // Could be enhanced with toast notifications
    }

    /**
     * Show info message
     */
    showInfo(message) {
        console.log('[RemoteFileBrowser] Info:', message);
        // Could be enhanced with toast notifications
    }

    /**
     * Clear current selection
     */
    clearSelection() {
        this.selectedItem = null;
        this.updateSelectedFileInfo();
        this.updateOpenButton();
    }

    /**
     * Sort and display current items
     */
    sortAndDisplayItems() {
        // Items are already sorted by server, but we can re-sort locally if needed
        this.displayItems();
    }

    /**
     * Update sort order button
     */
    updateSortOrderButton() {
        const btn = document.getElementById('sortOrderBtn');
        btn.textContent = this.sortOrder === 'asc' ? '↑' : '↓';
        btn.title = `Sort ${this.sortOrder === 'asc' ? 'ascending' : 'descending'}`;
    }

    /**
     * Update show hidden button
     */
    updateShowHiddenButton() {
        const btn = document.getElementById('showHiddenBtn');
        btn.classList.toggle('active', this.showHidden);
        btn.title = this.showHidden ? 'Hide hidden files' : 'Show hidden files';
    }

    /**
     * Show file type settings
     */
    showFileTypeSettings() {
        const newTypes = prompt(
            'Enter file types to include (comma-separated):\n\n' +
            'Examples: .log, .txt, syslog, .out, .err\n\n' +
            'Current types: ' + this.fileTypes.join(', '),
            this.fileTypes.join(', ')
        );
        
        if (newTypes !== null) {
            this.fileTypes = newTypes.split(',').map(t => t.trim()).filter(t => t);
            this.updateFileTypeDisplay();
            this.browse(this.currentPath);
        }
    }

    /**
     * Add new file type
     */
    addFileType() {
        const newType = prompt('Enter file type (e.g., .log, syslog, .custom):');
        if (newType && newType.trim()) {
            this.fileTypes.push(newType.trim());
            this.updateFileTypeDisplay();
            this.browse(this.currentPath);
        }
    }

    /**
     * Update file type display
     */
    updateFileTypeDisplay() {
        const container = document.getElementById('fileTypeTags');
        container.innerHTML = '';
        
        this.fileTypes.forEach(type => {
            const tag = document.createElement('span');
            tag.className = 'file-type-tag';
            tag.innerHTML = `${type} <button onclick="window.RemoteFileBrowser.removeFileType('${type}')">×</button>`;
            container.appendChild(tag);
        });
    }

    /**
     * Remove file type
     */
    removeFileType(type) {
        this.fileTypes = this.fileTypes.filter(t => t !== type);
        this.updateFileTypeDisplay();
        this.browse(this.currentPath);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.RemoteFileBrowser = new RemoteFileBrowser();
});