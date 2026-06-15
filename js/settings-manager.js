class SettingsManager {
    constructor() {
        this.defaults = {
            backends: {
                left: {
                    url: 'ws://192.168.7.15:8847/api/ws',
                    enabled: true,
                    name: 'Primary Backend'
                },
                right: {
                    url: 'ws://192.168.7.15:8847/api/ws',
                    enabled: true,
                    name: 'Secondary Backend'
                }
            },
            ui: {
                autoReconnect: true,
                reconnectInterval: 5000,
                connectionTimeout: 10000,
                healthCheckInterval: 30000
            }
        };
        this.settings = this.loadSettings();
    }

    loadSettings() {
        try {
            const stored = localStorage.getItem('clog_settings');
            if (stored) {
                const parsed = JSON.parse(stored);
                return this.mergeWithDefaults(parsed);
            }
        } catch (error) {
            console.warn('Failed to load settings from localStorage:', error);
        }
        return { ...this.defaults };
    }

    mergeWithDefaults(settings) {
        return {
            backends: {
                left: { ...this.defaults.backends.left, ...settings.backends?.left },
                right: { ...this.defaults.backends.right, ...settings.backends?.right }
            },
            ui: { ...this.defaults.ui, ...settings.ui }
        };
    }

    saveSettings() {
        try {
            localStorage.setItem('clog_settings', JSON.stringify(this.settings));
            return true;
        } catch (error) {
            console.error('Failed to save settings to localStorage:', error);
            return false;
        }
    }

    get(path) {
        const keys = path.split('.');
        let current = this.settings;
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return undefined;
            }
        }
        return current;
    }

    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let current = this.settings;
        
        for (const key of keys) {
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[lastKey] = value;
        this.saveSettings();
    }

    getBackendConfig(panel) {
        return this.get(`backends.${panel}`);
    }

    setBackendConfig(panel, config) {
        this.set(`backends.${panel}`, config);
    }

    getBackendUrl(panel) {
        return this.get(`backends.${panel}.url`);
    }

    isBackendEnabled(panel) {
        return this.get(`backends.${panel}.enabled`);
    }

    getUIConfig() {
        return this.get('ui');
    }

    reset() {
        this.settings = { ...this.defaults };
        this.saveSettings();
    }

    exportSettings() {
        return JSON.stringify(this.settings, null, 2);
    }

    importSettings(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            this.settings = this.mergeWithDefaults(imported);
            this.saveSettings();
            return true;
        } catch (error) {
            console.error('Failed to import settings:', error);
            return false;
        }
    }
}

window.SettingsManager = new SettingsManager();