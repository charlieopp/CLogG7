/**
 * FilterInteraction - Handles general user interaction events
 * Manages mouse/keyboard events, insertion cursors, and operator placement
 */
class FilterInteraction {
    constructor(filterState, filterElements, instanceId = 'default') {
        this.filterState = filterState;
        this.filterElements = filterElements;
        this.instanceId = instanceId;
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // No global event listeners needed for general interactions
    }

    setupContainerEvents(container) {
        if (!container) return;
        
        // Single click handler that handles everything
        container.addEventListener('click', (e) => {
            console.log('🔍 Container click - target:', e.target.className);
            
            // Check ALL elements in the event path for disabled filter terms
            const path = e.composedPath();
            const disabledElement = path.find(el => 
                el.classList && el.classList.contains('filter-terms-disabled')
            );
            
            console.log('🔍 Found disabled element in path:', disabledElement?.className);
            
            if (disabledElement) {
                console.log('🔄 Re-enabling filter terms via click on:', disabledElement.className);
                console.log('🔍 handleFilterTermsReEnable exists?', typeof this.handleFilterTermsReEnable);
                e.stopPropagation();
                e.preventDefault();
                
                if (this.handleFilterTermsReEnable) {
                    this.handleFilterTermsReEnable(disabledElement);
                } else {
                    console.error('❌ handleFilterTermsReEnable method not found!');
                }
                return;
            }
            
            console.log('🔍 No disabled element found, continuing to normal container logic');
            // Continue with normal container click logic
            this.handleContainerClick(e);
        });
        
        container.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    }

    // Handle container click for operator placement
    handleContainerClick(e) {
        // Don't trigger if clicking on a filter pill, operator, or their children
        if (e.target.closest('.filter-pill, .operator, .placeholder-text')) {
            return;
        }
        
        // Deselect any selected operators in this instance
        const instanceContainer = this.getContainer();
        if (instanceContainer) {
            instanceContainer.querySelectorAll('.operator.selected').forEach(op => {
                op.classList.remove('selected');
            });
        }
        
        const container = e.currentTarget;
        const rect = container.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        
        // Find insertion point
        const elements = [...container.children].filter(el => 
            !el.classList.contains('placeholder-text') && 
            (el.classList.contains('filter-pill') || el.classList.contains('operator'))
        );
        
        let targetElement = null;
        let insertAtEnd = false;
        
        if (elements.length === 0) {
            insertAtEnd = true;
        } else {
            // Find closest element and determine position
            let closestElement = null;
            let closestDistance = Infinity;
            
            for (let element of elements) {
                const elemRect = element.getBoundingClientRect();
                const elemX = elemRect.left - rect.left;
                const elemRight = elemRect.right - rect.left;
                
                let distance = Math.min(Math.abs(clickX - elemX), Math.abs(clickX - elemRight));
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestElement = element;
                }
            }
            
            // Determine if we should insert at end or before an element
            if (closestElement) {
                const elemRect = closestElement.getBoundingClientRect();
                const elemRight = elemRect.right - rect.left;
                const closestIndex = elements.indexOf(closestElement);
                
                if (clickX > elemRight && closestIndex === elements.length - 1) {
                    insertAtEnd = true;
                } else {
                    targetElement = clickX < (elemRect.left - rect.left + elemRect.width / 2) ? 
                        closestElement : 
                        (closestIndex < elements.length - 1 ? elements[closestIndex + 1] : null);
                    if (!targetElement) insertAtEnd = true;
                }
            } else {
                insertAtEnd = true;
            }
        }
        
        // Show operator input
        if (window.OperatorPopup && window.OperatorPopup.showOperatorInputAtClick) {
            window.OperatorPopup.showOperatorInputAtClick(
                e.clientX, e.clientY, targetElement, true, false, insertAtEnd, e, this.instanceId
            );
        }
    }

    // Handle mouse move for insertion cursor
    handleMouseMove(e) {
        const container = e.currentTarget;
        
        // Don't show cursor if hovering over actual elements
        if (e.target.closest('.filter-pill, .operator')) {
            this.hideInsertionCursor();
            container.style.cursor = 'pointer';
            return;
        }
        
        const insertionPoint = this.findInsertionPoint(e);
        
        if (insertionPoint.isInsertionZone) {
            this.showInsertionCursor(insertionPoint.x, insertionPoint.y);
            container.style.cursor = 'text';
        } else {
            this.hideInsertionCursor();
            container.style.cursor = 'pointer';
        }
    }

    findInsertionPoint(e) {
        const container = e.currentTarget;
        const rect = container.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        
        const elements = [...container.children].filter(el => 
            !el.classList.contains('placeholder-text') && 
            (el.classList.contains('filter-pill') || el.classList.contains('operator'))
        );
        
        const INSERTION_ZONE_WIDTH = 40; // 20px wide insertion zones
        
        // Find closest gap between elements
        for (let i = 0; i <= elements.length; i++) {
            let gapCenter;
            
            if (i === 0) {
                // Before first element
                gapCenter = elements[0] ? 
                    elements[0].getBoundingClientRect().left - rect.left - 20 : 
                    50;
            } else if (i === elements.length) {
                // After last element
                const lastEl = elements[elements.length - 1];
                gapCenter = lastEl ? 
                    lastEl.getBoundingClientRect().right - rect.left + 20 : 
                    clickX;
            } else {
                // Between elements
                const leftEl = elements[i - 1];
                const rightEl = elements[i];
                const leftRight = leftEl.getBoundingClientRect().right - rect.left;
                const rightLeft = rightEl.getBoundingClientRect().left - rect.left;
                gapCenter = (leftRight + rightLeft) / 2;
            }
            
            // Check if click is in this insertion zone
            if (Math.abs(clickX - gapCenter) < INSERTION_ZONE_WIDTH / 2) {
                return {
                    isInsertionZone: true,
                    x: gapCenter + rect.left, // Convert back to page coordinates
                    y: rect.top + rect.height / 2,
                    insertIndex: i
                };
            }
        }
        
        return { isInsertionZone: false };
    }

    showInsertionCursor(x, y) {
        let cursor = document.getElementById('insertionCursor');
        
        if (!cursor) {
            cursor = document.createElement('div');
            cursor.id = 'insertionCursor';
            cursor.style.cssText = `
                position: fixed;
                width: 2px;
                height: 24px;
                background: #4CAF50;
                z-index: 1000;
                pointer-events: none;
                animation: insertionBlink 1s infinite;
            `;
            
            // Add the blinking animation
            if (!document.getElementById('insertionCursorStyle')) {
                const style = document.createElement('style');
                style.id = 'insertionCursorStyle';
                style.textContent = `
                    @keyframes insertionBlink {
                        0%, 50% { opacity: 1; }
                        51%, 100% { opacity: 0.3; }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(cursor);
        }
        
        cursor.style.left = (x - 1) + 'px';
        cursor.style.top = (y - 12) + 'px';
        cursor.style.display = 'block';
    }

    hideInsertionCursor() {
        const cursor = document.getElementById('insertionCursor');
        if (cursor) {
            cursor.style.display = 'none';
        }
    }

    handleLogClick(e) {
        if (!this.filterState.activeTimePill || !this.filterState.activeTimePill.isTimeMode) return;
        
        const logLine = e.target;
        if (!logLine.classList.contains('log-line')) return;
        
        const lineText = logLine.textContent;
        const parsed = window.TimeParser?.parseLogTime(lineText);
        
        if (parsed) {
            const timeStr = window.TimeParser.formatTime(parsed);
            this.filterState.activeTimePill.setTimeFromPicker(timeStr);
            this.filterState.activeTimePill.hideInlineTimePicker();
            
            // Visual feedback
            document.querySelectorAll('.log-line').forEach(line => line.classList.remove('selected'));
            logLine.classList.add('selected');
            
            // Clear selection after a moment
            setTimeout(() => {
                logLine.classList.remove('selected');
                this.filterState.activeTimePill = null;
                window.activeTimePill = null;
            }, 1000);
        }
    }

    getContainer() {
        return document.getElementById(`filtersContainer_${this.instanceId}`) || document.getElementById('filtersContainer');
    }
}

// Export for other modules
window.FilterInteraction = FilterInteraction;