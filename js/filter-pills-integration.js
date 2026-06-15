/**
 * Filter Pills Integration - wires the filter_pills (FilterManager + CFSM) component
 * into CLogG7's left/right panels and the WebSocket filter API.
 */

(function () {
    const FILTER_APPLY_DEBOUNCE_MS = 300;
    const applyTimers = {};

    /**
     * Look up the backend fileId currently loaded for a panel.
     */
    function getFileId(panelId) {
        const uiManager = CLogApp.modules.uiManager;
        if (!uiManager || !uiManager.logLineCache) return null;
        const entry = uiManager.logLineCache.get(`${panelId}LogContent`);
        return entry ? entry.fileId : null;
    }

    /**
     * Convert a filter_pills expression (FilterManager.getExpressionData()) into the
     * ordered expression item list understood by the backend filter_engine's
     * boolean expression evaluator (AND/OR/NOT/parentheses, text/regex/time items).
     */
    function convertExpressionToBackendExpression(expressionData) {
        if (!expressionData || expressionData.filtersEnabled === false || expressionData.modalToggleOff) {
            return [];
        }

        return (expressionData.items || []).map(item => {
            if (item.type === 'text') {
                return {
                    type: 'text',
                    text: item.text || '',
                    isInclude: item.isInclude !== false,
                    caseSensitive: false,
                    disabled: !!item.disabled
                };
            } else if (item.type === 'time') {
                return {
                    type: 'time',
                    fullTimeStr: item.fullTimeStr || '',
                    isInclude: item.isInclude !== false,
                    disabled: !!item.disabled
                };
            } else if (item.type === 'operator') {
                return {
                    type: 'operator',
                    operator: item.operator,
                    disabled: !!item.disabled
                };
            }
            return { type: 'text', text: '', isInclude: true, disabled: true };
        });
    }

    /**
     * Send the current filter expression for a panel to the backend and
     * render the filtered content.
     */
    function applyFiltersForInstance(instanceId) {
        const panelId = instanceId; // 'left' or 'right'
        const filterManager = window[`filterManager_${instanceId}`];
        if (!filterManager || typeof filterManager.getExpressionData !== 'function') return;

        const fileId = getFileId(panelId);
        if (!fileId) {
            console.log(`[FilterPills] No file loaded for ${panelId} panel - skipping filter apply`);
            return;
        }

        const apiClient = CLogApp.modules.apiClient;
        if (!apiClient || typeof apiClient.applyFilters !== 'function') {
            console.warn('[FilterPills] apiClient.applyFilters not available');
            return;
        }

        const expressionData = filterManager.getExpressionData();
        const expression = convertExpressionToBackendExpression(expressionData);

        apiClient.applyFilters(panelId, fileId, [], {}, expression)
            .then(response => {
                if (!response || !response.content) return;

                const uiManager = CLogApp.modules.uiManager;
                const cacheEntry = uiManager.logLineCache.get(`${panelId}LogContent`);
                const filename = cacheEntry ? cacheEntry.filename : null;

                // Lines may or may not already include trailing newlines - match the
                // joining behavior used when content is first loaded (remote-file-browser.js)
                const lines = response.content.lines || [];
                const firstLine = lines[0] || '';
                const text = (firstLine.endsWith('\n') || firstLine.endsWith('\r\n'))
                    ? lines.join('')
                    : lines.join('\n');

                uiManager.setLogContent(panelId, text, filename, fileId);
                console.log(`[FilterPills] Applied ${expression.length} expression item(s) to ${panelId} panel - ${response.content.lines.length}/${response.content.totalLines} lines shown`);
            })
            .catch(error => {
                console.error(`[FilterPills] Failed to apply filters for ${panelId}:`, error);
            });
    }

    function scheduleApplyFilters(instanceId) {
        if (applyTimers[instanceId]) {
            clearTimeout(applyTimers[instanceId]);
        }
        applyTimers[instanceId] = setTimeout(() => applyFiltersForInstance(instanceId), FILTER_APPLY_DEBOUNCE_MS);
    }

    // Hook called by filter_pills (FilterElements.updateExpressionPreview) whenever
    // an expression changes - re-applies filters for any registered instance and
    // pushes the latest state into CFSM for state-manager's auto-save.
    window.markChanged = function () {
        if (!window.CFSM) return;

        window.CFSM.getInstanceIds().forEach(instanceId => {
            scheduleApplyFilters(instanceId);
        });

        window.CFSM.updateFromAllInstances();
    };

    window.convertExpressionToBackendExpression = convertExpressionToBackendExpression;

    /**
     * Initialize the filter pills system for the left panel.
     */
    window.initializeFilterPillsSystem = function () {
        try {
            if (!window.filterManager_left) {
                window.filterManager_left = new FilterManager('left');
            }
            window.initializeFilterInstance('left');
            console.log('[FilterPills] Left instance initialized');
        } catch (error) {
            console.error('[FilterPills] Failed to initialize left instance:', error);
        }
    };

    /**
     * Initialize the filter pills system for the right panel (called when the
     * right panel first becomes visible).
     */
    window.initializeRightPanelFilterPills = function () {
        if (window.filterManager_right) return; // already initialized

        try {
            window.filterManager_right = new FilterManager('right');
            window.initializeFilterInstance('right');
            console.log('[FilterPills] Right instance initialized');
        } catch (error) {
            console.error('[FilterPills] Failed to initialize right instance:', error);
        }
    };
})();
