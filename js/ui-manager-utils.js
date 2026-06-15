/**
 * UIManager Utils - Utility functions for UI operations
 * Handles common UI utilities and helper functions
 */

class UIManagerUtils {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    /**
     * Escape HTML characters
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Update event display areas
     */
    updateEventDisplay(displayId, eventContent) {
        const display = document.getElementById(displayId);
        if (display) {
            if (eventContent) {
                // Show event content (truncated for display)
                const truncated = eventContent.length > 100 ? 
                    eventContent.substring(0, 100) + '...' : eventContent;
                display.innerHTML = `<span class="sequence-event-text">${this.escapeHtml(truncated)}</span>`;
            } else {
                // Show placeholder
                const placeholderText = displayId.includes('start') ? 'No start event selected' : 'No end event selected';
                display.innerHTML = `<span class="sequence-placeholder">${placeholderText}</span>`;
            }
        }
    }

    /**
     * Show error message
     */
    showErrorMessage(message) {
        console.error(`[UIManager] ${message}`);
        // Could be enhanced with toast notifications
        alert(`❌ ${message}`);
    }

    /**
     * Show success message
     */
    showSuccessMessage(message) {
        console.log(`[UIManager] ${message}`);
        // Could be enhanced with toast notifications
        alert(`✅ ${message}`);
    }

    /**
     * Show info message
     */
    showInfoMessage(message) {
        console.info(`[UIManager] ${message}`);
        // Could be enhanced with toast notifications
        alert(`ℹ️ ${message}`);
    }

    /**
     * Get element safely with error handling
     */
    getElement(elementId) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`[UIManager] Element not found: ${elementId}`);
        }
        return element;
    }

    /**
     * Toggle element visibility
     */
    toggleElementVisibility(elementId, show = null) {
        const element = this.getElement(elementId);
        if (element) {
            if (show === null) {
                element.classList.toggle('hidden');
            } else if (show) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        }
    }

    /**
     * Set element text content safely
     */
    setElementText(elementId, text) {
        const element = this.getElement(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    /**
     * Set element HTML content safely
     */
    setElementHtml(elementId, html) {
        const element = this.getElement(elementId);
        if (element) {
            element.innerHTML = html;
        }
    }

    /**
     * Add CSS class to element
     */
    addClass(elementId, className) {
        const element = this.getElement(elementId);
        if (element) {
            element.classList.add(className);
        }
    }

    /**
     * Remove CSS class from element
     */
    removeClass(elementId, className) {
        const element = this.getElement(elementId);
        if (element) {
            element.classList.remove(className);
        }
    }

    /**
     * Toggle CSS class on element
     */
    toggleClass(elementId, className) {
        const element = this.getElement(elementId);
        if (element) {
            element.classList.toggle(className);
            return element.classList.contains(className);
        }
        return false;
    }

    /**
     * Debounce function calls
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function calls
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Format timestamp for display
     */
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    /**
     * Generate unique ID
     */
    generateId(prefix = 'id') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showSuccessMessage('Copied to clipboard');
            return true;
        } catch (error) {
            console.error('[UIManager] Failed to copy to clipboard:', error);
            this.showErrorMessage('Failed to copy to clipboard');
            return false;
        }
    }

    /**
     * Download content as file
     */
    downloadAsFile(content, filename, contentType = 'text/plain') {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate URL format
     */
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get current viewport dimensions
     */
    getViewportDimensions() {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    /**
     * Check if element is in viewport
     */
    isElementInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    /**
     * Scroll element into view smoothly
     */
    scrollIntoView(elementId, behavior = 'smooth') {
        const element = this.getElement(elementId);
        if (element) {
            element.scrollIntoView({ behavior, block: 'center' });
        }
    }

    /**
     * Create loading spinner
     */
    createLoadingSpinner(size = 'medium') {
        const spinner = document.createElement('div');
        spinner.className = `loading-spinner ${size}`;
        spinner.innerHTML = '<div class="spinner-circle"></div>';
        return spinner;
    }

    /**
     * Show loading state on element
     */
    showLoading(elementId) {
        const element = this.getElement(elementId);
        if (element) {
            const spinner = this.createLoadingSpinner();
            element.appendChild(spinner);
            return spinner;
        }
        return null;
    }

    /**
     * Hide loading state on element
     */
    hideLoading(elementId) {
        const element = this.getElement(elementId);
        if (element) {
            const spinners = element.querySelectorAll('.loading-spinner');
            spinners.forEach(spinner => spinner.remove());
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManagerUtils;
} else if (typeof window !== 'undefined') {
    window.UIManagerUtils = UIManagerUtils;
}