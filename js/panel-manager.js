/**
 * PanelManager - Panel Layout and Operations (UPDATED)
 * Handles side-by-side mode, panel resizing, and panel coordination
 * 
 * FIXES:
 * - Preserves line breaks in copy operations
 * - Works with new text-based log content approach
 * - Uses UIManager's content access methods
 */

class PanelManager {
    constructor() {
        this.isResizing = false;
        this.startX = 0;
        this.startLeftWidth = 0;
        this.startRightWidth = 0;
        this.minPanelWidth = 300;
        this.rightPanelEventsSetup = false;
        this.documentListenersAdded = false;
        
        console.log('[PanelManager] Initialized');
    }

    /**
     * Toggle side-by-side panel mode
     */
    toggleSideBySide() {
        const rightPanel = document.getElementById('rightPanel');
        const resizer = document.getElementById('panelResizer');
        const sideBySideBtn = document.getElementById('sideBySideBtn');
        
        // Check computed styles, not just inline styles
        const rightPanelComputedStyle = rightPanel ? window.getComputedStyle(rightPanel).display : 'none';
        const rightPanelActuallyVisible = rightPanelComputedStyle !== 'none';
        
        console.log(`[PanelManager] Toggle called. App state: ${CLogApp.state.rightPanelVisible}`);
        console.log(`[PanelManager] Right panel inline style: ${rightPanel?.style.display || 'not set'}`);
        console.log(`[PanelManager] Right panel computed style: ${rightPanelComputedStyle}`);
        console.log(`[PanelManager] Right panel actually visible: ${rightPanelActuallyVisible}`);
        
        // Use current visibility to determine what to do
        const shouldHide = rightPanelActuallyVisible;
        
        if (!shouldHide) {
            // Show right panel and resizer
            if (rightPanel) rightPanel.style.display = 'flex';
            if (resizer) resizer.style.display = 'block';
            
            sideBySideBtn?.classList.add('toggle-active');
            CLogApp.state.rightPanelVisible = true;
            
            // Setup resizer functionality if not already done
            this.setupResizer(resizer);
            
            // Setup right panel event listeners if not already done
            if (!this.rightPanelEventsSetup) {
                this.setupRightPanelEvents();
                this.rightPanelEventsSetup = true;
            }
            
            // Initialize right panel filter pills system
            if (typeof window.initializeRightPanelFilterPills === 'function') {
                window.initializeRightPanelFilterPills();
            }
            
            console.log('[PanelManager] Right panel shown');
        } else {
            // Hide right panel and resizer
            if (rightPanel) rightPanel.style.display = 'none';
            if (resizer) resizer.style.display = 'none';
            
            sideBySideBtn?.classList.remove('toggle-active');
            CLogApp.state.rightPanelVisible = false;
            
            // Reset left panel flex
            const leftPanel = document.getElementById('leftPanel');
            if (leftPanel) {
                leftPanel.style.flex = '';
                leftPanel.style.width = '';
            }
            
            console.log('[PanelManager] Right panel hidden');
        }
        
        // Always sync the state with the final DOM state
        CLogApp.state.rightPanelVisible = rightPanel && rightPanel.style.display !== 'none';
        
        // Emit event for other modules
        CLogApp.utils.emit('panelStateChanged', {
            rightPanelVisible: CLogApp.state.rightPanelVisible
        });
    }

    // REMOVED: Dynamic panel creation methods - using static HTML structure now
    // The right panel and resizer are pre-defined in the HTML and shown/hidden via CSS

    /**
     * Setup event listeners for right panel
     */
    setupRightPanelEvents() {
        // File operations
        this.bindRightPanelEvent('selectLogRightBtn', 'click', () => {
            CLogApp.modules.uiManager.openRemoteFileBrowser('right');
        });
        
        this.bindRightPanelEvent('copyFromLeftBtn', 'click', () => {
            this.copyFromLeft();
        });
        
        // Control buttons
        this.bindRightPanelEvent('refreshRightBtn', 'click', () => {
            CLogApp.modules.uiManager.refreshLog(true);
        });
        
        this.bindRightPanelEvent('followRightBtn', 'click', () => {
            CLogApp.modules.uiManager.toggleFollow(true);
        });
        
        this.bindRightPanelEvent('syncRightBtn', 'click', () => {
            CLogApp.modules.uiManager.sequences.toggleSyncMode(true);
        });
        
        // Sequence buttons
        this.bindRightPanelEvent('buildSequencesRightBtn', 'click', () => {
            CLogApp.modules.uiManager.enterSequenceBuildMode('right');
        });
        
        this.bindRightPanelEvent('loadSequencesRightBtn', 'click', () => {
            CLogApp.modules.uiManager.loadSequenceDefinition('right');
        });
        
        this.bindRightPanelEvent('useSequencesRightBtn', 'click', () => {
            CLogApp.modules.uiManager.useSequences('right');
        });
        
        this.bindRightPanelEvent('startSequenceRightBtn', 'click', () => {
            CLogApp.modules.sequenceManager.startSequenceDefinition('right');
        });
        
        this.bindRightPanelEvent('setStartEventRightBtn', 'click', () => {
            CLogApp.modules.uiManager.setSequenceStartEvent('right');
        });
        
        this.bindRightPanelEvent('setEndEventRightBtn', 'click', () => {
            CLogApp.modules.uiManager.setSequenceEndEvent('right');
        });
        
        this.bindRightPanelEvent('clearSequenceRightBtn', 'click', () => {
            CLogApp.modules.uiManager.clearSequenceSelections('right');
        });
    }

    /**
     * Utility to bind right panel events
     */
    bindRightPanelEvent(elementId, eventType, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(eventType, handler);
        } else {
            console.warn(`[PanelManager] Right panel element not found: ${elementId}`);
        }
    }

    // REMOVED: removeRightPanel method - panels are hidden via CSS display: none

    /**
     * Setup panel resizer functionality
     */
    setupResizer(resizer) {
        if (!resizer || resizer.dataset.setupComplete) return;
        
        resizer.addEventListener('mousedown', (e) => this.handleResizeStart(e));
        
        // Only add document listeners once
        if (!this.documentListenersAdded) {
            document.addEventListener('mousemove', (e) => this.handleResizeMove(e));
            document.addEventListener('mouseup', () => this.handleResizeEnd());
            this.documentListenersAdded = true;
        }
        
        resizer.dataset.setupComplete = 'true';
    }

    /**
     * Handle resize start
     */
    handleResizeStart(event) {
        this.isResizing = true;
        this.startX = event.clientX;
        
        const leftPanel = document.getElementById('leftPanel');
        const rightPanel = document.getElementById('rightPanel');
        
        if (leftPanel && rightPanel) {
            this.startLeftWidth = leftPanel.offsetWidth;
            this.startRightWidth = rightPanel.offsetWidth;
        }
        
        const resizer = document.getElementById('panelResizer');
        resizer?.classList.add('dragging');
        
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        
        event.preventDefault();
        console.log('[PanelManager] Resize started');
    }

    /**
     * Handle resize move
     */
    handleResizeMove(event) {
        if (!this.isResizing) return;
        
        const diff = event.clientX - this.startX;
        const leftPanel = document.getElementById('leftPanel');
        const rightPanel = document.getElementById('rightPanel');
        
        if (!leftPanel || !rightPanel) return;
        
        const newLeftWidth = this.startLeftWidth + diff;
        const newRightWidth = this.startRightWidth - diff;
        
        // Enforce minimum widths
        if (newLeftWidth >= this.minPanelWidth && newRightWidth >= this.minPanelWidth) {
            leftPanel.style.flex = 'none';
            leftPanel.style.width = newLeftWidth + 'px';
            rightPanel.style.flex = 'none';
            rightPanel.style.width = newRightWidth + 'px';
        }
    }

    /**
     * Handle resize end
     */
    handleResizeEnd() {
        if (!this.isResizing) return;
        
        this.isResizing = false;
        
        const resizer = document.getElementById('panelResizer');
        resizer?.classList.remove('dragging');
        
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        console.log('[PanelManager] Resize ended');
        
        // Force CodeMirror refresh after resize
        setTimeout(() => {
            const leftEditor = CLogApp.modules.uiManager.codeMirrorInstances.get('left');
            const rightEditor = CLogApp.modules.uiManager.codeMirrorInstances.get('right');
            
            if (leftEditor && window.CodeMirror6) {
                window.CodeMirror6.refreshEditor(leftEditor);
            }
            
            if (rightEditor && window.CodeMirror6) {
                window.CodeMirror6.refreshEditor(rightEditor);
            }
        }, 50);
        
        // Emit event for state saving
        CLogApp.utils.emit('panelResized', {
            leftWidth: document.getElementById('leftPanel')?.offsetWidth,
            rightWidth: document.getElementById('rightPanel')?.offsetWidth
        });
    }

    /**
     * Copy content from left panel to right panel - UPDATED
     */
    copyFromLeft() {
        // Check if right panel has content and confirm overwrite
        const rightPath = document.getElementById('rightPathLabel')?.textContent;
        const rightContent = CLogApp.modules.uiManager.getLogContent('right');
        
        if (rightPath !== 'No file selected' || 
            (rightContent && rightContent.trim() !== 'Welcome to CLog - Select a log file to begin')) {
            
            const confirm = window.confirm(
                'Right panel already has content loaded.\n\n' +
                `Current file: ${rightPath}\n\n` +
                'This will overwrite all content and filters in the right panel.\n\n' +
                'Do you want to continue?'
            );
            
            if (!confirm) return;
        }
        
        try {
            this.copyPathLabel();
            this.copyLogContent();
            this.copyFilterState();
            this.copyFilters();
            this.copySyncPoint();
            this.copySequenceState();
            
            console.log('[PanelManager] Left panel copied to right panel');
            
            CLogApp.utils.emit('panelContentCopied', {
                from: 'left',
                to: 'right'
            });
            
        } catch (error) {
            console.error('[PanelManager] Failed to copy from left panel:', error);
            CLogApp.utils.emit('error', {
                message: 'Failed to copy content from left panel',
                error: error
            });
        }
    }

    /**
     * Copy path label
     */
    copyPathLabel() {
        const leftPath = document.getElementById('leftPathLabel')?.textContent;
        const rightPathLabel = document.getElementById('rightPathLabel');
        
        if (leftPath && rightPathLabel) {
            rightPathLabel.textContent = leftPath;
        }
    }

    /**
     * Copy log content while preserving line breaks - UPDATED
     */
    copyLogContent() {
        // Get the original content from the left panel using UIManager
        const leftContent = CLogApp.modules.uiManager.getLogContent('left');
        const leftCache = CLogApp.modules.uiManager.logLineCache.get('leftLogContent');
        
        if (leftContent && leftCache) {
            // Set the content in the right panel using UIManager's method
            CLogApp.modules.uiManager.setLogContent('right', leftContent, leftCache.filename);
            
            console.log('[PanelManager] Log content copied with line breaks preserved');
            console.log(`[PanelManager] Content length: ${leftContent.length}, Lines: ${leftContent.split('\n').length}`);
        } else {
            console.warn('[PanelManager] No content found in left panel to copy');
        }
    }

    /**
     * Copy filter state
     */
    copyFilterState() {
        const leftFilterCheckbox = document.getElementById('leftFilterCheckbox');
        const rightFilterCheckbox = document.getElementById('rightFilterCheckbox');
        
        if (leftFilterCheckbox && rightFilterCheckbox) {
            rightFilterCheckbox.className = leftFilterCheckbox.className;
        }
    }

    /**
     * Copy filters
     */
    copyFilters() {
        const leftFilters = document.getElementById('leftFiltersContainer');
        const rightFilters = document.getElementById('rightFiltersContainer');
        
        if (!leftFilters || !rightFilters) return;
        
        // Clear existing filters in right panel
        rightFilters.innerHTML = '';
        
        // Get left panel filter states
        const leftFilterStates = CLogApp.modules.stateManager.getFiltersState('leftFiltersContainer');
        
        // Recreate filters in right panel
        leftFilterStates.forEach(filterState => {
            try {
                const pill = new FilterPill(rightFilters, {
                    initialText: filterState.text,
                    isInclude: filterState.isInclude,
                    enabled: filterState.enabled,
                    isTimeMode: filterState.isTimeMode,
                    fullTimeStr: filterState.fullTimeStr,
                    onDelete: (pill) => {
                        console.log('[PanelManager] Right panel filter deleted:', pill.getState());
                        CLogApp.modules.uiManager.onFilterChanged(true);
                    },
                    onChange: (state) => {
                        console.log('[PanelManager] Right panel filter changed:', state);
                        CLogApp.modules.uiManager.onFilterChanged(true);
                    }
                });
            } catch (error) {
                console.warn('[PanelManager] Failed to copy filter:', error);
            }
        });
    }

    /**
     * Copy sync point
     */
    copySyncPoint() {
        if (CLogApp.state.leftSyncPoint) {
            CLogApp.state.rightSyncPoint = CLogApp.state.leftSyncPoint;
            
            const rightSyncBtn = document.getElementById('syncRightBtn');
            if (rightSyncBtn) {
                rightSyncBtn.classList.add('toggle-active');
            }
        }
    }

    /**
     * Copy sequence state from left to right panel
     */
    copySequenceState() {
        // Copy sequence events
        CLogApp.state.rightStartEvent = CLogApp.state.startEvent;
        CLogApp.state.rightEndEvent = CLogApp.state.endEvent;

        // Copy marking mode if UIManager is available
        if (CLogApp.modules.uiManager && CLogApp.modules.uiManager.markingMode) {
            CLogApp.modules.uiManager.markingMode.right = CLogApp.modules.uiManager.markingMode.left;
        }

        // Update right panel event displays
        if (CLogApp.modules.uiManager) {
            CLogApp.modules.uiManager.updateEventDisplay('startEventDisplayRight', CLogApp.state.rightStartEvent);
            CLogApp.modules.uiManager.updateEventDisplay('endEventDisplayRight', CLogApp.state.rightEndEvent);
            
            // Update right panel highlighting
            CLogApp.modules.uiManager.updateLogHighlighting('rightLogContent');
        }

        // Update sequence definition area visibility
        const sequenceArea = document.getElementById('sequenceDefinitionAreaRight');
        if (sequenceArea) {
            if (CLogApp.state.rightStartEvent || CLogApp.state.rightEndEvent) {
                sequenceArea.classList.remove('hidden');
            } else {
                sequenceArea.classList.add('hidden');
            }
        }

        // Update "Refine sequence definition" button state
        const startSequenceBtn = document.getElementById('startSequenceRightBtn');
        if (startSequenceBtn) {
            if (CLogApp.state.rightStartEvent && CLogApp.state.rightEndEvent) {
                startSequenceBtn.classList.remove('disabled');
            } else {
                startSequenceBtn.classList.add('disabled');
            }
        }

        console.log('[PanelManager] Sequence state copied to right panel');
    }

    /**
     * Synchronize panels to a specific sync point - UPDATED
     */
    synchronizePanels() {
        if (!CLogApp.state.leftSyncPoint || !CLogApp.state.rightSyncPoint) {
            console.warn('[PanelManager] Cannot synchronize - sync points not set');
            return;
        }
        
        // Find the sync lines in both panels using the new text-based approach
        const leftResult = this.findSyncLineInText('left', CLogApp.state.leftSyncPoint);
        const rightResult = this.findSyncLineInText('right', CLogApp.state.rightSyncPoint);
        
        if (leftResult.found && rightResult.found) {
            // Scroll both panels to align the sync points
            this.scrollToLine('leftLogContent', leftResult.lineIndex);
            this.scrollToLine('rightLogContent', rightResult.lineIndex);
            
            console.log('[PanelManager] Panels synchronized');
            
            CLogApp.utils.emit('panelsSynchronized', {
                leftSyncPoint: CLogApp.state.leftSyncPoint,
                rightSyncPoint: CLogApp.state.rightSyncPoint
            });
        } else {
            console.warn('[PanelManager] Sync points not found in panel content');
        }
    }

    /**
     * Find sync line in text-based content - NEW
     */
    findSyncLineInText(panel, syncPoint) {
        const lines = CLogApp.modules.uiManager.getLogLines(panel);
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i] === syncPoint) {
                return { found: true, lineIndex: i, line: lines[i] };
            }
        }
        
        return { found: false, lineIndex: -1, line: null };
    }

    /**
     * Scroll to a specific line index in CodeMirror editor - UPDATED FOR CODEMIRROR
     */
    scrollToLine(logContentId, lineIndex) {
        const panel = logContentId.includes('right') ? 'right' : 'left';
        const editor = CLogApp.modules.uiManager.codeMirrorInstances.get(panel);
        
        if (editor) {
            // Use CodeMirror's scrollIntoView method to center the line
            editor.scrollIntoView({ line: lineIndex, ch: 0 }, editor.getScrollInfo().clientHeight / 2);
            console.log(`[PanelManager] Scrolled ${panel} panel to line ${lineIndex}`);
        } else {
            console.warn(`[PanelManager] No CodeMirror editor found for panel: ${panel}`);
        }
    }

    /**
     * Find sync line element in a log content area - LEGACY (kept for compatibility)
     */
    findSyncLine(logContentId, syncPoint) {
        const logContent = document.getElementById(logContentId);
        if (!logContent) return { lineElement: null, index: -1 };
        
        const lines = logContent.querySelectorAll('.log-line');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].textContent === syncPoint) {
                return { lineElement: lines[i], index: i };
            }
        }
        
        return { lineElement: null, index: -1 };
    }

    /**
     * Scroll to a specific element - LEGACY (kept for compatibility)
     */
    scrollToElement(logContentId, element) {
        const logContent = document.getElementById(logContentId);
        if (!logContent || !element) return;
        
        const containerRect = logContent.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        const scrollTop = logContent.scrollTop + elementRect.top - containerRect.top - 
                         (containerRect.height / 2) + (elementRect.height / 2);
        
        logContent.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
        });
    }

    /**
     * Get current panel layout state
     */
    getPanelLayoutState() {
        const leftPanel = document.getElementById('leftPanel');
        const rightPanel = document.getElementById('rightPanel');
        
        return {
            rightPanelVisible: CLogApp.state.rightPanelVisible,
            leftWidth: leftPanel?.offsetWidth || null,
            rightWidth: rightPanel?.offsetWidth || null,
            isResizing: this.isResizing
        };
    }

    /**
     * Restore panel layout state
     */
    restorePanelLayoutState(layoutState) {
        if (!layoutState) return;
        
        // Restore right panel visibility
        if (layoutState.rightPanelVisible && !CLogApp.state.rightPanelVisible) {
            this.toggleSideBySide();
        } else if (!layoutState.rightPanelVisible && CLogApp.state.rightPanelVisible) {
            this.toggleSideBySide();
        }
        
        // Restore panel widths if right panel is visible
        if (layoutState.rightPanelVisible && layoutState.leftWidth && layoutState.rightWidth) {
            setTimeout(() => {
                const leftPanel = document.getElementById('leftPanel');
                const rightPanel = document.getElementById('rightPanel');
                
                if (leftPanel && rightPanel) {
                    leftPanel.style.flex = 'none';
                    leftPanel.style.width = layoutState.leftWidth + 'px';
                    rightPanel.style.flex = 'none';
                    rightPanel.style.width = layoutState.rightWidth + 'px';
                }
            }, 100); // Small delay to ensure panels are created
        }
        
        console.log('[PanelManager] Panel layout state restored');
    }

    /**
     * Get panel content summary for debugging
     */
    getContentSummary(panel) {
        const content = CLogApp.modules.uiManager.getLogContent(panel);
        const lines = CLogApp.modules.uiManager.getLogLines(panel);
        
        return {
            panel: panel,
            hasContent: !!content,
            contentLength: content ? content.length : 0,
            lineCount: lines ? lines.length : 0,
            firstLine: lines && lines.length > 0 ? lines[0].substring(0, 50) + '...' : 'None',
            lastLine: lines && lines.length > 0 ? lines[lines.length - 1].substring(0, 50) + '...' : 'None'
        };
    }

    /**
     * Debug panel states
     */
    debugPanelStates() {
        console.group('[PanelManager] Debug Panel States');
        console.log('Left Panel:', this.getContentSummary('left'));
        if (CLogApp.state.rightPanelVisible) {
            console.log('Right Panel:', this.getContentSummary('right'));
        } else {
            console.log('Right Panel: Not visible');
        }
        console.log('Layout State:', this.getPanelLayoutState());
        console.groupEnd();
    }
}

// Export for use in other modules
window.PanelManager = PanelManager;