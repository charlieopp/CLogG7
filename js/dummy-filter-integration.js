/**
 * Dummy Filter Integration - App-specific integration for dummy filters
 * Handles initialization and app-specific dummy filter logic
 */

/**
 * Initialize dummy filter system
 */
function initializeDummyFilterSystem() {
    try {
        console.log('[DummyFilter] Initializing dummy filter system...');
        
        // Skip CFSM for now - testing basic functionality
        console.log('[DummyFilter] Skipping CFSM integration for basic testing');
        
        // Create DummyFilterManager for left panel
        const leftContainer = document.getElementById('leftFiltersContainer');
        if (leftContainer) {
            try {
                if (typeof window.createDummyFilterManager === 'function') {
                    const leftFilterManager = window.createDummyFilterManager('leftFiltersContainer', 'left');
                    CLogApp.modules.leftFilterManager = leftFilterManager;
                    console.log('[DummyFilter] Left dummy filter manager created');
                } else {
                    console.warn('[DummyFilter] createDummyFilterManager function not available');
                }
            } catch (filterError) {
                console.error('[DummyFilter] Failed to create left dummy filter manager:', filterError);
            }
        } else {
            console.warn('[DummyFilter] leftFiltersContainer element not found');
        }
        
        console.log('[DummyFilter] Dummy filter system initialized');
        
        // Add a small delay to ensure UI is stable
        setTimeout(() => {
            console.log('[DummyFilter] Dummy filter system stabilized');
        }, 100);
        
    } catch (error) {
        console.error('[DummyFilter] Failed to initialize dummy filter system:', error);
    }
}

/**
 * Initialize right panel dummy filter system (called by panel manager)
 */
function initializeRightPanelDummyFilter() {
    try {
        if (document.getElementById('rightFiltersContainer') && !CLogApp.modules.rightFilterManager) {
            if (typeof window.createDummyFilterManager === 'function') {
                const rightFilterManager = window.createDummyFilterManager('rightFiltersContainer', 'right');
                CLogApp.modules.rightFilterManager = rightFilterManager;
                console.log('[DummyFilter] Right dummy filter manager created');
            } else {
                console.warn('[DummyFilter] createDummyFilterManager function not available for right panel');
            }
        }
    } catch (error) {
        console.error('[DummyFilter] Right panel dummy filter initialization error:', error);
    }
}

/**
 * Apply dummy filters via WebSocket API
 */
function applyDummyFilters(panel, filterManager) {
    try {
        if (!filterManager) {
            console.warn(`[DummyFilter] No filter manager for ${panel} panel`);
            return;
        }

        const filterExpression = filterManager.getFilterExpression();
        console.log(`[DummyFilter] Applying filters for ${panel}:`, filterExpression);

        // Send filter expression to backend via WebSocket
        if (window.ApiClient && typeof window.ApiClient.applyFilters === 'function') {
            window.ApiClient.applyFilters(panel, filterExpression);
        } else {
            console.warn('[DummyFilter] ApiClient not available for filter application');
        }
    } catch (error) {
        console.error(`[DummyFilter] Failed to apply filters for ${panel}:`, error);
    }
}

// Make functions globally available
window.initializeDummyFilterSystem = initializeDummyFilterSystem;
window.initializeRightPanelDummyFilter = initializeRightPanelDummyFilter;
window.applyDummyFilters = applyDummyFilters;