
console.log('[Chat] Initialized');

(function () {
    const chatInput = document.getElementById('chat-input-field');
    const sendBtn = document.getElementById('chat-send-btn');
    const chatHistory = document.getElementById('chat-history');

    if (!chatInput || !sendBtn || !chatHistory) {
        console.warn('Chat elements not found');
        return;
    }


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


        appendMessage('user', text);
        chatInput.value = '';

        try {
            console.log('Calling API...');

            const loadingId = showLoading();

            const response = await fetch('/api/chat/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'user', content: text })
            });

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

            const existingLoading = document.getElementById('chat-loading-indicator');
            if (existingLoading) existingLoading.remove();

            appendMessage('assistant', 'Network error. Please try again.');
        }
    }

    function showLoading() {
        const id = 'chat-loading-indicator';
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message assistant`;
        msgDiv.id = id;

        const bubble = document.createElement('div');
        bubble.className = `chat-bubble assistant`;

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

        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${role}`;
        msgDiv.appendChild(bubble);

        chatHistory.appendChild(msgDiv);
        scrollToBottom();

        if (role === 'assistant') {
            typeWriter(bubble, text);
        } else {
            bubble.innerText = text;
            scrollToBottom();
        }
    }

    function typeWriter(element, text, index = 0, currentText = '') {
        if (index < text.length) {
            currentText += text.charAt(index);

            element.innerHTML = marked.parse(currentText);


            const container = element.closest('.chat-message');
            if (container) {
                container.scrollIntoView({ behavior: "smooth", block: "end" });
            } else {
                chatHistory.scrollTop = chatHistory.scrollHeight;
            }

            setTimeout(() => {
                typeWriter(element, text, index + 1, currentText);
            }, 30); 
        }
    }

    function scrollToBottom() {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.innerText = text;
        return div.innerHTML;
    }
})();
