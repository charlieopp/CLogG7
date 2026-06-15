/**
 * UIManager CodeMirror - CodeMirror editor management
 * Handles CodeMirror 6 initialization and editor operations
 */

class UIManagerCodeMirror {
    constructor(uiManager) {
        this.uiManager = uiManager;
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
        if (this.uiManager.codeMirrorInstances.has('left') || this.uiManager.codeMirrorInstances.has('right')) {
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
            this.uiManager.codeMirrorInstances.set('left', leftEditor);
            
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
            this.uiManager.codeMirrorInstances.set('right', rightEditor);
            
            console.log('[UIManager] Right CodeMirror 6 editor initialized');
        }
    }

    /**
     * Handle clicks on CodeMirror editors
     */
    handleCodeMirrorClick(editor, event, panel, lineContent, lineNumber) {
        if (lineContent !== undefined) {
            this.uiManager.sequenceMarking.handleSequenceMarking(lineContent, panel, lineNumber);
        }
    }

    /**
     * Set log content for a panel
     */
    setLogContent(panel, content, filename, fileId = null) {
        const editor = this.uiManager.codeMirrorInstances.get(panel);
        
        if (editor) {
            // Set content in CodeMirror 6 editor
            window.CodeMirror6.updateEditorContent(editor, content);
            
            // Store the original content for this panel
            const logContentId = `${panel}LogContent`;
            this.uiManager.logLineCache.set(logContentId, {
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
            if (!this.uiManager.codeMirrorInstances.has(panel)) {
                console.log(`[UIManager] Attempting to initialize CodeMirror for ${panel} panel...`);
                this.initializeCodeMirrorEditors();
                
                // Retry setting content after a short delay
                setTimeout(() => {
                    const retryEditor = this.uiManager.codeMirrorInstances.get(panel);
                    if (retryEditor && window.CodeMirror6) {
                        console.log(`[UIManager] Retrying setLogContent for ${panel} panel...`);
                        window.CodeMirror6.updateEditorContent(retryEditor, content);
                        
                        // Store the content in cache
                        const logContentId = `${panel}LogContent`;
                        this.uiManager.logLineCache.set(logContentId, {
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
     * Offset the gutter line numbers so they reflect each line's position
     * in the full file (e.g. when only lines 1500-1510 are loaded, the
     * gutter should read 1500-1510, not 1-11).
     */
    setLineNumberOffset(panel, offset) {
        const editor = this.uiManager.codeMirrorInstances.get(panel);
        if (editor && window.CodeMirror6 && window.CodeMirror6.setLineNumberOffset) {
            window.CodeMirror6.setLineNumberOffset(editor, offset);
        }
    }

    /**
     * Get log content for a panel
     */
    getLogContent(panel) {
        const cache = this.uiManager.logLineCache.get(`${panel}LogContent`);
        return cache ? cache.originalContent : null;
    }

    /**
     * Get log lines for a panel
     */
    getLogLines(panel) {
        const cache = this.uiManager.logLineCache.get(`${panel}LogContent`);
        return cache ? cache.lines : [];
    }

    /**
     * Reset path label on error
     */
    resetPathLabel(panel) {
        const pathLabel = document.getElementById(`${panel}PathLabel`);
        if (pathLabel) {
            pathLabel.textContent = 'No file selected';
        }
    }

    /**
     * Update log highlighting
     */
    updateLogHighlighting(logContentId) {
        const panel = logContentId.includes('right') ? 'right' : 'left';
        const editor = this.uiManager.codeMirrorInstances.get(panel);
        
        if (!editor) return;

        const cache = this.uiManager.logLineCache.get(logContentId);
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
        
        // Apply highlights using CodeMirror 6
        window.CodeMirror6.applyLineHighlights(editor, highlights);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManagerCodeMirror;
} else if (typeof window !== 'undefined') {
    window.UIManagerCodeMirror = UIManagerCodeMirror;
}