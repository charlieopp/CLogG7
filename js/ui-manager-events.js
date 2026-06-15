/**
 * UIManager Events - Event listener management
 * Handles all UI event binding and global event handlers
 */

class UIManagerEvents {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
        // File selection buttons
        this.uiManager.bindEvent('selectLogLeftBtn', 'click', () => this.uiManager.openRemoteFileBrowser('left'));
        
        // Control buttons
        this.uiManager.bindEvent('buildSequencesBtn', 'click', () => {
            this.uiManager.sequenceMarking.toggleSequenceBuildArea('left');
        });
        
        this.uiManager.bindEvent('loadSequencesBtn', 'click', () => {
            this.uiManager.sequenceMarking.loadSequenceDefinition('left');
        });
        
        this.uiManager.bindEvent('useSequencesBtn', 'click', () => {
            this.uiManager.sequences.useSequences('left');
        });
        
        this.uiManager.bindEvent('refreshLeftBtn', 'click', () => this.uiManager.refreshLog(false));
        this.uiManager.bindEvent('followLeftBtn', 'click', () => this.uiManager.toggleFollow(false));
        this.uiManager.bindEvent('syncLeftBtn', 'click', () => this.uiManager.sequences.toggleSyncMode(false));
        this.uiManager.bindEvent('sideBySideBtn', 'click', () => {
            CLogApp.modules.panelManager.toggleSideBySide();
        });
        
        // Settings and state management
        this.uiManager.bindEvent('settingsBtn', 'click', (e) => this.uiManager.showSettings(e));
        this.uiManager.bindEvent('saveStateBtn', 'click', () => this.uiManager.modals.showSaveStateModal());
        
        // Filter controls
        this.uiManager.bindEvent('leftFilterToggle', 'click', () => this.uiManager.toggleFilters(false));
        this.uiManager.bindEvent('addLeftFilterBtn', 'click', () => this.uiManager.addFilterPill('leftFiltersContainer'));
        
        // Sequence controls
        this.uiManager.bindEvent('setStartEventBtn', 'click', () => {
            this.uiManager.sequenceMarking.setSequenceStartEvent('left');
        });
        
        this.uiManager.bindEvent('setEndEventBtn', 'click', () => {
            this.uiManager.sequenceMarking.setSequenceEndEvent('left');
        });
        
        this.uiManager.bindEvent('startSequenceBtn', 'click', () => {
            CLogApp.modules.sequenceManager.saveSequenceDefinition('left');
        });
        
        this.uiManager.bindEvent('clearSequenceBtn', 'click', () => {
            this.uiManager.sequenceMarking.clearSequenceSelections('left');
        });

        // Global click handler to close time pickers and spinners
        document.addEventListener('click', (e) => {
            // Close time pickers when clicking outside
            if (!e.target.closest('.inline-time-picker') && !e.target.closest('.filter-entry.time-mode')) {
                document.querySelectorAll('.inline-time-picker.show').forEach(picker => {
                    picker.classList.remove('show');
                    picker.closest('.filter-pill').classList.remove('time-picker-open');
                });
            }
            
            // Close popup spinners when clicking outside
            if (!e.target.closest('.time-input-popup-spinner')) {
                document.querySelectorAll('.time-input-popup-spinner').forEach(spinner => {
                    spinner.remove();
                });
            }
        });

        // ESC key handler for time pickers
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Close time pickers
                document.querySelectorAll('.inline-time-picker.show').forEach(picker => {
                    picker.classList.remove('show');
                    picker.closest('.filter-pill').classList.remove('time-picker-open');
                });
                
                // Close popup spinners
                document.querySelectorAll('.time-input-popup-spinner').forEach(spinner => {
                    spinner.remove();
                });
            }
        });
    }

    /**
     * Handle sync mode toggling
     */
    toggleSyncMode(isRightPanel) {
        const syncBtn = document.getElementById(
            isRightPanel ? 'rightSyncBtn' : 'syncLeftBtn'
        );
        const syncOverlay = document.getElementById(
            isRightPanel ? 'rightSyncOverlay' : 'leftSyncOverlay'
        );

        if (isRightPanel) {
            CLogApp.state.rightInSyncMode = !CLogApp.state.rightInSyncMode;
            this.updateSyncMode(syncBtn, syncOverlay, CLogApp.state.rightInSyncMode);
        } else {
            CLogApp.state.leftInSyncMode = !CLogApp.state.leftInSyncMode;
            this.updateSyncMode(syncBtn, syncOverlay, CLogApp.state.leftInSyncMode);
        }

        console.log(`[UIManager] Sync mode ${CLogApp.state.leftInSyncMode || CLogApp.state.rightInSyncMode ? 'enabled' : 'disabled'} for ${isRightPanel ? 'right' : 'left'} panel`);
    }

    /**
     * Update sync mode UI elements
     */
    updateSyncMode(syncBtn, syncOverlay, isEnabled) {
        if (syncBtn) {
            if (isEnabled) {
                syncBtn.classList.add('active');
                syncBtn.textContent = 'Exit Sync';
            } else {
                syncBtn.classList.remove('active');
                syncBtn.textContent = 'Sync Point';
            }
        }

        if (syncOverlay) {
            if (isEnabled) {
                syncOverlay.classList.remove('hidden');
            } else {
                syncOverlay.classList.add('hidden');
            }
        }
    }

    /**
     * Handle right panel specific events
     */
    initializeRightPanelEvents() {
        // Right panel controls
        this.uiManager.bindEvent('selectLogRightBtn', 'click', () => this.uiManager.openRemoteFileBrowser('right'));
        this.uiManager.bindEvent('buildSequencesRightBtn', 'click', () => {
            this.uiManager.sequenceMarking.toggleSequenceBuildArea('right');
        });
        this.uiManager.bindEvent('loadSequencesRightBtn', 'click', () => {
            this.uiManager.sequenceMarking.loadSequenceDefinition('right');
        });
        this.uiManager.bindEvent('useSequencesRightBtn', 'click', () => {
            this.uiManager.sequences.useSequences('right');
        });
        this.uiManager.bindEvent('refreshRightBtn', 'click', () => this.uiManager.refreshLog(true));
        this.uiManager.bindEvent('followRightBtn', 'click', () => this.uiManager.toggleFollow(true));
        this.uiManager.bindEvent('syncRightBtn', 'click', () => this.toggleSyncMode(true));
        this.uiManager.bindEvent('copyFromLeftBtn', 'click', () => this.copyFromLeft());
        
        // Right panel sequence controls
        this.uiManager.bindEvent('setStartEventRightBtn', 'click', () => {
            this.uiManager.sequenceMarking.setSequenceStartEvent('right');
        });
        this.uiManager.bindEvent('setEndEventRightBtn', 'click', () => {
            this.uiManager.sequenceMarking.setSequenceEndEvent('right');
        });
        this.uiManager.bindEvent('startSequenceRightBtn', 'click', () => {
            CLogApp.modules.sequenceManager.saveSequenceDefinition('right');
        });
        this.uiManager.bindEvent('clearSequenceRightBtn', 'click', () => {
            this.uiManager.sequenceMarking.clearSequenceSelections('right');
        });
    }

    /**
     * Copy settings from left panel to right panel
     */
    copyFromLeft() {
        console.log('[UIManager] Copying settings from left panel to right panel');
        
        // Copy log content
        const leftContent = this.uiManager.codemirror.getLogContent('left');
        if (leftContent) {
            const leftCache = this.uiManager.logLineCache.get('leftLogContent');
            if (leftCache) {
                this.uiManager.codemirror.setLogContent('right', leftContent, leftCache.filename, leftCache.fileId);
            }
        }
        
        // Copy sequence events
        if (CLogApp.state.startEvent) {
            CLogApp.state.rightStartEvent = CLogApp.state.startEvent;
        }
        if (CLogApp.state.endEvent) {
            CLogApp.state.rightEndEvent = CLogApp.state.endEvent;
        }
        
        // Update displays
        this.uiManager.utils.updateEventDisplay('startEventDisplayRight', CLogApp.state.rightStartEvent);
        this.uiManager.utils.updateEventDisplay('endEventDisplayRight', CLogApp.state.rightEndEvent);
        
        // Update highlighting
        this.uiManager.codemirror.updateLogHighlighting('rightLogContent');
        
        console.log('[UIManager] Successfully copied settings from left to right panel');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManagerEvents;
} else if (typeof window !== 'undefined') {
    window.UIManagerEvents = UIManagerEvents;
}