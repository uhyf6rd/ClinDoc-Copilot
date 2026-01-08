let debounceTimers = new Map();
let maxWaitTimers = new Map();  
let tooltipHideTimer = null; 
let lastCheckTime = new Map(); 
const CHECK_INTERVAL = 3000; 
const terminologyIssuesMap = new Map();
const ignoredIssuesMap = new Map(); 

document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('.paper-input');

    inputs.forEach(el => {

        el.addEventListener('input', () => {
            debouncedCheckTerminology(el.id, el.value);
        });
    });

    console.log('[Terminology] Initialized');
});

function debouncedCheckTerminology(fieldId, text) {
    if (!text || text.trim().length < 2) {

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

    if (debounceTimers.has(fieldId)) {
        clearTimeout(debounceTimers.get(fieldId));
    }

    if (!maxWaitTimers.has(fieldId)) {
        const maxTimer = setTimeout(() => {
            console.log(`[Terminology] Max wait reached for ${fieldId}, checking now...`);
            triggerCheck(fieldId);
        }, CHECK_INTERVAL);
        maxWaitTimers.set(fieldId, maxTimer);
    }

    const debounceTimer = setTimeout(() => {
        console.log(`[Terminology] Pause detected for ${fieldId}, checking now...`);
        triggerCheck(fieldId);
    }, CHECK_INTERVAL);
    debounceTimers.set(fieldId, debounceTimer);
}

function triggerCheck(fieldId) {

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


            const currentEl = document.getElementById(fieldId);
            if (currentEl && currentEl.value !== text) {
                console.log(`[Terminology] Text changed during API call, discarding results for ${fieldId}`);
                return;
            }

            let issues = data.issues || [];
            console.log(`[Terminology] Received ${issues.length} issues:`, issues);

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

    let underlineLayer = document.getElementById(`term_${fieldId}`);
    if (!underlineLayer) {
        underlineLayer = document.createElement('div');
        underlineLayer.id = `term_${fieldId}`;
        underlineLayer.className = 'terminology-underline-layer';
        wrapper.appendChild(underlineLayer);
    }

    let interactionLayer = document.getElementById(`term_interact_${fieldId}`);
    if (!interactionLayer) {
        interactionLayer = document.createElement('div');
        interactionLayer.id = `term_interact_${fieldId}`;
        interactionLayer.className = 'terminology-interaction-layer';
        wrapper.appendChild(interactionLayer);
    }

    underlineLayer.innerHTML = '';
    interactionLayer.innerHTML = '';

    if (issues.length === 0) {
        return;
    }

    console.log(`[Terminology] Rendering ${issues.length} underlines...`);

    const text = el.value;
    let underlineHtml = '';
    let interactionHtml = '';
    let lastIndex = 0;

    issues.forEach(issue => {
        const { start, end } = issue;

        if (start > lastIndex) {
            const normalText = escapeHtml(text.substring(lastIndex, start));
            underlineHtml += normalText;
            interactionHtml += normalText;
        }


        underlineHtml += `<span class="term-underline">${escapeHtml(text.substring(start, end))}</span>`;


        interactionHtml += `<span class="term-interactive" data-start="${start}" data-end="${end}">${escapeHtml(text.substring(start, end))}</span>`;

        lastIndex = end;
    });

    if (lastIndex < text.length) {
        const remainingText = escapeHtml(text.substring(lastIndex));
        underlineHtml += remainingText;
        interactionHtml += remainingText;
    }

    underlineLayer.innerHTML = underlineHtml;
    interactionLayer.innerHTML = interactionHtml;

    underlineLayer.scrollTop = el.scrollTop;
    underlineLayer.style.height = el.style.height;
    interactionLayer.scrollTop = el.scrollTop;
    interactionLayer.style.height = el.style.height;

    const interactiveSpans = interactionLayer.querySelectorAll('.term-interactive');
    console.log(`[Terminology] Attaching events to ${interactiveSpans.length} interactive spans`);

    interactiveSpans.forEach(span => {
        span.addEventListener('mouseenter', (e) => {

            if (tooltipHideTimer) {
                clearTimeout(tooltipHideTimer);
                tooltipHideTimer = null;
            }

            const start = parseInt(span.getAttribute('data-start'));
            const end = parseInt(span.getAttribute('data-end'));
            const issue = issues.find(i => i.start === start && i.end === end);

            if (issue) {

                highlightTermAtPosition(underlineLayer, interactionLayer, start);
                showTerminologyTooltip(el, issue, e);
            }
        });

        span.addEventListener('mouseleave', () => {

            tooltipHideTimer = setTimeout(() => {
                removeAllHighlights(underlineLayer, interactionLayer);
                hideTerminologyTooltip();
            }, 200); 
        });
    });
}

function highlightTermAtPosition(underlineLayer, interactionLayer, start) {

    underlineLayer.querySelectorAll('.term-underline').forEach(span => {
        span.classList.remove('term-highlighted');
    });
    interactionLayer.querySelectorAll('.term-interactive').forEach(span => {
        const spanStart = parseInt(span.getAttribute('data-start'));
        if (spanStart === start) {
            span.classList.add('term-highlighted');

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

        document.querySelectorAll('.term-highlighted').forEach(span => {
            span.classList.remove('term-highlighted');
        });
    }
}

function showTerminologyTooltip(el, issue, e) {
    hideTerminologyTooltip(); 

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

    const interactionLayer = document.getElementById(`term_interact_${el.id}`);
    const highlightedSpan = interactionLayer?.querySelector('.term-highlighted');

    if (highlightedSpan) {

        const spanRect = highlightedSpan.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();


        const left = spanRect.left;

        const top = spanRect.bottom;
        tooltip.style.left = Math.max(10, left) + 'px';
        tooltip.style.top = top + 'px';
    } else {

        const tooltipRect = tooltip.getBoundingClientRect();
        const left = e.clientX - (tooltipRect.width / 2);
        const top = e.clientY + 20;

        tooltip.style.left = Math.max(10, left) + 'px';
        tooltip.style.top = top + 'px';
    }

    tooltip.querySelector('.term-tooltip-suggestion').addEventListener('click', handleApplySuggestion);
    tooltip.querySelector('.term-tooltip-ignore').addEventListener('click', handleIgnoreSuggestion);

    tooltip.addEventListener('mouseenter', () => {

        if (tooltipHideTimer) {
            clearTimeout(tooltipHideTimer);
            tooltipHideTimer = null;
        }
    });

    tooltip.addEventListener('mouseleave', () => {

        hideTerminologyTooltip();
        removeAllHighlights();
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

    if (debounceTimers.has(fieldId)) {
        clearTimeout(debounceTimers.get(fieldId));
        debounceTimers.delete(fieldId);
    }
    if (maxWaitTimers.has(fieldId)) {
        clearTimeout(maxWaitTimers.get(fieldId));
        maxWaitTimers.delete(fieldId);
    }

    const text = el.value;
    const newText = text.substring(0, issue.start) + issue.suggestion + text.substring(issue.end);
    el.value = newText;

    if (!ignoredIssuesMap.has(fieldId)) {
        ignoredIssuesMap.set(fieldId, new Set());
    }
    ignoredIssuesMap.get(fieldId).add(issue.original);

    const issues = terminologyIssuesMap.get(fieldId) || [];
    const lengthDelta = issue.suggestion.length - (issue.end - issue.start);

    const updatedIssues = issues
        .filter(i => i.start !== issue.start || i.end !== issue.end)
        .map(i => {

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

    renderTerminologyUnderlines(fieldId);

    hideTerminologyTooltip();

    el.dispatchEvent(new Event('input'));
}

function handleIgnoreSuggestion(e) {
    const fieldId = e.target.getAttribute('data-field');
    const original = e.target.getAttribute('data-original');

    if (debounceTimers.has(fieldId)) {
        clearTimeout(debounceTimers.get(fieldId));
        debounceTimers.delete(fieldId);
    }
    if (maxWaitTimers.has(fieldId)) {
        clearTimeout(maxWaitTimers.get(fieldId));
        maxWaitTimers.delete(fieldId);
    }

    if (!ignoredIssuesMap.has(fieldId)) {
        ignoredIssuesMap.set(fieldId, new Set());
    }
    ignoredIssuesMap.get(fieldId).add(original);

    if (terminologyIssuesMap.has(fieldId)) {
        const issues = terminologyIssuesMap.get(fieldId);
        const filteredIssues = issues.filter(i => i.original !== original);
        terminologyIssuesMap.set(fieldId, filteredIssues);
    }

    renderTerminologyUnderlines(fieldId);

    hideTerminologyTooltip();
}

function getCursorPositionFromMouse(el, e) {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top + el.scrollTop;

    const charWidth = 14;
    const lineHeight = 24; 

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
