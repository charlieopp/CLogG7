/**
 * UI Manager - Sequence Controls
 * Handles sequence-related UI operations
 */

class UIManagerSequences {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    /**
     * Use sequences for specified panel
     */
    useSequences(panel = 'left') {
        if (panel === 'right') {
            CLogApp.modules.sequenceManager.useSequences('right');
        } else {
            CLogApp.modules.sequenceManager.useSequences();
        }
    }

    /**
     * Toggle sync mode
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

        console.log(`[UIManager] Sync mode ${CLogApp.state.leftInSyncMode || CLogApp.state.rightInSyncMode ? 'enabled' : 'disabled'}`);
    }

    /**
     * Update sync mode UI
     */
    updateSyncMode(syncBtn, syncOverlay, isActive) {
        if (syncBtn) {
            if (isActive) {
                syncBtn.classList.add('toggle-active');
            } else {
                syncBtn.classList.remove('toggle-active');
            }
        }

        if (syncOverlay) {
            if (isActive) {
                syncOverlay.classList.remove('hidden');
            } else {
                syncOverlay.classList.add('hidden');
            }
        }
    }
}

// Export for use in other modules
window.UIManagerSequences = UIManagerSequences;