/**
 * FilterManager - Manages filter pills using the new JSON format
 * Implements required methods for CFSM integration
 */

class FilterManager {
    constructor(containerId, panelId = 'left') {
        this.containerId = containerId;
        this.panelId = panelId;
        this.container = document.getElementById(containerId);
        this.filterState = this.createEmptyState();
        this.onChange = null; // Will be set by CFSM
        this.nextId = 1;
        
        if (!this.container) {
            throw new Error(`Filter container not found: ${containerId}`);
        }
        
        this.setupContainer();
        console.log(`[FilterManager] Initialized for ${containerId} (${panelId})`);
    }

    /**
     * Create empty filter state
     */
    createEmptyState() {
        return {
            version: "1.0",
            enabled: true,
            expression: []
        };
    }

    /**
     * Setup container with basic structure
     */
    setupContainer() {
        if (!this.container.querySelector('.filter-pills-container')) {
            this.container.innerHTML = `
                <div class="filter-pills-container">
                    <div class="filter-pills-list" id="${this.containerId}-pills"></div>
                    <div class="filter-pills-controls">
                        <button class="add-filter-btn" data-type="text">+ Text</button>
                        <button class="add-filter-btn" data-type="time">+ Time</button>
                        <button class="add-filter-btn" data-type="operator">+ Op</button>
                        <button class="add-filter-btn" data-type="paren">+ ()</button>
                    </div>
                </div>
            `;
            
            this.setupEventListeners();
        }
    }

    /**
     * Setup event listeners for controls
     */
    setupEventListeners() {
        const controls = this.container.querySelectorAll('.add-filter-btn');
        controls.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                this.addElement(type);
            });
        });
    }

    /**
     * Export current state (required by CFSM)
     */
    exportState() {
        return JSON.parse(JSON.stringify(this.filterState));
    }

    /**
     * Import state (required by CFSM)
     */
    importState(state) {
        if (!this.isValidState(state)) {
            console.warn('[FilterManager] Invalid state provided to importState');
            return;
        }

        this.filterState = JSON.parse(JSON.stringify(state));
        this.render();
        console.log(`[FilterManager] Imported state with ${state.expression.length} elements`);
    }

    /**
     * Check if has content (required by CFSM)
     */
    hasContent() {
        return this.filterState.expression.length > 0;
    }

    /**
     * Validate filter state format
     */
    isValidState(state) {
        if (!state || typeof state !== 'object') return false;
        if (!state.version || !state.hasOwnProperty('enabled') || !Array.isArray(state.expression)) return false;
        return true;
    }

    /**
     * Add new filter element
     */
    addElement(type, options = {}) {
        let element;
        
        switch (type) {
            case 'text':
                element = {
                    type: "text",
                    operator: options.operator || "contains",
                    value: options.value || "",
                    enabled: options.enabled !== false
                };
                break;
                
            case 'time':
                element = {
                    type: "time",
                    operator: options.operator || ">=",
                    value: options.value || new Date().toISOString(),
                    enabled: options.enabled !== false
                };
                break;
                
            case 'operator':
                element = {
                    type: "operator",
                    operator: options.operator || "AND",
                    enabled: options.enabled !== false
                };
                break;
                
            case 'paren':
                element = {
                    type: "paren",
                    operator: options.operator || "(",
                    enabled: options.enabled !== false
                };
                break;
                
            default:
                console.error(`[FilterManager] Unknown element type: ${type}`);
                return;
        }

        // Add unique ID for UI management
        element._id = this.generateId();
        
        this.filterState.expression.push(element);
        this.render();
        this.notifyChange();
    }

    /**
     * Remove element by ID
     */
    removeElement(elementId) {
        const index = this.filterState.expression.findIndex(el => el._id === elementId);
        if (index > -1) {
            this.filterState.expression.splice(index, 1);
            this.render();
            this.notifyChange();
        }
    }

    /**
     * Update element by ID
     */
    updateElement(elementId, updates) {
        const element = this.filterState.expression.find(el => el._id === elementId);
        if (element) {
            Object.assign(element, updates);
            this.render();
            this.notifyChange();
        }
    }

    /**
     * Toggle element enabled state
     */
    toggleElement(elementId) {
        const element = this.filterState.expression.find(el => el._id === elementId);
        if (element) {
            element.enabled = !element.enabled;
            this.render();
            this.notifyChange();
        }
    }

    /**
     * Set overall filter enabled state
     */
    setEnabled(enabled) {
        this.filterState.enabled = enabled;
        this.render();
        this.notifyChange();
    }

    /**
     * Clear all filters
     */
    clear() {
        this.filterState = this.createEmptyState();
        this.render();
        this.notifyChange();
    }

    /**
     * Render filter pills in UI
     */
    render() {
        const pillsContainer = this.container.querySelector('.filter-pills-list');
        if (!pillsContainer) return;

        pillsContainer.innerHTML = '';

        // Add global enabled toggle
        const globalToggle = this.createGlobalToggle();
        pillsContainer.appendChild(globalToggle);

        // Add each expression element
        this.filterState.expression.forEach(element => {
            const pill = this.createElementPill(element);
            pillsContainer.appendChild(pill);
        });

        // Update container state
        this.container.classList.toggle('disabled', !this.filterState.enabled);
    }

    /**
     * Create global enabled toggle
     */
    createGlobalToggle() {
        const toggle = document.createElement('div');
        toggle.className = `filter-global-toggle ${this.filterState.enabled ? 'enabled' : 'disabled'}`;
        toggle.innerHTML = `
            <label class="toggle-label">
                <input type="checkbox" ${this.filterState.enabled ? 'checked' : ''} 
                       onchange="window.FilterManagers['${this.containerId}'].setEnabled(this.checked)">
                <span class="toggle-text">Filters ${this.filterState.enabled ? 'ON' : 'OFF'}</span>
            </label>
        `;
        return toggle;
    }

    /**
     * Create pill element for expression item
     */
    createElementPill(element) {
        const pill = document.createElement('div');
        pill.className = `filter-pill ${element.type} ${element.enabled ? 'enabled' : 'disabled'}`;
        pill.dataset.id = element._id;

        let content = '';
        switch (element.type) {
            case 'text':
                content = this.createTextPillContent(element);
                break;
            case 'time':
                content = this.createTimePillContent(element);
                break;
            case 'operator':
                content = this.createOperatorPillContent(element);
                break;
            case 'paren':
                content = this.createParenPillContent(element);
                break;
        }

        pill.innerHTML = content;
        return pill;
    }

    /**
     * Create text filter pill content
     */
    createTextPillContent(element) {
        return `
            <div class="pill-content">
                <select class="pill-operator" onchange="window.FilterManagers['${this.containerId}'].updateElement('${element._id}', {operator: this.value})">
                    <option value="contains" ${element.operator === 'contains' ? 'selected' : ''}>Contains</option>
                    <option value="excludes" ${element.operator === 'excludes' ? 'selected' : ''}>Excludes</option>
                </select>
                <input type="text" class="pill-value" value="${element.value || ''}" 
                       onchange="window.FilterManagers['${this.containerId}'].updateElement('${element._id}', {value: this.value})"
                       placeholder="Enter text...">
                <button class="pill-toggle ${element.enabled ? 'enabled' : 'disabled'}" 
                        onclick="window.FilterManagers['${this.containerId}'].toggleElement('${element._id}')"
                        title="Toggle enabled">●</button>
                <button class="pill-remove" 
                        onclick="window.FilterManagers['${this.containerId}'].removeElement('${element._id}')"
                        title="Remove">×</button>
            </div>
        `;
    }

    /**
     * Create time filter pill content
     */
    createTimePillContent(element) {
        const displayValue = this.formatTimeValue(element.value);
        
        return `
            <div class="pill-content">
                <select class="pill-operator" onchange="window.FilterManagers['${this.containerId}'].updateElement('${element._id}', {operator: this.value})">
                    <option value=">=" ${element.operator === '>=' ? 'selected' : ''}>≥ After</option>
                    <option value="<=" ${element.operator === '<=' ? 'selected' : ''}>≤ Before</option>
                </select>
                <input type="datetime-local" class="pill-value" value="${element.value || ''}" 
                       onchange="window.FilterManagers['${this.containerId}'].updateElement('${element._id}', {value: this.value})">
                <span class="pill-display">${displayValue}</span>
                <button class="pill-toggle ${element.enabled ? 'enabled' : 'disabled'}" 
                        onclick="window.FilterManagers['${this.containerId}'].toggleElement('${element._id}')"
                        title="Toggle enabled">●</button>
                <button class="pill-remove" 
                        onclick="window.FilterManagers['${this.containerId}'].removeElement('${element._id}')"
                        title="Remove">×</button>
            </div>
        `;
    }

    /**
     * Create operator pill content
     */
    createOperatorPillContent(element) {
        return `
            <div class="pill-content operator">
                <select class="pill-operator" onchange="window.FilterManagers['${this.containerId}'].updateElement('${element._id}', {operator: this.value})">
                    <option value="AND" ${element.operator === 'AND' ? 'selected' : ''}>AND</option>
                    <option value="OR" ${element.operator === 'OR' ? 'selected' : ''}>OR</option>
                    <option value="NOT" ${element.operator === 'NOT' ? 'selected' : ''}>NOT</option>
                </select>
                <button class="pill-toggle ${element.enabled ? 'enabled' : 'disabled'}" 
                        onclick="window.FilterManagers['${this.containerId}'].toggleElement('${element._id}')"
                        title="Toggle enabled">●</button>
                <button class="pill-remove" 
                        onclick="window.FilterManagers['${this.containerId}'].removeElement('${element._id}')"
                        title="Remove">×</button>
            </div>
        `;
    }

    /**
     * Create parenthesis pill content
     */
    createParenPillContent(element) {
        return `
            <div class="pill-content paren">
                <select class="pill-operator" onchange="window.FilterManagers['${this.containerId}'].updateElement('${element._id}', {operator: this.value})">
                    <option value="(" ${element.operator === '(' ? 'selected' : ''}>(</option>
                    <option value=")" ${element.operator === ')' ? 'selected' : ''}>)</option>
                </select>
                <button class="pill-toggle ${element.enabled ? 'enabled' : 'disabled'}" 
                        onclick="window.FilterManagers['${this.containerId}'].toggleElement('${element._id}')"
                        title="Toggle enabled">●</button>
                <button class="pill-remove" 
                        onclick="window.FilterManagers['${this.containerId}'].removeElement('${element._id}')"
                        title="Remove">×</button>
            </div>
        `;
    }

    /**
     * Format time value for display
     */
    formatTimeValue(value) {
        if (!value) return '';
        try {
            return new Date(value).toLocaleString();
        } catch (e) {
            return value;
        }
    }

    /**
     * Generate unique ID for elements
     */
    generateId() {
        return `${this.containerId}-${this.nextId++}`;
    }

    /**
     * Notify change (will be called by CFSM)
     */
    notifyChange() {
        if (this.onChange && typeof this.onChange === 'function') {
            this.onChange();
        }
    }

    /**
     * Get filter expression for backend
     */
    getFilterExpression() {
        if (!this.filterState.enabled) {
            return null;
        }

        // Return expression without internal IDs
        return {
            version: this.filterState.version,
            enabled: this.filterState.enabled,
            expression: this.filterState.expression.map(el => {
                const { _id, ...element } = el;
                return element;
            })
        };
    }

    /**
     * Import from legacy format (for migration)
     */
    importLegacyFilters(legacyFilters) {
        console.log('[FilterManager] Converting legacy filters...');
        
        const expression = [];
        
        // Convert legacy filter format to new JSON format
        legacyFilters.forEach((filter, index) => {
            if (index > 0) {
                // Add AND operator between filters
                expression.push({
                    type: "operator",
                    operator: "AND",
                    enabled: true,
                    _id: this.generateId()
                });
            }
            
            expression.push({
                type: "text",
                operator: filter.exclude ? "excludes" : "contains",
                value: filter.text || filter.value || "",
                enabled: filter.enabled !== false,
                _id: this.generateId()
            });
        });

        this.filterState = {
            version: "1.0",
            enabled: true,
            expression
        };

        this.render();
        this.notifyChange();
    }
}

// Global registry for FilterManager instances
window.FilterManagers = window.FilterManagers || {};

// Helper function to create and register FilterManager
window.createFilterManager = function(containerId, panelId) {
    try {
        const manager = new FilterManager(containerId, panelId);
        window.FilterManagers[containerId] = manager;
        
        // Register with CFSM
        if (window.CFSM) {
            try {
                window.CFSM.registerInstance(containerId, manager);
                console.log(`[FilterManager] Registered ${containerId} with CFSM`);
            } catch (cfsmError) {
                console.error(`[FilterManager] Failed to register with CFSM: ${cfsmError.message}`);
            }
        } else {
            console.warn(`[FilterManager] CFSM not available for ${containerId}`);
        }
        
        return manager;
    } catch (error) {
        console.error(`[FilterManager] Failed to create FilterManager for ${containerId}:`, error);
        throw error;
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FilterManager;
}