/**
 * TimePill - Dedicated UI component for time-based filter pills
 * FIXED: New time pills default to 00 seconds and 000 milliseconds
 */

class TimePill {
    constructor(container, options = {}) {
        this.container = container;
        this.instanceId = options.instanceId || 'default';
        this.id = ++window.filterCounter;
        this.options = {
            fullTimeStr: options.fullTimeStr || '',
            isInclude: options.isInclude !== false,
            onDelete: options.onDelete || (() => {}),
            onChange: options.onChange || (() => {})
        };
        
        // If no time string provided, create default with current date/time but ZERO seconds/ms
        if (!this.options.fullTimeStr) {
            const now = new Date();
            const timeData = TimeParser.dateToComponents(now);
            timeData.second = '00';   // Force seconds to zero for new pills
            timeData.millis = '000';  // Force milliseconds to zero for new pills
            console.log('🕐 TimePill constructor - timeData:', timeData);
            this.fullTimeStr = TimeParser.componentsToTimeString(timeData);
        } else {
            this.fullTimeStr = this.options.fullTimeStr;
        }
        
        this.isInclude = this.options.isInclude;
        
        this.element = this.createElement();
        this.bindEvents();
        
        if (this.container) {
            this.container.appendChild(this.element);
        }
        
        console.log('[TimePill] Created with options:', this.options);
        console.log('[TimePill] Initial fullTimeStr:', this.fullTimeStr);
    }

    createElement() {
        const pill = document.createElement('div');
        pill.className = 'filter-pill time-pill';
        pill.draggable = true;
        pill.dataset.pillId = this.id;
        pill.setAttribute('data-instance-id', this.instanceId);

        pill.innerHTML = `
            <div class="pill-main-row">
                <button class="type-btn time-mode ${this.isInclude ? '' : 'exclude'}">${this.getTypeText()}</button>
                <button class="mode-btn time-mode">⌚</button>
                <input type="text" class="filter-entry time-mode" 
                       value="${this.fullTimeStr ? this.getDisplayTime() : 'Set Time'}"
                       placeholder="Click to set datetime"
                       readonly>
                <div class="delete-btn">×</div>
            </div>
            ${this.createTimePickerHTML()}
        `;

        return pill;
    }

    createTimePickerHTML() {
        // Parse existing time or use current time with FORCED defaults
        let timeData;
        if (this.fullTimeStr) {
            timeData = TimeParser.parseTimeString(this.fullTimeStr);
        } else {
            // Default to current time but with seconds=00, ms=000
            const now = new Date();
            timeData = TimeParser.dateToComponents(now);
            timeData.second = '00';  // FORCE seconds to zero
            timeData.millis = '000'; // FORCE milliseconds to zero
        }

        return `
            <div class="inline-time-picker">
                <div class="time-picker-header">
                    ⌚ Set Date & Time
                </div>
                <div class="time-picker-grid">
                    <select class="time-input-inline month" id="month${this.id}">
                        <option value="Jan" ${timeData.month === 'Jan' ? 'selected' : ''}>Jan</option>
                        <option value="Feb" ${timeData.month === 'Feb' ? 'selected' : ''}>Feb</option>
                        <option value="Mar" ${timeData.month === 'Mar' ? 'selected' : ''}>Mar</option>
                        <option value="Apr" ${timeData.month === 'Apr' ? 'selected' : ''}>Apr</option>
                        <option value="May" ${timeData.month === 'May' ? 'selected' : ''}>May</option>
                        <option value="Jun" ${timeData.month === 'Jun' ? 'selected' : ''}>Jun</option>
                        <option value="Jul" ${timeData.month === 'Jul' ? 'selected' : ''}>Jul</option>
                        <option value="Aug" ${timeData.month === 'Aug' ? 'selected' : ''}>Aug</option>
                        <option value="Sep" ${timeData.month === 'Sep' ? 'selected' : ''}>Sep</option>
                        <option value="Oct" ${timeData.month === 'Oct' ? 'selected' : ''}>Oct</option>
                        <option value="Nov" ${timeData.month === 'Nov' ? 'selected' : ''}>Nov</option>
                        <option value="Dec" ${timeData.month === 'Dec' ? 'selected' : ''}>Dec</option>
                    </select>
                    <input type="number" class="time-input-inline day" id="day${this.id}" value="${timeData.day}" min="1" max="31">
                    <input type="number" class="time-input-inline year" id="year${this.id}" value="${timeData.year}" min="2020" max="2030">
                    <input type="number" class="time-input-inline hour" id="hour${this.id}" value="${timeData.hour}" min="0" max="23">
                    <div class="time-separator-inline">:</div>
                    <input type="number" class="time-input-inline minute" id="minute${this.id}" value="${timeData.minute}" min="0" max="59">
                    <div class="time-separator-inline">:</div>
                    <input type="number" class="time-input-inline second" id="second${this.id}" value="${timeData.second}" min="0" max="59">
                    <div class="time-separator-inline">.</div>
                    <input type="number" class="time-input-inline millis" id="millis${this.id}" value="${timeData.millis}" min="0" max="999">
                </div>
                <div class="time-picker-buttons-inline">
                    <button class="time-btn-inline now" data-action="now" data-pill-id="${this.id}">Now</button>
                    <button class="time-btn-inline cancel" data-action="cancel" data-pill-id="${this.id}">Cancel</button>
                    <button class="time-btn-inline" data-action="confirm" data-pill-id="${this.id}">OK</button>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const typeBtn = this.element.querySelector('.type-btn');
        const entry = this.element.querySelector('.filter-entry');
        const deleteBtn = this.element.querySelector('.delete-btn');

        // Include/exclude toggle (>= vs <=)
        typeBtn.addEventListener('click', (e) => {
            // Check if disabled - if so, re-enable the fragment
            if (this.element.classList.contains('fragment-disabled')) {
                console.log('🔄 Re-enabling fragment via disabled TimePill type button');
                e.stopPropagation();
                e.preventDefault();
                
                const filterManager = this.getFilterManager();
                if (filterManager && filterManager.handleFragmentReEnable) {
                    filterManager.handleFragmentReEnable(this.element);
                }
                return;
            }
            
            // Normal type toggle logic
            e.stopPropagation();
            this.isInclude = !this.isInclude;
            typeBtn.classList.toggle('exclude', !this.isInclude);
            typeBtn.textContent = this.getTypeText();
            this.notifyChange();
        });

        // Mode toggle - switch back to text mode
        const modeBtn = this.element.querySelector('.mode-btn');
        modeBtn.addEventListener('click', (e) => {
            // Check if disabled - if so, re-enable the fragment
            if (this.element.classList.contains('fragment-disabled')) {
                console.log('🔄 Re-enabling fragment via disabled TimePill mode button');
                e.stopPropagation();
                e.preventDefault();
                
                const filterManager = this.getFilterManager();
                if (filterManager && filterManager.handleFragmentReEnable) {
                    filterManager.handleFragmentReEnable(this.element);
                }
                return;
            }
            
            // Normal mode toggle logic
            e.stopPropagation();
            this.switchToTextMode();
        });

        // Time input - show picker on click
        entry.addEventListener('click', (e) => {
            // Check if disabled - if so, re-enable the fragment
            if (this.element.classList.contains('fragment-disabled')) {
                console.log('🔄 Re-enabling fragment via disabled TimePill input click');
                e.stopPropagation();
                e.preventDefault();
                
                const filterManager = this.getFilterManager();
                if (filterManager && filterManager.handleFragmentReEnable) {
                    filterManager.handleFragmentReEnable(this.element);
                }
                return;
            }
            
            // Normal time picker logic
            e.stopPropagation();
            this.showTimePicker();
        });

        // Delete button
        deleteBtn.addEventListener('click', (e) => {
            // Check if disabled - if so, re-enable the fragment
            if (this.element.classList.contains('fragment-disabled')) {
                console.log('🔄 Re-enabling fragment via disabled TimePill delete button');
                e.stopPropagation();
                e.preventDefault();
                
                const filterManager = this.getFilterManager();
                if (filterManager && filterManager.handleFragmentReEnable) {
                    filterManager.handleFragmentReEnable(this.element);
                }
                return;
            }
            
            // Normal delete logic
            e.stopPropagation();
            this.remove();
        });

        // Drag functionality
        this.element.addEventListener('dragstart', (e) => {
            // Prevent dragging disabled elements
            if (this.element.classList.contains('fragment-disabled')) {
                e.preventDefault();
                return;
            }
            
            // Normal drag logic
            window.draggedElement = this.element;
            this.element.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.element.outerHTML);
        });

        this.element.addEventListener('dragend', () => {
            this.element.classList.remove('dragging');
            window.draggedElement = null;
        });

        // Setup time picker button events
        this.setupTimePickerButtons();
    }

    setupTimePickerButtons() {
        const timeButtons = this.element.querySelectorAll('.time-btn-inline');
        timeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = button.dataset.action;
                
                if (action === 'now') {
                    this.setCurrentTime();
                } else if (action === 'cancel') {
                    this.hideTimePicker();
                } else if (action === 'confirm') {
                    this.confirmTime();
                }
            });
        });
    }

    getTypeText() {
        return this.isInclude ? '>=' : '<=';
    }

    showTimePicker() {
        // Close any other open time pickers in this instance
        const container = this.getContainer();
        container.querySelectorAll('.inline-time-picker.show').forEach(picker => {
            picker.classList.remove('show');
            picker.closest('.filter-pill').classList.remove('time-picker-open');
        });

        const picker = this.element.querySelector('.inline-time-picker');
        if (picker) {
            picker.classList.add('show');
            this.element.classList.add('time-picker-open');

            // FIXED: Initialize with current time but ZERO seconds/ms if no existing time
            if (!this.fullTimeStr) {
                const now = new Date();
                const timeData = TimeParser.dateToComponents(now);
                timeData.second = '00';  // FORCE seconds to zero
                timeData.millis = '000'; // FORCE milliseconds to zero
                
                // Manually populate with ZERO defaults
                const monthSelect = this.element.querySelector(`#month${this.id}`);
                const dayInput = this.element.querySelector(`#day${this.id}`);
                const yearInput = this.element.querySelector(`#year${this.id}`);
                const hourInput = this.element.querySelector(`#hour${this.id}`);
                const minuteInput = this.element.querySelector(`#minute${this.id}`);
                const secondInput = this.element.querySelector(`#second${this.id}`);
                const millisInput = this.element.querySelector(`#millis${this.id}`);

                if (monthSelect) monthSelect.value = timeData.month;
                if (dayInput) dayInput.value = timeData.day;
                if (yearInput) yearInput.value = timeData.year;
                if (hourInput) hourInput.value = timeData.hour;
                if (minuteInput) minuteInput.value = timeData.minute;
                if (secondInput) secondInput.value = '00';  // FORCE to 00
                if (millisInput) millisInput.value = '000'; // FORCE to 000
                // Right after: if (millisInput) millisInput.value = '000';
                onsole.log('🕐 showTimePicker - setting defaults, second:', '00', 'millis:', '000');
            }

            window.activeTimePill = this;
        }
    }

    hideTimePicker() {
        const picker = this.element.querySelector('.inline-time-picker');
        if (picker) {
            picker.classList.remove('show');
            this.element.classList.remove('time-picker-open');
        }
        
        if (window.activeTimePill === this) {
            window.activeTimePill = null;
        }
    }

    populateTimePicker(date) {
        const components = TimeParser.dateToComponents(date);
        
        const monthSelect = this.element.querySelector(`#month${this.id}`);
        const dayInput = this.element.querySelector(`#day${this.id}`);
        const yearInput = this.element.querySelector(`#year${this.id}`);
        const hourInput = this.element.querySelector(`#hour${this.id}`);
        const minuteInput = this.element.querySelector(`#minute${this.id}`);
        const secondInput = this.element.querySelector(`#second${this.id}`);
        const millisInput = this.element.querySelector(`#millis${this.id}`);

        if (monthSelect) monthSelect.value = components.month;
        if (dayInput) dayInput.value = components.day;
        if (yearInput) yearInput.value = components.year;
        if (hourInput) hourInput.value = components.hour;
        if (minuteInput) minuteInput.value = components.minute;
        if (secondInput) secondInput.value = components.second;
        if (millisInput) millisInput.value = components.millis;
    }

    confirmTime() {
        const month = this.element.querySelector(`#month${this.id}`)?.value || 'Jan';
        const day = (this.element.querySelector(`#day${this.id}`)?.value || '1').padStart(2, ' ');
        const year = this.element.querySelector(`#year${this.id}`)?.value || new Date().getFullYear();
        const hour = (this.element.querySelector(`#hour${this.id}`)?.value || '0').padStart(2, '0');
        const minute = (this.element.querySelector(`#minute${this.id}`)?.value || '0').padStart(2, '0');
        const second = (this.element.querySelector(`#second${this.id}`)?.value || '0').padStart(2, '0');
        const millis = (this.element.querySelector(`#millis${this.id}`)?.value || '0').padStart(3, '0');
        
        // Format: "Feb  9 2025 10:30:45.123"
        const timeStr = `${month} ${day} ${year} ${hour}:${minute}:${second}.${millis}`;
        this.setTime(timeStr);
        this.hideTimePicker();
    }

    setCurrentTime() {
        const now = new Date();
        // FIXED: Set current time but FORCE milliseconds to zero, keep actual seconds
        const timeData = TimeParser.dateToComponents(now);
        timeData.millis = '000'; // FORCE milliseconds to zero for "Now" button
        // Keep timeData.second as current seconds (don't force to 00 for "Now" button)
        
        // Populate the time picker with this data
        const monthSelect = this.element.querySelector(`#month${this.id}`);
        const dayInput = this.element.querySelector(`#day${this.id}`);
        const yearInput = this.element.querySelector(`#year${this.id}`);
        const hourInput = this.element.querySelector(`#hour${this.id}`);
        const minuteInput = this.element.querySelector(`#minute${this.id}`);
        const secondInput = this.element.querySelector(`#second${this.id}`);
        const millisInput = this.element.querySelector(`#millis${this.id}`);

        if (monthSelect) monthSelect.value = timeData.month;
        if (dayInput) dayInput.value = timeData.day;
        if (yearInput) yearInput.value = timeData.year;
        if (hourInput) hourInput.value = timeData.hour;
        if (minuteInput) minuteInput.value = timeData.minute;
        if (secondInput) secondInput.value = timeData.second; // Keep ACTUAL current seconds for "Now"
        if (millisInput) millisInput.value = '000'; // But force milliseconds to 000
    }

    setTime(timeStr) {
        this.fullTimeStr = timeStr;
        const entry = this.element.querySelector('.filter-entry');
        if (entry) {
            entry.value = this.getDisplayTime();
            entry.dataset.fullTimeStr = this.fullTimeStr;
        }
        this.notifyChange();
    }

    getDisplayTime() {
        if (!this.fullTimeStr) return 'Set Time';
        
        // Custom display logic: hide milliseconds if they're zero, always show seconds
        const timeData = TimeParser.parseTimeString(this.fullTimeStr);
        
        // Build display string: "Feb  9 10:30:45" or "Feb  9 10:30:45.123"
        const day = timeData.day.padStart(2, ' ');
        const timeBase = `${timeData.month} ${day} ${timeData.hour}:${timeData.minute}:${timeData.second}`;
        
        // Only add milliseconds if they're not zero
        if (timeData.millis && timeData.millis !== '000') {
            return `${timeBase}.${timeData.millis}`;
        } else {
            return timeBase;
        }
    }

    getState() {
        return {
            fullTimeStr: this.fullTimeStr,
            isInclude: this.isInclude,
            type: 'time'
        };
    }

    setState(state) {
        this.isInclude = state.isInclude !== false;
        this.fullTimeStr = state.fullTimeStr || '';
        
        // Update UI elements
        const typeBtn = this.element.querySelector('.type-btn');
        const entry = this.element.querySelector('.filter-entry');
        
        if (typeBtn) {
            typeBtn.classList.toggle('exclude', !this.isInclude);
            typeBtn.textContent = this.getTypeText();
        }
        
        if (entry) {
            entry.value = this.getDisplayTime();
        }
    }

    notifyChange() {
        // Call onChange callback if provided
        if (this.options && this.options.onChange) {
            this.options.onChange(this.getState());
        }
    }

    remove() {
        // Call onDelete callback if provided
        if (this.options && this.options.onDelete) {
            this.options.onDelete(this);
        }
        
        this.element.remove();
    }

    switchToTextMode() {
        // Replace this TimePill with a FilterPill
        const currentState = this.getState();
        const container = this.container;
        
        // Create new FilterPill 
        const filterPill = new FilterPill(container, {
            initialText: this.getDisplayTime() || 'new filter',
            isInclude: currentState.isInclude,
            instanceId: this.instanceId,
            onDelete: this.options.onDelete,
            onChange: this.options.onChange
        });
        
        // Replace in expression array if it exists
        const filterManager = this.getFilterManager();
        if (filterManager && filterManager.expression) {
            const index = filterManager.expression.indexOf(this);
            if (index > -1) {
                filterManager.expression[index] = filterPill;
            }
        }
        
        // Remove old element and update
        this.element.remove();
        this.notifyChange();
    }

    getFilterManager() {
        return window[`filterManager_${this.instanceId}`] || window.filterManager;
    }
    
    getContainer() {
        return document.getElementById(`filtersContainer_${this.instanceId}`) || document.getElementById('filtersContainer');
    }

    toString() {
        const operator = this.isInclude ? '>=' : '<=';
        return `time ${operator} "${this.fullTimeStr}"`;
    }
}

// Export for global access
window.TimePill = TimePill;