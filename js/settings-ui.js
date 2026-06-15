/**
 * SettingsUI - Settings management interface
 */

class SettingsUI {
    constructor() {
        this.isVisible = false;
        this.currentTab = 'backends';
        this.createSettingsModal();
        this.initializeTheme();
        console.log('[SettingsUI] Initialized');
    }

    /**
     * Initialize theme on page load
     */
    initializeTheme() {
        // Force dark mode for immediate switch
        localStorage.setItem('clog_theme', 'dark');
        const savedTheme = localStorage.getItem('clog_theme') || 'dark';
        this.applyTheme(savedTheme);
    }

    /**
     * Create settings modal HTML
     */
    createSettingsModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay settings-modal';
        modal.id = 'settingsModal';
        modal.style.display = 'none';
        
        modal.innerHTML = `
            <div class="modal settings-modal-content">
                <div class="modal-header">
                    <div class="modal-title">⚙️ Settings</div>
                    <button class="modal-close" onclick="window.SettingsUI.hide()">×</button>
                </div>
                
                <div class="settings-tabs">
                    <button class="settings-tab active" data-tab="backends">Backend Connections</button>
                    <button class="settings-tab" data-tab="ui">UI Preferences</button>
                    <button class="settings-tab" data-tab="state">State Management</button>
                </div>
                
                <div class="settings-content">
                    <div class="settings-panel active" id="backends-panel">
                        <div class="settings-section">
                            <h3>Left Panel Backend</h3>
                            <div class="setting-group">
                                <label>Backend URL:</label>
                                <input type="text" id="leftBackendUrl" placeholder="ws://localhost:8847/api/ws">
                            </div>
                            <div class="setting-group">
                                <label>Backend Name:</label>
                                <input type="text" id="leftBackendName" placeholder="Primary Backend">
                            </div>
                            <div class="setting-group">
                                <label>
                                    <input type="checkbox" id="leftBackendEnabled"> Enabled
                                </label>
                            </div>
                            <button class="test-connection-btn" onclick="window.SettingsUI.testConnection('left')">
                                Test Connection
                            </button>
                            <button class="modal-btn" onclick="window.SettingsUI.restartServer('left')">
                                Restart Server
                            </button>
                            <button class="modal-btn danger" onclick="window.SettingsUI.stopServer('left')">
                                Stop Server
                            </button>
                        </div>

                        <div class="settings-section">
                            <h3>Right Panel Backend</h3>
                            <div class="setting-group">
                                <label>Backend URL:</label>
                                <input type="text" id="rightBackendUrl" placeholder="ws://localhost:8847/api/ws">
                            </div>
                            <div class="setting-group">
                                <label>Backend Name:</label>
                                <input type="text" id="rightBackendName" placeholder="Secondary Backend">
                            </div>
                            <div class="setting-group">
                                <label>
                                    <input type="checkbox" id="rightBackendEnabled"> Enabled
                                </label>
                            </div>
                            <button class="test-connection-btn" onclick="window.SettingsUI.testConnection('right')">
                                Test Connection
                            </button>
                            <button class="modal-btn" onclick="window.SettingsUI.restartServer('right')">
                                Restart Server
                            </button>
                            <button class="modal-btn danger" onclick="window.SettingsUI.stopServer('right')">
                                Stop Server
                            </button>
                        </div>
                    </div>
                    
                    <div class="settings-panel" id="ui-panel">
                        <div class="settings-section">
                            <h3>Theme</h3>
                            <div class="setting-group">
                                <label>Color Theme:</label>
                                <select id="themeSelect">
                                    <option value="light">Light</option>
                                    <option value="dark">Dark</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="settings-section">
                            <h3>Display Preferences</h3>
                            <div class="setting-group">
                                <label>
                                    <input type="checkbox" id="debugMode"> Enable debug mode
                                </label>
                            </div>
                            <div class="setting-group">
                                <label>Auto-save interval (seconds):</label>
                                <input type="number" id="autoSaveInterval" min="10" max="300" step="10" value="30">
                            </div>
                        </div>
                        
                        <div class="settings-section">
                            <h3>Connection Settings</h3>
                            <div class="setting-group">
                                <label>
                                    <input type="checkbox" id="autoReconnect"> Auto-reconnect on disconnect
                                </label>
                            </div>
                            <div class="setting-group">
                                <label>Reconnect Interval (ms):</label>
                                <input type="number" id="reconnectInterval" min="1000" max="60000" step="1000">
                            </div>
                            <div class="setting-group">
                                <label>Connection Timeout (ms):</label>
                                <input type="number" id="connectionTimeout" min="5000" max="30000" step="1000">
                            </div>
                            <div class="setting-group">
                                <label>Health Check Interval (ms):</label>
                                <input type="number" id="healthCheckInterval" min="10000" max="120000" step="5000">
                            </div>
                        </div>
                    </div>
                    
                    <div class="settings-panel" id="state-panel">
                        <div class="settings-section">
                            <h3>Session State</h3>
                            <div class="setting-group">
                                <label>
                                    <input type="checkbox" id="autoRestoreSession" checked> Automatically restore previous session on startup
                                </label>
                            </div>
                            <div class="setting-group">
                                <label>
                                    <input type="checkbox" id="autoSaveState" checked> Automatically save state
                                </label>
                            </div>
                        </div>
                        
                        <div class="settings-section">
                            <h3>Clear State</h3>
                            <p style="color: var(--text-secondary); font-size: 12px; margin-bottom: 12px;">
                                Clear all saved application state including panel layouts, filter settings, file paths, and session data.
                                This action cannot be undone.
                            </p>
                            <div class="setting-group">
                                <button class="modal-btn danger" onclick="window.SettingsUI.clearAllState()">Clear All State</button>
                            </div>
                        </div>
                        
                        <div class="settings-section">
                            <h3>State Information</h3>
                            <div class="setting-group">
                                <button class="modal-btn" onclick="window.SettingsUI.showStateInfo()">Show State Details</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-buttons">
                    <button class="modal-btn" onclick="window.SettingsUI.resetToDefaults()">Reset to Defaults</button>
                    <button class="modal-btn cancel" onclick="window.SettingsUI.hide()">Cancel</button>
                    <button class="modal-btn primary" onclick="window.SettingsUI.save()">Save Changes</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for settings modal
     */
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    /**
     * Switch between settings tabs
     */
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Update panels
        document.querySelectorAll('.settings-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}-panel`);
        });
        
        this.currentTab = tabName;
    }

    /**
     * Show settings modal
     */
    show() {
        this.loadCurrentSettings();
        document.getElementById('settingsModal').style.display = 'flex';
        this.isVisible = true;
    }

    /**
     * Hide settings modal
     */
    hide() {
        document.getElementById('settingsModal').style.display = 'none';
        this.isVisible = false;
    }

    /**
     * Load current settings into the form
     */
    loadCurrentSettings() {
        const settings = window.SettingsManager.settings;
        
        // Backend settings
        document.getElementById('leftBackendUrl').value = settings.backends.left.url;
        document.getElementById('leftBackendName').value = settings.backends.left.name;
        document.getElementById('leftBackendEnabled').checked = settings.backends.left.enabled;
        
        document.getElementById('rightBackendUrl').value = settings.backends.right.url;
        document.getElementById('rightBackendName').value = settings.backends.right.name;
        document.getElementById('rightBackendEnabled').checked = settings.backends.right.enabled;
        
        // UI settings
        document.getElementById('autoReconnect').checked = settings.ui.autoReconnect;
        document.getElementById('reconnectInterval').value = settings.ui.reconnectInterval;
        document.getElementById('connectionTimeout').value = settings.ui.connectionTimeout;
        document.getElementById('healthCheckInterval').value = settings.ui.healthCheckInterval;
        
        // Theme setting - load from localStorage or default to dark
        const currentTheme = localStorage.getItem('clog_theme') || 'dark';
        document.getElementById('themeSelect').value = currentTheme;
    }

    /**
     * Save settings
     */
    async save() {
        try {
            // Collect backend settings
            window.SettingsManager.setBackendConfig('left', {
                url: document.getElementById('leftBackendUrl').value,
                name: document.getElementById('leftBackendName').value,
                enabled: document.getElementById('leftBackendEnabled').checked
            });
            
            window.SettingsManager.setBackendConfig('right', {
                url: document.getElementById('rightBackendUrl').value,
                name: document.getElementById('rightBackendName').value,
                enabled: document.getElementById('rightBackendEnabled').checked
            });
            
            // Collect UI settings
            window.SettingsManager.set('ui', {
                autoReconnect: document.getElementById('autoReconnect').checked,
                reconnectInterval: parseInt(document.getElementById('reconnectInterval').value),
                connectionTimeout: parseInt(document.getElementById('connectionTimeout').value),
                healthCheckInterval: parseInt(document.getElementById('healthCheckInterval').value)
            });
            
            // Handle theme change
            const selectedTheme = document.getElementById('themeSelect').value;
            this.applyTheme(selectedTheme);
            localStorage.setItem('clog_theme', selectedTheme);
            
            // Update connections
            if (window.ConnectionStatusManager) {
                await window.ConnectionStatusManager.updateSettings();
            }
            
            this.hide();
            this.showMessage('Settings saved successfully!', 'success');
            
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showMessage('Failed to save settings: ' + error.message, 'error');
        }
    }

    /**
     * Apply theme to the document
     */
    applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        
        // Refresh CodeMirror editors to pick up new theme
        if (window.CLogApp && window.CLogApp.modules && window.CLogApp.modules.uiManager) {
            const uiManager = window.CLogApp.modules.uiManager;
            if (uiManager.codeMirrorInstances) {
                uiManager.codeMirrorInstances.forEach(editor => {
                    if (editor && window.CodeMirror6) {
                        window.CodeMirror6.setEditorTheme(editor, theme);
                    }
                });
            }
        }
        
        console.log(`[SettingsUI] Applied ${theme} theme`);
    }

    /**
     * Reset to default settings
     */
    resetToDefaults() {
        if (confirm('Are you sure you want to reset all settings to defaults?')) {
            window.SettingsManager.reset();
            this.loadCurrentSettings();
            this.showMessage('Settings reset to defaults', 'info');
        }
    }

    /**
     * Test connection for a panel
     */
    async testConnection(panel) {
        const button = document.querySelector(`button[onclick="window.SettingsUI.testConnection('${panel}')"]`);
        const originalText = button.textContent;
        
        try {
            button.textContent = 'Testing...';
            button.disabled = true;
            
            const success = await window.ApiClient.testConnection(panel);
            
            if (success) {
                this.showMessage(`${panel} panel connection successful!`, 'success');
                button.textContent = '✓ Connected';
                setTimeout(() => {
                    button.textContent = originalText;
                    button.disabled = false;
                }, 2000);
            } else {
                this.showMessage(`${panel} panel connection failed`, 'error');
                button.textContent = '✗ Failed';
                setTimeout(() => {
                    button.textContent = originalText;
                    button.disabled = false;
                }, 2000);
            }
            
        } catch (error) {
            console.error(`Connection test failed for ${panel}:`, error);
            this.showMessage(`${panel} panel connection error: ${error.message}`, 'error');
            button.textContent = '✗ Error';
            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
            }, 2000);
        }
    }

    /**
     * Stop the backend server for a panel (systemd-managed - requires a
     * manual restart, e.g. via the Restart Server button, to bring it back).
     */
    async stopServer(panel) {
        const config = window.SettingsManager.getBackendConfig(panel);
        const name = config ? config.name : panel;

        const confirmed = confirm(
            `⚠️ Stop Server\n\n` +
            `This will stop the "${name}" backend (${panel} panel).\n` +
            `It will stay stopped until you click "Restart Server".\n\n` +
            `Continue?`
        );
        if (!confirmed) return;

        try {
            await window.ApiClient.controlServer(panel, 'stop');
            this.showMessage(`${name} backend is stopping...`, 'info');
        } catch (error) {
            console.error(`Failed to stop server for ${panel}:`, error);
            this.showMessage(`Failed to stop ${name} backend: ${error.message}`, 'error');
        }
    }

    /**
     * Restart the backend server for a panel (systemd-managed).
     */
    async restartServer(panel) {
        const config = window.SettingsManager.getBackendConfig(panel);
        const name = config ? config.name : panel;

        const confirmed = confirm(
            `🔄 Restart Server\n\n` +
            `This will restart the "${name}" backend (${panel} panel).\n` +
            `The connection will drop briefly and reconnect automatically.\n\n` +
            `Continue?`
        );
        if (!confirmed) return;

        try {
            await window.ApiClient.controlServer(panel, 'restart');
            this.showMessage(`${name} backend is restarting...`, 'info');
        } catch (error) {
            console.error(`Failed to restart server for ${panel}:`, error);
            this.showMessage(`Failed to restart ${name} backend: ${error.message}`, 'error');
        }
    }

    /**
     * Show a temporary message
     */
    showMessage(message, type = 'info') {
        // For now, use a simple alert. Could be enhanced with toast notifications
        const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
        alert(`${emoji} ${message}`);
    }

    /**
     * Clear all application state
     */
    async clearAllState() {
        const confirmed = confirm(
            '⚠️ Clear All State\n\n' +
            'This will permanently delete:\n' +
            '• All saved sessions\n' +
            '• Panel layouts and sizes\n' +
            '• Filter configurations\n' +
            '• File paths and positions\n' +
            '• Sequence definitions\n' +
            '• All application preferences\n\n' +
            'This action cannot be undone!\n\n' +
            'Are you sure you want to continue?'
        );

        if (!confirmed) return;

        try {
            // Clear all state via StateManager
            if (CLogApp.modules.stateManager) {
                await CLogApp.modules.stateManager.clearAllState();
            }

            // Also clear localStorage manually as backup
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('clog_')) {
                    localStorage.removeItem(key);
                }
            });

            this.showMessage('All application state cleared successfully. The page will reload.', 'success');
            
            // Reload the page to reset everything
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error('[SettingsUI] Failed to clear state:', error);
            this.showMessage(`Failed to clear state: ${error.message}`, 'error');
        }
    }

    /**
     * Show current state information
     */
    async showStateInfo() {
        try {
            let stateInfo = 'Application State Information\n\n';

            // Get current session state
            if (CLogApp.modules.stateManager) {
                const currentState = CLogApp.modules.stateManager.getCurrentState();
                stateInfo += `Session State:\n`;
                stateInfo += `• Timestamp: ${currentState.timestamp}\n`;
                stateInfo += `• Version: ${currentState.version}\n`;
                stateInfo += `• Right Panel: ${currentState.ui.rightPanelVisible ? 'Visible' : 'Hidden'}\n`;
                stateInfo += `• Left Panel File: ${currentState.leftPanel.pathLabel}\n`;
                if (currentState.rightPanel) {
                    stateInfo += `• Right Panel File: ${currentState.rightPanel.pathLabel}\n`;
                }
                stateInfo += `\n`;
            }

            // Check localStorage usage
            const keys = Object.keys(localStorage).filter(key => key.startsWith('clog_'));
            stateInfo += `Stored Data:\n`;
            stateInfo += `• Storage Keys: ${keys.length}\n`;
            
            let totalSize = 0;
            keys.forEach(key => {
                const value = localStorage.getItem(key);
                totalSize += key.length + (value ? value.length : 0);
            });
            stateInfo += `• Total Size: ${Math.round(totalSize / 1024)} KB\n`;
            
            stateInfo += `\nStored Keys:\n`;
            keys.forEach(key => {
                const shortKey = key.replace('clog_', '');
                const value = localStorage.getItem(key);
                const size = value ? Math.round(value.length / 1024) : 0;
                stateInfo += `• ${shortKey}: ${size} KB\n`;
            });

            alert(stateInfo);

        } catch (error) {
            console.error('[SettingsUI] Failed to get state info:', error);
            this.showMessage(`Failed to get state information: ${error.message}`, 'error');
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.SettingsUI = new SettingsUI();
});