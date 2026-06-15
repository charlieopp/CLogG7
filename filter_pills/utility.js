// utility.js - JSON generation utilities for filter expressions

/**
 * Generates JSON representation of the current filter expression
 * @param {Array} enabledExpression - Array of enabled filter elements from FilterState
 * @returns {Object} JSON object representing the filter expression
 */
function generateFilterExpressionJson(enabledExpression) {
    const jsonData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        enabled: true,
        expression: enabledExpression.map(item => {
            if (item instanceof FilterPill) {
                const state = item.getState();
                return {
                    type: state.type || 'text',
                    operator: state.isInclude ? 'contains' : 'excludes',
                    value: state.text || state.fullTimeStr || '',
                    enabled: true
                };
            } else if (item instanceof TimePill) {
                const state = item.getState();
                return {
                    type: 'time',
                    operator: state.isInclude ? '>=' : '<=',
                    value: state.fullTimeStr || '',
                    enabled: true
                };
            } else if (item instanceof Operator) {
                return {
                    type: 'operator',
                    operator: item.type,
                    enabled: true
                };
            }
        }).filter(item => item) // Remove any null/undefined items
    };
    
    return jsonData;
}

/**
 * Gets the current filter expression JSON from the global filter manager
 * @returns {Object} JSON object representing the current filter expression
 */
function getCurrentFilterExpressionJson() {
    if (!window.filterManager || !window.filterManager.state) {
        return {
            version: "1.0",
            timestamp: new Date().toISOString(),
            enabled: false,
            expression: []
        };
    }
    
    const enabledExpression = window.filterManager.state.getEnabledExpression();
    return generateFilterExpressionJson(enabledExpression);
}