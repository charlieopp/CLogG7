/**
 * SequenceLoader - Handles loading and selecting saved sequence definitions
 */
class SequenceLoader {
    static selectedSequence = null;
    static targetPanel = null;

    /**
     * Show the sequence selection modal
     */
    static showModal(panel) {
        this.targetPanel = panel;
        this.selectedSequence = null;
        
        const modal = document.getElementById('sequenceLoadModal');
        if (modal) {
            modal.style.display = 'flex';
            this.populateSequencesList();
        }
    }

    /**
     * Close the sequence selection modal
     */
    static closeModal() {
        const modal = document.getElementById('sequenceLoadModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.selectedSequence = null;
        this.targetPanel = null;
    }

    /**
     * Populate the sequences list from localStorage
     */
    static populateSequencesList() {
        const container = document.getElementById('savedSequencesList');
        if (!container) return;

        try {
            // Get sequences from the new multi-sequence storage
            const sequences = this.getAllSequences();
            
            if (sequences.length === 0) {
                container.innerHTML = `
                    <div class="no-sequences">
                        <div>📋 No saved sequences found</div>
                        <div style="margin-top: 8px; font-size: 12px;">
                            Create sequences using "Build Seq" and save them in the pattern creator.
                        </div>
                    </div>
                `;
                return;
            }

            // Sort sequences by creation date (newest first)
            sequences.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            // Generate HTML for each sequence
            container.innerHTML = sequences.map(sequence => {
                const createdDate = new Date(sequence.createdAt).toLocaleString();
                const startInfo = sequence.startSelected > 0 ? `Start: ${sequence.startSelected} chars` : 'Start: None';
                const endInfo = sequence.endSelected > 0 ? `End: ${sequence.endSelected} chars` : 'End: None';
                
                return `
                    <div class="sequence-item" data-sequence-id="${sequence.id}" onclick="SequenceLoader.selectSequence('${sequence.id}')">
                        <div class="sequence-name">${this.escapeHtml(sequence.name)}</div>
                        <div class="sequence-info">Duration: ${sequence.duration}s • ${startInfo} • ${endInfo}</div>
                        <div class="sequence-patterns">
                            ${sequence.startSelected > 0 ? '<span class="pattern-badge">START</span>' : ''}
                            ${sequence.endSelected > 0 ? '<span class="pattern-badge">END</span>' : ''}
                        </div>
                        <div class="sequence-date">Created: ${createdDate}</div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('[SequenceLoader] Error loading sequences:', error);
            container.innerHTML = `
                <div class="no-sequences">
                    <div>❌ Error loading sequences</div>
                    <div style="margin-top: 8px; font-size: 12px;">${error.message}</div>
                </div>
            `;
        }
    }

    /**
     * Select a sequence from the list
     */
    static selectSequence(sequenceId) {
        // Remove previous selection
        document.querySelectorAll('.sequence-item.selected').forEach(item => {
            item.classList.remove('selected');
        });

        // Add selection to clicked item
        const selectedItem = document.querySelector(`[data-sequence-id="${sequenceId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
            this.selectedSequence = sequenceId;
            
            // Add Load button if not already present
            this.addLoadButton();
        }
    }

    /**
     * Add Load button to modal when sequence is selected
     */
    static addLoadButton() {
        const buttonContainer = document.querySelector('#sequenceLoadModal .modal-buttons');
        if (!buttonContainer) return;

        // Check if Load button already exists
        let loadButton = buttonContainer.querySelector('.load-sequence-btn');
        if (!loadButton) {
            loadButton = document.createElement('button');
            loadButton.className = 'modal-btn primary load-sequence-btn';
            loadButton.textContent = 'Load';
            loadButton.onclick = () => this.loadSelectedSequence();
            
            // Insert before Cancel button
            const cancelButton = buttonContainer.querySelector('.modal-btn.cancel');
            buttonContainer.insertBefore(loadButton, cancelButton);
        }
    }

    /**
     * Load the selected sequence
     */
    static loadSelectedSequence() {
        if (!this.selectedSequence || !this.targetPanel) {
            alert('❌ No sequence selected');
            return;
        }

        try {
            const sequences = this.getAllSequences();
            const sequence = sequences.find(seq => seq.id === this.selectedSequence);
            
            if (!sequence) {
                alert('❌ Selected sequence not found');
                return;
            }

            // Set as current sequence for backwards compatibility
            localStorage.setItem('clog_sequence_definition', JSON.stringify(sequence));
            localStorage.setItem('clog_sequence_saved', 'true');

            // Enable the Use Seq button for the target panel
            const useSeqBtnId = this.targetPanel === 'right' ? 'useSequencesRightBtn' : 'useSequencesBtn';
            const useSeqBtn = document.getElementById(useSeqBtnId);
            if (useSeqBtn) {
                useSeqBtn.classList.remove('disabled');
            }

            // Show success message
            const startInfo = sequence.startSelected > 0 ? 
                `Start Pattern: ${sequence.startSelected} characters configured` :
                'Start Pattern: Not configured';
            
            const endInfo = sequence.endSelected > 0 ? 
                `End Pattern: ${sequence.endSelected} characters configured` :
                'End Pattern: Not configured';

            const message = `✅ Sequence "${sequence.name}" loaded successfully!

⏳ Max Duration: ${sequence.duration} seconds
📅 Created: ${new Date(sequence.createdAt).toLocaleString()}

${startInfo}
${endInfo}

The sequence is now ready to use. Click "Use Seq" to find matching sequences in your logs.`;

            alert(message);
            
            console.log(`[SequenceLoader] Loaded sequence "${sequence.name}" for ${this.targetPanel} panel`, sequence);
            
            // Close the modal
            this.closeModal();

        } catch (error) {
            console.error('[SequenceLoader] Error loading selected sequence:', error);
            alert('❌ Error loading sequence:\n\n' + error.message);
        }
    }

    /**
     * Get all sequences from both old and new storage formats
     */
    static getAllSequences() {
        let sequences = [];
        
        try {
            // First try to get from new multi-sequence storage
            const multiSequences = localStorage.getItem('clog_sequence_definitions');
            if (multiSequences) {
                sequences = JSON.parse(multiSequences);
                if (Array.isArray(sequences)) {
                    return sequences;
                }
            }
        } catch (error) {
            console.warn('[SequenceLoader] Error reading multi-sequence storage:', error);
        }

        try {
            // Fall back to old single sequence storage
            const singleSequence = localStorage.getItem('clog_sequence_definition');
            if (singleSequence) {
                const sequence = JSON.parse(singleSequence);
                // Add ID if missing
                if (!sequence.id) {
                    sequence.id = Date.now().toString();
                }
                return [sequence];
            }
        } catch (error) {
            console.warn('[SequenceLoader] Error reading single sequence storage:', error);
        }

        return [];
    }

    /**
     * Clear all saved sequences
     */
    static clearAllSequences() {
        const confirmed = confirm('⚠️ Are you sure you want to delete all saved sequences?\n\nThis action cannot be undone.');
        
        if (confirmed) {
            try {
                localStorage.removeItem('clog_sequence_definitions');
                localStorage.removeItem('clog_sequence_definition');
                localStorage.removeItem('clog_sequence_saved');
                
                alert('✅ All sequences have been deleted.');
                
                // Refresh the list
                this.populateSequencesList();
                
                console.log('[SequenceLoader] All sequences cleared');
                
            } catch (error) {
                console.error('[SequenceLoader] Error clearing sequences:', error);
                alert('❌ Error clearing sequences:\n\n' + error.message);
            }
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Make SequenceLoader globally available
window.SequenceLoader = SequenceLoader;