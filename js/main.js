import { CodeMirror6 } from './codemirror-setup.js'

/**
 * Main entry point for CodeMirror 6 initialization
 * CLog modules are loaded via script tags, this just adds CodeMirror 6 support
 */

// Make CodeMirror 6 available globally for backward compatibility
window.CodeMirror6 = CodeMirror6

// Initialize CodeMirror 6 when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Main] CodeMirror 6 initialized via Vite')
  
  // Wait for CLog modules to be ready, then reinitialize CodeMirror
  setTimeout(() => {
    if (window.CLogApp && window.CLogApp.modules && window.CLogApp.modules.uiManager) {
      console.log('[Main] Reinitializing CodeMirror editors in UIManager')
      window.CLogApp.modules.uiManager.initializeCodeMirrorEditors()
    }
  }, 500)
})

console.log('[Main] CodeMirror 6 main module loaded')