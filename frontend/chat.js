// Chat functionality
console.log('[Chat] Initialized');

(function () {
    const chatInput = document.getElementById('chat-input-field');
    const sendBtn = document.getElementById('chat-send-btn');
    const chatHistory = document.getElementById('chat-history');

    if (!chatInput || !sendBtn || !chatHistory) {
        console.warn('Chat elements not found');
        return;
    }

    // Event Listeners
    sendBtn.addEventListener('click', (e) => {
        console.log('Send button clicked');
        sendMessage();
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            console.log('Enter pressed in chat input');
            sendMessage();
        }
    });

    async function sendMessage() {
        const text = chatInput.value.trim();
        console.log('Attempting to send:', text);

        if (!text) return;

        // 1. Add User Message
        appendMessage('user', text);
        chatInput.value = '';

        // 2. Call API
        try {
            console.log('Calling API...');

            // Show loading
            const loadingId = showLoading();

            const response = await fetch('/api/chat/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'user', content: text })
            });

            // Remove loading
            removeLoading(loadingId);

            if (response.ok) {
                const data = await response.json();
                console.log('API Response:', data);
                appendMessage('assistant', data.content);
            } else {
                console.error('API Error:', response.status);
                appendMessage('assistant', 'Error connecting to AI server.');
            }
        } catch (error) {
            console.error('Chat error:', error);
            // Ensure loading is removed on error too
            const existingLoading = document.getElementById('chat-loading-indicator');
            if (existingLoading) existingLoading.remove();

            appendMessage('assistant', 'Network error. Please try again.');
        }
    }

    function showLoading() {
        const id = 'chat-loading-indicator';
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message assistant`; // AI side
        msgDiv.id = id;

        // Bubble
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble assistant`;

        // Dots
        bubble.innerHTML = `
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;

        msgDiv.appendChild(bubble);
        chatHistory.appendChild(msgDiv);
        scrollToBottom();
        return id;
    }

    function removeLoading(id) {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }

    function appendMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${role}`;

        // Create bubble container
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${role}`;
        msgDiv.appendChild(bubble);

        chatHistory.appendChild(msgDiv);
        scrollToBottom();

        if (role === 'assistant') {
            typeWriter(bubble, text);
        } else {
            bubble.innerText = text; // User message shows immediately
            scrollToBottom();
        }
    }

    function typeWriter(element, text, index = 0, currentText = '') {
        if (index < text.length) {
            currentText += text.charAt(index);
            // Render markdown on every character (streaming effect)
            element.innerHTML = marked.parse(currentText);

            // Smart scroll: Keep the message being typed in view
            const container = element.closest('.chat-message');
            if (container) {
                container.scrollIntoView({ behavior: "smooth", block: "end" });
            } else {
                chatHistory.scrollTop = chatHistory.scrollHeight;
            }

            setTimeout(() => {
                typeWriter(element, text, index + 1, currentText);
            }, 30); // 30ms typing speed
        }
    }

    function scrollToBottom() {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    function escapeHtml(text) {
        // Not used now as we use innerText for safety in typeWriter
        const div = document.createElement('div');
        div.innerText = text;
        return div.innerHTML;
    }
})();
