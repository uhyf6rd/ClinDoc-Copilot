

let ghostDebounceTimer = null;
const ghostMap = new Map();
const touchedFields = new Set();
const draftQueue = new BoundedRequestQueue(1);


function BoundedRequestQueue(concurrency) {
    this.concurrency = concurrency;
    this.active = 0;
    this.queue = [];
}

BoundedRequestQueue.prototype.add = function (task) {
    return new Promise((resolve, reject) => {
        this.queue.push({ task, resolve, reject });
        this.process();
    });
};

BoundedRequestQueue.prototype.process = async function () {
    if (this.active >= this.concurrency || this.queue.length === 0) return;
    this.active++;
    const { task, resolve, reject } = this.queue.shift();
    try {
        const result = await task();
        resolve(result);
    } catch (err) {
        reject(err);
    } finally {
        this.active--;
        this.process();
    }
};


function initGhostText() {
    document.querySelectorAll('.paper-input').forEach(el => {

        el.addEventListener('input', (e) => {


            touchedFields.add(el.id);
            clearGhost(el.id);
            syncGhostHeight(el);

            const backdrop = document.getElementById(`gh_${el.id}`);
            if (backdrop) backdrop.scrollTop = el.scrollTop;

            if (el.selectionEnd === el.value.length) {
                debouncedFetchCompletion(el.id, e.target.value);
            }
        });

        el.addEventListener('scroll', () => {
            const backdrop = document.getElementById(`gh_${el.id}`);
            if (backdrop) backdrop.scrollTop = el.scrollTop;
        });

        ['keyup', 'click', 'focus'].forEach(evtType => {
            el.addEventListener(evtType, () => {
                if (el.selectionEnd !== el.value.length) clearGhost(el.id);
            });
        });

        el.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (appSettings.ghostText) {
                    const suggestion = ghostMap.get(el.id);
                    if (suggestion) {
                        e.preventDefault();
                        acceptGhost(el.id, suggestion);
                    }
                }
            }
        });

        el.addEventListener('blur', () => clearGhost(el.id));
        syncGhostHeight(el);
    });
    console.log('[GhostText] Initialized');
}

let stateVersion = 0;

window.resetGhostState = function () {
    stateVersion++;
    clearTimeout(ghostDebounceTimer);
    ghostMap.clear();
    touchedFields.clear();

    const fields = ['main_complaint', 'history_present_illness', 'past_history', 'physical_exam', 'auxiliary_exam', 'diagnosis', 'orders'];
    fields.forEach(fid => {

        renderGhost(fid, "", "");
    });
    console.log('[GhostText] State Reset (v' + stateVersion + ')');
};

function clearGhost(fieldId) {
    ghostMap.delete(fieldId);
    const el = document.getElementById(fieldId);
    if (el) renderGhost(fieldId, el.value, "");
}

function acceptGhost(fieldId, suggestion) {
    const el = document.getElementById(fieldId);

    if (typeof isGhostInsertion !== 'undefined') {
        window.isGhostInsertion = true;
    }

    if (typeof usageMetrics !== 'undefined') {
        usageMetrics.ghostCount++;
        usageMetrics.ghostChars += suggestion.length;
    }

    el.value += suggestion;
    clearGhost(fieldId);
    el.dispatchEvent(new Event('input'));
}

function renderGhost(fieldId, userText, suggestion) {
    const backdrop = document.getElementById(`gh_${fieldId}`);
    if (!backdrop) return;

    const el = document.getElementById(fieldId);
    if (!suggestion || !appSettings.ghostText) {
        backdrop.innerHTML = "";
        if (el) {
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
            backdrop.style.height = el.style.height;
        }
        return;
    }

    const transparentUserText = `<span style="color: transparent; opacity: 0;">${escapeHtml(userText)}</span>`;
    const ghostSpan = `<span class="ghost-text" style="color: #9ca3af; pointer-events: none;">${suggestion}</span>`;

    backdrop.innerHTML = transparentUserText + ghostSpan;

    if (el) {
        backdrop.scrollTop = el.scrollTop;

        if (backdrop.scrollHeight > el.clientHeight) {
            el.style.height = backdrop.scrollHeight + 'px';
            backdrop.style.height = el.style.height; 
        }
    }
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/\n/g, "<br>");
}

function syncGhostHeight(el) {
    const backdrop = document.getElementById(`gh_${el.id}`);
    if (backdrop) backdrop.style.height = el.style.height;
}

function debouncedFetchCompletion(fieldId, text) {
    clearTimeout(ghostDebounceTimer);

    if (!appSettings.ghostText) return;

    const el = document.getElementById(fieldId);
    if (!el || el.selectionEnd !== el.value.length) return;

    ghostDebounceTimer = setTimeout(async () => {
        const currentVersion = stateVersion;
        try {

            const res = await fetch(`${API_BASE_AGENT}/agent/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field_id: fieldId, current_text: text })
            });
            if (res.ok) {
                const data = await res.json();
                if (stateVersion !== currentVersion) return;

                if (data.completion) {
                    if (document.activeElement !== el) return;
                    let rawCompletion = data.completion;
                    if (rawCompletion.startsWith(text)) rawCompletion = rawCompletion.substring(text.length);
                    if (isValidDraft(rawCompletion)) {
                        ghostMap.set(fieldId, rawCompletion);
                        renderGhost(fieldId, text, rawCompletion);
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
    }, 1000);
}

function triggerDraftsForEmptyFields() {
    if (!appSettings.ghostText) return;

    const fields = ['main_complaint', 'history_present_illness', 'past_history', 'physical_exam', 'auxiliary_exam', 'diagnosis', 'orders'];
    fields.forEach((fid) => {
        const el = document.getElementById(fid);
        if (!el || touchedFields.has(fid) || el.value.trim() !== "") return;

        const currentVersion = stateVersion;
        draftQueue.add(async () => {
            if (stateVersion !== currentVersion) return; 
            try {
                const res = await fetch(`${API_BASE_AGENT}/agent/draft`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ summary: window.currentSummary, field_id: fid })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (stateVersion !== currentVersion) return;
                    if (el.value.trim() !== "" || touchedFields.has(fid)) return;

                    let draft = data.draft;
                    if (isValidDraft(draft)) {
                        ghostMap.set(fid, draft);
                        renderGhost(fid, "", draft);
                    }


                    if (data.suggestions && data.suggestions.length > 0) {
                        if (typeof renderSuggestionsForField === 'function') {
                            renderSuggestionsForField(fid, data.suggestions);
                        }
                    }
                }
            } catch (e) { console.error(e); }
        });
    });
}

function isValidDraft(text) {
    if (!text) return false;
    const clean = text.trim().replace(/^['"]+|['"]+$/g, '');
    if (clean.length === 0) return false;
    const rejectPattern = /空字符串|没有相关信息|无相关信息|无法提取|无法提供|抱歉.*无法|根据对话总结/i;
    if (rejectPattern.test(clean)) return false;

    return true;
}
