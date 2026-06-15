/**
 * UIManager Modals - Modal dialog management
 * Handles creation and management of modal dialogs
 */

class UIManagerModals {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    /**
     * Show save state modal
     */
    showSaveStateModal() {
        console.log('[UIManager] Showing save state modal');
        
        const currentState = CLogApp.modules.stateManager.getCurrentState();
        const stateJson = JSON.stringify(currentState, null, 2);
        
        const modal = this.createModal('Save Application State', `
            <div class="save-state-content">
                <p>Enter a name for this state configuration:</p>
                <input type="text" id="stateName" placeholder="Enter state name..." class="state-name-input">
                <p>Current state preview:</p>
                <textarea readonly class="state-preview">${stateJson}</textarea>
            </div>
        `, [
            { text: 'Cancel', class: 'cancel', onclick: () => this.closeModal() },
            { text: 'Save State', class: 'primary', onclick: () => this.doSaveState() }
        ]);
        
        // Focus the name input
        setTimeout(() => {
            const nameInput = document.getElementById('stateName');
            if (nameInput) nameInput.focus();
        }, 100);
    }

    /**
     * Show load state modal
     */
    showLoadStateModal() {
        console.log('[UIManager] Showing load state modal');
        
        // Get saved states
        const savedStates = CLogApp.modules.stateManager.getSavedStates();
        
        let statesHtml = '';
        if (savedStates.length === 0) {
            statesHtml = '<p style="text-align: center; color: #999; padding: 20px;">No saved states found</p>';
        } else {
            statesHtml = savedStates.map(state => `
                <div class="saved-state-item" data-state-id="${state.id}">
                    <div class="state-info">
                        <div class="state-name">${this.uiManager.utils.escapeHtml(state.name)}</div>
                        <div class="state-meta">Saved: ${new Date(state.timestamp).toLocaleString()}</div>
                    </div>
                    <div class="state-actions">
                        <button class="load-state-btn" onclick="CLogApp.modules.uiManager.modals.loadState('${state.id}')">Load</button>
                        <button class="delete-state-btn" onclick="CLogApp.modules.uiManager.modals.deleteState('${state.id}')">Delete</button>
                    </div>
                </div>
            `).join('');
        }
        
        const modal = this.createModal('Load Application State', `
            <div class="load-state-content">
                <div class="saved-states-list">
                    ${statesHtml}
                </div>
                <div style="margin-top: 20px;">
                    <p><strong>Or import state JSON:</strong></p>
                    <textarea id="importStateJson" placeholder="Paste state JSON here..." class="import-state-textarea"></textarea>
                </div>
            </div>
        `, [
            { text: 'Cancel', class: 'cancel', onclick: () => this.closeModal() },
            { text: 'Import JSON', class: 'secondary', onclick: () => this.doLoadState() }
        ]);
    }

    /**
     * Create a modal dialog
     */
    createModal(title, content, buttons = []) {
        // Remove existing modal if any
        this.closeModal();
        
        const modalHtml = `
            <div class="modal-overlay" id="currentModal">
                <div class="modal">
                    <div class="modal-header">
                        <div class="modal-title">${title}</div>
                        <button class="modal-close" onclick="CLogApp.modules.uiManager.modals.closeModal()">×</button>
                    </div>
                    <div class="modal-content">
                        ${content}
                    </div>
                    <div class="modal-buttons">
                        ${buttons.map(btn => `
                            <button class="modal-btn ${btn.class || ''}" onclick="${btn.onclick ? btn.onclick.toString().replace(/^function\s*\(\)\s*{\s*/, '').replace(/\s*}$/, '') : ''}">${btn.text}</button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.uiManager.currentModal = document.getElementById('currentModal');
        
        return this.uiManager.currentModal;
    }

    /**
     * Close current modal
     */
    closeModal() {
        if (this.uiManager.currentModal) {
            this.uiManager.currentModal.remove();
            this.uiManager.currentModal = null;
        }
    }

    /**
     * Execute save state operation
     */
    doSaveState() {
        const nameInput = document.getElementById('stateName');
        const stateName = nameInput ? nameInput.value.trim() : '';
        
        if (!stateName) {
            alert('Please enter a name for the state');
            return;
        }
        
        try {
            const saved = CLogApp.modules.stateManager.saveState(stateName);
            if (saved) {
                this.uiManager.utils.showSuccessMessage(`State "${stateName}" saved successfully`);
                this.closeModal();
            } else {
                alert('Failed to save state. Please try again.');
            }
        } catch (error) {
            console.error('[UIManager] Failed to save state:', error);
            alert(`Failed to save state: ${error.message}`);
        }
    }

    /**
     * Execute load state operation
     */
    doLoadState() {
        const jsonInput = document.getElementById('importStateJson');
        const stateJson = jsonInput ? jsonInput.value.trim() : '';
        
        if (!stateJson) {
            alert('Please paste state JSON to import');
            return;
        }
        
        try {
            const stateData = JSON.parse(stateJson);
            const loaded = CLogApp.modules.stateManager.loadState(stateData);
            if (loaded) {
                this.uiManager.utils.showSuccessMessage('State loaded successfully');
                this.closeModal();
                // Refresh the UI
                setTimeout(() => window.location.reload(), 1000);
            } else {
                alert('Failed to load state. Please check the JSON format.');
            }
        } catch (error) {
            console.error('[UIManager] Failed to load state:', error);
            alert(`Failed to load state: ${error.message}`);
        }
    }

    /**
     * Load a specific saved state
     */
    loadState(stateId) {
        if (confirm('Loading this state will replace your current configuration. Continue?')) {
            try {
                const loaded = CLogApp.modules.stateManager.loadSavedState(stateId);
                if (loaded) {
                    this.uiManager.utils.showSuccessMessage('State loaded successfully');
                    this.closeModal();
                    // Refresh the UI
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    alert('Failed to load state. State may have been deleted.');
                }
            } catch (error) {
                console.error('[UIManager] Failed to load saved state:', error);
                alert(`Failed to load state: ${error.message}`);
            }
        }
    }

    /**
     * Delete a saved state
     */
    deleteState(stateId) {
        if (confirm('Are you sure you want to delete this saved state? This action cannot be undone.')) {
            try {
                const deleted = CLogApp.modules.stateManager.deleteSavedState(stateId);
                if (deleted) {
                    this.uiManager.utils.showSuccessMessage('State deleted successfully');
                    // Refresh the modal
                    this.showLoadStateModal();
                } else {
                    alert('Failed to delete state.');
                }
            } catch (error) {
                console.error('[UIManager] Failed to delete state:', error);
                alert(`Failed to delete state: ${error.message}`);
            }
        }
    }

    /**
     * Show generic confirmation dialog
     */
    showConfirmation(title, message, onConfirm, onCancel = null) {
        const modal = this.createModal(title, `
            <div class="confirmation-content">
                <p>${message}</p>
            </div>
        `, [
            { text: 'Cancel', class: 'cancel', onclick: onCancel || (() => this.closeModal()) },
            { text: 'Confirm', class: 'primary', onclick: () => { onConfirm(); this.closeModal(); } }
        ]);
        
        return modal;
    }

    /**
     * Show generic alert dialog
     */
    showAlert(title, message, onOk = null) {
        const modal = this.createModal(title, `
            <div class="alert-content">
                <p>${message}</p>
            </div>
        `, [
            { text: 'OK', class: 'primary', onclick: () => { if (onOk) onOk(); this.closeModal(); } }
        ]);
        
        return modal;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManagerModals;
} else if (typeof window !== 'undefined') {
    window.UIManagerModals = UIManagerModals;
}