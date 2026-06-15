/**
 * FilterTermsDisable - Handles drag-to-select functionality and filter terms disable/enable operations
 * Manages Ctrl+drag selection, filter terms management, and related UI interactions
 */
class FilterTermsDisable {
    constructor(filterState, filterElements, instanceId = 'default') {
        this.filterState = filterState;
        this.filterElements = filterElements;
        this.instanceId = instanceId;
        
        // Drag-to-select state
        this.isDragSelecting = false;
        this.isCtrlHeld = false;
        this.dragStarted = false;
        this.selectedElements = new Set(); // Track currently selected elements
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Global key event listeners for Ctrl detection
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    setupContainerEvents(container) {
        if (!container) return;
        
        // Add drag-to-select event listeners
        container.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        container.addEventListener('mousemove', (e) => this.handleDragMove(e));
        container.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }

    // Key event handlers for Ctrl detection
    handleKeyDown(e) {
        if (e.key === 'Control') {
            this.isCtrlHeld = true;
            
            // Add visual feedback to container
            const container = this.getContainer();
            if (container) {
                container.classList.add('ctrl-drag-mode');
            }
            
            //console.log('🎯 Ctrl key pressed - drag-to-select mode enabled');
        }
    }

    handleKeyUp(e) {
        if (e.key === 'Control') {
            this.isCtrlHeld = false;
            this.isDragSelecting = false;
            this.dragStarted = false;
            
            // Remove visual feedback from container
            const container = this.getContainer();
            if (container) {
                container.classList.remove('ctrl-drag-mode');
            }
            
            // DON'T clear selection when Ctrl is released - let it persist
            console.log('🎯 Ctrl key released - selection persists');
        }
        
        // Clear selection on ESC key
        if (e.key === 'Escape') {
            this.clearDragSelection();
            console.log('🎯 ESC pressed - cleared selection');
        }
    }

    // Mouse event handlers for drag-to-select
    handleMouseDown(e) {
        if (!this.isCtrlHeld) return;
        
        // Only start drag selection if Ctrl is held
        this.dragStarted = true;
        console.log('🎯 Mouse down with Ctrl - potential drag selection start');
        
        // Prevent default to avoid text selection
        e.preventDefault();
    }

    handleDragMove(e) {
        if (!this.isCtrlHeld || !this.dragStarted) return;
        
        if (!this.isDragSelecting) {
            this.isDragSelecting = true;
            console.log('🎯 Drag selection started');
            
            // Clear any previous selection
            this.clearDragSelection();
        }
        
        // Find element under mouse cursor
        const elementUnderMouse = this.getSelectableElementAt(e.clientX, e.clientY);
        if (elementUnderMouse) {
            this.addToSelection(elementUnderMouse);
            //console.log('🎯 Selected element:', elementUnderMouse.className);
        }
    }

    handleMouseUp(e) {
        if (this.isDragSelecting) {
            console.log('🎯 Drag selection ended. Selected elements:', this.selectedElements.size);
            
            // Log what was selected
            this.selectedElements.forEach(element => {
                console.log('  - Selected:', element.className, element.textContent?.trim());
            });
        }
        
        this.isDragSelecting = false;
        this.dragStarted = false;
    }

    // Handle container click for selection clearing and Ctrl mode
    handleContainerClick(e) {
        // Clear selection if clicking in empty space (not on pills/operators)
        if (!this.isCtrlHeld && !e.target.closest('.filter-pill, .operator, .placeholder-text')) {
            if (this.selectedElements.size > 0) {
                console.log('🎯 Clicked in empty space - clearing selection');
                this.clearDragSelection();
                return true; // Signal that we handled this click
            }
        }
        
        // Don't trigger operator popup if Ctrl is held (drag-to-select mode)
        if (this.isCtrlHeld) {
            console.log('🎯 Container click ignored - Ctrl held (drag-to-select mode)');
            return true; // Signal that we handled this click
        }
        
        return false; // Let normal interaction handle this
    }

    // Handle mouse move for Ctrl mode
    handleMouseMove(e) {
        // Don't show insertion cursor if Ctrl is held (drag-to-select mode)
        if (this.isCtrlHeld) {
            return true; // Signal to hide insertion cursor
        }
        
        return false; // Let normal interaction handle this
    }

    /**
     * Get the selectable element at the given screen coordinates
     * @param {number} x - Screen X coordinate
     * @param {number} y - Screen Y coordinate
     * @returns {Element|null} The selectable element or null
     */
    getSelectableElementAt(x, y) {
        const elementAtPoint = document.elementFromPoint(x, y);
        if (!elementAtPoint) return null;
        
        // Find the closest selectable element (filter pill or operator)
        const selectableElement = elementAtPoint.closest('.filter-pill, .operator');
        
        // Make sure it's in our container
        const container = this.getContainer();
        if (selectableElement && container && container.contains(selectableElement)) {
            return selectableElement;
        }
        
        return null;
    }

    /**
     * Add an element to the current selection
     * @param {Element} element - Element to select
     */
    addToSelection(element) {
        if (this.selectedElements.has(element)) return; // Already selected
        
        this.selectedElements.add(element);
        element.classList.add('drag-selected');
        
        // Update disable button state
        this.updateDisableButtonState();
        
        //console.log('🔥 Added to selection:', element.className);
    }

    /**
     * Clear all drag selection
     */
    clearDragSelection() {
        console.log('🧹 Clearing drag selection');
        
        this.selectedElements.forEach(element => {
            element.classList.remove('drag-selected');
        });
        
        this.selectedElements.clear();
        
        // Update disable button state
        this.updateDisableButtonState();
    }

    /**
     * Update the state of the disable selected terms button
     */
    updateDisableButtonState() {
        const disableBtn = this.getDisableButton();
        if (disableBtn) {
            const hasSelection = this.selectedElements.size > 0;
            disableBtn.disabled = !hasSelection;
            disableBtn.textContent = hasSelection ? 
                `Disable Selected Terms (${this.selectedElements.size})` : 
                'Disable Selected Terms';
            
            console.log('🔘 Disable button state:', hasSelection ? 'enabled' : 'disabled');
        }
    }

    /**
     * Handle disable selected terms button click - actually disable the selected elements
     */
    handleDisableSelectedTerms() {
        if (this.selectedElements.size === 0) {
            alert('No elements selected!');
            return;
        }

        // Create a new disabled filter terms group from currently selected elements
        const newDisabledFilterTerms = new Set([...this.selectedElements]);
        this.filterState.disabledFilterTerms.push(newDisabledFilterTerms);
        
        // Apply disabled styling to the elements
        newDisabledFilterTerms.forEach(element => {
            element.classList.add('filter-terms-disabled');
            element.dataset.filterTermsId = this.filterState.disabledFilterTerms.length - 1;
        });
        
        console.log(`🚫 Disabled filter terms with ${newDisabledFilterTerms.size} elements`);
        
        // Clear the selection
        this.clearDragSelection();

        this.filterElements.updateExpressionPreview();
    }

    /**
     * Handle delete selected terms (for Delete key or delete button)
     */
    handleDeleteSelectedTerms() {
        if (this.selectedElements.size === 0) {
            console.log('❌ No elements selected for deletion!');
            return;
        }

        console.log(`🗑️ Deleting ${this.selectedElements.size} selected elements`);

        // Store elements to delete (since we'll be modifying the DOM)
        const elementsToDelete = [...this.selectedElements];
        
        // Clear selection first
        this.clearDragSelection();

        // Delete each selected element
        elementsToDelete.forEach(element => {
            // Find the pill or operator instance in the expression
            const expressionItem = this.filterState.expression.find(item => item.element === element);
            
            if (expressionItem) {
                console.log(`  - Deleting: ${element.className}`);
                
                // Remove from DOM
                element.remove();
                
                // Remove from expression array
                const index = this.filterState.expression.indexOf(expressionItem);
                if (index > -1) {
                    this.filterState.expression.splice(index, 1);
                }
                
                // If it was a FilterPill or TimePill, call their cleanup
                if (expressionItem.cleanup && typeof expressionItem.cleanup === 'function') {
                    expressionItem.cleanup();
                }
            } else {
                console.log(`  - Warning: Could not find expression item for element: ${element.className}`);
                // Still remove from DOM as fallback
                element.remove();
            }
        });

        console.log(`✅ Deleted ${elementsToDelete.length} elements`);
        
        // Update expression preview and check for placeholder
        this.filterElements.updateExpressionPreview();
        this.filterElements.checkForPlaceholder();
    }

    /**
     * Handle click on disabled filter terms to re-enable it
     * @param {Element} element - Any element in the disabled filter terms group
     */
    handleFilterTermsReEnable(clickedElement) {
        console.log('🔄 Re-enabling filter terms containing element:', clickedElement.className);
        
        // Check if the filter system is enabled (modal toggle is ON)
        const modalToggle = document.getElementById(`modalToggle_${this.instanceId}`) || document.getElementById('modalToggle');
        if (modalToggle && modalToggle.classList.contains('off')) {
            console.log('❌ Cannot re-enable filter terms - system is OFF');
            return;
        }
        
        // Find which disabled filter terms group contains this element
        const filterTermsId = clickedElement.dataset.filterTermsId;
        if (filterTermsId === undefined) {
            console.log('❌ No filter terms ID found on element');
            return;
        }
        
        const filterTermsIndex = parseInt(filterTermsId);
        const filterTerms = this.filterState.disabledFilterTerms[filterTermsIndex];
        
        if (!filterTerms) {
            console.log('❌ No filter terms found at index:', filterTermsIndex);
            return;
        }
        
        console.log(`✅ Re-enabling filter terms ${filterTermsIndex} with ${filterTerms.size} elements`);
        
        // Re-enable all elements in the filter terms group
        filterTerms.forEach(element => {
            console.log(`  - Re-enabling: ${element.className}`);
            element.classList.remove('filter-terms-disabled');
            delete element.dataset.filterTermsId;
            
            // Clear any selection on the element
            element.classList.remove('selected');
            element.blur(); // Remove focus as well
        });
        
        // Remove from disabled filter terms array
        this.filterState.disabledFilterTerms.splice(filterTermsIndex, 1);
        
        // Update filter terms IDs for remaining groups (reindex)
        this.filterState.disabledFilterTerms.forEach((terms, newIndex) => {
            terms.forEach(el => {
                el.dataset.filterTermsId = newIndex;
            });
        });
        
        console.log(`✅ Filter terms re-enabled. Remaining disabled filter terms: ${this.filterState.disabledFilterTerms.length}`);
        this.filterElements.updateExpressionPreview();
    }

    getContainer() {
        return document.getElementById(`filtersContainer_${this.instanceId}`) || document.getElementById('filtersContainer');
    }
    
    getDisableButton() {
        return document.getElementById(`disableSelectedTermsBtn_${this.instanceId}`) || document.getElementById('disableSelectedTermsBtn');
    }
}

// Export for other modules
window.FilterTermsDisable = FilterTermsDisable;