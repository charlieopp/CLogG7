/**
 * ConnectionStatusManager - Manages WebSocket connection status UI indicators
 */

class ConnectionStatusManager {
    constructor() {
        this.statusElements = {
            left: null,
            right: null
        };
        this.currentStatus = {
            left: 'disconnected',
            right: 'disconnected'
        };
        
        this.initializeStatusElements();
        this.setupWebSocketListeners();
        
        console.log('[ConnectionStatusManager] Initialized');
    }

    /**
     * Initialize status UI elements
     */
    initializeStatusElements() {
        // Left panel status (always exists)
        this.statusElements.left = document.getElementById('leftConnectionStatus');
        
        // Right panel status (may not exist yet)
        this.statusElements.right = document.getElementById('rightConnectionStatus');
        
        // Set up click handlers for status elements
        if (this.statusElements.left) {
            this.statusElements.left.addEventListener('click', () => {
                this.showConnectionDetails('left');
            });
        }
        
        // Monitor for right panel creation
        this.monitorRightPanel();
    }

    /**
     * Monitor for right panel creation and setup its status element
     */
    monitorRightPanel() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE && node.id === 'rightPanel') {
                        this.statusElements.right = document.getElementById('rightConnectionStatus');
                        if (this.statusElements.right) {
                            this.statusElements.right.addEventListener('click', () => {
                                this.showConnectionDetails('right');
                            });
                            this.updateStatusDisplay('right', this.currentStatus.right);
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Setup WebSocket event listeners
     */
    setupWebSocketListeners() {
        // Listen for status changes from WebSocketManager
        if (window.WebSocketManager) {
            window.WebSocketManager.onStatusChange((status) => {
                this.updateStatus(status.panel, status.status);
            });
        }
    }

    /**
     * Update connection status for a panel
     */
    updateStatus(panel, status, details = null) {
        this.currentStatus[panel] = status;
        this.updateStatusDisplay(panel, status, details);
        
        console.log(`[ConnectionStatusManager] ${panel} panel status: ${status}`);
    }

    /**
     * Update the visual status display
     */
    updateStatusDisplay(panel, status, details = null) {
        const element = this.statusElements[panel];
        if (!element) return;

        const indicator = element.querySelector('.status-indicator');
        const text = element.querySelector('.status-text');
        
        if (!indicator || !text) return;

        // Remove all status classes
        indicator.className = 'status-indicator';
        element.className = 'connection-status';
        
        // Add current status class
        indicator.classList.add(status);
        element.classList.add(status);
        
        // Update text and tooltip
        let statusText = 'Backend';
        let tooltipText = 'Backend Connection Status';
        
        switch (status) {
            case 'connected':
                statusText = 'Connected';
                tooltipText = 'Backend connected and healthy';
                break;
            case 'connecting':
                statusText = 'Connecting...';
                tooltipText = 'Connecting to backend...';
                break;
            case 'disconnected':
                statusText = 'Disconnected';
                tooltipText = 'Backend disconnected';
                break;
            case 'error':
                statusText = 'Error';
                tooltipText = 'Backend connection error - click for details';
                break;
            case 'disabled':
                statusText = 'Disabled';
                tooltipText = 'Backend disabled in settings';
                break;
        }
        
        text.textContent = statusText;
        element.title = tooltipText;
        
        if (details) {
            element.title += `\n${details}`;
        }
    }

    /**
     * Show detailed connection information
     */
    showConnectionDetails(panel) {
        const client = window.WebSocketManager.getClient(panel);
        const status = client ? client.getStatus() : null;
        const config = window.SettingsManager.getBackendConfig(panel);
        
        let message = `${panel.toUpperCase()} Panel Backend Status\n\n`;
        
        if (config) {
            message += `URL: ${config.url}\n`;
            message += `Name: ${config.name}\n`;
            message += `Enabled: ${config.enabled ? 'Yes' : 'No'}\n\n`;
        }
        
        if (status) {
            message += `Status: ${status.status}\n`;
            message += `Connected: ${status.isConnected ? 'Yes' : 'No'}\n`;
            message += `Reconnect Attempts: ${status.reconnectAttempts}\n`;
            message += `Queued Messages: ${status.queuedMessages}\n`;
            message += `Pending Requests: ${status.pendingRequests}\n`;
        } else {
            message += 'No connection client available\n';
        }
        
        // For now, use alert. In the future, could create a proper modal
        alert(message);
    }

    /**
     * Manually trigger connection test
     */
    async testConnection(panel) {
        try {
            this.updateStatus(panel, 'connecting');
            
            const client = window.WebSocketManager.getClient(panel);
            if (!client) {
                throw new Error('No client configured');
            }
            
            await client.connect();
            
            // Send a ping to test the connection
            console.log(`[ConnectionStatusManager] Sending ping to ${panel}...`);
            const pingResult = await client.send('ping', { timestamp: Date.now() });
            console.log(`[ConnectionStatusManager] Ping result for ${panel}:`, pingResult);
            
            this.updateStatus(panel, 'connected');
            return true;
            
        } catch (error) {
            console.error(`[ConnectionStatusManager] Test connection failed for ${panel}:`, error);
            this.updateStatus(panel, 'error', error.message);
            return false;
        }
    }

    /**
     * Get current status for all panels
     */
    getStatus() {
        return { ...this.currentStatus };
    }

    /**
     * Initialize connections for all enabled panels
     */
    async initializeConnections() {
        const promises = [];
        
        for (const panel of ['left', 'right']) {
            const config = window.SettingsManager.getBackendConfig(panel);
            if (config && config.enabled) {
                promises.push(this.testConnection(panel));
            } else {
                this.updateStatus(panel, 'disabled');
            }
        }
        
        await Promise.allSettled(promises);
    }

    /**
     * Refresh connections (disconnect and reconnect)
     */
    async refreshConnections() {
        console.log('[ConnectionStatusManager] Refreshing all connections...');
        
        // Disconnect all
        window.WebSocketManager.disconnectAll();
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reconnect
        await this.initializeConnections();
    }

    /**
     * Update settings and refresh connections
     */
    async updateSettings() {
        console.log('[ConnectionStatusManager] Settings updated, refreshing connections...');
        await this.refreshConnections();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.ConnectionStatusManager = new ConnectionStatusManager();
});