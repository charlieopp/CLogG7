/**
 * ApiClient - Backend Communication Module
 * Handles all server-side operations for filtering and sequence detection
 */

class ApiClient {
    constructor() {
        this.baseUrl = this.getBaseUrl();
        this.timeout = 30000; // 30 seconds
        this.retryCount = 3;
        
        console.log(`[ApiClient] Initialized with base URL: ${this.baseUrl}`);
    }

    /**
     * Determine base URL based on environment
     */
    getBaseUrl() {
        // In development, assume local server
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:8080/api';
        }
        
        // In production, use relative URLs
        return '/api';
    }

    /**
     * Generic HTTP request handler with retry logic
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        let lastError;
        
        for (let attempt = 1; attempt <= this.retryCount; attempt++) {
            try {
                console.log(`[ApiClient] Request ${attempt}/${this.retryCount}: ${config.method || 'GET'} ${url}`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);
                
                const response = await fetch(url, {
                    ...config,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log(`[ApiClient] Request successful:`, data);
                return data;
                
            } catch (error) {
                lastError = error;
                console.warn(`[ApiClient] Request attempt ${attempt} failed:`, error.message);
                
                if (attempt < this.retryCount && this.isRetryableError(error)) {
                    await this.delay(1000 * attempt); // Exponential backoff
                    continue;
                }
                break;
            }
        }
        
        console.error(`[ApiClient] Request failed after ${this.retryCount} attempts:`, lastError);
        throw lastError;
    }

    /**
     * Check if error is retryable
     */
    isRetryableError(error) {
        return error.name === 'AbortError' || 
               error.message.includes('Network') ||
               error.message.includes('timeout') ||
               error.message.includes('502') ||
               error.message.includes('503') ||
               error.message.includes('504');
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Apply filters to log content
     */
    async applyFilters(panel, logContent, filters) {
        try {
            // For now, simulate filtering client-side until backend is ready
            console.log(`[ApiClient] Applying filters to ${panel} panel:`, filters);
            
            if (!filters || filters.length === 0) {
                return logContent; // No filters, return original content
            }
            
            // TODO: Replace with actual API call when backend is ready
            // return await this.request('/filters/apply', {
            //     method: 'POST',
            //     body: JSON.stringify({
            //         content: logContent,
            //         filters: filters
            //     })
            // });
            
            // Client-side filtering simulation
            return this.simulateFiltering(logContent, filters);
            
        } catch (error) {
            console.error(`[ApiClient] Filter application failed:`, error);
            CLogApp.utils.emit('error', {
                message: 'Failed to apply filters',
                error: error
            });
            return logContent; // Return original content on error
        }
    }

    /**
     * Find sequences in log content based on patterns
     */
    async findSequences(logContent, startPattern, endPattern, options = {}) {
        try {
            console.log(`[ApiClient] Finding sequences with patterns:`, {
                startPattern,
                endPattern,
                options
            });
            
            // TODO: Replace with actual API call when backend is ready
            // return await this.request('/sequences/find', {
            //     method: 'POST',
            //     body: JSON.stringify({
            //         content: logContent,
            //         startPattern: startPattern,
            //         endPattern: endPattern,
            //         maxDuration: options.maxDuration || 300,
            //         timeWindow: options.timeWindow
            //     })
            // });
            
            // Client-side simulation for now
            return this.simulateSequenceDetection(logContent, startPattern, endPattern, options);
            
        } catch (error) {
            console.error(`[ApiClient] Sequence detection failed:`, error);
            CLogApp.utils.emit('error', {
                message: 'Failed to find sequences',
                error: error
            });
            return [];
        }
    }

    /**
     * Validate log file format and content
     */
    async validateLogFile(file) {
        try {
            console.log(`[ApiClient] Validating log file: ${file.name}`);
            
            // Basic client-side validation
            const validation = {
                isValid: true,
                errors: [],
                warnings: [],
                metadata: {
                    filename: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: new Date(file.lastModified)
                }
            };
            
            // Check file size (warn if > 50MB)
            if (file.size > 50 * 1024 * 1024) {
                validation.warnings.push('Large file size may impact performance');
            }
            
            // Check file extension
            const validExtensions = ['.log', '.txt', '.out'];
            const hasValidExtension = validExtensions.some(ext => 
                file.name.toLowerCase().endsWith(ext)
            );
            
            if (!hasValidExtension) {
                validation.warnings.push('File extension is not a common log format');
            }
            
            // TODO: Add server-side validation when backend is ready
            // const serverValidation = await this.request('/logs/validate', {
            //     method: 'POST',
            //     body: formData // FormData with file
            // });
            
            return validation;
            
        } catch (error) {
            console.error(`[ApiClient] Log file validation failed:`, error);
            return {
                isValid: false,
                errors: ['Validation failed: ' + error.message],
                warnings: [],
                metadata: null
            };
        }
    }

    /**
     * Get server health status
     */
    async getServerHealth() {
        try {
            return await this.request('/health');
        } catch (error) {
            console.warn(`[ApiClient] Server health check failed:`, error.message);
            return {
                status: 'offline',
                message: 'Server unavailable',
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Client-side filter simulation (temporary)
     */
    simulateFiltering(content, filters) {
        console.log(`[ApiClient] Simulating filtering with ${filters.length} filters`);
        
        const lines = content.split('\n');
        let filteredLines = [...lines];
        
        filters.forEach(filter => {
            if (!filter.enabled) return;
            
            if (filter.isTimeMode) {
                // Time-based filtering simulation
                filteredLines = this.applyTimeFilter(filteredLines, filter);
            } else {
                // Text-based filtering simulation
                filteredLines = this.applyTextFilter(filteredLines, filter);
            }
        });
        
        return filteredLines.join('\n');
    }

    /**
     * Apply text filter simulation
     */
    applyTextFilter(lines, filter) {
        const searchText = filter.text.toLowerCase();
        
        return lines.filter(line => {
            const matches = line.toLowerCase().includes(searchText);
            return filter.isInclude ? matches : !matches;
        });
    }

    /**
     * Apply time filter simulation
     */
    applyTimeFilter(lines, filter) {
        // Basic time filtering - could be enhanced
        const timeRegex = /(\d{2}:\d{2}:\d{2})/;
        const targetTime = filter.text;
        
        return lines.filter(line => {
            const timeMatch = line.match(timeRegex);
            if (!timeMatch) return true; // Keep lines without timestamps
            
            const lineTime = timeMatch[1];
            const comparison = lineTime.localeCompare(targetTime);
            
            if (filter.isInclude) {
                return comparison >= 0; // After or equal to target time
            } else {
                return comparison <= 0; // Before or equal to target time
            }
        });
    }

    /**
     * Sequence detection simulation (temporary)
     */
    simulateSequenceDetection(content, startPattern, endPattern, options) {
        console.log(`[ApiClient] Simulating sequence detection`);
        
        const sequences = [];
        const lines = content.split('\n');
        const maxDuration = options.maxDuration || 300; // seconds
        
        // Simple pattern matching simulation
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (this.matchesPattern(line, startPattern)) {
                // Found potential start, look for end
                for (let j = i + 1; j < lines.length; j++) {
                    const endLine = lines[j];
                    
                    if (this.matchesPattern(endLine, endPattern)) {
                        // Found sequence
                        const startTime = this.extractTimestamp(line);
                        const endTime = this.extractTimestamp(endLine);
                        const duration = this.calculateDuration(startTime, endTime);
                        
                        if (duration <= maxDuration) {
                            sequences.push({
                                id: `seq_${sequences.length + 1}`,
                                startLine: i + 1,
                                endLine: j + 1,
                                startTimestamp: startTime,
                                endTimestamp: endTime,
                                duration: duration,
                                events: lines.slice(i, j + 1)
                            });
                        }
                        break;
                    }
                }
            }
        }
        
        return {
            sequences: sequences,
            totalFound: sequences.length,
            searchTime: 0.12 // simulated
        };
    }

    /**
     * Check if line matches pattern (simplified)
     */
    matchesPattern(line, pattern) {
        if (!pattern || pattern.length === 0) return false;
        
        // Convert pattern to simple string matching for now
        const searchText = pattern.filter(char => char !== '*').join('');
        return line.includes(searchText);
    }

    /**
     * Extract timestamp from log line
     */
    extractTimestamp(line) {
        const timestampRegex = /(\w{3} \d{1,2} \d{2}:\d{2}:\d{2}\.\d{3})/;
        const match = line.match(timestampRegex);
        return match ? match[1] : null;
    }

    /**
     * Calculate duration between timestamps
     */
    calculateDuration(startTime, endTime) {
        if (!startTime || !endTime) return 0;
        
        // Simplified duration calculation
        // In real implementation, would parse timestamps properly
        return Math.random() * 5; // Simulate 0-5 second duration
    }
}

// Export for use in other modules
window.ApiClient = ApiClient;