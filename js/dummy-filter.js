/**
 * DummyFilterManager - Simple pass-through filter for testing infrastructure
 * Implements the CFSM interface and JSON format without actual filtering
 */

/**
 * Dummy FilterPill class - passes everything through
 */
class FilterPill {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            initialText: options.initialText || '',
            isInclude: options.isInclude !== false,
            enabled: options.enabled !== false,
            isTimeMode: options.isTimeMode || false,
            fullTimeStr: options.fullTimeStr || '',
            onDelete: options.onDelete || (() => {}),
            onChange: options.onChange || (() => {})
        };
    }

    getState() {
        return {
            text: this.options.initialText,
            isInclude: this.options.isInclude,
            enabled: this.options.enabled,
            isTimeMode: this.options.isTimeMode,
            fullTimeStr: this.options.fullTimeStr
        };
    }

    destroy() {
        // Dummy implementation
    }
}

class DummyFilterManager {
    constructor(containerId, panelId = 'left') {
        this.containerId = containerId;
        this.panelId = panelId;
        this.container = document.getElementById(containerId);
        this.enabled = true;
        this.onChange = null; // Will be set by CFSM
        
        if (!this.container) {
            throw new Error(`Filter container not found: ${containerId}`);
        }
        
        this.setupUI();
        console.log(`[DummyFilterManager] Initialized for ${containerId} (${panelId})`);
    }

    /**
     * Setup UI with on/off toggle and apply button
     */
    setupUI() {
        // Mark container as protected
        this.container.dataset.dummyFilter = 'true';
        
        // Add dummy filter controls to the existing filter container
        this.container.innerHTML = `
            <div class="dummy-filter-controls">
                <div class="dummy-control-row">
                    <label class="dummy-filter-toggle">
                        <input type="checkbox" id="${this.containerId}-toggle" ${this.enabled ? 'checked' : ''}>
                        <span class="toggle-label">Filter ${this.enabled ? 'ON' : 'OFF'}</span>
                    </label>
                    <button class="dummy-apply-btn" id="${this.containerId}-apply">Apply</button>
                </div>
                <div class="dummy-status-row">
                    <span class="dummy-status">${this.enabled ? 'Filtering enabled' : 'Pass all logs'}</span>
                </div>
            </div>
            <div class="dummy-pills-area" id="${this.containerId}-pills">
                <!-- Future filter pills will go here -->
                <div class="dummy-pill-placeholder">
                    JSON: <code>${JSON.stringify(this.getFilterExpression(), null, 2)}</code>
                </div>
            </div>
        `;

        // Setup event listeners
        const toggle = document.getElementById(`${this.containerId}-toggle`);
        const applyBtn = document.getElementById(`${this.containerId}-apply`);
        
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                console.log(`[DummyFilterManager] Toggle changed for ${this.containerId}: ${e.target.checked}, was: ${this.enabled}`);
                this.enabled = e.target.checked;
                this.updateStatus();
                if (this.onChange) {
                    this.onChange();
                }
            });
            
            // Also add click handler to be sure
            toggle.addEventListener('click', (e) => {
                console.log(`[DummyFilterManager] Toggle clicked for ${this.containerId}: ${e.target.checked}`);
                // Let the change event handle the logic
            });
        }
        
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applyToBackend();
            });
        }

        // Protect against container being cleared
        this.setupContainerProtection();
    }

    /**
     * Protect container from being cleared by other code
     */
    setupContainerProtection() {
        // Monitor for changes to container content
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Check if our content was removed
                    const hasDummyContent = this.container.querySelector('.dummy-filter-controls');
                    if (!hasDummyContent && this.container.dataset.dummyFilter === 'true') {
                        console.warn(`[DummyFilterManager] Container ${this.containerId} content was cleared, restoring...`);
                        setTimeout(() => {
                            console.log(`[DummyFilterManager] Restoring UI for ${this.containerId}, current enabled state: ${this.enabled}`);
                            this.setupUI();
                        }, 50);
                    }
                }
            });
        });

        observer.observe(this.container, {
            childList: true,
            subtree: false
        });

        console.log(`[DummyFilterManager] Container protection enabled for ${this.containerId}`);
    }

    /**
     * Update status display
     */
    updateStatus() {
        const status = this.container.querySelector('.dummy-status');
        const controls = this.container.querySelector('.dummy-filter-controls');
        const label = this.container.querySelector('.toggle-label');
        const jsonDisplay = this.container.querySelector('.dummy-pill-placeholder code');
        const toggle = this.container.querySelector(`#${this.containerId}-toggle`);
        
        // Ensure checkbox state matches internal state
        if (toggle && toggle.checked !== this.enabled) {
            toggle.checked = this.enabled;
            console.log(`[DummyFilterManager] Synced toggle state for ${this.containerId}: ${this.enabled}`);
        }
        
        if (status) {
            status.textContent = this.enabled ? 'Filtering enabled' : 'Pass all logs';
        }
        
        if (controls) {
            controls.classList.toggle('disabled', !this.enabled);
        }
        
        if (label) {
            label.textContent = `Filter ${this.enabled ? 'ON' : 'OFF'}`;
        }
        
        if (jsonDisplay) {
            jsonDisplay.textContent = JSON.stringify(this.getFilterExpression(), null, 2);
        }
    }

    /**
     * Apply filter to backend via WebSocket
     */
    applyToBackend() {
        try {
            const filterExpression = this.getFilterExpression();
            console.log(`[DummyFilterManager] Applying filter to backend for ${this.panelId}:`, filterExpression);
            
            // Send to backend via CLogApp event system
            if (window.CLogApp && window.CLogApp.utils && window.CLogApp.utils.emit) {
                window.CLogApp.utils.emit('filtersChanged', {
                    panel: this.panelId,
                    filters: filterExpression
                });
                
                // Show visual feedback
                const applyBtn = document.getElementById(`${this.containerId}-apply`);
                if (applyBtn) {
                    const originalText = applyBtn.textContent;
                    applyBtn.textContent = 'Applied!';
                    applyBtn.style.background = 'var(--accent-green)';
                    
                    setTimeout(() => {
                        applyBtn.textContent = originalText;
                        applyBtn.style.background = '';
                    }, 1000);
                }
                
                console.log(`[DummyFilterManager] Filter applied successfully for ${this.panelId}`);
            } else {
                console.warn('[DummyFilterManager] CLogApp event system not available');
            }
            
        } catch (error) {
            console.error(`[DummyFilterManager] Failed to apply filter for ${this.panelId}:`, error);
        }
    }

    /**
     * Required by CFSM: Export current state
     */
    exportState() {
        return {
            version: "1.0",
            enabled: this.enabled,
            expression: [] // Empty expression = pass everything
        };
    }

    /**
     * Required by CFSM: Import state
     */
    importState(state) {
        if (!state || typeof state !== 'object') {
            console.warn('[DummyFilterManager] Invalid state for import');
            return;
        }

        this.enabled = state.enabled !== false; // Default to true
        
        // Update UI
        const toggle = document.getElementById(`${this.containerId}-toggle`);
        if (toggle) {
            toggle.checked = this.enabled;
        }
        this.updateStatus();
        
        console.log(`[DummyFilterManager] Imported state for ${this.containerId}:`, state);
    }

    /**
     * Required by CFSM: Check if has content
     */
    hasContent() {
        // For dummy filter, "has content" means it's enabled
        return this.enabled;
    }

    /**
     * Get filter expression for backend (always pass-through)
     */
    getFilterExpression() {
        return {
            version: "1.0",
            enabled: this.enabled,
            expression: [] // Empty = pass everything
        };
    }

    /**
     * Enable/disable the filter
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        const toggle = document.getElementById(`${this.containerId}-toggle`);
        if (toggle) {
            toggle.checked = this.enabled;
        }
        this.updateStatus();
        
        if (this.onChange) {
            this.onChange();
        }
    }

    /**
     * Get current enabled state
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Clear/reset filter
     */
    clear() {
        this.setEnabled(false);
    }
}

// Global registry for DummyFilterManager instances
window.DummyFilterManagers = window.DummyFilterManagers || {};

// Helper function to create and register DummyFilterManager
window.createDummyFilterManager = function(containerId, panelId) {
    try {
        const manager = new DummyFilterManager(containerId, panelId);
        window.DummyFilterManagers[containerId] = manager;
        
        // CFSM integration disabled for now - skip registration
        console.log(`[DummyFilterManager] CFSM integration disabled for ${containerId}`);
        
        return manager;
    } catch (error) {
        console.error(`[DummyFilterManager] Failed to create DummyFilterManager for ${containerId}:`, error);
        throw error;
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DummyFilterManager;
}