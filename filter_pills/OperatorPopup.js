// DEAD SIMPLE Operator Manager
class OperatorPopup {
    static targetElement = null;
    static insertBefore = true;
    static insertAtBeginning = false;
    static insertAtEnd = false;
    static instanceId = 'default';

    static showOperatorInput(e, instanceId = 'default') {
        console.log('Button clicked - will add to end');
        OperatorPopup.instanceId = instanceId;
        const input = OperatorPopup.getOperatorInput();
        const rect = e.target.getBoundingClientRect();
        
        // Button always adds to end
        OperatorPopup.targetElement = null;
        OperatorPopup.insertBefore = true;
        
        input.style.display = 'block';
        input.style.left = rect.left + 'px';
        input.style.top = (rect.bottom + 10) + 'px';
        
        // Update debug for this instance
        const debugElement = document.getElementById(`debugInfo_${instanceId}`) || document.getElementById('debugInfo');
        if (debugElement) {
            debugElement.textContent = `BUTTON: Will add to end`;
        }
        
        // Close on click outside
        setTimeout(() => {
            document.addEventListener('click', OperatorPopup.closeOperatorInput);
        }, 100);
    }


static showOperatorInputAtClick(x, y, targetElement, insertBefore, insertAtBeginning = false, insertAtEnd = false, originalEvent = null, instanceId = 'default') {
    OperatorPopup.instanceId = instanceId;
    console.log('🚀 === SHOW OPERATOR INPUT START ===');
    console.log('Parameters:', {x, y, targetElement, insertBefore, insertAtBeginning, insertAtEnd});
    
    // Debug the disabled check
    console.log('🔍 targetElement exists?', !!targetElement);
    console.log('🔍 targetElement className:', targetElement?.className);
    console.log('🔍 has fragment-disabled class?', targetElement?.classList?.contains('fragment-disabled'));
    
    // Check if the target element is disabled
    if (targetElement && targetElement.classList.contains('fragment-disabled')) {
        console.log('🚫 Refusing to show popup - target element is disabled:', targetElement.className);
        
        // Instead, trigger re-enable
        const filterManager = OperatorPopup.getFilterManager();
        if (filterManager && filterManager.handleFragmentReEnable) {
            console.log('🔄 Re-enabling fragment via OperatorPopup intercept');
            filterManager.handleFragmentReEnable(targetElement);
        }
        return; // Exit early, don't show popup
    }
    
    console.log('✅ Element not disabled, continuing with normal popup logic');
    
    // Continue with the original code (the const input line that was already there)
    const input = OperatorPopup.getOperatorInput();
    console.log('Operator input element found:', !!input);
        console.log('Input current display:', input ? input.style.display : 'N/A');
        

        
        OperatorPopup.targetElement = targetElement;
        OperatorPopup.insertBefore = insertBefore;
        OperatorPopup.insertAtBeginning = insertAtBeginning;
        OperatorPopup.insertAtEnd = insertAtEnd;
        
        // Make sure the popup stays on screen and away from main buttons
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Adjust X position if too far right
        let adjustedX = Math.min(x, windowWidth - 250); // Popup needs ~250px width
        
        // Adjust Y position - make sure it's below the click and away from main buttons
        let adjustedY = y + 20; // Always 20px below click
        
        // If popup would go off bottom, put it above the click
        if (adjustedY > windowHeight - 150) {
            adjustedY = y - 70; // 70px above click
        }
        
        // Don't let it go off the left edge
        adjustedX = Math.max(adjustedX, 10);
        
        // Don't let it go off the top
        adjustedY = Math.max(adjustedY, 10);
        
        console.log('🎯 Setting popup styles...');
        
        // Make popup very visible with bright border for testing
        input.style.display = 'block';
        input.style.left = adjustedX + 'px';
        input.style.top = adjustedY + 'px';
        input.style.zIndex = '3000'; // Make sure it's on top
        input.style.border = '3px solid red'; // Temporary - make it very visible
        input.style.backgroundColor = '#333'; // Make sure it's visible
        input.style.position = 'fixed'; // Make sure it's positioned correctly
        
        console.log('✅ Popup styles applied');
        console.log('Final position:', adjustedX, adjustedY);
        console.log('Final display:', input.style.display);
        console.log('Final z-index:', input.style.zIndex);
        
        // Force a repaint
        input.offsetHeight;
        
        console.log(`🎯 POPUP SHOULD BE VISIBLE at (${adjustedX}, ${adjustedY}) with RED BORDER`);
        
        // Prevent the current click from immediately closing the popup
        if (originalEvent) {
            originalEvent.stopPropagation();
        }
        
        // Close on click outside - but wait longer to avoid immediate closure
        setTimeout(() => {
            console.log('🔒 Setting up click outside handler');
            document.addEventListener('click', OperatorPopup.closeOperatorInput);
        }, 500); // Increased to 500ms to definitely prevent immediate closure
        
        console.log('🚀 === SHOW OPERATOR INPUT END ===');
    }

    static closeOperatorInput(e) {
        console.log('🔒 closeOperatorInput called, event target:', e.target);
        const input = OperatorPopup.getOperatorInput();
        console.log('Popup contains target?', input?.contains(e.target));
        
        if (!input || !input.contains(e.target)) {
            console.log('❌ Hiding operator input due to outside click');
            OperatorPopup.hideOperatorInput();
            document.removeEventListener('click', OperatorPopup.closeOperatorInput);
        } else {
            console.log('✅ Click was inside popup, keeping it open');
        }
    }

    static hideOperatorInput() {
        console.log('🚫 hideOperatorInput called');
        const input = OperatorPopup.getOperatorInput();
        if (input) {
            input.style.display = 'none';
            console.log('Popup hidden');
        }
    }

    static insertOperator(type) {
        console.log('=== insertOperator DEBUG START ===');
        console.log('insertOperator called with:', type);
        const filterManager = OperatorPopup.getFilterManager();
        console.log('filterManager:', filterManager);
        console.log('typeof filterManager:', typeof filterManager);
        console.log('filterManager.addOperator:', filterManager?.addOperator);
        console.log('typeof addOperator:', typeof filterManager?.addOperator);
        
        console.log('Current targetElement:', OperatorPopup.targetElement);
        console.log('Current insertBefore:', OperatorPopup.insertBefore);
        console.log('Current insertAtBeginning:', OperatorPopup.insertAtBeginning);
        console.log('Current insertAtEnd:', OperatorPopup.insertAtEnd);
        
        try {
            const filterManager = OperatorPopup.getFilterManager();
            if (!filterManager) {
                console.error('❌ No filter manager found for instance:', OperatorPopup.instanceId);
                return;
            }
            
            if (OperatorPopup.insertAtBeginning) {
                console.log('Calling addOperatorAtPosition for BEGINNING');
                filterManager.addOperatorAtPosition(type, OperatorPopup.targetElement, true);
            } else if (OperatorPopup.insertAtEnd) {
                console.log('Calling addOperator for END');
                console.log('About to call filterManager.addOperator with:', type);
                const result = filterManager.addOperator(type);
                console.log('addOperator result:', result);
            } else if (OperatorPopup.targetElement) {
                console.log('Calling addOperatorAtPosition for MIDDLE');
                filterManager.addOperatorAtPosition(type, OperatorPopup.targetElement, OperatorPopup.insertBefore);
            } else {
                console.log('Fallback: Calling addOperator (end)');
                filterManager.addOperator(type);
            }
        } catch (error) {
            console.error('❌ Error in insertOperator:', error);
            console.error('Error stack:', error.stack);
        }
        
        console.log('=== insertOperator DEBUG END ===');
        OperatorPopup.hideOperatorInput();
    }
    
    static getOperatorInput() {
        return document.getElementById(`operatorInput_${OperatorPopup.instanceId}`) || document.getElementById('operatorInput');
    }
    
    static getFilterManager() {
        return window[`filterManager_${OperatorPopup.instanceId}`] || window.filterManager;
    }
}

// Make OperatorPopup available globally
window.OperatorPopup = OperatorPopup;