/**
 * UIManager - User Interface Interactions (UPDATED FOR COMPACT FILTERS)
 * Handles DOM manipulation, event handlers, and UI components
 * 
 * UPDATES:
 * - Integrated with compact FilterPill class
 * - Preserves line breaks in log content
 * - Uses event delegation for line clicking
 * - Maintains original text structure
 */

class UIManager {
    constructor() {
        this.currentModal = null;
        this.filterPillCounter = 0;
        this.logLineCache = new Map(); // Cache for line operations
        this.filters = new UIManagerFilters(this);
        this.sequences = new UIManagerSequences(this);
        this.codeMirrorInstances = new Map(); // CodeMirror instances for each panel
        
        // Sequence marking mode state
        this.markingMode = {
            left: 'none', // 'none', 'marking-start', 'marking-end', 'locked'
            right: 'none'
        };
        
        this.initializeEventListeners();
        this.initializeCodeMirrorEditors();
        console.log('[UIManager] Initialized with CodeMirror support');
    }

    /**
     * Initialize CodeMirror editors for both panels
     */
    initializeCodeMirrorEditors() {
        // Wait for CodeMirror 6 to be available
        if (!window.CodeMirror6) {
            console.log('[UIManager] CodeMirror 6 not yet available, retrying...');
            setTimeout(() => this.initializeCodeMirrorEditors(), 100);
            return;
        }
        
        console.log('[UIManager] CodeMirror 6 is available, initializing editors...');

        // Check if already initialized
        if (this.codeMirrorInstances.has('left') || this.codeMirrorInstances.has('right')) {
            console.log('[UIManager] CodeMirror editors already initialized, skipping...');
            return;
        }

        // Initialize left panel CodeMirror
        const leftTextArea = document.getElementById('leftLogContent');
        if (leftTextArea) {
            // Hide the textarea and create editor container
            leftTextArea.style.display = 'none';
            const leftContainer = document.createElement('div');
            leftContainer.className = 'codemirror-container';
            leftTextArea.parentNode.insertBefore(leftContainer, leftTextArea.nextSibling);
            
            const leftEditor = window.CodeMirror6.createEditor(leftContainer, {
                doc: leftTextArea.value || '',
                readOnly: true,
                lineWrapping: true,
                theme: document.documentElement.hasAttribute('data-theme') ? 'dark' : 'light',
                onLineClick: (lineContent, lineNumber, event) => {
                    this.handleCodeMirrorClick(leftEditor, event, 'left', lineContent, lineNumber);
                }
            });
            this.codeMirrorInstances.set('left', leftEditor);
            
            console.log('[UIManager] Left CodeMirror 6 editor initialized');
        }

        // Initialize right panel CodeMirror  
        const rightTextArea = document.getElementById('rightLogContent');
        if (rightTextArea) {
            // Hide the textarea and create editor container
            rightTextArea.style.display = 'none';
            const rightContainer = document.createElement('div');
            rightContainer.className = 'codemirror-container';
            rightTextArea.parentNode.insertBefore(rightContainer, rightTextArea.nextSibling);
            
            const rightEditor = window.CodeMirror6.createEditor(rightContainer, {
                doc: rightTextArea.value || '',
                readOnly: true,
                lineWrapping: true,
                theme: document.documentElement.hasAttribute('data-theme') ? 'dark' : 'light',
                onLineClick: (lineContent, lineNumber, event) => {
                    this.handleCodeMirrorClick(rightEditor, event, 'right', lineContent, lineNumber);
                }
            });
            this.codeMirrorInstances.set('right', rightEditor);
            
            console.log('[UIManager] Right CodeMirror 6 editor initialized');
        }
    }

    /**
     * Handle clicks on CodeMirror editors - UPDATED FOR NEW WORKFLOW
     */
    handleCodeMirrorClick(editor, event, panel, lineContent, lineNumber) {
        if (lineContent !== undefined) {
            this.handleSequenceMarking(lineContent, panel, lineNumber);
        }
    }

    /**
     * Handle sequence marking workflow
     */
    handleSequenceMarking(lineContent, panel, lineIndex) {
        const currentMode = this.markingMode[panel];
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
            this.updateEventDisplay(startDisplayId, lineContent);
            this.updateEventDisplay(endDisplayId, null);
            
            // Update highlighting immediately
            this.updateLogHighlighting(`${panel}LogContent`);
            
            console.log(`[UIManager] Start event marked: ${lineContent.substring(0, 50)}...`);
            
        } else if (currentMode === 'marking-end') {
            // Mark as end event (red)
            CLogApp.state[endEventKey] = lineContent;
            
            // Update display
            const endDisplayId = panel === 'right' ? 'endEventDisplayRight' : 'endEventDisplay';
            this.updateEventDisplay(endDisplayId, lineContent);
            
            // Update highlighting immediately
            this.updateLogHighlighting(`${panel}LogContent`);
            
            console.log(`[UIManager] End event marked: ${lineContent.substring(0, 50)}...`);
            
        } else if (currentMode === 'locked') {
            // In locked mode, check if clicking on existing events to clear them
            const isClickedStartEvent = (lineContent === CLogApp.state[startEventKey]);
            const isClickedEndEvent = (lineContent === CLogApp.state[endEventKey]);
            
            if (isClickedStartEvent) {
                CLogApp.state[startEventKey] = null;
                const displayId = panel === 'right' ? 'startEventDisplayRight' : 'startEventDisplay';
                this.updateEventDisplay(displayId, null);
                this.updateLogHighlighting(`${panel}LogContent`);
                console.log(`[UIManager] Start event cleared`);
            } else if (isClickedEndEvent) {
                CLogApp.state[endEventKey] = null;
                const displayId = panel === 'right' ? 'endEventDisplayRight' : 'endEventDisplay';
                this.updateEventDisplay(displayId, null);
                this.updateLogHighlighting(`${panel}LogContent`);
                console.log(`[UIManager] End event cleared`);
            }
        }
        
        // For sync mode (if still needed)
        const inSyncMode = panel === 'right' ? 
            CLogApp.state.rightInSyncMode : CLogApp.state.leftInSyncMode;
        if (inSyncMode) {
            this.setSyncPoint(lineContent, panel === 'right');
        }
    }

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
        // File selection buttons
        this.bindEvent('selectLogLeftBtn', 'click', () => this.openRemoteFileBrowser('left'));
        
        // Control buttons
        this.bindEvent('buildSequencesBtn', 'click', () => {
            this.enterSequenceBuildMode('left');
        });
        
        this.bindEvent('loadSequencesBtn', 'click', () => {
            this.loadSequenceDefinition('left');
        });
        
        this.bindEvent('useSequencesBtn', 'click', () => {
            this.sequences.useSequences('left');
        });
        
        this.bindEvent('refreshLeftBtn', 'click', () => this.refreshLog(false));
        this.bindEvent('followLeftBtn', 'click', () => this.toggleFollow(false));
        this.bindEvent('syncLeftBtn', 'click', () => this.sequences.toggleSyncMode(false));
        this.bindEvent('sideBySideBtn', 'click', () => {
            CLogApp.modules.panelManager.toggleSideBySide();
        });
        
        // Settings and state management
        this.bindEvent('settingsBtn', 'click', (e) => this.showSettings(e));
        this.bindEvent('saveStateBtn', 'click', () => this.showSaveStateModal());
        
        // Filter controls
        this.bindEvent('leftFilterToggle', 'click', () => this.filters.toggleFilters(false));
        this.bindEvent('addLeftFilterBtn', 'click', () => this.filters.addFilterPill('leftFiltersContainer'));
        
        // Sequence controls
        this.bindEvent('setStartEventBtn', 'click', () => {
            this.setSequenceStartEvent('left');
        });
        
        this.bindEvent('setEndEventBtn', 'click', () => {
            this.setSequenceEndEvent('left');
        });
        
        this.bindEvent('startSequenceBtn', 'click', () => {
            CLogApp.modules.sequenceManager.startSequenceDefinition();
        });
        
        this.bindEvent('clearSequenceBtn', 'click', () => {
            this.clearSequenceSelections('left');
        });

        // Global click handler to close time pickers and spinners
        document.addEventListener('click', (e) => {
            // Close time pickers when clicking outside
            if (!e.target.closest('.inline-time-picker') && !e.target.closest('.filter-entry.time-mode')) {
                document.querySelectorAll('.inline-time-picker.show').forEach(picker => {
                    picker.classList.remove('show');
                    picker.closest('.filter-pill').classList.remove('time-picker-open');
                });
            }
            
            // Close popup spinners when clicking outside
            if (!e.target.closest('.time-input-popup-spinner')) {
                document.querySelectorAll('.time-input-popup-spinner').forEach(spinner => {
                    spinner.remove();
                });
            }
        });

        // ESC key handler for time pickers
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Close time pickers
                document.querySelectorAll('.inline-time-picker.show').forEach(picker => {
                    picker.classList.remove('show');
                    picker.closest('.filter-pill').classList.remove('time-picker-open');
                });
                
                // Close popup spinners
                document.querySelectorAll('.time-input-popup-spinner').forEach(spinner => {
                    spinner.remove();
                });
            }
        });
    }

    /**
     * Utility function to bind events safely
     */
    bindEvent(elementId, eventType, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(eventType, handler);
        } else {
            console.warn(`[UIManager] Element not found: ${elementId}`);
        }
    }

    /**
     * REMOVED: Local file selection functionality
     * All file operations now go through the backend via openRemoteFileBrowser()
     */

    /**
     * Set log content for a panel - UPDATED FOR CODEMIRROR
     * Uses CodeMirror editor for display
     */
    setLogContent(panel, content, filename, fileId = null) {
        const editor = this.codeMirrorInstances.get(panel);
        
        if (editor) {
            // Set content in CodeMirror editor
            if (window.CodeMirror6) {
                window.CodeMirror6.updateEditorContent(editor, content);
            } else {
                editor.setValue(content);
            }
            
            // Store the original content for this panel
            const logContentId = `${panel}LogContent`;
            this.logLineCache.set(logContentId, {
                originalContent: content,
                lines: content.split('\n'),
                filename: filename,
                fileId: fileId // Backend fileId for remote files, null for local files
            });
            
            // Emit event for other modules
            CLogApp.utils.emit('logContentChanged', {
                panel: panel,
                content: content,
                filename: filename,
                fileId: fileId
            });
            
            console.log(`[UIManager] Log content set for ${panel} panel: ${filename} (${content.split('\n').length} lines)${fileId ? ` [fileId: ${fileId}]` : ''}`);
        } else {
            console.warn(`[UIManager] No CodeMirror editor found for panel: ${panel}`);
            
            // Fallback: try to initialize CodeMirror and then set content
            if (!this.codeMirrorInstances.has(panel)) {
                console.log(`[UIManager] Attempting to initialize CodeMirror for ${panel} panel...`);
                this.initializeCodeMirrorEditors();
                
                // Retry setting content after a short delay
                setTimeout(() => {
                    const retryEditor = this.codeMirrorInstances.get(panel);
                    if (retryEditor && window.CodeMirror6) {
                        console.log(`[UIManager] Retrying setLogContent for ${panel} panel...`);
                        window.CodeMirror6.updateEditorContent(retryEditor, content);
                        
                        // Store the content in cache
                        const logContentId = `${panel}LogContent`;
                        this.logLineCache.set(logContentId, {
                            originalContent: content,
                            lines: content.split('\n'),
                            filename: filename,
                            fileId: fileId
                        });
                        
                        console.log(`[UIManager] Log content set for ${panel} panel (retry): ${filename} (${content.split('\n').length} lines)${fileId ? ` [fileId: ${fileId}]` : ''}`);
                    } else {
                        // Final fallback: set in textarea directly
                        const textarea = document.getElementById(`${panel}LogContent`);
                        if (textarea) {
                            textarea.value = content;
                            console.log(`[UIManager] Set content in textarea for ${panel} panel as fallback`);
                        }
                    }
                }, 200);
            }
        }
    }

    /**
     * Setup click handling for log content - NOT NEEDED WITH CODEMIRROR
     * Click handling is now done in initializeCodeMirrorEditors
     */
    setupLogClickHandling(logContentId, isRightPanel) {
        // This method is no longer needed with CodeMirror
        // Click handling is set up in initializeCodeMirrorEditors
        console.log(`[UIManager] Click handling for ${logContentId} managed by CodeMirror`);
    }

    /**
     * Handle clicks on log content using line position calculation
     */
    handleLogContentClick(event, logContentId, isRightPanel) {
        const logContent = event.target;
        const cache = this.logLineCache.get(logContentId);
        
        if (!cache) {
            console.warn('[UIManager] No cache found for', logContentId);
            return;
        }

        // Calculate which line was clicked based on cursor position
        const clickedLine = this.getClickedLine(logContent, event, cache.lines);
        
        if (clickedLine !== null) {
            const panel = isRightPanel ? 'right' : 'left';
            const startEventKey = panel === 'right' ? 'rightStartEvent' : 'startEvent';
            const endEventKey = panel === 'right' ? 'rightEndEvent' : 'endEvent';
            
            // Check if clicking on already set events to clear them
            const isSetStartEvent = (clickedLine === CLogApp.state[startEventKey]);
            const isSetEndEvent = (clickedLine === CLogApp.state[endEventKey]);
            
            if (isSetStartEvent || isSetEndEvent) {
                // Clicking on a set start/end event clears it
                if (isSetStartEvent) {
                    CLogApp.state[startEventKey] = null;
                    const displayId = panel === 'right' ? 'startEventDisplayRight' : 'startEventDisplay';
                    this.updateEventDisplay(displayId, null);
                }
                if (isSetEndEvent) {
                    CLogApp.state[endEventKey] = null;
                    const displayId = panel === 'right' ? 'endEventDisplayRight' : 'endEventDisplay';
                    this.updateEventDisplay(displayId, null);
                }
                this.updateLogHighlighting(logContentId);
                return;
            }
            
            // Context-aware immediate highlighting based on sequence state
            if (CLogApp.state.selectedLogLine === clickedLine) {
                // Deselect current line
                CLogApp.state.selectedLogLine = null;
            } else {
                // Select new line with immediate context-aware highlighting
                CLogApp.state.selectedLogLine = clickedLine;
                
                // Determine what type of event this should be based on current state
                if (!CLogApp.state[startEventKey]) {
                    // No start event set - this should be the start event
                    CLogApp.state[startEventKey] = clickedLine;
                    const displayId = panel === 'right' ? 'startEventDisplayRight' : 'startEventDisplay';
                    this.updateEventDisplay(displayId, clickedLine);
                } else if (!CLogApp.state[endEventKey]) {
                    // Start event set but no end event - this should be the end event
                    CLogApp.state[endEventKey] = clickedLine;
                    const displayId = panel === 'right' ? 'endEventDisplayRight' : 'endEventDisplay';
                    this.updateEventDisplay(displayId, clickedLine);
                } else {
                    // Both events set - replace start event with new selection
                    CLogApp.state[startEventKey] = clickedLine;
                    CLogApp.state[endEventKey] = null;
                    const startDisplayId = panel === 'right' ? 'startEventDisplayRight' : 'startEventDisplay';
                    const endDisplayId = panel === 'right' ? 'endEventDisplayRight' : 'endEventDisplay';
                    this.updateEventDisplay(startDisplayId, clickedLine);
                    this.updateEventDisplay(endDisplayId, null);
                }
                
                // Emit event for other modules
                CLogApp.utils.emit('logLineSelected', {
                    line: clickedLine,
                    panel: panel
                });
            }
            
            this.updateLogHighlighting(logContentId);
        }
    }

    /**
     * Determine which line was clicked based on cursor position
     */
    getClickedLine(logContent, event, lines) {
        const rect = logContent.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(logContent);
        
        // Account for padding in coordinate calculation
        const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
        
        // Calculate relative position accounting for padding
        const relativeY = event.clientY - rect.top - paddingTop;
        
        // Use actual computed line height from the element
        // This works regardless of whether there are spans in the content
        const fontSize = parseFloat(computedStyle.fontSize) || 12;
        const lineHeightValue = computedStyle.lineHeight;
        let lineHeight;
        
        if (lineHeightValue === 'normal') {
            lineHeight = fontSize * 1.2;
        } else if (lineHeightValue.endsWith('px')) {
            lineHeight = parseFloat(lineHeightValue);
        } else {
            lineHeight = fontSize * parseFloat(lineHeightValue);
        }
        
        // Calculate which line was clicked based on vertical position
        const clickedLineIndex = Math.floor((relativeY + logContent.scrollTop) / lineHeight);
        
        console.log(`[UIManager] Click Y=${Math.round(relativeY)}, lineHeight=${lineHeight}, scrollTop=${logContent.scrollTop} -> line ${clickedLineIndex + 1}`);
        
        // Return the line content if within bounds
        if (clickedLineIndex >= 0 && clickedLineIndex < lines.length) {
            console.log(`[UIManager] Selected: ${lines[clickedLineIndex].substring(0, 50)}...`);
            return lines[clickedLineIndex];
        }
        
        console.log(`[UIManager] Click outside valid lines (index: ${clickedLineIndex}, total: ${lines.length})`);
        return null;
    }

    /**
     * Provide visual feedback for clicked line without changing structure
     */
    highlightClickedLine(logContent, event, clickedLine) {
        // Remove existing highlights
        this.clearLogLineHighlights(logContent);
        
        // Create temporary overlay for visual feedback
        const rect = logContent.getBoundingClientRect();
        const clickY = event.clientY - rect.top + logContent.scrollTop;
        
        // Estimate line height
        const style = window.getComputedStyle(logContent);
        const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.4;
        
        // Calculate which visual line was clicked
        const lineIndex = Math.floor(clickY / lineHeight);
        
        // Create highlight overlay
        const highlight = document.createElement('div');
        highlight.className = 'log-line-highlight';
        highlight.style.cssText = `
            position: absolute;
            left: 0;
            right: 0;
            height: ${lineHeight}px;
            top: ${lineIndex * lineHeight}px;
            background-color: rgba(74, 144, 226, 0.2);
            pointer-events: none;
            z-index: 10;
        `;
        
        // Position relative to log content
        logContent.style.position = 'relative';
        logContent.appendChild(highlight);
        
        // Remove highlight after a short time
        setTimeout(() => {
            if (highlight.parentNode) {
                highlight.parentNode.removeChild(highlight);
            }
        }, 500);
        
        console.log(`[UIManager] Highlighted line: ${clickedLine.substring(0, 50)}...`);
    }

    /**
     * Clear existing line highlights
     */
    clearLogLineHighlights(logContent) {
        const existingHighlights = logContent.querySelectorAll('.log-line-highlight');
        existingHighlights.forEach(highlight => highlight.remove());
    }

    /**
     * Handle log line click - UPDATED to work with preserved text
     */
    handleLogLineClick(line, isRightPanel, event) {
        const inSyncMode = isRightPanel ? 
            CLogApp.state.rightInSyncMode : CLogApp.state.leftInSyncMode;

        // Always update selected log line for sequence definition (left panel only)
        if (!isRightPanel) {
            CLogApp.state.selectedLogLine = line;
            this.updateLogLineSelection();
            
            // Emit event for sequence manager
            CLogApp.utils.emit('logLineSelected', {
                line: line,
                panel: 'left'
            });
        }

        // Handle sync mode
        if (inSyncMode) {
            this.setSyncPoint(line, isRightPanel);
        }
        
        console.log(`[UIManager] Line clicked: ${line.substring(0, 50)}...`);
    }

    /**
     * Set sync point for a panel - UPDATED
     */
    setSyncPoint(line, isRightPanel) {
        if (isRightPanel) {
            CLogApp.state.rightSyncPoint = line;
            CLogApp.state.rightInSyncMode = false;
            document.getElementById('rightSyncOverlay')?.classList.add('hidden');
            document.getElementById('rightSyncBtn')?.classList.remove('toggle-active');
        } else {
            CLogApp.state.leftSyncPoint = line;
            CLogApp.state.leftInSyncMode = false;
            document.getElementById('leftSyncOverlay')?.classList.add('hidden');
            document.getElementById('leftSyncBtn')?.classList.remove('toggle-active');
        }

        console.log(`[UIManager] Sync point set for ${isRightPanel ? 'right' : 'left'} panel: ${line.substring(0, 50)}...`);
    }

    /**
     * Update log line selection highlighting - UPDATED
     */
    updateLogLineSelection() {
        // Clear existing selection highlights from all panels
        document.querySelectorAll('.log-line-highlight.selection').forEach(el => el.remove());

        if (CLogApp.state.selectedLogLine) {
            // Find and highlight the selected line in the left panel
            const leftLogContent = document.getElementById('leftLogContent');
            if (leftLogContent) {
                this.highlightSelectedLine(leftLogContent, CLogApp.state.selectedLogLine);
            }
        }
    }

    /**
     * Highlight the selected line for sequence operations
     */
    highlightSelectedLine(logContent, targetLine) {
        const cache = this.logLineCache.get(logContent.id);
        if (!cache) return;

        const lineIndex = cache.lines.findIndex(line => line === targetLine);
        if (lineIndex === -1) return;

        // Create persistent highlight for selected line
        const style = window.getComputedStyle(logContent);
        const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.4;
        
        const highlight = document.createElement('div');
        highlight.className = 'log-line-highlight selection';
        highlight.style.cssText = `
            position: absolute;
            left: 0;
            right: 0;
            height: ${lineHeight}px;
            top: ${lineIndex * lineHeight}px;
            background-color: rgba(39, 174, 96, 0.3);
            border-left: 3px solid #27ae60;
            pointer-events: none;
            z-index: 5;
        `;
        
        logContent.style.position = 'relative';
        logContent.appendChild(highlight);
    }

    /**
     * Get original log content for a panel
     */
    getLogContent(panel) {
        const logContentId = `${panel}LogContent`;
        const cache = this.logLineCache.get(logContentId);
        return cache ? cache.originalContent : null;
    }

    /**
     * Get lines array for a panel
     */
    getLogLines(panel) {
        const logContentId = `${panel}LogContent`;
        const cache = this.logLineCache.get(logContentId);
        return cache ? cache.lines : [];
    }

    /**
     * Reset path label on error
     */
    resetPathLabel(isRightPanel) {
        const pathLabel = document.getElementById(
            isRightPanel ? 'rightPathLabel' : 'leftPathLabel'
        );
        if (pathLabel) {
            pathLabel.textContent = 'No file selected';
        }
    }

    /**
     * Refresh log content - UPDATED FOR CODEMIRROR
     */
    refreshLog(isRightPanel) {
        const panel = isRightPanel ? 'right' : 'left';
        console.log(`[UIManager] Refreshing log for ${panel} panel`);
        
        // Get the current content and re-apply it to refresh the display
        const logContentId = `${panel}LogContent`;
        const cache = this.logLineCache.get(logContentId);
        
        if (cache) {
            this.setLogContent(panel, cache.originalContent, cache.filename);
        }
        
        CLogApp.utils.emit('logRefreshRequested', { panel });
    }

    /**
     * Toggle follow mode
     */
    toggleFollow(isRightPanel) {
        const followBtn = document.getElementById(
            isRightPanel ? 'rightFollowBtn' : 'followLeftBtn'
        );
        
        if (followBtn) {
            followBtn.classList.toggle('toggle-active');
            const isActive = followBtn.classList.contains('toggle-active');
            
            console.log(`[UIManager] Follow mode ${isActive ? 'enabled' : 'disabled'} for ${isRightPanel ? 'right' : 'left'} panel`);
            
            CLogApp.utils.emit('followModeChanged', {
                panel: isRightPanel ? 'right' : 'left',
                enabled: isActive
            });
        }
    }

    /**
     * Toggle sync mode
     */
    toggleSyncMode(isRightPanel) {
        const syncBtn = document.getElementById(
            isRightPanel ? 'rightSyncBtn' : 'syncLeftBtn'
        );
        const syncOverlay = document.getElementById(
            isRightPanel ? 'rightSyncOverlay' : 'leftSyncOverlay'
        );

        if (isRightPanel) {
            CLogApp.state.rightInSyncMode = !CLogApp.state.rightInSyncMode;
            this.updateSyncMode(syncBtn, syncOverlay, CLogApp.state.rightInSyncMode);
        } else {
            CLogApp.state.leftInSyncMode = !CLogApp.state.leftInSyncMode;
            this.updateSyncMode(syncBtn, syncOverlay, CLogApp.state.leftInSyncMode);
        }

        console.log(`[UIManager] Sync mode ${CLogApp.state.leftInSyncMode || CLogApp.state.rightInSyncMode ? 'enabled' : 'disabled'}`);
    }

    /**
     * Update sync mode UI
     */
    updateSyncMode(syncBtn, syncOverlay, isActive) {
        if (syncBtn) {
            if (isActive) {
                syncBtn.classList.add('toggle-active');
            } else {
                syncBtn.classList.remove('toggle-active');
            }
        }

        if (syncOverlay) {
            if (isActive) {
                syncOverlay.classList.remove('hidden');
            } else {
                syncOverlay.classList.add('hidden');
            }
        }
    }

    /**
     * Toggle filters
     */
    toggleFilters(isRightPanel) {
        const filterCheckbox = document.getElementById(
            isRightPanel ? 'rightFilterCheckbox' : 'leftFilterCheckbox'
        );

        if (filterCheckbox) {
            filterCheckbox.classList.toggle('checked');
            const isEnabled = filterCheckbox.classList.contains('checked');
            
            console.log(`[UIManager] Filters ${isEnabled ? 'enabled' : 'disabled'} for ${isRightPanel ? 'right' : 'left'} panel`);
            
            CLogApp.utils.emit('filtersToggled', {
                panel: isRightPanel ? 'right' : 'left',
                enabled: isEnabled
            });
        }
    }

    /**
     * Add filter pill - UPDATED FOR COMPACT FILTERS
     */
    addFilterPill(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`[UIManager] Filter container not found: ${containerId}`);
            return;
        }

        // Check if container has dummy filter - don't interfere
        if (container.dataset.dummyFilter === 'true') {
            console.log(`[UIManager] Skipping addFilterPill for ${containerId} - dummy filter active`);
            return;
        }

        this.filterPillCounter++;
        const isRightPanel = containerId.includes('right');

        try {
            // Create compact filter pill
            const pill = new FilterPill(container, {
                initialText: `filter${this.filterPillCounter}`,
                isInclude: true,
                enabled: true,
                isTimeMode: false,
                onDelete: (pill) => {
                    console.log('[UIManager] Compact filter pill deleted:', pill.getState());
                    this.onFilterChanged(isRightPanel);
                },
                onChange: (state) => {
                    console.log('[UIManager] Compact filter pill changed:', state);
                    this.onFilterChanged(isRightPanel);
                }
            });
            
            this.onFilterChanged(isRightPanel);
            
            console.log(`[UIManager] Compact filter pill added to ${containerId}`);
            
        } catch (error) {
            console.error('[UIManager] Failed to create compact filter pill:', error);
        }
    }

    /**
     * Handle filter changes
     */
    onFilterChanged(isRightPanel) {
        const containerId = isRightPanel ? 'rightFiltersContainer' : 'leftFiltersContainer';
        const filters = CLogApp.modules.stateManager.getFiltersState(containerId);
        
        CLogApp.utils.emit('filtersChanged', {
            panel: isRightPanel ? 'right' : 'left',
            filters: filters
        });
    }

    /**
     * Show settings menu
     */
    showSettingsMenu(event) {
        // Close existing menu if open
        if (CLogApp.state.currentSettingsMenu) {
            CLogApp.state.currentSettingsMenu.remove();
            CLogApp.state.currentSettingsMenu = null;
            return;
        }

        const settingsMenu = document.createElement('div');
        settingsMenu.className = 'settings-menu';
        settingsMenu.innerHTML = `
            <div class="settings-item danger" onclick="CLogApp.modules.uiManager.clearState()">Clear State</div>
            <div class="settings-item" onclick="CLogApp.modules.uiManager.showLoadStateModal()">Load State</div>
            <div class="settings-item" onclick="CLogApp.modules.uiManager.exportStates()">Export States</div>
        `;

        // Position relative to the settings button
        const rect = event.target.getBoundingClientRect();
        settingsMenu.style.position = 'fixed';
        settingsMenu.style.top = (rect.bottom + 5) + 'px';
        settingsMenu.style.left = rect.left + 'px';

        document.body.appendChild(settingsMenu);
        CLogApp.state.currentSettingsMenu = settingsMenu;

        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', this.handleSettingsMenuClose.bind(this));
        }, 0);
    }

    /**
     * Handle settings menu close
     */
    handleSettingsMenuClose(event) {
        if (CLogApp.state.currentSettingsMenu && 
            !CLogApp.state.currentSettingsMenu.contains(event.target)) {
            CLogApp.state.currentSettingsMenu.remove();
            CLogApp.state.currentSettingsMenu = null;
            document.removeEventListener('click', this.handleSettingsMenuClose.bind(this));
        }
    }

    /**
     * Show settings modal
     */
    showSettings(event) {
        if (window.SettingsUI) {
            window.SettingsUI.show();
        } else {
            console.error('SettingsUI not available');
        }
    }

    /**
     * Open remote file browser for panel
     */
    openRemoteFileBrowser(panel) {
        const panelName = panel === true ? 'right' : (panel === false ? 'left' : panel);
        
        if (window.RemoteFileBrowser) {
            window.RemoteFileBrowser.show(panelName);
        } else {
            console.error('RemoteFileBrowser not available');
            // Fallback to alert for now
            alert('Remote file browser not available. Please check the server connection.');
        }
    }

    /**
     * Enter sequence build mode - starts with marking start events
     */
    enterSequenceBuildMode(panel) {
        // Clear any existing sequence events
        this.clearSequenceSelections(panel);
        
        // Enter marking start mode
        this.markingMode[panel] = 'marking-start';
        
        // Show sequence definition area
        const sequenceArea = document.getElementById(
            panel === 'right' ? 'sequenceDefinitionAreaRight' : 'sequenceDefinitionArea'
        );
        if (sequenceArea) {
            sequenceArea.classList.remove('hidden');
        }
        
        console.log(`[UIManager] Entered sequence build mode for ${panel} panel - now marking start events`);
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
        this.markingMode[panel] = 'marking-end';
        console.log(`[UIManager] Start event confirmed for ${panel} panel - now marking end events`);
    }

    /**
     * Set sequence end event - locks the sequence
     */
    setSequenceEndEvent(panel) {
        const endEventKey = panel === 'right' ? 'rightEndEvent' : 'endEvent';
        
        if (!CLogApp.state[endEventKey]) {
            alert('Click a line first to mark as end event.');
            return;
        }
        
        // Lock the sequence
        this.markingMode[panel] = 'locked';
        console.log(`[UIManager] End event confirmed for ${panel} panel - sequence locked`);
        
        // Enable the "Refine sequence definition" button
        const startSequenceBtn = document.getElementById(
            panel === 'right' ? 'startSequenceRightBtn' : 'startSequenceBtn'
        );
        if (startSequenceBtn) {
            startSequenceBtn.classList.remove('disabled');
        }
    }

    /**
     * Clear application state
     */
    async clearState() {
        if (CLogApp.state.currentSettingsMenu) {
            CLogApp.state.currentSettingsMenu.remove();
            CLogApp.state.currentSettingsMenu = null;
        }

        const confirm = window.confirm(
            'This will clear all current state including:\n\n' +
            '• Log files and content\n' +
            '• Filter configurations\n' +
            '• Sequence definitions\n' +
            '• Panel layout\n\n' +
            'Are you sure you want to continue?'
        );

        if (confirm) {
            // Clear cache
            this.logLineCache.clear();
            CLogApp.modules.stateManager.clearAllState();
            location.reload();
        }
    }

    /**
     * Show save state modal
     */
    showSaveStateModal() {
        const modal = this.createModal('Save State', `
            <input type="text" class="modal-input" id="stateName" 
                   placeholder="Enter state name..." 
                   value="State ${new Date().toLocaleString()}">
        `, [
            { text: 'Cancel', action: 'closeModal' },
            { text: 'Save', action: 'doSaveState', primary: true }
        ]);

        document.body.appendChild(modal);
        document.getElementById('stateName')?.focus();
    }

    /**
     * Show load state modal
     */
    showLoadStateModal() {
        if (CLogApp.state.currentSettingsMenu) {
            CLogApp.state.currentSettingsMenu.remove();
            CLogApp.state.currentSettingsMenu = null;
        }

        const savedStates = CLogApp.modules.stateManager.getSavedStates();
        const stateNames = Object.keys(savedStates);

        if (stateNames.length === 0) {
            this.showErrorMessage('No saved states found.');
            return;
        }

        const stateOptions = stateNames.map(name =>
            `<option value="${name}">${name} (${new Date(savedStates[name].timestamp).toLocaleString()})</option>`
        ).join('');

        const modal = this.createModal('Load State', `
            <select class="modal-input" id="stateSelect">
                <option value="">Select a state to load...</option>
                ${stateOptions}
            </select>
        `, [
            { text: 'Cancel', action: 'closeModal' },
            { text: 'Delete Selected', action: 'deleteState', danger: true },
            { text: 'Load', action: 'doLoadState', primary: true }
        ]);

        document.body.appendChild(modal);
    }

    /**
     * Export states
     */
    exportStates() {
        if (CLogApp.state.currentSettingsMenu) {
            CLogApp.state.currentSettingsMenu.remove();
            CLogApp.state.currentSettingsMenu = null;
        }

        try {
            const exportData = CLogApp.modules.stateManager.exportStates();
            const dataBlob = new Blob([exportData], { type: 'application/json' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `clog_states_${new Date().toISOString().split('T')[0]}.json`;
            link.click();

            this.showSuccessMessage('States exported successfully');

        } catch (error) {
            console.error('[UIManager] Export failed:', error);
            this.showErrorMessage('Failed to export states: ' + error.message);
        }
    }

    /**
     * Create modal dialog
     */
    createModal(title, content, buttons) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.onclick = (e) => {
            if (e.target === overlay) this.closeModal();
        };

        const modal = document.createElement('div');
        modal.className = 'modal';

        const buttonHtml = buttons.map(btn => {
            const classes = ['control-btn'];
            if (btn.primary) classes.push('toggle-active');
            if (btn.danger) classes.push('danger');
            return `<button class="${classes.join(' ')}" onclick="CLogApp.modules.uiManager.${btn.action}()">${btn.text}</button>`;
        }).join('');

        modal.innerHTML = `
            <div class="modal-title">${title}</div>
            <div class="modal-content">${content}</div>
            <div class="modal-buttons">${buttonHtml}</div>
        `;

        overlay.appendChild(modal);
        this.currentModal = overlay;
        return overlay;
    }

    /**
     * Close current modal
     */
    closeModal() {
        if (this.currentModal) {
            this.currentModal.remove();
            this.currentModal = null;
        }
    }

    /**
     * Save state action
     */
    async doSaveState() {
        const stateName = document.getElementById('stateName')?.value.trim();
        if (!stateName) {
            this.showErrorMessage('Please enter a state name.');
            return;
        }

        try {
            await CLogApp.modules.stateManager.saveNamedState(stateName);
            this.closeModal();
        } catch (error) {
            console.error('[UIManager] Save state failed:', error);
            this.showErrorMessage('Failed to save state: ' + error.message);
        }
    }

    /**
     * Load state action
     */
    async doLoadState() {
        const selectedState = document.getElementById('stateSelect')?.value;
        if (!selectedState) {
            this.showErrorMessage('Please select a state to load.');
            return;
        }

        try {
            await CLogApp.modules.stateManager.loadNamedState(selectedState);
            this.closeModal();
        } catch (error) {
            console.error('[UIManager] Load state failed:', error);
            this.showErrorMessage('Failed to load state: ' + error.message);
        }
    }

    /**
     * Delete state action
     */
    async deleteState() {
        const selectedState = document.getElementById('stateSelect')?.value;
        if (!selectedState) {
            this.showErrorMessage('Please select a state to delete.');
            return;
        }

        const confirm = window.confirm(`Are you sure you want to delete the state: ${selectedState}?`);
        if (!confirm) return;

        try {
            await CLogApp.modules.stateManager.deleteNamedState(selectedState);
            this.closeModal();
            this.showLoadStateModal(); // Reopen the load dialog
        } catch (error) {
            console.error('[UIManager] Delete state failed:', error);
            this.showErrorMessage('Failed to delete state: ' + error.message);
        }
    }

    /**
     * Show success message
     */
    showSuccessMessage(message) {
        console.log(`[UIManager] Success: ${message}`);
        // For now using alert, could be replaced with toast notifications
        if (CLogApp.config.debugMode) {
            alert(`✅ ${message}`);
        }
    }

    /**
     * Update log highlighting for selection and sequence events - UPDATED FOR CODEMIRROR
     */
    updateLogHighlighting(logContentId) {
        const panel = logContentId.includes('right') ? 'right' : 'left';
        const editor = this.codeMirrorInstances.get(panel);
        
        if (!editor) return;

        const cache = this.logLineCache.get(logContentId);
        if (!cache) return;

        // Prepare highlights for CodeMirror 6
        const lines = cache.lines;
        const highlights = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let className = '';
            
            // Check for different types of highlighting
            if (line === CLogApp.state.selectedLogLine) {
                className = 'log-line-selected';
            } else if (line === CLogApp.state.startEvent || line === CLogApp.state.rightStartEvent) {
                className = 'log-line-start-event';
            } else if (line === CLogApp.state.endEvent || line === CLogApp.state.rightEndEvent) {
                className = 'log-line-end-event';
            }
            
            if (className) {
                highlights.push({ lineNumber: i, className });
            }
        }
        
        // Apply highlights using CodeMirror 6 or fall back to CodeMirror 5
        if (window.CodeMirror6) {
            window.CodeMirror6.applyLineHighlights(editor, highlights);
        } else {
            // CodeMirror 5 fallback
            editor.getAllMarks().forEach(mark => mark.clear());
            highlights.forEach(({ lineNumber, className }) => {
                const line = lines[lineNumber];
                if (line) {
                    editor.markText(
                        { line: lineNumber, ch: 0 },
                        { line: lineNumber, ch: line.length },
                        { className: className }
                    );
                }
            });
        }
    }

    /**
     * Make log lines clickable (for backwards compatibility)
     */
    makeLogLinesClickable(elementId, enableSequenceMode = false) {
        console.log(`[UIManager] makeLogLinesClickable called for ${elementId}, sequence mode: ${enableSequenceMode}`);
        // This is handled by CodeMirror editors now, so this is just a stub for compatibility
        // The click handling is done in the CodeMirror initialization
    }

    /**
     * Escape HTML characters
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Update highlighting when sequence events change
     */
    updateSequenceEventHighlighting() {
        // Update both panels
        this.updateLogHighlighting('leftLogContent');
        this.updateLogHighlighting('rightLogContent');
    }

    /**
     * Update event display area
     */
    updateEventDisplay(displayId, event) {
        const display = document.getElementById(displayId);
        if (!display) return;

        if (event) {
            // Show the event text
            const eventText = event.length > 80 ? event.substring(0, 80) + '...' : event;
            display.innerHTML = `<span class="sequence-event-text">${this.escapeHtml(eventText)}</span>`;
        } else {
            // Show placeholder
            const placeholder = displayId.includes('start') ? 'No start event selected' : 'No end event selected';
            display.innerHTML = `<span class="sequence-placeholder">${placeholder}</span>`;
        }
    }

    /**
     * Show error message
     */
    showErrorMessage(message) {
        console.error(`[UIManager] Error: ${message}`);
        alert(`❌ ${message}`);
    }

    /**
     * Build sequences (delegate to sequences handler)
     */
    buildSequences(panel = 'left') {
        return this.sequences.buildSequences(panel);
    }

    /**
     * Use sequences (delegate to sequences handler)
     */
    useSequences(panel = 'left') {
        return this.sequences.useSequences(panel);
    }

    /**
     * Clear all sequence selections for a panel
     */
    clearSequenceSelections(panel = 'left') {
        if (panel === 'right') {
            // Clear right panel selections
            CLogApp.state.rightStartEvent = null;
            CLogApp.state.rightEndEvent = null;
            this.updateEventDisplay('startEventDisplayRight', null);
            this.updateEventDisplay('endEventDisplayRight', null);
        } else {
            // Clear left panel selections
            CLogApp.state.startEvent = null;
            CLogApp.state.endEvent = null;
            this.updateEventDisplay('startEventDisplay', null);
            this.updateEventDisplay('endEventDisplay', null);
        }
        
        // Reset to marking start mode (stay in build mode)
        this.markingMode[panel] = 'marking-start';
        
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
}

// Export for use in other modules
window.UIManager = UIManager;