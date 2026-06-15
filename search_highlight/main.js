import { EditorView, Decoration, ViewPlugin } from "@codemirror/view";
import { EditorState, StateField, StateEffect } from "@codemirror/state";
import { RangeSetBuilder } from "@codemirror/state";

// Sample log data
const sampleLogs = `2025-01-15 10:30:22 INFO  [UserService] User authentication successful for user@example.com
2025-01-15 10:30:23 DEBUG [DatabaseConnection] Connection pool size: 25/50
2025-01-15 10:30:24 WARN  [PaymentService] Payment processing delay detected: 2.5s
2025-01-15 10:30:25 ERROR [OrderService] Failed to process order #12345: Invalid payment method
2025-01-15 10:30:26 INFO  [NotificationService] Email notification sent to admin@company.com
2025-01-15 10:30:27 DEBUG [CacheService] Cache hit rate: 87.5% over last 1000 requests
2025-01-15 10:30:28 INFO  [SecurityService] Login attempt from IP 192.168.1.100
2025-01-15 10:30:29 WARN  [DatabaseConnection] Connection timeout increased to 30s
2025-01-15 10:30:30 ERROR [FileService] Unable to read configuration file: permissions denied
2025-01-15 10:30:31 INFO  [BackupService] Daily backup completed successfully
2025-01-15 10:30:32 DEBUG [APIGateway] Request processed in 125ms for endpoint /api/users
2025-01-15 10:30:33 WARN  [MemoryMonitor] Memory usage at 78% of allocated heap
2025-01-15 10:30:34 INFO  [SessionService] Session cleanup completed: 42 expired sessions removed
2025-01-15 10:30:35 ERROR [NetworkService] Connection lost to external service: timeout after 10s
2025-01-15 10:30:36 DEBUG [LoadBalancer] Routing request to server instance: web-server-03`;

// State effect for updating search query
const setSearchQuery = StateEffect.define({
  map: (value, mapping) => value
});

// State effect for updating highlight color
const setHighlightColor = StateEffect.define({
  map: (value, mapping) => value
});

// State field to store current search query
const searchQueryField = StateField.define({
  create: () => "",
  update: (value, transaction) => {
    for (let effect of transaction.effects) {
      if (effect.is(setSearchQuery)) {
        return effect.value;
      }
    }
    return value;
  }
});

// State field to store current highlight color
const highlightColorField = StateField.define({
  create: () => "#ffb86c",
  update: (value, transaction) => {
    for (let effect of transaction.effects) {
      if (effect.is(setHighlightColor)) {
        return effect.value;
      }
    }
    return value;
  }
});

// Function to create search highlight decoration with dynamic color
const createSearchHighlight = (color) => Decoration.mark({
  class: "search-highlight",
  attributes: {
    style: `background-color: ${color}; color: #282a36; font-weight: bold;`
  }
});

// Parse search expression and extract terms
function parseSearchExpression(query) {
  const terms = [];
  let expression = query;
  
  // Handle simple comma-separated terms
  if (!query.includes('_&') && !query.includes('_|') && !query.includes('_!') && !query.includes('_(')) {
    return {
      terms: query.split(',').map(t => t.trim()).filter(t => t.length > 0),
      expression: null,
      isLogical: false
    };
  }
  
  // Extract all terms from logical expression
  const termRegex = /(?:^|[^_\w])([a-zA-Z0-9@\.\-_]+)(?=[^a-zA-Z0-9@\.\-_]|$)/g;
  let match;
  while ((match = termRegex.exec(query)) !== null) {
    const term = match[1];
    if (!['_', '__', '___'].includes(term) && !terms.includes(term)) {
      terms.push(term);
    }
  }
  
  return {
    terms: terms,
    expression: expression,
    isLogical: true
  };
}

// Evaluate logical expression for a line
function evaluateLogicalExpression(expression, lineText) {
  if (!expression) return false;
  
  let expr = expression;
  
  // Replace logical operators with JavaScript equivalents
  expr = expr.replace(/_\(\s*/g, '(');
  expr = expr.replace(/\s*_\)/g, ')');
  expr = expr.replace(/_!/g, '!');
  expr = expr.replace(/_&/g, '&&');
  expr = expr.replace(/_\|/g, '||');
  
  // Replace terms with boolean values based on line content
  const termRegex = /(?:^|[^_\w])([a-zA-Z0-9@\.\-_]+)(?=[^a-zA-Z0-9@\.\-_]|$)/g;
  let match;
  let processedExpr = expr;
  
  while ((match = termRegex.exec(expr)) !== null) {
    const term = match[1];
    if (!['true', 'false'].includes(term.toLowerCase())) {
      const termExists = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(lineText);
      processedExpr = processedExpr.replace(new RegExp('\\b' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g'), termExists.toString());
    }
  }
  
  try {
    return Function('"use strict"; return (' + processedExpr + ')')();
  } catch (e) {
    return false;
  }
}

// State field for search decorations
const searchHighlightField = StateField.define({
  create: () => Decoration.none,
  update(decorations, transaction) {
    // Get current search query and highlight color
    const searchQuery = transaction.state.field(searchQueryField);
    const highlightColor = transaction.state.field(highlightColorField);
    
    if (!searchQuery || searchQuery.length < 1) {
      return Decoration.none;
    }

    const builder = new RangeSetBuilder();
    const doc = transaction.state.doc;
    const searchHighlight = createSearchHighlight(highlightColor);
    
    // Parse the search expression
    const { terms, expression, isLogical } = parseSearchExpression(searchQuery);
    
    for (let i = 1; i <= doc.lines; i++) {
      const line = doc.line(i);
      const lineText = line.text;
      
      // For logical expressions, check if line passes the logical test
      if (isLogical) {
        if (evaluateLogicalExpression(expression, lineText)) {
          // Highlight all terms in the expression
          terms.forEach(term => {
            const termRegex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            let match;
            while ((match = termRegex.exec(lineText)) !== null) {
              const from = line.from + match.index;
              const to = from + match[0].length;
              builder.add(from, to, searchHighlight);
            }
          });
        }
      } else {
        // For comma-separated terms, highlight all terms
        terms.forEach(term => {
          const termRegex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          let match;
          while ((match = termRegex.exec(lineText)) !== null) {
            const from = line.from + match.index;
            const to = from + match[0].length;
            builder.add(from, to, searchHighlight);
          }
        });
      }
    }
    
    return builder.finish();
  },
  provide: f => EditorView.decorations.from(f)
});

// Create editor state
const startState = EditorState.create({
  doc: sampleLogs,
  extensions: [
    searchQueryField,
    highlightColorField,
    searchHighlightField,
    EditorView.theme({
      "&": {
        backgroundColor: "#282a36",
        color: "#f8f8f2"
      },
      ".cm-content": {
        padding: "16px",
        lineHeight: "1.6",
        backgroundColor: "#282a36",
        color: "#f8f8f2"
      },
      ".cm-focused": {
        outline: "none"
      },
      ".cm-editor": {
        fontSize: "14px",
        fontFamily: "'Fira Code', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace",
        backgroundColor: "#282a36"
      },
      ".cm-scroller": {
        fontFamily: "'Fira Code', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace"
      },
      ".cm-gutters": {
        backgroundColor: "#282a36",
        color: "#6272a4",
        border: "none"
      },
      ".cm-lineNumbers": {
        color: "#6272a4"
      },
      ".cm-activeLine": {
        backgroundColor: "#44475a"
      },
      ".cm-activeLineGutter": {
        backgroundColor: "#44475a"
      },
      ".cm-selectionMatch": {
        backgroundColor: "#44475a"
      }
    }),
    EditorView.lineWrapping
  ]
});

// Create editor view
const view = new EditorView({
  state: startState,
  parent: document.getElementById('editor')
});

// Search input handler
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', (e) => {
  const query = e.target.value;
  view.dispatch({
    effects: setSearchQuery.of(query)
  });
});

// Color palette handler
const colorOptions = document.querySelectorAll('.color-option');
colorOptions.forEach(option => {
  option.addEventListener('click', (e) => {
    // Remove active class from all options
    colorOptions.forEach(opt => opt.classList.remove('active'));
    
    // Add active class to clicked option
    e.target.classList.add('active');
    
    // Get the selected color
    const selectedColor = e.target.getAttribute('data-color');
    
    // Update the highlight color in the editor
    view.dispatch({
      effects: setHighlightColor.of(selectedColor)
    });
  });
});

// Make editor read-only
view.dispatch({
  effects: EditorState.readOnly.of(true)
});

console.log('CodeMirror 6 Log Viewer with Dracula theme initialized successfully!');