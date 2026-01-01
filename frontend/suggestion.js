// --- AI Suggestion Badge & Logic ---

function renderSuggestionsForField(fid, suggestions) {
    const badge = document.getElementById(`sug_${fid}`);
    const tooltip = document.getElementById(`tip_${fid}`);

    if (!badge || !tooltip) return;

    if (!suggestions || suggestions.length === 0) {
        badge.classList.add('hidden');
        return;
    }

    // Show badge
    badge.classList.remove('hidden');

    // Local mutable copy of suggestions, filtered by validity
    let suggestionList = suggestions.filter(sug => {
        if (!sug) return false;
        const clean = sug.trim().replace(/^['"]+|['"]+$/g, '');
        // Rejection patterns: "Null", "No info", "Cannot provide", "Based on summary" etc.
        const rejectPattern = /空字符串|没有相关信息|无相关信息|无法提取|无法提供|暂无相关|抱歉.*无法|根据对话总结|暂无总结/i;
        return clean.length > 0 && !rejectPattern.test(clean);
    });

    const render = () => {
        tooltip.innerHTML = "";
        if (suggestionList.length === 0) {
            badge.classList.add('hidden');
            return;
        }

        const area = document.getElementById(fid);

        suggestionList.forEach((sug, idx) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';

            // Clean suggestion text (remove existing numbering)
            const cleanSug = sug.replace(/^\d+[.、\s]*/, '').trim();
            item.innerText = cleanSug;

            item.onclick = (e) => {
                e.stopPropagation(); // Prevent bubbling

                const area = document.getElementById(fid);
                const originalSelectionStart = area.selectionStart;
                let currentVal = area.value;

                // 1. Determine Insertion Index (Line after cursor)
                let beforeLines = [];
                let afterLines = [];

                if (currentVal.trim() === "") {
                    beforeLines = [];
                    afterLines = [];
                } else {
                    let charCount = 0;
                    const lines = currentVal.split('\n');
                    let cursorLineIdx = lines.length - 1; // Default to last line

                    for (let i = 0; i < lines.length; i++) {
                        // Approximate line end position (length + 1 for newline)
                        charCount += lines[i].length + 1;
                        if (charCount > originalSelectionStart) {
                            cursorLineIdx = i;
                            break;
                        }
                    }

                    beforeLines = lines.slice(0, cursorLineIdx + 1);
                    afterLines = lines.slice(cursorLineIdx + 1);
                }

                // 2. Insert the NEW item
                const allLines = [...beforeLines, cleanSug, ...afterLines];

                // 3. Renumber logic
                let counter = 1;
                const renumberedLines = allLines.map(line => {
                    const trimmed = line.trim();
                    if (!trimmed) return "";

                    // Check if line looks like it belongs to the list (starts with number OR is our new cleanSug)
                    // We assume in Diagnosis/Orders field, everything is a numbered item.

                    // Strip existing number if present
                    const content = trimmed.replace(/^\d+[.、\s]*/, '').trim();
                    if (content.length > 0) {
                        return `${counter++}. ${content}`;
                    }
                    return line;
                });

                area.value = renumberedLines.join('\n');
                area.dispatchEvent(new Event('input'));

                // Update local list (remove used suggestion)
                suggestionList.splice(idx, 1);
                render();

                // 4. Restore focus and set cursor position
                // Calculate cursor position: end of the newly inserted line
                const insertedLineIdx = beforeLines.length;
                let newCursorPos = 0;
                for (let i = 0; i <= insertedLineIdx; i++) {
                    if (i < renumberedLines.length) {
                        newCursorPos += renumberedLines[i].length + 1;
                    }
                }
                // Correction for last line if no trailing newline
                if (newCursorPos > area.value.length) newCursorPos = area.value.length;

                area.focus();
                // Set cursor to just before the newline of the inserted line (or end of text)
                // -1 because we added +1 for newline in calculation
                const finalPos = Math.max(0, newCursorPos - 1);
                area.setSelectionRange(finalPos, finalPos);
            };

            tooltip.appendChild(item);
        });
    };

    render();
}

// Helper: Get next number (kept for reference, though logic is now full re-numbering)
function getNextNumber(text) {
    let nextNum = 1;
    if (!text) return 1;

    const lines = text.split('\n');
    lines.forEach(line => {
        const match = line.match(/^(\d+)[.、]/);
        if (match) {
            const num = parseInt(match[1]);
            if (num >= nextNum) nextNum = num + 1;
        }
    });
    return nextNum;
}
