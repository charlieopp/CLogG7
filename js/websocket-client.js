/**
 * WebSocketClient - Panel-specific WebSocket Communication Module
 * Handles WebSocket connections per panel with health monitoring and auto-reconnection
 */

class WebSocketClient {
    constructor(panel, url = null) {
        this.panel = panel;
        this.url = url || window.SettingsManager.getBackendUrl(panel);
        this.ws = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.messageQueue = [];
        this.pendingRequests = new Map();
        this.requestId = 0;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.healthCheckInterval = null;
        this.lastPongTime = 0;
        this.connectionStatus = 'disconnected'; // disconnected, connecting, connected, error
        
        // Get settings
        const uiConfig = window.SettingsManager.getUIConfig();
        this.autoReconnect = uiConfig.autoReconnect;
        this.reconnectInterval = uiConfig.reconnectInterval;
        this.connectionTimeout = uiConfig.connectionTimeout;
        this.healthCheckIntervalMs = uiConfig.healthCheckInterval;
        
        this.eventHandlers = {
            statusChange: [],
            message: [],
            error: []
        };

        console.log(`[WebSocketClient:${this.panel}] Initialized with URL: ${this.url}`);
    }

    /**
     * Connect to WebSocket server
     */
    async connect() {
        if (this.isConnecting || this.isConnected) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            this.isConnecting = true;
            this.setStatus('connecting');
            
            try {
                this.ws = new WebSocket(this.url);
                
                const connectionTimeout = setTimeout(() => {
                    if (!this.isConnected) {
                        this.ws.close();
                        this.setStatus('error');
                        reject(new Error('Connection timeout'));
                    }
                }, this.connectionTimeout);

                this.ws.onopen = () => {
                    clearTimeout(connectionTimeout);
                    this.isConnected = true;
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;
                    this.setStatus('connected');
                    this.processMessageQueue();
                    this.startHealthCheck();
                    console.log(`[WebSocketClient:${this.panel}] Connected`);
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.handleMessage(data);
                    } catch (error) {
                        console.error(`[WebSocketClient:${this.panel}] Failed to parse message:`, error);
                    }
                };

                this.ws.onclose = (event) => {
                    this.handleDisconnection(event);
                    if (this.isConnecting) {
                        reject(new Error(`Connection failed: ${event.reason}`));
                    }
                };

                this.ws.onerror = (error) => {
                    console.error(`[WebSocketClient:${this.panel}] WebSocket error:`, error);
                    this.emit('error', error);
                    if (this.isConnecting) {
                        reject(error);
                    }
                };

            } catch (error) {
                this.isConnecting = false;
                this.setStatus('error');
                reject(error);
            }
        });
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        this.autoReconnect = false;
        this.stopHealthCheck();
        if (this.ws) {
            this.ws.close();
        }
    }

    /**
     * Send message to server
     */
    async send(type, data = {}) {
        const message = {
            type,
            requestId: ++this.requestId,
            ...data
        };

        if (!this.isConnected) {
            if (this.autoReconnect) {
                this.messageQueue.push(message);
                await this.connect();
                return this.waitForResponse(message.requestId);
            } else {
                throw new Error(`WebSocket not connected for panel ${this.panel}`);
            }
        }

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(message.requestId, { resolve, reject, timestamp: Date.now(), type });
            
            try {
                this.ws.send(JSON.stringify(message));
            } catch (error) {
                this.pendingRequests.delete(message.requestId);
                reject(error);
            }

            // Set timeout for request (shorter for ping)
            const timeout = type === 'ping' ? 5000 : 30000;
            setTimeout(() => {
                if (this.pendingRequests.has(message.requestId)) {
                    this.pendingRequests.delete(message.requestId);
                    reject(new Error(`Request timeout for ${type}`));
                }
            }, timeout);
        });
    }

    /**
     * Handle incoming messages
     */
    handleMessage(data) {
        // Handle pong responses for health check
        if (data.type === 'pong') {
            this.lastPongTime = Date.now();
            
            // Handle pong as a response to ping request
            if (data.requestId && this.pendingRequests.has(data.requestId)) {
                const request = this.pendingRequests.get(data.requestId);
                this.pendingRequests.delete(data.requestId);
                request.resolve(data);
            }
            return;
        }

        // Handle request responses
        if (data.requestId && this.pendingRequests.has(data.requestId)) {
            const request = this.pendingRequests.get(data.requestId);
            this.pendingRequests.delete(data.requestId);
            
            if (data.type === 'error') {
                request.reject(new Error(data.message || 'Server error'));
            } else {
                request.resolve(data);
            }
            return;
        }

        // Handle responses without requestId by matching request type to response type
        if (!data.requestId && this.pendingRequests.size > 0) {
            const responseTypeMap = {
                'load_file_result': 'load_file',
                'content_result': 'get_content',
                'get_content_result': 'get_content',
                'filter_result': 'filter',
                'sequence_result': 'create_sequence',
                'browse_result': 'browse_files'
            };
            
            const requestType = responseTypeMap[data.type];
            
            if (requestType) {
                // Find the oldest pending request of matching type
                for (const [reqId, request] of this.pendingRequests) {
                    if (request.type === requestType) {
                        this.pendingRequests.delete(reqId);
                        if (data.type === 'error') {
                            request.reject(new Error(data.message || 'Server error'));
                        } else {
                            request.resolve(data);
                        }
                        return;
                    }
                }
            } else if (data.type === 'error' && this.pendingRequests.size > 0) {
                // For error responses without clear type mapping, reject the oldest pending request
                const [oldestReqId, oldestRequest] = this.pendingRequests.entries().next().value;
                this.pendingRequests.delete(oldestReqId);
                oldestRequest.reject(new Error(data.message || 'Server error'));
                return;
            }
        }

        // Emit message for other handlers
        this.emit('message', data);
    }

    /**
     * Handle disconnection
     */
    handleDisconnection(event) {
        console.log(`[WebSocketClient:${this.panel}] Disconnected:`, event.reason);
        this.isConnected = false;
        this.isConnecting = false;
        this.stopHealthCheck();
        this.setStatus('disconnected');

        // Reject all pending requests
        for (const [requestId, request] of this.pendingRequests) {
            request.reject(new Error('Connection lost'));
        }
        this.pendingRequests.clear();

        // Auto-reconnect if enabled
        if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[WebSocketClient:${this.panel}] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            setTimeout(() => this.connect().catch(console.error), this.reconnectInterval);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.setStatus('error');
            console.error(`[WebSocketClient:${this.panel}] Max reconnection attempts reached`);
        }
    }

    /**
     * Process queued messages
     */
    processMessageQueue() {
        while (this.messageQueue.length > 0 && this.isConnected) {
            const message = this.messageQueue.shift();
            try {
                this.ws.send(JSON.stringify(message));
            } catch (error) {
                console.error(`[WebSocketClient:${this.panel}] Failed to send queued message:`, error);
                break;
            }
        }
    }

    /**
     * Start health check ping/pong
     */
    startHealthCheck() {
        this.stopHealthCheck();
        this.healthCheckInterval = setInterval(() => {
            if (this.isConnected) {
                this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
                
                // Check if we received pong recently
                setTimeout(() => {
                    const timeSinceLastPong = Date.now() - this.lastPongTime;
                    if (timeSinceLastPong > 10000) { // 10 seconds
                        console.warn(`[WebSocketClient:${this.panel}] Health check failed, reconnecting`);
                        this.ws.close();
                    }
                }, 5000);
            }
        }, this.healthCheckIntervalMs);
    }

    /**
     * Stop health check
     */
    stopHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }

    /**
     * Set connection status and notify listeners
     */
    setStatus(status) {
        if (this.connectionStatus !== status) {
            this.connectionStatus = status;
            this.emit('statusChange', { panel: this.panel, status, timestamp: Date.now() });
        }
    }

    /**
     * Get current connection status
     */
    getStatus() {
        return {
            panel: this.panel,
            status: this.connectionStatus,
            isConnected: this.isConnected,
            url: this.url,
            reconnectAttempts: this.reconnectAttempts,
            queuedMessages: this.messageQueue.length,
            pendingRequests: this.pendingRequests.size
        };
    }

    /**
     * Event emitter functionality
     */
    on(event, handler) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].push(handler);
        }
    }

    off(event, handler) {
        if (this.eventHandlers[event]) {
            const index = this.eventHandlers[event].indexOf(handler);
            if (index > -1) {
                this.eventHandlers[event].splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`[WebSocketClient:${this.panel}] Event handler error:`, error);
                }
            });
        }
    }

    /**
     * Wait for response to a specific request
     */
    waitForResponse(requestId) {
        return new Promise((resolve, reject) => {
            const request = this.pendingRequests.get(requestId);
            if (request) {
                return;
            }
            
            setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    reject(new Error('Request timeout'));
                }
            }, 30000);
        });
    }
}

/**
 * WebSocketManager - Manages WebSocket clients for both panels
 */
class WebSocketManager {
    constructor() {
        this.clients = {
            left: null,
            right: null
        };
        this.statusHandlers = [];
    }

    /**
     * Get or create WebSocket client for panel
     */
    getClient(panel) {
        if (!this.clients[panel]) {
            const config = window.SettingsManager.getBackendConfig(panel);
            if (config && config.enabled) {
                this.clients[panel] = new WebSocketClient(panel, config.url);
                this.clients[panel].on('statusChange', (status) => {
                    this.notifyStatusChange(status);
                });
            }
        }
        return this.clients[panel];
    }

    /**
     * Connect to backend for specific panel
     */
    async connect(panel) {
        const client = this.getClient(panel);
        if (client) {
            await client.connect();
        }
    }

    /**
     * Disconnect from backend for specific panel
     */
    disconnect(panel) {
        if (this.clients[panel]) {
            this.clients[panel].disconnect();
        }
    }

    /**
     * Send message to backend for specific panel
     */
    async send(panel, type, data = {}) {
        const client = this.getClient(panel);
        if (!client) {
            throw new Error(`No backend configured for panel ${panel}`);
        }
        return await client.send(type, data);
    }

    /**
     * Get status for all panels
     */
    getStatus() {
        const status = {};
        for (const panel of ['left', 'right']) {
            if (this.clients[panel]) {
                status[panel] = this.clients[panel].getStatus();
            } else {
                status[panel] = {
                    panel,
                    status: 'disabled',
                    isConnected: false,
                    url: null
                };
            }
        }
        return status;
    }

    /**
     * Register status change handler
     */
    onStatusChange(handler) {
        this.statusHandlers.push(handler);
    }

    /**
     * Notify all status handlers
     */
    notifyStatusChange(status) {
        this.statusHandlers.forEach(handler => {
            try {
                handler(status);
            } catch (error) {
                console.error('Status handler error:', error);
            }
        });
    }

    /**
     * Reconnect all clients
     */
    async reconnectAll() {
        const promises = [];
        for (const panel of ['left', 'right']) {
            if (this.clients[panel]) {
                promises.push(this.connect(panel));
            }
        }
        await Promise.allSettled(promises);
    }

    /**
     * Disconnect all clients
     */
    disconnectAll() {
        for (const panel of ['left', 'right']) {
            this.disconnect(panel);
        }
    }
}

// Global WebSocket manager instance
window.WebSocketManager = new WebSocketManager();