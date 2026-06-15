// CLog Filter System Integration
// Adapts the standalone filter system to work with CLog's structure

class CLogFilterIntegration {
    static initialize() {
        console.log('Initializing CLog filter integration...');
        
        // Override container detection for CLog
        this.setupCLogContainers();
        
        // Initialize the filter system with CLog-specific settings
        this.initializeFilterSystem();
        
        console.log('CLog filter integration complete');
    }
    
    static setupCLogContainers() {
        // Find CLog's filter containers
        const leftContainer = document.getElementById('leftFiltersContainer');
        const rightContainer = document.getElementById('rightFiltersContainer');
        
        if (leftContainer) {
            this.setupContainerForFilters(leftContainer);
        }
        
        if (rightContainer) {
            this.setupContainerForFilters(rightContainer);
        }
    }
    
    static setupContainerForFilters(container) {
        // Add the filters-container class so the filter system recognizes it
        container.classList.add('filters-container');
        
        // Set up click handlers using ExpressionManager
        container.addEventListener('click', (e) => ExpressionManager.handleContainerClick(e));
        container.addEventListener('click', (e) => ExpressionManager.handleOperatorClick(e));
        
        // Add placeholder if empty
        if (container.children.length === 0) {
            container.innerHTML = '<div class="placeholder-text" style="color: var(--text-muted); font-style: italic; pointer-events: none; user-select: none;">Click "Add Filter" to create filter pills, or click anywhere here to add operators</div>';
        }
        
        console.log('Setup container:', container.id);
    }
    
    static initializeFilterSystem() {
        // Don't call the main.js initialization since CLog handles its own buttons
        // Just initialize the time spinners
        if (window.TimeInputSpinner) {
            TimeInputSpinner.initializeSpinners();
        }
        
        // Set up keyboard shortcuts that won't conflict with CLog
        document.addEventListener('keydown', this.handleCLogKeydown);
    }
    
    static handleCLogKeydown(e) {
        // Only handle shortcuts when not typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch(e.key) {
            case 'Escape':
                // Close any open time pickers
                document.querySelectorAll('.inline-time-picker.show').forEach(picker => {
                    picker.classList.remove('show');
                    picker.closest('.filter-pill').classList.remove('time-picker-open');
                });
                
                // Deselect operators
                document.querySelectorAll('.operator.selected').forEach(op => {
                    op.classList.remove('selected');
                });
                
                // Hide spinners
                if (window.TimeInputSpinner) {
                    TimeInputSpinner.hideSpinner();
                }
                
                window.activeTimePill = null;
                if (window.OperatorManager) {
                    OperatorManager.hideOperatorInput();
                }
                break;
        }
    }
}

// Initialize when this script loads
console.log('CLog filter integration loaded, initializing...');
CLogFilterIntegration.initialize();