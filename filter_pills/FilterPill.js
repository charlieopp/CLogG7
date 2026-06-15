/**
 * FilterPill - Clean UI component for text-based filter pills
 * All click areas now properly handle disabled state
 */

class FilterPill {
    constructor(container, options = {}) {
        this.container = container;
        this.instanceId = options.instanceId || 'default';
        this.id = ++window.filterCounter;
        this.options = {
            initialText: options.initialText || 'new filter',
            isInclude: options.isInclude !== false,
            onDelete: options.onDelete || (() => {}),
            onChange: options.onChange || (() => {})
        };
        
        this.text = this.options.initialText;
        this.isInclude = this.options.isInclude;
        
        this.element = this.createElement();
        this.bindEvents();
        
        if (this.container) {
            this.container.appendChild(this.element);
        }
        
        console.log('[FilterPill] Created with options:', this.options);
    }

    createElement() {
        const pill = document.createElement('div');
        pill.className = 'filter-pill';
        pill.draggable = true;
        pill.dataset.pillId = this.id;
        pill.setAttribute('data-instance-id', this.instanceId);

        pill.innerHTML = `
            <div class="pill-main-row">
                <button class="type-btn ${this.isInclude ? '' : 'exclude'}">${this.getTypeText()}</button>
                <button class="mode-btn">α</button>
                <input type="text" class="filter-entry" value="${this.text}" placeholder="Enter filter text">
                <div class="delete-btn">×</div>
            </div>
        `;

        return pill;
    }

    bindEvents() {
        const typeBtn = this.element.querySelector('.type-btn');
        const modeBtn = this.element.querySelector('.mode-btn');
        const deleteBtn = this.element.querySelector('.delete-btn');
        const input = this.element.querySelector('.filter-entry');

        // Include/exclude toggle
        typeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (this.element.classList.contains('filter-terms-disabled')) {
                console.log('🔄 Re-enabling filter terms via disabled FilterPill type button');
                e.preventDefault();
                
                const filterManager = this.getFilterManager();
                if (filterManager && filterManager.handleFilterTermsReEnable) {
                    filterManager.handleFilterTermsReEnable(this.element);
                }
                return;
            }
            
            this.isInclude = !this.isInclude;
            typeBtn.classList.toggle('exclude', !this.isInclude);
            typeBtn.textContent = this.getTypeText();
            this.notifyChange();
        });

        // Mode toggle (text/time)
        modeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (this.element.classList.contains('filter-terms-disabled')) {
                console.log('🔄 Re-enabling filter terms via disabled FilterPill mode button');
                e.preventDefault();
                
                const filterManager = this.getFilterManager();
                if (filterManager && filterManager.handleFilterTermsReEnable) {
                    filterManager.handleFilterTermsReEnable(this.element);
                }
                return;
            }
            
            this.switchToTimeMode();
        });

        // Delete button
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (this.element.classList.contains('filter-terms-disabled')) {
                console.log('🔄 Re-enabling filter terms via disabled FilterPill delete button');
                e.preventDefault();
                
                const filterManager = this.getFilterManager();
                if (filterManager && filterManager.handleFilterTermsReEnable) {
                    filterManager.handleFilterTermsReEnable(this.element);
                }
                return;
            }
            
            this.remove();
        });

        // Text input handling
        input.addEventListener('input', (e) => {
            // Don't allow editing if disabled
            if (this.element.classList.contains('filter-terms-disabled')) {
                e.preventDefault();
                return;
            }
            
            this.text = e.target.value;
            this.updateInputWidth();
            this.notifyChange();
        });

        // Text input click - handles disabled state
        input.addEventListener('click', (e) => {
            if (this.element.classList.contains('filter-terms-disabled')) {
                console.log('🔄 Re-enabling filter terms via disabled FilterPill input click');
                e.preventDefault();
                
                const filterManager = this.getFilterManager();
                if (filterManager && filterManager.handleFilterTermsReEnable) {
                    filterManager.handleFilterTermsReEnable(this.element);
                }
                return;
            }
            
            e.stopPropagation();
        });

        // Focus handling for input
        input.addEventListener('focus', (e) => {
            // Prevent focus if disabled
            if (this.element.classList.contains('filter-terms-disabled')) {
                e.target.blur();
                return;
            }
        });

        // Drag functionality
        this.element.addEventListener('dragstart', (e) => {
            if (this.element.classList.contains('filter-terms-disabled')) {
                e.preventDefault();
                return;
            }
            
            window.draggedElement = this.element;
            this.element.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.element.outerHTML);
        });

        this.element.addEventListener('dragend', () => {
            this.element.classList.remove('dragging');
            window.draggedElement = null;
        });

        // Main pill element click - handles disabled state
        this.element.addEventListener('click', (e) => {
            if (this.element.classList.contains('filter-terms-disabled')) {
                console.log('🔄 Re-enabling filter terms via disabled FilterPill main element click');
                e.preventDefault();
                
                const filterManager = this.getFilterManager();
                if (filterManager && filterManager.handleFilterTermsReEnable) {
                    filterManager.handleFilterTermsReEnable(this.element);
                }
                return;
            }
            
            // Prevent container click events from bubbling only if not disabled
            if (e.target.closest('.filter-pill')) {
                e.stopPropagation();
            }
        });
    }

    setText(newText) {
        this.text = newText;
        
        // Update the input field
        const input = this.element.querySelector('.filter-entry');
        if (input) {
            input.value = newText;
        }
        
        this.notifyChange();
        
        console.log('📝 Set text for pill:', this.id, 'Length:', newText.length);
    }

    getTypeText() {
        return this.isInclude ? 'in' : 'ex';
    }

    getState() {
        return {
            text: this.text,
            isInclude: this.isInclude,
            type: 'text'
        };
    }

    setState(state) {
        this.isInclude = state.isInclude !== false;
        this.text = state.text || '';
        
        // Update UI elements
        const typeBtn = this.element.querySelector('.type-btn');
        const input = this.element.querySelector('.filter-entry');
        
        if (typeBtn) {
            typeBtn.classList.toggle('exclude', !this.isInclude);
            typeBtn.textContent = this.getTypeText();
        }
        
        if (input) {
            input.value = this.text || '';
        }
    }

    notifyChange() {
        if (this.options && this.options.onChange) {
            this.options.onChange(this.getState());
        }
    }

    remove() {
        if (this.measureSpan && this.measureSpan.parentNode) {
            this.measureSpan.parentNode.removeChild(this.measureSpan);
        }
        
        if (this.options && this.options.onDelete) {
            this.options.onDelete(this);
        }
        
        this.element.remove();
    }

    switchToTimeMode() {
        console.log('🕰️ Switching to time mode for pill:', this.id);
        
        // Check if TimePill class exists
        if (typeof TimePill === 'undefined') {
            console.error('❌ TimePill class not found! Cannot switch to time mode.');
            alert('TimePill functionality not available');
            return;
        }
        
        try {
            // Replace this FilterPill with a TimePill
            const currentState = this.getState();
            const container = this.container;
            
            console.log('🕰️ Creating TimePill with state:', currentState);
            
            // FIXED: Don't pass filter text as time string - let TimePill create defaults
            // Only pass fullTimeStr if the current text is actually a valid time string
            let timeStr = '';
            if (currentState.text && TimeParser.isValidTimeString(currentState.text)) {
                timeStr = currentState.text;
                console.log('🕰️ Using existing valid time string:', timeStr);
            } else {
                console.log('🕰️ Filter text is not a valid time string, using defaults');
                // Leave timeStr empty so TimePill constructor creates defaults with zero seconds/ms
            }
            
            // Create new TimePill - empty fullTimeStr will trigger default creation
            const timePill = new TimePill(container, {
                fullTimeStr: timeStr, // Empty or valid time string only
                isInclude: currentState.isInclude,
                instanceId: this.instanceId,
                onDelete: this.options.onDelete,
                onChange: this.options.onChange
            });
            
            console.log('🕰️ TimePill created:', timePill);
            
            // Replace in expression array if it exists
            const filterManager = this.getFilterManager();
            if (filterManager && filterManager.expression) {
                const index = filterManager.expression.indexOf(this);
                if (index > -1) {
                    filterManager.expression[index] = timePill;
                    console.log('🕰️ Replaced in expression at index:', index);
                } else {
                    console.warn('⚠️ Could not find this pill in expression array');
                }
            }
            
            // Remove old element and update
            this.element.remove();
            this.notifyChange();
            
            console.log('✅ Successfully switched to time mode');
            
        } catch (error) {
            console.error('❌ Error switching to time mode:', error);
            alert('Error switching to time mode: ' + error.message);
        }
    }

    toString() {
        const operator = this.isInclude ? 'contains' : 'excludes';
        return `text ${operator} "${this.text}"`;
    }

    updateInputWidth() {
        const input = this.element.querySelector('.filter-entry');
        if (!input) return;
        
        const text = input.value || input.placeholder || '';
        
        // Create a temporary span to measure text width
        if (!this.measureSpan) {
            this.measureSpan = document.createElement('span');
            this.measureSpan.style.cssText = `
                position: absolute;
                visibility: hidden;
                height: auto;
                width: auto;
                white-space: nowrap;
                font-family: Arial;
                font-size: 11px;
                padding: 3px 6px;
            `;
            document.body.appendChild(this.measureSpan);
        }
        
        this.measureSpan.textContent = text;
        const textWidth = this.measureSpan.offsetWidth;
        
        // Calculate width with constraints
        const defaultWidth = 80;  // Starting width
        const maxWidth = 240;     // 3X the default (80 * 3)
        const calculatedWidth = Math.min(maxWidth, Math.max(defaultWidth, textWidth + 10));
        
        input.style.width = calculatedWidth + 'px';
    }
    
    getFilterManager() {
        return window[`filterManager_${this.instanceId}`] || window.filterManager;
    }
}

// Export for CLog integration
window.FilterPill = FilterPill;