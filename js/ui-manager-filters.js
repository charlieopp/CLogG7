/**
 * UI Manager - Filter Controls
 * Handles filter-related UI operations
 */

class UIManagerFilters {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    /**
     * Toggle filters
     */
    toggleFilters(isRightPanel) {
        const filterCheckbox = document.getElementById(
            isRightPanel ? 'rightFilterCheckbox' : 'leftFilterCheckbox'
        );

        if (filterCheckbox) {
            filterCheckbox.classList.toggle('checked');
            const isEnabled = filterCheckbox.classList.contains('checked');
            
            console.log(`[UIManager] Filters ${isEnabled ? 'enabled' : 'disabled'} for ${isRightPanel ? 'right' : 'left'} panel`);
            
            CLogApp.utils.emit('filtersToggled', {
                panel: isRightPanel ? 'right' : 'left',
                enabled: isEnabled
            });
        }
    }

    /**
     * Add filter pill - UPDATED FOR COMPACT FILTERS
     */
    addFilterPill(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`[UIManager] Filter container not found: ${containerId}`);
            return;
        }

        const isRightPanel = containerId.includes('right');
        
        try {
            // Create compact filter pill
            const filterPill = new CompactFilterPill(container, {
                onChange: (state) => {
                    console.log('[UIManager] Compact filter pill changed:', state);
                    this.onFilterChanged(isRightPanel);
                }
            });
            
            this.onFilterChanged(isRightPanel);
            
            console.log(`[UIManager] Compact filter pill added to ${containerId}`);
            
        } catch (error) {
            console.error('[UIManager] Failed to create compact filter pill:', error);
        }
    }

    /**
     * Handle filter changes
     */
    onFilterChanged(isRightPanel) {
        const containerId = isRightPanel ? 'rightFiltersContainer' : 'leftFiltersContainer';
        const filters = CLogApp.modules.stateManager.getFiltersState(containerId);
        
        CLogApp.utils.emit('filtersChanged', {
            panel: isRightPanel ? 'right' : 'left',
            filters: filters
        });
    }
}

// Export for use in other modules
window.UIManagerFilters = UIManagerFilters;