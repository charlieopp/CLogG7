//Globals - Single source of truth for all global state
window.filterCounter = 0;
window.activeTimePill = null;
window.draggedElement = null;

/**
 * FilterManager - Consolidated filter expression management
 * Single source of truth for all filter state and operations
 * Clean API for integration with log system and backend
 */
class FilterManager {
    constructor(instanceId = 'default') {
        this.instanceId = instanceId;
        
        // Initialize modules
        this.state = new FilterState(instanceId);
        this.elements = new FilterElements(this.state, instanceId);
        this.interaction = new FilterInteraction(this.state, this.elements, instanceId);
        this.filterTermsDisable = new FilterTermsDisable(this.state, this.elements, instanceId);
        
        // Sync global state with internal state
        this.state.filterCounter = window.filterCounter;
        this.state.activeTimePill = window.activeTimePill;
        
        this.initialize();
        
        // Register with CFSM if available and attempt to restore state
        if (window.CFSM) {
            window.CFSM.registerInstance(instanceId, this);
        }
    }

    initialize() {
        console.log('FilterManager initializing...');
        
        // Setup container event handling
        const container = this.getContainer();
        if (container) {
            this.interaction.setupContainerEvents(container);
            this.filterTermsDisable.setupContainerEvents(container);
            
            // Coordinate between interaction and filter terms disable modules
            this.coordinateContainerEvents(container);
        }

        console.log('FilterManager initialized');
    }

    /**
     * Coordinate events between interaction and filter terms disable modules
     */
    coordinateContainerEvents(container) {
        // Override the interaction module's click and mousemove handlers
        // to check with filter terms disable first
        const originalHandleContainerClick = this.interaction.handleContainerClick.bind(this.interaction);
        const originalHandleMouseMove = this.interaction.handleMouseMove.bind(this.interaction);
        
        this.interaction.handleContainerClick = (e) => {
            // Let filter terms disable handle first
            const handled = this.filterTermsDisable.handleContainerClick(e);
            if (!handled) {
                // If filter terms disable didn't handle it, use normal interaction
                originalHandleContainerClick(e);
            }
        };
        
        this.interaction.handleMouseMove = (e) => {
            // Let filter terms disable check first
            const shouldHideCursor = this.filterTermsDisable.handleMouseMove(e);
            if (shouldHideCursor) {
                this.interaction.hideInsertionCursor();
            } else {
                // If filter terms disable didn't handle it, use normal interaction
                originalHandleMouseMove(e);
            }
        };
        
        // Set up the filter terms re-enable handler reference
        this.interaction.handleFilterTermsReEnable = (element) => {
            this.filterTermsDisable.handleFilterTermsReEnable(element);
        };
    }

    // ===== PUBLIC API FOR INTEGRATION =====
    
    /**
     * Add a new filter pill
     * @param {string} text - Filter text
     * @param {boolean} isInclude - Include (true) or exclude (false)
     * @param {boolean} isTimeMode - Text mode (false) or time mode (true)
     * @returns {FilterPill} The created filter pill
     */
    addFilter(text = '', isInclude = true, isTimeMode = false) {
        const result = this.elements.addFilter(text, isInclude, isTimeMode);
        
        // Sync global state
        window.filterCounter = this.state.filterCounter;
        
        return result;
    }

    /**
     * Add an operator (AND, OR, NOT, parentheses)
     * @param {string} type - Operator type
     * @returns {Operator} The created operator
     */
    addOperator(type) {
        return this.elements.addOperator(type);
    }

    /**
     * Add operator at specific position
     * @param {string} type - Operator type
     * @param {Element} targetElement - Element to insert relative to
     * @param {boolean} insertBefore - Insert before (true) or after (false)
     * @returns {Operator} The created operator
     */
    addOperatorAtPosition(type, targetElement, insertBefore = true) {
        return this.elements.addOperatorAtPosition(type, targetElement, insertBefore);
    }

    /**
     * Clear all filters and operators
     */
    clearAll() {
        this.elements.clearAll();
        
        // Sync global state
        window.activeTimePill = null;
    }

    /**
     * Get current expression as text (only enabled elements)
     * @returns {string} Expression text
     */
    getExpressionText() {
        return this.state.getExpressionText();
    }

    /**
     * Get current expression as JSON (for save/load)
     * @returns {Object} Expression data
     */
    getExpressionData() {
        return this.state.getExpressionData();
    }

    /**
     * Load expression from JSON data
     * @param {Object} data - Expression data
     */
    loadExpressionData(data) {
        // Note: This method calls addFilter/addOperator which need to be available
        // We need to bind the methods to the elements module
        const originalAddFilter = this.addFilter.bind(this);
        const originalAddOperator = this.addOperator.bind(this);
        
        // Temporarily override state methods to use elements
        this.state.addFilter = originalAddFilter;
        this.state.addOperator = originalAddOperator;
        this.state.clearAll = () => this.clearAll();
        this.state.toggleFilters = (enabled) => this.toggleFilters(enabled);
        
        try {
            this.state.loadExpressionData(data);
        } finally {
            // Restore original methods
            delete this.state.addFilter;
            delete this.state.addOperator;
            delete this.state.clearAll;
            delete this.state.toggleFilters;
        }
    }

    /**
     * Toggle filters enabled/disabled
     * @param {boolean} enabled - Optional explicit state
     */
    toggleFilters(enabled = null) {
        this.elements.toggleFilters(enabled);
    }

    /**
     * Validate expression syntax (only enabled elements)
     * @param {string} expr - Expression text to validate
     * @returns {boolean} True if valid
     */
    validateExpressionSyntax(expr = null) {
        return this.state.validateExpressionSyntax(expr);
    }

    // ===== PROXY METHODS FOR INTERACTION MODULE =====

    /**
     * Handle disable selected terms button click
     */
    handleDisableSelectedTerms() {
        this.filterTermsDisable.handleDisableSelectedTerms();
    }

    /**
     * Handle delete selected terms (for Delete key or delete button)
     */
    handleDeleteSelectedTerms() {
        this.filterTermsDisable.handleDeleteSelectedTerms();
    }

    // ===== STATE MANAGEMENT API =====

    /**
     * Export complete state for external storage
     * @returns {Object} Complete state object for this instance
     */
    exportState() {
        return this.state.getExpressionData();
    }

    /**
     * Import and restore state from external source
     * @param {Object} stateData - State object to restore
     * @returns {boolean} True if restore was successful
     */
    importState(stateData) {
        try {
            this.loadExpressionData(stateData);
            
            // Update expression preview after import (especially important for disabled terms)
            this.elements.updateExpressionPreview();
            
            return true;
        } catch (error) {
            console.error(`❌ Failed to import state for instance ${this.instanceId}:`, error);
            return false;
        }
    }

    /**
     * Check if this instance has any content (for save decisions)
     * @returns {boolean} True if instance has filters, operators, or disabled terms
     */
    hasContent() {
        return this.state.expression.length > 0 || this.state.disabledFilterTerms.length > 0;
    }

    /**
     * Push current state to CFSM
     */
    pushStateToCFSM() {
        if (window.CFSM) {
            window.CFSM.pushState(this.instanceId);
        }
    }

    /**
     * Cleanup when instance is destroyed
     */
    destroy() {
        if (window.CFSM) {
            window.CFSM.unregisterInstance(this.instanceId);
        }
    }

    /**
     * Handle click on disabled filter terms to re-enable it
     * @param {Element} element - Any element in the disabled filter terms
     */
    handleFilterTermsReEnable(clickedElement) {
        this.filterTermsDisable.handleFilterTermsReEnable(clickedElement);
    }

    /**
     * Handle log click for time selection
     * @param {Event} e - Click event
     */
    handleLogClick(e) {
        this.interaction.handleLogClick(e);
    }

    /**
     * Clear drag selection
     */
    clearDragSelection() {
        this.filterTermsDisable.clearDragSelection();
    }

    /**
     * Debug method to show enabled vs total elements
     */
    debugExpressionState() {
        this.state.debugExpressionState();
    }

    // ===== GETTERS FOR COMPATIBILITY =====

    get expression() {
        return this.state.expression;
    }

    get filtersEnabled() {
        return this.state.filtersEnabled;
    }

    get filterCounter() {
        return this.state.filterCounter;
    }

    get activeTimePill() {
        return this.state.activeTimePill;
    }

    set activeTimePill(value) {
        this.state.activeTimePill = value;
        window.activeTimePill = value;
    }

    get isDragSelecting() {
        return this.filterTermsDisable.isDragSelecting;
    }

    get isCtrlHeld() {
        return this.filterTermsDisable.isCtrlHeld;
    }

    get dragStarted() {
        return this.filterTermsDisable.dragStarted;
    }

    get selectedElements() {
        return this.filterTermsDisable.selectedElements;
    }

    get disabledFilterTerms() {
        return this.state.disabledFilterTerms;
    }
    
    getContainer() {
        return document.getElementById(`filtersContainer_${this.instanceId}`) || document.getElementById('filtersContainer');
    }
}

// Export for other modules
window.FilterManager = FilterManager;