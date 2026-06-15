// Global state variables
window.selectedExpressionForLoad = null;

/**
 * Click Event Debug Analyzer
 * Add this to trace all click events and see what's happening
 */

// Global click event tracer - NON-INTERFERING VERSION
function addClickDebugger(instanceId = 'default') {
    console.log('🔍 Adding NON-INTERFERING click event debugger...');
    
    // Only target the filters container to avoid interfering with other clicks
    const container = document.getElementById(`filtersContainer_${instanceId}`) || document.getElementById('filtersContainer');
    if (!container) {
        console.error('❌ Container not found, cannot add debugger');
        return;
    }
    
    // Add a passive listener that just logs but doesn't interfere
    container.addEventListener('click', function(e) {
        // Only log if we're clicking on or near filter pills
        if (!e.target.closest('.filter-pill, .operator')) {
            return; // Skip logging for empty space clicks
        }
        
        console.log('📦 CONTAINER CLICK (FILTERS ONLY)');
        console.log('  Target:', e.target.className || e.target.tagName);
        console.log('  Target text:', e.target.textContent?.trim().substring(0, 20) + '...');
        
        // Check if target or any parent has filter-terms-disabled class
        let element = e.target;
        let foundDisabled = false;
        let disabledElement = null;
        
        // Walk up the DOM tree
        while (element && element !== container) {
            if (element.classList && element.classList.contains('filter-terms-disabled')) {
                foundDisabled = true;
                disabledElement = element;
                console.log('  ✅ Found disabled element:', element.className);
                console.log('  📊 Filter terms ID:', element.dataset.filterTermsId);
                break;
            }
            element = element.parentElement;
        }
        
        if (!foundDisabled) {
            console.log('  ❌ No disabled element found in path');
        }
        
        // Check if the re-enable method exists and would be called
        const filterManager = window[`filterManager_${instanceId}`] || window.filterManager;
        if (foundDisabled && filterManager?.handleFilterTermsReEnable) {
            console.log('  ✅ handleFilterTermsReEnable method available');
        } else if (foundDisabled) {
            console.log('  ❌ handleFilterTermsReEnable method NOT available');
        }
        
    }, false); // Use normal phase, don't interfere
    
    console.log('✅ Non-interfering debugger added to container only');
}

// Function to remove debugger
function removeClickDebugger() {
    console.log('🧹 Removing click debugger (refresh page to fully clear)');
    // Note: To fully remove, user should refresh the page
    // This just logs that debugging is being turned off
    console.log('✅ Debugger removed - refresh page to fully clear event listeners');
}

// Function to test re-enable manually
function testReEnable(instanceId = 'default') {
    console.log('🧪 Testing re-enable functionality...');
    
    const container = document.getElementById(`filtersContainer_${instanceId}`) || document.getElementById('filtersContainer');
    const disabledPills = container ? container.querySelectorAll('.filter-terms-disabled') : [];
    console.log('Found disabled pills:', disabledPills.length);
    
    disabledPills.forEach((pill, index) => {
        console.log(`Disabled pill ${index}:`, {
            className: pill.className,
            dataset: pill.dataset,
            filterTermsId: pill.dataset.filterTermsId
        });
    });
    
    if (disabledPills.length > 0) {
        console.log('🔄 Attempting to re-enable first disabled pill...');
        
        const filterManager = window[`filterManager_${instanceId}`] || window.filterManager;
        if (filterManager && filterManager.handleFilterTermsReEnable) {
            filterManager.handleFilterTermsReEnable(disabledPills[0]);
        } else {
            console.error('❌ handleFilterTermsReEnable not found on filterManager');
        }
    }
}

// Function to check current state
function checkCurrentState(instanceId = 'default') {
    console.log('📊 CURRENT STATE CHECK');
    
    // Check filterManager
    const filterManager = window[`filterManager_${instanceId}`] || window.filterManager;
    if (filterManager) {
        console.log('✅ filterManager exists');
        console.log('  - disabledFilterTerms:', filterManager.disabledFilterTerms?.length || 0);
        console.log('  - handleFilterTermsReEnable exists:', typeof filterManager.handleFilterTermsReEnable);
    } else {
        console.log('❌ filterManager not found');
    }
    
    // Check disabled pills in DOM
    const container = document.getElementById(`filtersContainer_${instanceId}`) || document.getElementById('filtersContainer');
    const disabledPills = container ? container.querySelectorAll('.filter-terms-disabled') : [];
    console.log('🚫 Disabled pills in DOM:', disabledPills.length);
    
    // Check container event listeners
    if (container) {
        console.log('✅ Container exists');
        console.log('  - ID:', container.id);
        console.log('  - Class:', container.className);
    } else {
        console.log('❌ Container not found');
    }
}

// Keyboard shortcut handler
function handleKeydown(e, instanceId = 'default') {
    // Don't interfere with typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    const filterManager = window[`filterManager_${instanceId}`] || window.filterManager;
    
    switch(e.key) {
        case 'f':
            if (e.ctrlKey) {
                e.preventDefault();
                filterManager.addFilter();
            }
            break;
        case 'o':
            if (e.ctrlKey) {
                e.preventDefault();
                window.OperatorPopup.showOperatorInput(e, instanceId);
            }
            break;
        case 'Delete':
        case 'Backspace':
            // Handle delete for drag-selected terms first (highest priority)
            if (filterManager.filterTermsDisable?.selectedElements?.size > 0) {
                e.preventDefault();
                console.log('🗑️ Delete key pressed - deleting selected terms');
                filterManager.handleDeleteSelectedTerms();
                break;
            }
            
            // Handle delete for selected operators in this instance
            const container = document.getElementById(`filtersContainer_${instanceId}`) || document.getElementById('filtersContainer');
            const selectedOperator = container ? container.querySelector('.operator.selected') : null;
            if (selectedOperator) {
                e.preventDefault();
                // Find the operator instance and remove it
                const operatorInstance = filterManager.expression.find(item => item.element === selectedOperator);
                if (operatorInstance && operatorInstance.remove) {
                    operatorInstance.remove();
                }
            } else if (e.ctrlKey) {
                // Ctrl+Delete clears all
                e.preventDefault();
                filterManager.clearAll();
            }
            break;
        case 'Escape':
            // Close any open inline time pickers in this instance
            const escapeContainer = document.getElementById(`filtersContainer_${instanceId}`) || document.getElementById('filtersContainer');
            if (escapeContainer) {
                escapeContainer.querySelectorAll('.inline-time-picker.show').forEach(picker => {
                    picker.classList.remove('show');
                    picker.closest('.filter-pill').classList.remove('time-picker-open');
                });
                
                // Deselect any selected operators in this instance
                escapeContainer.querySelectorAll('.operator.selected').forEach(op => {
                    op.classList.remove('selected');
                });
            }
            
            window.activeTimePill = null;
            window.OperatorPopup.hideOperatorInput();
            break;
        case 'ArrowLeft':
        case 'ArrowRight':
            // Allow arrow navigation between operators when one is selected in this instance
            const arrowContainer = document.getElementById(`filtersContainer_${instanceId}`) || document.getElementById('filtersContainer');
            const currentSelected = arrowContainer ? arrowContainer.querySelector('.operator.selected') : null;
            if (currentSelected) {
                e.preventDefault();
                const operatorInstance = filterManager.expression.find(item => item.element === currentSelected);
                if (operatorInstance && operatorInstance.navigateToSibling) {
                    operatorInstance.navigateToSibling(e.key === 'ArrowLeft' ? -1 : 1);
                }
            }
            break;
        case 'a':
            // Quick shortcut to add AND operator
            if (e.ctrlKey && e.shiftKey) {
                e.preventDefault();
                filterManager.addOperator('AND');
            }
            break;
        case 'r':
            // Quick shortcut to add OR operator (oR)
            if (e.ctrlKey && e.shiftKey) {
                e.preventDefault();
                filterManager.addOperator('OR');
            }
            break;
        case 'd':
            // Debug shortcut - toggle click debugger
            if (e.ctrlKey && e.shiftKey) {
                e.preventDefault();
                console.log('🔧 Debug shortcut pressed');
                addClickDebugger();
            }
            break;
    }
}

// Simple initialization function
function initializeFilterSystem(instanceId = 'default') {
    const filterManager = window[`filterManager_${instanceId}`] || window.filterManager;
    
    // Button events
    const addFilterBtn = document.getElementById(`addFilterBtn_${instanceId}`) || document.getElementById('addFilterBtn');
    if (addFilterBtn) {
        addFilterBtn.addEventListener('click', () => filterManager.addFilter());
    }
    
    const addOperatorBtn = document.getElementById(`addOperatorBtn_${instanceId}`) || document.getElementById('addOperatorBtn');
    if (addOperatorBtn) {
        addOperatorBtn.addEventListener('click', (e) => {
            console.log('Add Operator button clicked');
            window.OperatorPopup.showOperatorInput(e, instanceId);
        });
    }
    
    const clearAllBtn = document.getElementById(`clearAllBtn_${instanceId}`) || document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            console.log('🧹 Clear button clicked');
            
            // Check if terms are selected - if so, delete only selected terms
            if (filterManager.filterTermsDisable?.selectedElements?.size > 0) {
                console.log('🗑️ Clear button - deleting selected terms');
                filterManager.handleDeleteSelectedTerms();
                return;
            }
            
            // No selection - show confirmation dialog for clearing all
            const confirmClear = confirm('Clear all filters and reset to default state?\n\nThis will remove all filter pills, operators, and disabled elements.');
            
            if (confirmClear) {
                filterManager.clearAll();
                console.log('✅ All filters cleared via Clear button');
            } else {
                console.log('❌ Clear All cancelled by user');
            }
        });
        console.log('✅ Clear button listener added');
    } else {
        console.error('❌ clearAllBtn not found');
    }
    
    const validateBtn = document.getElementById(`validateBtn_${instanceId}`) || document.getElementById('validateBtn');
    if (validateBtn) {
        validateBtn.addEventListener('click', () => {
            const isValid = filterManager.validateExpressionSyntax();
            alert(isValid ? '✅ Expression is valid!' : '❌ Expression has syntax errors!');
        });
    }
    
    const filtersToggle = document.getElementById(`filtersToggle_${instanceId}`) || document.getElementById('filtersToggle');
    if (filtersToggle) {
        filtersToggle.addEventListener('click', () => filterManager.toggleFilters());
    }
    
    const saveExpressionBtn = document.getElementById(`saveExpressionBtn_${instanceId}`) || document.getElementById('saveExpressionBtn');
    if (saveExpressionBtn) {
        saveExpressionBtn.addEventListener('click', () => window.SaveLoad.showSaveModal(instanceId));
    }
    
    const loadExpressionBtn = document.getElementById(`loadExpressionBtn_${instanceId}`) || document.getElementById('loadExpressionBtn');
    if (loadExpressionBtn) {
        loadExpressionBtn.addEventListener('click', () => window.SaveLoad.showLoadModal(instanceId));
    }

    // FIXED: Disable Selected Terms button - correct button ID
    const disableSelectedTermsBtn = document.getElementById(`disableSelectedTermsBtn_${instanceId}`) || document.getElementById('disableSelectedTermsBtn');
    if (disableSelectedTermsBtn) {
        disableSelectedTermsBtn.addEventListener('click', () => {
            console.log('🔘 Disable Selected Terms button clicked');
            if (filterManager?.handleDisableSelectedTerms) {
                filterManager.handleDisableSelectedTerms();
            } else {
                console.error('❌ handleDisableSelectedTerms method not found on filterManager');
            }
        });
        console.log('✅ Disable Selected Terms button listener added');
    } else {
        console.error('❌ disableSelectedTermsBtn not found');
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => handleKeydown(e, instanceId));
    
    // Expose debug functions globally for testing
    window.addClickDebugger = addClickDebugger;
    window.removeClickDebugger = removeClickDebugger;
    window.testReEnable = testReEnable;
    window.checkCurrentState = checkCurrentState;
    
    console.log('Filter system initialized successfully!');
    console.log('🔧 Debug functions available:');
    console.log('  - addClickDebugger() - Start tracing clicks (non-interfering)');
    console.log('  - removeClickDebugger() - Stop debugging');
    console.log('  - testReEnable() - Test re-enable functionality manually');
    console.log('  - checkCurrentState() - Check current system state');
    console.log('  - Ctrl+Shift+D - Quick debug shortcut');
}

// Create a function to initialize specific instances
window.initializeFilterInstance = initializeFilterSystem;

// Only auto-initialize if we're not being loaded by main_index.html
// main_index.html will handle initialization manually for each instance
if (window.location.pathname.includes('main_product.html') && !window.parent.location.pathname.includes('main_index.html')) {
    console.log('FilterPillsApp.js loaded as standalone, initializing default instance...');
    initializeFilterSystem();
} else {
    console.log('FilterPillsApp.js loaded, awaiting manual initialization...');
}