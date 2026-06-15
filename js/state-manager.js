/**
 * StateManager - Application State Persistence (UPDATED)
 * Handles saving, loading, and restoring application state
 * 
 * FIXES:
 * - Works with new text-based log content approach
 * - Preserves line breaks in state save/restore
 * - Uses UIManager's content access methods
 */

class StateManager {
    constructor() {
        this.storagePrefix = 'clog_';
        this.sessionKey = 'clog_last_session';
        this.savedStatesKey = 'clog_saved_states';
        this.sequenceDefKey = 'clog_sequence_definition';
        this.filterStateKey = 'clog_filter_state';
        
        // Auto-save settings
        this.autoSaveEnabled = true;
        this.autoSaveDelay = 1000; // 1 second
        this.autoSaveTimer = null;
        
        this.setupFilterStateIntegration();
        console.log('[StateManager] Initialized with filter state integration');
    }

    /**
     * Setup filter state integration with CFSM
     */
    setupFilterStateIntegration() {
        // Wait for CFSM to be available
        if (window.CFSM) {
            this.initFilterStateIntegration();
        } else {
            // Wait for CFSM to load
            const checkCFSM = () => {
                if (window.CFSM) {
                    this.initFilterStateIntegration();
                } else {
                    setTimeout(checkCFSM, 100);
                }
            };
            checkCFSM();
        }
    }

    /**
     * Initialize filter state integration
     */
    initFilterStateIntegration() {
        // Listen for filter state changes
        window.CFSM.onChange((event) => {
            console.log('[StateManager] Filter state changed:', event.action);
            this.scheduleAutoSave();
        });

        // Restore filter state on startup
        this.restoreFilterState();
        
        console.log('[StateManager] Filter state integration initialized');
    }

    /**
     * Schedule auto-save with debouncing
     */
    scheduleAutoSave() {
        if (!this.autoSaveEnabled) return;

        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }

        this.autoSaveTimer = setTimeout(() => {
            this.saveCurrentSession();
        }, this.autoSaveDelay);
    }

    /**
     * Save filter state
     */
    saveFilterState() {
        if (!this.isStorageAvailable() || !window.CFSM) return;

        try {
            const filterState = window.CFSM.getPublicState();
            localStorage.setItem(this.filterStateKey, JSON.stringify(filterState));
            console.log('[StateManager] Filter state saved');
        } catch (error) {
            console.error('[StateManager] Failed to save filter state:', error);
        }
    }

    /**
     * Restore filter state
     */
    restoreFilterState() {
        if (!this.isStorageAvailable() || !window.CFSM) return;

        try {
            const saved = localStorage.getItem(this.filterStateKey);
            if (saved) {
                const filterState = JSON.parse(saved);
                window.CFSM.setPublicState(filterState);
                console.log('[StateManager] Filter state restored');
            }
        } catch (error) {
            console.error('[StateManager] Failed to restore filter state:', error);
        }
    }

    /**
     * Clear filter state
     */
    clearFilterState() {
        if (!this.isStorageAvailable()) return;

        try {
            localStorage.removeItem(this.filterStateKey);
            if (window.CFSM) {
                window.CFSM.clearState();
            }
            console.log('[StateManager] Filter state cleared');
        } catch (error) {
            console.error('[StateManager] Failed to clear filter state:', error);
        }
    }

    /**
     * Clear all application state
     */
    async clearAllState() {
        if (!this.isStorageAvailable()) return;

        try {
            // Get all clog-related keys
            const allKeys = Object.keys(localStorage);
            const clogKeys = allKeys.filter(key => key.startsWith(this.storagePrefix));
            
            console.log(`[StateManager] Clearing ${clogKeys.length} state keys:`, clogKeys);
            
            // Remove all clog-related localStorage items
            clogKeys.forEach(key => {
                localStorage.removeItem(key);
            });
            
            // Clear filter state if CFSM is available
            if (window.CFSM) {
                window.CFSM.clearState();
            }
            
            // Clear dummy filter managers
            if (window.DummyFilterManagers) {
                Object.values(window.DummyFilterManagers).forEach(manager => {
                    if (manager && typeof manager.clear === 'function') {
                        manager.clear();
                    }
                });
            }
            
            // Reset application state
            if (window.CLogApp && window.CLogApp.state) {
                window.CLogApp.state = {
                    rightPanelVisible: false,
                    leftInSyncMode: false,
                    rightInSyncMode: false,
                    leftSyncPoint: null,
                    rightSyncPoint: null,
                    filterPillCounter: 0,
                    sequenceDefinitionVisible: false,
                    rightSequenceDefinitionVisible: false,
                    selectedLogLine: null,
                    startEvent: null,
                    endEvent: null,
                    rightStartEvent: null,
                    rightEndEvent: null,
                    sequenceDefinitionSaved: false,
                    isResizing: false,
                    currentSettingsMenu: null
                };
                
                // Reset UI Manager markingMode if available
                if (window.CLogApp && window.CLogApp.modules && window.CLogApp.modules.uiManager) {
                    window.CLogApp.modules.uiManager.markingMode = { left: 'none', right: 'none' };
                }
            }
            
            console.log('[StateManager] All application state cleared');
            
        } catch (error) {
            console.error('[StateManager] Failed to clear all state:', error);
            throw error;
        }
    }

    /**
     * Check if localStorage is available
     */
    isStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            console.warn('[StateManager] localStorage not available:', error.message);
            return false;
        }
    }

    /**
     * Get current application state
     */
    getCurrentState() {
        const state = {
            timestamp: new Date().toISOString(),
            version: '1.0.2', // Updated version for new filter system
            
            leftPanel: this.getPanelState('left'),
            rightPanel: CLogApp.state.rightPanelVisible ? this.getPanelState('right') : null,
            
            sequence: {
                definitionVisible: CLogApp.state.sequenceDefinitionVisible,
                rightDefinitionVisible: CLogApp.state.rightSequenceDefinitionVisible,
                startEvent: CLogApp.state.startEvent,
                endEvent: CLogApp.state.endEvent,
                rightStartEvent: CLogApp.state.rightStartEvent,
                rightEndEvent: CLogApp.state.rightEndEvent,
                definitionSaved: CLogApp.state.sequenceDefinitionSaved,
                markingMode: CLogApp.modules.uiManager ? CLogApp.modules.uiManager.markingMode : { left: 'none', right: 'none' }
            },
            
            ui: {
                rightPanelVisible: CLogApp.state.rightPanelVisible,
                leftSyncPoint: CLogApp.state.leftSyncPoint,
                rightSyncPoint: CLogApp.state.rightSyncPoint
            },
            
            layout: CLogApp.modules.panelManager.getPanelLayoutState(),
            
            // Include filter state from CFSM
            filters: window.CFSM ? window.CFSM.getPublicState() : {}
        };
        
        return state;
    }

    /**
     * Get state for a specific panel - UPDATED to use UIManager
     */
    getPanelState(panelSide) {
        const pathLabel = document.getElementById(`${panelSide}PathLabel`);
        const filterToggle = document.getElementById(`${panelSide}FilterCheckbox`);
        
        // Use UIManager to get the original content
        const logContent = CLogApp.modules.uiManager.getLogContent(panelSide);
        const cache = CLogApp.modules.uiManager.logLineCache.get(`${panelSide}LogContent`);
        
        console.log(`[StateManager] Getting panel state for ${panelSide}:`);
        console.log(`[StateManager] Content length: ${logContent ? logContent.length : 0}`);
        console.log(`[StateManager] Contains line breaks: ${logContent ? logContent.includes('\n') : false}`);
        console.log(`[StateManager] Line count: ${logContent ? logContent.split('\n').length : 0}`);
        
        return {
            pathLabel: pathLabel ? pathLabel.textContent : 'No file selected',
            logContent: logContent || '',
            filename: cache ? cache.filename : '',
            filterEnabled: filterToggle ? filterToggle.classList.contains('checked') : true
        };
    }

    /**
     * Save current session state
     */
    saveCurrentSession() {
        if (!this.isStorageAvailable()) {
            console.warn('[StateManager] Cannot save session - storage unavailable');
            return false;
        }

        try {
            // Save filter state separately for immediate persistence
            this.saveFilterState();
            
            const state = this.getCurrentState();
            localStorage.setItem(this.sessionKey, JSON.stringify(state));
            console.log('[StateManager] Session saved successfully');
            
            // Debug the saved state
            console.log(`[StateManager] Saved state - Left panel content length: ${state.leftPanel.logContent.length}`);
            if (state.rightPanel) {
                console.log(`[StateManager] Saved state - Right panel content length: ${state.rightPanel.logContent.length}`);
            }
            console.log(`[StateManager] Saved state - Filter instances: ${Object.keys(state.filters).length}`);
            
            return true;
        } catch (error) {
            console.error('[StateManager] Failed to save session:', error);
            CLogApp.utils.emit('error', {
                message: 'Failed to save session state',
                error: error
            });
            return false;
        }
    }

    /**
     * Check if valid session exists
     */
    async hasValidSession() {
        if (!this.isStorageAvailable()) return false;
        
        try {
            const sessionData = localStorage.getItem(this.sessionKey);
            if (!sessionData) return false;
            
            const state = JSON.parse(sessionData);
            return state && state.version && state.timestamp;
        } catch (error) {
            console.warn('[StateManager] Invalid session data:', error);
            return false;
        }
    }

    /**
     * Restore last session
     */
    async restoreLastSession() {
        if (!this.isStorageAvailable()) {
            console.warn('[StateManager] Cannot restore session - storage unavailable');
            return false;
        }

        try {
            const sessionData = localStorage.getItem(this.sessionKey);
            if (!sessionData) {
                console.log('[StateManager] No session to restore');
                return false;
            }

            const state = JSON.parse(sessionData);
            
            // Validate state structure
            if (!this.validateStateStructure(state)) {
                console.warn('[StateManager] Invalid session state structure');
                localStorage.removeItem(this.sessionKey);
                return false;
            }

            await this.restoreApplicationState(state);
            console.log('[StateManager] Session restored successfully');
            return true;

        } catch (error) {
            console.error('[StateManager] Failed to restore session:', error);
            localStorage.removeItem(this.sessionKey);
            return false;
        }
    }

    /**
     * Save named state
     */
    async saveNamedState(stateName) {
        if (!this.isStorageAvailable()) {
            throw new Error('Storage not available');
        }

        if (!stateName || stateName.trim() === '') {
            throw new Error('State name is required');
        }

        try {
            const currentState = this.getCurrentState();
            const savedStates = this.getSavedStates();
            
            savedStates[stateName] = currentState;
            localStorage.setItem(this.savedStatesKey, JSON.stringify(savedStates));
            
            console.log(`[StateManager] Named state saved: ${stateName}`);
            CLogApp.utils.emit('stateSaved', { stateName });
            return true;

        } catch (error) {
            console.error('[StateManager] Failed to save named state:', error);
            throw error;
        }
    }

    /**
     * Load named state
     */
    async loadNamedState(stateName) {
        if (!this.isStorageAvailable()) {
            throw new Error('Storage not available');
        }

        try {
            const savedStates = this.getSavedStates();
            const state = savedStates[stateName];
            
            if (!state) {
                throw new Error(`State "${stateName}" not found`);
            }

            if (!this.validateStateStructure(state)) {
                throw new Error(`State "${stateName}" has invalid structure`);
            }

            await this.restoreApplicationState(state);
            console.log(`[StateManager] Named state loaded: ${stateName}`);
            CLogApp.utils.emit('stateLoaded', { stateName });
            return true;

        } catch (error) {
            console.error('[StateManager] Failed to load named state:', error);
            throw error;
        }
    }

    /**
     * Delete named state
     */
    async deleteNamedState(stateName) {
        if (!this.isStorageAvailable()) {
            throw new Error('Storage not available');
        }

        try {
            const savedStates = this.getSavedStates();
            
            if (!savedStates[stateName]) {
                throw new Error(`State "${stateName}" not found`);
            }

            delete savedStates[stateName];
            localStorage.setItem(this.savedStatesKey, JSON.stringify(savedStates));
            
            console.log(`[StateManager] Named state deleted: ${stateName}`);
            return true;

        } catch (error) {
            console.error('[StateManager] Failed to delete named state:', error);
            throw error;
        }
    }

    /**
     * Get all saved states
     */
    getSavedStates() {
        if (!this.isStorageAvailable()) return {};
        
        try {
            const savedStatesData = localStorage.getItem(this.savedStatesKey);
            return savedStatesData ? JSON.parse(savedStatesData) : {};
        } catch (error) {
            console.warn('[StateManager] Failed to parse saved states:', error);
            return {};
        }
    }

    /**
     * Export all saved states
     */
    exportStates() {
        const savedStates = this.getSavedStates();
        const exportData = {
            exportedAt: new Date().toISOString(),
            version: '1.0.1',
            states: savedStates
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Import saved states
     */
    async importStates(importData) {
        try {
            const data = typeof importData === 'string' ? JSON.parse(importData) : importData;
            
            if (!data.states || typeof data.states !== 'object') {
                throw new Error('Invalid import data structure');
            }

            // Validate each state
            for (const [name, state] of Object.entries(data.states)) {
                if (!this.validateStateStructure(state)) {
                    console.warn(`[StateManager] Skipping invalid state: ${name}`);
                    delete data.states[name];
                }
            }

            // Merge with existing states
            const existingStates = this.getSavedStates();
            const mergedStates = { ...existingStates, ...data.states };
            
            localStorage.setItem(this.savedStatesKey, JSON.stringify(mergedStates));
            console.log('[StateManager] States imported successfully');
            return Object.keys(data.states).length;

        } catch (error) {
            console.error('[StateManager] Failed to import states:', error);
            throw error;
        }
    }

    /**
     * Clear all application state
     */
    clearAllState() {
        if (!this.isStorageAvailable()) {
            console.warn('[StateManager] Cannot clear state - storage unavailable');
            return;
        }

        try {
            // Clear filter state first
            this.clearFilterState();
            
            // Clear all CLog-related localStorage keys
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.storagePrefix)) {
                    localStorage.removeItem(key);
                }
            });
            
            console.log('[StateManager] All state cleared');
            return true;

        } catch (error) {
            console.error('[StateManager] Failed to clear state:', error);
            return false;
        }
    }

    /**
     * Validate state structure - UPDATED for new version
     */
    validateStateStructure(state) {
        if (!state || typeof state !== 'object') return false;
        
        const requiredKeys = ['timestamp', 'leftPanel', 'sequence', 'ui'];
        const hasRequiredKeys = requiredKeys.every(key => key in state);
        
        // Additional validation for content structure
        if (hasRequiredKeys && state.leftPanel) {
            const hasValidContent = typeof state.leftPanel.logContent === 'string';
            if (!hasValidContent) {
                console.warn('[StateManager] Invalid log content structure in state');
                return false;
            }
        }
        
        return hasRequiredKeys;
    }

    /**
     * Restore application state - UPDATED
     */
    async restoreApplicationState(state) {
        console.log('[StateManager] Restoring application state...');
        
        try {
            // Restore panel layout first
            if (state.layout) {
                CLogApp.modules.panelManager.restorePanelLayoutState(state.layout);
            }
            
            // Restore left panel
            await this.restorePanelState('left', state.leftPanel);
            
            // Restore right panel if it existed
            if (state.rightPanel && !CLogApp.state.rightPanelVisible) {
                CLogApp.modules.panelManager.toggleSideBySide();
            } else if (!state.rightPanel && CLogApp.state.rightPanelVisible) {
                CLogApp.modules.panelManager.toggleSideBySide();
            }
            
            if (state.rightPanel && CLogApp.state.rightPanelVisible) {
                // Small delay to ensure right panel is created
                setTimeout(async () => {
                    await this.restorePanelState('right', state.rightPanel);
                }, 100);
            }
            
            // Restore sequence state
            await this.restoreSequenceState(state.sequence);
            
            // Restore UI state
            await this.restoreUIState(state.ui);
            
            console.log('[StateManager] Application state restored successfully');

        } catch (error) {
            console.error('[StateManager] Failed to restore application state:', error);
            throw error;
        }
    }

    /**
     * Restore panel state - UPDATED to use UIManager
     */
    async restorePanelState(panelSide, panelState) {
        if (!panelState) return;
        
        console.log(`[StateManager] Restoring ${panelSide} panel state`);
        console.log(`[StateManager] Panel state content length: ${panelState.logContent?.length || 0}`);
        console.log(`[StateManager] Panel state contains line breaks: ${panelState.logContent?.includes('\n') || false}`);
        
        // Restore path label
        const pathLabel = document.getElementById(`${panelSide}PathLabel`);
        if (pathLabel) {
            pathLabel.textContent = panelState.pathLabel;
        }
        
        // Restore log content using UIManager
        if (panelState.logContent) {
            const filename = panelState.filename || panelState.pathLabel || 'restored.log';
            CLogApp.modules.uiManager.setLogContent(panelSide, panelState.logContent, filename);
            
            console.log(`[StateManager] Restored ${panelSide} panel content: ${panelState.logContent.split('\n').length} lines`);
        }
        
        // Restore filter state
        const filterCheckbox = document.getElementById(`${panelSide}FilterCheckbox`);
        if (filterCheckbox) {
            if (panelState.filterEnabled) {
                filterCheckbox.classList.add('checked');
            } else {
                filterCheckbox.classList.remove('checked');
            }
        }
        
    }

    /**
     * Restore sequence state
     */
    async restoreSequenceState(sequenceState) {
        console.log('[StateManager] restoreSequenceState called with:', sequenceState);
        
        if (!sequenceState) {
            console.log('[StateManager] No sequence state to restore');
            return;
        }
        
        console.log('[StateManager] Restoring sequence events:');
        console.log('  - startEvent:', sequenceState.startEvent ? 'SET' : 'NULL');
        console.log('  - endEvent:', sequenceState.endEvent ? 'SET' : 'NULL');
        console.log('  - rightStartEvent:', sequenceState.rightStartEvent ? 'SET' : 'NULL');
        console.log('  - rightEndEvent:', sequenceState.rightEndEvent ? 'SET' : 'NULL');
        
        // Restore sequence definition visibility for left panel
        const leftSequenceArea = document.getElementById('sequenceDefinitionArea');
        if (leftSequenceArea && Boolean(sequenceState.definitionVisible) !== !leftSequenceArea.classList.contains('hidden')) {
            CLogApp.modules.uiManager.sequenceMarking.toggleSequenceBuildArea('left');
        }

        // Restore sequence definition visibility for right panel
        const rightSequenceArea = document.getElementById('sequenceDefinitionAreaRight');
        if (rightSequenceArea && Boolean(sequenceState.rightDefinitionVisible) !== !rightSequenceArea.classList.contains('hidden')) {
            CLogApp.modules.uiManager.sequenceMarking.toggleSequenceBuildArea('right');
        }
        
        // Restore sequence events
        CLogApp.state.startEvent = sequenceState.startEvent;
        CLogApp.state.endEvent = sequenceState.endEvent;
        CLogApp.state.rightStartEvent = sequenceState.rightStartEvent;
        CLogApp.state.rightEndEvent = sequenceState.rightEndEvent;
        CLogApp.state.sequenceDefinitionSaved = sequenceState.definitionSaved;
        
        // Restore marking mode if available
        if (sequenceState.markingMode && CLogApp.modules.uiManager) {
            CLogApp.modules.uiManager.markingMode = sequenceState.markingMode;
        }
        
        // Update sequence display for both panels
        CLogApp.modules.sequenceManager.updateSequenceDisplay('both');
        
        // Update "Use Sequences" buttons
        if (sequenceState.definitionSaved) {
            const useSequencesBtn = document.getElementById('useSequencesBtn');
            if (useSequencesBtn) {
                useSequencesBtn.classList.remove('disabled');
            }
            
            const useSequencesRightBtn = document.getElementById('useSequencesRightBtn');
            if (useSequencesRightBtn) {
                useSequencesRightBtn.classList.remove('disabled');
            }
        }
    }

    /**
     * Restore UI state
     */
    async restoreUIState(uiState) {
        if (!uiState) return;
        
        // Restore sync points
        CLogApp.state.leftSyncPoint = uiState.leftSyncPoint;
        CLogApp.state.rightSyncPoint = uiState.rightSyncPoint;
        
        // Update sync button states if sync points exist
        if (uiState.leftSyncPoint) {
            const leftSyncBtn = document.getElementById('syncLeftBtn');
            if (leftSyncBtn) {
                leftSyncBtn.classList.add('toggle-active');
            }
        }
        
        if (uiState.rightSyncPoint && CLogApp.state.rightPanelVisible) {
            const rightSyncBtn = document.getElementById('syncRightBtn');
            if (rightSyncBtn) {
                rightSyncBtn.classList.add('toggle-active');
            }
        }
    }

    /**
     * Debug state information
     */
    debugState() {
        console.group('[StateManager] Debug State Information');
        const currentState = this.getCurrentState();
        console.log('Current State:', currentState);
        console.log('Storage Available:', this.isStorageAvailable());
        console.log('Saved States:', Object.keys(this.getSavedStates()));
        console.groupEnd();
    }
}

// Export for use in other modules
window.StateManager = StateManager;