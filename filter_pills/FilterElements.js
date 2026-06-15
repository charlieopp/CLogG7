/**
 * FilterElements - Manages filter and operator element creation, placement, and DOM operations
 * Handles element lifecycle, placeholder management, and expression preview updates
 */
class FilterElements {
    constructor(filterState, instanceId = 'default') {
        this.filterState = filterState;
        this.instanceId = instanceId;
    }

    /**
     * Add a new filter pill
     * @param {string} text - Filter text
     * @param {boolean} isInclude - Include (true) or exclude (false)
     * @param {boolean} isTimeMode - Text mode (false) or time mode (true)
     * @returns {FilterPill} The created filter pill
     */
    addFilter(text = '', isInclude = true, isTimeMode = false) {
        const container = this.getContainer();
        if (!container) return null;
        
        const pill = new FilterPill(container, {
            initialText: text || `filter${++this.filterState.filterCounter}`,
            isInclude: isInclude,
            isTimeMode: isTimeMode,
            instanceId: this.instanceId,
            onDelete: (pill) => this.handlePillDelete(pill),
            onChange: () => this.updateExpressionPreview()
        });
        
        this.filterState.expression.push(pill);
        this.removePlaceholder();
        this.updateExpressionPreview();
        
        // Focus the input if it's a new empty filter
        if (!text) {
            const input = pill.element.querySelector('.filter-entry');
            setTimeout(() => input?.focus(), 100);
        }
        
        return pill;
    }

    /**
     * Add an operator (AND, OR, NOT, parentheses)
     * @param {string} type - Operator type
     * @returns {Operator} The created operator
     */
    addOperator(type) {
        const container = this.getContainer();
        if (!container) return null;
        
        const operator = new Operator(type, this.instanceId);
        this.filterState.expression.push(operator);
        this.removePlaceholder();
        container.appendChild(operator.element);
        this.updateExpressionPreview();
        return operator;
    }

    /**
     * Add operator at specific position
     * @param {string} type - Operator type
     * @param {Element} targetElement - Element to insert relative to
     * @param {boolean} insertBefore - Insert before (true) or after (false)
     * @returns {Operator} The created operator
     */
    addOperatorAtPosition(type, targetElement, insertBefore = true) {
        const container = this.getContainer();
        if (!container) return null;
        
        const operator = new Operator(type, this.instanceId);
        this.removePlaceholder();
        
        if (targetElement && insertBefore) {
            container.insertBefore(operator.element, targetElement);
            const targetIndex = this.filterState.expression.findIndex(item => item.element === targetElement);
            if (targetIndex >= 0) {
                this.filterState.expression.splice(targetIndex, 0, operator);
            } else {
                this.filterState.expression.push(operator);
            }
        } else if (targetElement && !insertBefore) {
            const nextSibling = targetElement.nextSibling;
            if (nextSibling) {
                container.insertBefore(operator.element, nextSibling);
            } else {
                container.appendChild(operator.element);
            }
            
            const targetIndex = this.filterState.expression.findIndex(item => item.element === targetElement);
            if (targetIndex >= 0) {
                this.filterState.expression.splice(targetIndex + 1, 0, operator);
            } else {
                this.filterState.expression.push(operator);
            }
        } else {
            this.filterState.expression.push(operator);
            container.appendChild(operator.element);
        }
        
        this.updateExpressionPreview();
        return operator;
    }

    /**
     * Clear all filters and operators
     */
    clearAll() {
        console.log('🧹 Starting comprehensive clearAll operation...');
        
        // Clean up existing elements
        this.filterState.expression.forEach(item => {
            if (item.element && item.element.parentNode) {
                item.element.remove();
            }
        });
        
        // Clear all state arrays
        this.filterState.expression.length = 0;
        this.filterState.activeTimePill = null;
        this.filterState.disabledFilterTerms.length = 0; // Clear disabled filter terms
        window.activeTimePill = null;
        
        // Clear any selection state from FilterTermsDisable
        const filterManager = window[`filterManager_${this.instanceId}`] || window.filterManager;
        if (filterManager?.filterTermsDisable) {
            filterManager.filterTermsDisable.selectedElements.clear();
            filterManager.filterTermsDisable.updateDisableButtonState();
        }
        
        // Reset container to pristine state
        const container = this.getContainer();
        if (container) {
            container.innerHTML = '<div class="placeholder-text" style="color: var(--text-muted); font-style: italic; pointer-events: none; user-select: none;">Click "Add Filter" to create filter pills, or click anywhere here to add operators</div>';
            
            // Remove any drag selection styling
            container.classList.remove('ctrl-drag-mode');
        }
        
        // Close any open time pickers in this instance
        if (container) {
            container.querySelectorAll('.inline-time-picker.show').forEach(picker => {
                picker.classList.remove('show');
                picker.closest('.filter-pill').classList.remove('time-picker-open');
            });
        }
        
        // Close operator input if open
        if (window.OperatorPopup && window.OperatorPopup.hideOperatorInput) {
            window.OperatorPopup.hideOperatorInput();
        }
        
        // Reset filters to enabled state
        this.filterState.filtersEnabled = true;
        const toggle = this.getToggleButton();
        if (toggle) {
            toggle.classList.add('toggle-active');
            toggle.textContent = 'Filters';
        }
        
        // Reset container opacity
        if (container) {
            container.style.opacity = '1';
        }
        
        this.updateExpressionPreview();
        
        console.log('✅ Comprehensive clearAll completed');
        console.log('🔍 Final state after clear:');
        console.log('  - expression.length:', this.filterState.expression.length);
        console.log('  - disabledFilterTerms.length:', this.filterState.disabledFilterTerms.length);
        console.log('  - container innerHTML:', container ? container.innerHTML.substring(0, 100) + '...' : 'no container');
    }

    /**
     * Toggle filters enabled/disabled
     * @param {boolean} enabled - Optional explicit state
     */
    toggleFilters(enabled = null) {
        if (enabled !== null) {
            this.filterState.filtersEnabled = enabled;
        } else {
            this.filterState.filtersEnabled = !this.filterState.filtersEnabled;
        }
        
        const toggle = this.getToggleButton();
        if (toggle) {
            if (this.filterState.filtersEnabled) {
                toggle.classList.add('toggle-active');
                toggle.textContent = 'Filters';
            } else {
                toggle.classList.remove('toggle-active');
                toggle.textContent = 'Filters (Disabled)';
            }
        }
        
        // Visual feedback
        const container = this.getContainer();
        if (container) {
            container.style.opacity = this.filterState.filtersEnabled ? '1' : '0.5';
        }
    }

    getContainer() {
        return document.getElementById(`filtersContainer_${this.instanceId}`) || document.getElementById('filtersContainer');
    }
    
    getToggleButton() {
        return document.getElementById(`filtersToggle_${this.instanceId}`) || document.getElementById('filtersToggle');
    }

    removePlaceholder() {
        const container = this.getContainer();
        if (container) {
            const placeholder = container.querySelector('.placeholder-text');
            if (placeholder) {
                placeholder.remove();
            }
        }
    }

    handlePillDelete(pill) {
        const index = this.filterState.expression.indexOf(pill);
        if (index > -1) {
            this.filterState.expression.splice(index, 1);
        }
        this.updateExpressionPreview();
        this.checkForPlaceholder();
    }

    checkForPlaceholder() {
        const container = this.getContainer();
        if (container) {
            const remainingElements = container.querySelectorAll('.filter-pill, .operator');
            if (remainingElements.length === 0) {
                container.innerHTML = '<div class="placeholder-text" style="color: var(--text-muted); font-style: italic; pointer-events: none; user-select: none;">Click "Add Filter" to create filter pills, or click anywhere here to add operators</div>';
            }
        }
    }

    updateExpressionPreview() {
        // Only update the expression preview for this specific instance
        const instancePreview = document.getElementById(`expressionPreview_${this.instanceId}`) || 
                               document.getElementById('expressionPreview');
        
        if (!instancePreview) {
            console.warn(`No expression preview found for instance: ${this.instanceId}`);
            return;
        }
        
        if (this.filterState.expression.length === 0) {
            instancePreview.textContent = 'Expression will appear here...';
            instancePreview.className = instancePreview.className.replace(/\s*(valid|invalid)/, '');
        } else {
            const expressionText = this.filterState.getExpressionText();
            const isValid = this.filterState.validateExpressionSyntax(expressionText);
            
            instancePreview.textContent = expressionText || 'Empty expression';
            const baseClass = instancePreview.className.replace(/\s*(valid|invalid)/, '');
            instancePreview.className = `${baseClass} ${isValid ? 'valid' : 'invalid'}`;
        }
        
        // Notify host application of changes for smart auto-save
        if (typeof window.markChanged === 'function') {
            window.markChanged();
        }
    }
}

// Export for other modules
window.FilterElements = FilterElements;