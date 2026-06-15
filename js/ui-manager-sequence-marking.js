/**
 * UIManager Sequence Marking - Sequence event marking functionality
 * Handles the sequence build mode and event selection workflow
 */

class UIManagerSequenceMarking {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    /**
     * Handle sequence marking workflow
     */
    handleSequenceMarking(lineContent, panel, lineIndex) {
        const currentMode = this.uiManager.markingMode[panel];
        const startEventKey = panel === 'right' ? 'rightStartEvent' : 'startEvent';
        const endEventKey = panel === 'right' ? 'rightEndEvent' : 'endEvent';
        
        console.log(`[UIManager] Line clicked in ${panel} panel, mode: ${currentMode}`);
        
        if (currentMode === 'marking-start') {
            // Mark as start event (green)
            CLogApp.state[startEventKey] = lineContent;
            CLogApp.state[endEventKey] = null; // Clear any previous end event
            
            // Update display
            const startDisplayId = panel === 'right' ? 'startEventDisplayRight' : 'startEventDisplay';
            const endDisplayId = panel === 'right' ? 'endEventDisplayRight' : 'endEventDisplay';
            this.uiManager.utils.updateEventDisplay(startDisplayId, lineContent);
            this.uiManager.utils.updateEventDisplay(endDisplayId, null);
            
            // Update highlighting immediately
            this.uiManager.codemirror.updateLogHighlighting(`${panel}LogContent`);
            
            console.log(`[UIManager] Start event marked: ${lineContent.substring(0, 50)}...`);
            
        } else if (currentMode === 'marking-end') {
            // Mark as end event (red)
            CLogApp.state[endEventKey] = lineContent;
            
            // Update display
            const endDisplayId = panel === 'right' ? 'endEventDisplayRight' : 'endEventDisplay';
            this.uiManager.utils.updateEventDisplay(endDisplayId, lineContent);
            
            // Update highlighting immediately
            this.uiManager.codemirror.updateLogHighlighting(`${panel}LogContent`);
            
            console.log(`[UIManager] End event marked: ${lineContent.substring(0, 50)}...`);
            
        } else if (currentMode === 'none') {
            // Not in sequence mode, handle as regular click
            this.handleRegularLineClick(lineContent, panel, lineIndex);
        }
    }

    /**
     * Handle regular line clicks (non-sequence mode)
     */
    handleRegularLineClick(lineContent, panel, lineIndex) {
        // Set as selected line
        CLogApp.state.selectedLogLine = lineContent;
        
        // Update highlighting
        this.uiManager.codemirror.updateLogHighlighting(`${panel}LogContent`);
        
        console.log(`[UIManager] Line selected: ${lineContent.substring(0, 50)}...`);
    }

    /**
     * Enter sequence build mode
     */
    enterSequenceBuildMode(panel) {
        const startEventKey = panel === 'right' ? 'rightStartEvent' : 'startEvent';
        const endEventKey = panel === 'right' ? 'rightEndEvent' : 'endEvent';
        
        // Check if we have existing start/end events
        const hasStartEvent = !!CLogApp.state[startEventKey];
        const hasEndEvent = !!CLogApp.state[endEventKey];
        
        console.log(`[UIManager] enterSequenceBuildMode debug - ${panel} panel:`);
        console.log(`  - ${startEventKey}:`, CLogApp.state[startEventKey] ? 'SET' : 'NULL');
        console.log(`  - ${endEventKey}:`, CLogApp.state[endEventKey] ? 'SET' : 'NULL');
        console.log(`  - hasStartEvent:`, hasStartEvent);
        console.log(`  - hasEndEvent:`, hasEndEvent);
        
        // Set appropriate marking mode based on existing events
        if (hasStartEvent && hasEndEvent) {
            // Both events exist - go to locked mode
            this.uiManager.markingMode[panel] = 'locked';
            console.log(`[UIManager] Entered sequence build mode for ${panel} panel - sequence already complete`);
        } else if (hasStartEvent) {
            // Only start event exists - go to marking end mode
            this.uiManager.markingMode[panel] = 'marking-end';
            console.log(`[UIManager] Entered sequence build mode for ${panel} panel - now marking end events`);
        } else {
            // No events - start from beginning
            this.uiManager.markingMode[panel] = 'marking-start';
            console.log(`[UIManager] Entered sequence build mode for ${panel} panel - now marking start events`);
        }
        
        // Show sequence definition area
        const sequenceArea = document.getElementById(
            panel === 'right' ? 'sequenceDefinitionAreaRight' : 'sequenceDefinitionArea'
        );
        if (sequenceArea) {
            sequenceArea.classList.remove('hidden');
        }
        
        // Update the "Refine sequence definition" button state
        const startSequenceBtn = document.getElementById(
            panel === 'right' ? 'startSequenceRightBtn' : 'startSequenceBtn'
        );
        if (startSequenceBtn) {
            if (hasStartEvent && hasEndEvent) {
                startSequenceBtn.classList.remove('disabled');
            } else {
                startSequenceBtn.classList.add('disabled');
            }
        }
        
        // Update event displays
        const startDisplayId = panel === 'right' ? 'startEventDisplayRight' : 'startEventDisplay';
        const endDisplayId = panel === 'right' ? 'endEventDisplayRight' : 'endEventDisplay';
        this.uiManager.utils.updateEventDisplay(startDisplayId, CLogApp.state[startEventKey]);
        this.uiManager.utils.updateEventDisplay(endDisplayId, CLogApp.state[endEventKey]);
        
        // Update highlighting to show existing events
        this.uiManager.codemirror.updateLogHighlighting(`${panel}LogContent`);
    }

    /**
     * Load a saved sequence definition - shows selection modal
     */
    loadSequenceDefinition(panel) {
        console.log(`[UIManager] Opening sequence selection for ${panel} panel`);
        
        // Use the SequenceLoader modal to select a sequence
        if (window.SequenceLoader) {
            SequenceLoader.showModal(panel);
        } else {
            console.error('[UIManager] SequenceLoader not available');
            alert('❌ Sequence loader not available. Please refresh the page and try again.');
        }
    }

    /**
     * Set sequence start event - transitions to marking end mode
     */
    setSequenceStartEvent(panel) {
        const startEventKey = panel === 'right' ? 'rightStartEvent' : 'startEvent';
        
        if (!CLogApp.state[startEventKey]) {
            alert('Click a line first to mark as start event.');
            return;
        }
        
        // Transition to marking end mode
        this.uiManager.markingMode[panel] = 'marking-end';
        console.log(`[UIManager] Start event confirmed for ${panel} panel - now marking end events`);
    }

    /**
     * Set sequence end event - enables sequence refinement
     */
    setSequenceEndEvent(panel) {
        const endEventKey = panel === 'right' ? 'rightEndEvent' : 'endEvent';
        
        if (!CLogApp.state[endEventKey]) {
            alert('Click a line first to mark as end event.');
            return;
        }
        
        // Lock the sequence and enable refinement
        this.uiManager.markingMode[panel] = 'locked';
        
        // Enable the "Refine sequence definition" button
        const startSequenceBtn = document.getElementById(
            panel === 'right' ? 'startSequenceRightBtn' : 'startSequenceBtn'
        );
        if (startSequenceBtn) {
            startSequenceBtn.classList.remove('disabled');
        }
        
        console.log(`[UIManager] End event confirmed for ${panel} panel - sequence definition complete`);
    }

    /**
     * Clear sequence selections and restart marking mode
     */
    clearSequenceSelections(panel = 'left') {
        if (panel === 'right') {
            // Clear right panel selections
            CLogApp.state.rightStartEvent = null;
            CLogApp.state.rightEndEvent = null;
            this.uiManager.utils.updateEventDisplay('startEventDisplayRight', null);
            this.uiManager.utils.updateEventDisplay('endEventDisplayRight', null);
        } else {
            // Clear left panel selections
            CLogApp.state.startEvent = null;
            CLogApp.state.endEvent = null;
            this.uiManager.utils.updateEventDisplay('startEventDisplay', null);
            this.uiManager.utils.updateEventDisplay('endEventDisplay', null);
        }
        
        // Reset to marking start mode (stay in build mode)
        this.uiManager.markingMode[panel] = 'marking-start';
        
        // Keep sequence definition area visible
        const sequenceArea = document.getElementById(
            panel === 'right' ? 'sequenceDefinitionAreaRight' : 'sequenceDefinitionArea'
        );
        if (sequenceArea) {
            sequenceArea.classList.remove('hidden');
        }
        
        // Disable the "Refine sequence definition" button
        const startSequenceBtn = document.getElementById(
            panel === 'right' ? 'startSequenceRightBtn' : 'startSequenceBtn'
        );
        if (startSequenceBtn) {
            startSequenceBtn.classList.add('disabled');
        }
        
        // Clear current selection
        CLogApp.state.selectedLogLine = null;
        
        // Update highlighting
        this.updateSequenceEventHighlighting();
        
        console.log(`[UIManager] Cleared sequence selections for ${panel} panel - now marking start events`);
    }

    /**
     * Update sequence event highlighting for all panels
     */
    updateSequenceEventHighlighting() {
        // Update left panel
        if (this.uiManager.logLineCache.has('leftLogContent')) {
            this.uiManager.codemirror.updateLogHighlighting('leftLogContent');
        }
        
        // Update right panel if it exists
        if (this.uiManager.logLineCache.has('rightLogContent')) {
            this.uiManager.codemirror.updateLogHighlighting('rightLogContent');
        }
    }

    /**
     * Toggle the sequence definition area between shown and hidden,
     * preserving any configured start/end events and saved sequence.
     */
    toggleSequenceBuildArea(panel) {
        const sequenceArea = document.getElementById(
            panel === 'right' ? 'sequenceDefinitionAreaRight' : 'sequenceDefinitionArea'
        );
        const toggleBtn = document.getElementById(
            panel === 'right' ? 'buildSequencesRightBtn' : 'buildSequencesBtn'
        );
        if (!sequenceArea) {
            console.warn(`[UIManager] Sequence definition area not found for ${panel} panel`);
            return;
        }

        const stateKey = panel === 'right' ? 'rightSequenceDefinitionVisible' : 'sequenceDefinitionVisible';
        const isHidden = sequenceArea.classList.contains('hidden');
        if (isHidden) {
            this.enterSequenceBuildMode(panel);
            if (toggleBtn) toggleBtn.textContent = 'Hide Sequences';
            CLogApp.state[stateKey] = true;
        } else {
            sequenceArea.classList.add('hidden');
            this.uiManager.markingMode[panel] = 'none';
            if (toggleBtn) toggleBtn.textContent = 'Show Sequences';
            CLogApp.state[stateKey] = false;
            console.log(`[UIManager] ${panel} sequence definition area hidden`);
        }
    }

    /**
     * Exit sequence build mode completely
     */
    exitSequenceBuildMode(panel) {
        // Clear selections
        this.clearSequenceSelections(panel);
        
        // Exit marking mode completely
        this.uiManager.markingMode[panel] = 'none';
        
        // Hide sequence definition area
        const sequenceArea = document.getElementById(
            panel === 'right' ? 'sequenceDefinitionAreaRight' : 'sequenceDefinitionArea'
        );
        if (sequenceArea) {
            sequenceArea.classList.add('hidden');
        }
        
        console.log(`[UIManager] Exited sequence build mode for ${panel} panel`);
    }

    /**
     * Check if panel is in sequence build mode
     */
    isInSequenceBuildMode(panel) {
        return this.uiManager.markingMode[panel] !== 'none';
    }

    /**
     * Get current marking mode for panel
     */
    getMarkingMode(panel) {
        return this.uiManager.markingMode[panel];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManagerSequenceMarking;
} else if (typeof window !== 'undefined') {
    window.UIManagerSequenceMarking = UIManagerSequenceMarking;
}