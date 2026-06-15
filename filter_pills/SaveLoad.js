// Expression Save/Load functionality
class SaveLoad {
    static instanceId = 'default';
    
    static showSaveModal(instanceId = 'default') {
        SaveLoad.instanceId = instanceId;
        const filterManager = SaveLoad.getFilterManager();
        if (filterManager.expression.length === 0) {
            alert('No expression to save! Add some filters first.');
            return;
        }

        const modal = SaveLoad.getSaveModal();
        const jsonTextarea = document.getElementById('expressionJson');
        
        // Generate JSON representation
        const expressionData = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            filtersEnabled: filterManager.filtersEnabled,
            items: filterManager.expression.map(item => {
                if (item instanceof FilterPill) {
                    return {
                        type: 'filter',
                        ...item.getState()
                    };
                } else if (item instanceof Operator) {
                    return {
                        type: 'operator',
                        operator: item.type
                    };
                }
            })
        };
        
        jsonTextarea.value = JSON.stringify(expressionData, null, 2);
        modal.style.display = 'flex';
        
        // Focus name input
        const nameInput = SaveLoad.getExpressionNameInput();
        setTimeout(() => nameInput?.focus(), 100);
    }

    static closeSaveModal(instanceId = 'default') {
        SaveLoad.instanceId = instanceId;
        const modal = SaveLoad.getSaveModal();
        const nameInput = SaveLoad.getExpressionNameInput();
        const jsonTextarea = SaveLoad.getExpressionJsonTextarea();
        
        if (modal) modal.style.display = 'none';
        if (nameInput) nameInput.value = '';
        if (jsonTextarea) jsonTextarea.value = '';
    }

    static saveExpression(instanceId = 'default') {
        SaveLoad.instanceId = instanceId;
        const nameInput = SaveLoad.getExpressionNameInput();
        const jsonTextarea = SaveLoad.getExpressionJsonTextarea();
        
        const name = nameInput?.value.trim() || '';
        const json = jsonTextarea?.value || '';
        
        if (!name) {
            alert('Please enter a name for the expression.');
            return;
        }
        
        try {
            const expressionData = JSON.parse(json);
            
            // Get existing saved expressions
            const saved = JSON.parse(localStorage.getItem('savedFilterExpressions') || '{}');
            
            // Add new expression
            saved[name] = {
                ...expressionData,
                savedAt: new Date().toISOString(),
                name: name
            };
            
            // Save to localStorage
            localStorage.setItem('savedFilterExpressions', JSON.stringify(saved));
            
            alert(`Expression "${name}" saved successfully!`);
            SaveLoad.closeSaveModal(instanceId);
            
        } catch (e) {
            alert('Error saving expression: ' + e.message);
        }
    }

    static showLoadModal(instanceId = 'default') {
        SaveLoad.instanceId = instanceId;
        const modal = SaveLoad.getLoadModal();
        SaveLoad.populateSavedExpressions();
        if (modal) modal.style.display = 'flex';
    }

    static closeLoadModal(instanceId = 'default') {
        SaveLoad.instanceId = instanceId;
        const modal = SaveLoad.getLoadModal();
        const importJson = SaveLoad.getImportJsonTextarea();
        
        if (modal) modal.style.display = 'none';
        if (importJson) importJson.value = '';
        window.selectedExpressionForLoad = null;
    }

    static populateSavedExpressions() {
        const container = SaveLoad.getSavedExpressionsList();
        if (!container) return;
        
        const saved = JSON.parse(localStorage.getItem('savedFilterExpressions') || '{}');
        
        if (Object.keys(saved).length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted); font-style: italic; padding: 20px; text-align: center;">No saved expressions found</div>';
            return;
        }
        
        container.innerHTML = '';
        
        Object.entries(saved).forEach(([name, data]) => {
            const item = document.createElement('div');
            item.className = 'saved-expression-item';
            item.onclick = () => SaveLoad.selectExpressionForLoad(name, data);
            
            // Generate preview text
            const previewText = data.items.map(item => {
                if (item.type === 'filter') {
                    const prefix = item.isTimeMode ? 'time' : 'text';
                    const operator = item.isInclude ? (item.isTimeMode ? '>=' : 'contains') : (item.isTimeMode ? '<=' : 'excludes');
                    return `${prefix} ${operator} "${item.text}"`;
                } else {
                    return item.operator;
                }
            }).join(' ');
            
            const savedDate = new Date(data.savedAt).toLocaleString();
            
            item.innerHTML = `
                <div class="expression-name">${name}</div>
                <div class="expression-preview-mini">${previewText}</div>
                <div class="expression-date">Saved: ${savedDate}</div>
            `;
            
            container.appendChild(item);
        });
    }

    static selectExpressionForLoad(name, data) {
        window.selectedExpressionForLoad = data;
        
        // Update visual selection
        document.querySelectorAll('.saved-expression-item').forEach(item => {
            item.classList.remove('selected');
        });
        event.currentTarget.classList.add('selected');
        
        // Populate JSON textarea
        const importJson = SaveLoad.getImportJsonTextarea();
        if (importJson) importJson.value = JSON.stringify(data, null, 2);
    }

    static loadExpression(instanceId = 'default') {
        SaveLoad.instanceId = instanceId;
        const importJson = SaveLoad.getImportJsonTextarea();
        let jsonText = importJson?.value.trim() || '';
        
        if (!jsonText && window.selectedExpressionForLoad) {
            jsonText = JSON.stringify(window.selectedExpressionForLoad);
        }
        
        if (!jsonText) {
            alert('Please select a saved expression or paste JSON data.');
            return;
        }
        
        try {
            const data = JSON.parse(jsonText);
            
            // Validate data structure
            if (!data.items || !Array.isArray(data.items)) {
                throw new Error('Invalid expression format');
            }
            
            // Clear current expression
            const filterManager = SaveLoad.getFilterManager();
            filterManager.clearAll();
            
            // Restore filters enabled state
            if (data.hasOwnProperty('filtersEnabled')) {
                filterManager.toggleFilters(data.filtersEnabled);
            }
            
            // Rebuild expression
            data.items.forEach(itemData => {
                if (itemData.type === 'filter') {
                    filterManager.addFilter(
                        itemData.text || '',
                        itemData.isInclude !== false,
                        itemData.isTimeMode === true
                    );
                    
                    // Set additional state for time pills
                    const lastPill = filterManager.expression[filterManager.expression.length - 1];
                    if (lastPill && itemData.isTimeMode && itemData.fullTimeStr) {
                        lastPill.fullTimeStr = itemData.fullTimeStr;
                        
                        // Update the display
                        const entry = lastPill.element.querySelector('.filter-entry');
                        if (entry) {
                            entry.value = lastPill.getDisplayTime();
                        }
                    }
                    
                } else if (itemData.type === 'operator') {
                    filterManager.addOperator(itemData.operator);
                }
            });
            
            alert('Expression loaded successfully!');
            SaveLoad.closeLoadModal(instanceId);
            
        } catch (e) {
            alert('Error loading expression: ' + e.message);
        }
    }

    static clearSavedExpressions(instanceId = 'default') {
        SaveLoad.instanceId = instanceId;
        if (confirm('Are you sure you want to delete all saved expressions? This cannot be undone.')) {
            localStorage.removeItem('savedFilterExpressions');
            SaveLoad.populateSavedExpressions();
            alert('All saved expressions have been cleared.');
        }
    }
    
    static getFilterManager() {
        return window[`filterManager_${SaveLoad.instanceId}`] || window.filterManager;
    }
    
    static getSaveModal() {
        return document.getElementById(`saveModal_${SaveLoad.instanceId}`) || document.getElementById('saveModal');
    }
    
    static getLoadModal() {
        return document.getElementById(`loadModal_${SaveLoad.instanceId}`) || document.getElementById('loadModal');
    }
    
    static getExpressionNameInput() {
        return document.getElementById(`expressionName_${SaveLoad.instanceId}`) || document.getElementById('expressionName');
    }
    
    static getExpressionJsonTextarea() {
        return document.getElementById(`expressionJson_${SaveLoad.instanceId}`) || document.getElementById('expressionJson');
    }
    
    static getSavedExpressionsList() {
        return document.getElementById(`savedExpressionsList_${SaveLoad.instanceId}`) || document.getElementById('savedExpressionsList');
    }
    
    static getImportJsonTextarea() {
        return document.getElementById(`importJson_${SaveLoad.instanceId}`) || document.getElementById('importJson');
    }
}
window.SaveLoad = SaveLoad;