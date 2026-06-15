/**
 * CombinedFilterStateManager (CFSM) - Centralized state management utility
 * 
 * Purpose: Manages state for multiple filter pill instances
 * Architecture: Instances push/pull state, host applications handle persistence
 */
class CombinedFilterStateManager {
    constructor() {
        // Public state object that host applications can access
        this.publicState = {};

        // Registry of active instances
        this.instances = new Map();

        // Change listeners (host applications subscribe via onChange)
        this._listeners = [];

        console.log('🏗️ CombinedFilterStateManager initialized');
    }

    /**
     * Register a callback to be notified when state changes
     * @param {function({action: string})} callback
     */
    onChange(callback) {
        if (typeof callback === 'function') {
            this._listeners.push(callback);
        }
    }

    /**
     * Notify all registered listeners that state has changed
     * @param {string} action - Name of the action that triggered the change
     */
    _emitChange(action) {
        this._listeners.forEach(callback => {
            try {
                callback({ action });
            } catch (error) {
                console.error('❌ Error in CFSM onChange listener:', error);
            }
        });
    }

    /**
     * Register a filter manager instance
     * @param {string} instanceId - Unique identifier for the instance
     * @param {FilterManager} filterManager - The filter manager instance
     */
    registerInstance(instanceId, filterManager) {
        this.instances.set(instanceId, filterManager);
        console.log(`📝 Instance '${instanceId}' registered with CFSM`);
        
        // Initialize with existing state if available
        const existingState = this.publicState[instanceId];
        if (existingState) {
            console.log(`🔄 Restoring state for instance '${instanceId}'`);
            filterManager.importState(existingState);
        } else {
            console.log(`🆕 Instance '${instanceId}' starting fresh`);
        }
    }

    /**
     * Unregister a filter manager instance
     * @param {string} instanceId - Instance to unregister
     */
    unregisterInstance(instanceId) {
        if (this.instances.has(instanceId)) {
            this.instances.delete(instanceId);
            console.log(`❌ Instance '${instanceId}' unregistered from CFSM`);
        }
    }

    /**
     * Instance calls this to push its current state
     * @param {string} instanceId - Instance identifier
     */
    pushState(instanceId) {
        const filterManager = this.instances.get(instanceId);
        if (!filterManager) {
            console.warn(`⚠️ Cannot push state - instance '${instanceId}' not registered`);
            return;
        }

        const state = filterManager.exportState();
        this.publicState[instanceId] = state;

        console.log(`💾 State pushed from instance '${instanceId}'`);
        this._emitChange('pushState');
    }

    /**
     * Instance calls this to pull its state for restoration
     * @param {string} instanceId - Instance identifier
     * @returns {Object|null} State object or null if none available
     */
    pullState(instanceId) {
        const state = this.publicState[instanceId];
        if (state) {
            console.log(`📥 State pulled for instance '${instanceId}'`);
            return state;
        } else {
            console.log(`📭 No state available for instance '${instanceId}'`);
            return null;
        }
    }

    /**
     * Force an instance to restore from CFSM state
     * @param {string} instanceId - Instance identifier
     * @returns {boolean} True if successful
     */
    restoreInstance(instanceId) {
        const filterManager = this.instances.get(instanceId);
        const state = this.publicState[instanceId];
        
        if (!filterManager) {
            console.warn(`⚠️ Cannot restore - instance '${instanceId}' not registered`);
            return false;
        }

        if (!state) {
            console.log(`📭 No state to restore for instance '${instanceId}' - clearing instance`);
            filterManager.clearAll();
            this._emitChange('restoreInstance');
            return true; // Successfully cleared
        }

        try {
            const success = filterManager.importState(state);
            if (success) {
                console.log(`✅ Instance '${instanceId}' restored from CFSM`);
            } else {
                console.error(`❌ Failed to restore instance '${instanceId}'`);
            }
            this._emitChange('restoreInstance');
            return success;
        } catch (error) {
            console.error(`❌ Error restoring instance '${instanceId}':`, error);
            return false;
        }
    }

    /**
     * Check if an instance has content worth saving
     * @param {string} instanceId - Instance identifier
     * @returns {boolean} True if instance has content
     */
    instanceHasContent(instanceId) {
        const filterManager = this.instances.get(instanceId);
        return filterManager ? filterManager.hasContent() : false;
    }

    /**
     * Get list of registered instance IDs
     * @returns {string[]} Array of instance IDs
     */
    getInstanceIds() {
        return Array.from(this.instances.keys());
    }

    /**
     * Clear state for specific instance
     * @param {string} instanceId - Instance identifier
     */
    clearInstanceState(instanceId) {
        delete this.publicState[instanceId];
        console.log(`🗑️ State cleared for instance '${instanceId}'`);
        this._emitChange('clearInstanceState');
    }

    /**
     * Clear all state
     */
    clearAllState() {
        this.publicState = {};
        console.log('🗑️ All state cleared from CFSM');
        this._emitChange('clearAllState');
    }

    /**
     * Alias for clearAllState - used by host applications
     */
    clearState() {
        this.clearAllState();
    }

    // ===== HOST APPLICATION INTERFACE =====

    /**
     * Host sets the complete state object (e.g., from persistence)
     * @param {Object} stateObject - Complete state object
     */
    setPublicState(stateObject) {
        this.publicState = stateObject || {};
        console.log('🏠 Host set public state:', Object.keys(this.publicState));
        this._emitChange('setPublicState');
    }

    /**
     * Host gets the complete state object (e.g., for persistence)
     * @returns {Object} Complete state object
     */
    getPublicState() {
        return { ...this.publicState };
    }

    /**
     * Auto-update state from all registered instances
     * Useful for periodic saves
     */
    updateFromAllInstances() {
        this.instances.forEach((filterManager, instanceId) => {
            // Always push state, even if empty - this ensures cleared instances update CFSM
            this.pushState(instanceId);
        });
        console.log('🔄 Updated state from all instances');
    }

    /**
     * Get summary of current state
     * @returns {Object} Summary information
     */
    getStateSummary() {
        const summary = {
            registeredInstances: this.getInstanceIds(),
            instancesWithState: Object.keys(this.publicState),
            instancesWithContent: []
        };

        this.instances.forEach((filterManager, instanceId) => {
            if (filterManager.hasContent()) {
                summary.instancesWithContent.push(instanceId);
            }
        });

        return summary;
    }
}

// Create global singleton instance
window.CFSM = new CombinedFilterStateManager();

// Export for modules
window.CombinedFilterStateManager = CombinedFilterStateManager;

console.log('✅ CombinedFilterStateManager loaded and ready');