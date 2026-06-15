/**
 * CombinedFilterStateManager (CFSM) - Global filter state management
 * Manages filter state for multiple filter instances across the application
 */

class CombinedFilterStateManager {
    constructor() {
        this.instances = new Map(); // instanceId -> filterManager
        this.publicState = {}; // Public state for persistence
        this.autoSaveEnabled = true;
        this.changeHandlers = [];
        
        console.log('[CFSM] Initialized');
    }

    /**
     * Register a filter instance with the CFSM
     */
    registerInstance(instanceId, filterManager) {
        if (!instanceId || !filterManager) {
            throw new Error('Instance ID and filter manager are required');
        }

        // Validate required methods
        const requiredMethods = ['exportState', 'importState', 'hasContent'];
        for (const method of requiredMethods) {
            if (typeof filterManager[method] !== 'function') {
                throw new Error(`FilterManager must implement ${method}() method`);
            }
        }

        this.instances.set(instanceId, filterManager);
        
        // Set up auto-save
        if (filterManager.onChange && typeof filterManager.onChange === 'function') {
            console.warn(`[CFSM] FilterManager.onChange will be overridden for ${instanceId}`);
        }
        
        filterManager.onChange = () => {
            if (this.autoSaveEnabled) {
                this.pushState(instanceId);
            }
        };

        // Restore state if available
        if (this.publicState[instanceId]) {
            this.pullState(instanceId);
        }

        console.log(`[CFSM] Registered instance: ${instanceId}`);
    }

    /**
     * Unregister a filter instance
     */
    unregisterInstance(instanceId) {
        if (this.instances.has(instanceId)) {
            const filterManager = this.instances.get(instanceId);
            
            // Clean up onChange handler
            if (filterManager.onChange) {
                filterManager.onChange = null;
            }
            
            this.instances.delete(instanceId);
            console.log(`[CFSM] Unregistered instance: ${instanceId}`);
        }
    }

    /**
     * Push state from instance to CFSM
     */
    pushState(instanceId) {
        const filterManager = this.instances.get(instanceId);
        if (!filterManager) {
            console.warn(`[CFSM] Instance not found: ${instanceId}`);
            return;
        }

        try {
            const state = filterManager.exportState();
            
            // Only save if there's actual content
            if (filterManager.hasContent()) {
                this.publicState[instanceId] = state;
            } else {
                // Remove empty state
                delete this.publicState[instanceId];
            }

            this.notifyChange(instanceId, 'push');
            console.log(`[CFSM] Pushed state for: ${instanceId}`);
            
        } catch (error) {
            console.error(`[CFSM] Failed to push state for ${instanceId}:`, error);
        }
    }

    /**
     * Pull state from CFSM to instance
     */
    pullState(instanceId) {
        const filterManager = this.instances.get(instanceId);
        if (!filterManager) {
            console.warn(`[CFSM] Instance not found: ${instanceId}`);
            return;
        }

        const state = this.publicState[instanceId];
        if (!state) {
            console.log(`[CFSM] No state to pull for: ${instanceId}`);
            return;
        }

        try {
            // Temporarily disable auto-save to prevent loops
            this.autoSaveEnabled = false;
            
            filterManager.importState(state);
            console.log(`[CFSM] Pulled state for: ${instanceId}`);
            
            this.notifyChange(instanceId, 'pull');
            
        } catch (error) {
            console.error(`[CFSM] Failed to pull state for ${instanceId}:`, error);
        } finally {
            this.autoSaveEnabled = true;
        }
    }

    /**
     * Update public state from all registered instances
     */
    updateFromAllInstances() {
        console.log('[CFSM] Updating from all instances...');
        
        for (const [instanceId, filterManager] of this.instances) {
            this.pushState(instanceId);
        }
        
        console.log(`[CFSM] Updated state from ${this.instances.size} instances`);
    }

    /**
     * Get public state for persistence
     */
    getPublicState() {
        // Always get fresh state before returning
        this.updateFromAllInstances();
        return { ...this.publicState };
    }

    /**
     * Set public state from persistence
     */
    setPublicState(state) {
        if (!state || typeof state !== 'object') {
            console.warn('[CFSM] Invalid state provided to setPublicState');
            return;
        }

        this.publicState = { ...state };
        console.log(`[CFSM] Set public state with ${Object.keys(state).length} instances`);

        // Restore state to all registered instances
        for (const instanceId of Object.keys(this.publicState)) {
            if (this.instances.has(instanceId)) {
                this.pullState(instanceId);
            }
        }
    }

    /**
     * Clear all state
     */
    clearState() {
        console.log('[CFSM] Clearing all state...');
        
        this.publicState = {};
        
        // Clear all registered instances
        for (const [instanceId, filterManager] of this.instances) {
            try {
                // Import empty state to clear
                filterManager.importState({
                    version: "1.0",
                    enabled: true,
                    expression: []
                });
            } catch (error) {
                console.error(`[CFSM] Failed to clear instance ${instanceId}:`, error);
            }
        }

        this.notifyChange(null, 'clear');
    }

    /**
     * Get state for specific instance
     */
    getInstanceState(instanceId) {
        return this.publicState[instanceId] || null;
    }

    /**
     * Set state for specific instance
     */
    setInstanceState(instanceId, state) {
        if (!this.isValidFilterState(state)) {
            throw new Error('Invalid filter state format');
        }

        this.publicState[instanceId] = state;
        
        // Apply to instance if registered
        if (this.instances.has(instanceId)) {
            this.pullState(instanceId);
        }

        this.notifyChange(instanceId, 'set');
    }

    /**
     * Validate filter state format
     */
    isValidFilterState(state) {
        if (!state || typeof state !== 'object') return false;
        if (!state.version || !state.hasOwnProperty('enabled') || !Array.isArray(state.expression)) return false;
        
        // Validate expression elements
        for (const element of state.expression) {
            if (!element.type || !element.hasOwnProperty('enabled')) return false;
            
            switch (element.type) {
                case 'text':
                    if (!element.operator || !element.hasOwnProperty('value')) return false;
                    if (!['contains', 'excludes'].includes(element.operator)) return false;
                    break;
                case 'time':
                    if (!element.operator || !element.hasOwnProperty('value')) return false;
                    if (!['>=', '<='].includes(element.operator)) return false;
                    break;
                case 'operator':
                    if (!element.operator) return false;
                    if (!['AND', 'OR', 'NOT'].includes(element.operator)) return false;
                    break;
                case 'paren':
                    if (!element.operator) return false;
                    if (!['(', ')'].includes(element.operator)) return false;
                    break;
                default:
                    return false;
            }
        }
        
        return true;
    }

    /**
     * Add change handler
     */
    onChange(handler) {
        if (typeof handler === 'function') {
            this.changeHandlers.push(handler);
        }
    }

    /**
     * Remove change handler
     */
    offChange(handler) {
        const index = this.changeHandlers.indexOf(handler);
        if (index > -1) {
            this.changeHandlers.splice(index, 1);
        }
    }

    /**
     * Notify change handlers
     */
    notifyChange(instanceId, action) {
        const event = {
            instanceId,
            action, // 'push', 'pull', 'set', 'clear'
            timestamp: Date.now(),
            state: this.getPublicState()
        };

        this.changeHandlers.forEach(handler => {
            try {
                handler(event);
            } catch (error) {
                console.error('[CFSM] Change handler error:', error);
            }
        });
    }

    /**
     * Get debug information
     */
    getDebugInfo() {
        return {
            registeredInstances: Array.from(this.instances.keys()),
            publicState: this.publicState,
            autoSaveEnabled: this.autoSaveEnabled,
            changeHandlerCount: this.changeHandlers.length
        };
    }

    /**
     * Enable/disable auto-save
     */
    setAutoSave(enabled) {
        this.autoSaveEnabled = enabled;
        console.log(`[CFSM] Auto-save ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Create empty filter state
     */
    createEmptyState() {
        return {
            version: "1.0",
            enabled: true,
            expression: []
        };
    }

    /**
     * Create sample filter state for testing
     */
    createSampleState() {
        return {
            version: "1.0",
            enabled: true,
            expression: [
                {
                    type: "text",
                    operator: "contains",
                    value: "ERROR",
                    enabled: true
                },
                {
                    type: "operator",
                    operator: "OR",
                    enabled: true
                },
                {
                    type: "text",
                    operator: "contains",
                    value: "WARN",
                    enabled: true
                }
            ]
        };
    }
}

// Create global singleton
window.CFSM = new CombinedFilterStateManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CombinedFilterStateManager;
}