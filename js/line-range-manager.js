/**
 * LineRangeManager - "Displaying X-Y of Z lines" controls per panel
 * Lets the user jump to an arbitrary line range or load the entire file.
 */

class LineRangeManager {
    constructor() {
        this.state = {
            left: { fileId: null, totalLines: 0, start: 1, end: 0 },
            right: { fileId: null, totalLines: 0, start: 1, end: 0 }
        };

        this.bindEvents();
        console.log('[LineRangeManager] Initialized');
    }

    bindEvents() {
        ['left', 'right'].forEach(panel => {
            const goBtn = document.getElementById(`lineRangeGoBtn_${panel}`);
            const allBtn = document.getElementById(`lineRangeAllBtn_${panel}`);

            if (goBtn) {
                goBtn.addEventListener('click', () => this.goToRange(panel));
            }
            if (allBtn) {
                allBtn.addEventListener('click', () => this.loadAll(panel));
            }
        });
    }

    /**
     * Called after a file is loaded (or a range is fetched) to record the
     * panel's current file/range and refresh the display.
     */
    setFileInfo(panel, fileId, totalLines, range) {
        const s = this.state[panel];
        s.fileId = fileId;
        s.totalLines = totalLines;
        s.start = range.start;
        s.end = range.end;
        this.updateDisplay(panel);

        // Gutter line numbers should reflect position in the full file,
        // not position within the currently-loaded range.
        if (CLogApp.modules.uiManager?.setLineNumberOffset) {
            CLogApp.modules.uiManager.setLineNumberOffset(panel, s.start - 1);
        }
    }

    updateDisplay(panel) {
        const s = this.state[panel];
        const info = document.getElementById(`lineRangeInfo_${panel}`);
        if (info) {
            info.textContent = s.fileId
                ? `Displaying ${s.start}-${s.end} of ${s.totalLines} lines`
                : 'No file loaded';
        }

        const fromInput = document.getElementById(`lineRangeFrom_${panel}`);
        const toInput = document.getElementById(`lineRangeTo_${panel}`);
        if (fromInput) fromInput.value = s.start || '';
        if (toInput) toInput.value = s.end || '';
    }

    async goToRange(panel) {
        const s = this.state[panel];
        if (!s.fileId) return;

        const fromInput = document.getElementById(`lineRangeFrom_${panel}`);
        const toInput = document.getElementById(`lineRangeTo_${panel}`);

        let start = parseInt(fromInput?.value, 10);
        let end = parseInt(toInput?.value, 10);
        if (isNaN(start)) start = 1;
        if (isNaN(end)) end = s.totalLines;

        start = Math.max(1, Math.min(start, s.totalLines));
        end = Math.max(start, Math.min(end, s.totalLines));

        await this.loadRange(panel, start, end, end - start + 1);
    }

    async loadAll(panel) {
        const s = this.state[panel];
        if (!s.fileId) return;

        await this.loadRange(panel, 1, s.totalLines, s.totalLines);
    }

    async loadRange(panel, start, end, maxLines) {
        const s = this.state[panel];

        try {
            const response = await window.ApiClient.getContent(panel, s.fileId, start, end, maxLines);
            if (!response.success || !response.content) {
                console.error(`[LineRangeManager] Failed to load range for ${panel}:`, response.error);
                return;
            }

            const lines = response.content.lines;
            const firstLine = lines[0] || '';
            const content = (firstLine.endsWith('\n') || firstLine.endsWith('\r\n'))
                ? lines.join('')
                : lines.join('\n');

            const cache = CLogApp.modules.uiManager.logLineCache.get(`${panel}LogContent`);
            CLogApp.modules.uiManager.setLogContent(panel, content, cache?.filename, s.fileId);

            this.setFileInfo(panel, s.fileId, response.content.totalLines, response.content.range);
        } catch (error) {
            console.error(`[LineRangeManager] Error loading range for ${panel}:`, error);
        }
    }
}

window.LineRangeManager = LineRangeManager;
