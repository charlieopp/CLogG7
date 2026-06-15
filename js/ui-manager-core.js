/**
 * UIManager Core - Main UI manager with basic setup and coordination
 * Handles initialization and coordinates between sub-modules
 */

class UIManager {
    constructor() {
        this.currentModal = null;
        this.filterPillCounter = 0;
        this.logLineCache = new Map(); // Cache for line operations
        this.filters = new UIManagerFilters(this);
        this.sequences = new UIManagerSequences(this);
        this.codeMirrorInstances = new Map(); // CodeMirror instances for each panel
        
        // Import sub-managers
        this.codemirror = new UIManagerCodeMirror(this);
        this.events = new UIManagerEvents(this);
        this.sequenceMarking = new UIManagerSequenceMarking(this);
        this.modals = new UIManagerModals(this);
        this.utils = new UIManagerUtils(this);
        
        // Sequence marking mode state
        this.markingMode = {
            left: 'none', // 'none', 'marking-start', 'marking-end', 'locked'
            right: 'none'
        };
        
        this.events.initializeEventListeners();
        this.codemirror.initializeCodeMirrorEditors();
        console.log('[UIManager] Initialized with CodeMirror support');
    }

    /**
     * Bind event with error handling
     */
    bindEvent(elementId, eventType, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(eventType, handler);
        } else {
            console.warn(`[UIManager] Element not found: ${elementId}`);
        }
    }

    /**
     * File management
     */
    openRemoteFileBrowser(panel) {
        console.log(`[UIManager] Opening remote file browser for ${panel} panel`);
        if (window.RemoteFileBrowser) {
            window.RemoteFileBrowser.show(panel);
        } else {
            console.error('[UIManager] RemoteFileBrowser module not available');
        }
    }

    /**
     * Legacy compatibility methods
     */
    makeLogLinesClickable(elementId, enableSequenceMode = false) {
        console.log(`[UIManager] makeLogLinesClickable called for ${elementId}, sequence mode: ${enableSequenceMode}`);
        // This is handled by CodeMirror editors now, so this is just a stub for compatibility
        // The click handling is done in the CodeMirror initialization
    }

    /**
     * Toggle filters for specified panel
     */
    toggleFilters(isRightPanel) {
        const panel = isRightPanel ? 'right' : 'left';
        const toggleId = isRightPanel ? 'rightFilterToggle' : 'leftFilterToggle';
        const checkbox = document.getElementById(toggleId);
        
        if (checkbox) {
            const isChecked = checkbox.checked;
            console.log(`[UIManager] Filters ${isChecked ? 'enabled' : 'disabled'} for ${panel} panel`);
            // Add filter toggle logic here if needed
        }
    }

    /**
     * Add a new filter pill to the specified container
     */
    addFilterPill(containerId) {
        console.log(`[UIManager] Adding filter pill to ${containerId}`);
        this.filterPillCounter++;
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`[UIManager] Container not found: ${containerId}`);
            return;
        }

        // Create new filter pill with unique ID
        const pillId = `filter-pill-${this.filterPillCounter}`;
        const pillHtml = `
            <div class="filter-pill" id="${pillId}">
                <input type="text" class="filter-input" placeholder="Enter filter...">
                <button class="filter-remove" onclick="this.parentElement.remove()">×</button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', pillHtml);
        
        // Focus the new input
        const newInput = document.querySelector(`#${pillId} .filter-input`);
        if (newInput) {
            newInput.focus();
        }
    }

    /**
     * Handle filter changes
     */
    onFilterChanged() {
        console.log('[UIManager] Filter changed - implement filter logic here');
        // Implement filter application logic
    }

    /**
     * Show settings modal
     */
    showSettings(event) {
        if (event) event.preventDefault();
        
        if (window.SettingsUI) {
            window.SettingsUI.show();
        } else {
            console.error('[UIManager] SettingsUI not available');
        }
    }

    /**
     * Refresh log content
     */
    refreshLog(isRightPanel) {
        const panel = isRightPanel ? 'right' : 'left';
        console.log(`[UIManager] Refreshing ${panel} panel`);
        
        // Emit refresh event for other modules to handle
        CLogApp.utils.emit('refreshRequested', { panel });
    }

    /**
     * Toggle follow mode
     */
    toggleFollow(isRightPanel) {
        const panel = isRightPanel ? 'right' : 'left';
        const followBtn = document.getElementById(
            isRightPanel ? 'followRightBtn' : 'followLeftBtn'
        );
        
        console.log(`[UIManager] Toggling follow mode for ${panel} panel`);
        
        if (followBtn) {
            const isFollowing = followBtn.classList.toggle('active');
            followBtn.textContent = isFollowing ? 'Stop Tail' : 'Tail';
            
            // Emit follow mode change
            CLogApp.utils.emit('followModeChanged', { panel, enabled: isFollowing });
        }
    }

    /**
     * Set log content for a panel - delegates to CodeMirror manager
     */
    setLogContent(panel, content, filename, fileId = null) {
        return this.codemirror.setLogContent(panel, content, filename, fileId);
    }

    /**
     * Offset the gutter line numbers so they reflect each line's position
     * in the full file - delegates to CodeMirror manager
     */
    setLineNumberOffset(panel, offset) {
        return this.codemirror.setLineNumberOffset(panel, offset);
    }

    /**
     * Get log content for a panel - delegates to CodeMirror manager
     */
    getLogContent(panel) {
        return this.codemirror.getLogContent(panel);
    }

    /**
     * Get log lines for a panel - delegates to CodeMirror manager
     */
    getLogLines(panel) {
        return this.codemirror.getLogLines(panel);
    }

    /**
     * Update log highlighting - delegates to CodeMirror manager
     */
    updateLogHighlighting(logContentId) {
        return this.codemirror.updateLogHighlighting(logContentId);
    }

    /**
     * Initialize CodeMirror editors - delegates to CodeMirror manager
     */
    initializeCodeMirrorEditors() {
        return this.codemirror.initializeCodeMirrorEditors();
    }

    /**
     * Show success message - delegates to utils manager
     */
    showSuccessMessage(message) {
        return this.utils.showSuccessMessage(message);
    }

    /**
     * Show error message - delegates to utils manager
     */
    showErrorMessage(message) {
        return this.utils.showErrorMessage(message);
    }

    /**
     * Show info message - delegates to utils manager
     */
    showInfoMessage(message) {
        return this.utils.showInfoMessage(message);
    }

    createModal(title, content, buttons = []) {
        return this.modals.createModal(title, content, buttons);
    }

    closeModal() {
        return this.modals.closeModal();
    }

    /**
     * Update event display - delegates to utils manager
     */
    updateEventDisplay(displayId, eventContent) {
        return this.utils.updateEventDisplay(displayId, eventContent);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
} else if (typeof window !== 'undefined') {
    window.UIManager = UIManager;
}