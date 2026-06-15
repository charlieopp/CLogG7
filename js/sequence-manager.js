/**
 * SequenceManager - Sequence Definition Workflow
 * Handles sequence definition UI and communication with pattern creator
 */

class SequenceManager {
    constructor() {
        this.sequenceCreatorWindow = null;
        this.checkClosedInterval = null;
        
        // Listen for relevant events
        this.setupEventListeners();
        
        console.log('[SequenceManager] Initialized');
    }

    /**
     * Setup event listeners for sequence-related events
     */
    setupEventListeners() {
        // Listen for log line selections
        CLogApp.utils.on('logLineSelected', (event) => {
            this.onLogLineSelected(event.detail);
        });
        
        // Listen for log content changes
        CLogApp.utils.on('logContentChanged', (event) => {
            this.onLogContentChanged(event.detail.panel, event.detail.content);
        });
    }

    /**
     * Handle log line selection
     */
    onLogLineSelected(detail) {
        if (detail.panel === 'left') {
            // Update the sequence manager's awareness of selected line
            console.log('[SequenceManager] Log line selected:', detail.line.substring(0, 50) + '...');
        }
    }

    /**
     * Handle log content changes
     */
    onLogContentChanged(panel, content) {
        if (panel === 'left') {
            // Reset sequence events if left panel content changes
            this.resetSequenceEventsIfContentChanged();
        }
    }

    /**
     * Toggle sequence definition area visibility
     */
    toggleBuildSequences(panel = 'left') {
        const sequenceAreaId = panel === 'right' ? 'sequenceDefinitionAreaRight' : 'sequenceDefinitionArea';
        const sequenceArea = document.getElementById(sequenceAreaId);
        if (!sequenceArea) {
            console.warn(`[SequenceManager] Sequence definition area not found: ${sequenceAreaId}`);
            return;
        }

        const stateKey = panel === 'right' ? 'rightSequenceDefinitionVisible' : 'sequenceDefinitionVisible';
        if (!CLogApp.state[stateKey]) {
            CLogApp.state[stateKey] = false;
        }
        CLogApp.state[stateKey] = !CLogApp.state[stateKey];

        if (CLogApp.state[stateKey]) {
            sequenceArea.classList.remove('hidden');
            console.log(`[SequenceManager] ${panel} sequence definition area shown`);
        } else {
            sequenceArea.classList.add('hidden');
            this.resetSequenceDefinition(panel);
            console.log(`[SequenceManager] ${panel} sequence definition area hidden`);
        }

        // Emit event for other modules
        CLogApp.utils.emit('sequenceDefinitionToggled', {
            panel: panel,
            visible: CLogApp.state[stateKey]
        });
    }

    /**
     * Set sequence event (start or end)
     */
    setSequenceEvent(type, panel = 'left') {
        if (!CLogApp.state.selectedLogLine) {
            CLogApp.modules.uiManager.showErrorMessage(
                'Please select a log line first by clicking on it in the log viewer.'
            );
            return;
        }

        const stateKey = panel === 'right' ? 
            (type === 'start' ? 'rightStartEvent' : 'rightEndEvent') :
            (type === 'start' ? 'startEvent' : 'endEvent');
        
        const displayId = panel === 'right' ? 
            (type === 'start' ? 'startEventDisplayRight' : 'endEventDisplayRight') :
            (type === 'start' ? 'startEventDisplay' : 'endEventDisplay');

        CLogApp.state[stateKey] = CLogApp.state.selectedLogLine;
        this.updateEventDisplay(displayId, CLogApp.state[stateKey]);
        console.log(`[SequenceManager] ${panel} ${type} event set:`, CLogApp.state[stateKey].substring(0, 50) + '...');

        // Update log highlighting to show start/end events
        CLogApp.modules.uiManager.updateSequenceEventHighlighting();

        // Update the start sequence button state
        this.updateStartSequenceButton(panel);

        // Emit event
        CLogApp.utils.emit('sequenceEventSelected', {
            type: type,
            panel: panel,
            event: CLogApp.state.selectedLogLine
        });
    }

    /**
     * Update event display
     */
    updateEventDisplay(displayId, eventText) {
        const display = document.getElementById(displayId);
        if (display) {
            display.innerHTML = `<span class="sequence-event-text">${eventText}</span>`;
        }
    }

    /**
     * Update start sequence button state
     */
    updateStartSequenceButton(panel = 'left') {
        const startBtnId = panel === 'right' ? 'startSequenceRightBtn' : 'startSequenceBtn';
        const startBtn = document.getElementById(startBtnId);
        if (!startBtn) return;

        const startEventKey = panel === 'right' ? 'rightStartEvent' : 'startEvent';
        const endEventKey = panel === 'right' ? 'rightEndEvent' : 'endEvent';

        if (CLogApp.state[startEventKey] && CLogApp.state[endEventKey]) {
            startBtn.classList.remove('disabled');
        } else {
            startBtn.classList.add('disabled');
        }
    }

    /**
     * Update sequence display after state restoration
     */
    updateSequenceDisplay(panel = 'both') {
        if (panel === 'left' || panel === 'both') {
            // Update left panel start event display
            if (CLogApp.state.startEvent) {
                this.updateEventDisplay('startEventDisplay', CLogApp.state.startEvent);
            } else {
                const startDisplay = document.getElementById('startEventDisplay');
                if (startDisplay) {
                    startDisplay.innerHTML = '<span class="sequence-placeholder">No start event selected</span>';
                }
            }

            // Update left panel end event display
            if (CLogApp.state.endEvent) {
                this.updateEventDisplay('endEventDisplay', CLogApp.state.endEvent);
            } else {
                const endDisplay = document.getElementById('endEventDisplay');
                if (endDisplay) {
                    endDisplay.innerHTML = '<span class="sequence-placeholder">No end event selected</span>';
                }
            }

            // Update left panel start sequence button
            this.updateStartSequenceButton('left');
        }

        if (panel === 'right' || panel === 'both') {
            // Update right panel start event display
            if (CLogApp.state.rightStartEvent) {
                this.updateEventDisplay('startEventDisplayRight', CLogApp.state.rightStartEvent);
            } else {
                const startDisplay = document.getElementById('startEventDisplayRight');
                if (startDisplay) {
                    startDisplay.innerHTML = '<span class="sequence-placeholder">No start event selected</span>';
                }
            }

            // Update right panel end event display
            if (CLogApp.state.rightEndEvent) {
                this.updateEventDisplay('endEventDisplayRight', CLogApp.state.rightEndEvent);
            } else {
                const endDisplay = document.getElementById('endEventDisplayRight');
                if (endDisplay) {
                    endDisplay.innerHTML = '<span class="sequence-placeholder">No end event selected</span>';
                }
            }

            // Update right panel start sequence button
            this.updateStartSequenceButton('right');
        }
    }

    /**
     * Start sequence definition process
     */
    startSequenceDefinition() {
        const startBtn = document.getElementById('startSequenceBtn');
        if (!startBtn || startBtn.classList.contains('disabled')) {
            return;
        }

        console.log('[SequenceManager] Starting sequence definition process');
        console.log('Start event:', CLogApp.state.startEvent);
        console.log('End event:', CLogApp.state.endEvent);

        try {
            // Store events in localStorage for pattern creator
            this.storeEventsForPatternCreator();

            // Open pattern creator window
            this.openPatternCreatorWindow();

            // Monitor for completion
            this.monitorPatternCreatorWindow();

        } catch (error) {
            console.error('[SequenceManager] Failed to start sequence definition:', error);
            CLogApp.modules.uiManager.showErrorMessage(
                'Failed to open sequence pattern creator: ' + error.message
            );
        }
    }

    /**
     * Store events in localStorage for pattern creator
     */
    storeEventsForPatternCreator() {
        try {
            localStorage.setItem('clog_start_event', CLogApp.state.startEvent);
            localStorage.setItem('clog_end_event', CLogApp.state.endEvent);
            console.log('[SequenceManager] Events stored for pattern creator');
        } catch (error) {
            console.error('[SequenceManager] Failed to store events in localStorage:', error);
            throw new Error('Failed to store sequence events');
        }
    }

    /**
     * Open pattern creator window
     */
    openPatternCreatorWindow() {
        // Get main application height for sizing
        const mainAppHeight = window.innerHeight;
        const windowHeight = Math.max(800, mainAppHeight);
        
        const windowFeatures = `width=1200,height=${windowHeight},scrollbars=yes,resizable=yes,location=no,menubar=no,toolbar=no`;
        
        this.sequenceCreatorWindow = window.open(
            'sequence_pattern_creator.html',
            'SequencePatternCreator',
            windowFeatures
        );

        if (!this.sequenceCreatorWindow) {
            throw new Error('Failed to open pattern creator window. Please allow popups for this site.');
        }

        console.log(`[SequenceManager] Pattern creator window opened (${windowHeight}px height)`);
    }

    /**
     * Monitor pattern creator window for completion
     */
    monitorPatternCreatorWindow() {
        if (this.checkClosedInterval) {
            clearInterval(this.checkClosedInterval);
        }

        this.checkClosedInterval = setInterval(() => {
            if (!this.sequenceCreatorWindow || this.sequenceCreatorWindow.closed) {
                clearInterval(this.checkClosedInterval);
                this.checkClosedInterval = null;
                this.onPatternCreatorWindowClosed();
            }
        }, 1000);
    }

    /**
     * Handle pattern creator window closed
     */
    onPatternCreatorWindowClosed() {
        console.log('[SequenceManager] Pattern creator window closed');
        this.sequenceCreatorWindow = null;

        try {
            // Check if sequence was saved
            const savedSequence = localStorage.getItem('clog_sequence_saved');
            if (savedSequence) {
                this.onSequenceDefinitionSaved();
                // Clean up the flag
                localStorage.removeItem('clog_sequence_saved');
            } else {
                console.log('[SequenceManager] No sequence definition was saved');
            }
        } catch (error) {
            console.error('[SequenceManager] Error checking saved sequence:', error);
        }
    }

    /**
     * Handle sequence definition saved
     */
    onSequenceDefinitionSaved() {
        console.log('[SequenceManager] Sequence definition saved');

        // Update application state
        CLogApp.state.sequenceDefinitionSaved = true;

        // Enable "Use Sequences" button
        const useSequencesBtn = document.getElementById('useSequencesBtn');
        if (useSequencesBtn) {
            useSequencesBtn.classList.remove('disabled');
        }

        // Load the sequence definition
        this.loadSequenceDefinition();

        // Emit event
        CLogApp.utils.emit('sequenceDefinitionSaved', {
            startEvent: CLogApp.state.startEvent,
            endEvent: CLogApp.state.endEvent
        });

        // Show success message
        CLogApp.modules.uiManager.showSuccessMessage(
            'Sequence pattern created successfully! You can now use "Use Sequences" to find matching patterns.'
        );
    }

    /**
     * Load sequence definition from localStorage
     */
    loadSequenceDefinition() {
        try {
            const sequenceDefJson = localStorage.getItem('clog_sequence_definition');
            if (sequenceDefJson) {
                const sequenceDef = JSON.parse(sequenceDefJson);
                console.log('[SequenceManager] Sequence definition loaded:', sequenceDef);
                return sequenceDef;
            }
        } catch (error) {
            console.error('[SequenceManager] Failed to load sequence definition:', error);
        }
        return null;
    }

    /**
     * Use sequences - find matching patterns in current log
     */
    async useSequences(panel = 'left') {
        const useBtnId = panel === 'right' ? 'useSequencesRightBtn' : 'useSequencesBtn';
        const useBtn = document.getElementById(useBtnId);
        if (!useBtn || useBtn.classList.contains('disabled')) {
            return;
        }

        console.log(`[SequenceManager] Using sequences to find patterns for ${panel} panel`);

        try {
            // Get current log content
            const logContentId = panel === 'right' ? 'rightLogContent' : 'leftLogContent';
            const logContent = document.getElementById(logContentId)?.textContent;
            if (!logContent) {
                throw new Error('No log content available');
            }

            // Get sequence definition
            const sequenceDef = this.loadSequenceDefinition(panel);
            if (!sequenceDef) {
                throw new Error('No sequence definition found');
            }

            // Show processing state
            this.showSequenceProcessing(true, panel);

            // Find sequences using API client
            const results = await CLogApp.modules.apiClient.findSequences(
                logContent,
                sequenceDef.startPattern,
                sequenceDef.endPattern,
                {
                    maxDuration: sequenceDef.duration || 300,
                    sequenceName: sequenceDef.name
                }
            );

            // Hide processing state
            this.showSequenceProcessing(false);

            // Display results
            this.displaySequenceResults(results, sequenceDef);

        } catch (error) {
            console.error('[SequenceManager] Sequence processing failed:', error);
            this.showSequenceProcessing(false);
            CLogApp.modules.uiManager.showErrorMessage(
                'Failed to find sequences: ' + error.message
            );
        }
    }

    /**
     * Show/hide sequence processing state
     */
    showSequenceProcessing(isProcessing) {
        const useBtn = document.getElementById('useSequencesBtn');
        if (useBtn) {
            if (isProcessing) {
                useBtn.textContent = 'Processing...';
                useBtn.classList.add('disabled');
            } else {
                useBtn.textContent = 'Use Sequences';
                if (CLogApp.state.sequenceDefinitionSaved) {
                    useBtn.classList.remove('disabled');
                }
            }
        }
    }

    /**
     * Display sequence results
     */
    displaySequenceResults(results, sequenceDef) {
        const { sequences, totalFound, searchTime } = results;
        
        let resultMessage = `🔍 Sequence Search Results for "${sequenceDef.name || 'Unnamed Sequence'}"\n\n`;
        resultMessage += `⏱️ Search completed in ${searchTime || 0.12} seconds\n`;
        resultMessage += `📊 Found ${totalFound} matching sequences\n\n`;
        
        if (sequences && sequences.length > 0) {
            resultMessage += '📋 Sequence Details:\n';
            sequences.forEach((seq, index) => {
                resultMessage += `\n${index + 1}. Sequence ${seq.id || (index + 1)}:\n`;
                resultMessage += `   • Duration: ${seq.duration?.toFixed(2) || 'Unknown'}s\n`;
                resultMessage += `   • Lines: ${seq.startLine} → ${seq.endLine}\n`;
                if (seq.startTimestamp && seq.endTimestamp) {
                    resultMessage += `   • Time: ${seq.startTimestamp} → ${seq.endTimestamp}\n`;
                }
            });
        } else {
            resultMessage += '❌ No matching sequences found.\n\n';
            resultMessage += 'Try adjusting your sequence patterns or increasing the maximum duration.';
        }
        
        // Create results modal
        const modal = CLogApp.modules.uiManager.createModal(
            'Sequence Search Results',
            `<pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px; max-height: 400px; overflow-y: auto;">${resultMessage}</pre>`,
            [
                { text: 'Close', action: 'closeModal' },
                { text: 'Export Results', action: 'exportSequenceResults', primary: totalFound > 0 }
            ]
        );
        
        // Store results for export
        this.lastSequenceResults = { results, sequenceDef, resultMessage };
        
        document.body.appendChild(modal);
        
        // Emit event
        CLogApp.utils.emit('sequenceResultsDisplayed', {
            totalFound: totalFound,
            sequenceName: sequenceDef.name
        });
        
        console.log(`[SequenceManager] Displayed results: ${totalFound} sequences found`);
    }

    /**
     * Export sequence results
     */
    exportSequenceResults() {
        if (!this.lastSequenceResults) {
            CLogApp.modules.uiManager.showErrorMessage('No results to export');
            return;
        }

        try {
            const { results, sequenceDef, resultMessage } = this.lastSequenceResults;
            const exportData = {
                exportedAt: new Date().toISOString(),
                sequenceDefinition: sequenceDef,
                searchResults: results,
                summary: resultMessage
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `sequence_results_${sequenceDef.name || 'unnamed'}_${new Date().toISOString().split('T')[0]}.json`;
            link.click();

            CLogApp.modules.uiManager.closeModal();
            CLogApp.modules.uiManager.showSuccessMessage('Sequence results exported successfully');

        } catch (error) {
            console.error('[SequenceManager] Export failed:', error);
            CLogApp.modules.uiManager.showErrorMessage('Failed to export results: ' + error.message);
        }
    }

    /**
     * Reset sequence definition
     */
    resetSequenceDefinition(panel = 'both') {
        if (panel === 'left' || panel === 'both') {
            CLogApp.state.startEvent = null;
            CLogApp.state.endEvent = null;
            CLogApp.state.selectedLogLine = null;
            CLogApp.state.sequenceDefinitionSaved = false;

            // Reset left panel displays
            const startDisplay = document.getElementById('startEventDisplay');
            if (startDisplay) {
                startDisplay.innerHTML = '<span class="sequence-placeholder">No start event selected</span>';
            }

            const endDisplay = document.getElementById('endEventDisplay');
            if (endDisplay) {
                endDisplay.innerHTML = '<span class="sequence-placeholder">No end event selected</span>';
            }

            // Reset left panel buttons
            this.updateStartSequenceButton('left');
            
            const useSequencesBtn = document.getElementById('useSequencesBtn');
            if (useSequencesBtn) {
                useSequencesBtn.classList.add('disabled');
            }
        }

        if (panel === 'right' || panel === 'both') {
            CLogApp.state.rightStartEvent = null;
            CLogApp.state.rightEndEvent = null;

            // Reset right panel displays
            const startDisplayRight = document.getElementById('startEventDisplayRight');
            if (startDisplayRight) {
                startDisplayRight.innerHTML = '<span class="sequence-placeholder">No start event selected</span>';
            }

            const endDisplayRight = document.getElementById('endEventDisplayRight');
            if (endDisplayRight) {
                endDisplayRight.innerHTML = '<span class="sequence-placeholder">No end event selected</span>';
            }

            // Reset right panel buttons
            this.updateStartSequenceButton('right');
            
            const useSequencesRightBtn = document.getElementById('useSequencesRightBtn');
            if (useSequencesRightBtn) {
                useSequencesRightBtn.classList.add('disabled');
            }
        }

        // Clear log line selection
        CLogApp.modules.uiManager.updateLogLineSelection();

        console.log(`[SequenceManager] Sequence definition reset for ${panel} panel(s)`);

        // Emit event
        CLogApp.utils.emit('sequenceDefinitionReset', { panel });
    }

    /**
     * Reset sequence events if content changed significantly
     */
    resetSequenceEventsIfContentChanged() {
        // Check if current events still exist in the new content
        const leftLogContent = document.getElementById('leftLogContent')?.textContent;
        if (!leftLogContent) return;

        let shouldReset = false;

        if (CLogApp.state.startEvent && !leftLogContent.includes(CLogApp.state.startEvent)) {
            console.log('[SequenceManager] Start event no longer exists in log content');
            shouldReset = true;
        }

        if (CLogApp.state.endEvent && !leftLogContent.includes(CLogApp.state.endEvent)) {
            console.log('[SequenceManager] End event no longer exists in log content');
            shouldReset = true;
        }

        if (shouldReset) {
            this.resetSequenceDefinition();
            CLogApp.modules.uiManager.showErrorMessage(
                'Sequence events have been reset because the selected events are no longer present in the log content.'
            );
        }
    }

    /**
     * Validate sequence definition
     */
    validateSequenceDefinition() {
        const validation = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // Check if events are set
        if (!CLogApp.state.startEvent) {
            validation.errors.push('Start event is not selected');
            validation.isValid = false;
        }

        if (!CLogApp.state.endEvent) {
            validation.errors.push('End event is not selected');
            validation.isValid = false;
        }

        // Check if events are different
        if (CLogApp.state.startEvent && CLogApp.state.endEvent && 
            CLogApp.state.startEvent === CLogApp.state.endEvent) {
            validation.warnings.push('Start and end events are identical');
        }

        // Check if events exist in current log content
        const logContent = document.getElementById('leftLogContent')?.textContent;
        if (logContent) {
            if (CLogApp.state.startEvent && !logContent.includes(CLogApp.state.startEvent)) {
                validation.errors.push('Start event not found in current log content');
                validation.isValid = false;
            }
            
            if (CLogApp.state.endEvent && !logContent.includes(CLogApp.state.endEvent)) {
                validation.errors.push('End event not found in current log content');
                validation.isValid = false;
            }
        }

        return validation;
    }

    /**
     * Get current sequence state
     */
    getSequenceState() {
        return {
            definitionVisible: CLogApp.state.sequenceDefinitionVisible,
            startEvent: CLogApp.state.startEvent,
            endEvent: CLogApp.state.endEvent,
            selectedLogLine: CLogApp.state.selectedLogLine,
            definitionSaved: CLogApp.state.sequenceDefinitionSaved,
            validation: this.validateSequenceDefinition()
        };
    }

    /**
     * Restore sequence state
     */
    restoreSequenceState(sequenceState) {
        if (!sequenceState) return;

        // Restore basic state
        CLogApp.state.sequenceDefinitionVisible = sequenceState.definitionVisible || false;
        CLogApp.state.startEvent = sequenceState.startEvent || null;
        CLogApp.state.endEvent = sequenceState.endEvent || null;
        CLogApp.state.selectedLogLine = sequenceState.selectedLogLine || null;
        CLogApp.state.sequenceDefinitionSaved = sequenceState.definitionSaved || false;

        // Update UI
        this.updateSequenceDisplay();

        console.log('[SequenceManager] Sequence state restored');
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        // Close pattern creator window if open
        if (this.sequenceCreatorWindow && !this.sequenceCreatorWindow.closed) {
            this.sequenceCreatorWindow.close();
        }

        // Clear monitoring interval
        if (this.checkClosedInterval) {
            clearInterval(this.checkClosedInterval);
            this.checkClosedInterval = null;
        }

        console.log('[SequenceManager] Cleanup completed');
    }
}

// Export for use in other modules
window.SequenceManager = SequenceManager;