/**
 * WebSocketApiClient - WebSocket-based backend communication
 * Replaces the REST-based ApiClient with WebSocket messaging
 */

class WebSocketApiClient {
    constructor() {
        console.log('[WebSocketApiClient] Initialized');
    }

    /**
     * Load file via WebSocket
     */
    async loadFile(panelId, filePath, options = {}) {
        const panel = panelId === 'left' ? 'left' : 'right';
        
        try {
            const response = await window.WebSocketManager.send(panel, 'load_file', {
                panelId,
                filePath,
                options
            });
            
            return response;
        } catch (error) {
            console.error(`[WebSocketApiClient] Load file failed for ${panel}:`, error);
            throw error;
        }
    }

    /**
     * Get file content via WebSocket
     */
    async getContent(panelId, fileId, startLine = 1, endLine = null, maxLines = null) {
        const panel = panelId === 'left' ? 'left' : 'right';
        
        try {
            const response = await window.WebSocketManager.send(panel, 'get_content', {
                fileId,
                startLine,
                endLine,
                maxLines
            });
            
            return response;
        } catch (error) {
            console.error(`[WebSocketApiClient] Get content failed for ${panel}:`, error);
            throw error;
        }
    }

    /**
     * Tell the backend to stop or restart itself (systemd-managed service).
     * Returns a response if the server acknowledges before going down;
     * the underlying connection will then drop (and may reconnect on restart).
     */
    async controlServer(panelId, action) {
        const panel = panelId === 'left' ? 'left' : 'right';

        try {
            const response = await window.WebSocketManager.send(panel, 'server_control', {
                action
            });

            return response;
        } catch (error) {
            console.error(`[WebSocketApiClient] Server control (${action}) failed for ${panel}:`, error);
            throw error;
        }
    }

    /**
     * Apply filters via WebSocket
     */
    async applyFilters(panelId, fileId, filters, options = {}, expression = null) {
        const panel = panelId === 'left' ? 'left' : 'right';

        try {
            const response = await window.WebSocketManager.send(panel, 'filter', {
                panelId,
                fileId,
                filters,
                expression,
                options
            });

            return response;
        } catch (error) {
            console.error(`[WebSocketApiClient] Apply filters failed for ${panel}:`, error);
            throw error;
        }
    }

    /**
     * Start tail operation via WebSocket
     */
    async startTail(panelId, fileId, options = {}) {
        const panel = panelId === 'left' ? 'left' : 'right';
        
        try {
            const response = await window.WebSocketManager.send(panel, 'tail_start', {
                panelId,
                fileId,
                ...options
            });
            
            return response;
        } catch (error) {
            console.error(`[WebSocketApiClient] Start tail failed for ${panel}:`, error);
            throw error;
        }
    }

    /**
     * Poll for tail updates via WebSocket
     */
    async pollTailUpdates(panelId, fileId, tailId) {
        const panel = panelId === 'left' ? 'left' : 'right';
        
        try {
            const response = await window.WebSocketManager.send(panel, 'tail_poll', {
                fileId,
                tailId
            });
            
            return response;
        } catch (error) {
            console.error(`[WebSocketApiClient] Poll tail updates failed for ${panel}:`, error);
            throw error;
        }
    }

    /**
     * Stop tail operation via WebSocket
     */
    async stopTail(panelId, fileId, tailId) {
        const panel = panelId === 'left' ? 'left' : 'right';
        
        try {
            const response = await window.WebSocketManager.send(panel, 'tail_stop', {
                fileId,
                tailId
            });
            
            return response;
        } catch (error) {
            console.error(`[WebSocketApiClient] Stop tail failed for ${panel}:`, error);
            throw error;
        }
    }

    /**
     * Create sequence pattern via WebSocket
     */
    async createSequence(panelId, pattern) {
        const panel = panelId === 'left' ? 'left' : 'right';
        
        try {
            const response = await window.WebSocketManager.send(panel, 'create_sequence', {
                panelId,
                pattern
            });
            
            return response;
        } catch (error) {
            console.error(`[WebSocketApiClient] Create sequence failed for ${panel}:`, error);
            throw error;
        }
    }

    /**
     * Find sequences via WebSocket
     */
    async findSequences(panelId, fileId, patternId, searchOptions = {}, filters = []) {
        const panel = panelId === 'left' ? 'left' : 'right';
        
        try {
            const response = await window.WebSocketManager.send(panel, 'find_sequence', {
                panelId,
                fileId,
                patternId,
                searchOptions,
                filters
            });
            
            return response;
        } catch (error) {
            console.error(`[WebSocketApiClient] Find sequences failed for ${panel}:`, error);
            throw error;
        }
    }

    /**
     * Browse files on the server
     */
    async browseFiles(panelId, path = null, options = {}) {
        const panel = panelId === 'left' ? 'left' : 'right';
        
        try {
            const response = await window.WebSocketManager.send(panel, 'browse_files', {
                path,
                fileTypes: options.fileTypes || ['.log', '.txt', 'syslog'],
                showHidden: options.showHidden || false,
                sortBy: options.sortBy || 'name',
                sortOrder: options.sortOrder || 'asc'
            });
            
            return response;
        } catch (error) {
            console.error(`[WebSocketApiClient] Browse files failed for ${panel}:`, error);
            throw error;
        }
    }

    /**
     * Get the server's OS-appropriate default directory for the file browser
     */
    async getDefaultPath(panelId) {
        const panel = panelId === 'left' ? 'left' : 'right';

        try {
            const response = await window.WebSocketManager.send(panel, 'get_default_path', {});
            return response;
        } catch (error) {
            console.error(`[WebSocketApiClient] Get default path failed for ${panel}:`, error);
            throw error;
        }
    }

    /**
     * Get file type settings
     */
    async getFileTypeSettings(panelId) {
        const panel = panelId === 'left' ? 'left' : 'right';
        
        try {
            const response = await window.WebSocketManager.send(panel, 'get_file_types', {});
            return response;
        } catch (error) {
            console.error(`[WebSocketApiClient] Get file types failed for ${panel}:`, error);
            throw error;
        }
    }

    /**
     * Update file type settings
     */
    async updateFileTypeSettings(panelId, extensions) {
        const panel = panelId === 'left' ? 'left' : 'right';
        
        try {
            const response = await window.WebSocketManager.send(panel, 'update_file_types', {
                extensions
            });
            
            return response;
        } catch (error) {
            console.error(`[WebSocketApiClient] Update file types failed for ${panel}:`, error);
            throw error;
        }
    }

    /**
     * Validate file path
     */
    async validateFilePath(panelId, filePath) {
        const panel = panelId === 'left' ? 'left' : 'right';
        
        try {
            const response = await window.WebSocketManager.send(panel, 'validate_file', {
                filePath
            });
            
            return response;
        } catch (error) {
            console.error(`[WebSocketApiClient] Validate file failed for ${panel}:`, error);
            throw error;
        }
    }

    /**
     * Test connection to backend
     */
    async testConnection(panelId) {
        const panel = panelId === 'left' ? 'left' : 'right';
        
        try {
            const response = await window.WebSocketManager.send(panel, 'ping', {
                timestamp: Date.now()
            });
            
            return response.type === 'pong';
        } catch (error) {
            console.error(`[WebSocketApiClient] Connection test failed for ${panel}:`, error);
            return false;
        }
    }

    /**
     * Get connection status for a panel
     */
    getConnectionStatus(panelId) {
        const panel = panelId === 'left' ? 'left' : 'right';
        const client = window.WebSocketManager.getClient(panel);
        return client ? client.getStatus() : null;
    }

    /**
     * Initialize connections for all panels
     */
    async initializeConnections() {
        try {
            await window.ConnectionStatusManager.initializeConnections();
        } catch (error) {
            console.error('[WebSocketApiClient] Failed to initialize connections:', error);
        }
    }

    /**
     * Backward compatibility methods for existing code
     * These methods maintain the same interface as the old REST API client
     */
    
    async request(endpoint, options = {}) {
        console.warn('[WebSocketApiClient] request() method is deprecated. Use specific WebSocket methods instead.');
        throw new Error('REST API requests not supported. Use WebSocket methods.');
    }

    async loadLogFile(panelId, filePath, options = {}) {
        return this.loadFile(panelId, filePath, options);
    }

    async getLogContent(fileId, startLine, endLine, maxLines) {
        // For backward compatibility, assume left panel if not specified
        return this.getContent('left', fileId, startLine, endLine, maxLines);
    }

    async filterLogs(panelId, fileId, filters, options = {}) {
        return this.applyFilters(panelId, fileId, filters, options);
    }

    async findSequencesInLogs(panelId, fileId, patternId, options = {}) {
        return this.findSequences(panelId, fileId, patternId, options.searchOptions || {}, options.filters || []);
    }
}

// Replace the global ApiClient with WebSocketApiClient
window.ApiClient = new WebSocketApiClient();