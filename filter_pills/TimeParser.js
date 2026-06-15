/**
 * TimeParser - Enhanced time utility functions for log parsing and time component management
 */
class TimeParser {
    /**
     * Parse timestamp from log line
     * Handles both formats: "Feb  9 2025 10:30:45.123" or "Feb  9 10:30:45.123"
     */
    static parseLogTime(logLine) {
        const patternWithYear = /(\w{3})\s+(\d{1,2})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\.(\d{3})/;
        const patternWithoutYear = /(\w{3})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\.(\d{3})/;
        
        let match = logLine.match(patternWithYear);
        let hasYear = true;
        
        if (!match) {
            match = logLine.match(patternWithoutYear);
            hasYear = false;
        }
        
        if (!match) return null;
        
        const monthMap = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        
        if (hasYear) {
            const [, month, day, year, hour, minute, second, millis] = match;
            return new Date(parseInt(year), monthMap[month], parseInt(day), parseInt(hour), parseInt(minute), parseInt(second), parseInt(millis));
        } else {
            const [, month, day, hour, minute, second, millis] = match;
            const currentYear = new Date().getFullYear();
            return new Date(currentYear, monthMap[month], parseInt(day), parseInt(hour), parseInt(minute), parseInt(second), parseInt(millis));
        }
    }

    /**
     * Format Date object to log timestamp format
     * Returns: "Feb  9 2025 10:30:45.123"
     */
    static formatTime(date) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const day = date.getDate().toString().padStart(2, ' ');
        const year = date.getFullYear();
        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');
        const second = date.getSeconds().toString().padStart(2, '0');
        const millis = date.getMilliseconds().toString().padStart(3, '0');
        
        return `${month} ${day} ${year} ${hour}:${minute}:${second}.${millis}`;
    }

    /**
     * Parse time string into components for UI display
     * Input: "Feb  9 2025 10:30:45.123"
     * Returns: {month, day, year, hour, minute, second, millis}
     */
    static parseTimeString(timeStr) {
        const parts = timeStr.split(' ');
        if (parts.length < 4) {
            // Fallback to current time
            const now = new Date();
            return this.dateToComponents(now);
        }
        
        const month = parts[0];
        const day = parts[1];
        const year = parts[2];
        
        const timeParts = parts[3].split(':');
        const hour = timeParts[0] || '00';
        const minute = timeParts[1] || '00';
        const secondAndMillis = timeParts[2] || '00.000';
        const [second, millis] = secondAndMillis.split('.');
        
        return {
            month,
            day: day.padStart(2, '0'),
            year,
            hour: hour.padStart(2, '0'),
            minute: minute.padStart(2, '0'),
            second: (second || '00').padStart(2, '0'),
            millis: (millis || '000').padStart(3, '0')
        };
    }

    /**
     * Convert Date object to time components
     * Returns: {month, day, year, hour, minute, second, millis}
     */
    static dateToComponents(date) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        return {
            month: months[date.getMonth()],
            day: date.getDate().toString().padStart(2, '0'),
            year: date.getFullYear().toString(),
            hour: date.getHours().toString().padStart(2, '0'),
            minute: date.getMinutes().toString().padStart(2, '0'),
            second: date.getSeconds().toString().padStart(2, '0'),
            millis: date.getMilliseconds().toString().padStart(3, '0')
        };
    }

    /**
     * Format time string for display in UI (shortened version)
     * Input: "Feb  9 2025 10:30:45.123"
     * Returns: "Feb  9 10:30:45" (removes year and milliseconds)
     */
    static formatDisplayTime(timeStr) {
        if (!timeStr) return 'Set Time';
        
        const parts = timeStr.split(' ');
        if (parts.length >= 4) {
            const timePart = parts[3].split('.')[0]; // Remove milliseconds
            return `${parts[0]} ${parts[1]} ${timePart}`;
        }
        return timeStr;
    }

    /**
     * Convert time components back to full time string
     * Input: {month, day, year, hour, minute, second, millis}
     * Returns: "Feb  9 2025 10:30:45.123"
     */
    static componentsToTimeString(components) {
        const day = components.day.padStart(2, ' ');
        const hour = components.hour.padStart(2, '0');
        const minute = components.minute.padStart(2, '0');
        const second = components.second.padStart(2, '0');
        const millis = components.millis.padStart(3, '0');
        
        return `${components.month} ${day} ${components.year} ${hour}:${minute}:${second}.${millis}`;
    }

    /**
     * Validate if a time string is in the correct format
     * Returns: boolean
     */
    static isValidTimeString(timeStr) {
        if (!timeStr) return false;
        
        const pattern = /^(\w{3})\s+(\d{1,2})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/;
        return pattern.test(timeStr);
    }

    /**
     * Get current time as formatted string
     * Returns: "Feb  9 2025 10:30:45.123"
     */
    static getCurrentTimeString() {
        return this.formatTime(new Date());
    }
}

// Export for global access
window.TimeParser = TimeParser;