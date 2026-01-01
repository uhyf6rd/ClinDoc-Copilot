// ====================================================================
// --- Terminology Checker Logic ---
let debounceTimers = new Map(); // fieldId -> timer
let maxWaitTimers = new Map();  // fieldId -> timer
let tooltipHideTimer = null; // Timer for delayed tooltip hiding
let lastCheckTime = new Map(); // fieldId -> timestamp of last check
const CHECK_INTERVAL = 3000; // 3 seconds
const terminologyIssuesMap = new Map(); // fieldId -> [{original, suggestion, start, end}]
const ignoredIssuesMap = new Map(); // fieldId -> Set of ignored originals

document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('.paper-input');

    inputs.forEach(el => {
        // Add terminology checking on input
        el.addEventListener('input', () => {
            debouncedCheckTerminology(el.id, el.value);
        });
    });

    console.log('[Terminology] Initialized');
});

function debouncedCheckTerminology(fieldId, text) {
    if (!text || text.trim().length < 2) {
        // Clear timers if text is too short
        if (debounceTimers.has(fieldId)) {
            clearTimeout(debounceTimers.get(fieldId));
            debounceTimers.delete(fieldId);
        }
        if (maxWaitTimers.has(fieldId)) {
            clearTimeout(maxWaitTimers.get(fieldId));
            maxWaitTimers.delete(fieldId);
        }

        terminologyIssuesMap.delete(fieldId);
        renderTerminologyUnderlines(fieldId);
        return;
    }

    // 1. Debounce logic: restart the timer on every input
    if (debounceTimers.has(fieldId)) {
        clearTimeout(debounceTimers.get(fieldId));
    }

    // 2. Max wait (Throttle-like) logic: if no timer is running, start one
    if (!maxWaitTimers.has(fieldId)) {
        const maxTimer = setTimeout(() => {
            console.log(`[Terminology] Max wait reached for ${fieldId}, checking now...`);
            triggerCheck(fieldId);
        }, CHECK_INTERVAL);
        maxWaitTimers.set(fieldId, maxTimer);
    }

    // Set the debounce timer
    const debounceTimer = setTimeout(() => {
        console.log(`[Terminology] Pause detected for ${fieldId}, checking now...`);
        triggerCheck(fieldId);
    }, CHECK_INTERVAL);
    debounceTimers.set(fieldId, debounceTimer);
}

function triggerCheck(fieldId) {
    // Clear both timers once a check is triggered
    if (debounceTimers.has(fieldId)) {
        clearTimeout(debounceTimers.get(fieldId));
        debounceTimers.delete(fieldId);
    }
    if (maxWaitTimers.has(fieldId)) {
        clearTimeout(maxWaitTimers.get(fieldId));
        maxWaitTimers.delete(fieldId);
    }

    const el = document.getElementById(fieldId);
    if (el && el.value && el.value.trim().length >= 2) {
        performTerminologyCheck(fieldId, el.value);
    }
}

async function performTerminologyCheck(fieldId, text) {
    // GATE
    if (typeof appSettings !== 'undefined' && !appSettings.terminology) {
        return;
    }
    lastCheckTime.set(fieldId, Date.now());
    console.log(`[Terminology] Performing check for ${fieldId}, text: "${text.substring(0, 30)}..."`);

    try {
        console.log(`[Terminology] API call to ${API_BASE_AUDIO}/terminology/check`);
        const res = await fetch(`${API_BASE_AUDIO}/terminology/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });

        console.log(`[Terminology] Response status: ${res.status}`);

        if (res.ok) {
            const data = await res.json();

            // CRITICAL: Check if the text has changed since we started the request
            // If the user typed more or applied a suggestion, discard this result
            const currentEl = document.getElementById(fieldId);
            if (currentEl && currentEl.value !== text) {
                console.log(`[Terminology] Text changed during API call, discarding results for ${fieldId}`);
                return;
            }

            let issues = data.issues || [];
            console.log(`[Terminology] Received ${issues.length} issues:`, issues);

            // Filter out ignored issues
            const ignoredSet = ignoredIssuesMap.get(fieldId) || new Set();
            issues = issues.filter(issue => !ignoredSet.has(issue.original));
            console.log(`[Terminology] After filtering: ${issues.length} issues`);

            terminologyIssuesMap.set(fieldId, issues);
            console.log(`[Terminology] Calling renderTerminologyUnderlines for ${fieldId}`);
            renderTerminologyUnderlines(fieldId);
        } else {
            console.error(`[Terminology] API error: ${res.status}`);
        }
    } catch (e) {
        console.error('[Terminology] Check error:', e);
    }
}


function renderTerminologyUnderlines(fieldId) {
    const el = document.getElementById(fieldId);
    const issues = terminologyIssuesMap.get(fieldId) || [];

    const wrapper = el.parentElement;
    if (!wrapper || !wrapper.classList.contains('ghost-wrapper')) {
        console.warn(`[Terminology] No ghost-wrapper found for ${fieldId}!`);
        return;
    }

    // Create or get underline layer (for visual display, z-index: 1)
    let underlineLayer = document.getElementById(`term_${fieldId}`);
    if (!underlineLayer) {
        underlineLayer = document.createElement('div');
        underlineLayer.id = `term_${fieldId}`;
        underlineLayer.className = 'terminology-underline-layer';
        wrapper.appendChild(underlineLayer);
    }

    // Create or get interaction layer (for mouse events, z-index: 3)
    let interactionLayer = document.getElementById(`term_interact_${fieldId}`);
    if (!interactionLayer) {
        interactionLayer = document.createElement('div');
        interactionLayer.id = `term_interact_${fieldId}`;
        interactionLayer.className = 'terminology-interaction-layer';
        wrapper.appendChild(interactionLayer);
    }

    // Clear existing content
    underlineLayer.innerHTML = '';
    interactionLayer.innerHTML = '';

    if (issues.length === 0) {
        return;
    }

    console.log(`[Terminology] Rendering ${issues.length} underlines...`);

    // Build HTML for both layers
    const text = el.value;
    let underlineHtml = '';
    let interactionHtml = '';
    let lastIndex = 0;

    issues.forEach(issue => {
        const { start, end } = issue;

        // Add normal text before issue
        if (start > lastIndex) {
            const normalText = escapeHtml(text.substring(lastIndex, start));
            underlineHtml += normalText;
            interactionHtml += normalText;
        }

        // Add underlined text (visual layer)
        underlineHtml += `<span class="term-underline">${escapeHtml(text.substring(start, end))}</span>`;

        // Add interactive text (interaction layer)
        interactionHtml += `<span class="term-interactive" data-start="${start}" data-end="${end}">${escapeHtml(text.substring(start, end))}</span>`;

        lastIndex = end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
        const remainingText = escapeHtml(text.substring(lastIndex));
        underlineHtml += remainingText;
        interactionHtml += remainingText;
    }

    underlineLayer.innerHTML = underlineHtml;
    interactionLayer.innerHTML = interactionHtml;

    // Sync scroll and height for both layers
    underlineLayer.scrollTop = el.scrollTop;
    underlineLayer.style.height = el.style.height;
    interactionLayer.scrollTop = el.scrollTop;
    interactionLayer.style.height = el.style.height;

    // Add hover event listeners to interactive spans
    const interactiveSpans = interactionLayer.querySelectorAll('.term-interactive');
    console.log(`[Terminology] Attaching events to ${interactiveSpans.length} interactive spans`);

    interactiveSpans.forEach(span => {
        span.addEventListener('mouseenter', (e) => {
            // console.log('[Terminology] Mouse entered underlined term');
            // Cancel any pending hide timer
            if (tooltipHideTimer) {
                clearTimeout(tooltipHideTimer);
                tooltipHideTimer = null;
            }

            const start = parseInt(span.getAttribute('data-start'));
            const end = parseInt(span.getAttribute('data-end'));
            const issue = issues.find(i => i.start === start && i.end === end);

            if (issue) {
                // Highlight both the visual underline and the interaction span
                highlightTermAtPosition(underlineLayer, interactionLayer, start);
                showTerminologyTooltip(el, issue, e);
            }
        });

        span.addEventListener('mouseleave', () => {
            // console.log('[Terminology] Mouse left underlined term');
            // Delay hiding and removing highlights to allow mouse to move to tooltip
            tooltipHideTimer = setTimeout(() => {
                removeAllHighlights(underlineLayer, interactionLayer);
                hideTerminologyTooltip();
            }, 200); // 200ms delay
        });
    });
}

function highlightTermAtPosition(underlineLayer, interactionLayer, start) {
    // Find and highlight spans at the given position
    underlineLayer.querySelectorAll('.term-underline').forEach(span => {
        span.classList.remove('term-highlighted');
    });
    interactionLayer.querySelectorAll('.term-interactive').forEach(span => {
        const spanStart = parseInt(span.getAttribute('data-start'));
        if (spanStart === start) {
            span.classList.add('term-highlighted');
            // Also highlight the corresponding visual span
            const visualSpans = underlineLayer.querySelectorAll('.term-underline');
            const index = Array.from(interactionLayer.querySelectorAll('.term-interactive')).indexOf(span);
            if (visualSpans[index]) {
                visualSpans[index].classList.add('term-highlighted');
            }
        }
    });
}

function removeAllHighlights(underlineLayer, interactionLayer) {
    if (underlineLayer && interactionLayer) {
        underlineLayer.querySelectorAll('.term-underline').forEach(span => {
            span.classList.remove('term-highlighted');
        });
        interactionLayer.querySelectorAll('.term-interactive').forEach(span => {
            span.classList.remove('term-highlighted');
        });
    } else {
        // Global clear
        document.querySelectorAll('.term-highlighted').forEach(span => {
            span.classList.remove('term-highlighted');
        });
    }
}

function showTerminologyTooltip(el, issue, e) {
    hideTerminologyTooltip(); // Remove any existing tooltip

    const tooltip = document.createElement('div');
    tooltip.id = 'terminology-tooltip';
    tooltip.className = 'terminology-tooltip';
    tooltip.innerHTML = `
        <div class="term-tooltip-suggestion" data-field="${el.id}" data-issue='${JSON.stringify(issue)}'>
            ${escapeHtml(issue.suggestion)}
        </div>
        <div class="term-tooltip-ignore" data-field="${el.id}" data-original="${escapeHtml(issue.original)}">
            <i class="fa-solid fa-xmark"></i>  忽略
        </div>
    `;

    document.body.appendChild(tooltip);

    // Find the highlighted span in the interaction layer to get its position
    const interactionLayer = document.getElementById(`term_interact_${el.id}`);
    const highlightedSpan = interactionLayer?.querySelector('.term-highlighted');

    if (highlightedSpan) {
        // Get the position of the highlighted span
        const spanRect = highlightedSpan.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        // Left-align tooltip with the span (not centered)
        const left = spanRect.left;
        // Position directly below the span (no gap)
        const top = spanRect.bottom;
        tooltip.style.left = Math.max(10, left) + 'px';
        tooltip.style.top = top + 'px';
    } else {
        // Fallback to mouse position if span not found
        const tooltipRect = tooltip.getBoundingClientRect();
        const left = e.clientX - (tooltipRect.width / 2);
        const top = e.clientY + 20;

        tooltip.style.left = Math.max(10, left) + 'px';
        tooltip.style.top = top + 'px';
    }

    // Add click handlers
    tooltip.querySelector('.term-tooltip-suggestion').addEventListener('click', handleApplySuggestion);
    tooltip.querySelector('.term-tooltip-ignore').addEventListener('click', handleIgnoreSuggestion);

    // Add mouse events to keep tooltip visible when hovering over it
    tooltip.addEventListener('mouseenter', () => {
        // Cancel hide timer when mouse enters tooltip
        if (tooltipHideTimer) {
            clearTimeout(tooltipHideTimer);
            tooltipHideTimer = null;
        }
    });

    tooltip.addEventListener('mouseleave', () => {
        // Hide tooltip and clear highlights when mouse leaves it
        hideTerminologyTooltip();
        removeAllHighlights(); // Global clear
    });
}

function hideTerminologyTooltip() {
    const tooltip = document.getElementById('terminology-tooltip');
    if (tooltip) {
        tooltip.remove();
    }
}


function handleApplySuggestion(e) {
    const fieldId = e.target.getAttribute('data-field');
    const issue = JSON.parse(e.target.getAttribute('data-issue'));

    const el = document.getElementById(fieldId);
    if (!el) return;

    // Clear all pending timers to prevent old results from popping up
    if (debounceTimers.has(fieldId)) {
        clearTimeout(debounceTimers.get(fieldId));
        debounceTimers.delete(fieldId);
    }
    if (maxWaitTimers.has(fieldId)) {
        clearTimeout(maxWaitTimers.get(fieldId));
        maxWaitTimers.delete(fieldId);
    }

    // Replace text
    const text = el.value;
    const newText = text.substring(0, issue.start) + issue.suggestion + text.substring(issue.end);
    el.value = newText;

    // User Request: Mark this original term as handled/ignored so it doesn't pop up again
    if (!ignoredIssuesMap.has(fieldId)) {
        ignoredIssuesMap.set(fieldId, new Set());
    }
    ignoredIssuesMap.get(fieldId).add(issue.original);

    // Immediately remove this issue from the map and ADJUST others if needed
    const issues = terminologyIssuesMap.get(fieldId) || [];
    const lengthDelta = issue.suggestion.length - (issue.end - issue.start);

    const updatedIssues = issues
        .filter(i => i.start !== issue.start || i.end !== issue.end)
        .map(i => {
            // If this issue starts after the modified range, shift its positions
            if (i.start >= issue.end) {
                return {
                    ...i,
                    start: i.start + lengthDelta,
                    end: i.end + lengthDelta
                };
            }
            return i;
        });

    terminologyIssuesMap.set(fieldId, updatedIssues);

    // Immediately clear underlines for this field
    renderTerminologyUnderlines(fieldId);

    hideTerminologyTooltip();

    // Trigger input event to schedule next check (but underlines are already cleared)
    el.dispatchEvent(new Event('input'));
}

function handleIgnoreSuggestion(e) {
    const fieldId = e.target.getAttribute('data-field');
    const original = e.target.getAttribute('data-original');

    // Clear all pending timers to prevent old results from popping up
    if (debounceTimers.has(fieldId)) {
        clearTimeout(debounceTimers.get(fieldId));
        debounceTimers.delete(fieldId);
    }
    if (maxWaitTimers.has(fieldId)) {
        clearTimeout(maxWaitTimers.get(fieldId));
        maxWaitTimers.delete(fieldId);
    }

    // Add to ignored set
    if (!ignoredIssuesMap.has(fieldId)) {
        ignoredIssuesMap.set(fieldId, new Set());
    }
    ignoredIssuesMap.get(fieldId).add(original);

    // Immediately remove from the current session's issues map
    if (terminologyIssuesMap.has(fieldId)) {
        const issues = terminologyIssuesMap.get(fieldId);
        const filteredIssues = issues.filter(i => i.original !== original);
        terminologyIssuesMap.set(fieldId, filteredIssues);
    }

    // Immediately re-render underlines
    renderTerminologyUnderlines(fieldId);

    hideTerminologyTooltip();
}

function getCursorPositionFromMouse(el, e) {
    // Simple approximation for textarea position
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top + el.scrollTop;

    const charWidth = 14; // Approximate
    const lineHeight = 24; // Approximate

    const line = Math.floor(y / lineHeight);
    const col = Math.floor(x / charWidth);

    const lines = el.value.split('\n');
    let pos = 0;
    for (let i = 0; i < line && i < lines.length; i++) {
        pos += lines[i].length + 1;
    }
    pos += Math.min(col, lines[line]?.length || 0);

    return Math.min(pos, el.value.length);
}
