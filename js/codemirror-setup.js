import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, Decoration } from '@codemirror/view'
import { EditorState, StateField, StateEffect } from '@codemirror/state'
import { foldGutter, indentOnInput, bracketMatching, foldKeymap } from '@codemirror/language'
import { history, defaultKeymap, historyKeymap, indentWithTab } from '@codemirror/commands'
import { searchKeymap } from '@codemirror/search'
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { lintKeymap } from '@codemirror/lint'
import { oneDark } from '@codemirror/theme-one-dark'

/**
 * CodeMirror 6 setup for CLog application
 * Replaces CodeMirror 5 functionality
 */

// Tracks the file-line offset for the gutter, so line numbers reflect the
// position within the full file rather than the currently-loaded range.
const setLineOffsetEffect = StateEffect.define()

const lineOffsetField = StateField.define({
  create() {
    return 0
  },
  update(value, tr) {
    for (let e of tr.effects) {
      if (e.is(setLineOffsetEffect)) value = e.value
    }
    return value
  }
})

// Basic extensions for all editors
const basicExtensions = [
  lineOffsetField,
  lineNumbers({
    formatNumber: (lineNo, state) => String(lineNo + state.field(lineOffsetField))
  }),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  crosshairCursor(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap,
    indentWithTab,
  ])
]

// Theme configuration - minimal styling to preserve existing UI
const lightTheme = EditorView.theme({
  '.cm-content': {
    padding: '10px',
    fontSize: '14px',
    fontFamily: 'monospace'
  },
  '.cm-gutters': {
    backgroundColor: 'var(--bg-secondary, #f5f5f5)',
    color: 'var(--text-secondary, #666666)',
    border: 'none'
  },
  '.cm-lineNumbers': {
    color: 'var(--text-muted, #999999)'
  }
})

const darkTheme = [
  oneDark,
  EditorView.theme({
    '.cm-content': {
      padding: '10px',
      fontSize: '14px',
      fontFamily: 'monospace'
    }
  })
]

/**
 * Create a CodeMirror 6 editor
 */
export function createEditor(element, options = {}) {
  const {
    doc = '',
    readOnly = true,
    lineWrapping = true,
    theme = 'light',
    onLineClick = null
  } = options

  const extensions = [
    ...basicExtensions,
    lineHighlightField,
    EditorState.readOnly.of(readOnly),
    theme === 'dark' ? darkTheme : lightTheme
  ]
  
  // Add line wrapping if enabled
  if (lineWrapping) {
    extensions.push(EditorView.lineWrapping)
  }

  // Add click handler if provided
  if (onLineClick) {
    extensions.push(
      EditorView.domEventHandlers({
        mousedown: (event, view) => {
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
          if (pos !== null) {
            const line = view.state.doc.lineAt(pos)
            const lineNumber = line.number - 1 // Convert to 0-based
            const lineContent = line.text
            onLineClick(lineContent, lineNumber, event)
          }
        }
      })
    )
  }

  const state = EditorState.create({
    doc,
    extensions
  })

  const view = new EditorView({
    state,
    parent: element
  })

  return view
}

/**
 * Update editor content
 */
export function updateEditorContent(editor, content) {
  const transaction = editor.state.update({
    changes: { from: 0, to: editor.state.doc.length, insert: content }
  })
  editor.dispatch(transaction)
}

/**
 * Get editor content
 */
export function getEditorContent(editor) {
  return editor.state.doc.toString()
}

/**
 * Refresh editor (equivalent to CM5's refresh)
 */
export function refreshEditor(editor) {
  editor.requestMeasure()
}

/**
 * Set the offset added to gutter line numbers, so they reflect the line's
 * position in the full file when only a sub-range is loaded.
 */
export function setLineNumberOffset(editor, offset) {
  editor.dispatch({
    effects: setLineOffsetEffect.of(offset)
  })
}

/**
 * Set editor theme
 */
export function setEditorTheme(editor, theme) {
  const isDark = theme === 'dark'
  const themeExtension = isDark ? darkTheme : lightTheme
  
  const effects = [
    EditorView.theme.reconfigure(themeExtension)
  ]
  
  editor.dispatch({ effects })
}

// Line highlighting system
const addLineHighlightEffect = StateEffect.define()
const clearLineHighlights = StateEffect.define()

const lineHighlightField = StateField.define({
  create() {
    return Decoration.none
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes)
    for (let e of tr.effects) {
      if (e.is(addLineHighlightEffect)) {
        const { from, className } = e.value
        const decoration = Decoration.line({ class: className })
        decorations = decorations.update({
          add: [decoration.range(from)]
        })
      } else if (e.is(clearLineHighlights)) {
        decorations = Decoration.none
      }
    }
    return decorations
  },
  provide: f => EditorView.decorations.from(f)
})

/**
 * Clear all line highlights
 */
export function clearAllHighlights(editor) {
  editor.dispatch({
    effects: clearLineHighlights.of(null)
  })
}

/**
 * Add line highlight with CSS class
 */
export function addLineHighlight(editor, lineNumber, className) {
  const line = editor.state.doc.line(lineNumber + 1) // Convert to 1-based
  editor.dispatch({
    effects: addLineHighlightEffect.of({
      from: line.from,
      className: className
    })
  })
}

/**
 * Apply multiple line highlights
 */
export function applyLineHighlights(editor, highlights) {
  const effects = []
  effects.push(clearLineHighlights.of(null))
  
  highlights.forEach(({ lineNumber, className }) => {
    try {
      const line = editor.state.doc.line(lineNumber + 1) // Convert to 1-based
      effects.push(addLineHighlightEffect.of({
        from: line.from,
        className: className
      }))
    } catch (e) {
      console.warn(`Failed to highlight line ${lineNumber}:`, e)
    }
  })
  
  editor.dispatch({ effects })
}

// Export for backward compatibility
export const CodeMirror6 = {
  createEditor,
  updateEditorContent,
  getEditorContent,
  refreshEditor,
  setLineNumberOffset,
  setEditorTheme,
  clearAllHighlights,
  addLineHighlight,
  applyLineHighlights
}