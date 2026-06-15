/**
 * FilterState - Pure state management for filter expressions
 * Handles expression data, validation, and serialization without DOM manipulation
 */
class FilterState {
    constructor(instanceId = 'default') {
        this.instanceId = instanceId;
        this.expression = [];
        this.filtersEnabled = true;
        this.filterCounter = 0;
        this.activeTimePill = null;
        this.disabledFilterTerms = []; // Array of Sets, each Set contains elements in a disabled filter terms
    }

    /**
     * Get current expression as text (only enabled elements)
     * @returns {string} Expression text
     */
    getExpressionText() {
        return this.getEnabledExpression()
            .map(item => item.toString())
            .filter(s => s)
            .join(' ');
    }

    /**
     * Get current expression as JSON (for save/load)
     * @returns {Object} Expression data
     */
    getExpressionData() {
        // Check modal toggle state
        const modalToggle = document.getElementById(`modalToggle_${this.instanceId}`) || document.getElementById('modalToggle');
        const isModalToggleOff = modalToggle ? modalToggle.classList.contains('off') : false;
        
        return {
            version: "1.0",
            timestamp: new Date().toISOString(),
            filtersEnabled: this.filtersEnabled,
            modalToggleOff: isModalToggleOff,
            filterCounter: this.filterCounter,
            disabledFilterTermsGroups: this.disabledFilterTerms.length,
            items: this.expression.map(item => {
                const baseData = {};
                
                console.log('🔍 Exporting item:', item.constructor.name, item);
                
                if (item instanceof FilterPill) {
                    Object.assign(baseData, item.getState());
                    console.log('📦 FilterPill state:', baseData);
                    // Keep the type from getState() ('text' or 'time')
                } else if (item instanceof TimePill) {
                    Object.assign(baseData, item.getState());
                    console.log('📦 TimePill state:', baseData);
                    // Keep the type from getState() ('time')
                } else if (item instanceof Operator) {
                    baseData.type = 'operator';
                    baseData.operator = item.type;
                    console.log('📦 Operator state:', baseData);
                } else {
                    console.error('❌ Unknown item type in expression:', item.constructor.name, item);
                }
                
                // Mark if this element is disabled
                if (item.element && item.element.classList.contains('filter-terms-disabled')) {
                    baseData.disabled = true;
                    baseData.filterTermsId = parseInt(item.element.dataset.filterTermsId);
                    console.log('🚫 Item is disabled, added disabled properties:', baseData);
                }
                
                console.log('✅ Final exported item:', baseData);
                return baseData;
            })
        };
    }

    /**
     * Load expression from JSON data
     * @param {Object} data - Expression data
     */
    loadExpressionData(data) {
        try {
            if (!data.items || !Array.isArray(data.items)) {
                throw new Error('Invalid expression format');
            }
            
            // Clear current expression
            this.clearAll();
            
            // Restore filter counter
            if (data.hasOwnProperty('filterCounter')) {
                this.filterCounter = data.filterCounter;
            }
            
            // Restore filters enabled state
            if (data.hasOwnProperty('filtersEnabled')) {
                this.toggleFilters(data.filtersEnabled);
            }
            
            // Prepare disabled filter terms groups
            const disabledGroups = {};
            
            // Rebuild expression and track items for disabled state restoration
            const itemsToDisable = [];
            
            data.items.forEach(itemData => {
                let item = null;
                
                if (itemData.type === 'text' || itemData.type === 'time' || itemData.type === 'filter') {
                    item = this.addFilter(
                        itemData.text || '',
                        itemData.isInclude !== false,
                        itemData.isTimeMode === true || itemData.type === 'time'
                    );
                    
                    // Set additional state for time pills
                    if (item && itemData.isTimeMode && itemData.fullTimeStr) {
                        item.fullTimeStr = itemData.fullTimeStr;
                        
                        // Update the display
                        const entry = item.element.querySelector('.filter-entry');
                        if (entry) {
                            entry.value = item.getDisplayTime();
                        }
                    }
                    
                } else if (itemData.type === 'operator') {
                    item = this.addOperator(itemData.operator);
                }
                
                // Track items that need to be disabled
                if (item && itemData.disabled && itemData.filterTermsId !== undefined) {
                    itemsToDisable.push({
                        item: item,
                        groupId: itemData.filterTermsId
                    });
                    console.log(`📝 Tracking item for disabling: ${item.text || item.type} (group ${itemData.filterTermsId})`);
                }
            });
            
            // Process disabled items after all elements are created
            itemsToDisable.forEach(({item, groupId}) => {
                if (!disabledGroups[groupId]) {
                    disabledGroups[groupId] = new Set();
                }
                if (item.element) {
                    disabledGroups[groupId].add(item.element);
                    console.log(`📝 Added element to disabled group ${groupId}:`, item.element);
                } else {
                    console.error(`❌ No element found for item:`, item);
                }
            });
            
            // Restore disabled filter terms groups
            this.disabledFilterTerms = [];
            Object.keys(disabledGroups).forEach(groupId => {
                const group = disabledGroups[groupId];
                this.disabledFilterTerms.push(group);
                
                // Apply disabled styling to each element in the group
                group.forEach(element => {
                    element.classList.add('filter-terms-disabled');
                    element.dataset.filterTermsId = this.disabledFilterTerms.length - 1;
                });
            });
            
            // Restore modal toggle state
            if (data.hasOwnProperty('modalToggleOff') && data.modalToggleOff) {
                const modalToggle = document.getElementById(`modalToggle_${this.instanceId}`) || document.getElementById('modalToggle');
                if (modalToggle && modalToggle.classList.contains('on')) {
                    // Trigger the toggle to OFF state
                    modalToggle.click();
                }
            }
            
        } catch (error) {
            console.error('Error loading expression:', error);
            throw error; // Re-throw for caller to handle
        }
    }

    /**
     * Validate expression syntax (only enabled elements)
     * @param {string} expr - Expression text to validate
     * @returns {boolean} True if valid
     */
    validateExpressionSyntax(expr = null) {
        const expressionText = expr || this.getExpressionText();
        
        if (!expressionText || expressionText === 'Empty expression') return false;
        
        // Tokenize while preserving quoted strings
        function tokenize(expression) {
            const tokens = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < expression.length; i++) {
                const char = expression[i];
                
                if (char === '"') {
                    current += char;
                    inQuotes = !inQuotes;
                } else if (char === ' ' && !inQuotes) {
                    if (current.trim()) {
                        tokens.push(current.trim());
                        current = '';
                    }
                } else {
                    current += char;
                }
            }
            
            if (current.trim()) {
                tokens.push(current.trim());
            }
            
            return tokens;
        }
        
        const tokens = tokenize(expressionText);
        
        // Check balanced parentheses
        let parenCount = 0;
        for (const token of tokens) {
            if (token === '(') parenCount++;
            if (token === ')') parenCount--;
            if (parenCount < 0) return false;
        }
        
        if (parenCount !== 0) return false;
        
        // Basic syntax validation
        let expectOperand = true;
        
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            
            if (token === '(') {
                if (!expectOperand) return false;
                expectOperand = true;
            } else if (token === ')') {
                if (expectOperand) return false;
                expectOperand = false;
            } else if (token === 'AND' || token === 'OR') {
                if (expectOperand) return false;
                expectOperand = true;
            } else if (token === 'NOT') {
                if (!expectOperand) return false;
                expectOperand = true;
            } else if (token.startsWith('text') || token.startsWith('time')) {
                if (!expectOperand) return false;
                
                if (token.startsWith('text') && i + 2 < tokens.length) {
                    const operator = tokens[i + 1];
                    const value = tokens[i + 2];
                    if ((operator === 'contains' || operator === 'excludes') && 
                        value.startsWith('"') && value.endsWith('"')) {
                        i += 2;
                    }
                } else if (token.startsWith('time') && i + 2 < tokens.length) {
                    const operator = tokens[i + 1];
                    const value = tokens[i + 2];
                    if ((operator === '>=' || operator === '<=') && 
                        value.startsWith('"') && value.endsWith('"')) {
                        i += 2;
                    }
                }
                
                expectOperand = false;
            } else {
                return false;
            }
        }
        
        return !expectOperand;
    }

    /**
     * Get only enabled (non-disabled) elements from the expression
     * @returns {Array} Array of enabled expression items
     */
    getEnabledExpression() {
        return this.expression.filter(item => {
            return item.element && !item.element.classList.contains('filter-terms-disabled');
        });
    }

    /**
     * Debug method to show enabled vs total elements
     */
    debugExpressionState() {
        const total = this.expression.length;
        const enabled = this.getEnabledExpression().length;
        const disabled = total - enabled;
        
        console.log(`🔍 Expression State: ${enabled} enabled, ${disabled} disabled, ${total} total`);
        console.log('🔍 Enabled expression:', this.getExpressionText());
        console.log('🔍 Disabled filter terms:', this.disabledFilterTerms.length);
    }
}

// Export for other modules
window.FilterState = FilterState;