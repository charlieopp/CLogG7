/**
 * SequenceManager - Sequence save/use workflow
 */

class SequenceManager {
    constructor() {
        this.lastSequenceResults = null;
        console.log('[SequenceManager] Initialized');
    }

    // ── Event Display ────────────────────────────────────────────────────────

    updateEventDisplay(displayId, eventText) {
        const display = document.getElementById(displayId);
        if (!display) return;
        display.innerHTML = eventText
            ? `<span class="sequence-event-text">${eventText}</span>`
            : '<span class="sequence-placeholder">No event selected</span>';
    }

    updateStartSequenceButton(panel = 'left') {
        const btn = document.getElementById(panel === 'right' ? 'startSequenceRightBtn' : 'startSequenceBtn');
        if (!btn) return;
        const hasStart = !!CLogApp.state[panel === 'right' ? 'rightStartEvent' : 'startEvent'];
        const hasEnd   = !!CLogApp.state[panel === 'right' ? 'rightEndEvent'   : 'endEvent'];
        btn.classList.toggle('disabled', !(hasStart && hasEnd));
    }

    updateSequenceDisplay(panel = 'both') {
        const sides = panel === 'both' ? ['left', 'right'] : [panel];
        for (const p of sides) {
            const startKey = p === 'right' ? 'rightStartEvent' : 'startEvent';
            const endKey   = p === 'right' ? 'rightEndEvent'   : 'endEvent';
            const startId  = p === 'right' ? 'startEventDisplayRight' : 'startEventDisplay';
            const endId    = p === 'right' ? 'endEventDisplayRight'   : 'endEventDisplay';
            this.updateEventDisplay(startId, CLogApp.state[startKey]);
            this.updateEventDisplay(endId,   CLogApp.state[endKey]);
            this.updateStartSequenceButton(p);
        }
    }

    // ── Save sequence from selected start/end lines ──────────────────────────

    saveSequenceDefinition(panel = 'left') {
        const startKey = panel === 'right' ? 'rightStartEvent' : 'startEvent';
        const endKey   = panel === 'right' ? 'rightEndEvent'   : 'endEvent';
        const startEvent = CLogApp.state[startKey];
        const endEvent   = CLogApp.state[endKey];

        if (!startEvent || !endEvent) {
            CLogApp.modules.uiManager.showErrorMessage('Select both a start and end line before saving.');
            return;
        }

        const name = (prompt('Name this sequence:') || '').trim()
            || `Sequence ${new Date().toLocaleString()}`;

        const escapeRegex = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const sequence = {
            id: Date.now().toString(),
            name,
            startPattern: { pattern: escapeRegex(startEvent) },
            endPattern:   { pattern: escapeRegex(endEvent) },
            startSelected: startEvent.length,
            endSelected:   endEvent.length,
            duration: 300,
            createdAt: new Date().toISOString()
        };

        try {
            const all = JSON.parse(localStorage.getItem('clog_sequence_definitions') || '[]');
            all.push(sequence);
            localStorage.setItem('clog_sequence_definitions', JSON.stringify(all));
            localStorage.setItem('clog_sequence_definition', JSON.stringify(sequence));
            this.onSequenceDefinitionSaved(panel);
        } catch (err) {
            CLogApp.modules.uiManager.showErrorMessage('Failed to save sequence: ' + err.message);
        }
    }

    onSequenceDefinitionSaved(panel = 'left') {
        CLogApp.state.sequenceDefinitionSaved = true;
        const btnId = panel === 'right' ? 'useSequencesRightBtn' : 'useSequencesBtn';
        document.getElementById(btnId)?.classList.remove('disabled');
        CLogApp.modules.uiManager.showSuccessMessage(
            `Sequence saved. Click "Use Sequences" to find matches.`
        );
        CLogApp.utils.emit('sequenceDefinitionSaved', {
            startEvent: CLogApp.state[panel === 'right' ? 'rightStartEvent' : 'startEvent'],
            endEvent:   CLogApp.state[panel === 'right' ? 'rightEndEvent'   : 'endEvent']
        });
    }

    loadSequenceDefinition() {
        try {
            const json = localStorage.getItem('clog_sequence_definition');
            return json ? JSON.parse(json) : null;
        } catch (err) {
            console.error('[SequenceManager] Failed to load sequence definition:', err);
            return null;
        }
    }

    // ── Use sequences ────────────────────────────────────────────────────────

    async useSequences(panel = 'left') {
        const useBtnId = panel === 'right' ? 'useSequencesRightBtn' : 'useSequencesBtn';
        const useBtn = document.getElementById(useBtnId);
        if (!useBtn || useBtn.classList.contains('disabled')) return;

        try {
            const sequenceDef = this.loadSequenceDefinition();
            if (!sequenceDef) throw new Error('No sequence definition found. Save or load a sequence first.');

            const fileId = CLogApp.modules.lineRangeManager?.state?.[panel]?.fileId;
            if (!fileId) throw new Error('No file loaded in this panel.');

            this.showSequenceProcessing(true, panel);

            // Register pattern with backend
            const patternResp = await window.ApiClient.createSequence(panel, {
                name: sequenceDef.name,
                startPattern: sequenceDef.startPattern,
                endPattern:   sequenceDef.endPattern,
                constraints:  {}
            });

            if (!patternResp?.patternId) throw new Error('Backend did not return a pattern ID.');

            // Find matches
            const findResp = await window.ApiClient.findSequences(
                panel, fileId, patternResp.patternId
            );

            this.showSequenceProcessing(false, panel);

            const stats = findResp.statistics || {};
            this.displaySequenceResults(
                {
                    sequences:  findResp.sequences || [],
                    totalFound: stats.totalSequences || 0,
                    searchTime: stats.searchTime
                },
                sequenceDef,
                panel
            );

        } catch (err) {
            console.error('[SequenceManager] Sequence processing failed:', err);
            this.showSequenceProcessing(false, panel);
            CLogApp.modules.uiManager.showErrorMessage('Failed to find sequences: ' + err.message);
        }
    }

    showSequenceProcessing(isProcessing, panel = 'left') {
        const btnId = panel === 'right' ? 'useSequencesRightBtn' : 'useSequencesBtn';
        const btn = document.getElementById(btnId);
        if (!btn) return;
        if (isProcessing) {
            btn.textContent = 'Processing...';
            btn.classList.add('disabled');
        } else {
            btn.textContent = 'Use Sequences';
            if (CLogApp.state.sequenceDefinitionSaved) btn.classList.remove('disabled');
        }
    }

    displaySequenceResults(results, sequenceDef, panel = 'left') {
        const { sequences, totalFound, searchTime } = results;

        let html = `<pre style="white-space:pre-wrap;font-family:monospace;font-size:12px;max-height:400px;overflow-y:auto;">`;
        html += `Search: "${sequenceDef.name || 'Unnamed'}"\n`;
        html += `Found ${totalFound} sequence${totalFound !== 1 ? 's' : ''}`;
        if (searchTime) html += ` in ${searchTime.toFixed(3)}s`;
        html += '\n';

        if (sequences.length > 0) {
            sequences.forEach((seq, i) => {
                html += `\n${i + 1}. Lines ${seq.startLine} → ${seq.endLine}`;
                html += ` (${seq.lineCount} lines)\n`;
                html += `   Start: ${seq.startMatch?.line?.substring(0, 80) || ''}\n`;
                html += `   End:   ${seq.endMatch?.line?.substring(0, 80) || ''}\n`;
            });
        } else {
            html += '\nNo matching sequences found.\n';
            html += 'Try adjusting your start/end event selections.';
        }
        html += '</pre>';

        this.lastSequenceResults = { results, sequenceDef };

        const buttons = [
            { text: 'Close', onclick: { toString: () => 'CLogApp.modules.uiManager.modals.closeModal()' } }
        ];
        if (totalFound > 0) {
            buttons.push({
                text: 'Export',
                class: 'primary',
                onclick: { toString: () => 'CLogApp.modules.sequenceManager.exportSequenceResults()' }
            });
        }

        CLogApp.modules.uiManager.modals.createModal('Sequence Results', html, buttons);

        CLogApp.utils.emit('sequenceResultsDisplayed', { totalFound, sequenceName: sequenceDef.name, panel });
    }

    exportSequenceResults() {
        if (!this.lastSequenceResults) {
            CLogApp.modules.uiManager.showErrorMessage('No results to export');
            return;
        }
        try {
            const { results, sequenceDef } = this.lastSequenceResults;
            const dataStr = JSON.stringify({ exportedAt: new Date().toISOString(), sequenceDef, results }, null, 2);
            const link = document.createElement('a');
            link.href = URL.createObjectURL(new Blob([dataStr], { type: 'application/json' }));
            link.download = `sequence_results_${(sequenceDef.name || 'unnamed').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            CLogApp.modules.uiManager.modals.closeModal();
            CLogApp.modules.uiManager.showSuccessMessage('Sequence results exported');
        } catch (err) {
            CLogApp.modules.uiManager.showErrorMessage('Export failed: ' + err.message);
        }
    }

    // ── Reset ────────────────────────────────────────────────────────────────

    resetSequenceDefinition(panel = 'both') {
        const sides = panel === 'both' ? ['left', 'right'] : [panel];
        for (const p of sides) {
            const startKey = p === 'right' ? 'rightStartEvent' : 'startEvent';
            const endKey   = p === 'right' ? 'rightEndEvent'   : 'endEvent';
            CLogApp.state[startKey] = null;
            CLogApp.state[endKey]   = null;
            if (p === 'left') {
                CLogApp.state.selectedLogLine = null;
                CLogApp.state.sequenceDefinitionSaved = false;
            }
            this.updateSequenceDisplay(p);
            document.getElementById(p === 'right' ? 'useSequencesRightBtn' : 'useSequencesBtn')
                ?.classList.add('disabled');
        }
        CLogApp.modules.uiManager.updateLogLineSelection?.();
        CLogApp.utils.emit('sequenceDefinitionReset', { panel });
    }

    // ── State persistence ────────────────────────────────────────────────────

    getSequenceState() {
        return {
            definitionVisible: CLogApp.state.sequenceDefinitionVisible,
            startEvent: CLogApp.state.startEvent,
            endEvent:   CLogApp.state.endEvent,
            definitionSaved: CLogApp.state.sequenceDefinitionSaved
        };
    }

    restoreSequenceState(sequenceState) {
        if (!sequenceState) return;
        CLogApp.state.sequenceDefinitionVisible = sequenceState.definitionVisible || false;
        CLogApp.state.startEvent = sequenceState.startEvent || null;
        CLogApp.state.endEvent   = sequenceState.endEvent   || null;
        CLogApp.state.sequenceDefinitionSaved = sequenceState.definitionSaved || false;
        this.updateSequenceDisplay('left');
        console.log('[SequenceManager] Sequence state restored');
    }
}

window.SequenceManager = SequenceManager;
