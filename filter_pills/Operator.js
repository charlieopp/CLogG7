// Enhanced Operator Class with selection and delete functionality
class Operator {
    constructor(type, instanceId = 'default') {
        this.type = type;
        this.instanceId = instanceId;
        this.element = this.createElement();
        this.bindEvents();
    }

    createElement() {
        if (!this.type) {
            console.error('❌ Operator created with undefined type!');
            this.type = 'UNKNOWN';
        }
        
        const operator = document.createElement('div');
        operator.className = `operator ${this.type.toLowerCase()}`;
        operator.textContent = this.type;
        operator.tabIndex = 0; // Make it focusable
        operator.setAttribute('data-instance-id', this.instanceId);
        return operator;
    }

    bindEvents() {
        // Click to select OR re-enable if disabled
        this.element.addEventListener('click', (e) => {
            // Store the initial disabled state - FIXED: Check correct class name
            console.log('🔍 Operator click handler called, disabled:', this.element.classList.contains('filter-terms-disabled'));
            const wasDisabled = this.element.classList.contains('filter-terms-disabled');
            
            // Check if this operator is disabled - if so, re-enable the filter terms
            if (wasDisabled) {
                console.log('🔄 Re-enabling filter terms via disabled operator click');
                e.stopPropagation();
                e.preventDefault();
                
                // FIXED: Call the correct re-enable method
                const filterManager = this.getFilterManager();
                if (filterManager && filterManager.handleFilterTermsReEnable) {
                    filterManager.handleFilterTermsReEnable(this.element);
                } else {
                    console.error('❌ handleFilterTermsReEnable not found on filterManager');
                }
                return; // Exit completely - don't continue to selection
            }
            
            // Normal operator selection logic (only if NOT originally disabled)
            e.stopPropagation();
            this.select();
        });

        // Focus events
        this.element.addEventListener('focus', () => {
            this.select();
        });

        this.element.addEventListener('blur', () => {
            this.deselect();
        });

        // Keyboard navigation
        this.element.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'Delete':
                case 'Backspace':
                    e.preventDefault();
                    this.remove();
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.deselect();
                    break;
                case 'ArrowLeft':
                case 'ArrowRight':
                    e.preventDefault();
                    this.navigateToSibling(e.key === 'ArrowLeft' ? -1 : 1);
                    break;
            }
        });
    }

    select() {
        // Deselect all other operators in this instance first
        this.getContainer().querySelectorAll('.operator.selected').forEach(op => {
            op.classList.remove('selected');
        });
        
        // Select this operator
        this.element.classList.add('selected');
        this.element.focus();
        
        console.log(`Selected operator: ${this.type} (instance: ${this.instanceId})`);
    }

    deselect() {
        this.element.classList.remove('selected');
    }

    navigateToSibling(direction) {
        const container = this.getContainer();
        const elements = [...container.children].filter(el => 
            (el.classList.contains('filter-pill') || el.classList.contains('operator')) &&
            !el.classList.contains('placeholder-text')
        );
        
        const currentIndex = elements.indexOf(this.element);
        const newIndex = currentIndex + direction;
        
        if (newIndex >= 0 && newIndex < elements.length) {
            const nextElement = elements[newIndex];
            if (nextElement.classList.contains('operator')) {
                // Find the operator instance and select it
                const filterManager = this.getFilterManager();
                const operatorInstance = filterManager.expression.find(item => item.element === nextElement);
                if (operatorInstance && operatorInstance.select) {
                    operatorInstance.select();
                }
            } else if (nextElement.classList.contains('filter-pill')) {
                // Focus the filter pill
                nextElement.focus();
            }
        }
    }

    remove() {
        console.log(`Removing operator: ${this.type} (instance: ${this.instanceId})`);
        
        // Remove from expression array
        const filterManager = this.getFilterManager();
        const index = filterManager.expression.indexOf(this);
        if (index > -1) {
            filterManager.expression.splice(index, 1);
        }
        
        // Remove from DOM
        this.element.remove();
        
        // Update expression preview
        filterManager.updateExpressionPreview();
        
        // If container is empty, restore placeholder
        const container = this.getContainer();
        const remainingElements = container.querySelectorAll('.filter-pill, .operator');
        if (remainingElements.length === 0) {
            container.innerHTML = '<div class="placeholder-text" style="color: var(--text-muted); font-style: italic; pointer-events: none; user-select: none;">Click "Add Filter" to create filter pills, or click anywhere here to add operators</div>';
        }

        console.log(`Operator ${this.type} removed. Remaining expression length:`, filterManager.expression.length);
    }

    getFilterManager() {
        return window[`filterManager_${this.instanceId}`] || window.filterManager;
    }
    
    getContainer() {
        return document.getElementById(`filtersContainer_${this.instanceId}`) || document.getElementById('filtersContainer');
    }

    toString() {
        return this.type;
    }
}

// Make Operator available globally
window.Operator = Operator;