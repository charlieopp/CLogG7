/**
 * CLog - Main Application Entry Point
 * Initializes modules and coordinates between them
 */

// Global application state and configuration
window.CLogApp = {
    // Application state
    state: {
        rightPanelVisible: false,
        leftInSyncMode: false,
        rightInSyncMode: false,
        leftSyncPoint: null,
        rightSyncPoint: null,
        filterPillCounter: 0,
        sequenceDefinitionVisible: false,
        rightSequenceDefinitionVisible: false,
        selectedLogLine: null,
        startEvent: null,
        endEvent: null,
        rightStartEvent: null,
        rightEndEvent: null,
        sequenceDefinitionSaved: false,
        isResizing: false,
        currentSettingsMenu: null
    },

    // Module instances
    modules: {
        uiManager: null,
        stateManager: null,
        panelManager: null,
        sequenceManager: null,
        apiClient: null
    },

    // Configuration
    config: {
        minPanelWidth: 300,
        autoSaveInterval: 30000, // 30 seconds
        debugMode: false
    },

    // Event emitter for inter-module communication
    events: new EventTarget(),

    // Utility functions
    utils: {
        log: function(message, level = 'info') {
            if (window.CLogApp.config.debugMode || level === 'error') {
                console[level](`[CLog] ${message}`);
            }
        },

        emit: function(eventName, detail = {}) {
            window.CLogApp.events.dispatchEvent(new CustomEvent(eventName, { detail }));
        },

        on: function(eventName, handler) {
            window.CLogApp.events.addEventListener(eventName, handler);
        },

        off: function(eventName, handler) {
            window.CLogApp.events.removeEventListener(eventName, handler);
        }
    }
};

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        CLogApp.utils.log('Initializing CLog application...');

        // Initialize modules in dependency order
        initializeModules();

        // Set up inter-module communication
        setupEventHandlers();

        // Initialize filter pills system FIRST (before UI)
        if (typeof window.initializeFilterPillsSystem === 'function') {
            window.initializeFilterPillsSystem();
        }

        // Initialize UI components
        await initializeUI();

        // Initialize WebSocket connections
        await initializeConnections();

        // Restore previous session if available
        await restoreSession();

        // Set up auto-save
        setupAutoSave();

        CLogApp.utils.log('Application initialized successfully');

    } catch (error) {
        CLogApp.utils.log(`Failed to initialize application: ${error.message}`, 'error');
        showErrorMessage('Failed to initialize CLog. Please refresh the page.');
    }
}

/**
 * Initialize all modules
 */
function initializeModules() {
    try {
        // Use global WebSocket API client (already initialized)
        if (window.ApiClient) {
            CLogApp.modules.apiClient = window.ApiClient;
        } else {
            console.warn('[App] WebSocket API client not available yet');
        }

        // Initialize state manager (depends on API client)
        CLogApp.modules.stateManager = new StateManager();

        // Initialize panel manager (depends on state manager)
        CLogApp.modules.panelManager = new PanelManager();

        // Initialize line range manager (controls the "Displaying X-Y of Z" bar)
        CLogApp.modules.lineRangeManager = new LineRangeManager();
        window.LineRangeManager = CLogApp.modules.lineRangeManager;

        // Initialize sequence manager (depends on state and panel managers)
        CLogApp.modules.sequenceManager = new SequenceManager();

        // Initialize UI manager last (depends on all other modules)
        CLogApp.modules.uiManager = new UIManager();
        
        console.log('[App] All modules initialized successfully');
    } catch (error) {
        console.error('[App] Module initialization error:', error);
        throw error;
    }

    CLogApp.utils.log('All modules initialized');
}

/**
 * Set up event handlers for inter-module communication
 */
function setupEventHandlers() {
    // Log content changes
    CLogApp.utils.on('logContentChanged', (event) => {
        const { panel, content, filename } = event.detail;
        CLogApp.utils.log(`Log content changed in ${panel} panel: ${filename}`);
        
        // Notify other modules that might need to react
        CLogApp.modules.sequenceManager.onLogContentChanged(panel, content);
    });

    // Sequence events
    CLogApp.utils.on('sequenceEventSelected', (event) => {
        const { type, event: selectedEvent } = event.detail;
        CLogApp.utils.log(`Sequence ${type} event selected: ${selectedEvent.substring(0, 50)}...`);
    });

    // Panel state changes
    CLogApp.utils.on('panelStateChanged', (event) => {
        const { rightPanelVisible } = event.detail;
        CLogApp.state.rightPanelVisible = rightPanelVisible;
        CLogApp.utils.log(`Panel state changed: rightPanelVisible=${rightPanelVisible}`);
    });

    // Filter changes
    CLogApp.utils.on('filtersChanged', (event) => {
        const { panel, filters } = event.detail;
        CLogApp.utils.log(`Filters changed in ${panel} panel`);
        
        // Apply filters via API
        CLogApp.modules.apiClient.applyFilters(panel, filters);
    });

    // State save/load events
    CLogApp.utils.on('stateSaved', (event) => {
        const { stateName } = event.detail;
        CLogApp.utils.log(`State saved: ${stateName}`);
        showSuccessMessage(`State "${stateName}" saved successfully`);
    });

    CLogApp.utils.on('stateLoaded', (event) => {
        const { stateName } = event.detail;
        CLogApp.utils.log(`State loaded: ${stateName}`);
        showSuccessMessage(`State "${stateName}" loaded successfully`);
    });

    // Error handling
    CLogApp.utils.on('error', (event) => {
        const { message, error } = event.detail;
        CLogApp.utils.log(`Error: ${message}`, 'error');
        if (error) {
            console.error(error);
        }
        showErrorMessage(message);
    });
}

/**
 * Initialize UI components and sample data
 */
async function initializeUI() {
    // Hide sync overlays initially
    const leftSyncOverlay = document.getElementById('leftSyncOverlay');
    if (leftSyncOverlay) {
        leftSyncOverlay.classList.add('hidden');
    }

    // Load sample log content if no previous session
    const hasSession = await CLogApp.modules.stateManager.hasValidSession();
    if (!hasSession) {
        await loadSampleData();
    }
}


/**
 * Initialize right panel filter system (called by panel manager)
 */
function initializeRightPanelFilter() {
    if (typeof window.initializeRightPanelFilterPills === 'function') {
        window.initializeRightPanelFilterPills();
    } else {
        console.warn('[App] initializeRightPanelFilterPills function not available');
    }
}

/**
 * Initialize WebSocket connections
 */
async function initializeConnections() {
    try {
        CLogApp.utils.log('Initializing WebSocket connections...');
        
        // Initialize connections for all enabled panels
        if (window.ApiClient && window.ApiClient.initializeConnections) {
            await window.ApiClient.initializeConnections();
        }
        
        CLogApp.utils.log('WebSocket connections initialized');
    } catch (error) {
        CLogApp.utils.log(`Failed to initialize connections: ${error.message}`, 'error');
        console.error('Connection initialization error:', error);
    }
}

/**
 * Load sample log data for demonstration
 */
async function loadSampleData() {
    const sampleLogContent = `2024-06-16 10:30:15.123 [INFO] Application started successfully
2024-06-16 10:30:16.456 [DEBUG] Initializing database connection
2024-06-16 10:30:17.789 [INFO] Database connection established
2024-06-16 10:30:18.012 [WARN] Configuration file not found, using defaults
2024-06-16 10:30:19.345 [ERROR] Failed to load user preferences
2024-06-16 10:30:20.678 [INFO] Loading user interface components
2024-06-16 10:30:21.901 [DEBUG] UI components loaded successfully
2024-06-16 10:30:22.234 [INFO] Application ready for user interaction
2024-06-16 10:30:23.567 [DEBUG] Waiting for user input
2024-06-16 10:30:24.890 [INFO] User logged in: admin@example.com
2024-06-16 10:30:25.123 [DEBUG] Loading user dashboard
2024-06-16 10:30:26.456 [INFO] Dashboard loaded successfully
2024-06-16 10:30:27.789 [WARN] Slow query detected: SELECT * FROM large_table
2024-06-16 10:30:28.012 [ERROR] Network timeout while fetching external data
2024-06-16 10:30:29.345 [INFO] Retrying network request
2024-06-16 10:30:30.678 [INFO] Network request successful`;

    // DEBUG: Log the sample data
    console.log(`[App DEBUG] Sample data length: ${sampleLogContent.length}`);
    console.log(`[App DEBUG] Sample data contains \\n:`, sampleLogContent.includes('\n'));
    console.log(`[App DEBUG] Sample data line count:`, sampleLogContent.split('\n').length);
    console.log(`[App DEBUG] First 200 chars:`, JSON.stringify(sampleLogContent.substring(0, 200)));

    // Set sample content in left panel
    const leftLogContent = document.getElementById('leftLogContent');
    if (leftLogContent) {
        console.log(`[App DEBUG] Setting textContent on leftLogContent element`);
        leftLogContent.textContent = sampleLogContent;
        
        // DEBUG: Verify what was actually set
        console.log(`[App DEBUG] After setting - element textContent length:`, leftLogContent.textContent.length);
        console.log(`[App DEBUG] After setting - contains \\n:`, leftLogContent.textContent.includes('\n'));
        
        CLogApp.modules.uiManager.makeLogLinesClickable('leftLogContent', false);
        
        // Update path label
        const leftPathLabel = document.getElementById('leftPathLabel');
        if (leftPathLabel) {
            leftPathLabel.textContent = 'sample.log';
        }
    } else {
        console.error(`[App DEBUG] leftLogContent element not found!`);
    }

    // Add sample filter pills - DISABLED (conflicts with dummy filters)
    // CLogApp.modules.uiManager.addFilterPill('leftFiltersContainer');
    // CLogApp.modules.uiManager.addFilterPill('leftFiltersContainer');

    CLogApp.utils.log('Sample data loaded');
}

/**
 * Restore previous session if available
 */
async function restoreSession() {
    try {
        const restored = await CLogApp.modules.stateManager.restoreLastSession();
        if (restored) {
            CLogApp.utils.log('Previous session restored');
        }
    } catch (error) {
        CLogApp.utils.log(`Failed to restore session: ${error.message}`, 'error');
        // Continue without session restoration
    }
}

/**
 * Set up automatic state saving
 */
function setupAutoSave() {
    // Save state before page unload
    window.addEventListener('beforeunload', () => {
        try {
            CLogApp.modules.stateManager.saveCurrentSession();
        } catch (error) {
            CLogApp.utils.log(`Failed to save session on unload: ${error.message}`, 'error');
        }
    });

    // Periodic auto-save
    setInterval(() => {
        try {
            CLogApp.modules.stateManager.saveCurrentSession();
            CLogApp.utils.log('Auto-saved current session');
        } catch (error) {
            CLogApp.utils.log(`Auto-save failed: ${error.message}`, 'error');
        }
    }, CLogApp.config.autoSaveInterval);
}

/**
 * Show success message to user
 */
function showSuccessMessage(message) {
    // For now, use alert. In the future, this could be a toast notification
    if (CLogApp.config.debugMode) {
        alert(`✅ ${message}`);
    }
}

/**
 * Show error message to user
 */
function showErrorMessage(message) {
    alert(`❌ ${message}`);
}

/**
 * Handle application errors gracefully
 */
window.addEventListener('error', (event) => {
    CLogApp.utils.log(`Unhandled error: ${event.message}`, 'error');
    console.error('Unhandled error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    CLogApp.utils.log(`Unhandled promise rejection: ${event.reason}`, 'error');
    console.error('Unhandled promise rejection:', event.reason);
});

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Export for global access
window.CLogApp = CLogApp;