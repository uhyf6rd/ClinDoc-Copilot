// --- Configuration ---
const API_BASE_AUDIO = 'http://localhost:8000/api';
const API_BASE_AGENT = 'http://localhost:8001/api';

// FEATURE TOGGLES
// Make it var so it's globally accessible
var appSettings = {
    autoSummary: true,
    ghostText: true,
    terminology: true
};

// METRICS TRACKING
let usageMetrics = {
    startTime: 0,
    ghostCount: 0,
    ghostChars: 0,
    manualChars: 0,
    deletedChars: 0
};
let fieldLastValues = new Map(); // Store last valid value for each field to calc diff
let isGhostInsertion = false; // Flag to ignore ghost text insertion in manual stats

// ====================================================================
// --- UI Logic ---

// Tab Switching
function switchTab(tabName) {
    // Hide all contents
    document.getElementById('tab-record').classList.add('hidden');
    document.getElementById('tab-chat').classList.add('hidden');
    document.getElementById('tab-settings').classList.add('hidden');

    // Show selected
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');

    // Update headers
    const tabs = document.querySelectorAll('.tab-item');
    tabs.forEach(t => t.classList.remove('active'));

    if (tabName === 'record') tabs[0].classList.add('active');
    if (tabName === 'chat') tabs[1].classList.add('active');
    if (tabName === 'settings') tabs[2].classList.add('active');
}

// Auto-resize Textareas
document.querySelectorAll('textarea').forEach(el => {
    el.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
});

// Initialize Settings Toggles
function initSettings() {
    const aiToggle = document.getElementById('toggle-ai-summary');
    const ghostToggle = document.getElementById('toggle-ghost-text');
    const termToggle = document.getElementById('toggle-terminology');

    if (aiToggle) {
        aiToggle.addEventListener('change', (e) => {
            appSettings.autoSummary = e.target.checked;
            toggleAiSummaryUi(appSettings.autoSummary);
        });
        // Initial state
        toggleAiSummaryUi(appSettings.autoSummary);
    }
    if (ghostToggle) {
        ghostToggle.addEventListener('change', (e) => {
            appSettings.ghostText = e.target.checked;
            if (!appSettings.ghostText) {
                // Clear all ghost text if disabled
                document.querySelectorAll('.ghost-backdrop').forEach(el => el.innerHTML = '');
                ghostMap.clear();
            }
        });
    }
    if (termToggle) {
        termToggle.addEventListener('change', (e) => {
            appSettings.terminology = e.target.checked;
            if (!appSettings.terminology) {
                // Clear all underlines if disabled
                document.querySelectorAll('.terminology-underline-layer').forEach(el => el.innerHTML = '');
                document.querySelectorAll('.terminology-interaction-layer').forEach(el => el.innerHTML = '');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initSettings();
    initSettings();
});

// Helper: Toggle AI Summary UI
function toggleAiSummaryUi(isEnabled) {
    const wrapper = document.getElementById('ai-summary-wrapper');
    if (wrapper) {
        wrapper.style.display = isEnabled ? 'block' : 'none';
    }
}

// ====================================================================
// --- Business Logic ---

async function loadDemoData() {
    const modal = document.getElementById('case-modal');
    const body = document.getElementById('case-modal-body');

    // Toggle visibility
    if (modal.style.display === 'flex') {
        modal.style.display = 'none';
        return;
    }

    modal.style.display = 'flex';
    body.innerHTML = '<div class="p-4 text-center text-gray-400 text-sm"><i class="fa-solid fa-spinner fa-spin mr-2"></i>正在加载病例...</div>';

    try {
        const res = await fetch(`${API_BASE_AUDIO}/records/cases`);
        if (!res.ok) throw new Error("Failed to fetch cases");

        const cases = await res.json();

        if (cases.length === 0) {
            body.innerHTML = '<div class="p-4 text-center text-gray-400 text-sm">暂无病例数据</div>';
            return;
        }

        body.innerHTML = cases.map(c => `
            <div class="case-item" onclick="selectCase('${c.gender}', '${c.age}')">
                <div class="case-item-info">
                    <div class="case-item-row">
                        <span class="text-blue-500 font-bold mr-1">${c.id}</span>
                        <span>性别: ${c.gender}</span>
                        <span>年龄: ${c.age}</span>
                    </div>
                </div>
                <i class="fa-solid fa-chevron-right text-gray-400"></i>
            </div>
        `).join('');

    } catch (e) {
        console.error("Error loading demo cases:", e);
        body.innerHTML = '<div class="p-4 text-center text-red-400 text-sm">加载失败: ' + e.message + '</div>';
    }
}

function selectCase(gender, age) {
    document.getElementById('p_gender').value = gender;
    document.getElementById('p_age').value = age;
    // Reset metrics on new case
    resetMetrics();
    closeCaseModal();
}

function closeCaseModal() {
    document.getElementById('case-modal').style.display = 'none';
}

async function submitRecord() {
    const fields = ['main_complaint', 'history_present_illness', 'past_history', 'physical_exam', 'auxiliary_exam', 'diagnosis', 'orders'];
    let totalChars = 0;
    fields.forEach(fid => {
        totalChars += document.getElementById(fid).value.length;
    });

    const duration = usageMetrics.startTime > 0 ? Math.floor((Date.now() - usageMetrics.startTime) / 1000) : 0;

    const data = {
        gender: document.getElementById('p_gender').value,
        age: document.getElementById('p_age').value,
        main_complaint: document.getElementById('main_complaint').value,
        history_present_illness: document.getElementById('history_present_illness').value,
        past_history: document.getElementById('past_history').value,
        physical_exam: document.getElementById('physical_exam').value,
        auxiliary_exam: document.getElementById('auxiliary_exam').value,
        diagnosis: document.getElementById('diagnosis').value,
        orders: document.getElementById('orders').value,
        metrics: {
            total_duration_seconds: duration,
            ghost_text_count: usageMetrics.ghostCount,
            ghost_text_chars: usageMetrics.ghostChars,
            manual_input_chars: usageMetrics.manualChars,
            deleted_chars: usageMetrics.deletedChars,
            total_chars: totalChars
        }
    };

    try {
        const res = await fetch(`${API_BASE_AUDIO}/records/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            const result = await res.json();
            // User Request: <i class="fa-solid fa-check-circle"></i> for flat icon, no filename
            showToast(`<i class="fa-solid fa-check-circle"></i> 提交成功`, 'success');

            // Stop recording if active and clear UI
            if (typeof isRecording !== 'undefined' && isRecording) {
                stopRecording();
            }
            if (typeof clearRecording === 'function') {
                clearRecording();
            }

            clearForm();
        } else {
            const err = await res.json();
            showToast("❌ 提交失败: " + JSON.stringify(err), 'error');
        }
    } catch (e) {
        console.error(e);
        showToast("❌ 提交出错", 'error');
    }
}

function resetMetrics() {
    usageMetrics = {
        startTime: 0,
        ghostCount: 0,
        ghostChars: 0,
        manualChars: 0,
        deletedChars: 0
    };
    fieldLastValues.clear();
    // Initialize last values
    document.querySelectorAll('.paper-input').forEach(el => {
        fieldLastValues.set(el.id, el.value);
    });
}

function clearForm() {
    const fields = ['p_gender', 'p_age', 'main_complaint', 'history_present_illness', 'past_history', 'physical_exam', 'auxiliary_exam', 'diagnosis', 'orders'];
    fields.forEach(fid => {
        const el = document.getElementById(fid);
        if (el) {
            el.value = "";
            if (el.tagName === 'TEXTAREA') {
                el.style.height = 'auto';
            }
        }
    });

    window.resetGhostState();
    fields.forEach(fid => {
        const backdrop = document.getElementById(`gh_${fid}`);
        if (backdrop) backdrop.innerHTML = "";
        const badge = document.getElementById(`sug_${fid}`);
        const tooltip = document.getElementById(`tip_${fid}`);
        if (badge) badge.classList.add('hidden');
        if (tooltip) tooltip.innerHTML = "";
    });
    // Also clear ghost text backdrops and AI suggestion badges
    // if (window.resetGhostState) {
    //     window.resetGhostState();
    // } else {
    //     // Fallback if resetGhostState not loaded yet
    // fields.forEach(fid => {
    //     const backdrop = document.getElementById(`gh_${fid}`);
    //     if (backdrop) backdrop.innerHTML = "";
    //     const badge = document.getElementById(`sug_${fid}`);
    //     const tooltip = document.getElementById(`tip_${fid}`);
    //     if (badge) badge.classList.add('hidden');
    //     if (tooltip) tooltip.innerHTML = "";
    // });
    // }

    // Clear AI Real-time Summary by invoking the existing agent stopper
    if (typeof stopSummaryAgent === 'function') {
        stopSummaryAgent();
    }
    resetMetrics(); // Reset after clear
}

function showToast(message, type = 'success') {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.className = 'toast-notification';
        document.body.appendChild(toast);
    }

    // Clear existing classes and set new ones
    toast.className = 'toast-notification';
    toast.classList.add(type === 'success' ? 'toast-success' : 'toast-error');

    toast.innerHTML = message;

    // Show
    setTimeout(() => toast.classList.add('show'), 10);

    // Hide after 3s
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ====================================================================
// --- Recording Logic ---

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingStartTime = 0;
let recordingTimerInterval = null;
let committedText = "";
let lastFlushTime = 0;

// New Control Variables
let isRestarting = false;     // Flag to indicate we are auto-restarting for fresh header
let transcriptionQueue = Promise.resolve(); // Promise chain for serialization

async function toggleRecording() {
    const btn = document.getElementById('btn-record');
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        // Time interval for sending audio to backend (in milliseconds)
        const sliceTime = 1500; // Currently 1.5 second
        lastFlushTime = Date.now();
        committedText = "";
        window.fullSessionTranscript = "";

        let webmHeader = null; // Local header for CURRENT 10s segment

        mediaRecorder.ondataavailable = async (event) => {
            if (event.data.size > 0) {
                // 1. Capture Header (First chunk of this segment)
                if (!webmHeader) {
                    webmHeader = event.data;
                    console.log("[Diagnose] New Segment Header Captured:", webmHeader.size);
                }

                // 2. Accumulate Chunk
                audioChunks.push(event.data);
                const currentBlob = new Blob(audioChunks, { type: 'audio/webm' });

                // 3. Queue Transcription (Strict Serialization)
                // We wrap it in a function to ensure 'currentBlob' is captured correctly
                transcriptionQueue = transcriptionQueue.then(() => sendAudioToBackend(currentBlob))
                    .catch(e => console.error("Queue Error:", e));

                // 4. Check for Restart (Soft Flush > 10s)
                const now = Date.now();
                if (now - lastFlushTime > 10000) {
                    console.log("🔄 [Auto-Restart] Refreshing MediaRecorder to clear header...");
                    isRestarting = true;
                    // Update committed text with what we have so far (optimistic)
                    if (window.fullSessionTranscript) {
                        committedText = window.fullSessionTranscript;
                    }
                    mediaRecorder.stop(); // This triggers onstop -> restart
                    lastFlushTime = now;
                }
            }
        };

        mediaRecorder.onstop = () => {
            if (isRestarting) {
                // --- RESTART LOGIC ---
                isRestarting = false;
                audioChunks = []; // Clear buffer for new segment
                webmHeader = null; // Reset header
                mediaRecorder.start(sliceTime); // Start new segment immediately
                console.log("▶️ [Auto-Restart] MediaRecorder resumed.");
            } else {
                // --- REAL STOP LOGIC ---
                document.getElementById('btn-record').innerHTML = '开始录音';
                document.getElementById('btn-record').classList.remove('bg-red-500', 'hover:bg-red-600');
                document.getElementById('btn-record').classList.add('bg-blue-500', 'hover:bg-blue-600');
                document.querySelector('.input-status').innerText = '录音已结束';
                clearInterval(recordingTimerInterval);
            }
        };

        mediaRecorder.start(sliceTime);
        console.log("[Diagnose] MediaRecorder started! State:", mediaRecorder.state);
        isRecording = true;
        document.getElementById('btn-record').innerHTML = '<i class="fa-solid fa-stop"></i> 停止录音';
        document.getElementById('btn-record').classList.remove('bg-blue-500', 'hover:bg-blue-600');
        document.getElementById('btn-record').classList.add('bg-red-500', 'hover:bg-red-600');
        document.querySelector('.input-status').innerText = '正在录音';

        if (usageMetrics.startTime === 0) {
            usageMetrics.startTime = Date.now();
        }
        recordingStartTime = Date.now();
        document.getElementById('record-timer').innerText = "00:00:00";
        recordingTimerInterval = setInterval(updateTimer, 1000);

        // Start summary agent if enabled
        if (appSettings.autoSummary) {
            startSummaryAgent();
        }

    } catch (err) {
        console.error("Microphone access denied:", err);
        alert("无法访问麦克风: " + err.name + "\n" + err.message + "\n请检查设备是否被占用或驱动正常。");
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    isRecording = false;
    stopSummaryAgent();
    clearRecording(); // Reset Audio State
    clearForm();      // Reset UI & Ghost State
}

async function sendAudioToBackend(blob) {
    // Note: No isTranscribing lock needed here because we function call is serialized by transcriptionQueue

    const formData = new FormData();
    formData.append("file", blob, "chunk.webm");

    try {
        const res = await fetch(`${API_BASE_AUDIO}/audio/transcribe`, {
            method: 'POST',
            body: formData
        });
        if (res.ok) {
            const data = await res.json();
            const newText = data.text || "";
            console.log("📝 [Transcribed Text]:", newText);

            // Update Global Transcript
            // Since requests are serialized, we can safely append
            if (newText.trim() || committedText) {
                window.fullSessionTranscript = committedText + newText;
            }
        }
    } catch (e) {
        console.error(e);
    }
}

function clearRecording() {
    window.fullSessionTranscript = "";
    committedText = "";
    lastProcessedLength = 0; // Reset summary progress
    document.getElementById('record-timer').innerText = "00:00:00";
    document.querySelector('.input-status').innerText = '录音已暂停';
}

// --- Summary Logic ---
let summaryInterval = null;
let lastProcessedLength = 0;
let currentSummary = "";

let summaryVersion = 0;

function startSummaryAgent() {
    summaryInterval = setInterval(async () => {
        if (!isRecording || !appSettings.autoSummary) return;

        const currentVersion = summaryVersion; // Capture version at start
        const fullText = window.fullSessionTranscript || "";
        if (fullText.length > lastProcessedLength) {
            const newText = fullText.substring(lastProcessedLength);
            if (newText.includes("等待录音输入") || newText.includes("正在转录")) return;

            console.log("[Diagnose] Summary Agent Input:", newText);
            updateSummaryStatus("正在总结...");
            try {
                const res = await fetch(`${API_BASE_AGENT}/agent/summary`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ current_summary: currentSummary, new_text: newText })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (summaryVersion !== currentVersion) return; // Stale request - discard

                    if (data.updated_summary) {
                        currentSummary = data.updated_summary;
                        window.currentSummary = currentSummary; // Sync global for completion.js
                        document.getElementById('ai-summary-box').innerText = currentSummary;
                        lastProcessedLength = fullText.length;
                        triggerDraftsForEmptyFields();
                    }
                    updateSummaryStatus("已更新");
                }
            } catch (e) {
                console.error("总结 Agent 错误:", e);
                updateSummaryStatus("总结失败");
            }
        }
    }, 10000);
}

function stopSummaryAgent() {
    summaryVersion++; // Invalidate pending requests
    clearInterval(summaryInterval);
    updateSummaryStatus("");
    lastProcessedLength = 0; // Reset summary progress

    // Clear Summary
    currentSummary = "";
    window.currentSummary = "";
    const box = document.getElementById('ai-summary-box');
    if (box) box.innerText = "等待对话自动总结...";
}

function updateSummaryStatus(msg) {
    const el = document.getElementById('summary-status');
    if (el) el.innerText = msg;
}

// Hook functions for debugging/extension
const originalStartRecordingWrapper = startRecording;
// ... (Logic is already integrated above, removing separate hooks for cleaner code)

function updateTimer() {
    if (!recordingStartTime) return;
    const diff = Math.floor((Date.now() - recordingStartTime) / 1000);
    const h = String(Math.floor(diff / 3600)).padStart(2, "0");
    const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
    const s = String(diff % 60).padStart(2, "0");
    document.getElementById('record-timer').innerText = `${h}:${m}:${s}`;
}

// ====================================================================
// --- Ghost Text Logic ---
// MOVED TO ghost_text.js
// We need to ensure variables shared with ghost_text.js are accessible.
// Since this is a global script, top-level vars/lets are global, BUT let/const are not on window.
// We explicitly attach them to window to be safe for cross-file access if needed, 
// though separate scripts share scope.
// However, 'currentSummary' was 'let' and 'isGhostInsertion' was 'let'.

// Expose internal state for ghost_text.js
window.usageMetrics = usageMetrics;
window.fieldLastValues = fieldLastValues;
window.isGhostInsertion = isGhostInsertion;
window.currentSummary = currentSummary;

// Hook into updates to keep window.XXX in sync if they are reassigned (unlikely for objects, but primitives yes)
// Actually "isGhostInsertion" is a primitive 'false', so assigning window.isGhostInsertion = isGhostInsertion passes value.
// We need to change how we declare them or how we access them.
// Best way: Change their declaration to 'var' or 'window.XXX' at top of file, OR just rely on scope if simple script.
// But to be robust, let's explicitely use window.XXX in ghost_text.js and here ensure they reflect.
// Better: ghost_text.js reads window globals. 
// We will change the top definitions of these variables in a separate step or just here if possible.

// STARTUP
document.addEventListener('DOMContentLoaded', () => {
    // Other init...
    // initGhostText() is defined in ghost_text.js which runs after this script but before DOMContentLoaded fires?
    // Actually if ghost_text.js is <script> after script.js, it loads and defines initGhostText.
    if (typeof initGhostText === 'function') {
        initGhostText();
    }
});
